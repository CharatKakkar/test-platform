// components/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAttemptHistory } from '../services/progressService';
import purchasedExamsService from '../services/purchasedExamsService';
import Loading from './Loading';
import './Dashboard.css';

function Dashboard({ user }) {
  const [recentTests, setRecentTests] = useState([]);
  const [purchasedExams, setPurchasedExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    testsCompleted: 0,
    averageScore: 0,
    purchasedExams: 0
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Get attempt history from Firebase via the service
        const attemptData = await getAttemptHistory();
        
        // Get purchased exams data
        const examsData = await purchasedExamsService.getPurchasedExams();
        
        // Calculate stats
        const testsCompleted = attemptData.length;
        const averageScore = testsCompleted > 0 
          ? Math.round(attemptData.reduce((sum, attempt) => sum + attempt.score, 0) / testsCompleted) 
          : 0;
        
        // Set stats
        setStats({
          testsCompleted,
          averageScore,
          purchasedExams: examsData.length
        });
        
        // Get the 3 most recent tests
        const sortedAttempts = [...attemptData].sort((a, b) => {
          // Handle Firestore Timestamp
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateB - dateA; // Sort descending (newest first)
        });
        
        setRecentTests(sortedAttempts.slice(0, 3));
        
        // Format the purchased exams
        const formattedExams = examsData.map(exam => ({
          ...exam,
          practiceTestsCount: 6, // Each exam has 6 practice tests
          description: `Complete certification exam with 6 practice tests`,
          lastActivity: exam.lastAccessDate || exam.purchaseDate
        }));
        
        setPurchasedExams(formattedExams);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  // Get a human-readable test name
  const getTestName = (attempt) => {
    const examName = getExamName(attempt.examId);
    const testNumber = attempt.testId.split('-')[1];
    return `${examName} - Practice Test ${testNumber}`;
  };
  
  // Get exam name from ID
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
      return date.toLocaleDateString();
    } catch (error) {
      console.error("Error formatting date:", error);
      return 'Invalid date';
    }
  };

  if (loading) {
    return <Loading size="medium" text="Loading dashboard..." />;
  }

  return (
    <div className="dashboard">
      <h1>Welcome to Your Dashboard, {user?.name || 'Student'}</h1>
      
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
          <h3>Purchased Exams</h3>
          <p className="stat-value">{stats.purchasedExams}</p>
        </div>
      </div>
      
      <section className="purchased-exams-section">
        <div className="section-header">
          <h2>Your Purchased Exams</h2>
          <Link to="/exams" className="view-all-link">Browse More Exams</Link>
        </div>
        
        {purchasedExams.length > 0 ? (
          <div className="purchased-exams-grid">
            {purchasedExams.map(exam => (
              <div key={exam.id} className="exam-card">
                <div className="exam-badge">Certification Exam</div>
                <h3>{exam.title}</h3>
                <div className="exam-info">
                  <p><span className="info-label">Practice Tests:</span> 6</p>
                  <p><span className="info-label">Valid Until:</span> {new Date(exam.expiryDate).toLocaleDateString()}</p>
                </div>
                <div className="exam-card-actions">
                  <Link 
                    to={`/exam/${exam.id}/practice-tests`}
                    className="btn-primary btn-full"
                  >
                    View Practice Tests
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-exams">
            <div className="no-data-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
              </svg>
            </div>
            <h3>No Exams Purchased Yet</h3>
            <p>Browse our catalog to find certification exams that match your career goals</p>
            <Link to="/exams" className="btn-primary">Browse Exams Catalog</Link>
          </div>
        )}
      </section>
      
      <section className="recent-activity">
        <div className="section-header">
          <h2>Recent Activity</h2>
          <Link to="/history" className="view-all-link">View All Tests</Link>
        </div>
        
        {recentTests.length > 0 ? (
          <div className="recent-tests">
            {recentTests.map(test => (
              <div key={test.id} className="test-card">
                <h3>{getTestName(test)}</h3>
                <div className="test-info">
                  <p>Date: {formatDate(test.createdAt)}</p>
                  <p>
                    <span className="mode-badge">
                      {test.mode === 'exam' ? 'Exam Mode' : 'Practice Mode'}
                    </span>
                  </p>
                  <div className="test-score">
                    <span className={test.isPassed ? 'pass' : 'fail'}>
                      Score: {test.score}%
                    </span>
                    <span className={`result-badge ${test.isPassed ? 'pass' : 'fail'}`}>
                      {test.isPassed ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                  <p>Correct: {test.correctAnswers} / {test.totalQuestions}</p>
                </div>
                <div className="test-card-actions">
                  <Link 
                    to={`/exam/${test.examId}/practice-tests`}
                    className="btn-secondary"
                  >
                    Exam Details
                  </Link>
                  <Link 
                    to={`/practice-test/${test.testId}`} 
                    state={{ mode: test.mode }}
                    className="btn-primary"
                  >
                    Retry Test
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-tests">
            <div className="no-data-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h3>No Tests Taken Yet</h3>
            <p>Start your learning journey by taking a practice test</p>
          </div>
        )}
      </section>
    
      
      <div className="quick-actions">
        <Link to="/exams" className="btn-primary">Browse Exams</Link>
        <Link to="/history" className="btn-secondary">View Test History</Link>
      </div>
    </div>
  );
}

export default Dashboard;