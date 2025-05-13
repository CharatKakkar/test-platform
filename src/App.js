// App.js - Main application component with Firebase integration
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

// Components
import Header from './components/Header';
import EnhancedHomePage from './components/EnhancedHomePage';
import PracticeTestsList from './components/PracticeTestsList';
import EnhancedPracticeTest from './components/EnhancedPracticeTest.js';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import TestList from './components/TestList';
import TestDetails from './components/TestDetails';
import AttemptHistory from './components/AttemptHistory';
import ExamDetails from './components/ExamDetails';
import DemoExam from './components/DemoExam.js';
import Footer from './components/Footer';
import Cart from './components/Cart.js';
import Order from './components/Order.js';
import PurchasedExams from './components/PurchasedExams.js';

// New components for payment handling
import PaymentStatusRouter from './components/PaymentStatusRouter';
import ThankYouPage from './pages/ThankYouPage';

// Firebase Services
// Authentication methods for App.js
import { 
  registerWithEmail, 
  loginWithEmail, 
  authenticateWithGoogle, 
  logoutUser,
  getCurrentUser
} from './services/authService';
import { 
  getCart, 
  addToCart, 
  removeFromCart, 
  updateCartItemQuantity, 
  clearCart,
  mergeCartOnLogin
} from './services/cartService';

