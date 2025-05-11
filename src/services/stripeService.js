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
  setDoc,
  writeBatch,
  increment
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import purchasedExamsService from './purchasedExamsService';

/**
 * Verifies the extension configuration and functions
 * @returns {Promise<boolean>} - True if the extension is properly configured, false otherwise
 */
const verifyExtensionConfig = async () => {
  try {
    const functions = getFunctions(app);
    console.log('Checking Firebase Functions...');
    
    // Check if the extension's functions exist
    const createCheckoutSession = httpsCallable(
      functions,
      'ext-firestore-stripe-payments-createCheckoutSession'
    );
    const createPortalLink = httpsCallable(
      functions,
      'ext-firestore-stripe-payments-createPortalLink'
    );
    
    console.log('Extension functions found:', {
      createCheckoutSession: !!createCheckoutSession,
      createPortalLink: !!createPortalLink
    });
    
    return true;
  } catch (error) {
    console.error('Extension verification failed:', error);
    return false;
  }
};

/**
 * Creates a Stripe checkout session using the Firebase Extension approach
 * @param {Array} items - Cart items to purchase
 * @param {Object} customerInfo - Customer information
 * @param {string} promotionCodeId - The promotion code ID to apply (if any)
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<{url: string, sessionId: string}>} - Checkout session URL and ID
 */
