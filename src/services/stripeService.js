// services/stripeService.js
import { db, auth } from '../firebase';
import { doc, collection, addDoc, getDoc, getDocs, query, where, updateDoc } from 'firebase/firestore';

/**
 * Creates a Stripe checkout session
 * @param {Array} items - Cart items to purchase
 * @param {Object} customerInfo - Customer information
 * @param {number} discount - Discount amount (if any)
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} - Checkout session details
 */
export const createCheckoutSession = async (items, customerInfo, discount = 0, metadata = {}) => {
  try {
    // Prepare the request body
    const requestBody = {
      items: items.map(item => ({
        id: item.id,
        name: item.title,
        description: item.description || 'Exam preparation material',
        amount: Math.round(item.price * 100), // Stripe requires amount in cents
        quantity: item.quantity || 1
      })),
      customerEmail: customerInfo.email,
      customerName: `${customerInfo.firstName} ${customerInfo.lastName}`,
      discount: Math.round(discount * 100), // Convert to cents
      metadata: {
        userId: auth.currentUser?.uid || 'guest',
        ...metadata
      }
    };

    // Make API request to backend
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create checkout session');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

/**
 * Verifies a checkout session
 * @param {string} sessionId - The Stripe session ID
 * @returns {Promise<Object>} - Session verification result
 */
export const verifyCheckoutSession = async (sessionId) => {
  try {
    // Make API request to backend
    const response = await fetch(`/api/verify-session?session_id=${sessionId}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to verify session');
    }

    return await response.json();
  } catch (error) {
    console.error('Error verifying checkout session:', error);
    throw error;
  }
};

/**
 * Gets purchased exams for the current user
 * @returns {Promise<Array>} - Array of purchased exams
 */
export const getPurchasedExams = async () => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');

    const purchasedRef = collection(db, 'users', userId, 'purchased_exams');
    const querySnapshot = await getDocs(purchasedRef);
    
    const purchasedExams = [];
    querySnapshot.forEach(doc => {
      purchasedExams.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return purchasedExams;
  } catch (error) {
    console.error('Error getting purchased exams:', error);
    throw error;
  }
};

/**
 * Gets a specific purchased exam
 * @param {string} examId - The exam ID
 * @returns {Promise<Object>} - The purchased exam details
 */
export const getPurchasedExam = async (examId) => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');

    const purchasedRef = collection(db, 'users', userId, 'purchased_exams');
    const q = query(purchasedRef, where('examId', '==', examId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    };
  } catch (error) {
    console.error('Error getting purchased exam:', error);
    throw error;
  }
};

/**
 * Checks if the user has access to a specific exam
 * @param {string} examId - The exam ID
 * @returns {Promise<boolean>} - True if the user has access, false otherwise
 */
export const hasAccessToExam = async (examId) => {
  try {
    const exam = await getPurchasedExam(examId);
    if (!exam) return false;
    
    // Check if exam is active and not expired
    const now = new Date();
    const expiryDate = exam.expiresAt?.toDate() || new Date(0);
    
    return exam.status === 'active' && now < expiryDate;
  } catch (error) {
    console.error('Error checking exam access:', error);
    return false;
  }
};

/**
 * Records a purchase in the local database
 * (This is typically handled by the backend via webhooks, but can be useful for immediate feedback)
 * @param {Object} purchaseData - The purchase data
 * @returns {Promise<void>}
 */
export const recordPurchase = async (purchaseData) => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');
    
    const purchaseRef = collection(db, 'users', userId, 'purchases');
    await addDoc(purchaseRef, {
      ...purchaseData,
      createdAt: new Date()
    });
  } catch (error) {
    console.error('Error recording purchase:', error);
    throw error;
  }
};

/**
 * Gets all payments for the current user
 * @returns {Promise<Array>} - Array of payments
 */
export const getPayments = async () => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');
    
    const paymentsRef = collection(db, 'users', userId, 'payments');
    const querySnapshot = await getDocs(paymentsRef);
    
    const payments = [];
    querySnapshot.forEach(doc => {
      payments.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return payments;
  } catch (error) {
    console.error('Error getting payments:', error);
    throw error;
  }
};

/**
 * Checks if a payment was successful by payment intent ID
 * @param {string} paymentIntentId - The payment intent ID
 * @returns {Promise<boolean>} - True if payment was successful
 */
export const isPaymentSuccessful = async (paymentIntentId) => {
  try {
    // Make API request to backend
    const response = await fetch(`/api/check-payment-status?payment_intent_id=${paymentIntentId}`);
    
    if (!response.ok) {
      return false;
    }
    
    const data = await response.json();
    return data.status === 'succeeded';
  } catch (error) {
    console.error('Error checking payment status:', error);
    return false;
  }
};

/**
 * Gets the checkout session details from Stripe
 * @param {string} sessionId - The checkout session ID
 * @returns {Promise<Object>} - Session details
 */
export const getCheckoutSession = async (sessionId) => {
  try {
    const response = await fetch(`/api/get-session?session_id=${sessionId}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get session');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting checkout session:', error);
    throw error;
  }
};

// Export default object with all functions
export default {
  createCheckoutSession,
  verifyCheckoutSession,
  getPurchasedExams,
  getPurchasedExam,
  hasAccessToExam,
  recordPurchase,
  getPayments,
  isPaymentSuccessful,
  getCheckoutSession
};