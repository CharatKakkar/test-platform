// services/firebaseService.js
import { db } from '../firebase'; // Assume you have firebase.js with your Firebase config
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp 
} from 'firebase/firestore';

// Exams Collection Methods
export const getAllExams = async () => {
  try {
    const examsRef = collection(db, 'exams');
    const snapshot = await getDocs(examsRef);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting exams:', error);
    throw error;
  }
};

export const getExamById = async (examId) => {
  try {
    const examRef = doc(db, 'exams', examId);
    const examDoc = await getDoc(examRef);
    
    if (examDoc.exists()) {
      return {
        id: examDoc.id,
        ...examDoc.data()
      };
    } else {
      console.log(`No exam found with ID: ${examId}`);
      return null;
    }
  } catch (error) {
    console.error(`Error getting exam with ID ${examId}:`, error);
    throw error;
  }
};

export const addExam = async (examData) => {
  try {
    const examsRef = collection(db, 'exams');
    const docRef = await addDoc(examsRef, {
      ...examData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding exam:', error);
    throw error;
  }
};

export const updateExam = async (examId, examData) => {
  try {
    const examRef = doc(db, 'exams', examId);
    await updateDoc(examRef, {
      ...examData,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error(`Error updating exam with ID ${examId}:`, error);
    throw error;
  }
};

// Practice Tests Collection Methods
export const getPracticeTestsByExamId = async (examId) => {
  try {
    const testsRef = collection(db, 'exams', examId, 'practiceTests');
    const snapshot = await getDocs(testsRef);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      examId, // Include the parent examId for reference
      ...doc.data()
    }));
  } catch (error) {
    console.error(`Error getting practice tests for exam ${examId}:`, error);
    throw error;
  }
};

export const getPracticeTestById = async (examId, testId) => {
  try {
    const testRef = doc(db, 'exams', examId, 'practiceTests', testId);
    const testDoc = await getDoc(testRef);
    
    if (testDoc.exists()) {
      return {
        id: testDoc.id,
        examId, // Include the parent examId for reference
        ...testDoc.data()
      };
    } else {
      console.log(`No practice test found with ID: ${testId}`);
      return null;
    }
  } catch (error) {
    console.error(`Error getting practice test ${testId}:`, error);
    throw error;
  }
};

export const addPracticeTest = async (examId, testData) => {
  try {
    const testsRef = collection(db, 'exams', examId, 'practiceTests');
    const docRef = await addDoc(testsRef, {
      ...testData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding practice test:', error);
    throw error;
  }
};

export const updatePracticeTest = async (examId, testId, testData) => {
  try {
    const testRef = doc(db, 'exams', examId, 'practiceTests', testId);
    await updateDoc(testRef, {
      ...testData,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error(`Error updating practice test ${testId}:`, error);
    throw error;
  }
};

// Questions Collection Methods
export const getQuestionsByTestId = async (examId, testId) => {
  try {
    const questionsRef = collection(db, 'exams', examId, 'practiceTests', testId, 'questions');
    // Order by question number or sequence
    const q = query(questionsRef, orderBy('sequence', 'asc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      examId, // Include the parent examId for reference
      testId, // Include the parent testId for reference
      ...doc.data()
    }));
  } catch (error) {
    console.error(`Error getting questions for test ${testId}:`, error);
    throw error;
  }
};

export const addQuestion = async (examId, testId, questionData) => {
  try {
    const questionsRef = collection(db, 'exams', examId, 'practiceTests', testId, 'questions');
    const docRef = await addDoc(questionsRef, {
      ...questionData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding question:', error);
    throw error;
  }
};

export const updateQuestion = async (examId, testId, questionId, questionData) => {
  try {
    const questionRef = doc(db, 'exams', examId, 'practiceTests', testId, 'questions', questionId);
    await updateDoc(questionRef, {
      ...questionData,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error(`Error updating question ${questionId}:`, error);
    throw error;
  }
};

// User Progress Tracking Methods - would be stored in a separate 'userProgress' collection
/**
 * Get all progress data for a user across exams
 * @param {string} userId - The ID of the user
 * @returns {Promise<Object>} - Object with exam and test progress
 */
/**
 * Get all progress data for a user across exams
 * @param {string} userId - The ID of the user
 * @returns {Promise<Object>} - Object with exam and test progress
 */
/**
 * Get all progress data for a user across exams
 * @param {string} userId - The ID of the user
 * @returns {Promise<Object>} - Object with exam and test progress
 */
export const getUserExamProgress = async (userId) => {
  try {
    // Check if userId is undefined, null, or empty string
    if (!userId) {
      console.log("No userId provided to getUserExamProgress");
      return {};
    }

    console.log(`Fetching progress for user ${userId}`);
    
    // Access the nested collection structure for test attempts
    const attemptsRef = collection(db, 'testAttempts', userId, 'attempts');
    
    try {
      const snapshot = await getDocs(attemptsRef);
      console.log(`Found ${snapshot.docs.length} test attempts for user`);
      
      if (!snapshot || snapshot.empty) {
        return {};
      }
      
      // First fetch the exam ID mappings from Firestore
      const mappingsRef = doc(db, 'mappings', 'examIdMappings');
      const mappingsDoc = await getDoc(mappingsRef);
      const examIdMap = mappingsDoc.exists() ? mappingsDoc.data().mappings || {} : {};
      
      // Access the nested collection structure for test attempts
      const attemptsRef = collection(db, 'testAttempts', userId, 'attempts');
      
      // Organize by examId and testId for easier access
      const progressData = {};
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        
          // Extract examId and testId from the data
  const rawExamId = data.examId || '';
  
  
  // Map document IDs to numeric exam IDs if needed
  // This mapping should match your actual data structure
  // const examIdMap = {
  //   'UmG6yvkD0RJ3VFfc95b5': '1',  // Example mapping
  //   // Add other mappings as needed
  // };
  
  
  // Use the mapped ID or the original if no mapping exists
  const examId = examIdMap[rawExamId] || rawExamId;

        // Extract examId and testId from the data
        const testId = data.testId || '';


        
        // Make sure required fields exist
        if (!examId || !testId) {
          console.warn(`Test attempt missing examId or testId: ${doc.id}`);
          console.log("Attempt data:", data);
          return;
        }
        
        // Initialize the exam object if it doesn't exist
        if (!progressData[examId]) {
          progressData[examId] = {};
        }
        
        // Initialize the test object if it doesn't exist
        if (!progressData[examId][testId]) {
          progressData[examId][testId] = {
            id: testId,
            examId: examId,
            testId: testId,
            attempts: 0,
            bestScore: 0,
            history: []
          };
        }
        
        // Add this attempt to the history
        progressData[examId][testId].history.push({
          id: doc.id,
          timestamp: data.timestamp || data.createdAt || data.date,
          score: data.score || data.percentage || 0,
          timeSpent: data.timeSpent || 0,
          correctAnswers: data.correctAnswers || data.score || 0,
          totalQuestions: data.totalQuestions || data.questions || 100,
          isPassed: data.isPassed || (data.score >= 70) || false,
          mode: data.mode || 'exam'
        });
        
        // Increment attempt count
        progressData[examId][testId].attempts += 1;
        
        // Update best score if this attempt has a higher score
        const attemptScore = data.score || data.percentage || 0;
        if (attemptScore > progressData[examId][testId].bestScore) {
          progressData[examId][testId].bestScore = attemptScore;
        }
        
        // Add test name if available
        if (data.testName) {
          progressData[examId][testId].testName = data.testName;
        }
      });
      
      // Log the organized data
      const examCount = Object.keys(progressData).length;
      console.log(`Organized test attempts into ${examCount} exams`);
      
      Object.keys(progressData).forEach(examId => {
        const testCount = Object.keys(progressData[examId]).length;
        console.log(`Exam ${examId} has ${testCount} tests with attempts`);
      });
      
      return progressData;
    } catch (error) {
      console.error("Error querying test attempts:", error);
      // Return empty object on query error
      return {};
    }
  } catch (error) {
    console.error(`Error getting test attempts for user ${userId}:`, error);
    return {};
  }
};
export const updateUserTestProgress = async (userId, examId, testId, resultData) => {
  try {
    // First check if a record already exists
    const progressRef = collection(db, 'userProgress');
    const q = query(
      progressRef, 
      where('userId', '==', userId),
      where('examId', '==', examId),
      where('testId', '==', testId)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // Create new progress record
      const newProgress = {
        userId,
        examId,
        testId,
        attempts: 1,
        firstAttemptAt: serverTimestamp(),
        lastAttemptAt: serverTimestamp(),
        bestScore: resultData.percentage,
        firstScore: resultData.percentage,
        lastScore: resultData.percentage,
        history: [
          {
            timestamp: serverTimestamp(),
            score: resultData.percentage,
            timeSpent: resultData.timeSpent,
            correctAnswers: resultData.score,
            totalQuestions: resultData.totalQuestions,
            isPassed: resultData.isPassed,
            mode: resultData.mode
          }
        ]
      };
      
      const docRef = await addDoc(progressRef, newProgress);
      return docRef.id;
    } else {
      // Update existing progress record
      const progressDoc = snapshot.docs[0];
      const progressData = progressDoc.data();
      
      // Update best score if the new score is higher
      const bestScore = Math.max(progressData.bestScore || 0, resultData.percentage);
      
      // Add to history array
      const updatedHistory = [
        ...progressData.history || [],
        {
          timestamp: serverTimestamp(),
          score: resultData.percentage,
          timeSpent: resultData.timeSpent,
          correctAnswers: resultData.score,
          totalQuestions: resultData.totalQuestions,
          isPassed: resultData.isPassed,
          mode: resultData.mode
        }
      ];
      
      await updateDoc(progressDoc.ref, {
        attempts: (progressData.attempts || 0) + 1,
        lastAttemptAt: serverTimestamp(),
        bestScore,
        lastScore: resultData.percentage,
        history: updatedHistory
      });
      
      return progressDoc.id;
    }
  } catch (error) {
    console.error('Error updating test progress:', error);
    throw error;
  }
};

export const resetAllUserProgress = async (userId) => {
  try {
    const progressRef = collection(db, 'userProgress');
    const q = query(progressRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    
    const deletePromises = snapshot.docs.map(doc => updateDoc(doc.ref, { 
      attempts: 0,
      bestScore: 0,
      firstScore: 0,
      lastScore: 0,
      history: [],
      resetAt: serverTimestamp()
    }));
    
    await Promise.all(deletePromises);
    return true;
  } catch (error) {
    console.error('Error resetting user progress:', error);
    throw error;
  }
};

// Add these functions to your firebaseService.js file

/**
 * Get a user's purchased exams
 * @param {string} userId - The ID of the user
 * @returns {Promise<Array>} - Array of purchased exam objects
 */
/**
 * Get a user's purchased exams
 * @param {string} userId - The ID of the user
 * @returns {Promise<Array>} - Array of purchased exam objects
 */
export const getUserPurchasedExams = async (userId) => {
  try {
    // Skip if no user ID provided
    if (!userId) {
      return [];
    }
    
    console.log(`Fetching purchased exams for user ${userId}`);
    
    // Access the nested collection structure
    const purchasesRef = collection(db, 'purchasedExams', userId, 'purchases');
    const snapshot = await getDocs(purchasesRef);
    
    console.log(`Found ${snapshot.docs.length} purchased exams`);
    
    if (snapshot.empty) {
      return [];
    }
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error(`Error getting purchased exams for user ${userId}:`, error);
    return [];
  }
};

/**
 * Purchase an exam for a user
 * @param {string} userId - The ID of the user
 * @param {string} examId - The ID of the exam to purchase
 * @param {Object} paymentDetails - Payment information
 * @returns {Promise<string>} - ID of the purchase record
 */
export const purchaseExam = async (userId, examId, paymentDetails = {}) => {
  try {
    // Skip if no user ID provided
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    // Get the exam details to include in the purchase
    const examData = await getExamById(examId);
    
    if (!examData) {
      throw new Error(`Exam with ID ${examId} not found`);
    }
    
    // Calculate expiry date (default to 1 year if not specified)
    const validityDays = examData.purchaseDetails?.validityDays || 365;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + validityDays);
    
    // Create the purchase record
    const purchaseData = {
      userId,
      examId,
      examTitle: examData.title,
      purchaseDate: serverTimestamp(),
      expiryDate: expiryDate,
      status: 'active',
      price: examData.price,
      paymentDetails: {
        ...paymentDetails,
        timestamp: serverTimestamp()
      },
      lastAccessDate: serverTimestamp()
    };
    
    // Add to userPurchases collection
    const purchaseRef = await addDoc(collection(db, 'userPurchases'), purchaseData);
    return purchaseRef.id;
  } catch (error) {
    console.error(`Error purchasing exam ${examId} for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Update the last access date for a user's purchased exam
 * @param {string} userId - The ID of the user
 * @param {string} examId - The ID of the exam
 * @returns {Promise<boolean>} - Success status
 */
export const updateExamAccessDate = async (userId, examId) => {
  try {
    if (!userId || !examId) {
      return false;
    }
    
    // Find the purchase record
    const purchasesRef = collection(db, 'userPurchases');
    const q = query(
      purchasesRef, 
      where('userId', '==', userId),
      where('examId', '==', examId),
      where('status', '==', 'active'),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return false;
    }
    
    // Update the last access date
    const purchaseDoc = snapshot.docs[0];
    await updateDoc(purchaseDoc.ref, {
      lastAccessDate: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error(`Error updating access date for exam ${examId}:`, error);
    return false;
  }
};

// Add or update this function in your firebaseService.js file

/**
 * Get all progress data for a user across exams
 * @param {string} userId - The ID of the user
 * @returns {Promise<Object>} - Object with exam and test progress
 */
/**
 * Add a mock test result for a user (for development/testing purposes)
 * @param {string} userId - The ID of the user
 * @param {string} examId - The ID of the exam
 * @param {string} testId - The ID of the test
 * @returns {Promise<string>} - ID of the created progress document
 */
export const addMockTestResult = async (userId, examId, testId) => {
  try {
    if (!userId || !examId || !testId) {
      throw new Error("Missing required parameters");
    }
    
    // Get exam and test details for the mock record
    const examData = await getExamById(examId);
    if (!examData) {
      throw new Error(`Exam with ID ${examId} not found`);
    }
    
    let testData;
    try {
      testData = await getPracticeTestById(examId, testId);
    } catch (error) {
      console.warn(`Couldn't find test with ID ${testId}, creating mock test data`);
      testData = {
        title: `Practice Test 1`,
        displayName: `${examData.title} - Practice Test 1`,
        questionCount: 60
      };
    }
    
    // Generate a random score between 60-95%
    const randomScore = Math.floor(Math.random() * 36) + 60;
    const totalQuestions = testData.questionCount || 60;
    const correctAnswers = Math.round((randomScore / 100) * totalQuestions);
    const isPassed = randomScore >= (examData.passingScore || 70);
    
    // Create the mock test attempt
    const mockAttempt = {
      score: randomScore,
      correctAnswers,
      totalQuestions,
      isPassed,
      mode: Math.random() > 0.5 ? 'exam' : 'practice',
      timeSpent: Math.floor(Math.random() * 30) + 30 // 30-60 minutes
    };
    
    // Check if a progress record already exists
    const progressRef = collection(db, 'userProgress');
    const q = query(
      progressRef, 
      where('userId', '==', userId),
      where('examId', '==', examId),
      where('testId', '==', testId)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // Create new progress record
      const newProgress = {
        userId,
        examId,
        testId,
        attempts: 1,
        firstAttemptAt: serverTimestamp(),
        lastAttemptAt: serverTimestamp(),
        bestScore: mockAttempt.score,
        firstScore: mockAttempt.score,
        lastScore: mockAttempt.score,
        testName: testData.displayName || `${examData.title} - Practice Test`,
        history: [
          {
            timestamp: serverTimestamp(),
            score: mockAttempt.score,
            timeSpent: mockAttempt.timeSpent,
            correctAnswers: mockAttempt.correctAnswers,
            totalQuestions: mockAttempt.totalQuestions,
            isPassed: mockAttempt.isPassed,
            mode: mockAttempt.mode
          }
        ]
      };
      
      const docRef = await addDoc(progressRef, newProgress);
      return docRef.id;
    } else {
      // Update existing progress record
      const progressDoc = snapshot.docs[0];
      const progressData = progressDoc.data();
      
      // Update best score if the new score is higher
      const bestScore = Math.max(progressData.bestScore || 0, mockAttempt.score);
      
      // Add to history array
      const updatedHistory = [
        ...progressData.history || [],
        {
          timestamp: serverTimestamp(),
          score: mockAttempt.score,
          timeSpent: mockAttempt.timeSpent,
          correctAnswers: mockAttempt.correctAnswers,
          totalQuestions: mockAttempt.totalQuestions,
          isPassed: mockAttempt.isPassed,
          mode: mockAttempt.mode
        }
      ];
      
      await updateDoc(progressDoc.ref, {
        attempts: (progressData.attempts || 0) + 1,
        lastAttemptAt: serverTimestamp(),
        bestScore,
        lastScore: mockAttempt.score,
        history: updatedHistory
      });
      
      return progressDoc.id;
    }
  } catch (error) {
    console.error('Error adding mock test result:', error);
    throw error;
  }
};