export const createCheckoutSession = async (items, customerInfo, promotionCodeId = null, metadata = {}) => {
  console.log('Creating checkout session with:', { items, customerInfo, promotionCodeId, metadata });
  
  try {
    const userId = auth.currentUser?.uid;
    console.log('Current user ID:', userId);
    
    if (!userId) {
      console.log('No authenticated user found');
      throw new Error("User is not authenticated");
    }

    // Create a document in the checkout_sessions subcollection
    const checkoutSessionRef = collection(
      db,
      "users",
      userId,
      "checkout_sessions"
    );
    console.log('Creating checkout session document in:', checkoutSessionRef.path);
    
    // Create the checkout session document with the working structure
    const sessionData = {
      line_items: items.map(item => ({
        price: item.stripePrice,
        quantity: item.quantity || 1
      })),
      mode: 'payment',
      success_url: `${window.location.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${window.location.origin}/payment/failed`,
      allow_promotion_codes: true, // Allow users to enter promotion codes in Stripe checkout
      ...(promotionCodeId && { promotion_code: promotionCodeId }), // Only include promotion_code if provided
      metadata: {
        ...metadata,
        userId,
        customerEmail: customerInfo.email,
        customerName: `${customerInfo.firstName} ${customerInfo.lastName}`,
        // Add coupon metadata if provided
        ...(promotionCodeId && {
          couponApplied: 'true',
          promotionCodeId: promotionCodeId
        }),
        itemsJson: JSON.stringify(items.map(item => ({
          id: item.id,
          name: item.title,
          category: item.category || "Uncategorized",
          price: item.price,
          stripePrice: item.stripePrice,
          quantity: item.quantity || 1,
          finalPrice: item.price * (item.quantity || 1)
        })))
      }
    };

    const docRef = await addDoc(checkoutSessionRef, sessionData);
    console.log('Created checkout session document:', docRef.id);

    // Wait for the extension to populate the document with a URL
    return new Promise((resolve, reject) => {
      console.log('Setting up snapshot listener for checkout session');
      const unsubscribe = onSnapshot(docRef, (snap) => {
        const data = snap.data();
        console.log('Checkout session update:', data);
        
        if (!data) {
          console.log('No data in document yet');
          return;
        }
        
        const { error, url, sessionId } = data;
        
        if (error) {
          console.error('Checkout session error:', error);
          unsubscribe();
          reject(new Error(`An error occurred: ${error.message || error}`));
        }
        
        if (url) {
          console.log('Checkout URL received:', url);
          unsubscribe();

          // Store checkout information in localStorage
          const checkoutInfo = {
            cart: items,
            customerInfo,
            couponApplied: !!promotionCodeId,
            couponCode: promotionCodeId || '',
            discountAmount: 0,
            finalTotal: items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0),
            sessionId
          };
          console.log('Saving checkout info to localStorage:', checkoutInfo);
          localStorage.setItem('checkoutInfo', JSON.stringify(checkoutInfo));
          
          resolve({
            url,
            sessionId: sessionId || snap.id
          });
        }
      }, (error) => {
        console.error('Snapshot listener error:', error);
        unsubscribe();
        reject(error);
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

        // Fetch the exam details to get the correct category
        const examRef = doc(db, 'exams', examId);
        const examDoc = await getDoc(examRef);
        const examDetails = examDoc.exists() ? examDoc.data() : null;

        const examData = {
          examId: examId,
          title: item.name || item.title || "Untitled Exam",
          category: item.category || examDetails?.category || "Uncategorized",
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

/**
 * Validates and applies a coupon code
 * @param {string} couponCode - The coupon code to validate
 * @param {number} subtotal - The subtotal amount before discount
 * @returns {Promise<{valid: boolean, stripeCouponId: string, discount: number, message: string}>} - Coupon validation result
 */
export const validateCoupon = async (couponCode, subtotal) => {
  try {
    // Get coupon from our Firestore coupons collection
    const couponRef = doc(db, 'coupons', couponCode);
    const couponDoc = await getDoc(couponRef);

    if (!couponDoc.exists()) {
      return {
        valid: false,
        stripeCouponId: null,
        discount: 0,
        message: 'Invalid coupon code'
      };
    }

    const coupon = couponDoc.data();
    const now = new Date();

    // Check if coupon is expired
    if (coupon.expiryDate && new Date(coupon.expiryDate.toDate()) < now) {
      return {
        valid: false,
        stripeCouponId: null,
        discount: 0,
        message: 'Coupon has expired'
      };
    }

    // Check if coupon is active
    if (!coupon.isActive) {
      return {
        valid: false,
        stripeCouponId: null,
        discount: 0,
        message: 'Coupon is no longer active'
      };
    }

    // Check if coupon has reached its usage limit
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return {
        valid: false,
        stripeCouponId: null,
        discount: 0,
        message: 'Coupon usage limit reached'
      };
    }

    // Check if user has already used this coupon
    const userId = auth.currentUser?.uid;
    if (userId) {
      const userCouponsRef = collection(db, 'users', userId, 'used_coupons');
      const userCouponsQuery = query(userCouponsRef, where('couponCode', '==', couponCode));
      const userCouponsSnapshot = await getDocs(userCouponsQuery);
      
      if (userCouponsSnapshot.size >= (coupon.perUserLimit || 1)) {
        return {
          valid: false,
          stripeCouponId: null,
          discount: 0,
          message: 'You have already used this coupon'
        };
      }
    }

    // Calculate discount amount
    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = (subtotal * coupon.value) / 100;
      // Apply maximum discount if specified
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else if (coupon.type === 'fixed') {
      discount = coupon.value;
      // Ensure discount doesn't exceed subtotal
      if (discount > subtotal) {
        discount = subtotal;
      }
    }

    return {
      valid: true,
      stripeCouponId: coupon.stripeCouponId,
      discount,
      message: `Coupon applied successfully! You saved $${discount.toFixed(2)}`
    };
  } catch (error) {
    console.error('Error validating coupon:', error);
    return {
      valid: false,
      stripeCouponId: null,
      discount: 0,
      message: 'Error validating coupon'
    };
  }
};

/**
 * Creates a new coupon in the database
 * @param {Object} couponData - The coupon data
 * @returns {Promise<{success: boolean, message: string}>} - Creation result
 */
export const createCoupon = async (couponData) => {
  try {
    const {
      code,
      type, // 'percentage' or 'fixed'
      value, // percentage or fixed amount
      maxDiscount, // optional maximum discount for percentage coupons
      expiryDate, // optional expiry date
      isActive = true,
      description,
      usageLimit, // optional maximum number of uses
      usedCount = 0
    } = couponData;

    // Validate required fields
    if (!code || !type || !value) {
      throw new Error('Missing required coupon fields');
    }

    // Validate coupon type
    if (!['percentage', 'fixed'].includes(type)) {
      throw new Error('Invalid coupon type');
    }

    // Validate value
    if (type === 'percentage' && (value < 0 || value > 100)) {
      throw new Error('Percentage must be between 0 and 100');
    }

    if (type === 'fixed' && value < 0) {
      throw new Error('Fixed amount cannot be negative');
    }

    // Create coupon document
    await setDoc(doc(db, 'coupons', code), {
      code,
      type,
      value,
      maxDiscount,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      isActive,
      description,
      usageLimit,
      usedCount,
      createdAt: serverTimestamp()
    });

    return {
      success: true,
      message: 'Coupon created successfully'
    };
  } catch (error) {
    console.error('Error creating coupon:', error);
    return {
      success: false,
      message: error.message || 'Error creating coupon'
    };
  }
};

/**
 * Updates coupon usage count
 * @param {string} couponCode - The coupon code
 * @returns {Promise<boolean>} - Success status
 */
export const updateCouponUsage = async (couponCode) => {
  try {
    const couponRef = doc(db, 'coupons', couponCode);
    const couponDoc = await getDoc(couponRef);

    if (!couponDoc.exists()) {
      return false;
    }

    const coupon = couponDoc.data();
    
    // Check if coupon has reached its usage limit
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return false;
    }

    // Update usage count
    await updateDoc(couponRef, {
      usedCount: (coupon.usedCount || 0) + 1
    });

    return true;
  } catch (error) {
    console.error('Error updating coupon usage:', error);
    return false;
  }
};

/**
 * Records coupon usage in Firestore
 * @param {string} couponCode - The coupon code used
 * @returns {Promise<boolean>} - Success status
 */
export const recordCouponUsage = async (couponCode) => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) return false;

    const batch = writeBatch(db);

    // Update coupon usage count
    const couponRef = doc(db, 'coupons', couponCode);
    batch.update(couponRef, {
      usedCount: increment(1)
    });

    // Record user's coupon usage
    const userCouponRef = doc(db, 'users', userId, 'used_coupons', couponCode);
    batch.set(userCouponRef, {
      usedAt: serverTimestamp(),
      couponCode
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error recording coupon usage:', error);
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
  isPaymentSuccessful,
  validateCoupon,
  createCoupon,
  updateCouponUsage,
  recordCouponUsage
};