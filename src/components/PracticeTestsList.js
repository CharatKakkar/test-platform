// components/PracticeTestsList.js
import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import Loading from './Loading';
import './PracticeTestsList.css';
import { 
  getExamById, 
  getPracticeTestsByExamId, 
  getUserExamProgress, 
  resetAllUserProgress 
} from '../services/firebaseService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const PracticeTestsList = ({ user, addToCart, removeFromCart, cart }) => {
  const { examId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState(null);
  const [practiceTests, setPracticeTests] = useState([]);
  const [progressData, setProgressData] = useState({});
  const [filter, setFilter] = useState('all');
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [tests, setTests] = useState([]);

  useEffect(() => {
    const fetchExamAndTests = async () => {
      setLoading(true);
      try {
        console.log(`Fetching exam with ID: ${examId}`);
        console.log("Current user:", user);
        
        // Attempt to retrieve the exam data from session storage first (if set by Dashboard)
        let examData = null;
        try {
          const storedExam = sessionStorage.getItem('currentExam');
          if (storedExam) {
            const parsedExam = JSON.parse(storedExam);
            if (parsedExam && parsedExam.id === examId) {
              console.log("Using exam data from session storage:", parsedExam);
              examData = parsedExam;
            }
          }
        } catch (storageError) {
          console.error("Error reading from session storage:", storageError);
        }
        
        // If not in session storage or invalid, fetch from Firebase
        if (!examData) {
          console.log("Fetching exam data from Firebase");
          examData = await getExamById(examId);
        }
        
        if (!examData) {
          setError(`Exam with ID ${examId} not found.`);
          setLoading(false);
          return;
        }
        
        console.log("Found exam:", examData);
        console.log("User data:", user);
        console.log("Exam purchase data:", {
          purchaseDate: examData.purchaseDate,
          purchasedExams: examData.purchasedExams,
          purchaseDetails: examData.purchaseDetails
        });
        
        // Fetch practice tests directly using the document ID
        console.log(`Fetching practice tests using exam ID: ${examId}`);
        const allTests = await getPracticeTestsByExamId(examId);
        console.log(`Found ${allTests.length} practice tests:`, allTests);
        
        // Store all tests
        setTests(allTests);
        
        // Check purchase status directly
        let hasPurchased = false;
        if (user) {
          const purchasesRef = collection(db, "purchasedExams", user.id, "purchases");
          const q = query(purchasesRef, where("examId", "==", examId));
          const purchaseSnapshot = await getDocs(q);
          hasPurchased = !purchaseSnapshot.empty;
          console.log("Direct purchase check:", { hasPurchased, purchaseCount: purchaseSnapshot.size });
        }
        
        // If user has purchased or is not logged in, show appropriate tests
        if (hasPurchased) {
          console.log("User has purchased, showing all tests");
          setPracticeTests(allTests);
          setIsDemoMode(false);
        } else if (!user) {
          console.log("No user logged in, showing first test only");
          setPracticeTests(allTests.slice(0, 1));
          setIsDemoMode(true);
        } else {
          console.log("User logged in but hasn't purchased, showing first test only");
          setPracticeTests(allTests.slice(0, 1));
          setIsDemoMode(true);
        }
        
        // If user is authenticated, get their progress data
        let progress = {};
        if (user && user.id) {
          console.log("Fetching progress for user with ID:", user.id);
          const userProgress = await getUserExamProgress(user.id);
          progress = userProgress[examId] || {};
          console.log("Filtered progress data for this exam:", progress);
        }
        
        setProgressData(progress);
        setError(null);
      } catch (error) {
        console.error("Error fetching exam data:", error);
        setError("Failed to load practice tests. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchExamAndTests();
  }, [examId, user]);

  // Calculate exam progress percentage
  const calculateProgress = () => {
    if (!practiceTests.length) return 0;
    
    let completedTests = 0;
    
    practiceTests.forEach(test => {
      if (progressData[test.id] && progressData[test.id].attempts > 0) {
        completedTests++;
      }
    });
    
    return Math.round((completedTests / practiceTests.length) * 100);
  };

  // Start practice test in specified mode
  const startTest = (testId, mode) => {
    // If user is not logged in and trying to access a test other than the first one
    if (!user && testId !== practiceTests[0]?.id) {
      // Show a message encouraging sign up
      setError("Please sign up to access more practice tests.");
      return;
    }
    
    // Pass both the test ID and exam ID to the practice test component
    navigate(`/practice-test/${testId}`, { 
      state: { 
        mode, 
        examId,
        isDemo: !user // Pass demo status to the practice test component
      } 
    });
  };

  // Handle reset progress button click
  const handleResetProgress = async () => {
    if (!user) {
      setError("You must be logged in to reset progress.");
      return;
    }
    
    setIsResetting(true);
    try {
      // Reset all progress in Firebase
      await resetAllUserProgress(user.uid);
      
      // Update local state to reflect the reset
      setProgressData({}); // Set to empty object immediately without waiting for refetch
      
      // Optionally, you can refetch from Firebase to ensure sync
      const userProgress = await getUserExamProgress(user.uid);
      setProgressData(userProgress[examId] || {});
      
      console.log('Progress data successfully reset');
    } catch (error) {
      console.error("Error resetting progress:", error);
      setError("Failed to reset progress. Please try again later.");
    } finally {
      setIsResetting(false);
    }
  };
  
  // Filter tests based on selected filter
  const getFilteredTests = () => {
    switch (filter) {
      case 'completed':
        return practiceTests.filter(test => 
          progressData[test.id] && progressData[test.id].attempts > 0
        );
      case 'not-started':
        return practiceTests.filter(test => 
          !progressData[test.id] || progressData[test.id].attempts === 0
        );
      case 'passed':
        return practiceTests.filter(test => 
          progressData[test.id] && 
          progressData[test.id].bestScore >= (test.passingScore || 70)
        );
      case 'failed':
        return practiceTests.filter(test => 
          progressData[test.id] && 
          progressData[test.id].attempts > 0 &&
          progressData[test.id].bestScore < (test.passingScore || 70)
        );
      default:
        return practiceTests;
    }
  };

  // Calculate remaining days of access
  const getRemainingDays = () => {
    if (!exam || !exam.purchaseDetails?.validityDays) return 365; // Default to 365 if not set
    
    // Helper function to parse date from various formats
    const parseDate = (dateInput) => {
      if (!dateInput) return new Date();
      
      try {
        // Case 1: Firestore Timestamp object with seconds and nanoseconds
        if (dateInput.seconds && dateInput.nanoseconds) {
          console.log('Parsing Firestore timestamp:', dateInput);
          return new Date(dateInput.seconds * 1000);
        }
        
        // Case 2: ISO date string format (e.g. "2025-04-18T19:28:30.952Z")
        if (typeof dateInput === 'string') {
          console.log('Parsing date string:', dateInput);
          const parsedDate = new Date(dateInput);
          
          // Check if the date is valid
          if (!isNaN(parsedDate.getTime())) {
            return parsedDate;
          }
          
          // Custom format handling if needed
          if (dateInput.includes(' at ')) {
            const [date, time, timezone] = dateInput.split(' at ');
            const standardDateString = `${date} ${time} ${timezone}`;
            return new Date(standardDateString);
          }
        }
        
        // Case 3: Already a Date object
        if (dateInput instanceof Date) {
          return dateInput;
        }
        
        // Default fallback
        console.log('Unrecognized date format, using current date:', dateInput);
        return new Date();
      } catch (error) {
        console.error('Error parsing date:', dateInput, error);
        return new Date();
      }
    };
    
    // Determine the start date with multiple fallback options
    let startDate;
    if (exam.purchaseDate) {
      startDate = parseDate(exam.purchaseDate);
    } else if (exam.createdAt) {
      startDate = parseDate(exam.createdAt);
    } else {
      // Absolute fallback
      startDate = new Date();
    }
    
    console.log('Using start date:', startDate);
    
    const validityDays = exam.purchaseDetails.validityDays || 365;
    const expiryDate = new Date(startDate);
    expiryDate.setDate(expiryDate.getDate() + validityDays);
    
    const today = new Date();
    const diffTime = expiryDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  };

  if (loading) {
    return <Loading size="large" text="Loading practice tests..." />;
  }
  
  if (error) {
    return (
      <div className="practice-tests-container">
        <div className="error-message">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/exams')} className="btn btn-primary">
            Back to Exams
          </button>
        </div>
      </div>
    );
  }

  const filteredTests = getFilteredTests();
  
  // Add these console logs to debug the progress calculation
  console.log("Debug - Progress Calculation:");
  console.log("Practice Tests:", practiceTests);
  console.log("Progress Data:", progressData);

  // Debug helper to see exactly what's happening in calculateProgress
  const debugCalculateProgress = () => {
    if (!practiceTests.length) return 0;
    let completedTests = 0;
    
    practiceTests.forEach(test => {
      // Check if we have progress data for this test
      if (progressData[test.id] && progressData[test.id].attempts > 0) {
        completedTests++;
      } 
    });
    
    const percentage = Math.round((completedTests / practiceTests.length) * 100);

    return percentage;
  };

  // Replace the original calculateProgress call with this debug version
  const progressPercentage = debugCalculateProgress();
  console.log("Final progress percentage:", progressPercentage);
  
  const remainingDays = getRemainingDays();

  return (
    <div className="practice-tests-container">
      <div className="exam-header">
        <h1>{exam?.title}</h1>
        <div className="exam-category">{exam?.category}</div>
      </div>
      
      {isDemoMode && (
        <div className="demo-notice">
          <div className="demo-banner">
            <h3>Try Before You Buy</h3>
            <p>Take the first practice test for free! No login required. Sign up to save your progress and unlock all {tests.length} practice tests.</p>
            <div className="demo-actions">
              {!user && (
                <button 
                  className="btn btn-primary"
                  onClick={() => navigate('/register')}
                >
                  Sign Up to Save Progress
                </button>
              )}
              {cart && cart.some(item => item.id === exam?.id) ? (
                <button 
                  className="btn btn-danger"
                  onClick={() => {
                    if (exam) {
                      removeFromCart(exam.id);
                    }
                  }}
                >
                  Remove from Cart
                </button>
              ) : (
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    if (exam) {
                      addToCart({
                        id: exam.id,
                        title: exam.title,
                        price: exam.price,
                        category: exam.category
                      });
                    }
                  }}
                >
                  Buy Full Access
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      <div className="exam-info-panel">
        <div className="exam-stats">
          <div className="stat-card">
            <div className="stat-value">{tests.length}</div>
            <div className="stat-label">Practice Tests</div>
          </div>
          {!isDemoMode && (
            <>
              <div className="stat-card">
                <div className="progress-circle">
                  <svg viewBox="0 0 36 36">
                    <path
                      className="progress-circle-bg"
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="progress-circle-fill"
                      strokeDasharray={`${calculateProgress()}, 100`}
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <text x="18" y="20.35" className="progress-text">
                      {calculateProgress()}%
                    </text>
                  </svg>
                </div>
                <div className="stat-label">Course Progress</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{remainingDays}</div>
                <div className="stat-label">Days Remaining</div>
              </div>
            </>
          )}
        </div>
        
        <div className="exam-description">
          <h2>Course Overview</h2>
          <p>{exam?.description}</p>
          <div className="exam-info">
            <div className="info-item">
              <span className="info-label">Passing Score</span>
              <span className="info-value">{exam?.passingScore}%</span>
            </div>
            {exam?.purchaseDate && (
              <div className="info-item">
                <span className="info-label">Purchase Date</span>
                <span className="info-value">
                  {new Date(exam.purchaseDate).toLocaleDateString()}
                </span>
              </div>
            )}
            {!isDemoMode && (
              <div className="info-item">
                <span className="info-label">Access Until</span>
                <span className="info-value">
                  {new Date(new Date().getTime() + (remainingDays * 24 * 60 * 60 * 1000)).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="tests-filter-container">
        <h2>Practice Tests</h2>
        {!isDemoMode && (
          <div className="filter-tabs">
            <button 
              className={filter === 'all' ? 'active' : ''} 
              onClick={() => setFilter('all')}
            >
              All Tests
            </button>
            <button 
              className={filter === 'not-started' ? 'active' : ''} 
              onClick={() => setFilter('not-started')}
            >
              Not Started
            </button>
            <button 
              className={filter === 'completed' ? 'active' : ''} 
              onClick={() => setFilter('completed')}
            >
              Completed
            </button>
            <button 
              className={filter === 'passed' ? 'active' : ''} 
              onClick={() => setFilter('passed')}
            >
              Passed
            </button>
            <button 
              className={filter === 'failed' ? 'active' : ''} 
              onClick={() => setFilter('failed')}
            >
              Failed
            </button>
          </div>
        )}
      </div>
      
      {practiceTests.length === 0 ? (
        <div className="no-tests-message">
          <p>No practice tests available.</p>
        </div>
      ) : (
        <div className="practice-tests-list">
          {practiceTests.map(test => {
            const testProgress = progressData[test.id] || { attempts: 0, bestScore: 0 };
            
            return (
              <div key={test.id} className="practice-test-card">
                <div className="test-card-header">
                  <div className="test-info">
                    <h3>{test.displayName || `${exam?.title} - ${test.title}`}</h3>
                    <div className="test-meta">
                      <span className="test-meta-item">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        {test.timeLimit} min
                      </span>
                      <span className="test-meta-item">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                          <polyline points="13 2 13 9 20 9"></polyline>
                        </svg>
                        {test.questionCount} questions
                      </span>
                      <span className={`difficulty-badge ${test.difficulty?.toLowerCase()}`}>
                        {test.difficulty}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="test-card-details">
                  {!isDemoMode && testProgress.attempts > 0 && (
                    <div className="test-history">
                      <h4>Attempt History</h4>
                      <div className="history-stats">
                        <div className="history-stat">
                          <span className="stat-label">First Attempt</span>
                          <span className="stat-value">{testProgress.firstScore || 0}%</span>
                        </div>
                        <div className="history-stat">
                          <span className="stat-label">Best Score</span>
                          <span className={`stat-value ${testProgress.bestScore >= test.passingScore ? 'passing' : 'failing'}`}>
                            {testProgress.bestScore}%
                          </span>
                        </div>
                        <div className="history-stat">
                          <span className="stat-label">Last Attempt</span>
                          <span className="stat-value">{testProgress.lastScore || 0}%</span>
                        </div>
                        <div className="history-stat">
                          <span className="stat-label">Attempts</span>
                          <span className="stat-value">{testProgress.attempts}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="test-actions">
                    {isDemoMode && test.id !== practiceTests[0].id ? (
                      <div className="locked-test-message">
                        <div className="lock-icon">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                          </svg>
                        </div>
                        <h4>Unlock More Tests</h4>
                        <p>Sign up to save your progress and get access to all {tests.length} practice tests.</p>
                        {!user && (
                          <button 
                            className="btn btn-primary"
                            onClick={() => navigate('/register')}
                          >
                            Sign Up Now
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="mode-options">
                        <div className="mode-option">
                          <h4>Exam Mode</h4>
                          <p>Timed test with results at the end. Simulates the actual exam experience.</p>
                          <button 
                            className="mode-btn exam-mode"
                            onClick={() => startTest(test.id, 'exam')}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10"></circle>
                              <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            Start Exam Mode
                          </button>
                        </div>
                        
                        <div className="mode-option">
                          <h4>Practice Mode</h4>
                          <p>Untimed test with immediate feedback. Great for learning and reviewing content.</p>
                          <button 
                            className="mode-btn practice-mode"
                            onClick={() => startTest(test.id, 'practice')}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                            </svg>
                            Start Practice Mode
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {user && !isDemoMode && (
        <div className="debug-controls" style={{ marginTop: '30px', padding: '15px', background: '#f8f8f8', borderRadius: '8px' }}>
          <h3>Debug Controls</h3>
          <button 
            onClick={handleResetProgress}
            disabled={isResetting}
            style={{ 
              padding: '8px 16px', 
              background: '#e74c3c', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer',
              opacity: isResetting ? 0.7 : 1
            }}
          >
            {isResetting ? 'Resetting...' : 'Reset All Progress Data'}
          </button>
          <p style={{ fontSize: '0.8rem', marginTop: '8px', color: '#666' }}>
            This will clear all saved test progress in Firebase (for development purposes).
          </p>
          <div style={{ marginTop: '10px' }}>
            <p style={{ fontSize: '0.8rem', color: '#666' }}>
              <strong>Exam ID:</strong> {examId}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PracticeTestsList;