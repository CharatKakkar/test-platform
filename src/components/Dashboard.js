// components/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  getUserExamProgress, 
  getAllExams,
  getUserPurchasedExams,
  getUserTestAttempts,
  getExamById 
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
  const [allExamsData, setAllExamsData] = useState([]);
  const navigate = useNavigate();

  // Helper function to add debug log entries
  const addDebugLog = (message) => {
    console.log(message);
    setDebugLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };
  
  // Handle navigation to exam details
  const handleExamDetailsNavigation = (examId) => {
    // Log detailed information for debugging
    console.log("🔍 NAVIGATING TO EXAM:", examId);
    console.log("📋 Exam type:", typeof examId);
    console.log("📊 Exam ID length:", examId?.length);
    
    // Check if this is a simple numeric ID
    if (examId && examId.length === 1 && "123456789".includes(examId)) {
      console.warn("⚠️ WARNING: Using numeric ID instead of Firebase document ID");
      
      // You can add a temporary mapping here for transition
      const documentIdMapping = {
        '1': 'UmG6yvkD0RJ3VFfc95b5', 
        '2': '2TRW5fp36eYK6C0pC0Vm',
        '3': 'yYqhU0cGKpNfK8bxQEdY',
        '4': 'cisco-ccna',
        '5': 'pmp',
        '6': 'azure-fundamentals'
      };
      
      if (documentIdMapping[examId]) {
        console.log(`Translating numeric ID ${examId} to document ID ${documentIdMapping[examId]}`);
        examId = documentIdMapping[examId]; // Use document ID instead
      }
    }
    
    try {
      // Find the exam in allExamsData to get complete details
      const examDetails = allExamsData.find(exam => exam.id === examId);
      console.log("Found exam details:", examDetails);
      
      if (!examDetails) {
        console.warn("Exam details not found in loaded data, creating placeholder");
      }
      
      // Create a safe object to store
      const safeExamDetails = {
        id: examId,
        title: examDetails?.title || "Certification Exam",
        ...(examDetails || {})
      };
      
      // Store exam data in session storage for access on the details page
      sessionStorage.setItem('currentExam', JSON.stringify(safeExamDetails));
      console.log("Stored exam data in session storage:", safeExamDetails);
      
      // Navigate programmatically using the actual Firebase document ID
      navigate(`/exam/${examId}/practice-tests`);
    } catch (error) {
      console.error("Error navigating to exam details:", error);
      // Fallback navigation without extra data
      navigate(`/exam/${examId}/practice-tests`);
    }
  };

  // Handle click on purchased exam - always go to practice tests
  const handlePurchasedExamClick = (exam) => {
    console.log("Clicked on purchased exam:", exam);
    handleExamDetailsNavigation(exam.id);
  };

  // Handle click on recent test
  const handleRecentTestClick = (test) => {
    // Navigate to the exam details with practice tests
    handleExamDetailsNavigation(test.examId);
  };

  // Generate a test name if not stored
  const getTestName = (attempt) => {
    // Use the stored testName if available
    if (attempt.testName) {
      return attempt.testName;
    }
    
    // Try to find the exam in our loaded exams data
    const exam = allExamsData.find(e => e.id === attempt.examId);
    const examName = exam?.title || "Certification Exam";
    return `${examName} - Practice Test`;
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
        
        const userId = user.uid || user.id;
        addDebugLog(`Fetching data for user: ${userId}`);

        // Get all exams first
        const allExams = await getAllExams();
        setAllExamsData(allExams); // Store for local use
        addDebugLog(`Found ${allExams.length} exams in database`);
        
        if (allExams.length === 0) {
          addDebugLog("WARNING: No exams found in database. Check your data migration.");
        }
        
        // Get purchased exams data
        addDebugLog("Fetching user purchased exams");
        const purchasedExamsData = await getUserPurchasedExams(userId);
        addDebugLog(`Found ${purchasedExamsData.length} purchased exams`);

        console.log("Detailed purchased exam data:", purchasedExamsData);
        
        // Process purchased exams
        const userPurchasedExams = [];
        
        for (const purchase of purchasedExamsData) {
          const examId = purchase.examId;
          
          if (!examId) {
            addDebugLog(`WARNING: Purchase record missing examId: ${purchase.id}`);
            continue;
          }
          
          // Find the exam details
          let examDetails = allExams.find(exam => exam.id === examId);
          
          // If not found in loaded exams, try to fetch it directly
          if (!examDetails) {
            addDebugLog(`Exam ${examId} not found in loaded exams, fetching directly`);
            try {
              examDetails = await getExamById(examId);
            } catch (error) {
              console.error(`Error fetching exam ${examId}:`, error);
            }
          }
        
          
          // Combine purchase and exam data
          userPurchasedExams.push({
            ...examDetails,
            id: examId,
            purchaseDate: purchase.purchaseDate || new Date().toISOString(),
            expiryDate: purchase.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            lastAccessDate: purchase.lastAccessDate
          });
        }
        
        console.log("User purchased exams after processing:", userPurchasedExams);
        
        // Fetch test attempts from the database
        addDebugLog("Fetching user test attempts from database");
        const userTestAttempts = await getUserTestAttempts(userId);
        addDebugLog(`Found ${userTestAttempts.length} test attempts`);
        console.log("User test attempts:", userTestAttempts);
        
        // Process all test attempts
        const allAttempts = userTestAttempts.map(attempt => {
          const examId = attempt.examId || '';
          return {
            id: attempt.id,
            examId: examId,
            testId: attempt.testId || '',
            score: attempt.percentage || attempt.score || 0,
            isPassed: attempt.isPassed || (attempt.percentage >= 70),
            mode: attempt.mode || 'exam',
            createdAt: attempt.timestamp || attempt.createdAt,
            correctAnswers: attempt.score || attempt.correctAnswers || 0,
            totalQuestions: attempt.totalQuestions || 1,
            testName: attempt.testName
          };
        });
        
        addDebugLog(`Processed ${allAttempts.length} total test attempts`);
        
        // Calculate stats
        const testsCompleted = allAttempts.length;
        const averageScore = testsCompleted > 0 
          ? Math.round(allAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / testsCompleted) 
          : 0;
        
        // Set stats
        setStats({
          testsCompleted,
          averageScore,
          purchasedExams: userPurchasedExams.length
        });
        
        // Sort attempts by date (newest first)
        const sortedAttempts = [...allAttempts].sort((a, b) => {
          // Handle Firestore Timestamp
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return dateB - dateA; // Sort descending (newest first)
        });
        
        // Get the 3 most recent tests
        setRecentTests(sortedAttempts.slice(0, 3));
        
        // Format the purchased exams
        const formattedExams = userPurchasedExams.map(exam => ({
          ...exam,
          title: exam.title || 'Unknown Exam',
          practiceTestsCount: exam.practiceTestsCount || 6, // Default to 6 practice tests if not specified
          description: exam.description || `Complete certification exam with practice tests`,
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
  }, [user, navigate]);
  
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
              <div 
                key={exam.id} 
                className="exam-card"
                onClick={() => handlePurchasedExamClick(exam)}
                style={{ cursor: 'pointer' }}
              >
                <div className="exam-badge">Certification Exam</div>
                <br/>
                <h3>{exam.title}</h3>
                <div className="exam-info">
                  <p><span className="info-label">Practice Tests:</span> {exam.practiceTestsCount || 6}</p>
                  <p><span className="info-label">Valid Until:</span> {new Date(exam.expiryDate).toLocaleDateString()}</p>
                  <p><span className="info-label">Exam ID:</span> {exam.id}</p>
                </div>
                <div className="exam-card-actions" onClick={(e) => e.stopPropagation()}>
                  <button 
                    className="btn-primary btn-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExamDetailsNavigation(exam.id);
                    }}
                  >
                    View Practice Tests
                  </button>
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
              <div 
                key={test.id} 
                className="test-card"
                onClick={() => handleRecentTestClick(test)}
                style={{ cursor: 'pointer' }}
              >
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
                <div className="test-card-actions" onClick={(e) => e.stopPropagation()}>
                  <button 
                    className="btn-secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExamDetailsNavigation(test.examId);
                    }}
                  >
                    Exam Details
                  </button>
                  <Link 
                    to={`/practice-test/${test.testId}`} 
                    state={{ 
                      mode: test.mode,
                      examId: test.examId
                    }}
                    className="btn-primary"
                    onClick={(e) => e.stopPropagation()}
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