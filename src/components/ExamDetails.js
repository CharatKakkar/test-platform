// components/ExamDetails.js
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import './ExamDetails.css';

const ExamDetails = ({ user, isAuthenticated, addToCart, removeFromCart, cart }) => {
  const { examId } = useParams();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [notification, setNotification] = useState({ show: false, message: '' });
  
  useEffect(() => {
    // In a real app, fetch exam details from an API
    setTimeout(() => {
      // Mock data - this would come from your backend
      const examData = {
        id: parseInt(examId),
        title: getExamTitle(parseInt(examId)),
        category: getExamCategory(parseInt(examId)),
        description: 'This comprehensive certification exam tests your knowledge and skills in various domains necessary for professional success.',
        price: getExamPrice(parseInt(examId)),
        duration: getExamDuration(parseInt(examId)),
        questionCount: getExamQuestionCount(parseInt(examId)),
        difficulty: getExamDifficulty(parseInt(examId)),
        popularity: 4.8,
        thumbnail: getExamThumbnail(parseInt(examId)),
        longDescription: `
          This certification is designed for professionals looking to validate their skills and advance their careers.
          The exam covers a wide range of topics and provides a comprehensive assessment of your knowledge and abilities.
          
          Upon successful completion, you'll receive an industry-recognized certification that demonstrates your expertise
          to employers and clients. This certification is widely respected in the industry and can help you stand out in
          the job market.
        `,
        curriculum: [
          {
            section: 'Domain 1: Fundamental Concepts',
            topics: [
              'Core principles and methodologies',
              'Industry standards and best practices',
              'Theoretical frameworks and models'
            ]
          },
          {
            section: 'Domain 2: Technical Implementation',
            topics: [
              'Practical application of concepts',
              'Tools and technologies',
              'Performance optimization techniques'
            ]
          },
          {
            section: 'Domain 3: Security and Compliance',
            topics: [
              'Security protocols and measures',
              'Regulatory requirements',
              'Risk assessment and management'
            ]
          },
          {
            section: 'Domain 4: Maintenance and Support',
            topics: [
              'Troubleshooting methodologies',
              'System monitoring and maintenance',
              'Continuous improvement processes'
            ]
          }
        ],
        reviews: [
          {
            id: 1,
            user: 'John D.',
            rating: 5,
            date: '2025-02-15',
            comment: 'Excellent preparation for the actual certification. The practice questions were very similar to those on the actual exam.'
          },
          {
            id: 2,
            user: 'Sarah M.',
            rating: 4,
            date: '2025-01-28',
            comment: 'Great content and very helpful practice questions. I passed my certification on the first try!'
          },
          {
            id: 3,
            user: 'Robert K.',
            rating: 5,
            date: '2025-02-03',
            comment: 'The detailed explanations for each answer helped me understand the concepts better.'
          }
        ],
        faq: [
          {
            question: 'How long do I have access to the exam materials?',
            answer: 'You will have access to all exam materials for 12 months from the date of purchase.'
          },
          {
            question: 'Is there a passing score for this certification?',
            answer: 'Yes, you need to score 70% or higher to pass the certification exam.'
          },
          {
            question: 'How many attempts do I get?',
            answer: 'Your purchase includes 3 exam attempts. Additional attempts can be purchased separately if needed.'
          },
          {
            question: 'Is there a refund policy?',
            answer: 'We offer a 30-day money-back guarantee if you\'re not satisfied with the exam materials.'
          }
        ]
      };
      
      setExam(examData);
      setLoading(false);
    }, 1000);
  }, [examId]);
  
  // Check if exam is in cart
  const isInCart = () => {
    return cart && cart.some(item => item.id === exam.id);
  };
  
  const handleAddToCart = () => {
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
  
  // Helper functions to generate mock data based on exam ID
  function getExamTitle(id) {
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
  
  function getExamCategory(id) {
    const categories = {
      1: 'IT',
      2: 'Cloud',
      3: 'Project Management',
      4: 'Networking',
      5: 'Project Management',
      6: 'Cloud'
    };
    return categories[id] || 'General';
  }
  
  function getExamPrice(id) {
    const prices = {
      1: 99.99,
      2: 149.99,
      3: 129.99,
      4: 119.99,
      5: 179.99,
      6: 99.99
    };
    return prices[id] || 129.99;
  }
  
  function getExamDuration(id) {
    const durations = {
      1: '90 minutes',
      2: '120 minutes',
      3: '60 minutes',
      4: '120 minutes',
      5: '240 minutes',
      6: '60 minutes'
    };
    return durations[id] || '90 minutes';
  }
  
  function getExamQuestionCount(id) {
    const counts = {
      1: 90,
      2: 65,
      3: 50,
      4: 100,
      5: 180,
      6: 40
    };
    return counts[id] || 75;
  }
  
  function getExamDifficulty(id) {
    const difficulties = {
      1: 'Intermediate',
      2: 'Advanced',
      3: 'Intermediate',
      4: 'Intermediate',
      5: 'Advanced',
      6: 'Beginner'
    };
    return difficulties[id] || 'Intermediate';
  }
  
  function getExamThumbnail(id) {
    const colors = {
      1: '%23275d8b',
      2: '%23f90',
      3: '%234b9b4b',
      4: '%23005073',
      5: '%23bd582c',
      6: '%230078d4'
    };
    const texts = {
      1: 'A+',
      2: 'AWS',
      3: 'CSM',
      4: 'CCNA',
      5: 'PMP',
      6: 'AZ-900'
    };
    const color = colors[id] || '%234a90e2';
    const text = texts[id] || `Exam ${id}`;
    return `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="100" viewBox="0 0 160 100"%3E%3Crect width="160" height="100" fill="${color}"/%3E%3Ctext x="80" y="50" font-family="Arial" font-size="18" text-anchor="middle" fill="white"%3E${text}%3C/text%3E%3C/svg%3E`;
  }
  
  if (loading) {
    return (
      <div className="exam-details-container">
        <div className="loading-spinner">Loading exam details...</div>
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
          <img src={exam.thumbnail} alt={exam.title} />
        </div>
        <div className="exam-details-info">
          <h1>{exam.title}</h1>
          <span className="exam-details-category">{exam.category}</span>
          <div className="exam-details-meta">
            <span><i className="meta-icon">⏱️</i> {exam.duration}</span>
            <span><i className="meta-icon">❓</i> {exam.questionCount} Questions</span>
            <span><i className="meta-icon">📊</i> {exam.difficulty}</span>
          </div>
          <p className="exam-details-description">{exam.description}</p>
          <div className="exam-details-price-actions">
            <div className="exam-details-price">${exam.price.toFixed(2)}</div>
            <div className="exam-details-actions">
              <Link to={`/demo/${exam.id}`} className="btn btn-outline">Try Demo</Link>
              {isAuthenticated ? (
                <button 
                  className={`btn ${isInCart() ? 'btn-danger' : 'btn-primary'}`}
                  onClick={isInCart() ? handleRemoveFromCart : handleAddToCart}
                >
                  {isInCart() ? 'Remove from Cart' : 'Add to Cart'}
                </button>
              ) : (
                <Link to="/login" className="btn btn-primary">Login to Purchase</Link>
              )}
            </div>
          </div>
          
          {/* Cart Preview if item is in cart */}
          {isAuthenticated && isInCart() && (
            <div className="cart-preview">
              <div className="cart-preview-header">
                <span>Item in cart</span>
                <Link to="/checkout" className="checkout-link">
                  Go to Checkout
                </Link>
              </div>
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
            <p>{exam.longDescription}</p>
            
            <h3>What you'll learn</h3>
            <ul className="exam-features">
              {exam.curriculum.map((section, index) => (
                <li key={index}>
                  <i className="feature-icon">✓</i> {section.section}
                </li>
              ))}
            </ul>
            
            <div className="exam-cta">
              <h3>Ready to get certified?</h3>
              {isAuthenticated ? (
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
            {exam.curriculum.map((section, index) => (
              <div className="curriculum-section" key={index}>
                <h3>{section.section}</h3>
                <ul className="curriculum-topics">
                  {section.topics.map((topic, i) => (
                    <li key={i}>{topic}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        
        {activeTab === 'reviews' && (
          <div className="exam-reviews">
            <h2>Student Reviews</h2>
            <div className="reviews-summary">
              <div className="reviews-average">
                <span className="reviews-rating">{exam.popularity}</span>
                <div className="reviews-stars">★★★★★</div>
                <span className="reviews-count">{exam.reviews.length} reviews</span>
              </div>
            </div>
            
            <div className="reviews-list">
              {exam.reviews.map(review => (
                <div className="review-item" key={review.id}>
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
          </div>
        )}
        
        {activeTab === 'faq' && (
          <div className="exam-faq">
            <h2>Frequently Asked Questions</h2>
            <div className="faq-list">
              {exam.faq.map((item, index) => (
                <div className="faq-item" key={index}>
                  <h3 className="faq-question">{item.question}</h3>
                  <p className="faq-answer">{item.answer}</p>
                </div>
              ))}
            </div>
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