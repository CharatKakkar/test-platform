// components/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getUserExamHistory } from '../services/examService';
import { db } from '../firebase';
import { collection, getDocs, query, where, limit, orderBy } from 'firebase/firestore';

function Dashboard({ user }) {
  const [recentTests, setRecentTests] = useState([]);
  const [stats, setStats] = useState({
    testsCompleted: 0,
    averageScore: 0,
    testsAvailable: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch recent test attempts
        const examHistory = await getUserExamHistory();
        
        // Format test attempts for display
        const recentTestsData = examHistory.slice(0, 3).map(attempt => {
          // Convert Firestore timestamp to Date if needed
          const attemptDate = attempt.date?.toDate ? 
            attempt.date.toDate().toISOString().split('T')[0] : 
            new Date(attempt.date).toISOString().split('T')[0];
            
          return {
            id: attempt.id,
            examId: attempt.examId,
            title: attempt.examTitle || `Exam ${attempt.examId}`,
            date: attemptDate,
            score: `${Math.round(attempt.score.percentage || attempt.score)}%`,
            status: 'completed'
          };
        });
        
        setRecentTests(recentTestsData);
        
        // Calculate stats from exam history
        const completedTests = examHistory.length;
        const averageScore = completedTests > 0 
          ? examHistory.reduce((sum, attempt) => sum + (attempt.score.percentage || attempt.score), 0) / completedTests
          : 0;
          
        // Get count of available exams
        const examsSnapshot = await getDocs(collection(db, 'exams'));
        const availableExams = examsSnapshot.size;
        
        setStats({
          testsCompleted: completedTests,
          averageScore: Math.round(averageScore * 10) / 10, // Round to 1 decimal place
          testsAvailable: availableExams
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [user.id]);

  if (loading) {
    return <div className="loading">Loading dashboard data...</div>;
  }

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
                  <Link to={`/exams/${test.examId}`} className="btn-secondary">View Details</Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No recent tests taken.</p>
        )}
      </section>
      
      <div className="quick-actions">
        <Link to="/exams" className="btn-primary">Browse Exams</Link>
        <Link to="/demo/exam1" className="btn-secondary">Take Demo Test</Link>
      </div>
    </div>
  );
}

export default Dashboard;