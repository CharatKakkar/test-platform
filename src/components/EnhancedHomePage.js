// components/EnhancedHomePage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllExams, getFeaturedExams, getUserPurchasedExams } from '../services/firebaseService';
import Loading from './Loading';
import ExamCard from './ExamCard';
import './EnhancedHomePage.css';

const EnhancedHomePage = ({ isAuthenticated, user, addToCart, removeFromCart, cart, showAllExams = false }) => {
  const [featuredExams, setFeaturedExams] = useState([]);
  const [allExams, setAllExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ownedExams, setOwnedExams] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchExamsData = async () => {
      setLoading(true);
      try {
        // Get featured exams for homepage
        const featured = await getFeaturedExams();
        setFeaturedExams(featured);
        
        // If showAllExams is true, get all exams 
        // (for when this component is used on the /exams page)
        if (showAllExams) {
          const all = await getAllExams();
          setAllExams(all);
        }
        
        // If user is authenticated, get their purchased exams
        if (isAuthenticated && user) {
          const userId = user.uid || user.id;
          const purchased = await getUserPurchasedExams(userId);
          const ownedIds = purchased.map(p => p.examId);
          setOwnedExams(ownedIds);
        }
        
        setError(null);
      } catch (error) {
        console.error("Error fetching exams:", error);
        setError("Failed to load exams. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchExamsData();
  }, [isAuthenticated, user, showAllExams]);

  // Check if an exam is in the cart
  const isExamInCart = (examId) => {
    return cart && cart.some(item => item.id === examId);
  };
  
  // Check if user owns an exam
  const isExamOwned = (examId) => {
    return ownedExams.includes(examId);
  };
  
  // Handle adding exam to cart
  const handleAddToCart = (exam) => {
    addToCart(exam);
  };
  
  // Handle removing exam from cart
  const handleRemoveFromCart = (examId) => {
    removeFromCart(examId);
  };
  
  if (loading) {
    return <Loading size="large" text="Loading exams..." />;
  }
  
  if (error) {
    return (
      <div className="homepage-container">
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="btn btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Determine which exams to display
  const examsToDisplay = showAllExams ? allExams : featuredExams;
  
  return (
    <div className="homepage-container">
      {!showAllExams && (
        <>
          <div className="homepage-hero">
            <div className="hero-content">
              <h1>Advance Your Career with Industry-Leading Certifications</h1>
              <p>
                Prepare for your certification exams with our comprehensive practice tests and study materials.
              </p>
              <div className="hero-actions">
                <Link to="/exams" className="btn btn-primary btn-large">
                  Explore All Certifications
                </Link>
                {!isAuthenticated && (
                  <Link to="/register" className="btn btn-outline btn-large">
                    Create an Account
                  </Link>
                )}
              </div>
            </div>
          </div>
          
          <div className="homepage-featured">
            <h2>Featured Certification Exams</h2>
          </div>
        </>
      )}
      
      {showAllExams && (
        <h1 className="all-exams-title">Available Certification Exams</h1>
      )}
      
      <div className="exams-grid">
        {examsToDisplay.length > 0 ? (
          examsToDisplay.map(exam => (
            <ExamCard
              key={exam.id}
              exam={exam}
              isOwned={isExamOwned(exam.id)}
              isInCart={isExamInCart(exam.id)}
              onAddToCart={handleAddToCart}
              onRemoveFromCart={handleRemoveFromCart}
            />
          ))
        ) : (
          <div className="no-exams-found">
            <p>No exams available at the moment. Please check back later.</p>
          </div>
        )}
      </div>
      
      {!showAllExams && examsToDisplay.length > 0 && (
        <div className="view-all-link">
          <Link to="/exams" className="btn btn-outline">
            View All Certification Exams
          </Link>
        </div>
      )}
      
      {!showAllExams && (
        <div className="homepage-features">
          <h2>Why Choose Our Certification Prep?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📚</div>
              <h3>Comprehensive Content</h3>
              <p>Practice tests created by industry professionals and updated regularly to reflect the latest exam objectives.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⏱️</div>
              <h3>Realistic Exam Simulation</h3>
              <p>Experience tests with the same time constraints and formats you'll encounter in the real certification exam.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Detailed Analytics</h3>
              <p>Track your progress with detailed performance metrics to identify areas for improvement.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💡</div>
              <h3>Thorough Explanations</h3>
              <p>Every question comes with in-depth explanations for both correct and incorrect answers.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedHomePage;