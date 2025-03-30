// components/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function Dashboard({ user }) {
  const [recentTests, setRecentTests] = useState([]);
  const [stats, setStats] = useState({
    testsCompleted: 0,
    averageScore: 0,
    testsAvailable: 0
  });

  useEffect(() => {
    // Simulated data loading - in a real app, this would be an API call
    setTimeout(() => {
      // Mock data
      setRecentTests([
        { id: 1, title: 'Demo Test', date: '2025-03-15', score: '85%', status: 'completed' },
        { id: 2, title: 'Practice Test 1', date: '2025-03-14', score: '78%', status: 'completed' }
      ]);
      
      setStats({
        testsCompleted: 2,
        averageScore: 81.5,
        testsAvailable: 5
      });
    }, 300);
  }, []);

  return (
    <div className="dashboard">
      <h1>Welcome to Your Dashboard, {user.name}</h1>
      
      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Tests Completed</h3>
          <p className="stat-value">{stats.testsCompleted}</p>
        </div>
        <div className="stat-card">
          <h3>Average Score</h3>
          <p className="stat-value">{stats.averageScore}%</p>
        </div>
        <div className="stat-card">
          <h3>Available Tests</h3>
          <p className="stat-value">{stats.testsAvailable}</p>
        </div>
      </div>
      
      <section className="recent-activity">
        <h2>Recent Activity</h2>
        {recentTests.length > 0 ? (
          <div className="recent-tests">
            {recentTests.map(test => (
              <div key={test.id} className="test-card">
                <h3>{test.title}</h3>
                <p>Date: {test.date}</p>
                <p>Score: {test.score}</p>
                <div className="test-card-actions">
                  <Link to={`/tests/${test.id}`} className="btn-secondary">View Details</Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No recent tests taken.</p>
        )}
      </section>
      
      <div className="quick-actions">
        <Link to="/tests" className="btn-primary">Browse Tests</Link>
        <Link to="/tests/1" className="btn-secondary">Take Demo Test</Link>
      </div>
    </div>
  );
}

export default Dashboard