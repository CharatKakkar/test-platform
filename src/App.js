// App.js - Main application component
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import EnhancedHomePage from './components/EnhancedHomePage';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import TestList from './components/TestList';
import TestDetails from './components/TestDetails';
import TestAttempt from './components/TestAttempt';
import AttemptHistory from './components/AttemptHistory';
import ExamDetails from './components/ExamDetails';
import DemoExam from './components/DemoExam.js';
import Checkout from './components/Checkout'; // Import the new enhanced checkout
import Footer from './components/Footer';
import './App.css';
import Cart from './components/Cart.js';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  
  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
    
    // Load cart from localStorage
    const storedCart = localStorage.getItem('cart');
    if (storedCart) {
      setCart(JSON.parse(storedCart));
    }
    
    setLoading(false);
  }, []);
  
  // Handle notifications
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    
    // Hide notification after 3 seconds
    setTimeout(() => {
      setNotification({ ...notification, show: false });
    }, 3000);
  };
  
  const login = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
  };
  
  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  };
  
  const addToCart = (exam) => {
    // Check if item is already in cart
    if (cart.some(item => item.id === exam.id)) {
      showNotification(`${exam.title} is already in your cart`, 'info');
      return;
    }
    
    const updatedCart = [...cart, exam];
    setCart(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    showNotification(`${exam.title} added to cart`);
  };
  
  const removeFromCart = (examId) => {
    const examToRemove = cart.find(item => item.id === examId);
    const updatedCart = cart.filter(item => item.id !== examId);
    setCart(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    
    if (examToRemove) {
      showNotification(`${examToRemove.title} removed from cart`, 'warning');
    }
  };
  
  const updateCartItemQuantity = (examId, quantity) => {
    const updatedCart = cart.map(item => {
      if (item.id === examId) {
        return { ...item, quantity: Math.max(1, quantity) };
      }
      return item;
    });
    
    setCart(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
  };
  
  const clearCart = () => {
    setCart([]);
    localStorage.removeItem('cart');
    showNotification('Cart has been cleared');
  };
  
  const getCartTotal = () => {
    return cart.reduce((total, item) => {
      const quantity = item.quantity || 1;
      return total + (item.price * quantity);
    }, 0);
  };
  
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  return (
    <Router>
      <div className="app">
        <Header 
          isAuthenticated={isAuthenticated} 
          user={user} 
          onLogout={logout} 
          cartItems={cart.length}
          cartTotal={getCartTotal()}
        />
        
        {/* Notification component */}
        {notification.show && (
          <div className={`notification notification-${notification.type}`}>
            {notification.message}
          </div>
        )}
        
        <main className="content">
          <Routes>
            <Route path="/" element={
              isAuthenticated ? 
                <Dashboard user={user} /> : 
                <EnhancedHomePage 
                  isAuthenticated={isAuthenticated}
                  addToCart={addToCart}
                  removeFromCart={removeFromCart}
                  cart={cart}
                />
            } />
            <Route path="/login" element={!isAuthenticated ? <Login onLogin={login} /> : <Navigate to="/" />} />
            <Route path="/register" element={!isAuthenticated ? <Register onRegister={login} /> : <Navigate to="/" />} />
            <Route path="/dashboard" element={isAuthenticated ? <Dashboard user={user} /> : <Navigate to="/login" />} />
            <Route path="/tests" element={isAuthenticated ? <TestList user={user} /> : <Navigate to="/login" />} />
            <Route path="/tests/:testId" element={isAuthenticated ? <TestDetails user={user} /> : <Navigate to="/login" />} />
            <Route path="/attempt/:testId" element={isAuthenticated ? <TestAttempt user={user} /> : <Navigate to="/login" />} />
            <Route path="/history" element={isAuthenticated ? <AttemptHistory user={user} /> : <Navigate to="/login" />} />
            
            {/* Updated exam routes */}
            <Route path="/exams" element={
              <EnhancedHomePage
                user={user} 
                isAuthenticated={isAuthenticated} 
                addToCart={addToCart}
                removeFromCart={removeFromCart}
                cart={cart}
                showAllExams={true}
              />
            } />
            <Route path="/exams/:examId" element={
              <ExamDetails 
                user={user} 
                isAuthenticated={isAuthenticated} 
                addToCart={addToCart}
                removeFromCart={removeFromCart}
                cart={cart}
              />
            } />
            <Route path="/demo/:examId" element={<DemoExam />} />
            <Route path="/cart" element={
              <Cart 
                cart={cart} 
                removeFromCart={removeFromCart}
                updateQuantity={updateCartItemQuantity}
                clearCart={clearCart}
                cartTotal={getCartTotal()}
                isAuthenticated={isAuthenticated}
              />
            } />
            {/* Updated checkout route using the Enhanced Checkout */}
            <Route path="/checkout" element={
              <Checkout 
                cart={cart} 
                user={user} 
                clearCart={clearCart} 
                removeFromCart={removeFromCart}
                updateQuantity={updateCartItemQuantity}
                cartTotal={getCartTotal()} 
                onLogin={login}
              /> 
            } />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;