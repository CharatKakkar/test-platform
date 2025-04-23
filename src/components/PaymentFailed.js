// components/PaymentFailed.js
import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Checkout.css';

const PaymentFailed = ({ user }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get error information from URL or state
  const queryParams = new URLSearchParams(location.search);
  const errorCode = queryParams.get('error');
  const errorMessage = getErrorMessage(errorCode);
  
  // Function to translate error codes to user-friendly messages
  function getErrorMessage(code) {
    const errorMessages = {
      'payment_intent_authentication_failure': 'The payment could not be authenticated. Please try again with a different payment method.',
      'payment_intent_payment_attempt_failed': 'The payment attempt failed. Please try again with a different card or payment method.',
      'payment_intent_unexpected_state': 'There was an unexpected error processing your payment.',
      // Add more error codes as needed
    };
    
    return errorMessages[code] || 'There was an issue processing your payment. No charges were made to your account.';
  }
  
  // Get cart items from localStorage (if available)
  const checkoutInfo = localStorage.getItem('checkoutInfo');
  let cart = [];
  
  if (checkoutInfo) {
    try {
      const parsedInfo = JSON.parse(checkoutInfo);
      cart = parsedInfo.cart || [];
    } catch (error) {
      console.error('Error parsing checkout info:', error);
    }
  }
  
  return (
    <div className="order-complete-container">
      <div className="error-icon">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </div>
      
      <h1 className="text-2xl font-bold mb-2">Payment Failed</h1>
      <p className="text-gray-600 mb-6">We couldn't process your payment</p>
      
      <div className="bg-red-50 p-4 rounded-md mb-6">
        <p className="text-red-600">{errorMessage}</p>
      </div>
      
      {cart.length > 0 && (
        <div className="summary-container mb-6">
          <h3 className="font-semibold mb-3">Your Cart</h3>
          
          {cart.map((item, index) => (
            <div key={index} className="flex justify-between mb-2">
              <span>{item.title}</span>
              <span>${item.price.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
      
      <p className="mb-6">
        Your card has not been charged. Please try again or use a different payment method.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link 
          to="/checkout"
          className="btn btn-primary"
        >
          Try Again
        </Link>
        
        <Link 
          to="/cart"
          className="btn btn-secondary"
        >
          Return to Cart
        </Link>
      </div>
      
      <div className="mt-6 text-sm text-gray-500">
        <p>If you continue to experience issues, please contact our support team.</p>
      </div>
    </div>
  );
};

export default PaymentFailed;