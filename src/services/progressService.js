// services/progressService.js
import { getFirestore, doc, setDoc, collection, getDocs, query, where, orderBy, limit, deleteDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Update test progress in Firestore
// Updated updateTestProgress function with correct Firestore path
export const updateTestProgress = async (examId, testId, resultData) => {
  try {
    const auth = getAuth();
    const userId = auth.currentUser?.uid;
    
    // First try to save to local storage regardless of authentication state
    try {
      // Save to localStorage as a fallback
      const attemptId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const attemptData = {
        id: attemptId,
        examId,
        testId,
        createdAt: new Date(),
        testName: resultData.testName || `Test ${testId}`,
        score: resultData.percentage,
        correctAnswers: resultData.score,
        totalQuestions: resultData.totalQuestions,
        isPassed: resultData.isPassed,
        timeSpent: resultData.timeSpent,
        mode: resultData.mode
      };
      
      // Get existing attempts from localStorage or initialize empty array
      const existingAttempts = JSON.parse(localStorage.getItem('testAttempts') || '[]');
      
      // Add new attempt and save back to localStorage
      existingAttempts.push(attemptData);
      localStorage.setItem('testAttempts', JSON.stringify(existingAttempts));
      
      console.log('Test progress saved to localStorage as fallback');
    } catch (localStorageError) {
      console.error('Error saving to localStorage:', localStorageError);
    }
    
    // If user is not authenticated, don't attempt Firebase save
    if (!userId) {
      console.log('No user is signed in. Using localStorage only.');
      return 'local-storage-only';
    }
    
    // If user is authenticated, attempt to save to Firebase
    console.log(`Attempting to save progress for user: ${userId}`);
    
    const db = getFirestore();
    const timestamp = new Date();
    const attemptId = `${timestamp.getTime()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Use the correct path according to your security rules: testAttempts/{userId}/attempts/{attemptId}
    try {
      await setDoc(doc(db, 'testAttempts', userId, 'attempts', attemptId), {
        examId,
        testId,
        createdAt: timestamp,
        testName: resultData.testName || `Test ${testId}`,
        score: resultData.percentage,
        correctAnswers: resultData.score,
        totalQuestions: resultData.totalQuestions,
        isPassed: resultData.isPassed,
        timeSpent: resultData.timeSpent,
        mode: resultData.mode,
        userId: userId // Including userId in the document for security rules
      });
      
      console.log('Test progress successfully saved to Firebase');
      return attemptId;
    } catch (writeError) {
      console.error('Firebase write error:', writeError);
      console.log('Using localStorage fallback instead');
      return 'local-storage-fallback';
    }
  } catch (error) {
    console.error('Error in updateTestProgress:', error);
    return null;
  }
};

// Get user's attempt history
// Updated getAttemptHistory with correct Firestore path
export const getAttemptHistory = async (limitCount = 50) => {
  try {
    const auth = getAuth();
    const userId = auth.currentUser?.uid;
    let firebaseAttempts = [];
    
    // Try to get attempts from Firebase if user is logged in
    if (userId) {
      try {
        const db = getFirestore();
        // Use the correct path: testAttempts/{userId}/attempts
        const attemptsRef = collection(db, 'testAttempts', userId, 'attempts');
        const q = query(attemptsRef, orderBy('createdAt', 'desc'), limit(limitCount));
        
        const querySnapshot = await getDocs(q);
        
        querySnapshot.forEach(doc => {
          const data = doc.data();
          firebaseAttempts.push({
            id: doc.id,
            examId: data.examId,
            testId: data.testId,
            testName: data.testName,
            score: data.score,
            correctAnswers: data.correctAnswers || 0, // Handle older data format
            totalQuestions: data.totalQuestions || 0,
            isPassed: data.isPassed || (data.score >= 70), // Fallback calculation
            timeSpent: data.timeSpent || 0,
            mode: data.mode || 'exam',
            createdAt: data.createdAt
          });
        });
        
        console.log(`Retrieved ${firebaseAttempts.length} attempts from Firebase`);
      } catch (fbError) {
        console.error('Error retrieving from Firebase:', fbError);
        console.log('Using localStorage fallback');
      }
    } else {
      console.log('User not authenticated. Using localStorage only.');
    }
    
    // Get attempts from localStorage
    let localAttempts = [];
    try {
      const storedAttempts = JSON.parse(localStorage.getItem('testAttempts') || '[]');
      localAttempts = storedAttempts.map(attempt => ({
        ...attempt,
        source: 'localStorage'
      }));
      console.log(`Retrieved ${localAttempts.length} attempts from localStorage`);
    } catch (lsError) {
      console.error('Error retrieving from localStorage:', lsError);
    }
    
    // Combine both sources, remove duplicates (prefer Firebase versions)
    // This uses testId and timestamp to identify potential duplicates
    const allAttempts = [...firebaseAttempts];
    
    // Only add local attempts that don't seem to be duplicates of Firebase data
    localAttempts.forEach(localAttempt => {
      const isDuplicate = firebaseAttempts.some(fbAttempt => 
        fbAttempt.testId === localAttempt.testId && 
        Math.abs(new Date(fbAttempt.createdAt).getTime() - new Date(localAttempt.createdAt).getTime()) < 60000
      );
      
      if (!isDuplicate) {
        allAttempts.push(localAttempt);
      }
    });
    
    // Sort by date, newest first
    allAttempts.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      return dateB - dateA;
    });
    
    // Apply limit
    return allAttempts.slice(0, limitCount);
  } catch (error) {
    console.error('Error getting attempt history:', error);
    return [];
  }
};
// Get exam progress - filter attempts by examId
export const getExamProgress = async (examId) => {
  try {
    // First get all attempts (this already has localStorage fallback)
    const allAttempts = await getAttemptHistory(100); // Get more attempts to ensure we have all for this exam
    
    // Filter attempts by the requested examId
    const examAttempts = allAttempts.filter(attempt => attempt.examId === examId);
    
    // Map of testId to best score
    const bestScores = new Map();
    
    examAttempts.forEach(attempt => {
      // Track best score for each test
      if (!bestScores.has(attempt.testId) || attempt.score > bestScores.get(attempt.testId)) {
        bestScores.set(attempt.testId, attempt.score);
      }
    });
    
    // Calculate performance metrics
    const testsPassed = Array.from(bestScores.values()).filter(score => score >= 70).length;
    let averageScore = 0;
    
    if (bestScores.size > 0) {
      const totalScore = Array.from(bestScores.values()).reduce((sum, score) => sum + score, 0);
      averageScore = Math.round(totalScore / bestScores.size);
    }
    
    return {
      attempts: examAttempts,
      testsPassed,
      averageScore,
      totalTests: bestScores.size
    };
  } catch (error) {
    console.error('Error getting exam progress:', error);
    return { attempts: [], testsPassed: 0, averageScore: 0, totalTests: 0 };
  }
};

// Reset all progress
// Updated resetAllProgress with correct Firestore path
export const resetAllProgress = async () => {
  try {
    // Clear localStorage attempts
    localStorage.removeItem('testAttempts');
    console.log('Cleared localStorage test attempts');
    
    // Try to clear Firebase attempts if user is logged in
    const auth = getAuth();
    const userId = auth.currentUser?.uid;
    
    if (userId) {
      try {
        const db = getFirestore();
        // Use the correct path: testAttempts/{userId}/attempts
        const attemptsRef = collection(db, 'testAttempts', userId, 'attempts');
        const querySnapshot = await getDocs(attemptsRef);
        
        // Delete each attempt document
        const deletePromises = [];
        querySnapshot.forEach(document => {
          deletePromises.push(deleteDoc(doc(db, 'testAttempts', userId, 'attempts', document.id)));
        });
        
        // Wait for all deletions to complete
        await Promise.all(deletePromises);
        
        console.log(`Successfully deleted ${querySnapshot.size} attempts from Firebase`);
      } catch (fbError) {
        console.error('Error clearing Firebase attempts:', fbError);
        console.log('localStorage was still cleared');
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error resetting progress:', error);
    return false;
  }
};