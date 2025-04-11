import { db, auth } from '../firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  getDocs
} from 'firebase/firestore';

// Get the current user's progress data for a specific exam
export const getExamProgress = async (examId) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error("No authenticated user found");
      return {};
    }
    
    // Reference to the user's progress document
    const progressDocRef = doc(db, "userProgress", user.uid);
    const progressDoc = await getDoc(progressDocRef);
    
    if (progressDoc.exists()) {
      const data = progressDoc.data();
      return data.exams?.[examId] || {};
    } else {
      // Initialize empty document if it doesn't exist
      await setDoc(progressDocRef, { 
        exams: {},
        updatedAt: serverTimestamp() 
      });
      return {};
    }
  } catch (error) {
    console.error("Error getting exam progress:", error);
    return {};
  }
};

// Get all exams progress for the current user
export const getAllUserProgress = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error("No authenticated user found");
      return {};
    }
    
    const progressDocRef = doc(db, "userProgress", user.uid);
    const progressDoc = await getDoc(progressDocRef);
    
    if (progressDoc.exists()) {
      const data = progressDoc.data();
      return data.exams || {};
    } else {
      await setDoc(progressDocRef, { 
        exams: {},
        updatedAt: serverTimestamp() 
      });
      return {};
    }
  } catch (error) {
    console.error("Error getting all progress:", error);
    return {};
  }
};

// Update progress for a specific test
export const updateTestProgress = async (examId, testId, resultData) => {

  try {
    const user = auth.currentUser;
    if (!user) {
      console.error("No authenticated user found");
      return false;
    }
    
    // Reference to the user's progress document
    const progressDocRef = doc(db, "userProgress", user.uid);
    
    // Get current progress data
    const progressDoc = await getDoc(progressDocRef);
    let progressData = { exams: {} };
    
    if (progressDoc.exists()) {
      progressData = progressDoc.data();
    }
    
    // Initialize exam data if it doesn't exist
    if (!progressData.exams) {
      progressData.exams = {};
    }
    
    if (!progressData.exams[examId]) {
      progressData.exams[examId] = {};
    }
    
    // Initialize test data if it doesn't exist
    if (!progressData.exams[examId][testId]) {
      progressData.exams[examId][testId] = {
        attempts: 0,
        firstScore: null,
        bestScore: 0,
        lastScore: 0,
        lastAttemptDate: null,
        passingScore: resultData.passingScore
      };
    }
    
    // Update test progress
    const testProgress = progressData.exams[examId][testId];
    testProgress.attempts += 1;
    testProgress.lastScore = resultData.percentage;
    testProgress.lastAttemptDate = new Date().toISOString();
    
    // Set first score if this is the first attempt
    if (testProgress.firstScore === null) {
      testProgress.firstScore = resultData.percentage;
    }
    
    // Update best score if this attempt is better
    if (resultData.percentage > testProgress.bestScore) {
      testProgress.bestScore = resultData.percentage;
    }
    
    // Update progress document
    await updateDoc(progressDocRef, {
      [`exams.${examId}.${testId}`]: testProgress,
      updatedAt: serverTimestamp()
    });
    
    // Add to attempt history collection
    await addAttemptToHistory(examId, testId, resultData);
    
    return true;
  } catch (error) {
    console.error("Error updating test progress:", error);
    return false;
  }
};

// Add attempt to history collection
export const addAttemptToHistory = async (examId, testId, resultData) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error("No authenticated user found");
        return false;
      }
      
      // Add to attempts collection
      await addDoc(collection(db, "testAttempts"), {
        userId: user.uid,
        examId: examId,
        testId: testId,
        score: resultData.percentage,
        correctAnswers: resultData.score,
        totalQuestions: resultData.totalQuestions,
        isPassed: resultData.isPassed,
        timeSpent: resultData.timeSpent || null,
        mode: resultData.mode,  // <-- Here's the mode field
        createdAt: serverTimestamp()
      });
      
      return true;
    } catch (error) {
      console.error("Error adding attempt to history:", error);
      return false;
    }
  };

// Get user's attempt history for a specific exam
export const getAttemptHistory = async (examId = null) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error("No authenticated user found");
      return [];
    }
    
    // Create query based on whether examId is provided
    let q;
    if (examId) {
      q = query(
        collection(db, "testAttempts"),
        where("userId", "==", user.uid),
        where("examId", "==", examId),
        orderBy("createdAt", "desc")
      );
    } else {
      q = query(
        collection(db, "testAttempts"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
    }
    
    const querySnapshot = await getDocs(q);
    const attempts = [];
    
    querySnapshot.forEach((doc) => {
      attempts.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return attempts;
  } catch (error) {
    console.error("Error getting attempt history:", error);
    return [];
  }
};

// Reset all progress data (for debugging purposes)
export const resetAllProgress = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error("No authenticated user found");
      return false;
    }
    
    // Reset the progress document
    await setDoc(doc(db, "userProgress", user.uid), {
      exams: {},
      updatedAt: serverTimestamp()
    });
    
    // Note: We're not deleting attempt history for data integrity
    // In a real app you might want to add a "deleted" flag instead
    
    return true;
  } catch (error) {
    console.error("Error resetting progress:", error);
    return false;
  }
};