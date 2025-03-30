
// components/TestList.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function TestList() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call to get tests
    setTimeout(() => {
      const mockTests = [
        { 
          id: 1, 
          title: 'Demo Test', 
          description: 'Try our demo test for free!', 
          questions: 10, 
          time: 15, 
          price: 'Free' 
        },
        { 
          id: 2, 
          title: 'Practice Test 1', 
          description: 'Comprehensive practice test with detailed feedback', 
          questions: 50, 
          time: 60, 
          price: '$12.99' 
        },
        { 
          id: 3, 
          title: 'Practice Test 2', 
          description: 'Advanced concepts with challenging questions', 
          questions: 60, 
          time: 90, 
          price: '$14.99' 
        },
        { 
          id: 4, 
          title: 'Quick Assessment', 
          description: 'Brief assessment to identify knowledge gaps', 
          questions: 25, 
          time: 30, 
          price: '$7.99' 
        }
      ];
      
      setTests(mockTests);
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return <div className="loading">Loading tests...</div>;
  }

  return (
    <div className="test-list-container">
      <h1>Available Tests</h1>
      <div className="test-list">
        {tests.map(test => (
          <div key={test.id} className="test-card">
            <h2>{test.title}</h2>
            <p>{test.description}</p>
            <div className="test-details">
              <span><strong>Questions:</strong> {test.questions}</span>
              <span><strong>Time:</strong> {test.time} min</span>
              <span><strong>Price:</strong> {test.price}</span>
            </div>
            <div className="test-actions">
              <Link to={`/tests/${test.id}`} className="btn-primary">View Details</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TestList;