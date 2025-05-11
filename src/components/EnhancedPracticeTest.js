// components/EnhancedPracticeTest.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Loading from './Loading';
import './EnhancedPracticeTest.css';
import { 
  getExamById, 
  getPracticeTestById,
  getQuestionsByTestId,
  updateUserTestProgress
} from '../services/firebaseService';

const EnhancedPracticeTest = ({ user }) => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extract the mode from the location state or default to 'exam'
  const mode = location.state?.mode || 'exam';
  // Extract examId from location state 
  const examId = location.state?.examId;
  // Extract isDemo from location state
  const isDemo = location.state?.isDemo || false;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [test, setTest] = useState(null);
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [testCompleted, setTestCompleted] = useState(false);
  const [score, setScore] = useState(null);
  const [showExplanation, setShowExplanation] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [showSignUpPrompt, setShowSignUpPrompt] = useState(false);

  // Fetch test data when component mounts
  useEffect(() => {
    const fetchTestData = async () => {
      setLoading(true);
      try {
        console.log(`Starting to fetch test data for testId: ${testId}`);
        
        // We need the examId to fetch the practice test
        if (!examId) {
          throw new Error("No exam ID provided. Please navigate from the practice tests page.");
        }
        
        console.log(`Using examId: ${examId}`);
        
        // Fetch exam data
        const examData = await getExamById(examId);
        if (!examData) {
          throw new Error(`Exam with ID ${examId} not found`);
        }
        
        console.log(`Found exam: ${examData.title}`);
        
        // Fetch practice test using direct document IDs
        const practiceTest = await getPracticeTestById(examId, testId);
        if (!practiceTest) {
          throw new Error(`Practice test with ID ${testId} not found`);
        }
        
        console.log(`Found practice test: ${practiceTest.title || practiceTest.displayName}`);
        
        // Fetch questions using direct document IDs
        const questionsData = await getQuestionsByTestId(examId, testId);
        if (!questionsData || questionsData.length === 0) {
          throw new Error('No questions found for this practice test');
        }
        
        console.log(`Found ${questionsData.length} questions`);
        
        setExam(examData);
        setTest(practiceTest);
        setQuestions(questionsData);
        
        // Set timer if in exam mode
        if (mode === 'exam') {
          setTimeRemaining(practiceTest.timeLimit * 60); // convert to seconds
        }
        
        setLoading(false);
        
      } catch (error) {
        console.error("Error fetching test data:", error);
        setError(`Failed to load practice test: ${error.message}`);
        setLoading(false);
      }
    };

    fetchTestData();
  }, [testId, mode, examId]);

  // Timer effect for exam mode
  useEffect(() => {
    if (loading || !timeRemaining || mode !== 'exam' || testCompleted) return;
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [loading, timeRemaining, mode, testCompleted]);

  // Handle selecting an answer
  const handleAnswer = (questionId, optionId) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionId
    }));
    
    // In practice mode, show explanation after answering
    if (mode === 'practice') {
      setShowExplanation(prev => ({
        ...prev,
        [questionId]: true
      }));
    }
  };

  // Navigate to a specific question
  const navigateToQuestion = (index) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestion(index);
    }
  };

  // Submit a single question (practice mode)
  const handleSubmitQuestion = () => {
    const currentQ = questions[currentQuestion];
    
    // Make sure the question is answered
    if (!answers[currentQ.id]) {
      alert('Please select an answer before submitting.');
      return;
    }
    
    // Show explanation for this question
    setShowExplanation(prev => ({
      ...prev,
      [currentQ.id]: true
    }));
    
    // Automatically move to next question after a delay if not the last question
    if (currentQuestion < questions.length - 1) {
      setTimeout(() => {
        navigateToQuestion(currentQuestion + 1);
      }, 1500);
    }
  };

  // Submit the test
  const handleSubmitTest = async () => {
    // Calculate score
    let correct = 0;
    let totalAnswered = 0;
    
    questions.forEach(question => {
      if (answers[question.id]) {
        totalAnswered++;
        if (answers[question.id] === question.correctAnswer) {
          correct++;
        }
      }
    });
    
    const percentage = Math.round((correct / questions.length) * 100);
    const resultData = {
      score: correct,
      totalQuestions: questions.length,
      answeredQuestions: totalAnswered,
      percentage: percentage,
      isPassed: percentage >= (test?.passingScore || 70),
      timeSpent: test.timeLimit * 60 - (timeRemaining || 0),
      mode: mode,
      passingScore: test?.passingScore || 70,
      testName: test.displayName || `${exam.title} - ${test.title}`
    };
    
    // Set the local state regardless of whether Firebase save works
    setScore(resultData);
    setTestCompleted(true);
    
    // Save attempt to Firebase if user is logged in
    if (user && user.id && examId) {
      try {
        const attemptId = await updateUserTestProgress(
          user.id, 
          examId, 
          testId, 
          resultData
        );
        console.log('Progress saved with attempt ID:', attemptId);
      } catch (error) {
        console.error('Error saving progress:', error);
      }
    } else if (isDemo) {
      // Show sign up prompt for demo users
      setShowSignUpPrompt(true);
    }
  };

  // Handle retry
  const handleRetry = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setShowExplanation({});
    setTestCompleted(false);
    setScore(null);
    setShowResults(false);
    if (mode === 'exam') {
      setTimeRemaining(test.timeLimit * 60);
    }
  };

  // Handle view results
  const handleViewResults = () => {
    setShowResults(true);
  };

  // Format time
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <Loading size="large" text="Loading practice test..." />;
  }
  
  if (error) {
    return (
      <div className="practice-test-container">
        <div className="error-message">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate(-1)} className="btn btn-primary">
            Back to Practice Tests
          </button>
        </div>
      </div>
    );
  }

  // Render test completion screen
  if (testCompleted) {
    if (showResults) {
      // Detailed results view
      return (
        <div className="practice-test-container">
          <div className="test-results-detailed">
            <h1>Test Results: {test.displayName || `${exam.title} - ${test.title}`}</h1>
            <div className="results-summary">
              <div className="score-display">
                <div className="score-circle">
                  <span className="score-percentage">{score.percentage}%</span>
                </div>
                <div className="score-label">
                  {score.isPassed ? 'PASSED' : 'FAILED'}
                </div>
              </div>
              
              <div className="results-stats">
                <div className="stat-item">
                  <span className="stat-label">Correct Answers</span>
                  <span className="stat-value">{score.score} / {score.totalQuestions}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Questions Attempted</span>
                  <span className="stat-value">{score.answeredQuestions} / {score.totalQuestions}</span>
                </div>
                {mode === 'exam' && (
                  <div className="stat-item">
                    <span className="stat-label">Time Spent</span>
                    <span className="stat-value">
                      {Math.floor(score.timeSpent / 60)}m {score.timeSpent % 60}s
                    </span>
                  </div>
                )}
                <div className="stat-item">
                  <span className="stat-label">Test Mode</span>
                  <span className="stat-value">{mode === 'exam' ? 'Exam Mode' : 'Practice Mode'}</span>
                </div>
              </div>
            </div>
            
            <div className="questions-review">
              <h2>Question Review</h2>
              {questions.map((question, index) => {
                const isCorrect = answers[question.id] === question.correctAnswer;
                const isAnswered = !!answers[question.id];
                
                return (
                  <div 
                    key={question.id} 
                    className={`review-question ${isAnswered ? (isCorrect ? 'correct' : 'incorrect') : 'unanswered'}`}
                  >
                    <div className="review-question-header">
                      <div className="question-number">
                        Question {index + 1} {!isAnswered && <span className="unattempted-label">(Unattempted)</span>}
                      </div>
                      <div className="question-category">
                        {question.category} • {question.difficulty}
                      </div>
                    </div>
                    
                    <div className="review-question-content">
                      <p className="question-text">{question.text}</p>
                      
                      <div className="options-review">
                        {question.options.map(option => {
                          let optionClass = 'option-review';
                          if (option.id === question.correctAnswer) {
                            optionClass += ' correct-answer';
                          } else if (isAnswered && option.id === answers[question.id]) {
                            optionClass += ' wrong-answer';
                          }
                          
                          return (
                            <div key={option.id} className={optionClass}>
                              <div className="option-marker">
                                {option.id.toUpperCase()}
                              </div>
                              <div className="option-text">
                                {option.text}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="answer-status">
                        {isAnswered ? (
                          isCorrect ? (
                            <div className="status-correct">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 6L9 17l-5-5"></path>
                              </svg>
                              Correct
                            </div>
                          ) : (
                            <div className="status-incorrect">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                              Incorrect 
                              (Your answer: {answers[question.id].toUpperCase()}, 
                              Correct answer: {question.correctAnswer.toUpperCase()})
                            </div>
                          )
                        ) : (
                          <div className="status-unanswered">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10"></circle>
                              <line x1="12" y1="8" x2="12" y2="12"></line>
                              <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                            Not Answered
                          </div>
                        )}
                      </div>
                      
                      <div className="explanation-box">
                        <h4>Explanation</h4>
                        <p>{question.explanation}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="results-actions">
              <button 
                onClick={handleRetry}
                className="btn-primary"
              >
                Retry Test
              </button>
              <button 
                onClick={() => navigate(`/exam/${examId}/practice-tests`)}
                className="btn-secondary"
              >
                Back to Tests
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    // Summary results view
    return (
      <div className="practice-test-container">
        <div className="test-completed">
          <h1>Test Completed!</h1>
          
          <div className="score-container">
            <div className={`score-circle ${score.isPassed ? 'pass' : 'fail'}`}>
              <span className="score-percentage">{score.percentage}%</span>
            </div>
            <h2>{score.isPassed ? 'Congratulations!' : 'Keep Practicing!'}</h2>
            <p className="score-message">
              {score.isPassed 
                ? 'You passed the test! Great job on mastering the material.' 
                : 'You didn\'t pass this time, but don\'t worry! Review the results and try again.'}
            </p>
            
            <div className="score-details">
              <div className="score-detail-item">
                <div className="detail-label">Correct Answers:</div>
                <div className="detail-value">{score.score} out of {score.totalQuestions}</div>
              </div>
              <div className="score-detail-item">
                <div className="detail-label">Questions Attempted:</div>
                <div className="detail-value">{score.answeredQuestions} out of {score.totalQuestions}</div>
              </div>
              {mode === 'exam' && (
                <div className="score-detail-item">
                  <div className="detail-label">Time Spent:</div>
                  <div className="detail-value">
                    {Math.floor(score.timeSpent / 60)}m {score.timeSpent % 60}s
                  </div>
                </div>
              )}
              <div className="score-detail-item">
                <div className="detail-label">Passing Score:</div>
                <div className="detail-value">{test.passingScore || 70}%</div>
              </div>
            </div>
          </div>
          
          <div className="test-actions">
            <button 
              onClick={handleViewResults}
              className="btn-primary"
            >
              View Detailed Results
            </button>
            <button 
              onClick={handleRetry}
              className="btn-secondary"
            >
              Retry Test
            </button>
            <button 
              onClick={() => navigate(`/exam/${examId}/practice-tests`)}
              className="btn-outline"
            >
              Back to Tests
            </button>
          </div>
          
          <div className="debug-info" style={{ marginTop: "20px", fontSize: "0.8rem", color: "#666" }}>
            <strong>Test ID:</strong> {testId}<br/>
            <strong>Exam ID:</strong> {examId}
          </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const isAnswered = currentQ && answers[currentQ.id];
  const isCorrect = isAnswered && answers[currentQ.id] === currentQ.correctAnswer;
  const showCurrentExplanation = showExplanation[currentQ?.id];

  return (
    <div className="practice-test-container">
      {showSignUpPrompt && (
        <div className="sign-up-prompt">
          <h3>Great job on completing the demo test!</h3>
          <p>Sign up now to save your progress and get access to all practice tests.</p>
          <div className="sign-up-actions">
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/register')}
            >
              Sign Up Now
            </button>
            <button 
              className="btn btn-outline"
              onClick={() => setShowSignUpPrompt(false)}
            >
              Maybe Later
            </button>
          </div>
        </div>
      )}
      
      <div className="test-header">
        <h1>{test.displayName || `${exam.title} - ${test.title}`}</h1>
        <div className="test-mode-indicator">
          {mode === 'exam' ? (
            <div className="mode-exam">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              Exam Mode
            </div>
          ) : (
            <div className="mode-practice">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
              Practice Mode
            </div>
          )}
        </div>
      </div>
      
      <div className="test-progress-header">
        <div className="progress-info">
          <span>Question {currentQuestion + 1} of {questions.length}</span>
          <span className="question-category-badge">{currentQ.category} • {currentQ.difficulty}</span>
        </div>
        
        {mode === 'exam' && timeRemaining !== null && (
          <div className="timer">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            Time Remaining: {formatTime(timeRemaining)}
          </div>
        )}
      </div>
      
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
        ></div>
      </div>
      
      <div className="question-container">
        <h2 className="question-text">{currentQ.text}</h2>
        
        <div className="options">
          {currentQ.options.map(option => {
            let optionClass = 'option';
            
            // Apply different styles based on mode and selection state
            if (answers[currentQ.id] === option.id) {
              optionClass += ' selected';
              
              // In practice mode with explanation shown
              if (mode === 'practice' && showCurrentExplanation) {
                optionClass += option.id === currentQ.correctAnswer ? ' correct' : ' incorrect';
              }
            } 
            
            // Highlight correct answer in practice mode after submission
            if (mode === 'practice' && showCurrentExplanation && option.id === currentQ.correctAnswer) {
              optionClass += ' correct';
            }
            
            return (
              <div 
                key={option.id} 
                className={optionClass}
                onClick={() => !showCurrentExplanation && handleAnswer(currentQ.id, option.id)}
              >
                <div className="option-marker">{option.id.toUpperCase()}</div>
                <div className="option-content">{option.text}</div>
              </div>
            );
          })}
        </div>
        
        {/* Explanation section - shown in practice mode after answering */}
        {mode === 'practice' && showCurrentExplanation && (
          <div className={`explanation ${isCorrect ? 'correct-explanation' : 'incorrect-explanation'}`}>
            <h3 className="explanation-header">
              {isCorrect ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  Correct Answer!
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  Incorrect Answer
                </>
              )}
            </h3>
            {!isCorrect && (
              <p className="correct-answer-text">
                The correct answer is: <strong>{currentQ.correctAnswer.toUpperCase()}</strong>
              </p>
            )}
            <div className="explanation-content">
              <h4>Explanation:</h4>
              <p>{currentQ.explanation}</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="navigation">
        <button 
          onClick={() => navigateToQuestion(currentQuestion - 1)}
          disabled={currentQuestion === 0}
          className="btn-secondary"
        >
          Previous
        </button>
        
        <div className="center-buttons">
          {mode === 'practice' && !showCurrentExplanation && (
            <button 
              onClick={handleSubmitQuestion}
              disabled={!isAnswered}
              className="btn-check"
            >
              Check Answer
            </button>
          )}
          
          {mode === 'exam' && currentQuestion === questions.length - 1 && (
            <button 
              onClick={handleSubmitTest}
              className="btn-submit"
            >
              Submit Test
            </button>
          )}
        </div>
        
        {currentQuestion < questions.length - 1 ? (
          <button 
            onClick={() => navigateToQuestion(currentQuestion + 1)}
            className="btn-primary"
            disabled={mode === 'practice' && isAnswered && !showCurrentExplanation}
          >
            Next
          </button>
        ) : (
          mode === 'practice' ? (
            <button 
              onClick={handleSubmitTest}
              className="btn-primary"
            >
              Finish Test
            </button>
          ) : (
            <button 
              onClick={handleSubmitTest}
              className="btn-primary"
            >
              Submit Test
            </button>
          )
        )}
      </div>
      
      <div className="question-navigator">
        {questions.map((q, index) => {
          let statusClass = '';
          
          if (answers[q.id]) {
            if (mode === 'practice' && showExplanation[q.id]) {
              statusClass = answers[q.id] === q.correctAnswer ? 'correct' : 'incorrect';
            } else {
              statusClass = 'answered';
            }
          }
          
          return (
            <button 
              key={q.id}
              className={`question-num ${currentQuestion === index ? 'current' : ''} ${statusClass}`}
              onClick={() => navigateToQuestion(index)}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
      
      <div className="debug-info" style={{ marginTop: "20px", fontSize: "0.8rem", color: "#666", padding: "10px", background: "#f8f8f8", borderRadius: "4px" }}>
        <strong>Test ID:</strong> {testId}<br/>
        <strong>Exam ID:</strong> {examId}
      </div>
    </div>
  );
};

export default EnhancedPracticeTest;