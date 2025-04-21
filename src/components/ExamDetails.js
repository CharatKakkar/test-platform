// Modified ExamDetails.js with attempt history integration
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  getExamById, 
  getUserPurchasedExams,
  getPracticeTestsByExamId,
  getUserExamProgress 
} from '../services/firebaseService';
import Loading from './Loading';
import './ExamDetails.css';


const ExamDetails = ({ user, isAuthenticated, addToCart, removeFromCart, cart }) => {
  const { examId } = useParams();
  const navigate = useNavigate();
  
  const [exam, setExam] = useState(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [practiceTests, setPracticeTests] = useState([]);
  const [progressData, setProgressData] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [notification, setNotification] = useState({ show: false, message: '' });
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  
  // Helper for consistent logging
  const logInfo = (message, data) => {
    console.log(`[ExamDetails] ${message}`, data || '');
  };
  
  useEffect(() => {
    const fetchExamData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        logInfo(`Fetching exam data for ID: ${examId}`);
        
        // Try to get exam data from session storage first
        const storedExam = sessionStorage.getItem('currentExam');
        let examData = null;
        
        if (storedExam) {
          try {
            const parsedData = JSON.parse(storedExam);
            // Verify it's the same exam we need
            if (parsedData.id === examId) {
              examData = parsedData;
              logInfo('Retrieved exam data from session storage', examData);
            }
          } catch (e) {
            logInfo('Error parsing session storage data', e);
          }
        }
        
        // If no data in session storage or wrong exam, fetch from Firebase
        if (!examData) {
          logInfo('Fetching exam data from Firebase');
          examData = await getExamById(examId);
          
          if (!examData) {
            throw new Error(`Exam with ID ${examId} not found in the database`);
          }
          
          logInfo('Received exam data from Firebase', examData);
        }
        
        setExam(examData);
        
        // Check if user has unlocked this exam (if authenticated)
        if (isAuthenticated && user) {
          const userId = user.uid || user.id;
          logInfo(`Checking if user ${userId} has unlocked exam ${examId}`);
          
          const purchasedExams = await getUserPurchasedExams(userId);
          const unlocked = purchasedExams.some(purchase => purchase.examId === examId);
          
          logInfo(`Exam is ${unlocked ? 'unlocked' : 'locked'} for user`);
          setIsUnlocked(unlocked);
          
          // If the user has unlocked the exam, fetch practice tests and progress
          if (unlocked) {
            logInfo('Exam is unlocked, fetching practice tests');
            
            try {
              // Get practice tests
              const tests = await getPracticeTestsByExamId(examId);
              logInfo(`Found ${tests.length} practice tests`, tests);
              
              // Get user progress for this exam
              const userProgress = await getUserExamProgress(userId);
              const examProgress = userProgress[examId] || {};
              logInfo('User progress data:', examProgress);
              
              // Combine test data with progress data
              const testsWithProgress = tests.map(test => {
                const testProgress = examProgress[test.id] || {};
                return {
                  ...test,
                  attempts: testProgress.attempts || 0,
                  bestScore: testProgress.bestScore || 0,
                  firstScore: testProgress.firstScore || 0,
                  lastScore: testProgress.lastScore || 0
                };
              });
              
              setPracticeTests(testsWithProgress);
              setProgressData(examProgress);
              
            } catch (err) {
              console.error('Error fetching practice tests or progress:', err);
              setPracticeTests([]);
              setProgressData({});
            }
          }
        }
      } catch (err) {
        console.error('Error in fetchExamData:', err);
        setError(err.message || 'Failed to load exam details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchExamData();
  }, [examId, isAuthenticated, user]);
  
  // Check if exam is in cart
  const isInCart = () => {
    return cart && exam && cart.some(item => item.id === exam.id);
  };
  
  const handleAddToCart = () => {
    if (!exam) return;
    
    addToCart(exam);
    
    // Show notification
    setNotification({
      show: true,
      message: `${exam.title} added to cart!`
    });
    
    // Hide notification after 3 seconds
    setTimeout(() => {
      setNotification({ show: false, message: '' });
    }, 3000);
  };
  
  const handleRemoveFromCart = () => {
    if (!exam) return;
    
    removeFromCart(exam.id);
    
    // Show notification
    setNotification({
      show: true,
      message: `${exam.title} removed from cart!`
    });
    
    // Hide notification after 3 seconds
    setTimeout(() => {
      setNotification({ show: false, message: '' });
    }, 3000);
  };
  
  // Navigate to practice tests page
  const handleViewPracticeTests = () => {
    navigate(`/exam/${examId}/practice-tests`);
  };
  
  // Calculate progress percentage
  const calculateOverallProgress = () => {
    if (!practiceTests.length) return 0;
    
    let completedTests = 0;
    
    practiceTests.forEach(test => {
      if (test.attempts > 0) {
        completedTests++;
      }
    });
    
    return Math.round((completedTests / practiceTests.length) * 100);
  };
  
  // Calculate average score
  const calculateAverageScore = () => {
    if (!practiceTests.length) return 0;
    
    const testsWithScores = practiceTests.filter(test => test.bestScore > 0);
    if (!testsWithScores.length) return 0;
    
    const totalScore = testsWithScores.reduce((sum, test) => sum + test.bestScore, 0);
    return Math.round(totalScore / testsWithScores.length);
  };
  
  // Count passed tests
  const countPassedTests = () => {
    return practiceTests.filter(test => 
      test.bestScore >= (test.passingScore || 70)
    ).length;
  };
  
  // Get default thumbnail SVG for exams without thumbnails
  const getDefaultThumbnail = (category) => {
    const colors = {
      'IT': '#275d8b',
      'Cloud': '#f90',
      'Project Management': '#4b9b4b',
      'Networking': '#005073',
      'Education': '#c41230',
      'Security': '#bd582c',
      'Development': '#0078d4'
    };
    
    const bgColor = colors[category] || '#333';
    const text = exam ? exam.title.split(' ').map(word => word[0]).join('').substring(0, 3) : 'EX';
    
    return `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="100" viewBox="0 0 160 100"%3E%3Crect width="160" height="100" fill="${bgColor.replace('#', '%23')}"/%3E%3Ctext x="80" y="50" font-family="Arial" font-size="18" text-anchor="middle" fill="white"%3E${text}%3C/text%3E%3C/svg%3E`;
  };
  
  const getFilteredTests = () => {
    let filtered = [...practiceTests];
    
    // Apply status filter
    if (statusFilter !== 'all') {
      switch (statusFilter) {
        case 'not-started':
          filtered = filtered.filter(test => !test.attempts || test.attempts === 0);
          break;
        case 'in-progress':
          filtered = filtered.filter(test => 
            test.attempts > 0 && 
            test.bestScore < (test.passingScore || 70)
          );
          break;
        case 'passed':
          filtered = filtered.filter(test => 
            test.bestScore >= (test.passingScore || 70)
          );
          break;
        case 'failed':
          filtered = filtered.filter(test => 
            test.attempts > 0 && 
            test.bestScore < (test.passingScore || 70)
          );
          break;
        default:
          break;
      }
    }
    
    // Apply sorting
    switch (sortOrder) {
      case 'alphabetical':
        filtered.sort((a, b) => 
          (a.title || '').localeCompare(b.title || '')
        );
        break;
      case 'difficulty':
        // Create mapping for difficulty sorting
        const difficultyMap = { 'easy': 1, 'medium': 2, 'hard': 3 };
        filtered.sort((a, b) => {
          const aDiff = (a.difficulty || '').toLowerCase();
          const bDiff = (b.difficulty || '').toLowerCase();
          return (difficultyMap[aDiff] || 0) - (difficultyMap[bDiff] || 0);
        });
        break;
      case 'score':
        filtered.sort((a, b) => (b.bestScore || 0) - (a.bestScore || 0));
        break;
      default: // newest by default
        // Assuming newer tests have higher IDs or there's a created date
        filtered.sort((a, b) => (b.id || '').localeCompare(a.id || ''));
        break;
    }
    
    return filtered;
  };

  
  if (loading) {
    return (
      <div className="exam-details-container">
        <Loading size="medium" text="Loading exam details..." />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="exam-details-container">
        <div className="error-message">
          <h2>Error Loading Exam</h2>
          <p>{error}</p>
          <Link to="/exams" className="btn btn-primary">Back to Exams</Link>
        </div>
      </div>
    );
  }
  
  if (!exam) {
    return (
      <div className="exam-details-container">
        <div className="error-message">
          <h2>Exam Not Found</h2>
          <p>We couldn't find the exam you're looking for.</p>
          <Link to="/exams" className="btn btn-primary">Back to Exams</Link>
        </div>
      </div>
    );
  }
  
  // The overall progress for display in the header
  const overallProgress = calculateOverallProgress();
  
  return (
    <div className="exam-details-container">
      {/* Notification */}
      {notification.show && (
        <div className="notification">
          <p>{notification.message}</p>
        </div>
      )}
      
      <div className="exam-details-header">
        <div className="exam-details-thumbnail">
          <img 
            src={exam.thumbnail || getDefaultThumbnail(exam.category)} 
            alt={exam.title} 
            className="exam-thumbnail"
          />
        </div>
        <div className="exam-details-info">
          <h1>{exam.title}</h1>
          <span className="exam-details-category">{exam.category || 'Uncategorized'}</span>
          <div className="exam-details-meta">
            <span><i className="meta-icon">⏱️</i> {exam.duration || 'Not specified'}</span>
            <span><i className="meta-icon">❓</i> {exam.questionCount || '0'} Questions</span>
            <span><i className="meta-icon">📊</i> {exam.difficulty || 'Not specified'}</span>
            
            {/* Add progress indicator for unlocked exams */}
            {isUnlocked && (
              <span className="progress-indicator">
                <div className="progress-circle-small">
                  <svg viewBox="0 0 36 36">
                    <path
                      className="progress-circle-bg"
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="progress-circle-fill"
                      strokeDasharray={`${overallProgress}, 100`}
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span>{overallProgress}%</span>
                </div>
                <i className="meta-icon">📈</i> Progress
              </span>
            )}
          </div>
          <p className="exam-details-description">{exam.description || 'No description available.'}</p>
          <div className="exam-details-price-actions">
            <div className="exam-details-price">${exam.price?.toFixed(2) || "0.00"}</div>
            <div className="exam-details-actions">
              {isUnlocked ? (
                // If unlocked, show practice tests button
                <button 
                  className="btn btn-primary"
                  onClick={handleViewPracticeTests}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                    <polyline points="13 2 13 9 20 9"></polyline>
                  </svg>
                  View Practice Tests ({practiceTests.length || '0'})
                </button>
              ) : (
                // If locked, show demo and add to cart buttons
                <>
                  <Link to={`/demo/${exam.id}`} className="btn btn-outline">Try Demo</Link>
                  <button 
                    className={`btn ${isInCart() ? 'btn-danger' : 'btn-primary'}`}
                    onClick={isInCart() ? handleRemoveFromCart : handleAddToCart}
                  >
                    {isInCart() ? 'Remove from Cart' : 'Unlock Access'}
                  </button>
                </>
              )}
            </div>
          </div>
          
          {/* Cart Preview if item is in cart and locked */}
          {isAuthenticated && isInCart() && !isUnlocked && (
            <div className="cart-preview">
              <div className="cart-preview-header">
                <span>Item in cart</span>
                <Link to="/checkout" className="checkout-link">
                  Go to Checkout
                </Link>
              </div>
            </div>
          )}
          
          {/* Access status badge */}
          {isUnlocked ? (
            <div className="access-badge unlocked">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M17 11V6a5 5 0 0 0-9.58-1.5"></path>
              </svg>
              <span>Unlocked</span>
            </div>
          ) : (
            <div className="access-badge locked">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <span>Locked</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="exam-details-tabs">
        <button 
          className={activeTab === 'overview' ? 'active' : ''} 
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={activeTab === 'curriculum' ? 'active' : ''} 
          onClick={() => setActiveTab('curriculum')}
        >
          Curriculum
        </button>
        {isUnlocked && (
          <button 
            className={activeTab === 'practice' ? 'active' : ''} 
            onClick={() => setActiveTab('practice')}
          >
            Practice Tests
          </button>
        )}
        <button 
          className={activeTab === 'reviews' ? 'active' : ''} 
          onClick={() => setActiveTab('reviews')}
        >
          Reviews
        </button>
        <button 
          className={activeTab === 'faq' ? 'active' : ''} 
          onClick={() => setActiveTab('faq')}
        >
          FAQ
        </button>
      </div>
      
      <div className="exam-details-content">
        {activeTab === 'overview' && (
          <div className="exam-overview">
            <h2>About this Certification</h2>
            <p>{exam.longDescription || exam.description || 'No description available.'}</p>
            
            <h3>What you'll learn</h3>
            {typeof exam.curriculum === 'string' ? (
              <div className="curriculum-text">
                {exam.curriculum.split(/\n\n|\r\n\r\n/).map((paragraph, index) => (
                  <p key={index} className="curriculum-paragraph">{paragraph}</p>
                ))}
              </div>
            ) : (
              exam.curriculum && exam.curriculum.length > 0 ? (
                <div className="structured-curriculum">
                  {exam.curriculum.map((section, index) => (
                    <div className="curriculum-section" key={index}>
                      <h3>{section.section}</h3>
                      {section.topics && section.topics.length > 0 ? (
                        <ul className="curriculum-topics">
                          {section.topics.map((topic, i) => (
                            <li key={i}>{topic}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>Topics information will be available soon.</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p>Curriculum information will be available soon.</p>
              )
            )}
            
            <div className="exam-cta">
              <h3>{isUnlocked ? 'Ready to start practicing?' : 'Ready to get certified?'}</h3>
              {isUnlocked ? (
                <button 
                  className="btn btn-primary btn-large"
                  onClick={handleViewPracticeTests}
                >
                  Start Practice Tests
                </button>
              ) : isAuthenticated ? (
                <button 
                  className={`btn btn-large ${isInCart() ? 'btn-danger' : 'btn-primary'}`}
                  onClick={isInCart() ? handleRemoveFromCart : handleAddToCart}
                >
                  {isInCart() ? 'Remove from Cart' : 'Unlock Access'}
                </button>
              ) : (
                <Link to="/login" className="btn btn-primary btn-large">
                  Login to Unlock
                </Link>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'curriculum' && (
          <div className="exam-curriculum">
            <h2>Exam Curriculum</h2>
            {typeof exam.curriculum === 'string' ? (
              <div className="curriculum-text">
                {exam.curriculum.split(/\n\n|\r\n\r\n/).map((paragraph, index) => (
                  <p key={index} className="curriculum-paragraph">{paragraph}</p>
                ))}
              </div>
            ) : exam.curriculum && exam.curriculum.length > 0 ? (
              exam.curriculum.map((section, index) => (
                <div className="curriculum-section" key={index}>
                  <h3>{section.section}</h3>
                  {section.topics && section.topics.length > 0 ? (
                    <ul className="curriculum-topics">
                      {section.topics.map((topic, i) => (
                        <li key={i}>{topic}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>Topics information will be available soon.</p>
                  )}
                </div>
              ))
            ) : (
              <div className="no-data-message">
                <p>Detailed curriculum information is not available for this exam yet.</p>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'practice' && isUnlocked && (
          <div className="exam-practice-tests">
            <h2>Practice Tests</h2>
            
            {/* Stats summary card - using actual data */}
            <div className="practice-stats-summary">
              <div className="stat-card">
                <div className="stat-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                    <polyline points="13 2 13 9 20 9"></polyline>
                  </svg>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{practiceTests.length}</div>
                  <div className="stat-label">Total Tests</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <div className="stat-content">
                  <div className="stat-value">
                    {practiceTests.filter(test => test.attempts > 0).length}
                  </div>
                  <div className="stat-label">Tests Completed</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                </div>
                <div className="stat-content">
                  <div className="stat-value">
                    {countPassedTests()}
                  </div>
                  <div className="stat-label">Tests Passed</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                  </svg>
                </div>
                <div className="stat-content">
                  <div className="stat-value">
                    {calculateAverageScore()}%
                  </div>
                  <div className="stat-label">Avg. Best Score</div>
                </div>
              </div>
            </div>
            
            {/* Test filters */}
{/* Test filters - with working filter buttons */}
<div className="test-filters">
  <div className="filter-label">Filter by:</div>
  <div className="filter-options">
    <button 
      className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`} 
      onClick={() => setStatusFilter('all')}
    >
      All Tests
    </button>
    <button 
      className={`filter-btn ${statusFilter === 'not-started' ? 'active' : ''}`} 
      onClick={() => setStatusFilter('not-started')}
    >
      Not Started
    </button>
    <button 
      className={`filter-btn ${statusFilter === 'in-progress' ? 'active' : ''}`} 
      onClick={() => setStatusFilter('in-progress')}
    >
      In Progress
    </button>
    <button 
      className={`filter-btn ${statusFilter === 'passed' ? 'active' : ''}`} 
      onClick={() => setStatusFilter('passed')}
    >
      Passed
    </button>
    <button 
      className={`filter-btn ${statusFilter === 'failed' ? 'active' : ''}`} 
      onClick={() => setStatusFilter('failed')}
    >
      Failed
    </button>
  </div>
  
  <div className="sort-dropdown">
    <select 
      className="sort-select" 
      value={sortOrder}
      onChange={(e) => setSortOrder(e.target.value)}
    >
      <option value="newest">Newest First</option>
      <option value="alphabetical">Alphabetical</option>
      <option value="difficulty">Difficulty</option>
      <option value="score">Best Score</option>
    </select>
  </div>
</div>

            {practiceTests.length > 0 ? (
              <div className="practice-tests-grid">
                {getFilteredTests().map((test, index) => {
                  // Get difficulty class
                  const getDifficultyClass = () => {
                    const difficulty = (test.difficulty || '').toLowerCase();
                    if (difficulty === 'easy') return 'easy-test';
                    if (difficulty === 'medium') return 'medium-test';
                    if (difficulty === 'hard') return 'hard-test';
                    return '';
                  };
                  
                  const difficultyClass = getDifficultyClass();
                  
                  // Calculate progress percentage for progress bar
                  const attempts = test.attempts || 0;
                  const bestScore = test.bestScore || 0;
                  const passingScore = test.passingScore || 70;
                  const isPassed = bestScore >= passingScore;
                  
                  // Determine progress indicator state
                  let progressBarClass = '';
                  if (attempts > 0) {
                    progressBarClass = isPassed ? 'progress-passed' : 'progress-failed';
                  }
                  
                  return (
                    <div className={`practice-test-card ${difficultyClass}`} key={test.id || index}>
                      <div className="practice-test-header">
                        <h3>{test.title || `Practice Test ${index + 1}`}</h3>
                        {test.difficulty && (
                          <span className={`difficulty-badge ${difficultyClass}`}>
                            {test.difficulty}
                          </span>
                        )}
                      </div>
                      
                      <div className="practice-test-info">
                        <div className="test-info-row">
                          <div className="info-item">
                            <div className="info-icon">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                              </svg>
                            </div>
                            <div className="info-content">
                              <div className="info-label">Questions</div>
                              <div className="info-value">{test.questionCount || '0'}</div>
                            </div>
                          </div>
                          
                          <div className="info-item">
                            <div className="info-icon">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                              </svg>
                            </div>
                            <div className="info-content">
                              <div className="info-label">Time Limit</div>
                              <div className="info-value">{test.timeLimit || '0'} min</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="test-info-row">
                          <div className="info-item">
                            <div className="info-icon">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                              </svg>
                            </div>
                            <div className="info-content">
                              <div className="info-label">Passing Score</div>
                              <div className="info-value">{test.passingScore || '70'}%</div>
                            </div>
                          </div>
                          
                          <div className="info-item">
                            <div className="info-icon">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
                                <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
                                <line x1="6" y1="1" x2="6" y2="4"></line>
                                <line x1="10" y1="1" x2="10" y2="4"></line>
                                <line x1="14" y1="1" x2="14" y2="4"></line>
                              </svg>
                            </div>
                            <div className="info-content">
                              <div className="info-label">Best Score</div>
                              <div className={`info-value ${isPassed ? 'passed-score' : ''}`}>
                                {bestScore > 0 ? `${bestScore}%` : 'Not taken'}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Progress bar */}
                        {attempts > 0 && (
                          <div className="test-progress">
                            <div className="progress-bar-container">
                              <div 
                                className={`progress-bar-fill ${progressBarClass}`}
                                style={{ width: `${bestScore}%` }}
                              ></div>
                            </div>
                            <div className="progress-text">
                              {isPassed ? 
                                <span className="progress-passed-text">Passed with {bestScore}%</span> : 
                                <span className="progress-failed-text">Last score: {bestScore}%</span>
                              }
                            </div>
                            <div className="attempt-count">
                              {attempts} {attempts === 1 ? 'attempt' : 'attempts'}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="practice-test-actions">
                        <Link 
                          to={`/practice-test/${test.id}`} 
                          state={{ 
                            mode: 'practice',
                            examId: exam.id
                          }}
                          className="practice-btn"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"></path>
                            <path d="M10 8v8l6-4-6-4z"></path>
                          </svg>
                          Practice Mode
                        </Link>
                        
                        <Link 
                          to={`/practice-test/${test.id}`} 
                          state={{ 
                            mode: 'exam',
                            examId: exam.id
                          }}
                          className="exam-btn"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                          </svg>
                          Exam Mode
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="no-data-message">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                  <polyline points="13 2 13 9 20 9"></polyline>
                </svg>
                <h3>No Practice Tests Available</h3>
                <p>No practice tests are available for this exam yet.</p>
                <p>Please check back later or contact support if you believe this is an error.</p>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'reviews' && (
          <div className="exam-reviews">
            <h2>Student Reviews</h2>
            {exam.reviews && exam.reviews.length > 0 ? (
              <>
                <div className="reviews-summary">
                  <div className="reviews-average">
                    <span className="reviews-rating">{exam.popularity || '4.0'}</span>
                    <div className="reviews-stars">★★★★★</div>
                    <span className="reviews-count">{exam.reviews.length} reviews</span>
                  </div>
                </div>
                
                <div className="reviews-list">
                  {exam.reviews.map((review, index) => (
                    <div className="review-item" key={review.id || index}>
                      <div className="review-header">
                        <span className="review-author">{review.user}</span>
                        <span className="review-date">{review.date}</span>
                      </div>
                      <div className="review-rating">
                        {Array(5).fill().map((_, i) => (
                          <span key={i} className={i < review.rating ? "star filled" : "star"}>★</span>
                        ))}
                      </div>
                      <p className="review-comment">{review.comment}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="no-data-message">
                <p>No reviews yet. Be the first to review this exam after completion!</p>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'faq' && (
          <div className="exam-faq">
            <h2>Frequently Asked Questions</h2>
            {exam.faq && exam.faq.length > 0 ? (
              <div className="faq-list">
                {exam.faq.map((item, index) => (
                  <div className="faq-item" key={index}>
                    <h3 className="faq-question">{item.question}</h3>
                    <p className="faq-answer">{item.answer}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-data-message">
                <p>FAQ information will be available soon.</p>
                <p>If you have specific questions, feel free to contact our support team.</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="exam-details-footer">
        <p>Need help choosing the right certification? <Link to="/contact">Contact our advisors</Link></p>
      </div>
    </div>
  );
};

export default ExamDetails;