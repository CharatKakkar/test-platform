// App.js - Main application component
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './components/HomePage';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import TestList from './components/TestList';
import TestDetails from './components/TestDetails';
import TestAttempt from './components/TestAttempt';
import AttemptHistory from './components/AttemptHistory';
import ExamsList from './components/ExamsList';
import ExamDetails from './components/ExamDetails';
import DemoExam from './components/DemoExam.js';
import Checkout from './components/Checkout';
import Footer from './components/Footer';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  
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
    const updatedCart = [...cart, exam];
    setCart(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
  };
  
  const removeFromCart = (examId) => {
    const updatedCart = cart.filter(item => item.id !== examId);
    setCart(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
  };
  
  const clearCart = () => {
    setCart([]);
    localStorage.removeItem('cart');
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
        />
        <main className="content">
          <Routes>
            <Route path="/" element={isAuthenticated ? <Dashboard user={user} /> : <HomePage />} />
            <Route path="/login" element={!isAuthenticated ? <Login onLogin={login} /> : <Navigate to="/" />} />
            <Route path="/register" element={!isAuthenticated ? <Register onRegister={login} /> : <Navigate to="/" />} />
            <Route path="/dashboard" element={isAuthenticated ? <Dashboard user={user} /> : <Navigate to="/login" />} />
            <Route path="/tests" element={isAuthenticated ? <TestList user={user} /> : <Navigate to="/login" />} />
            <Route path="/tests/:testId" element={isAuthenticated ? <TestDetails user={user} /> : <Navigate to="/login" />} />
            <Route path="/attempt/:testId" element={isAuthenticated ? <TestAttempt user={user} /> : <Navigate to="/login" />} />
            <Route path="/history" element={isAuthenticated ? <AttemptHistory user={user} /> : <Navigate to="/login" />} />
            
            {/* New exam-related routes */}
            <Route path="/exams" element={<ExamsList />} />
            <Route path="/exams/:examId" element={<ExamDetails 
              user={user} 
              isAuthenticated={isAuthenticated} 
              addToCart={addToCart} 
            />} />
            <Route path="/demo/:examId" element={<DemoExam />} />
            <Route path="/checkout" element={isAuthenticated ? 
              <Checkout cart={cart} user={user} clearCart={clearCart} removeFromCart={removeFromCart} /> : 
              <Navigate to="/login" state={{ from: '/checkout' }} />
            } />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;