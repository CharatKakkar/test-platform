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
    
    // Base session data without promotion code
    const baseSessionData = {
      line_items: items.map(item => ({
        price: item.stripePrice,
        quantity: item.quantity || 1
      })),
      mode: 'payment',
      success_url: `${window.location.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${window.location.origin}/payment/failed`,
      allow_promotion_codes: true, // Allow users to enter promotion codes in Stripe checkout
      metadata: {
        ...metadata,
        userId,
        customerEmail: customerInfo.email,
        customerName: `${customerInfo.firstName} ${customerInfo.lastName}`,
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

    // If we have a promotion code, add it to the session data
    const sessionData = promotionCodeId ? {
      ...baseSessionData,
      promotion_code: promotionCodeId, // Use the promotion code ID from the database
      metadata: {
        ...baseSessionData.metadata,
        couponApplied: 'true',
        promotionCodeId: promotionCodeId,
        couponCode: metadata.couponCode // Use the original coupon code from metadata
      }
    } : {
      ...baseSessionData,
      metadata: {
        ...baseSessionData.metadata,
        couponApplied: 'false',
        promotionCodeId: null,
        couponCode: null
      }
    };

    console.log('Creating session with data:', sessionData);
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
          
          // If the error is related to the promotion code, try creating a session without it
          if (error.message?.includes('promotion code') || error.message?.includes('coupon')) {
            console.log('Promotion code error detected, retrying without promotion code');
            unsubscribe();
            
            // Update the document with base session data (without promotion code)
            updateDoc(docRef, {
              ...baseSessionData,
              metadata: {
                ...baseSessionData.metadata,
                couponApplied: 'false',
                promotionCodeId: null,
                couponCode: null
              }
            })
              .then(() => {
                console.log('Updated session without promotion code');
                // The snapshot listener will pick up the new data
              })
              .catch(updateError => {
                console.error('Error updating session:', updateError);
                reject(new Error('Failed to create checkout session'));
              });
            return;
          }
          
          unsubscribe();
          reject(new Error(`An error occurred: ${error.message || error}`));
          return;
        }
        
        if (url) {
          console.log('Checkout URL received:', url);
          unsubscribe();

          // Store checkout information in localStorage
          const checkoutInfo = {
            cart: items,
            customerInfo,
            couponApplied: !!promotionCodeId,
            couponCode: metadata.couponCode || promotionCodeId || '',
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

      // Record coupon usage if a coupon was applied
      if (metadata.couponApplied === 'true' && metadata.couponCode) {
        try {
          console.log('Recording coupon usage for:', {
            couponCode: metadata.couponCode,
            userId: userId,
            sessionId: sessionId
          });
          const recorded = await recordCouponUsage(metadata.couponCode, userId, sessionId);
          console.log('Coupon usage recorded:', recorded);
        } catch (error) {
          console.error('Error recording coupon usage:', error);
          // Don't block the success flow if coupon recording fails
        }
      }
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
    console.log('Starting coupon validation for:', couponCode);
    console.log('Subtotal:', subtotal);
    
    if (!couponCode || typeof couponCode !== 'string') {
      console.log('Invalid coupon code format:', couponCode);
      return {
        valid: false,
        stripeCouponId: null,
        discount: 0,
        message: 'Invalid coupon code format'
      };
    }
    
    // Get coupon from our Firestore coupons collection
    const couponRef = doc(db, 'coupons', couponCode);
    console.log('Fetching coupon document from:', couponRef.path);
    
    const couponDoc = await getDoc(couponRef);
    console.log('Coupon document exists:', couponDoc.exists());

    if (!couponDoc.exists()) {
      console.log('Coupon not found:', couponCode);
      return {
        valid: false,
        stripeCouponId: null,
        discount: 0,
        message: 'Invalid coupon code'
      };
    }

    const coupon = couponDoc.data();
    console.log('Raw coupon data:', coupon);
    
    // Validate required fields
    if (!coupon.stripeCouponId || !coupon.type || coupon.value === undefined) {
      console.log('Missing required coupon fields:', {
        hasStripeCouponId: !!coupon.stripeCouponId,
        hasType: !!coupon.type,
        hasValue: coupon.value !== undefined,
        couponData: coupon
      });
      return {
        valid: false,
        stripeCouponId: null,
        discount: 0,
        message: 'Invalid coupon configuration'
      };
    }

    const now = new Date();
    console.log('Current time:', now);

    // Check if coupon is expired
    if (coupon.expiryDate) {
      const expiryDate = new Date(coupon.expiryDate.toDate());
      console.log('Coupon expiry date:', expiryDate);
      if (expiryDate < now) {
        console.log('Coupon expired:', couponCode);
        return {
          valid: false,
          stripeCouponId: null,
          discount: 0,
          message: 'Coupon has expired'
        };
      }
    }

    // Check if coupon is active
    console.log('Coupon active status:', coupon.isActive);
    if (coupon.isActive === false) {
      console.log('Coupon inactive:', couponCode);
      return {
        valid: false,
        stripeCouponId: null,
        discount: 0,
        message: 'Coupon is no longer active'
      };
    }

    // Check if coupon has reached its usage limit
    console.log('Coupon usage:', {
      usedCount: coupon.usedCount || 0,
      usageLimit: coupon.usageLimit
    });
    if (coupon.usageLimit && (coupon.usedCount || 0) >= coupon.usageLimit) {
      console.log('Coupon usage limit reached:', couponCode);
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
      console.log('Checking user coupon usage for:', userId);
      const userCouponRef = doc(db, 'used_coupons', userId);
      const userCouponDoc = await getDoc(userCouponRef);
      
      if (userCouponDoc.exists()) {
        const couponUsageRef = collection(db, 'used_coupons', userId, 'coupon_usage');
        const couponUsageQuery = query(couponUsageRef, where('couponCode', '==', couponCode));
        const couponUsageSnapshot = await getDocs(couponUsageQuery);
        console.log('User coupon usage count:', couponUsageSnapshot.size);
        
        if (couponUsageSnapshot.size >= (coupon.perUserLimit || 1)) {
          console.log('User has already used coupon:', couponCode);
          return {
            valid: false,
            stripeCouponId: null,
            discount: 0,
            message: 'You have already used this coupon'
          };
        }
      }
    }

    // Calculate discount amount
    let discount = 0;
    console.log('Calculating discount:', {
      type: coupon.type,
      value: coupon.value,
      subtotal: subtotal
    });

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
    } else {
      console.log('Invalid coupon type:', coupon.type);
      return {
        valid: false,
        stripeCouponId: null,
        discount: 0,
        message: 'Invalid coupon type'
      };
    }

    console.log('Coupon validation successful:', {
      couponCode,
      discount,
      stripeCouponId: coupon.stripeCouponId
    });

    return {
      valid: true,
      stripeCouponId: coupon.stripeCouponId,
      discount,
      message: `Coupon applied successfully! You saved $${discount.toFixed(2)}`
    };
  } catch (error) {
    console.error('Error validating coupon:', error);
    let errorMessage = 'Error validating coupon';
    
    // Safely extract error message
    if (error) {
      if (typeof error === 'object') {
        if (error.message) {
          errorMessage = error.message;
        } else if (error.toString && typeof error.toString === 'function') {
          errorMessage = error.toString();
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
    }
    
    return {
      valid: false,
      stripeCouponId: null,
      discount: 0,
      message: errorMessage
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
 * @param {string} userId - The user ID who used the coupon
 * @param {string} sessionId - The checkout session ID
 * @returns {Promise<boolean>} - Success status
 */
export const recordCouponUsage = async (couponCode, userId, sessionId) => {
  try {
    console.log('Starting recordCouponUsage with:', { couponCode, userId, sessionId });
    
    if (!userId) {
      console.log('No userId provided, skipping coupon usage recording');
      return false;
    }

    // First get the coupon document to verify it exists and get the coupon code
    const couponRef = doc(db, 'coupons', couponCode);
    const couponDoc = await getDoc(couponRef);
    
    if (!couponDoc.exists()) {
      console.error('Coupon document not found:', couponCode);
      return false;
    }

    const batch = writeBatch(db);
    console.log('Created write batch');

    // Update coupon usage count using the correct coupon code
    console.log('Updating coupon usage count in:', couponRef.path);
    batch.update(couponRef, {
      usedCount: increment(1)
    });

    // Create or update the user's document in used_coupons collection
    const userCouponRef = doc(db, 'used_coupons', userId);
    console.log('Creating/updating user document in:', userCouponRef.path);
    batch.set(userCouponRef, {
      userId,
      email: auth.currentUser?.email || '',
      name: auth.currentUser?.displayName || '',
      lastUpdated: serverTimestamp()
    }, { merge: true });

    // Record the specific coupon usage in the user's coupon_usage subcollection
    const couponUsageRef = doc(db, 'used_coupons', userId, 'coupon_usage', sessionId);
    console.log('Creating coupon usage document in:', couponUsageRef.path);
    batch.set(couponUsageRef, {
      couponCode,
      sessionId,
      usedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      stripeCouponId: couponDoc.data().stripeCouponId,
      status: 'used'
    });

    console.log('Committing batch write');
    await batch.commit();
    console.log('Successfully recorded coupon usage');
    return true;
  } catch (error) {
    console.error('Error recording coupon usage:', error);
    return false;
  }
};

/**
 * Gets coupon details from Firestore
 * @param {string} couponCode - The coupon code to retrieve
 * @returns {Promise<Object>} - Coupon details
 */
export const getCouponDetails = async (couponCode) => {
  try {
    console.log('Getting details for coupon:', couponCode);
    const couponRef = doc(db, 'coupons', couponCode);
    const couponDoc = await getDoc(couponRef);
    
    if (!couponDoc.exists()) {
      console.log('Coupon not found:', couponCode);
      return null;
    }
    
    const coupon = couponDoc.data();
    console.log('Coupon details:', coupon);
    return coupon;
  } catch (error) {
    console.error('Error getting coupon details:', error);
    return null;
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
  recordCouponUsage,
  getCouponDetails
};