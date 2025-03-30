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

      <div className="exams-section">
        <h2>Available Exams</h2>
        <div className="exam-list">
          <div className="exam-card">
            <h3>SAT Preparation</h3>
            <p>College entrance examination with math, reading, and writing sections.</p>
            <Link to="/exams/sat" className="btn btn-outline">Start Practicing</Link>
          </div>
          
          <div className="exam-card">
            <h3>GMAT Preparation</h3>
            <p>Business school admission test covering analytical writing, quantitative reasoning, and verbal reasoning.</p>
            <Link to="/exams/gmat" className="btn btn-outline">Start Practicing</Link>
          </div>
          
          <div className="exam-card">
            <h3>CompTIA A+ Certification</h3>
            <p>IT certification covering hardware, networking, mobile devices, and troubleshooting.</p>
            <Link to="/exams/comptia" className="btn btn-outline">Start Practicing</Link>
          </div>
          
          <div className="exam-card">
            <h3>TOEFL Preparation</h3>
            <p>English language proficiency test for non-native speakers seeking academic admission.</p>
            <Link to="/exams/toefl" className="btn btn-outline">Start Practicing</Link>
          </div>
          
          <div className="exam-card">
            <h3>Nursing NCLEX</h3>
            <p>Licensing examination for nursing candidates testing clinical knowledge and critical thinking.</p>
            <Link to="/exams/nclex" className="btn btn-outline">Start Practicing</Link>
          </div>
        </div>
        <div className="view-all-exams">
          <Link to="/exams" className="btn btn-secondary">View All Exams</Link>
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