// components/EnhancedPracticeTest.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Loading from './Loading';
import './EnhancedPracticeTest.css';
import { updateTestProgress } from '../services/progressService';

const EnhancedPracticeTest = ({ user }) => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extract the mode from the location state or default to 'exam'
  const mode = location.state?.mode || 'exam';
  
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [testCompleted, setTestCompleted] = useState(false);
  const [score, setScore] = useState(null);
  const [showExplanation, setShowExplanation] = useState({});
  const [showResults, setShowResults] = useState(false);

  // Fetch test data when component mounts
  useEffect(() => {
    const fetchTestData = async () => {
      setLoading(true);
      try {
        // Extract examId from testId (format is "examId-testNumber")
        let examId = '1';
        let testNumber = '1';
        
        if (testId && testId.includes('-')) {
          const parts = testId.split('-');
          examId = parts[0];
          testNumber = parts[1] || '1';
        }
        
        // Get a display-friendly exam name based on the examId
        const examName = getExamName(examId);
        
        // Simulate API call - in a real app, you would fetch from your backend
        setTimeout(() => {
          // Mock test data based on ID
          const testData = {
            id: testId,
            examId: examId,
            testNumber: testNumber,
            // Use a user-friendly title that doesn't show the raw IDs
            title: `${examName} - Practice Test ${testNumber}`,
            description: 'Comprehensive test to evaluate your knowledge and prepare for certification.',
            timeLimit: 60, // minutes
            questionsCount: 10,
            passingScore: 70,
          };
          
          // Generate mock questions
          const mockQuestions = generateMockQuestions(parseInt(testNumber), 10);
          
          setTest(testData);
          setQuestions(mockQuestions);
          
          // Set timer if in exam mode
          if (mode === 'exam') {
            setTimeRemaining(testData.timeLimit * 60); // convert to seconds
          }
          
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error("Error fetching test data:", error);
        setLoading(false);
      }
    };

    fetchTestData();
  }, [testId, mode]);

  // Helper function to get a readable exam name
  function getExamName(examId) {
    // Check if the examId is already a simple number
    const numId = parseInt(examId);
    if (!isNaN(numId) && numId >= 1 && numId <= 6) {
      return getExamNameById(numId);
    }
    
    // For complex IDs, hash them to a number between 1-6
    let hash = 0;
    for (let i = 0; i < examId.length; i++) {
      hash = (hash + examId.charCodeAt(i)) % 6;
    }
    return getExamNameById(hash + 1);
  }
  
  // Get exam name from ID
  function getExamNameById(id) {
    const titles = {
      1: 'CompTIA A+ Certification',
      2: 'AWS Certified Solutions Architect',
      3: 'Certified Scrum Master (CSM)',
      4: 'Cisco CCNA Certification',
      5: 'PMP Certification',
      6: 'Microsoft Azure Fundamentals (AZ-900)'
    };
    return titles[id] || `Certification Exam ${id}`;
  }

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

  // Generate mock questions with detailed explanations
  const generateMockQuestions = (seed, count) => {
    const questions = [];
    const categories = ['Network Security', 'Cloud Computing', 'Database Management', 'Software Development', 'IT Infrastructure'];
    
    for (let i = 1; i <= count; i++) {
      const category = categories[(seed + i) % categories.length];
      questions.push({
        id: i,
        text: `Question ${i}: In ${category}, what is the most effective approach to handle [specific scenario]?`,
        options: [
          { id: 'a', text: `Option A for question ${i}` },
          { id: 'b', text: `Option B for question ${i}` },
          { id: 'c', text: `Option C for question ${i}` },
          { id: 'd', text: `Option D for question ${i}` }
        ],
        correctAnswer: String.fromCharCode(97 + (i % 4)), // a, b, c, or d
        explanation: `Detailed explanation for question ${i}: The correct answer is ${String.fromCharCode(97 + (i % 4)).toUpperCase()} because it addresses the key requirements of the scenario. Options ${String.fromCharCode(97 + ((i+1) % 4)).toUpperCase()} and ${String.fromCharCode(97 + ((i+2) % 4)).toUpperCase()} are incorrect because they don't account for important factors like scalability and security. Option ${String.fromCharCode(97 + ((i+3) % 4)).toUpperCase()} might seem reasonable but has limitations in real-world applications.`,
        category: category,
        difficulty: i % 3 === 0 ? 'Hard' : (i % 2 === 0 ? 'Medium' : 'Easy')
      });
    }
    
    return questions;
  };

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

// Update the handleSubmitTest function with better error handling
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
    timeSpent: test?.timeLimit * 60 - timeRemaining,
    mode: mode,
    passingScore: test?.passingScore || 70,
    // Add the user-friendly test name
    testName: test.title
  };
  
  // Set the local state regardless of whether Firebase save works
  setScore(resultData);
  setTestCompleted(true);
  
  // Save attempt to Firebase
  try {
    // Extract examId from testId (format is "examId-testNumber")
    let examId;
    
    // Check if testId contains a hyphen
    if (testId && testId.includes('-')) {
      const parts = testId.split('-');
      examId = parts[0];
      console.log(`Using examId "${examId}" extracted from testId "${testId}"`);
    } else {
      // If testId doesn't match the expected format, use it as is or extract a number
      examId = testId;
      console.log(`Using entire testId "${testId}" as examId`);
    }
    
    // Ensure examId is a valid string (not undefined or null)
    if (!examId) {
      console.error(`Invalid examId extracted from testId "${testId}"`);
      // Fallback to a safe default to prevent NaN in the database
      examId = "1";
      console.log(`Using fallback examId "${examId}"`);
    }
    
    console.log(`Saving progress with examId: "${examId}" and testId: "${testId}"`);
    const attemptId = await updateTestProgress(examId, testId, resultData);
    
    if (attemptId) {
      console.log(`Test progress saved successfully with ID: ${attemptId}`);
    } else {
      console.log('Failed to save test progress, but test results are still displayed');
      
      // You could show a message to the user here if needed
      /* 
      setErrorMessage('Your test results are shown but could not be saved to your account. ' +
                     'You may need to sign in again.');
      */
    }
  } catch (error) {
    console.error('Error saving test progress:', error);
    console.log('Continuing to show test results despite save error');
    
    // You could show a message to the user here if needed
  }
};
  // Retry the test
  const handleRetry = () => {
    setAnswers({});
    setShowExplanation({});
    setCurrentQuestion(0);
    setTestCompleted(false);
    setScore(null);
    setShowResults(false);
    
    // Reset timer if in exam mode
    if (mode === 'exam' && test) {
      setTimeRemaining(test.timeLimit * 60);
    }
  };

  // View detailed results
  const handleViewResults = () => {
    setShowResults(true);
  };

  // Format time for display
  const formatTime = (seconds) => {
    if (!seconds && seconds !== 0) return '--:--';
    
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (loading) {
    return <Loading size="large" text="Loading practice test..." />;
  }

  // Render test completion screen
  if (testCompleted) {
    if (showResults) {
      // Detailed results view
      return (
        <div className="practice-test-container">
          <div className="test-results-detailed">
            <h1>Test Results: {test.title}</h1>
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
                onClick={() => navigate('/tests')}
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
                <div className="detail-value">{test.passingScore}%</div>
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
              onClick={() => navigate('/tests')}
              className="btn-outline"
            >
              Back to Tests
            </button>
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
      <div className="test-header">
        <h1>{test.title}</h1>
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
    </div>
  );
};

export default EnhancedPracticeTest;