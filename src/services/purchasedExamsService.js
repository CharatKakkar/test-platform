// services/purchasedExamsService.js
import { db, auth } from '../firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  arrayUnion,
  arrayRemove,
  serverTimestamp 
} from 'firebase/firestore';

// Get all purchased exams for the current user
export const getPurchasedExams = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error("No authenticated user found");
      return [];
    }
    
    // Reference to the user's purchased exams document
    const purchasedExamsRef = doc(db, "purchasedExams", user.uid);
    const purchasedExamsDoc = await getDoc(purchasedExamsRef);
    
    if (purchasedExamsDoc.exists()) {
      const data = purchasedExamsDoc.data();
      return data.exams || [];
    } else {
      // Initialize empty document if it doesn't exist
      await setDoc(purchasedExamsRef, { 
        exams: [],
        updatedAt: serverTimestamp() 
      });
      return [];
    }
  } catch (error) {
    console.error("Error getting purchased exams:", error);
    return [];
  }
};

// Add an exam to the user's purchased exams
export const addPurchasedExam = async (examData) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error("No authenticated user found");
      return false;
    }
    
    // Store minimal exam data to avoid duplication
    const examToStore = {
      id: examData.id,
      title: examData.title,
      category: examData.category,
      purchaseDate: new Date().toISOString(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year from now
    };
    
    // Reference to the user's purchased exams document
    const purchasedExamsRef = doc(db, "purchasedExams", user.uid);
    
    // Check if document exists
    const purchasedExamsDoc = await getDoc(purchasedExamsRef);
    
    if (purchasedExamsDoc.exists()) {
      // Update existing document
      await updateDoc(purchasedExamsRef, {
        exams: arrayUnion(examToStore),
        updatedAt: serverTimestamp()
      });
    } else {
      // Create new document
      await setDoc(purchasedExamsRef, {
        exams: [examToStore],
        updatedAt: serverTimestamp()
      });
    }
    
    return true;
  } catch (error) {
    console.error("Error adding purchased exam:", error);
    return false;
  }
};

// Check if an exam has been purchased
export const isExamPurchased = async (examId) => {
  try {
    const purchasedExams = await getPurchasedExams();
    return purchasedExams.some(exam => exam.id === examId);
  } catch (error) {
    console.error("Error checking if exam is purchased:", error);
    return false;
  }
};

// Process checkout for multiple exams
export const processPurchase = async (cartItems) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error("No authenticated user found");
      return false;
    }
    
    // Add each cart item to purchased exams
    for (const item of cartItems) {
      await addPurchasedExam(item);
    }
    
    return true;
  } catch (error) {
    console.error("Error processing purchase:", error);
    return false;
  }
};

// Remove an exam from purchased exams (for admin or refund purposes)
export const removePurchasedExam = async (examId) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error("No authenticated user found");
      return false;
    }
    
    // Get all purchased exams
    const purchasedExams = await getPurchasedExams();
    
    // Find the exam to remove
    const examToRemove = purchasedExams.find(exam => exam.id === examId);
    
    if (!examToRemove) {
      console.error("Exam not found in purchased exams");
      return false;
    }
    
    // Reference to the user's purchased exams document
    const purchasedExamsRef = doc(db, "purchasedExams", user.uid);
    
    // Remove the exam
    await updateDoc(purchasedExamsRef, {
      exams: arrayRemove(examToRemove),
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error("Error removing purchased exam:", error);
    return false;
  }
};
// Add this at the end of your purchasedExamsService.js file
const purchasedExamsService = {
  getPurchasedExams,
  addPurchasedExam,
  isExamPurchased,
  processPurchase,
  removePurchasedExam
};

export default purchasedExamsService;