import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  
  // Monitor authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      
      if (firebaseUser) {
        try {
          // Get full user data from Firestore
          const userData = await getCurrentUser();
          setUser(userData);
          setIsAuthenticated(true);
          
          // Merge local cart with Firebase cart when user logs in
          const updatedCart = await mergeCartOnLogin(firebaseUser.uid);
          setCart(updatedCart);
        } catch (error) {
          console.error("Error setting up user data:", error);
          setIsAuthenticated(false);
          setUser(null);
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
        
        // Load cart from localStorage for non-authenticated users
        try {
          const localCart = await getCart();
          setCart(localCart);
        } catch (error) {
          console.error("Error loading local cart:", error);
        }
      }
      
      setLoading(false);
    });
    
    // Clean up subscription
    return () => unsubscribe();
  }, []);
  
  // Handle notifications
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    
    // Hide notification after 3 seconds
    setTimeout(() => {
      setNotification({ ...notification, show: false });
    }, 3000);
  };
  
  // Updated login handler with support for both email and Google auth
  const login = async (email, password, isGoogleAuth = false) => {
    try {
      let userData;
      
      if (isGoogleAuth) {
        // Use Google authentication
        userData = await authenticateWithGoogle();
      } else {
        // Use email/password authentication
        userData = await loginWithEmail(email, password);
      }
      
      return userData;
    } catch (error) {
      showNotification(error.message, 'error');
      throw error;
    }
  };
  
  // Logout handler
  const logout = async () => {
    try {
      await logoutUser();
      showNotification('Logged out successfully');
    } catch (error) {
      showNotification(error.message, 'error');
    }
  };
  
  // Add to cart handler
  const handleAddToCart = async (exam) => {
    try {
      // Check if item is already in cart
      if (cart.some(item => item.id === exam.id)) {
        showNotification(`${exam.title} is already in your cart`, 'info');
        return;
      }
      
      const updatedCart = await addToCart(exam);
      setCart(updatedCart);
      showNotification(`${exam.title} added to cart`);
    } catch (error) {
      showNotification(error.message, 'error');
    }
  };
  
  // Remove from cart handler
  const handleRemoveFromCart = async (examId) => {
    try {
      const examToRemove = cart.find(item => item.id === examId);
      const updatedCart = await removeFromCart(examId);
      setCart(updatedCart);
      
      if (examToRemove) {
        showNotification(`${examToRemove.title} removed from cart`, 'warning');
      }
    } catch (error) {
      showNotification(error.message, 'error');
    }
  };
  
  // Update cart item quantity handler
  const handleUpdateCartItemQuantity = async (examId, quantity) => {
    try {
      const updatedCart = await updateCartItemQuantity(examId, quantity);
      setCart(updatedCart);
    } catch (error) {
      showNotification(error.message, 'error');
    }
  };
  
  // Clear cart handler
  const handleClearCart = async () => {
    try {
      await clearCart();
      setCart([]);
      showNotification('Cart has been cleared');
    } catch (error) {
      showNotification(error.message, 'error');
    }
  };
  
  // Handle successful payment
  const handlePaymentSuccess = (sessionData) => {
    // Clear the cart after successful payment
    handleClearCart();
    
    // Show success notification
    showNotification('Payment completed successfully! Thank you for your purchase.', 'success');
  };
  
  // Login handler - supports both email and Google authentication
  const handleLogin = async (email, password, isGoogleAuth = false) => {
    try {
      let userData;
      
      if (isGoogleAuth) {
        // Use Google authentication
        userData = await authenticateWithGoogle();
      } else {
        // Use email/password authentication
        userData = await loginWithEmail(email, password);
      }
      
      setUser(userData);
      setIsAuthenticated(true);
      showNotification('Login successful');
      return userData;
    } catch (error) {
      showNotification(error.message, 'error');
      throw error;
    }
  };

  // Register handler - supports both email and Google authentication 
  const handleRegister = async (name, email, password, isGoogleAuth = false) => {
    try {
      let userData;
      
      if (isGoogleAuth) {
        // Use Google authentication for registration
        userData = await authenticateWithGoogle();
      } else {
        // Use email/password registration
        userData = await registerWithEmail(name, email, password);
      }
      
      setUser(userData);
      setIsAuthenticated(true);
      showNotification('Registration successful');
      return userData;
    } catch (error) {
      showNotification(error.message, 'error');
      throw error;
    }
  };

  // Calculate cart total
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
          cart={cart}  // Pass the full cart array
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
                  addToCart={handleAddToCart}
                  removeFromCart={handleRemoveFromCart}
                  cart={cart}
                />
            } />
            <Route path="/login" element={!isAuthenticated ? 
              <Login onLogin={handleLogin} /> : 
              <Navigate to="/" />
            } />
            <Route path="/register" element={!isAuthenticated ? 
              <Register onRegister={handleRegister} /> : 
              <Navigate to="/" />
            } />
            <Route path="/dashboard" element={isAuthenticated ? 
              <Dashboard user={user} /> : 
              <Navigate to="/login" />
            } />
            <Route path="/tests" element={isAuthenticated ? 
              <TestList user={user} /> : 
              <Navigate to="/login" />
            } />
            <Route path="/tests/:testId" element={isAuthenticated ? 
              <TestDetails user={user} /> : 
              <Navigate to="/login" />
            } />
            <Route path="/purchased" element={isAuthenticated ? 
              <PurchasedExams user={user} /> : 
              <Navigate to="/login" />
            } />
            <Route path="/history" element={isAuthenticated ? 
              <AttemptHistory user={user} /> : 
              <Navigate to="/login" />
            } />
            <Route path="/order" element={<Order isAuthenticated={isAuthenticated} user={user} />} />
           
            {/* Updated exam routes */}
            <Route path="/exams" element={
              <EnhancedHomePage
                isAuthenticated={isAuthenticated} 
                addToCart={handleAddToCart}
                removeFromCart={handleRemoveFromCart}
                cart={cart}
                showAllExams={true}
                user={user} 
              />
            } />
            <Route path="/exams/:examId" element={
              <ExamDetails 
                user={user} 
                isAuthenticated={isAuthenticated} 
                addToCart={handleAddToCart}
                removeFromCart={handleRemoveFromCart}
                cart={cart}
              />
            } />
            <Route path="/demo/:examId" element={<DemoExam />} />
            
            {/* Enhanced practice test route */}
            <Route path="/practice-test/:testId" element={
              <EnhancedPracticeTest user={user} />
            } />

            <Route path="/cart" element={
              <Cart 
                cart={cart} 
                removeFromCart={handleRemoveFromCart}
                updateQuantity={handleUpdateCartItemQuantity}
                clearCart={handleClearCart}
                cartTotal={getCartTotal()}
                isAuthenticated={isAuthenticated}
              />
            } />

            <Route path="/exam/:examId/practice-tests" element={
              <PracticeTestsList 
                user={user} 
                addToCart={handleAddToCart}
                removeFromCart={handleRemoveFromCart}
                cart={cart}
              />
            } />

            {/* Payment Success/Failure Routes */}
            <Route path="/payment/verify" element={
              <PaymentStatusRouter 
                successRedirect="/thank-you" 
                failureRedirect="/payment-failed"
                pendingRedirect="/payment-pending"
              />
            } />
            <Route path="/payment/success" element={
              <PaymentStatusRouter 
                successRedirect="/thank-you" 
              />
            } />     
            {/* Final Destination Pages */}
            <Route path="/thank-you" element={
              <ThankYouPage 
                onComplete={handlePaymentSuccess}
                user={user}
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