// components/Header.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Home.css';
import './Cart.css';
import './Header.css';
import examhitLogo from '../assests/examhit-logo.jpg';

function Header({ isAuthenticated, user, onLogout, cartItems = 0, cartTotal = 0, cart = [] }) {
  const navigate = useNavigate();
  const [showCartPreview, setShowCartPreview] = useState(false);

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const toggleCartPreview = () => {
    setShowCartPreview(!showCartPreview);
  };

  const closeCartPreview = () => {
    setShowCartPreview(false);
  };

  return (
    <header className="header">
      <div className="logo">
        <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src={examhitLogo} alt="ExamHit Logo" style={{ height: 80, marginRight: 10, borderRadius: 6 }} />
        </Link>
      </div>
      <nav className="nav">
        {/* Show navigation links only for authenticated users */}
        {isAuthenticated && (
          <>
            <Link to="/">Dashboard</Link>
            <Link to="/purchased">My Exams</Link>
            <Link to="/history">My History</Link>
            <Link to="/exams">Explore</Link>
          </>
        )}
        
        {/* Cart icon with item count */}
        <div className="cart-container">
          <div className="cart-icon" onClick={toggleCartPreview}>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            {cartItems > 0 && <span className="cart-badge">{cartItems}</span>}
          </div>
          
          {/* Cart preview dropdown */}
          {showCartPreview && (
            <div className="cart-preview">
              <div className="cart-preview-header">
                <h3>Your Cart ({cartItems})</h3>
                <button className="close-preview" onClick={closeCartPreview}>×</button>
              </div>
              
              {cartItems > 0 ? (
                <>
                  {/* Display cart items in the preview */}
                  <div className="cart-preview-items">
                    {cart && cart.length > 0 ? (
                      cart.map(item => (
                        <div key={item.id} className="cart-preview-item">
                          <span className="cart-item-title">
                            {item.title}
                          </span>
                          <span className="cart-item-price">${item.price.toFixed(2)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="cart-preview-message">
                        {cartItems} {cartItems === 1 ? 'item' : 'items'} in cart
                      </div>
                    )}
                  </div>
                  
                  <div className="cart-preview-total">
                    <span>Total:</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="cart-preview-actions">
                    <Link to="/cart" className="btn-view-cart" onClick={closeCartPreview}>
                      View Cart
                    </Link>
                    <Link 
                      to={"/checkout"} 
                      className="btn-checkout"
                      onClick={closeCartPreview}
                      state={!isAuthenticated ? { from: '/checkout' } : undefined}
                    >
                      {"Checkout"}
                    </Link>
                  </div>
                </>
              ) : (
                <div className="empty-cart-message">
                  Your cart is empty
                </div>
              )}
            </div>
          )}
        </div>
        
        {isAuthenticated ? (
          <>
            <div className="user-menu">
              <div className="dropdown">
                <span className="username dropdown-toggle">{user.name}</span>
                <div className="dropdown-content">
                  <Link to="/order" className="btn-orders">Orders</Link>
                  <button onClick={handleLogout} className="btn-logout">Logout</button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </nav>
    </header>
  );
}

export default Header;