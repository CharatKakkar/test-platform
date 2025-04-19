// components/PurchasedExams.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  getAllExams,
  getUserPurchasedExams,
  getExamById 
} from '../services/firebaseService';
import './PurchasedExams.css'; // Using our custom CSS

function PurchasedExams({ user }) {
  const [purchasedExams, setPurchasedExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Navigate to exam practice tests
  const handleViewPracticeTests = (examId) => {
    if (!examId) {
      console.error("Invalid examId for navigation");
      return;
    }
    
    // Navigate to practice tests page using the Firebase document ID
    navigate(`/exam/${examId}/practice-tests`);
  };

  useEffect(() => {
    // Function to fetch purchased exams
    const fetchPurchasedExams = async () => {
      setLoading(true);
      
      try {
        // Ensure we have a valid user
        if (!user) {
          console.log("No valid user found");
          setLoading(false);
          return;
        }
        
        const userId = user.id;
        console.log(`Fetching purchased exams for user: ${userId}`);
        
        // Get user's purchased exams
        const purchasedExamsData = await getUserPurchasedExams(userId);
        console.log(`Found ${purchasedExamsData.length} purchased exams`);
        
        if (purchasedExamsData.length === 0) {
          setPurchasedExams([]);
          setLoading(false);
          return;
        }
        
        // Get all exams for reference data
        const allExams = await getAllExams();
        console.log(`Loaded ${allExams.length} exams for reference`);
        
        // Process and enhance purchased exams with complete data
        const processedExams = await Promise.all(
          purchasedExamsData.map(async (purchase) => {
            const examId = purchase.examId;
            
            if (!examId) {
              console.log(`Purchase record missing examId: ${purchase.id}`);
              return null;
            }
            
            // Find exam in loaded data
            let examDetails = allExams.find(exam => exam.id === examId);
            
            // If not found, fetch directly
            if (!examDetails) {
              try {
                examDetails = await getExamById(examId);
                if (!examDetails) {
                  console.log(`No exam found with ID: ${examId}`);
                  return null;
                }
              } catch (error) {
                console.error(`Error fetching exam ${examId}:`, error);
                return null;
              }
            }
            
            // Return combined exam data
            return {
              ...examDetails,
              id: examId,
              purchaseDate: purchase.purchaseDate || new Date().toISOString(),
              expiryDate: purchase.expiryDate || null,
              purchaseId: purchase.id || null
            };
          })
        );
        
        // Filter out any null values (failed lookups)
        const validExams = processedExams.filter(exam => exam !== null);
        console.log(`Processed ${validExams.length} valid purchased exams`);
        
        setPurchasedExams(validExams);
      } catch (error) {
        console.error("Error fetching purchased exams:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPurchasedExams();
  }, [user, navigate]);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  return (
    <div className="dashboard">
      {loading ? (
        <div className="loading-container">
          <div className="spinner spinner-medium"></div>
          <p className="loading-text">Loading your exams...</p>
        </div>
      ) : (
        <>
          <h1>Your Purchased Exams</h1>
          
          {purchasedExams.length > 0 ? (
            <div className="purchased-exams-grid">
              {purchasedExams.map(exam => (
                <div key={exam.id} className="exam-card">
                  <h3 title={exam.title || 'Certification Exam'}>
                    {exam.title || 'Certification Exam'}
                  </h3>
                  <div className="exam-info">
                    <p>
                      <span className="info-label">Practice Tests:</span>
                      <span className="info-value">{exam.practiceTestsCount || 6}</span>
                    </p>
                    <p>
                      <span className="info-label">Purchase Date:</span>
                      <span className="info-value">{formatDate(exam.purchaseDate)}</span>
                    </p>
                    {exam.expiryDate && (
                      <p>
                        <span className="info-label">Valid Until:</span>
                        <span className="info-value">{formatDate(exam.expiryDate)}</span>
                      </p>
                    )}
                  </div>
                  <div className="exam-card-actions">
                    <button 
                      className="btn-primary btn-full"
                      onClick={() => handleViewPracticeTests(exam.id)}
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
        </>
      )}
    </div>
  );
}

export default PurchasedExams;