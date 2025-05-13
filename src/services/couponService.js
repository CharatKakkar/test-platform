import { db } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  increment, 
  serverTimestamp,
  query,
  where,
  getDocs
} from 'firebase/firestore';

/**
 * Creates a new coupon in the database
 * @param {Object} couponData - The coupon data
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const createCoupon = async (couponData) => {
  try {
    const {
      code,
      stripeCouponId,
      type,
      value,
      description = '',
      maxDiscount = null,
      minPurchase = 0,
      expiryDate = null,
      startDate = null,
      usageLimit = null,
      perUserLimit = 1,
      categories = [],
      excludedExams = [],
      isActive = true
    } = couponData;

    // Validate required fields
    if (!code || !stripeCouponId || !type || value === undefined) {
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
    const couponRef = doc(db, 'coupons', code);
    await setDoc(couponRef, {
      code,
      stripeCouponId,
      type,
      value,
      description,
      maxDiscount,
      minPurchase,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      startDate: startDate ? new Date(startDate) : null,
      usageLimit,
      usedCount: 0,
      perUserLimit,
      categories,
      excludedExams,
      isActive,
      createdAt: serverTimestamp(),
      lastModified: serverTimestamp()
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
 * Validates a coupon code
 * @param {string} couponCode - The coupon code to validate
 * @param {number} subtotal - The subtotal amount
 * @param {string} userId - The user's ID
 * @param {string} examId - The exam ID (optional)
 * @returns {Promise<{valid: boolean, stripeCouponId: string, discount: number, message: string}>}
 */
