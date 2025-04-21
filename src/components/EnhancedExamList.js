// components/EnhancedExamsList.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './ExamsList.css';
import { getAllExams, getUserPurchasedExams } from '../services/firebaseService';
import Loading from './Loading';
import ExamCard from './ExamCard';

const EnhancedExamsList = ({ user, isAuthenticated, addToCart, removeFromCart, cart }) => {
  const [exams, setExams] = useState([]);
  const [ownedExams, setOwnedExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '' });
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchExamsData = async () => {
      setLoading(true);
      try {
        // Get all exams
        const examsData = await getAllExams();
        setExams(examsData);
        
        // If user is authenticated, get purchased exams
        if (isAuthenticated && user) {
          const userId = user.uid || user.id;
          const purchasedExams = await getUserPurchasedExams(userId);
          
          // Extract just the exam IDs for easier checking
          const ownedExamIds = purchasedExams.map(item => item.examId);
          setOwnedExams(ownedExamIds);
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
  }, [isAuthenticated, user]);
  
  const getUniqueCategories = () => {
    const categories = exams.map(exam => exam.category);
    return ['all', ...new Set(categories)];
  };
  
  const filterExams = () => {
    let filtered = [...exams];
    
    if (filter !== 'all') {
      filtered = filtered.filter(exam => exam.category === filter);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(exam => 
        exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  };

  // Check if an exam is in the cart
  const isInCart = (examId) => {
    return cart && cart.some(item => item.id === examId);
  };
  
  // Check if the user owns an exam
  const isExamOwned = (examId) => {
    return ownedExams.includes(examId);
  };
  
  // Handle adding item to cart
  const handleAddToCart = (exam) => {
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
  
  // Handle removing item from cart
  const handleRemoveFromCart = (examId) => {
    const exam = exams.find(item => item.id === examId);
    removeFromCart(examId);
    
    if (exam) {
      // Show notification
      setNotification({
        show: true,
        message: `${exam.title} removed from cart!`
      });
      
      // Hide notification after 3 seconds
      setTimeout(() => {
        setNotification({ show: false, message: '' });
      }, 3000);
    }
  };
  
  if (loading) {
    return <Loading size="large" text="Loading exams..." />;
  }
  
  if (error) {
    return (
      <div className="exams-list-container">
        <h1>Available Certification Exams</h1>
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
    <div className="exams-list-container">
      <h1>Available Certification Exams</h1>
      
      {/* Notification */}
      {notification.show && (
        <div className="notification">
          <p>{notification.message}</p>
        </div>
      )}
      
      <div className="search-filter-container">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search exams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-container">
          <span>Filter by: </span>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            {getUniqueCategories().map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="exams-grid">
        {filterExams().map(exam => (
          <ExamCard 
            key={exam.id}
            exam={exam}
            isOwned={isExamOwned(exam.id)}
            isInCart={isInCart(exam.id)}
            onAddToCart={handleAddToCart}
            onRemoveFromCart={handleRemoveFromCart}
          />
        ))}
      </div>
      
      {filterExams().length === 0 && (
        <div className="no-results">
          <p>No exams match your search criteria. Try adjusting your filters.</p>
        </div>
      )}

      {/* Cart Summary (shows only when there are items in cart) */}
      {cart && cart.length > 0 && (
        <div className="cart-summary">
          <h3>Cart Summary ({cart.length} {cart.length === 1 ? 'item' : 'items'})</h3>
          <div className="cart-items">
            {cart.map(item => (
              <div key={item.id} className="cart-item">
                <span className="cart-item-title">{item.title}</span>
                <span className="cart-item-price">${item.price.toFixed(2)}</span>
                <button 
                  className="cart-item-remove" 
                  onClick={() => handleRemoveFromCart(item.id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="cart-total">
            <span>Total:</span>
            <span>
              ${cart.reduce((total, item) => total + item.price, 0).toFixed(2)}
            </span>
          </div>
          {isAuthenticated ? (
            <Link to="/checkout" className="btn btn-primary checkout-btn">
              Proceed to Checkout
            </Link>
          ) : (
            <Link to="/login" className="btn btn-primary checkout-btn" state={{ from: '/checkout' }}>
              Login to Checkout
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

export default EnhancedExamsList;