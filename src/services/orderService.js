// src/services/orderService.js
import { db, auth } from '../firebase';
import { collection, addDoc, getDoc, getDocs, query, where, orderBy, doc, serverTimestamp } from 'firebase/firestore';
import { clearCart } from './cartService';
import { addPurchasedExams } from './profileService';
import { updateDoc } from 'firebase/firestore';

// Create a new order
export const createOrder = async (orderData) => {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('No user is currently authenticated');
    }
    
    // Prepare order data
    const newOrder = {
      userId: user.uid,
      userEmail: user.email,
      userName: user.displayName,
      items: orderData.items,
      totalAmount: orderData.totalAmount,
      paymentMethod: orderData.paymentMethod,
      status: 'completed', // Or 'pending' if you have payment processing
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      billing: orderData.billing || {},
      discountApplied: orderData.discountApplied || 0,
      couponCode: orderData.couponCode || null
    };
    
    // Add order to Firestore
    const orderRef = await addDoc(collection(db, 'orders'), newOrder);
    
    // Extract exam IDs from the items
    const examIds = orderData.items.map(item => item.id);
    
    // Add purchased exams to user profile
    await addPurchasedExams(examIds);
    
    // Clear the cart
    await clearCart();
    
    return {
      id: orderRef.id,
      ...newOrder
    };
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
};

// Get user's orders
export const getUserOrders = async () => {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      return [];
    }
    
    const ordersQuery = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    
    const ordersSnapshot = await getDocs(ordersQuery);
    const orders = [];
    
    ordersSnapshot.forEach((doc) => {
      const orderData = doc.data();
      
      // Convert Firestore timestamp to Date
      const createdAt = orderData.createdAt?.toDate?.() || new Date();
      
      orders.push({
        id: doc.id,
        ...orderData,
        createdAt: createdAt.toISOString(),
        updatedAt: orderData.updatedAt?.toDate?.().toISOString() || createdAt.toISOString()
      });
    });
    
    return orders;
  } catch (error) {
    console.error('Error getting user orders:', error);
    return [];
  }
};

// Get a specific order by ID
export const getOrderById = async (orderId) => {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('No user is currently authenticated');
    }
    
    const orderRef = doc(db, 'orders', orderId);
    const orderDoc = await getDoc(orderRef);
    
    if (orderDoc.exists()) {
      const orderData = orderDoc.data();
      
      // Verify that the order belongs to the current user
      if (orderData.userId !== user.uid) {
        throw new Error('You do not have permission to view this order');
      }
      
      // Convert Firestore timestamp to Date
      const createdAt = orderData.createdAt?.toDate?.() || new Date();
      
      return {
        id: orderDoc.id,
        ...orderData,
        createdAt: createdAt.toISOString(),
        updatedAt: orderData.updatedAt?.toDate?.().toISOString() || createdAt.toISOString()
      };
    } else {
      throw new Error('Order not found');
    }
  } catch (error) {
    console.error('Error getting order:', error);
    throw error;
  }
};

// Process payment for an order
export const processPayment = async (orderId, paymentDetails) => {
  try {
    // In a real application, you would integrate with a payment processor here
    // This is a simplified example for demonstration purposes
    
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('No user is currently authenticated');
    }
    
    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update order status in Firestore
    const orderRef = doc(db, 'orders', orderId);
    const orderDoc = await getDoc(orderRef);
    
    if (!orderDoc.exists()) {
      throw new Error('Order not found');
    }
    
    const orderData = orderDoc.data();
    
    // Verify that the order belongs to the current user
    if (orderData.userId !== user.uid) {
      throw new Error('You do not have permission to update this order');
    }
    
    // Update the order with payment details
    const paymentInfo = {
      paymentMethod: paymentDetails.method,
      paymentStatus: 'completed',
      paymentDate: serverTimestamp(),
      paymentReference: Math.random().toString(36).substring(2, 15),
      lastFour: paymentDetails.lastFour
    };
    
    await updateDoc(orderRef, {
      status: 'completed',
      paymentInfo,
      updatedAt: serverTimestamp()
    });
    
    return {
      id: orderDoc.id,
      ...orderData,
      status: 'completed',
      paymentInfo
    };
  } catch (error) {
    console.error('Error processing payment:', error);
    throw error;
  }
};

// Apply a coupon to an order
export const applyCoupon = async (couponCode) => {
  try {
    // In a real application, you would validate the coupon against a database
    // This is a simplified example for demonstration purposes
    
    // Simulate coupon lookup
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if coupon is valid
    if (couponCode.toUpperCase() === 'DEMO50') {
      return {
        valid: true,
        code: 'DEMO50',
        discountType: 'fixed',
        discountAmount: 50,
        message: 'Coupon applied successfully!'
      };
    } else if (couponCode.toUpperCase() === 'WELCOME10') {
      return {
        valid: true,
        code: 'WELCOME10',
        discountType: 'percentage',
        discountPercentage: 10,
        message: '10% discount applied successfully!'
      };
    } else {
      return {
        valid: false,
        message: 'Invalid coupon code'
      };
    }
  } catch (error) {
    console.error('Error applying coupon:', error);
    return {
      valid: false,
      message: 'Error applying coupon'
    };
  }
};

// Get order statistics for the user
export const getOrderStatistics = async () => {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      return {
        totalOrders: 0,
        totalSpent: 0,
        averageOrderValue: 0
      };
    }
    
    const orders = await getUserOrders();
    
    if (orders.length === 0) {
      return {
        totalOrders: 0,
        totalSpent: 0,
        averageOrderValue: 0
      };
    }
    
    const totalSpent = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    
    return {
      totalOrders: orders.length,
      totalSpent: totalSpent,
      averageOrderValue: totalSpent / orders.length
    };
  } catch (error) {
    console.error('Error getting order statistics:', error);
    return {
      totalOrders: 0,
      totalSpent: 0,
      averageOrderValue: 0
    };
  }
};

export default {
  createOrder,
  getUserOrders,
  getOrderById,
  processPayment,
  applyCoupon,
  getOrderStatistics
};