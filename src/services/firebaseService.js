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

// Simplified getExamById function - uses direct document ID
export const getExamById = async (examId) => {
  try {
    // Check if examId is undefined, null, or empty string
    if (!examId) {
      console.log("No examId provided to getExamById");
      return null;
    }

    console.log(`Fetching exam with ID: ${examId}`);
    
    // Fetch the exam directly with the document ID
    const examRef = doc(db, 'exams', examId);
    const examDoc = await getDoc(examRef);
    
    if (examDoc.exists()) {
      return {
        id: examId,
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
// Simplified getPracticeTestsByExamId function - uses direct document ID
export const getPracticeTestsByExamId = async (examId) => {
  try {
    if (!examId) {
      console.log("No examId provided to getPracticeTestsByExamId");
      return [];
    }
    
    console.log(`Fetching practice tests for exam ${examId}`);
    
    // Fetch practice tests directly with the document ID
    const testsRef = collection(db, 'exams', examId, 'practiceTests');
    const snapshot = await getDocs(testsRef);
    
    const tests = snapshot.docs.map(doc => ({
      id: doc.id,
      examId: examId, // Include the parent examId for reference
      ...doc.data()
    }));
    
    console.log(`Found ${tests.length} practice tests`);
    return tests;
  } catch (error) {
    console.error(`Error getting practice tests for exam ${examId}:`, error);
    throw error;
  }
};

// Simplified getPracticeTestById function - uses direct document IDs
export const getPracticeTestById = async (examId, testId) => {
  try {
    if (!examId || !testId) {
      console.log(`Missing required parameters in getPracticeTestById. examId: ${examId}, testId: ${testId}`);
      return null;
    }
    
    console.log(`Fetching practice test with exam ID: ${examId}, test ID: ${testId}`);
    
    // Fetch the practice test directly with the document IDs
    const testRef = doc(db, 'exams', examId, 'practiceTests', testId);
    const testDoc = await getDoc(testRef);
    
    if (testDoc.exists()) {
      console.log(`Found practice test: ${testId}`);
      return {
        id: testDoc.id,
        examId, // Include parent examId for reference
        ...testDoc.data()
      };
    } else {
      console.log(`No practice test found with ID: ${testId} in exam ${examId}`);
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
// Simplified getQuestionsByTestId function - uses direct document IDs
export const getQuestionsByTestId = async (examId, testId) => {
  try {
    if (!examId || !testId) {
      console.log(`Missing required parameters in getQuestionsByTestId. examId: ${examId}, testId: ${testId}`);
      return [];
    }
    
    console.log(`Fetching questions for exam ${examId}, test ${testId}`);
    
    // Fetch questions directly with the document IDs
    const questionsRef = collection(db, 'exams', examId, 'practiceTests', testId, 'questions');
    
    // Order by question number or sequence
    const q = query(questionsRef, orderBy('sequence', 'asc'));
    const snapshot = await getDocs(q);
    
    const questions = snapshot.docs.map(doc => ({
      id: doc.id,
      examId, // Include parent examId for reference
      testId, // Include parent testId for reference
      ...doc.data()
    }));
    
    console.log(`Found ${questions.length} questions`);
    return questions;
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

// User Progress Tracking Methods
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
      
      // Organize by examId and testId for easier access
      const progressData = {};
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        
        // Extract examId and testId from the data - use direct document IDs
        const examId = data.examId || '';
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
        
        // Add first and last scores
        if (progressData[examId][testId].attempts === 1) {
          progressData[examId][testId].firstScore = attemptScore;
        }
        progressData[examId][testId].lastScore = attemptScore;
        
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
    if (!userId || !examId || !testId) {
      console.error("Missing required parameters for updateUserTestProgress");
      return null;
    }

    console.log(`Updating test progress for user ${userId}, exam ${examId}, test ${testId}`);
    
    // Create a new attempt in the testAttempts collection
    const attemptData = {
      userId,
      examId,
      testId,
      percentage: resultData.percentage,
      score: resultData.score,
      totalQuestions: resultData.totalQuestions,
      answeredQuestions: resultData.answeredQuestions,
      timeSpent: resultData.timeSpent,
      isPassed: resultData.isPassed,
      mode: resultData.mode,
      testName: resultData.testName,
      timestamp: serverTimestamp()
    };
    
    // Add to testAttempts collection
    const attemptRef = collection(db, 'testAttempts', userId, 'attempts');
    const docRef = await addDoc(attemptRef, attemptData);
    
    console.log(`Created test attempt with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error('Error updating test progress:', error);
    throw error;
  }
};

export const resetAllUserProgress = async (userId) => {
  try {
    if (!userId) {
      console.error("No userId provided for resetAllUserProgress");
      return false;
    }

    console.log(`Resetting progress for user ${userId}`);
    
    // Get all attempts for this user
    const attemptsRef = collection(db, 'testAttempts', userId, 'attempts');
    const snapshot = await getDocs(attemptsRef);
    
    if (snapshot.empty) {
      console.log(`No attempts found to reset for user ${userId}`);
      return true;
    }
    
    // Add a reset marker instead of deleting
    const batchSize = snapshot.size;
    console.log(`Resetting ${batchSize} attempts for user ${userId}`);
    
    const resetPromises = snapshot.docs.map(doc => 
      updateDoc(doc.ref, { 
        reset: true,
        resetAt: serverTimestamp()
      })
    );
    
    await Promise.all(resetPromises);
    return true;
  } catch (error) {
    console.error('Error resetting user progress:', error);
    throw error;
  }
};

/**
 * Get a user's purchased exams
 * @param {string} userId - The ID of the user
 * @returns {Promise<Array>} - Array of purchased exam objects
 */
export const getUserPurchasedExams = async (userId) => {
  try {
    // Skip if no user ID provided
    if (!userId) {
      console.log("No userId provided to getUserPurchasedExams");
      return [];
    }
    
    console.log(`Fetching purchased exams for user ${userId}`);
    
    // Access the user purchases collection
    const purchasesRef = collection(db, "purchasedExams", userId, "purchases");
   
    const q = query(
      purchasesRef,
      orderBy("purchaseDate", "desc")
    );
    
    const snapshot = await getDocs(q);

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
 * Gets test attempts for a user from the test attempts collection
 * Path: /testAttempts/{userId}/attempts/{attemptId}
 * @param {string} userId - The user ID
 * @returns {Promise<Array>} - Array of test attempts
 */
export const getUserTestAttempts = async (userId) => {
  try {
    if (!userId) {
      console.log("No userId provided to getUserTestAttempts");
      return [];
    }

    console.log(`Fetching test attempts for user ${userId}`);
    
    // Reference to the user's attempts collection
    const attemptsRef = collection(db, 'testAttempts', userId, 'attempts');
    
    // Get all documents from the collection
    const querySnapshot = await getDocs(attemptsRef);
    
    if (querySnapshot.empty) {
      console.log(`No test attempts found for user ${userId}`);
      return [];
    }
    
    // Convert the documents to an array of objects
    const attempts = [];
    querySnapshot.forEach(doc => {
      const data = doc.data();
      // Skip reset attempts if they have reset flag
      if (data.reset) {
        return;
      }
      
      // Add the document ID to the data
      attempts.push({
        id: doc.id,
        ...data
      });
    });
    
    console.log(`Processed ${attempts.length} valid test attempts`);
    return attempts;
  } catch (error) {
    console.error("Error getting user test attempts:", error);
    return [];
  }
};