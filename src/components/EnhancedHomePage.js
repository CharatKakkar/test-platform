import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllExams } from '../services/firebaseService'; // Import the service to fetch exams
import './EnhancedHomePage.css';

const EnhancedHomePage = ({ isAuthenticated, addToCart, removeFromCart, cart = [] }) => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '' });
  
  // Fetch exams from Firebase
  useEffect(() => {
    const fetchExams = async () => {
      setLoading(true);
      try {
        console.log('Fetching exams from Firebase...');
        const fetchedExams = await getAllExams();
        console.log('Fetched exams:', fetchedExams);
        setExams(fetchedExams);
      } catch (error) {
        console.error('Error fetching exams:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchExams();
  }, []);
  
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
        exam.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  };
  
  // Check if an exam is in the cart
  const isInCart = (examId) => {
    return Array.isArray(cart) && cart.some(item => item.id === examId);
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
    
    // Show notification
    setNotification({
      show: true,
      message: `${exam?.title || 'Item'} removed from cart!`
    });
    
    // Hide notification after 3 seconds
    setTimeout(() => {
      setNotification({ show: false, message: '' });
    }, 3000);
  };
  
  // Calculate cart total
  const calculateCartTotal = () => {
    if (!Array.isArray(cart) || cart.length === 0) return 0;
    return cart.reduce((total, item) => total + (item.price || 0), 0).toFixed(2);
  };
  
  // Get default thumbnail SVG for exams without thumbnails
  const getDefaultThumbnail = (exam) => {
    const colors = {
      'IT': '#275d8b',
      'Cloud': '#f90',
      'Project Management': '#4b9b4b',
      'Networking': '#005073',
      'Education': '#c41230',
      'Security': '#bd582c',
      'Development': '#0078d4'
    };
    
    const bgColor = colors[exam.category] || '#333';
    const acronym = exam.title ? exam.title.split(' ').map(word => word[0]).join('').substring(0, 3) : 'EX';
    
    return `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="100" viewBox="0 0 160 100"%3E%3Crect width="160" height="100" fill="${bgColor.replace('#', '%23')}"/%3E%3Ctext x="80" y="50" font-family="Arial" font-size="18" text-anchor="middle" fill="white"%3E${acronym}%3C/text%3E%3C/svg%3E`;
  };
  
  if (loading) {
    return <div className="loading-spinner">Loading exams...</div>;
  }
  
  const hasCartItems = Array.isArray(cart) && cart.length > 0;
  
  return (
    <div className="exams-grid-container">
      {/* Notification */}
      {notification.show && (
        <div className="notification">
          <p>{notification.message}</p>
        </div>
      )}
      
      <div className="exams-header">
        <h1>Available Certification Exams</h1>
      </div>
      
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
      
      {/* Layout container */}
      <div className="main-content-layout">
        {/* Main content */}
        <div className="exams-content">
          <div className="exams-grid">
            {filterExams().map(exam => (
              <div key={exam.id} className="exam-tile">
                <div className="exam-tile-header">
                  <img 
                    src={exam.thumbnail || getDefaultThumbnail(exam)} 
                    alt={exam.title || 'Exam'} 
                    className="exam-thumbnail" 
                  />
                  <span className="exam-category-badge">{exam.category || 'Uncategorized'}</span>
                </div>
                
                <div className="exam-tile-content">
                  <h3 className="exam-title">{exam.title || 'Untitled Exam'}</h3>
                  <p className="exam-description">{exam.description || 'No description available'}</p>
                  
                  <div className="exam-details">
                    <div className="exam-detail">
                      <span className="detail-label">Duration:</span>
                      <span className="detail-value">{exam.duration || 'N/A'}</span>
                    </div>
                    <div className="exam-detail">
                      <span className="detail-label">Questions:</span>
                      <span className="detail-value">{exam.questionCount || 'N/A'}</span>
                    </div>
                    <div className="exam-detail">
                      <span className="detail-label">Difficulty:</span>
                      <span className="detail-value">{exam.difficulty || 'N/A'}</span>
                    </div>
                  </div>
                  
                  <div className="exam-price-container">
                    <span className="exam-price">${(exam.price || 0).toFixed(2)}</span>
                  </div>
                </div>
                
                <div className="exam-tile-footer">
                  <div className="exam-actions">
                    <Link 
                      to={`/exam/${exam.id}/practice-tests`} 
                      className="btn btn-primary"
                      onClick={() => console.log("Navigating to exam with ID:", exam.id)}
                    >
                      Practice Tests
                    </Link>
                    <Link to={`/demo/${exam.id}`} className="btn btn-outline">Try Demo</Link>
                    <button 
                      className={`btn ${isInCart(exam.id) ? 'btn-danger' : 'btn-success'}`}
                      onClick={() => isInCart(exam.id) 
                        ? handleRemoveFromCart(exam.id) 
                        : handleAddToCart(exam)
                      }
                    >
                      {isInCart(exam.id) ? 'Remove from Cart' : 'Add to Cart'}
                    </button>
                  </div>
                </div>
                
                {/* Debug info */}
                <div style={{ fontSize: '0.7rem', color: '#999', marginTop: '5px', padding: '5px' }}>
                  ID: {exam.id}
                </div>
              </div>
            ))}
          </div>
          
          {filterExams().length === 0 && (
            <div className="no-results">
              <p>No exams match your search criteria. Try adjusting your filters.</p>
            </div>
          )}
        </div>
        
        {/* Cart summary */}
        {hasCartItems && (
          <div id="cart-sidebar" className="cart-summary">
            <h3>Your Cart ({cart.length} {cart.length === 1 ? 'item' : 'items'})</h3>
            
            <div className="cart-items">
              {cart.map(item => (
                <div key={item.id} className="cart-item">
                  <span className="cart-item-title" title={item.title}>{item.title}</span>
                  <span className="cart-item-price">${(item.price || 0).toFixed(2)}</span>
                  <button 
                    className="cart-item-remove" 
                    onClick={() => handleRemoveFromCart(item.id)}
                    title="Remove from cart"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            
            <div className="cart-total">
              <span>Total:</span>
              <span>${calculateCartTotal()}</span>
            </div>
            
            {
              <Link to="/checkout" className="btn btn-primary checkout-btn">
                Proceed to Checkout
              </Link>
            }
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedHomePage;