// services/stripeService.js
import { db, auth, app } from '../firebase';
import { 
  doc, 
  collection, 
  addDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc,
  onSnapshot,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import purchasedExamsService from './purchasedExamsService';

/**
 * Creates a Stripe checkout session using the Firebase Extension approach
 * @param {Array} items - Cart items to purchase
 * @param {Object} customerInfo - Customer information
 * @param {number} discount - Discount amount (if any)
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<{url: string, sessionId: string}>} - Checkout session URL and ID
 */
export const createCheckoutSession = async (items, customerInfo, discount = 0, metadata = {}) => {
  try {
    const userId = auth.currentUser?.uid;
    
    if (!userId) {
      throw new Error("User is not authenticated");
    }

    // Create a document in the checkout_sessions subcollection
    const checkoutSessionRef = collection(
      db,
      "users",
      userId,
      "checkout_sessions"
    );
    
    // Create the checkout session document with required fields
    const docRef = await addDoc(checkoutSessionRef, {
      line_items: items.map(item => ({
        price: item.stripePrice,
        quantity: item.quantity || 1
      })),
      mode: 'payment', // or 'subscription' for recurring payments
      success_url: `${window.location.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${window.location.origin}/payment/failed`,
      metadata: {
        ...metadata,
        userId,
        customerEmail: customerInfo.email,
        customerName: `${customerInfo.firstName} ${customerInfo.lastName}`,
        couponApplied: discount > 0 ? 'true' : 'false',
        discountAmount: discount.toString(),
        itemsJson: JSON.stringify(items.map(item => ({
          id: item.id,
          name: item.title,
          price: item.price, // Regular price for display
          stripePrice: item.stripePrice, // Stripe price ID
          quantity: item.quantity || 1,
          finalPrice: item.price * (item.quantity || 1) // Calculate final price for display
        })))
      }
    });

    // Wait for the extension to populate the document with a URL
    return new Promise((resolve, reject) => {
      const unsubscribe = onSnapshot(docRef, (snap) => {
        const data = snap.data();
        const { error, url, sessionId } = data || {};
        
        if (error) {
          unsubscribe();
          reject(new Error(`An error occurred: ${error.message || error}`));
        }
        
        if (url) {
          unsubscribe();

          // Store checkout information in localStorage to retrieve after payment
          localStorage.setItem('checkoutInfo', JSON.stringify({
            cart: items,
            customerInfo,
            couponApplied: discount > 0,
            discountAmount: discount,
            finalTotal: items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0) - discount,
            sessionId
          }));
          
          resolve({
            url,
            sessionId: sessionId || snap.id
          });
        }
      });
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

/**
 * Verifies a checkout session by checking its status
 * @param {string} sessionId - The Stripe session ID
 * @returns {Promise<Object>} - Session verification result
 */
export const verifyCheckoutSession = async (sessionId) => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw new Error("User is not authenticated");
    }

    // Look up the session directly from the extensions collection
    const sessionsQuery = query(
      collection(db, "users", userId, "checkout_sessions"),
      where("sessionId", "==", sessionId)
    );
    
    const sessionSnapshot = await getDocs(sessionsQuery);
        
    if (sessionSnapshot.empty) {
      throw new Error("Checkout session not found");
    }
        
    // Get the session data from the first matching document
    const sessionData = sessionSnapshot.docs[0].data();

    // Extract metadata from the session
    const metadata = sessionData.metadata || {};
    console.log("Session metadata:", metadata);
    
    // Parse the items JSON from metadata
    let purchasedItems = [];
    if (metadata.itemsJson) {
      try {
        purchasedItems = JSON.parse(metadata.itemsJson);
        console.log("Parsed purchased items:", purchasedItems);
      } catch (e) {
        console.error("Error parsing itemsJson:", e);
      }
    }

    // Calculate total amount from purchased items
    const totalAmount = purchasedItems.reduce((sum, item) => {
      return sum + (item.price * (item.quantity || 1));
    }, 0);
    
    // Create purchases for each item
    const purchases = [];
    
    // First check if any purchases already exist for this session
    const existingPurchases = await getDocs(
      query(
        collection(db, "purchasedExams", userId, "purchases"),
        where("sessionId", "==", sessionId)
      )
    );

    if (!existingPurchases.empty) {
      console.log("Purchases already exist for this session, skipping creation");
      existingPurchases.forEach(doc => {
        purchases.push({
          id: doc.id,
          ...doc.data()
        });
      });
    } else {
      for (const item of purchasedItems) {
        console.log("Processing item:", item);
        // Get the exam ID from the item
        const examId = item.id || item.examId;
        if (!examId) {
          console.error("Missing exam ID for item:", item);
          continue;
        }

        const examData = {
          examId: examId,
          title: item.name || item.title || "Untitled Exam",
          category: "Uncategorized",
          price: parseFloat(item.price) || 0,
          sessionId: sessionId,
          purchaseDate: new Date().toISOString(),
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
          userId: userId,
          createdAt: serverTimestamp()
        };

        console.log("Checking if exam is purchased:", examData.examId);
        const isPurchased = await purchasedExamsService.isExamPurchased(examData.examId);
        console.log("Is purchased check result:", isPurchased);

        if (!isPurchased) {
          console.log("Creating new purchase with data:", examData);
          await purchasedExamsService.addPurchasedExam(examData);
          purchases.push(examData);
        }
      }
    }
    console.log("Purchase processing complete");

    // Prepare response based on session data
    const responseData = {
      success: true,
      sessionId: sessionData.sessionId || sessionId,
      paymentStatus: sessionData.payment_status || sessionData.status,
      customer: {
        email: metadata.customerEmail || metadata.email,
        name: `${metadata.firstName || ''} ${metadata.lastName || ''}`.trim() || metadata.customerName,
      },
      discountApplied: metadata.couponApplied === "true",
      discountAmount: parseFloat(metadata.discountAmount || "0"),
      amount: totalAmount, // Use calculated total amount
      metadata: metadata,
      purchasedItems: purchasedItems
    };

    // If payment was successful, create purchase records
    if (responseData.success && purchasedItems.length > 0) {
      // Get the newly created purchases
      const newPurchases = await getDocs(
        query(
          collection(db, "purchasedExams", userId, "purchases"),
          where("sessionId", "==", sessionId)
        )
      );

      responseData.purchases = [];
      newPurchases.forEach(doc => {
        const purchaseData = doc.data();
        responseData.purchases.push({
          id: doc.id,
          ...purchaseData
        });
      });
    }

    return responseData;
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
      const data = doc.data();
      purchasedExams.push({
        id: doc.id,
        ...data,
        // Convert Firestore timestamps to JavaScript dates if they exist
        purchasedAt: data.purchasedAt?.toDate?.() || null,
        expiresAt: data.expiresAt?.toDate?.() || null,
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

    const document = querySnapshot.docs[0];
    const data = document.data();
    return {
      id: document.id,
      ...data,
      // Convert Firestore timestamps to JavaScript dates if they exist
      purchasedAt: data.purchasedAt?.toDate?.() || null,
      expiresAt: data.expiresAt?.toDate?.() || null,
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
    const expiryDate = exam.expiresAt || new Date(0);
    
    return exam.status === 'active' && now < expiryDate;
  } catch (error) {
    console.error('Error checking exam access:', error);
    return false;
  }
};

/**
 * Gets customer portal URL for managing subscriptions
 * @returns {Promise<string>} The customer portal URL
 */
export const getPortalUrl = async () => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error("User is not authenticated");

  try {
    // Call the Firebase extension's portal creation endpoint
    const functions = getFunctions(app, "us-central1");
    const functionRef = httpsCallable(
      functions,
      "ext-firestore-stripe-payments-createPortalLink"
    );
    
    const { data } = await functionRef({
      customerId: userId,
      returnUrl: window.location.origin,
    });
    
    const dataWithUrl = data;
    if (!dataWithUrl.url) {
      throw new Error("No portal URL returned");
    }
    
    return dataWithUrl.url;
  } catch (error) {
    console.error("Error getting portal URL:", error);
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
    
    // Get payments from the extension's payments collection
    const paymentsRef = collection(db, 'customers', userId, 'payments');
    const querySnapshot = await getDocs(paymentsRef);
    
    const payments = [];
    querySnapshot.forEach(doc => {
      const data = doc.data();
      payments.push({
        id: doc.id,
        ...data,
        amount: data.amount_total ? data.amount_total / 100 : 0, // Convert to dollars if available
        status: data.status || 'unknown',
        created: data.created ? new Date(data.created * 1000) : null
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
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');
    
    // Get the payment from Firestore
    const functions = getFunctions(app, "us-central1");
    const getPaymentIntent = httpsCallable(
      functions,
      "ext-firestore-stripe-payments-getPaymentIntent"
    );
    
    const { data } = await getPaymentIntent({ id: paymentIntentId });
    
    return data.status === 'succeeded';
  } catch (error) {
    console.error('Error checking payment status:', error);
    return false;
  }
};

// Export default object with all functions
export default {
  createCheckoutSession,
  verifyCheckoutSession,
  getPurchasedExams,
  getPurchasedExam,
  hasAccessToExam,
  getPortalUrl,
  getPayments,
  isPaymentSuccessful
};