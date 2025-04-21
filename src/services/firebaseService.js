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

// Get featured exams for homepage
export const getFeaturedExams = async (featuredCount = 6) => {
  try {
    // First try to get exams marked as featured
    const featuredQuery = query(
      collection(db, 'exams'),
      where('featured', '==', true),
      limit(featuredCount)
    );
    
    const featuredSnapshot = await getDocs(featuredQuery);
    let featuredExams = featuredSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // If we don't have enough featured exams, get the most popular ones
    if (featuredExams.length < featuredCount) {
      const popularQuery = query(
        collection(db, 'exams'),
        orderBy('popularity', 'desc'),
        limit(featuredCount - featuredExams.length)
      );
      
      const popularSnapshot = await getDocs(popularQuery);
      const popularExams = popularSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        // Filter out any duplicates from the featured list
        .filter(exam => !featuredExams.some(featured => featured.id === exam.id));
      
      featuredExams = [...featuredExams, ...popularExams];
    }
    
    return featuredExams;
  } catch (error) {
    console.error('Error getting featured exams:', error);
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
// Updated getPracticeTestsByExamId function to handle subcollection structure
export const getPracticeTestsByExamId = async (examId) => {
  try {
    if (!examId) {
      console.log("No examId provided to getPracticeTestsByExamId");
      return [];
    }
    
    console.log(`Fetching practice tests for exam ${examId}`);
    
    // Try first with the subcollection structure
    const testsRef = collection(db, 'exams', examId, 'practiceTests');
    let snapshot = await getDocs(testsRef);
    
    // If no tests found in subcollection, try the standalone collection with examId filter
    if (snapshot.empty) {
      console.log(`No practice tests found in subcollection for exam ${examId}, trying standalone collection`);
      const practiceTestsRef = collection(db, 'practiceTests');
      const q = query(practiceTestsRef, where('examId', '==', examId));
      snapshot = await getDocs(q);
    }
    
    const tests = snapshot.docs.map(doc => ({
      id: doc.id,
      examId: examId, // Include the parent examId for reference
      ...doc.data()
    }));
    
    console.log(`Found ${tests.length} practice tests for exam ${examId}`);
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
    
    // Try first with the subcollection structure
    const testRef = doc(db, 'exams', examId, 'practiceTests', testId);
    let testDoc = await getDoc(testRef);
    
    // If not found in subcollection, try the standalone collection
    if (!testDoc.exists()) {
      console.log(`Practice test not found in subcollection, trying standalone collection`);
      const standaloneRef = doc(db, 'practiceTests', testId);
      testDoc = await getDoc(standaloneRef);
    }
    
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
    
    // Try first with the nested subcollection structure
    const questionsRef = collection(db, 'exams', examId, 'practiceTests', testId, 'questions');
    let q = query(questionsRef, orderBy('sequence', 'asc'));
    let snapshot = await getDocs(q);
    
    // If no questions found in subcollection, try standalone with filters
    if (snapshot.empty) {
      console.log(`No questions found in subcollection, trying standalone collection`);
      const standaloneRef = collection(db, 'questions');
      q = query(
        standaloneRef, 
        where('examId', '==', examId),
        where('testId', '==', testId),
        orderBy('sequence', 'asc')
      );
      snapshot = await getDocs(q);
    }
    
    const questions = snapshot.docs.map(doc => ({
      id: doc.id,
      examId, // Include parent examId for reference
      testId, // Include parent testId for reference
      ...doc.data()
    }));
    
    console.log(`Found ${questions.length} questions for test ${testId}`);
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
    console.log(`Getting progress data for user: ${userId}`);
    
    // Reference to the user's attempts subcollection
    const attemptsCollectionRef = collection(db, 'testAttempts', userId, 'attempts');
    const attemptsSnapshot = await getDocs(attemptsCollectionRef);
    
    if (attemptsSnapshot.empty) {
      console.log('No attempts found for user');
      return {};
    }
    
    console.log(`Found ${attemptsSnapshot.size} attempts for user`);
    
    // Initialize the progress data object
    const progressByExam = {};
    
    // Process each attempt document
    attemptsSnapshot.forEach(attemptDoc => {
      const attemptData = attemptDoc.data();
      console.log(`Processing attempt ${attemptDoc.id}:`, attemptData);
      
      // Skip if attempt was reset
      if (attemptData.reset) {
        return;
      }
      
      // Extract the relevant fields
      const examId = attemptData.examId;
      const testId = attemptData.testId;
      const score = attemptData.score || 0;
      
      if (!examId || !testId) {
        console.log(`Skipping attempt ${attemptDoc.id} - missing examId or testId`);
        return; // Skip this iteration if missing required fields
      }
      
      // Initialize the exam entry if it doesn't exist
      if (!progressByExam[examId]) {
        progressByExam[examId] = {};
      }
      
      // Initialize the test entry if it doesn't exist
      if (!progressByExam[examId][testId]) {
        progressByExam[examId][testId] = {
          attempts: 0,
          bestScore: 0,
          firstScore: null,
          lastScore: null
        };
      }
      
      // Update the progress data
      const testProgress = progressByExam[examId][testId];
      testProgress.attempts++;
      
      // Set first score if this is first recorded attempt
      if (testProgress.firstScore === null) {
        testProgress.firstScore = score;
      }
      
      // Update best score if this attempt is better
      if (score > testProgress.bestScore) {
        testProgress.bestScore = score;
      }
      
      // Always update the last score
      testProgress.lastScore = score;
    });
    
    console.log(`Final progress data for user ${userId}:`, progressByExam);
    return progressByExam;
  } catch (error) {
    console.error('Error getting user progress:', error);
    return {};
  }
};

// Specialized function to check if user owns a specific exam
export const checkUserOwnsExam = async (userId, examId) => {
  try {
    if (!userId || !examId) {
      console.log(`Missing required parameters in checkUserOwnsExam. userId: ${userId}, examId: ${examId}`);
      return false;
    }
    
    console.log(`Checking if user ${userId} owns exam ${examId}`);
    
    // Get all purchased exams for this user
    const purchases = await getUserPurchasedExams(userId);
    
    // Check if examId is in the purchased exams
    const owned = purchases.some(purchase => purchase.examId === examId);
    
    console.log(`User ${userId} ${owned ? 'owns' : 'does not own'} exam ${examId}`);
    return owned;
  } catch (error) {
    console.error(`Error checking if user owns exam:`, error);
    return false;
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
    
    // Try first with the dedicated purchasedExams collection
    const purchasesRef = collection(db, "purchasedExams", userId, "purchases");
    let snapshot;
    
    try {
      const q = query(
        purchasesRef,
        orderBy("purchaseDate", "desc")
      );
      snapshot = await getDocs(q);
    } catch (error) {
      console.log("Error fetching from purchasedExams collection:", error);
      
      // Try alternative collection if first approach fails
      const alternativeRef = collection(db, "users", userId, "purchases");
      const q = query(
        alternativeRef,
        orderBy("purchaseDate", "desc")
      );
      snapshot = await getDocs(q);
    }

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

// Get demo test for an exam (for non-owners)
export const getExamDemoTest = async (examId) => {
  try {
    if (!examId) {
      console.log("No examId provided to getExamDemoTest");
      return null;
    }
    
    console.log(`Fetching demo test for exam ${examId}`);
    
    // Check if there's a specific demo test marked in Firestore
    const testsRef = collection(db, 'exams', examId, 'practiceTests');
    const q = query(testsRef, where('isDemo', '==', true), limit(1));
    let snapshot = await getDocs(q);
    
    // If no specific demo test is marked, just get the first practice test
    if (snapshot.empty) {
      console.log("No specific demo test found, getting first test");
      const fallbackQuery = query(testsRef, limit(1));
      snapshot = await getDocs(fallbackQuery);
      
      // If still empty, try the standalone collection
      if (snapshot.empty) {
        console.log("No tests in subcollection, trying standalone collection");
        const practiceTestsRef = collection(db, 'practiceTests');
        const fallbackQuery = query(
          practiceTestsRef, 
          where('examId', '==', examId),
          limit(1)
        );
        snapshot = await getDocs(fallbackQuery);
      }
    }
    
    if (snapshot.empty) {
      console.log(`No demo test found for exam ${examId}`);
      return null;
    }
    
    const demoTestDoc = snapshot.docs[0];
    const demoTest = {
      id: demoTestDoc.id,
      examId,
      ...demoTestDoc.data(),
      isDemo: true // Mark as demo explicitly
    };
    
    console.log(`Found demo test for exam ${examId}:`, demoTest.id);
    return demoTest;
  } catch (error) {
    console.error(`Error getting demo test for exam ${examId}:`, error);
    return null;
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