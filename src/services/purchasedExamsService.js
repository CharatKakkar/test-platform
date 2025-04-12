// services/purchasedExamsService.js
import { db, auth } from '../firebase';
import { 
  collection,
  doc, 
  getDoc, 
  getDocs,
  setDoc, 
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
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
    
    // Reference to the user's purchased exams subcollection
    const purchasesRef = collection(db, "purchasedExams", user.uid, "purchases");
    
    // Query to get all purchases, ordered by purchase date (newest first)
    const q = query(
      purchasesRef,
      orderBy("purchaseDate", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    const purchases = [];
    
    querySnapshot.forEach((doc) => {
      purchases.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return purchases;
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
    
    // Store exam data
    const examToStore = {
      examId: examData.id,
      title: examData.title,
      category: examData.category,
      price: examData.price || 9.99,
      purchaseDate: new Date().toISOString(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
      createdAt: serverTimestamp(),
      userId: user.uid
    };
    
    // Reference to the user's purchases subcollection
    const purchasesRef = collection(db, "purchasedExams", user.uid, "purchases");
    
    // Add the exam as a new document in the subcollection
    await addDoc(purchasesRef, examToStore);
    
    return true;
  } catch (error) {
    console.error("Error adding purchased exam:", error);
    return false;
  }
};

// Check if an exam has been purchased
export const isExamPurchased = async (examId) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error("No authenticated user found");
      return false;
    }
    
    // Reference to the user's purchases subcollection
    const purchasesRef = collection(db, "purchasedExams", user.uid, "purchases");
    
    // Query to find the specific exam by examId
    const q = query(
      purchasesRef,
      where("examId", "==", examId),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error("Error checking if exam is purchased:", error);
    return false;
  }
};

// Calculate the total spent on purchases
export const calculateTotalSpent = async () => {
  try {
    const purchases = await getPurchasedExams();
    return purchases.reduce((total, purchase) => total + (purchase.price || 9.99), 0);
  } catch (error) {
    console.error("Error calculating total spent:", error);
    return 0;
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

// Get purchase history organized by date
export const getPurchaseHistory = async () => {
  try {
    const purchases = await getPurchasedExams();
    
    // Group by purchase date
    const grouped = {};
    
    purchases.forEach(purchase => {
      // Get just the date part for grouping
      const purchaseDate = purchase.purchaseDate.split('T')[0];
      
      if (!grouped[purchaseDate]) {
        grouped[purchaseDate] = {
          date: new Date(purchase.purchaseDate),
          items: [],
          total: 0
        };
      }
      
      grouped[purchaseDate].items.push(purchase);
      grouped[purchaseDate].total += purchase.price || 9.99;
    });
    
    // Convert to array and sort (newest first)
    return Object.entries(grouped).map(([date, order]) => ({
      id: date,
      date: order.date,
      items: order.items,
      total: order.total
    })).sort((a, b) => b.date - a.date);
  } catch (error) {
    console.error("Error getting purchase history:", error);
    return [];
  }
};

// Remove a purchased exam (for admin or refund purposes)
export const removePurchasedExam = async (purchaseId) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error("No authenticated user found");
      return false;
    }
    
    // Reference to the specific purchase document
    const purchaseRef = doc(db, "purchasedExams", user.uid, "items", purchaseId);
    
    // Delete the document
    await deleteDoc(purchaseRef);
    
    return true;
  } catch (error) {
    console.error("Error removing purchased exam:", error);
    return false;
  }
};

// Get purchases for a specific exam
export const getPurchasesByExamId = async (examId) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error("No authenticated user found");
      return [];
    }
    
    // Reference to the user's purchases subcollection
    const purchasesRef = collection(db, "purchasedExams", user.uid, "items");
    
    // Query to find purchases for the specific exam
    const q = query(
      purchasesRef,
      where("examId", "==", examId)
    );
    
    const querySnapshot = await getDocs(q);
    const purchases = [];
    
    querySnapshot.forEach((doc) => {
      purchases.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return purchases;
  } catch (error) {
    console.error("Error getting purchases by exam ID:", error);
    return [];
  }
};

// Update purchase information
export const updatePurchase = async (purchaseId, updateData) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error("No authenticated user found");
      return false;
    }
    
    // Reference to the specific purchase document
    const purchaseRef = doc(db, "purchasedExams", user.uid, "purchases", purchaseId);
    
    // Update the document
    await updateDoc(purchaseRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error("Error updating purchase:", error);
    return false;
  }
};

// Generate a receipt for a specific purchase date
export const generateReceipt = async (purchaseDate) => {
  try {
    const history = await getPurchaseHistory();
    return history.find(order => order.id === purchaseDate) || null;
  } catch (error) {
    console.error("Error generating receipt:", error);
    return null;
  }
};

// Migration function to move from old structure to new structure
export const migrateFromOldStructure = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error("No authenticated user found");
      return false;
    }
    
    // Reference to the old document
    const oldDocRef = doc(db, "purchasedExams", user.uid);
    const oldDocSnap = await getDoc(oldDocRef);
    
    if (!oldDocSnap.exists()) {
      console.log("No old data to migrate");
      return true;
    }
    
    const oldData = oldDocSnap.data();
    
    if (!oldData.exams || !Array.isArray(oldData.exams) || oldData.exams.length === 0) {
      console.log("No exams to migrate");
      return true;
    }
    
    // Reference to the user's purchases subcollection
    const purchasesRef = collection(db, "purchasedExams", user.uid, "items");
    
    // Migrate each exam to the new structure
    for (const exam of oldData.exams) {
      const examToStore = {
        examId: exam.id,
        title: exam.title,
        category: exam.category,
        price: exam.price || 9.99,
        purchaseDate: exam.purchaseDate,
        expiryDate: exam.expiryDate,
        createdAt: serverTimestamp(),
        userId: user.uid,
        migratedFromOldStructure: true
      };
      
      await addDoc(purchasesRef, examToStore);
    }
    
    console.log(`Successfully migrated ${oldData.exams.length} exams to new structure`);
    
    // Optionally, rename the old document to keep it as backup
    // await updateDoc(oldDocRef, { migrated: true, migratedAt: serverTimestamp() });
    
    return true;
  } catch (error) {
    console.error("Error migrating from old structure:", error);
    return false;
  }
};

const purchasedExamsService = {
  getPurchasedExams,
  addPurchasedExam,
  isExamPurchased,
  processPurchase,
  removePurchasedExam,
  calculateTotalSpent,
  getPurchaseHistory,
  generateReceipt,
  getPurchasesByExamId,
  updatePurchase,
  migrateFromOldStructure
};

export default purchasedExamsService;