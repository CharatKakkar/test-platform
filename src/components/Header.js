// components/Header.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Home.css';
import './Cart.css';


function Header({ isAuthenticated, user, onLogout, cartItems = 0, cartTotal = 0 }) {
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
        <Link to="/">TestPro</Link>
      </div>
      <nav className="nav">
        <Link to="/">Dashboard</Link>
        <Link to="/tests">Tests</Link>
        <Link to="/exams">Exams</Link>
        
        {/* Cart icon with item count */}
        <div className="cart-container">
          <div className="cart-icon" onClick={toggleCartPreview}>
            <i className="fas fa-shopping-cart"></i>
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
                  <div className="cart-preview-total">
                    <span>Total:</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="cart-preview-actions">
                    <Link to="/cart" className="btn-view-cart" onClick={closeCartPreview}>
                      View Cart
                    </Link>
                    <Link 
                      to={isAuthenticated ? "/checkout" : "/login"} 
                      className="btn-checkout"
                      onClick={closeCartPreview}
                    >
                      {isAuthenticated ? "Checkout" : "Login to Checkout"}
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
            <Link to="/history">History</Link>
            <div className="user-menu">
              <span className="username">Welcome, {user.name}</span>
              <button onClick={handleLogout} className="btn-logout">Logout</button>
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