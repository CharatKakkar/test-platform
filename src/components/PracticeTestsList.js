// components/PracticeTestsList.js
import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import Loading from './Loading';
import './PracticeTestsList.css';
import { getExamProgress, resetAllProgress } from '../services/progressService';

const PracticeTestsList = ({ user }) => {
  const { examId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState(null);
  const [practiceTests, setPracticeTests] = useState([]);
  const [progressData, setProgressData] = useState({});
  const [filter, setFilter] = useState('all');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const fetchExamAndTests = async () => {
      setLoading(true);
      try {
        // In a real app, you would fetch this data from your backend
        // Mock exam data
        const examData = {
          id: parseInt(examId),
          title: getExamTitle(parseInt(examId)),
          description: 'Comprehensive certification exam to validate your skills and knowledge.',
          category: getExamCategory(parseInt(examId)),
          purchaseDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
          expiryDate: new Date(Date.now() + 358 * 24 * 60 * 60 * 1000).toISOString(), // 358 days later
          passingScore: 70
        };
        
        // Generate 6 practice tests for this exam
        const tests = generatePracticeTests(parseInt(examId), 6);
        
        // Get progress data from Firebase
        const examProgress = await getExamProgress(examId);
        console.log('Loaded progress data from Firebase:', examProgress);
        
        setExam(examData);
        setPracticeTests(tests);
        setProgressData(examProgress);
      } catch (error) {
        console.error("Error fetching exam data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchExamAndTests();
  }, [examId]);


  // Helper function to generate mock practice tests
  const generatePracticeTests = (examId, count) => {
    const tests = [];
    const difficultyLevels = ['Easy', 'Medium', 'Medium', 'Hard', 'Hard', 'Challenge'];
    
    for (let i = 1; i <= count; i++) {
      tests.push({
        id: `${examId}-${i}`,
        examId: examId,
        title: `Practice Test ${i}`,
        description: `Comprehensive practice test designed to simulate the actual certification exam experience, with ${i === 6 ? 'challenging' : 'realistic'} questions.`,
        questionCount: i === 6 ? 75 : 60,
        timeLimit: i === 6 ? 90 : 60, // minutes
        difficulty: difficultyLevels[i-1],
        passingScore: 70,
        createdAt: new Date(Date.now() - (count - i + 1) * 14 * 24 * 60 * 60 * 1000).toISOString(), // Staggered creation dates
      });
    }
    
    return tests;
  };

  // Helper functions to get exam data based on ID (similar to your ExamDetails component)
  function getExamTitle(id) {
    const titles = {
      1: 'CompTIA A+ Certification',
      2: 'AWS Certified Solutions Architect',
      3: 'Certified Scrum Master (CSM)',
      4: 'Cisco CCNA Certification',
      5: 'PMP Certification',
      6: 'Microsoft Azure Fundamentals (AZ-900)'
    };
    return titles[id] || `Certification Exam ${id}`;
  }
  
  function getExamCategory(id) {
    const categories = {
      1: 'IT',
      2: 'Cloud',
      3: 'Project Management',
      4: 'Networking',
      5: 'Project Management',
      6: 'Cloud'
    };
    return categories[id] || 'General';
  }

  // Calculate exam progress percentage
  // Update calculateProgress function
  const calculateProgress = () => {
    if (!practiceTests.length) return 0;
    
    let completedTests = 0;
    
    practiceTests.forEach(test => {
      if (progressData[test.id] && progressData[test.id].attempts > 0) {
        completedTests++;
      }
    });
    
    return Math.round((completedTests / practiceTests.length) * 100);
  };

  // Start practice test in specified mode
  const startTest = (testId, mode) => {
    navigate(`/practice-test/${testId}`, { state: { mode } });
  };

  // Handle reset progress button click
  const handleResetProgress = async () => {
    setIsResetting(true);
    try {
      await resetAllProgress();
      // Refetch data after reset
      const examProgress = await getExamProgress(examId);
      setProgressData(examProgress);
    } catch (error) {
      console.error("Error resetting progress:", error);
    } finally {
      setIsResetting(false);
    }
  };

  // Filter tests based on selected filter
  const getFilteredTests = () => {
    switch (filter) {
      case 'completed':
        return practiceTests.filter(test => 
          progressData[test.id] && progressData[test.id].attempts > 0
        );
      case 'not-started':
        return practiceTests.filter(test => 
          !progressData[test.id] || progressData[test.id].attempts === 0
        );
      case 'passed':
        return practiceTests.filter(test => 
          progressData[test.id] && 
          progressData[test.id].bestScore >= (test.passingScore || 70)
        );
      case 'failed':
        return practiceTests.filter(test => 
          progressData[test.id] && 
          progressData[test.id].attempts > 0 &&
          progressData[test.id].bestScore < (test.passingScore || 70)
        );
      default:
        return practiceTests;
    }
  };

  // Calculate remaining days of access
  const getRemainingDays = () => {
    if (!exam) return 0;
    
    const expiryDate = new Date(exam.expiryDate);
    const today = new Date();
    const diffTime = expiryDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  };

  if (loading) {
    return <Loading size="large" text="Loading practice tests..." />;
  }

  const filteredTests = getFilteredTests();
  const progressPercentage = calculateProgress();
  const remainingDays = getRemainingDays();

  return (
    <div className="practice-tests-container">
      <div className="exam-header">
        <h1>{exam.title}</h1>
        <div className="exam-category">{exam.category}</div>
      </div>
      
      <div className="exam-info-panel">
        <div className="exam-stats">
          <div className="stat-card">
            <div className="stat-value">{practiceTests.length}</div>
            <div className="stat-label">Practice Tests</div>
          </div>
          <div className="stat-card">
            <div className="progress-circle">
              <svg viewBox="0 0 36 36">
                <path
                  className="progress-circle-bg"
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="progress-circle-fill"
                  strokeDasharray={`${progressPercentage}, 100`}
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <text x="18" y="20.35" className="progress-text">
                  {progressPercentage}%
                </text>
              </svg>
            </div>
            <div className="stat-label">Course Progress</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{remainingDays}</div>
            <div className="stat-label">Days Remaining</div>
          </div>
        </div>
        
        <div className="exam-description">
          <h2>Course Overview</h2>
          <p>{exam.description}</p>
          <div className="exam-info">
            <div className="info-item">
              <span className="info-label">Passing Score</span>
              <span className="info-value">{exam.passingScore}%</span>
            </div>
            <div className="info-item">
              <span className="info-label">Purchase Date</span>
              <span className="info-value">{new Date(exam.purchaseDate).toLocaleDateString()}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Access Until</span>
              <span className="info-value">{new Date(exam.expiryDate).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="tests-filter-container">
        <h2>Practice Tests</h2>
        <div className="filter-tabs">
          <button 
            className={filter === 'all' ? 'active' : ''} 
            onClick={() => setFilter('all')}
          >
            All Tests
          </button>
          <button 
            className={filter === 'not-started' ? 'active' : ''} 
            onClick={() => setFilter('not-started')}
          >
            Not Started
          </button>
          <button 
            className={filter === 'completed' ? 'active' : ''} 
            onClick={() => setFilter('completed')}
          >
            Completed
          </button>
          <button 
            className={filter === 'passed' ? 'active' : ''} 
            onClick={() => setFilter('passed')}
          >
            Passed
          </button>
          <button 
            className={filter === 'failed' ? 'active' : ''} 
            onClick={() => setFilter('failed')}
          >
            Failed
          </button>
        </div>
      </div>
      
      {filteredTests.length === 0 ? (
        <div className="no-tests-message">
          <p>No practice tests match the selected filter. Try a different filter.</p>
        </div>
      ) : (
        <div className="practice-tests-list">
            {filteredTests.map(test => {
  const testProgress = progressData[test.id] || { attempts: 0, bestScore: 0 };
  
  return (
    <div key={test.id} className="practice-test-card">
      <div className="test-card-header">
        <div className="test-info">
          <h3>{test.title}</h3>
          <div className="test-meta">
            <span className="test-meta-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              {test.timeLimit} min
            </span>
            <span className="test-meta-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                <polyline points="13 2 13 9 20 9"></polyline>
              </svg>
              {test.questionCount} questions
            </span>
            <span className={`difficulty-badge ${test.difficulty.toLowerCase()}`}>
              {test.difficulty}
            </span>
          </div>
        </div>
        
        <div className="test-progress">
          {testProgress.attempts > 0 ? (
            <div className="test-stats">
              <div className="attempts-info">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
                {testProgress.attempts} {testProgress.attempts === 1 ? 'attempt' : 'attempts'}
              </div>
              <div className={`best-score ${testProgress.bestScore >= test.passingScore ? 'passing' : 'failing'}`}>
                {testProgress.bestScore}%
              </div>
            </div>
          ) : (
            <div className="not-started">Not started yet</div>
          )}
        </div>
      </div>
      
      <div className="test-card-details">
        <p className="test-description">{test.description}</p>
        
        {testProgress.attempts > 0 && (
          <div className="test-history">
            <h4>Attempt History</h4>
            <div className="history-stats">
              <div className="history-stat">
                <span className="stat-label">First Attempt</span>
                <span className="stat-value">{testProgress.firstScore || 0}%</span>
              </div>
              <div className="history-stat">
                <span className="stat-label">Best Score</span>
                <span className={`stat-value ${testProgress.bestScore >= test.passingScore ? 'passing' : 'failing'}`}>
                  {testProgress.bestScore}%
                </span>
              </div>
              <div className="history-stat">
                <span className="stat-label">Last Attempt</span>
                <span className="stat-value">{testProgress.lastScore || 0}%</span>
              </div>
              <div className="history-stat">
                <span className="stat-label">Attempts</span>
                <span className="stat-value">{testProgress.attempts}</span>
              </div>
            </div>
          </div>
        )}
        
        <div className="test-actions">
          <div className="mode-options">
            <div className="mode-option">
              <h4>Exam Mode</h4>
              <p>Timed test with results at the end. Simulates the actual exam experience.</p>
              <button 
                className="mode-btn exam-mode"
                onClick={() => startTest(test.id, 'exam')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                Start Exam Mode
              </button>
            </div>
            
            <div className="mode-option">
              <h4>Practice Mode</h4>
              <p>Untimed test with immediate feedback. Great for learning and reviewing content.</p>
              <button 
                className="mode-btn practice-mode"
                onClick={() => startTest(test.id, 'practice')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
                Start Practice Mode
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
})}
        </div>
      )}

<div className="debug-controls" style={{ marginTop: '30px', padding: '15px', background: '#f8f8f8', borderRadius: '8px' }}>
    <h3>Debug Controls</h3>
    <button 
      onClick={handleResetProgress}
      disabled={isResetting}
      style={{ 
        padding: '8px 16px', 
        background: '#e74c3c', 
        color: 'white', 
        border: 'none', 
        borderRadius: '4px',
        cursor: 'pointer',
        opacity: isResetting ? 0.7 : 1
      }}
    >
      {isResetting ? 'Resetting...' : 'Reset All Progress Data'}
    </button>
    <p style={{ fontSize: '0.8rem', marginTop: '8px', color: '#666' }}>
      This will clear all saved test progress in Firebase (for development purposes).
    </p>
  </div>
    </div>
  );
};

export default PracticeTestsList;