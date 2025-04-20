// components/ExamDetails.js
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  getExamById, 
  getUserPurchasedExams,
  getPracticeTestsByExamId
} from '../services/firebaseService';
import Loading from './Loading';
import './ExamDetails.css';

const ExamDetails = ({ user, isAuthenticated, addToCart, removeFromCart, cart }) => {
  const { examId } = useParams();
  const navigate = useNavigate();
  
  const [exam, setExam] = useState(null);
  const [isOwned, setIsOwned] = useState(false);
  const [practiceTests, setPracticeTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [notification, setNotification] = useState({ show: false, message: '' });
  const [error, setError] = useState(null);
  
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
        
        // Check if user owns this exam (if authenticated)
        if (isAuthenticated && user) {
          const userId = user.uid || user.id;
          logInfo(`Checking if user ${userId} owns exam ${examId}`);
          
          const purchasedExams = await getUserPurchasedExams(userId);
          const owned = purchasedExams.some(purchase => purchase.examId === examId);
          
          logInfo(`User owns exam: ${owned}`);
          setIsOwned(owned);
          
          // If the user owns the exam, fetch practice tests
          if (owned) {
            logInfo('User owns exam, fetching practice tests');
            
            try {
              const tests = await getPracticeTestsByExamId(examId);
              logInfo(`Found ${tests.length} practice tests`, tests);
              setPracticeTests(tests);
            } catch (err) {
              console.error('Error fetching practice tests:', err);
              // Don't set an error, we'll just show 0 tests
              setPracticeTests([]);
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
          </div>
          <p className="exam-details-description">{exam.description || 'No description available.'}</p>
          <div className="exam-details-price-actions">
            <div className="exam-details-price">${exam.price?.toFixed(2) || "0.00"}</div>
            <div className="exam-details-actions">
              {isOwned ? (
                // If owned, show practice tests button
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
                // If not owned, show demo and add to cart buttons
                <>
                  <Link to={`/demo/${exam.id}`} className="btn btn-outline">Try Demo</Link>
                  <button 
                    className={`btn ${isInCart() ? 'btn-danger' : 'btn-primary'}`}
                    onClick={isInCart() ? handleRemoveFromCart : handleAddToCart}
                  >
                    {isInCart() ? 'Remove from Cart' : 'Add to Cart'}
                  </button>
                </>
              )}
            </div>
          </div>
          
          {/* Cart Preview if item is in cart and not owned */}
          {isAuthenticated && isInCart() && !isOwned && (
            <div className="cart-preview">
              <div className="cart-preview-header">
                <span>Item in cart</span>
                <Link to="/checkout" className="checkout-link">
                  Go to Checkout
                </Link>
              </div>
            </div>
          )}
          
          {/* Ownership badge */}
          {isOwned && (
            <div className="ownership-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <span>You own this exam</span>
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
        {isOwned && (
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
            {exam.curriculum && exam.curriculum.length > 0 ? (
              <ul className="exam-features">
                {exam.curriculum.map((section, index) => (
                  <li key={index}>
                    <i className="feature-icon">✓</i> {section.section}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Curriculum information will be available soon.</p>
            )}
            
            <div className="exam-cta">
              <h3>Ready to get certified?</h3>
              {isOwned ? (
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
                  {isInCart() ? 'Remove from Cart' : 'Enroll Now'}
                </button>
              ) : (
                <Link to="/login" className="btn btn-primary btn-large">
                  Login to Enroll
                </Link>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'curriculum' && (
          <div className="exam-curriculum">
            <h2>Exam Curriculum</h2>
            {exam.curriculum && exam.curriculum.length > 0 ? (
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
        
        {activeTab === 'practice' && isOwned && (
          <div className="exam-practice-tests">
            <h2>Practice Tests</h2>
            {practiceTests.length > 0 ? (
              <div className="practice-tests-grid">
                {practiceTests.map((test, index) => (
                  <div className="practice-test-card" key={test.id || index}>
                    <h3>{test.title || `Practice Test ${index + 1}`}</h3>
                    <div className="practice-test-info">
                      <p><span>Questions:</span> {test.questionCount || 'Not specified'}</p>
                      <p><span>Time Limit:</span> {test.timeLimit || 'Not specified'}</p>
                      <p><span>Passing Score:</span> {test.passingScore || '70'}%</p>
                    </div>
                    <div className="practice-test-actions">
                      <Link 
                        to={`/practice-test/${test.id}`} 
                        state={{ 
                          mode: 'practice',
                          examId: exam.id
                        }}
                        className="btn-primary"
                      >
                        Start Test
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-data-message">
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