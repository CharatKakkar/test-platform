// components/AttemptHistory.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function AttemptHistory() {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get attempt history from localStorage
    const attemptHistory = JSON.parse(localStorage.getItem('attemptHistory') || '[]');
    // Sort by date (newest first)
    attemptHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
    setAttempts(attemptHistory);
    setLoading(false);
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (loading) {
    return <div className="loading">Loading history...</div>;
  }

  return (
    <div className="attempt-history-container">
      <h1>Your Test History</h1>
      
      {attempts.length === 0 ? (
        <div className="no-attempts">
          <p>You haven't taken any tests yet.</p>
          <Link to="/tests" className="btn-primary">Browse Tests</Link>
        </div>
      ) : (
        <div className="attempts-list">
          <table className="attempts-table">
            <thead>
              <tr>
                <th>Test Name</th>
                <th>Date</th>
                <th>Score</th>
                <th>Correct Answers</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map(attempt => (
                <tr key={attempt.id}>
                  <td>{attempt.testName}</td>
                  <td>{formatDate(attempt.date)}</td>
                  <td className="score">{attempt.score}%</td>
                  <td>{attempt.correctAnswers}/{attempt.totalQuestions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <div className="actions">
        <Link to="/tests" className="btn-secondary">Back to Tests</Link>
      </div>
    </div>
  );
}

export default AttemptHistory;