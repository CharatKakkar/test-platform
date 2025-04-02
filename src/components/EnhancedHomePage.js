import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './EnhancedHomePage.css';

const EnhancedHomePage = ({ isAuthenticated, addToCart, removeFromCart, cart = [] }) => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '' });
  
  // Simulate API call to fetch exams
  useEffect(() => {
    // Simulating API call with timeout
    setTimeout(() => {
      const availableExams = [
        {
          id: 1,
          title: 'CompTIA A+ Certification',
          category: 'IT',
          description: 'Validate your understanding of hardware, software, and operational procedures.',
          price: 99.99,
          duration: '90 minutes',
          questionCount: 90,
          difficulty: 'Intermediate',
          popularity: 4.8,
          thumbnail: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="100" viewBox="0 0 160 100"%3E%3Crect width="160" height="100" fill="%23275d8b"/%3E%3Ctext x="80" y="50" font-family="Arial" font-size="18" text-anchor="middle" fill="white"%3EA+%3C/text%3E%3C/svg%3E'
        },
        {
          id: 2,
          title: 'AWS Certified Solutions Architect',
          category: 'Cloud',
          description: 'Master designing distributed systems on the AWS platform.',
          price: 149.99,
          duration: '120 minutes',
          questionCount: 65,
          difficulty: 'Advanced',
          popularity: 4.9,
          thumbnail: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="100" viewBox="0 0 160 100"%3E%3Crect width="160" height="100" fill="%23f90"/%3E%3Ctext x="80" y="50" font-family="Arial" font-size="18" text-anchor="middle" fill="white"%3EAWS%3C/text%3E%3C/svg%3E'
        },
        {
          id: 3,
          title: 'Certified Scrum Master (CSM)',
          category: 'Project Management',
          description: 'Learn Scrum methodologies and how to facilitate Scrum processes.',
          price: 129.99,
          duration: '60 minutes',
          questionCount: 50,
          difficulty: 'Intermediate',
          popularity: 4.7,
          thumbnail: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="100" viewBox="0 0 160 100"%3E%3Crect width="160" height="100" fill="%234b9b4b"/%3E%3Ctext x="80" y="50" font-family="Arial" font-size="18" text-anchor="middle" fill="white"%3ECSM%3C/text%3E%3C/svg%3E'
        },
        {
          id: 4,
          title: 'Cisco CCNA Certification',
          category: 'Networking',
          description: 'Validate your skills in network fundamentals, access, IP connectivity, and services.',
          price: 119.99,
          duration: '120 minutes',
          questionCount: 100,
          difficulty: 'Intermediate',
          popularity: 4.6,
          thumbnail: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="100" viewBox="0 0 160 100"%3E%3Crect width="160" height="100" fill="%23005073"/%3E%3Ctext x="80" y="50" font-family="Arial" font-size="18" text-anchor="middle" fill="white"%3ECCNA%3C/text%3E%3C/svg%3E'
        },
        {
          id: 5,
          title: 'PMP Certification',
          category: 'Project Management',
          description: 'Demonstrate your expertise in project management processes and techniques.',
          price: 179.99,
          duration: '240 minutes',
          questionCount: 180,
          difficulty: 'Advanced',
          popularity: 4.9,
          thumbnail: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="100" viewBox="0 0 160 100"%3E%3Crect width="160" height="100" fill="%23bd582c"/%3E%3Ctext x="80" y="50" font-family="Arial" font-size="18" text-anchor="middle" fill="white"%3EPMP%3C/text%3E%3C/svg%3E'
        },
        {
          id: 6,
          title: 'Microsoft Azure Fundamentals (AZ-900)',
          category: 'Cloud',
          description: 'Learn cloud concepts, Azure services, security, privacy, and compliance.',
          price: 99.99,
          duration: '60 minutes',
          questionCount: 40,
          difficulty: 'Beginner',
          popularity: 4.5,
          thumbnail: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="100" viewBox="0 0 160 100"%3E%3Crect width="160" height="100" fill="%230078d4"/%3E%3Ctext x="80" y="50" font-family="Arial" font-size="18" text-anchor="middle" fill="white"%3EAZ-900%3C/text%3E%3C/svg%3E'
        },
        {
          id: 7,
          title: 'SAT Preparation',
          category: 'Education',
          description: 'College entrance examination with math, reading, and writing sections.',
          price: 89.99,
          duration: '180 minutes',
          questionCount: 154,
          difficulty: 'Intermediate',
          popularity: 4.7,
          thumbnail: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="100" viewBox="0 0 160 100"%3E%3Crect width="160" height="100" fill="%23c41230"/%3E%3Ctext x="80" y="50" font-family="Arial" font-size="18" text-anchor="middle" fill="white"%3ESAT%3C/text%3E%3C/svg%3E'
        },
        {
          id: 8,
          title: 'GMAT Preparation',
          category: 'Education',
          description: 'Business school admission test covering analytical writing, quantitative reasoning, and verbal reasoning.',
          price: 109.99,
          duration: '210 minutes',
          questionCount: 80,
          difficulty: 'Advanced',
          popularity: 4.6,
          thumbnail: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="100" viewBox="0 0 160 100"%3E%3Crect width="160" height="100" fill="%23003768"/%3E%3Ctext x="80" y="50" font-family="Arial" font-size="18" text-anchor="middle" fill="white"%3EGMAT%3C/text%3E%3C/svg%3E'
        }
      ];
      
      setExams(availableExams);
      setLoading(false);
    }, 1000);
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
        exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.description.toLowerCase().includes(searchTerm.toLowerCase())
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
      message: `${exam.title} removed from cart!`
    });
    
    // Hide notification after 3 seconds
    setTimeout(() => {
      setNotification({ show: false, message: '' });
    }, 3000);
  };
  
  // Calculate cart total
  const calculateCartTotal = () => {
    if (!Array.isArray(cart) || cart.length === 0) return 0;
    return cart.reduce((total, item) => total + item.price, 0).toFixed(2);
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
                  <img src={exam.thumbnail} alt={exam.title} className="exam-thumbnail" />
                  <span className="exam-category-badge">{exam.category}</span>
                </div>
                
                <div className="exam-tile-content">
                  <h3 className="exam-title">{exam.title}</h3>
                  <p className="exam-description">{exam.description}</p>
                  
                  <div className="exam-details">
                    <div className="exam-detail">
                      <span className="detail-label">Duration:</span>
                      <span className="detail-value">{exam.duration}</span>
                    </div>
                    <div className="exam-detail">
                      <span className="detail-label">Questions:</span>
                      <span className="detail-value">{exam.questionCount}</span>
                    </div>
                    <div className="exam-detail">
                      <span className="detail-label">Difficulty:</span>
                      <span className="detail-value">{exam.difficulty}</span>
                    </div>
                  </div>
                  
                  <div className="exam-price-container">
                    <span className="exam-price">${exam.price.toFixed(2)}</span>
                  </div>
                </div>
                
                <div className="exam-tile-footer">
                  <div className="exam-actions">
                    <Link to={`/exams/${exam.id}`} className="btn btn-primary">Details</Link>
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
                  <span className="cart-item-price">${item.price.toFixed(2)}</span>
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
    </div>
  );
};

export default EnhancedHomePage;