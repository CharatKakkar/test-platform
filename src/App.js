// App.js - Main application component
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Login from './components/Login';
import Home from './components/Home';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import TestList from './components/TestList';
import TestDetails from './components/TestDetails';
import TestAttempt from './components/TestAttempt';
import AttemptHistory from './components/AttemptHistory';
import Footer from './components/Footer';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
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

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <Router>
      <div className="app">
        <Header isAuthenticated={isAuthenticated} user={user} onLogout={logout} />
        <main className="content">
          <Routes>
          <Route path="/" element={isAuthenticated ? <Dashboard user={user} /> : <Home />} />
            <Route path="/login" element={!isAuthenticated ? <Login onLogin={login} /> : <Navigate to="/" />} />
            <Route path="/register" element={!isAuthenticated ? <Register onRegister={login} /> : <Navigate to="/" />} />
            <Route path="/tests" element={isAuthenticated ? <TestList user={user} /> : <Navigate to="/login" />} />
            <Route path="/tests/:testId" element={isAuthenticated ? <TestDetails user={user} /> : <Navigate to="/login" />} />
            <Route path="/attempt/:testId" element={isAuthenticated ? <TestAttempt user={user} /> : <Navigate to="/login" />} />
            <Route path="/history" element={isAuthenticated ? <AttemptHistory user={user} /> : <Navigate to="/login" />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;