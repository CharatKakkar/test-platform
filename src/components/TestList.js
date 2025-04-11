// components/TestList.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import purchasedExamsService from '../services/purchasedExamsService.js';
import Loading from './Loading';
import './TestList.css';

function TestList({ user }) {
  const [purchasedExams, setPurchasedExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch purchased certification exams
        const exams = await purchasedExamsService.getPurchasedExams();
        
        // Format the purchased exams
        const formattedExams = exams.map(exam => ({
          ...exam,
          practiceTestsCount: 6, // Each exam has 6 practice tests
          description: `Complete certification exam with 6 practice tests`,
          lastActivity: exam.lastAccessDate || exam.purchaseDate
        }));
        
        setPurchasedExams(formattedExams);
      } catch (error) {
        console.error("Error fetching purchased exams:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (loading) {
    return <Loading text="Loading your purchased exams..." />;
  }

  return (
    <div className="test-list-container">
      <h1>Your Purchased Exams</h1>
      
      {purchasedExams.length === 0 ? (
        <div className="no-items">
          <p>You haven't purchased any certification exams yet.</p>
          <Link to="/exams" className="btn-primary">Browse Exams</Link>
        </div>
      ) : (
        <div className="test-list">
          {purchasedExams.map(exam => (
            <div key={exam.id} className="test-card">
              <div className="exam-badge">Certification Exam</div>
              <h2>{exam.title}</h2>
              <p>{exam.description}</p>
              
              <div className="test-details">
                <span className="practice-tests-count">
                  <strong>Includes:</strong> 6 Practice Tests
                </span>
                <span><strong>Purchase Date:</strong> {new Date(exam.purchaseDate).toLocaleDateString()}</span>
                <span><strong>Valid Until:</strong> {new Date(exam.expiryDate).toLocaleDateString()}</span>
              </div>
              
              <div className="test-actions">
                <Link to={`/exam/${exam.id}/practice-tests`} className="btn-primary">
                  View Practice Tests
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="browse-more">
        <Link to="/exams" className="btn-secondary">
          Browse More Certification Exams
        </Link>
      </div>
    </div>
  );
}

export default TestList;