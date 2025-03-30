import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function TestDetails() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchased, setPurchased] = useState(false);

  useEffect(() => {
    // Simulate API call to get test details
    setTimeout(() => {
      // In a real app, you would fetch this data from an API
      const testData = {
        id: parseInt(testId),
        title: testId === '1' ? 'Demo Test' : `Practice Test ${testId}`,
        description: 'This test will evaluate your knowledge and skills on various topics.',
        questions: testId === '1' ? 10 : 50,
        time: testId === '1' ? 15 : 60,
        price: testId === '1' ? 'Free' : '$12.99',
        topics: ['Topic 1', 'Topic 2', 'Topic 3'],
        difficulty: testId === '1' ? 'Easy' : 'Intermediate'
      };
      
      setTest(testData);
      setLoading(false);
      
      // Demo test is always "purchased"
      if (testId === '1') {
        setPurchased(true);
      } else {
        // Check if user has already purchased this test
        const purchasedTests = JSON.parse(localStorage.getItem('purchasedTests') || '[]');
        setPurchased(purchasedTests.includes(parseInt(testId)));
      }
    }, 300);
  }, [testId]);

  const handlePurchase = () => {
    // In a real app, you would integrate with a payment processor
    // For demo, we'll simulate a purchase
    const purchasedTests = JSON.parse(localStorage.getItem('purchasedTests') || '[]');
    purchasedTests.push(parseInt(testId));
    localStorage.setItem('purchasedTests', JSON.stringify(purchasedTests));
    setPurchased(true);
  };

  const startTest = () => {
    navigate(`/attempt/${testId}`);
  };

  if (loading) {
    return <div className="loading">Loading test details...</div>;
  }

  return (
    <div className="test-details-container">
      <h1>{test.title}</h1>
      <div className="test-info">
        <p className="test-description">{test.description}</p>
        
        <div className="test-meta">
          <div className="meta-item">
            <h3>Questions</h3>
            <p>{test.questions}</p>
          </div>
          <div className="meta-item">
            <h3>Time</h3>
            <p>{test.time} minutes</p>
          </div>
          <div className="meta-item">
            <h3>Difficulty</h3>
            <p>{test.difficulty}</p>
          </div>
          <div className="meta-item">
            <h3>Price</h3>
            <p>{test.price}</p>
          </div>
        </div>
        
        <div className="test-topics">
          <h3>Topics Covered:</h3>
          <ul>
            {test.topics.map((topic, index) => (
              <li key={index}>{topic}</li>
            ))}
          </ul>
        </div>
        
        <div className="test-actions">
          {purchased ? (
            <button onClick={startTest} className="btn-primary">Start Test</button>
          ) : (
            <button onClick={handlePurchase} className="btn-primary">Purchase Test</button>
          )}
          <button onClick={() => navigate('/tests')} className="btn-secondary">Back to Tests</button>
        </div>
      </div>
    </div>
  );
}

export default TestDetails;