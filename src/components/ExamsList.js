// components/ExamsList.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './ExamsList.css';

const ExamsList = ({ isAuthenticated, addToCart, removeFromCart, cart }) => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '' });
  
  // In a real application, this would be fetched from an API
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
    return cart && cart.some(item => item.id === examId);
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
  
  if (loading) {
    return (
      <div className="exams-list-container">
        <h1>Available Certification Exams</h1>
        <div className="loading-spinner">Loading exams...</div>
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
          <div key={exam.id} className="exam-card">
            <div className="exam-thumbnail">
              <img src={exam.thumbnail} alt={exam.title} />
            </div>
            <div className="exam-info">
              <h2>{exam.title}</h2>
              <p className="exam-category">{exam.category}</p>
              <p className="exam-description">{exam.description}</p>
              <div className="exam-details">
                <span><strong>Duration:</strong> {exam.duration}</span>
                <span><strong>Questions:</strong> {exam.questionCount}</span>
                <span><strong>Difficulty:</strong> {exam.difficulty}</span>
              </div>
              <div className="exam-price">${exam.price.toFixed(2)}</div>
              <div className="exam-actions">
                <Link to={`/exams/${exam.id}`} className="btn btn-primary">View Details</Link>
                <Link to={`/demo/${exam.id}`} className="btn btn-outline">Try Demo</Link>
                {isAuthenticated && (
                  <button 
                    className={`btn ${isInCart(exam.id) ? 'btn-danger' : 'btn-success'}`}
                    onClick={() => isInCart(exam.id) 
                      ? handleRemoveFromCart(exam.id) 
                      : handleAddToCart(exam)
                    }
                  >
                    {isInCart(exam.id) ? 'Remove from Cart' : 'Add to Cart'}
                  </button>
                )}
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

      {/* Cart Summary (shows only when there are items in cart) */}
      {isAuthenticated && cart && cart.length > 0 && (
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
          <Link to="/checkout" className="btn btn-primary checkout-btn">
            Proceed to Checkout
          </Link>
        </div>
      )}
    </div>
  );
};

export default ExamsList;