// components/HomePage.js
import React from 'react';
import { Link } from 'react-router-dom';
import '../Home.css';

const Home = () => {
  return (
    <div className="home-page">
      <div className="hero-section">
        <h1>Welcome to TestPrep</h1>
        <p className="subtitle">Improve your skills with our interactive test platform</p>
        <div className="cta-buttons">
          <Link to="/login" className="btn btn-primary">Login</Link>
          <Link to="/register" className="btn btn-secondary">Register</Link>
        </div>
      </div>

      <div className="features-section">
        <h2>Why Choose TestPrep?</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">📚</div>
            <h3>Comprehensive Tests</h3>
            <p>Access a wide variety of tests across multiple subjects and difficulty levels.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Performance Tracking</h3>
            <p>Monitor your progress with detailed statistics and performance history.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">⏱️</div>
            <h3>Timed Practice</h3>
            <p>Improve your speed and accuracy with timed test sessions.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>Personalized Learning</h3>
            <p>Get recommendations based on your performance and learning patterns.</p>
          </div>
        </div>
      </div>
      
      <div className="testimonials-section">
        <h2>What Our Users Say</h2>
        <div className="testimonial-slider">
          <div className="testimonial">
            <p>"TestPrep helped me improve my scores by 25% in just three weeks of practice!"</p>
            <div className="testimonial-author">- Sarah J.</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;