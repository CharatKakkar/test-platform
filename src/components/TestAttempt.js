// components/TestAttempt.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function TestAttempt() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testCompleted, setTestCompleted] = useState(false);
  const [score, setScore] = useState(null);

  useEffect(() => {
    // Simulate API call to get test and questions
    setTimeout(() => {
      // Mock test data
      const testData = {
        id: parseInt(testId),
        title: testId === '1' ? 'Demo Test' : `Practice Test ${testId}`,
        time: testId === '1' ? 15 : 60, // minutes
      };
      
      // Mock questions data
      const mockQuestions = [];
      const numQuestions = testId === '1' ? 10 : 50;
      
      for (let i = 1; i <= numQuestions; i++) {
        mockQuestions.push({
          id: i,
          text: `Question ${i}: This is a sample question about topic ${i % 3 + 1}?`,
          options: [
            { id: 'a', text: 'Option A' },
            { id: 'b', text: 'Option B' },
            { id: 'c', text: 'Option C' },
            { id: 'd', text: 'Option D' }
          ],
          // In a real app, correct answers would not be sent to the client
          correctAnswer: String.fromCharCode(97 + (i % 4)) // a, b, c, or d
        });
      }
      
      setTest(testData);
      setQuestions(mockQuestions);
      setTimeLeft(testData.time * 60); // convert to seconds
      setLoading(false);
    }, 500);
  }, [testId]);

  // Timer
  useEffect(() => {
    if (loading || testCompleted || timeLeft === null) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          submitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [loading, testCompleted, timeLeft]);

  const handleAnswer = (optionId) => {
    setAnswers(prev => ({
      ...prev,
      [questions[currentQuestion].id]: optionId
    }));
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const submitTest = () => {
    // Calculate score
    let correct = 0;
    questions.forEach(question => {
      if (answers[question.id] === question.correctAnswer) {
        correct++;
      }
    });
    
    const finalScore = Math.round((correct / questions.length) * 100);
    setScore(finalScore);
    
    // Save attempt to history
    const attemptHistory = JSON.parse(localStorage.getItem('attemptHistory') || '[]');
    const newAttempt = {
      id: Date.now(),
      testId: parseInt(testId),
      testName: test.title,
      date: new Date().toISOString(),
      score: finalScore,
      totalQuestions: questions.length,
      correctAnswers: correct
    };
    attemptHistory.push(newAttempt);
    localStorage.setItem('attemptHistory', JSON.stringify(attemptHistory));
    
    setTestCompleted(true);
  };

  if (loading) {
    return <div className="loading">Loading test...</div>;
  }

  // Format time left
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (testCompleted) {
    return (
      <div className="test-completed">
        <h1>Test Completed!</h1>
        <div className="score-container">
          <h2>Your Score: {score}%</h2>
          <p>You answered {Object.keys(answers).length} out of {questions.length} questions.</p>
        </div>
        <div className="test-actions">
          <button onClick={() => navigate('/history')} className="btn-primary">View Attempt History</button>
          <button onClick={() => navigate('/tests')} className="btn-secondary">Back to Tests</button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];

  return (
    <div className="test-attempt-container">
      <div className="test-header">
        <h1>{test.title}</h1>
        <div className="test-progress">
          <span>Question {currentQuestion + 1} of {questions.length}</span>
          <div className="timer">Time Left: {formatTime(timeLeft)}</div>
        </div>
      </div>
      
      <div className="question-container">
        <h2>{currentQ.text}</h2>
        <div className="options">
          {currentQ.options.map(option => (
            <div 
              key={option.id} 
              className={`option ${answers[currentQ.id] === option.id ? 'selected' : ''}`}
              onClick={() => handleAnswer(option.id)}
            >
              <span className="option-label">{option.id.toUpperCase()}</span>
              <span className="option-text">{option.text}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="navigation">
        <button 
          onClick={prevQuestion} 
          className="btn-secondary"
          disabled={currentQuestion === 0}
        >
          Previous
        </button>
        {currentQuestion < questions.length - 1 ? (
          <button onClick={nextQuestion} className="btn-primary">Next</button>
        ) : (
          <button onClick={submitTest} className="btn-primary">Submit Test</button>
        )}
      </div>
      
      <div className="question-navigator">
        {questions.map((q, index) => (
          <button 
            key={q.id}
            className={`question-num ${currentQuestion === index ? 'current' : ''} ${answers[q.id] ? 'answered' : ''}`}
            onClick={() => setCurrentQuestion(index)}
          >
            {index + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

export default TestAttempt;