export const validateCoupon = async (couponCode, subtotal, userId, examId = null) => {
  try {
    // Get coupon from database
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

    // Check if coupon is active
    if (!coupon.isActive) {
      return {
        valid: false,
        stripeCouponId: null,
        discount: 0,
        message: 'Coupon is no longer active'
      };
    }

    // Check start date
    if (coupon.startDate && new Date(coupon.startDate.toDate()) > now) {
      return {
        valid: false,
        stripeCouponId: null,
        discount: 0,
        message: 'Coupon is not yet active'
      };
    }

    // Check expiry date
    if (coupon.expiryDate && new Date(coupon.expiryDate.toDate()) < now) {
      return {
        valid: false,
        stripeCouponId: null,
        discount: 0,
        message: 'Coupon has expired'
      };
    }

    // Check minimum purchase
    if (coupon.minPurchase && subtotal < coupon.minPurchase) {
      return {
        valid: false,
        stripeCouponId: null,
        discount: 0,
        message: `Minimum purchase amount of ₹${coupon.minPurchase} required`
      };
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return {
        valid: false,
        stripeCouponId: null,
        discount: 0,
        message: 'Coupon usage limit reached'
      };
    }

    // Check per-user limit
    if (userId && coupon.perUserLimit) {
      const userCouponsRef = collection(db, 'users', userId, 'used_coupons');
      const userCouponsQuery = query(userCouponsRef, where('couponCode', '==', couponCode));
      const userCouponsSnapshot = await getDocs(userCouponsQuery);
      
      if (userCouponsSnapshot.size >= coupon.perUserLimit) {
        return {
          valid: false,
          stripeCouponId: null,
          discount: 0,
          message: 'You have reached the usage limit for this coupon'
        };
      }
    }

    // Check exam category if provided
    if (examId && coupon.categories?.length > 0) {
      const examRef = doc(db, 'exams', examId);
      const examDoc = await getDoc(examRef);
      const examData = examDoc.data();
      
      if (!coupon.categories.includes(examData.category)) {
        return {
          valid: false,
          stripeCouponId: null,
          discount: 0,
          message: 'This coupon is not valid for this exam category'
        };
      }
    }

    // Check excluded exams
    if (examId && coupon.excludedExams?.includes(examId)) {
      return {
        valid: false,
        stripeCouponId: null,
        discount: 0,
        message: 'This coupon cannot be used for this exam'
      };
    }

    // Calculate discount amount
    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = (subtotal * coupon.value) / 100;
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else if (coupon.type === 'fixed') {
      discount = coupon.value;
      if (discount > subtotal) {
        discount = subtotal;
      }
    }

    return {
      valid: true,
      stripeCouponId: coupon.stripeCouponId,
      discount,
      message: `Coupon applied successfully! You saved ₹${discount.toFixed(2)}`
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
 * Records coupon usage
 * @param {string} couponCode - The coupon code used
 * @param {string} userId - The user's ID
 * @param {string} sessionId - The checkout session ID
 * @returns {Promise<boolean>}
 */
export const recordCouponUsage = async (couponCode, userId, sessionId) => {
  try {
    // Update coupon usage count
    const couponRef = doc(db, 'coupons', couponCode);
    await updateDoc(couponRef, {
      usedCount: increment(1),
      lastModified: serverTimestamp()
    });

    // Record user's coupon usage
    const userCouponRef = doc(db, 'users', userId, 'used_coupons', `${couponCode}_${sessionId}`);
    await setDoc(userCouponRef, {
      couponCode,
      sessionId,
      usedAt: serverTimestamp()
    });

    return true;
  } catch (error) {
    console.error('Error recording coupon usage:', error);
    return false;
  }
};

/**
 * Creates the WELCOME50 coupon
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const createWelcomeCoupon = async () => {
  try {
    const couponData = {
      code: "WELCOME50",
      description: "50% off your first purchase",
      isActive: true,
      stripeCouponId: "promo_1RNT0pDBBYanrPYmY24JEwVH",
      type: "percentage",
      value: 50,
      usedCount: 0,
      perUserLimit: 1,  // One-time use per user
      usageLimit: null, // No global limit
      maxDiscount: null, // No maximum discount limit
      minPurchase: 0,   // No minimum purchase required
      expiryDate: null, // No expiry date
      startDate: null,  // Active immediately
      categories: [],   // Valid for all categories
      excludedExams: [], // No excluded exams
      createdAt: serverTimestamp(),
      lastModified: serverTimestamp()
    };

    // Create coupon document with code as document ID
    const couponRef = doc(db, 'coupons', couponData.code);
    await setDoc(couponRef, couponData);

    return {
      success: true,
      message: 'WELCOME50 coupon created successfully'
    };
  } catch (error) {
    console.error('Error creating WELCOME50 coupon:', error);
    return {
      success: false,
      message: error.message || 'Error creating coupon'
    };
  }
};

/**
 * Updates the perUserLimit field from string to number
 * @param {string} couponCode - The coupon code to update
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const updateCouponPerUserLimit = async (couponCode) => {
  try {
    const couponRef = doc(db, 'coupons', couponCode);
    const couponDoc = await getDoc(couponRef);

    if (!couponDoc.exists()) {
      return {
        success: false,
        message: 'Coupon not found'
      };
    }

    const coupon = couponDoc.data();
    
    // Convert perUserLimit from string to number if it's a string
    if (typeof coupon.perUserLimit === 'string') {
      await updateDoc(couponRef, {
        perUserLimit: parseInt(coupon.perUserLimit, 10)
      });
      
      return {
        success: true,
        message: 'Coupon perUserLimit updated successfully'
      };
    }

    return {
      success: true,
      message: 'Coupon perUserLimit is already a number'
    };
  } catch (error) {
    console.error('Error updating coupon perUserLimit:', error);
    return {
      success: false,
      message: error.message || 'Error updating coupon perUserLimit'
    };
  }
};

/**
 * Updates the usageLimit field from string to number
 * @param {string} couponCode - The coupon code to update
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const updateCouponUsageLimit = async (couponCode) => {
  try {
    const couponRef = doc(db, 'coupons', couponCode);
    const couponDoc = await getDoc(couponRef);

    if (!couponDoc.exists()) {
      return {
        success: false,
        message: 'Coupon not found'
      };
    }

    const coupon = couponDoc.data();
    
    // Convert usageLimit from string to number if it's a string
    if (typeof coupon.usageLimit === 'string') {
      await updateDoc(couponRef, {
        usageLimit: parseInt(coupon.usageLimit, 10)
      });
      
      return {
        success: true,
        message: 'Coupon usageLimit updated successfully'
      };
    }

    return {
      success: true,
      message: 'Coupon usageLimit is already a number'
    };
  } catch (error) {
    console.error('Error updating coupon usageLimit:', error);
    return {
      success: false,
      message: error.message || 'Error updating coupon usageLimit'
    };
  }
};

export default {
  createCoupon,
  validateCoupon,
  recordCouponUsage,
  createWelcomeCoupon,
  updateCouponPerUserLimit,
  updateCouponUsageLimit
}; 