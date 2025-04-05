// src/services/examService.js
import { db, auth } from '../firebase';
import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  addDoc, 
  query, 
  where,
  serverTimestamp 
} from 'firebase/firestore';

// Get all available exams
export const getAllExams = async () => {
  try {
    const examsSnapshot = await getDocs(collection(db, "exams"));
    const exams = [];
    
    examsSnapshot.forEach((doc) => {
      exams.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return exams;
  } catch (error) {
    console.error("Error getting exams:", error);
    throw error;
  }
};

// Get a specific exam by ID
export const getExamById = async (examId) => {
  try {
    const examDoc = await getDoc(doc(db, "exams", examId));
    
    if (examDoc.exists()) {
      return {
        id: examDoc.id,
        ...examDoc.data()
      };
    } else {
      throw new Error("Exam not found");
    }
  } catch (error) {
    console.error("Error getting exam:", error);
    throw error;
  }
};

// Get exam questions
export const getExamQuestions = async (examId) => {
  try {
    const questionsSnapshot = await getDocs(
      query(collection(db, "questions"), where("examId", "==", examId))
    );
    
    const questions = [];
    questionsSnapshot.forEach((doc) => {
      questions.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return questions;
  } catch (error) {
    console.error("Error getting exam questions:", error);
    throw error;
  }
};

// Save exam attempt
export const saveExamAttempt = async (examId, score, answers) => {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      // For demo exams, save to localStorage if user not logged in
      const attempts = JSON.parse(localStorage.getItem('examAttempts') || '[]');
      const newAttempt = {
        id: Date.now().toString(),
        examId,
        score,
        answers,
        date: new Date().toISOString()
      };
      
      attempts.push(newAttempt);
      localStorage.setItem('examAttempts', JSON.stringify(attempts));
      return newAttempt;
    }
    
    // Save to Firestore
    const attemptData = {
      userId: user.uid,
      examId,
      score,
      answers,
      date: serverTimestamp()
    };
    
    const attemptRef = await addDoc(collection(db, "examAttempts"), attemptData);
    
    return {
      id: attemptRef.id,
      ...attemptData
    };
  } catch (error) {
    console.error("Error saving exam attempt:", error);
    throw error;
  }
};

// Get user's exam history
export const getUserExamHistory = async () => {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      // Return localStorage data for non-authenticated users
      const attempts = JSON.parse(localStorage.getItem('examAttempts') || '[]');
      return attempts;
    }
    
    // Get from Firestore
    const attemptsSnapshot = await getDocs(
      query(collection(db, "examAttempts"), where("userId", "==", user.uid))
    );
    
    const attempts = [];
    attemptsSnapshot.forEach((doc) => {
      attempts.push({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore Timestamp to ISO string for consistent format
        date: doc.data().date?.toDate().toISOString() || new Date().toISOString()
      });
    });
    
    // Sort by date (newest first)
    return attempts.sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (error) {
    console.error("Error getting exam history:", error);
    throw error;
  }
};