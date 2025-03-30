import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Loading from './Loading';

const DemoExam = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(1800); // 30 minutes in seconds
  const [examCompleted, setExamCompleted] = useState(false);

  useEffect(() => {
    // Simulate loading questions from an API
    const fetchQuestions = async () => {
      try {
        // Replace with actual API call
        setTimeout(() => {
          const demoQuestions = [
            {
              id: 1,
              question: "What is the primary purpose of React's virtual DOM?",
              options: [
                "To render HTML elements directly to the browser",
                "To improve performance by minimizing actual DOM manipulations",
                "To create 3D animations with JavaScript",
                "To bypass browser compatibility issues"
              ],
              correctAnswer: 1
            },
            {
              id: 2,
              question: "Which hook is used to perform side effects in a function component?",
              options: [
                "useState",
                "useContext",
                "useEffect",
                "useReducer"
              ],
              correctAnswer: 2
            },
            {
              id: 3,
              question: "What does JSX stand for?",
              options: [
                "JavaScript XML",
                "JavaScript Extension",
                "Java Standard XML",
                "JavaScript Extra"
              ],
              correctAnswer: 0
            },
            {
              id: 4,
              question: "How do you pass data from a parent to a child component in React?",
              options: [
                "Using global variables",
                "Using props",
                "Using context only",
                "Using Redux only"
              ],
              correctAnswer: 1
            },
            {
              id: 5,
              question: "Which statement best describes React components?",
              options: [
                "Server-side scripts that generate HTML",
                "Independent, reusable pieces of code that return HTML elements",
                "CSS frameworks for styling web applications",
                "Database models that store application data"
              ],
              correctAnswer: 1
            }
          ];
          setQuestions(demoQuestions);
          setLoading(false);
        }, 1500);
      } catch (error) {
        console.error("Error fetching questions:", error);
        setLoading(false);
      }
    };

    fetchQuestions();

    // Set up timer
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          submitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleAnswer = (questionId, optionIndex) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const navigateToQuestion = (index) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestion(index);
    }
  };

  const submitExam = () => {
    setExamCompleted(true);
    
    // Calculate score
    let score = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correctAnswer) {
        score++;
      }
    });
    
    // Store results for the checkout page
    localStorage.setItem('examResults', JSON.stringify({
      score: score,
      totalQuestions: questions.length,
      percentage: Math.round((score / questions.length) * 100),
      timeSpent: 1800 - timeRemaining,
      answers: answers
    }));
  };

  const proceedToCheckout = () => {
    navigate('/checkout');
  };

  if (loading) {
    return <Loading message="Loading exam questions..." />;
  }

  if (examCompleted) {
    const results = JSON.parse(localStorage.getItem('examResults'));
    
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Exam Completed</h1>
        
        <div className="mb-8 p-6 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Your Results</h2>
          <p className="text-lg mb-2">Score: {results.score} out of {results.totalQuestions}</p>
          <p className="text-lg mb-2">Percentage: {results.percentage}%</p>
          <p className="text-lg mb-4">
            Time spent: {Math.floor(results.timeSpent / 60)}m {results.timeSpent % 60}s
          </p>
          
          <div className="w-full bg-gray-200 rounded-full h-4 mb-6">
            <div 
              className={`h-4 rounded-full ${results.percentage >= 70 ? 'bg-green-500' : 'bg-red-500'}`}
              style={{ width: `${results.percentage}%` }}
            ></div>
          </div>
          
          {results.percentage >= 70 ? (
            <p className="text-green-600 font-semibold">Congratulations! You passed the demo exam.</p>
          ) : (
            <p className="text-red-600 font-semibold">You did not pass the demo exam. Consider reviewing the material.</p>
          )}
        </div>
        
        <button 
          onClick={proceedToCheckout}
          className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-200"
        >
          Proceed to Full Course Registration
        </button>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Demo Exam</h1>
        <div className="text-lg font-medium">
          Time: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
        </div>
      </div>
      
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <p className="text-lg font-medium">Question {currentQuestion + 1} of {questions.length}</p>
          <p className="text-sm text-gray-600">
            {Object.keys(answers).length} of {questions.length} answered
          </p>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
          ></div>
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl mb-4">{currentQ.question}</h2>
        
        <div className="space-y-3">
          {currentQ.options.map((option, index) => (
            <div 
              key={index}
              onClick={() => handleAnswer(currentQ.id, index)}
              className={`p-4 border rounded-lg cursor-pointer transition duration-200 ${
                answers[currentQ.id] === index 
                  ? 'bg-blue-100 border-blue-500' 
                  : 'hover:bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center">
                <div className={`w-6 h-6 flex items-center justify-center rounded-full mr-3 ${
                  answers[currentQ.id] === index 
                    ? 'bg-blue-500 text-white' 
                    : 'border border-gray-400'
                }`}>
                  {answers[currentQ.id] === index && '✓'}
                </div>
                <span>{option}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex justify-between items-center mb-8">
        <button 
          onClick={() => navigateToQuestion(currentQuestion - 1)}
          disabled={currentQuestion === 0}
          className={`px-4 py-2 rounded-lg ${
            currentQuestion === 0 
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          }`}
        >
          Previous
        </button>
        
        <div className="flex space-x-2">
          {questions.map((_, index) => (
            <button
              key={index}
              onClick={() => navigateToQuestion(index)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                currentQuestion === index
                  ? 'bg-blue-600 text-white'
                  : answers[questions[index].id] !== undefined
                  ? 'bg-green-100 text-green-800 border border-green-300'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
        
        {currentQuestion < questions.length - 1 ? (
          <button 
            onClick={() => navigateToQuestion(currentQuestion + 1)}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
          >
            Next
          </button>
        ) : (
          <button 
            onClick={submitExam}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Submit
          </button>
        )}
      </div>
    </div>
  );
};

export default DemoExam;