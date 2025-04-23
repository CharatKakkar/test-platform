// components/PaymentSuccess.js
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Checkout.css';

const PaymentSuccess = ({ user, clearCart }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  
  // Get session ID from URL
  const queryParams = new URLSearchParams(location.search);
  const sessionId = queryParams.get('session_id');
  
  useEffect(() => {
    // Clear the cart after successful payment
    if (clearCart) {
      clearCart();
    }
    
    // Clear any stored exam results
    localStorage.removeItem('examResults');
    
    // Get checkout info from localStorage
    const checkoutInfo = localStorage.getItem('checkoutInfo');
    if (checkoutInfo) {
      try {
        setOrder(JSON.parse(checkoutInfo));
        localStorage.removeItem('checkoutInfo'); // Clear after retrieval
      } catch (error) {
        console.error('Error parsing checkout info:', error);
      }
    }
    
    const verifySession = async () => {
      if (!sessionId) {
        setLoading(false);
        return;
      }
      
      try {
        // In a real app, you would verify the session with your backend
        const response = await fetch(`/api/verify-session?session_id=${sessionId}`);
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to verify payment');
        }
        
        // If session info is available, use it
        if (data.order) {
          setOrder(data.order);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error verifying session:', error);
        setError('There was an issue verifying your payment. However, if the payment was successful, your purchase will be processed shortly.');
        setLoading(false);
      }
    };
    
    // Uncomment this in a real implementation
    // verifySession();
    
    // For demo purposes
    setTimeout(() => {
      setLoading(false);
    }, 1500);
  }, [sessionId, clearCart]);
  
  // Generate a random order ID if none exists
  const orderId = order?.orderId || `ORD-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  
  if (loading) {
    return (
      <div className="payment-processing-container">
        <div className="loading-spinner"></div>
        <h2>Confirming your payment...</h2>
        <p>Please wait while we verify your purchase.</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="order-complete-container">
        <div className="warning-icon">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold mb-2">Payment Being Processed</h1>
        <p className="text-gray-600 mb-6">{error}</p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            to="/purchased"
            className="btn btn-primary"
          >
            View My Purchases
          </Link>
          
          <Link 
            to="/"
            className="btn btn-secondary"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="order-complete-container">
      <div className="success-icon">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
        </svg>
      </div>
      
      <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
      <p className="text-gray-600 mb-6">Thank you for your purchase</p>
      
      <div className="order-details">
        <div className="order-section">
          <p>
            <span className="order-label">Name:</span> {order?.customerInfo?.firstName} {order?.customerInfo?.lastName || user?.name || 'Customer'}
          </p>
          <p>
            <span className="order-label">Email:</span> {order?.customerInfo?.email || user?.email || 'Not provided'}
          </p>
          <p>
            <span className="order-label">Order ID:</span> {orderId}
          </p>
        </div>
        
        {order?.cart && order.cart.length > 0 && (
          <div className="order-section">
            <h3 className="font-medium mb-3">Your Purchase</h3>
            
            {order.cart.map((item, index) => (
              <div key={index} className="flex justify-between mb-2">
                <span>{item.title}</span>
                <span>${item.price.toFixed(2)}</span>
              </div>
            ))}
            
            {order.couponApplied && (
              <div className="flex justify-between mb-2 text-green-600">
                <span>Discount</span>
                <span>-${order.discountAmount.toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between font-bold mt-4 pt-4 border-t border-gray-200">
              <span>Total</span>
              <span>${order.finalTotal.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
      
      <p className="mb-6">
        You will receive a confirmation email with instructions to access your purchases.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link 
          to="/purchased"
          className="btn btn-primary"
        >
          View My Purchases
        </Link>
        
        <Link 
          to="/"
          className="btn btn-secondary"
        >
          Return to Homepage
        </Link>
      </div>
    </div>
  );
};

export default PaymentSuccess;