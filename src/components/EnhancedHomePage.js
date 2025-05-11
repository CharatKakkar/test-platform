// components/EnhancedHomePage.js
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getAllExams, getFeaturedExams, getUserPurchasedExams } from '../services/firebaseService';
import Loading from './Loading';
import ExamCard from './ExamCard';
import './EnhancedHomePage.css';

// Globe Animation Component
const GlobeAnimation = () => {
  return (
    <div className="globe-container">
      <div className="globe">
        <div className="globe-sphere"></div>
        <div className="globe-outer-shadow"></div>
        <div className="globe-worldmap">
          <div className="globe-worldmap-back"></div>
          <div className="globe-worldmap-front"></div>
        </div>
      </div>
    </div>
  );
};

const EnhancedHomePage = ({ isAuthenticated, user, addToCart, removeFromCart, cart, showAllExams = false }) => {
  const [featuredExams, setFeaturedExams] = useState([]);
  const [allExams, setAllExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ownedExams, setOwnedExams] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  // Filter exams based on search query
  const filteredExams = useMemo(() => {
    let exams = showAllExams ? allExams : featuredExams;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      exams = exams.filter(exam => 
        exam.title.toLowerCase().includes(query) ||
        exam.description?.toLowerCase().includes(query)
      );
    }
    
    return exams;
  }, [showAllExams, allExams, featuredExams, searchQuery]);

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

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
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

  return (
    <div className="homepage-container">
      <section className="homepage-hero">
        <div className="hero-content">
          <div className="hero-text">
            <h1>Advance Your Career with Industry-Leading Certifications</h1>
            <p>Prepare for your certification exams with our comprehensive practice tests.</p>
            <div className="hero-cta">
              <a href="#featured-exams" className="cta-button cta-primary">
                <i className="fas fa-rocket"></i>
                Start Learning Now
              </a>
              <a href="#how-it-works" className="cta-button cta-secondary">
                <i className="fas fa-play-circle"></i>
                Watch Demo
              </a>
            </div>
            <div className="trust-indicators">
              <div className="trust-item">
                <i className="fas fa-users"></i>
                <span>10,000+ Certified Professionals</span>
              </div>
              <div className="trust-item">
                <i className="fas fa-star"></i>
                <span>4.8/5 Average Rating</span>
              </div>
              <div className="trust-item">
                <i className="fas fa-shield-alt"></i>
                <span>Money-Back Guarantee</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {!showAllExams && (
        <>
          <div className="homepage-featured" id="featured-exams">
            <h2>Featured Certification Exams</h2>
            <p className="featured-subtitle">Choose from our most popular certification exams, trusted by professionals worldwide</p>
          </div>
        </>
      )}
      
      {showAllExams && (
        <h1 className="all-exams-title">Available Certification Exams</h1>
      )}
      
      {/* Search Section */}
      <div className="search-container">
        <input
          type="text"
          placeholder="Search exams..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="search-input"
        />
      </div>
      
      <div className="exams-grid">
        {filteredExams.length > 0 ? (
          filteredExams.map(exam => (
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
            <p>No exams match your search. Try a different search term.</p>
          </div>
        )}
      </div>
      
      {!showAllExams && filteredExams.length > 0 && (
        <div className="view-all-link">
          <Link to="/exams" className="btn btn-outline">
            View All Certification Exams
          </Link>
        </div>
      )}
      
      {!showAllExams && (
        <>
          <div className="homepage-features" id="how-it-works">
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

          <div className="testimonials-section">
            <h2>What Our Students Say</h2>
            <div className="testimonials-grid">
              <div className="testimonial-card">
                <div className="testimonial-content">
                  "The practice tests were incredibly helpful. I passed my certification on the first try!"
                </div>
                <div className="testimonial-author">
                  <img src="https://via.placeholder.com/50" alt="User" className="author-avatar" />
                  <div className="author-info">
                    <h4>Sarah Johnson</h4>
                    <p>AWS Certified Solutions Architect</p>
                  </div>
                </div>
              </div>
              <div className="testimonial-card">
                <div className="testimonial-content">
                  "The detailed explanations helped me understand concepts I was struggling with."
                </div>
                <div className="testimonial-author">
                  <img src="https://via.placeholder.com/50" alt="User" className="author-avatar" />
                  <div className="author-info">
                    <h4>Michael Chen</h4>
                    <p>Microsoft Azure Administrator</p>
                  </div>
                </div>
              </div>
              <div className="testimonial-card">
                <div className="testimonial-content">
                  "Best investment for my career. The practice tests were spot on!"
                </div>
                <div className="testimonial-author">
                  <img src="https://via.placeholder.com/50" alt="User" className="author-avatar" />
                  <div className="author-info">
                    <h4>Emily Rodriguez</h4>
                    <p>CompTIA Security+</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EnhancedHomePage;