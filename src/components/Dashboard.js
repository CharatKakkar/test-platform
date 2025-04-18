// components/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  getUserExamProgress, 
  getAllExams,
  getUserPurchasedExams,
  purchaseExam
} from '../services/firebaseService';
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
  const [debugLog, setDebugLog] = useState([]);

  // Helper function to add debug log entries
  const addDebugLog = (message) => {
    console.log(message);
    setDebugLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        addDebugLog("Starting to fetch dashboard data");
        
        if (!user) {
          addDebugLog("No user logged in");
          setLoading(false);
          return;
        }
        
        addDebugLog(`Fetching data for user: ${user.id}`);

        // Get all exams first
        const allExams = await getAllExams();
        addDebugLog(`Found ${allExams.length} exams in database`);
        
        if (allExams.length === 0) {
          addDebugLog("WARNING: No exams found in database. Check your data migration.");
        }
        
        // Create a map for quick lookup
        const examsMap = {};
        allExams.forEach(exam => {
          examsMap[exam.id] = exam;
        });

        // Get user's progress data from Firebase
        addDebugLog("Fetching user progress data");
        const progressData = await getUserExamProgress(user.id);
        addDebugLog(`Progress data keys: ${Object.keys(progressData).join(', ')}`);
        
        // Get purchased exams data
        addDebugLog("Fetching user purchased exams");
        const purchasedExamsData = await getUserPurchasedExams(user.id);
        addDebugLog(`Found ${purchasedExamsData.length} purchased exams`);

        console.log("Detailed purchased exam data:", purchasedExamsData);

// IMPORTANT: Add these logs to see what's happening
console.log("All exams:", allExams);
        

// Simplified approach - directly use the purchased exams data
const userPurchasedExams = purchasedExamsData.map(purchase => {
  // Find the matching exam from allExams
  const matchingExam = allExams.find(exam => exam.id === purchase.examId) || {};
  
  // Merge the purchase data with the exam data
  return {
    ...matchingExam,
    id: purchase.examId || purchase.id, // Use exam ID if available
    purchaseDate: purchase.purchaseDate || new Date().toISOString(),
    expiryDate: purchase.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    lastAccessDate: purchase.lastAccessDate
  };
});

console.log("User purchased exams after processing:", userPurchasedExams);
        
        // Extract all attempts into a flat array
        const allAttempts = [];
        
        // Debug the progressData structure
        if (Object.keys(progressData).length === 0) {
          addDebugLog("WARNING: No progress data found for this user");
        } else {
          addDebugLog(`Progress data structure: ${JSON.stringify(Object.keys(progressData))}`);
        }
        
        // Loop through the user's progress data
        Object.keys(progressData).forEach(examId => {
          // Each exam has multiple tests
          const examTests = progressData[examId] || {};
          addDebugLog(`Exam ${examId} has ${Object.keys(examTests).length} tests with progress`);
          
          Object.keys(examTests).forEach(testId => {
            const testProgress = examTests[testId];
            
            if (testProgress && testProgress.history && testProgress.history.length) {
              addDebugLog(`Test ${testId} has ${testProgress.history.length} attempts`);
              
              // Add each attempt to our array
              testProgress.history.forEach((attempt, index) => {
                allAttempts.push({
                  id: `${testProgress.id || examId + '-' + testId}-${index}`, // Create a unique ID
                  examId: examId,
                  testId: testId,
                  score: attempt.score,
                  isPassed: attempt.isPassed,
                  mode: attempt.mode || 'exam',
                  createdAt: attempt.timestamp,
                  correctAnswers: attempt.correctAnswers,
                  totalQuestions: attempt.totalQuestions,
                  testName: testProgress.testName || null
                });
              });
            } else {
              addDebugLog(`No history for test ${testId} or invalid structure`);
              if (testProgress) {
                addDebugLog(`Test progress keys: ${Object.keys(testProgress).join(', ')}`);
              }
            }
          });
        });
        
        addDebugLog(`Found ${allAttempts.length} total test attempts`);
        
        // Enrich purchased exams with purchase details
        const enrichedPurchasedExams = userPurchasedExams.map(exam => {
          const purchaseDetails = purchasedExamsData.find(p => p.examId === exam.id);
          return {
            ...exam,
            purchaseDate: purchaseDetails?.purchaseDate || new Date().toISOString(),
            expiryDate: purchaseDetails?.expiryDate || 
              new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            lastAccessDate: purchaseDetails?.lastAccessDate
          };
        });
        
        // Calculate stats
        const testsCompleted = allAttempts.length;
        const averageScore = testsCompleted > 0 
          ? Math.round(allAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / testsCompleted) 
          : 0;
        
        // Set stats
        setStats({
          testsCompleted,
          averageScore,
          purchasedExams: enrichedPurchasedExams.length
        });
        
        // Sort attempts by date (newest first)
        const sortedAttempts = [...allAttempts].sort((a, b) => {
          // Handle Firestore Timestamp
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateB - dateA; // Sort descending (newest first)
        });
        
        // Get the 3 most recent tests
        setRecentTests(sortedAttempts.slice(0, 3));
        
        // Format the purchased exams
        const formattedExams = enrichedPurchasedExams.map(exam => ({
          ...exam,
          practiceTestsCount: 6, // Each exam has 6 practice tests
          description: `Complete certification exam with 6 practice tests`,
          lastActivity: exam.lastAccessDate || exam.purchaseDate
        }));
        
        setPurchasedExams(formattedExams);
        addDebugLog("Dashboard data loaded successfully");
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        addDebugLog(`ERROR: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [user]);
  
  // Manual purchase function for testing
  const handlePurchaseExam = async (examId) => {
    try {
      if (!user) {
        alert("You must be logged in to purchase exams");
        return;
      }
      
      addDebugLog(`Attempting to purchase exam ${examId}...`);
      await purchaseExam(user.id, examId);
      addDebugLog(`Successfully purchased exam ${examId}!`);
      
      // Reload dashboard data
      setLoading(true);
      window.location.reload(); // Simple refresh to reload all data
    } catch (error) {
      console.error("Error purchasing exam:", error);
      addDebugLog(`ERROR purchasing exam: ${error.message}`);
      alert(`Failed to purchase exam: ${error.message}`);
    }
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
  
  // Generate a test name if not stored
  const getTestName = (attempt) => {
    // Use the stored testName if available, otherwise generate one
    if (attempt.testName) {
      return attempt.testName;
    }
    
    const examName = getExamName(attempt.examId);
    const testNumber = attempt.testId.split('-')[1] || '1';
    return `${examName} - Practice Test ${testNumber}`;
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
      <h1>Welcome to Your Dashboard, {user?.displayName || user?.name || 'Student'}</h1>
      
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
  onClick={(e) => {
    console.log("Navigating to exam:", exam);
    // If you need to, you can store exam data in sessionStorage
    sessionStorage.setItem('currentExam', JSON.stringify(exam));
  }}
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
  onClick={() => {
    console.log("Navigating to exam details with examId:", test.examId);
  }}
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
      
      {/* Debug section - for development only */}
      <section style={{ marginTop: '30px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h2>Development Tools</h2>
        <div>
          <h3>Purchase Exam (Test):</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <button onClick={() => handlePurchaseExam('1')} style={{ padding: '10px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px' }}>
              Purchase CompTIA A+
            </button>
            <button onClick={() => handlePurchaseExam('2')} style={{ padding: '10px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '4px' }}>
              Purchase AWS Solutions Architect
            </button>
            <button onClick={() => handlePurchaseExam('3')} style={{ padding: '10px', background: '#FF9800', color: 'white', border: 'none', borderRadius: '4px' }}>
              Purchase Scrum Master
            </button>
          </div>
        </div>
        
        <div>
          <h3>Debug Log:</h3>
          <pre style={{ height: '200px', overflow: 'auto', background: '#f0f0f0', padding: '10px', borderRadius: '4px', fontSize: '12px' }}>
            {debugLog.length > 0 ? debugLog.map((log, i) => <div key={i}>{log}</div>) : "No logs yet"}
          </pre>
        </div>
      </section>
      
      <div className="quick-actions">
        <Link to="/exams" className="btn-primary">Browse Exams</Link>
        <Link to="/history" className="btn-secondary">View Test History</Link>
      </div>
    </div>
  );
}

export default Dashboard;