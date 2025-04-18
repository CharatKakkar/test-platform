// components/AttemptHistory.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAttemptHistory } from '../services/progressService';
import Loading from './Loading';
import './AttemptHistory.css';

const AttemptHistory = ({ user }) => {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modeFilter, setModeFilter] = useState('all'); // 'all', 'exam', or 'practice'
  const [examFilter, setExamFilter] = useState('all'); // 'all' or a specific examId
  const [exams, setExams] = useState([]);

  useEffect(() => {
    const fetchAttempts = async () => {
      setLoading(true);
      try {
        const attemptData = await getAttemptHistory();
        setAttempts(attemptData);
        
        // Extract unique exam IDs for filtering
        const uniqueExams = [...new Set(attemptData.map(attempt => attempt.examId))];
        setExams(uniqueExams);
      } catch (error) {
        console.error("Error fetching attempt history:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAttempts();
  }, []);
  
  // Filter attempts by mode and exam
  const filteredAttempts = attempts.filter(attempt => {
    // Filter by mode
    if (modeFilter !== 'all' && attempt.mode !== modeFilter) {
      return false;
    }
    
    // Filter by exam
    if (examFilter !== 'all' && attempt.examId !== examFilter) {
      return false;
    }
    
    return true;
  });
  
  // Get a human-readable exam name from ID
  const getExamName = (examId) => {
    const examNames = {
      '1': 'CompTIA A+',
      '2': 'AWS Solutions Architect',
      '3': 'Certified Scrum Master',
      '4': 'Cisco CCNA',
      '5': 'PMP',
      '6': 'Azure Fundamentals'
    };
    
    return examNames[examId] || `Exam ${examId}`;
  };
  
  // Format date string
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    try {
      // Handle Firestore Timestamp
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (error) {
      console.error("Error formatting date:", error);
      return 'Invalid date';
    }
  };
  
  if (loading) {
    return <Loading size="large" text="Loading history..." />;
  }
  
  return (
    <div className="attempt-history-container">
      <div className="history-header">
        <h1>Your Test History</h1>
        <p className="history-subtitle">Track your progress across all practice tests</p>
      </div>
      
      <div className="filter-section">
        <div className="filter-group">
          <label>Filter by Mode:</label>
          <div className="filter-tabs">
            <button 
              className={modeFilter === 'all' ? 'active' : ''} 
              onClick={() => setModeFilter('all')}
            >
              All Modes
            </button>
            <button 
              className={modeFilter === 'exam' ? 'active' : ''} 
              onClick={() => setModeFilter('exam')}
            >
              Exam Mode
            </button>
            <button 
              className={modeFilter === 'practice' ? 'active' : ''} 
              onClick={() => setModeFilter('practice')}
            >
              Practice Mode
            </button>
          </div>
        </div>
        
        {exams.length > 1 && (
          <div className="filter-group">
            <label>Filter by Exam:</label>
            <select 
              value={examFilter} 
              onChange={(e) => setExamFilter(e.target.value)}
              className="exam-select"
            >
              <option value="all">All Exams</option>
              {exams.map(examId => (
                <option key={examId} value={examId}>
                  {getExamName(examId)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      
      {filteredAttempts.length === 0 ? (
        <div className="no-attempts">
          <div className="no-data-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h3>No Attempts Found</h3>
          <p>You haven't taken any tests {modeFilter !== 'all' ? `in ${modeFilter} mode` : ''} 
            {examFilter !== 'all' ? ` for ${getExamName(examFilter)}` : ''} yet.</p>
          <Link to="/exams" className="btn-primary">Browse Exams</Link>
        </div>
      ) : (
        <>
          <div className="attempts-stats">
            <div className="stat-box">
              <div className="stat-value">{filteredAttempts.length}</div>
              <div className="stat-label">Total Attempts</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">
                {Math.round(filteredAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / filteredAttempts.length)}%
              </div>
              <div className="stat-label">Average Score</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">
                {filteredAttempts.filter(attempt => attempt.isPassed).length}
              </div>
              <div className="stat-label">Tests Passed</div>
            </div>
          </div>
        
          <div className="attempts-list">
            <table className="attempts-table">
              <thead>
                <tr>
                  <th>Test Name</th>
                  <th>Date</th>
                  <th>Mode</th>
                  <th>Score</th>
                  <th>Correct</th>
                  <th>Result</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttempts.map(attempt => (
                  <tr key={attempt.id}>
                    {/* Use the stored testName if available, otherwise generate one */}
                    <td>{attempt.testName || getTestName(attempt)}</td>
                    <td>{formatDate(attempt.createdAt)}</td>
                    <td>
                      <span className={`mode-badge ${attempt.mode}`}>
                        {attempt.mode === 'exam' ? 'Exam' : 'Practice'}
                      </span>
                    </td>
                    <td className="score">{attempt.score}%</td>
                    <td>{attempt.correctAnswers} / {attempt.totalQuestions}</td>
                    <td>
                      <span className={`result-badge ${attempt.isPassed ? 'pass' : 'fail'}`}>
                        {attempt.isPassed ? 'PASS' : 'FAIL'}
                      </span>
                    </td>
                    <td>
                      <Link 
                        to={`/practice-test/${attempt.testId}`} 
                        state={{ mode: attempt.mode }}
                        className="retry-btn"
                      >
                        Retry
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      
      <div className="history-actions">
        <Link to="/exams" className="btn-secondary">Back to Exams</Link>
      </div>
    </div>
  );
  
  // Helper function to generate a test name if not stored
  function getTestName(attempt) {
    const examName = getExamName(attempt.examId);
    const testNumber = attempt.testId.split('-')[1] || '1';
    return `${examName} - Practice Test ${testNumber}`;
  }
};

export default AttemptHistory;