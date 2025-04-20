// utils/examUtils.js
/**
 * Utility functions for handling exam data consistently across components
 */

/**
 * Check if a user owns a specific exam
 * @param {string} examId - The ID of the exam to check
 * @param {Array} purchasedExams - Array of user's purchased exams
 * @returns {boolean} - True if user owns the exam
 */
export const isExamOwned = (examId, purchasedExams = []) => {
    if (!examId || !Array.isArray(purchasedExams)) return false;
    return purchasedExams.some(purchase => purchase.examId === examId);
  };
  
  /**
   * Check if an exam is in the cart
   * @param {string} examId - The ID of the exam to check
   * @param {Array} cart - The current cart items
   * @returns {boolean} - True if exam is in cart
   */
  export const isExamInCart = (examId, cart = []) => {
    if (!examId || !Array.isArray(cart)) return false;
    return cart.some(item => item.id === examId);
  };
  
  /**
   * Generate a default thumbnail SVG for exams without thumbnails
   * @param {Object} exam - The exam object
   * @returns {string} - SVG data URL
   */
  export const getDefaultThumbnail = (exam) => {
    if (!exam) return '';
    
    const colors = {
      'IT': '#275d8b',
      'Cloud': '#f90',
      'Project Management': '#4b9b4b',
      'Networking': '#005073',
      'Education': '#c41230',
      'Security': '#bd582c',
      'Development': '#0078d4'
    };
    
    const bgColor = colors[exam.category] || '#333';
    const acronym = exam.title ? 
      exam.title.split(' ').map(word => word[0]).join('').substring(0, 3) : 
      'EX';
    
    return `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="100" viewBox="0 0 160 100"%3E%3Crect width="160" height="100" fill="${bgColor.replace('#', '%23')}"/%3E%3Ctext x="80" y="50" font-family="Arial" font-size="18" text-anchor="middle" fill="white"%3E${acronym}%3C/text%3E%3C/svg%3E`;
  };
  
  /**
   * Store exam data in session storage for use across components
   * @param {Object} exam - The exam object to store
   */
  export const storeExamInSession = (exam) => {
    if (!exam || !exam.id) return;
    
    try {
      // Create a safe object to store
      const safeExamDetails = {
        id: exam.id,
        title: exam.title || "Certification Exam",
        ...exam
      };
      
      // Store in session storage
      sessionStorage.setItem('currentExam', JSON.stringify(safeExamDetails));
      console.log("Stored exam data in session storage:", safeExamDetails);
    } catch (error) {
      console.error("Error storing exam data in session storage:", error);
    }
  };
  
  /**
   * Retrieve exam data from session storage
   * @param {string} examId - The ID of the exam to retrieve (for validation)
   * @returns {Object|null} - The exam object or null if not found
   */
  export const getExamFromSession = (examId) => {
    try {
      const storedExam = sessionStorage.getItem('currentExam');
      if (!storedExam) return null;
      
      const parsedData = JSON.parse(storedExam);
      
      // Verify it's the correct exam
      if (parsedData && parsedData.id === examId) {
        return parsedData;
      }
      
      return null;
    } catch (error) {
      console.error("Error retrieving exam data from session storage:", error);
      return null;
    }
  };
  
  /**
   * Calculate the total price of items in the cart
   * @param {Array} cart - Array of cart items
   * @returns {string} - Formatted total price
   */
  export const calculateCartTotal = (cart = []) => {
    if (!Array.isArray(cart) || cart.length === 0) return "0.00";
    return cart.reduce((total, item) => total + (item.price || 0), 0).toFixed(2);
  };
  
  /**
   * Determine which route to navigate to based on exam ownership
   * @param {string} examId - The ID of the exam
   * @param {boolean} isOwned - Whether the user owns the exam
   * @returns {string} - The route path to navigate to
   */
  export const getExamNavigationPath = (examId, isOwned) => {
    if (!examId) return '/exams';
    
    return isOwned 
      ? `/exam/${examId}/practice-tests` // If owned, go to practice tests
      : `/exam/${examId}`; // If not owned, go to exam details
  };
  
  /**
   * Format a timestamp consistently
   * @param {Object|string|number} timestamp - The timestamp to format
   * @returns {string} - Formatted date string
   */
  export const formatDate = (timestamp) => {
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
  
  /**
   * Generate a test name if not provided
   * @param {Object} attempt - The test attempt object
   * @param {Array} allExams - Array of all exams for reference
   * @returns {string} - Generated test name
   */
  export const getTestName = (attempt, allExams = []) => {
    // Use stored testName if available
    if (attempt.testName) {
      return attempt.testName;
    }
    
    // Try to find the exam in the loaded exams data
    const exam = allExams.find(e => e.id === attempt.examId);
    const examName = exam?.title || "Certification Exam";
    return `${examName} - Practice Test`;
  };