// components/Checkout.js
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Checkout.css';
import stripeService from '../services/stripeService.js';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const Checkout = ({ cart = [], user, clearCart, removeFromCart, updateQuantity, cartTotal = 0, onLogin }) => {
  const navigate = useNavigate();
  const [examResults, setExamResults] = useState(null);
  const [activeTab, setActiveTab] = useState(user ? 'checkout' : 'login');
  const [loading, setLoading] = useState(false);
  const [couponApplied, setCouponApplied] = useState(false);
  const [authError, setAuthError] = useState('');
  const [redirectingToStripe, setRedirectingToStripe] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponInfo, setCouponInfo] = useState(null);
  const [couponStatus, setCouponStatus] = useState('');
  
  // Parse user's name into first and last name if available
  const parseUserName = () => {
    if (!user || !user.name) return { firstName: '', lastName: '' };
    
    const nameParts = user.name.split(' ');
    if (nameParts.length === 1) {
      return { firstName: nameParts[0], lastName: '' };
    }
    
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' '); // Handle multi-part last names
    return { firstName, lastName };
  };
  
  // Initialize form data based on user
  const [formData, setFormData] = useState(() => {
    const { firstName, lastName } = parseUserName();
    return {
      firstName: firstName,
      lastName: lastName,
      email: user?.email || '',
      couponCode: ''
    };
  });
  
  // Update form data when user changes (such as after login)
  useEffect(() => {
    if (user) {
      const { firstName, lastName } = parseUserName();
      setFormData(prevData => ({
        ...prevData,
        firstName: firstName,
        lastName: lastName,
        email: user.email || ''
      }));
      
      // Set active tab to checkout if user is logged in
      setActiveTab('checkout');
    }
  }, [user]);
  
  const [errors, setErrors] = useState({});

  const coursePrice = cartTotal || 299.99;
  const discountAmount = couponApplied ? 50 : 0;
  const finalTotal = (coursePrice - discountAmount).toFixed(2);

  useEffect(() => {
    // Get exam results from localStorage if available
    const results = localStorage.getItem('examResults');
    if (results) {
      setExamResults(JSON.parse(results));
    }
    
    // If cart is empty and no exam results, redirect to exams page
    if (cart.length === 0 && !results) {
      navigate('/exams');
    }
  }, [cart, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Validate name fields
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const applyCoupon = async () => {
    // Reset states
    setCouponLoading(true);
    setCouponStatus('');
    setErrors(prev => ({...prev, couponCode: ''}));
    
    try {
      // Basic validation
      const couponCode = formData.couponCode?.trim()?.toUpperCase();
      if (!couponCode) {
        setErrors(prev => ({
          ...prev,
          couponCode: 'Please enter a coupon code'
        }));
        return;
      }

      // Calculate subtotal
      const subtotal = cart.reduce((sum, item) => {
        const price = parseFloat(item.price) || 0;
        const quantity = parseInt(item.quantity) || 1;
        return sum + (price * quantity);
      }, 0);

      // Check if user has already used this coupon
      if (user?.uid) {
        const userCouponRef = doc(db, 'used_coupons', user.uid);
        const userCouponDoc = await getDoc(userCouponRef);
        
        if (userCouponDoc.exists()) {
          const couponUsageRef = collection(db, 'used_coupons', user.uid, 'coupon_usage');
          const couponUsageQuery = query(couponUsageRef, where('couponCode', '==', couponCode));
          const couponUsageSnapshot = await getDocs(couponUsageQuery);
          
          // Get the coupon document to check perUserLimit
          const couponRef = doc(db, 'coupons', couponCode);
          const couponDoc = await getDoc(couponRef);
          const coupon = couponDoc.data();
          
          if (couponUsageSnapshot.size >= (coupon?.perUserLimit || 1)) {
            setCouponApplied(false);
            setCouponStatus('invalid');
            setCouponInfo(null);
            setErrors(prev => ({
              ...prev,
              couponCode: 'You have reached the usage limit for this coupon'
            }));
            return;
          }
        }
      }

      // Validate coupon
      const result = await stripeService.validateCoupon(couponCode, subtotal);
      
      // Handle validation result
      if (result?.valid) {
        setCouponApplied(true);
        setCouponStatus('valid');
        setCouponInfo({
          valid: true,
          promotionCodeId: result.stripeCouponId,
          discount: result.discount,
          message: result.message
        });
      } else {
        setCouponApplied(false);
        setCouponStatus('invalid');
        setCouponInfo(null);
        setErrors(prev => ({
          ...prev,
          couponCode: result?.message || 'Invalid coupon code'
        }));
      }
    } catch (err) {
      // Handle any errors
      setCouponApplied(false);
      setCouponStatus('invalid');
      setCouponInfo(null);
      
      // Get error message safely
      const errorMessage = err?.message || 
                         (typeof err === 'string' ? err : 'Error applying coupon');
      
      setErrors(prev => ({
        ...prev,
        couponCode: errorMessage
      }));
    } finally {
      setCouponLoading(false);
    }
  };

  // Define renderCouponSection as a component function
  const renderCouponSection = () => (
    <div className="coupon-section">
      <div className="coupon-input-group">
        <input
          type="text"
          name="couponCode"
          placeholder="Enter coupon code"
          value={formData.couponCode}
          onChange={handleInputChange}
          className={`${errors.couponCode ? 'error' : ''} ${couponStatus === 'invalid' ? 'invalid' : ''}`}
          disabled={couponLoading || (couponApplied && couponStatus === 'valid')}
        />
        <button
          onClick={applyCoupon}
          disabled={couponLoading || (couponApplied && couponStatus === 'valid') || !formData.couponCode.trim()}
          className={`${couponApplied ? 'applied' : ''} ${couponStatus === 'invalid' ? 'invalid' : ''}`}
        >
          {couponLoading ? 'Validating...' : 
           couponStatus === 'invalid' ? (errors.couponCode === 'Coupon expired' ? 'Expired' : 'Invalid') : 
           couponApplied ? 'Applied' : 'Apply'}
        </button>
      </div>
      {errors.couponCode && <p className="error-text">{errors.couponCode}</p>}
      {couponApplied && couponInfo && couponStatus === 'valid' && (
        <p className="success-text">{couponInfo.message}</p>
      )}
    </div>
  );

  // Redirect to Stripe Checkout - UPDATED to use stripeService
  const redirectToStripeCheckout = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    setRedirectingToStripe(true);
    setErrors(prev => ({ ...prev, checkout: '' }));
    
    try {
      // Create customer info object
      const customerInfo = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName
      };
      
      // Additional metadata
      const metadata = {
        userId: user?.uid || 'guest',
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        couponApplied: couponApplied && couponStatus === 'valid' ? 'true' : 'false',
        couponCode: couponApplied && couponStatus === 'valid' ? formData.couponCode.toUpperCase() : null
      };
      
      // Only include promotion code if coupon is valid
      const promotionCodeId = (couponApplied && couponStatus === 'valid') ? couponInfo.promotionCodeId : null;
      
      // Use stripeService to create checkout session
      const response = await stripeService.createCheckoutSession(
        cart.map(item => ({
          id: item.id,
          title: item.title,
          description: item.description || 'Exam preparation material',
          category: item.category,
          price: item.price,
          stripePrice: item.stripePrice,
          quantity: item.quantity || 1
        })),
        customerInfo,
        promotionCodeId,
        metadata
      );
      
      // Record coupon usage if a valid coupon was applied
      if (couponApplied && couponStatus === 'valid' && user) {
        await stripeService.recordCouponUsage(formData.couponCode.toUpperCase(), user.uid, response.sessionId);
      }
      
      // Save checkout information to localStorage
      localStorage.setItem('checkoutInfo', JSON.stringify({
        cart: cart,
        customerInfo: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email
        },
        couponApplied: couponApplied && couponStatus === 'valid',
        couponCode: couponApplied && couponStatus === 'valid' ? formData.couponCode : '',
        discountAmount: couponApplied && couponStatus === 'valid' ? couponInfo.discount : 0,
        finalTotal: cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0) - 
          (couponApplied && couponStatus === 'valid' ? couponInfo.discount : 0),
        sessionId: response.sessionId
      }));
      
      console.log('Redirecting to:', response.url);
      window.location.href = response.url;
    } catch (error) {
      console.error('Checkout error:', error);
      
      // Handle promotion code specific errors
      const errorMessage = error?.message || '';
      const isPromotionError = errorMessage.includes('promotion code') || errorMessage.includes('coupon');
      
      if (isPromotionError) {
        // Reset coupon state but keep the code
        setCouponApplied(false);
        setCouponStatus('invalid');
        setCouponInfo(null);
        
        // Check if it's an expired coupon error
        if (errorMessage.includes('expired')) {
          setErrors(prev => ({
            ...prev,
            couponCode: 'Coupon expired',
            checkout: 'Please remove the expired coupon before proceeding'
          }));
        } else {
          // For other coupon errors, clear the input
          setFormData(prev => ({
            ...prev,
            couponCode: ''
          }));
          setErrors(prev => ({
            ...prev,
            couponCode: 'You have already used this coupon',
            checkout: 'Please remove the invalid coupon before proceeding'
          }));
        }
      } else {
        setErrors(prev => ({
          ...prev,
          checkout: errorMessage || 'Error processing checkout'
        }));
      }
    } finally {
      setLoading(false);
      setRedirectingToStripe(false);
    }
  };

  const handleGoogleAuth = async (isLogin = true) => {
    setLoading(true);
    setAuthError('');
    
    try {
      // Call onLogin with Google authentication flag
      await onLogin(null, null, true);
      // No need to navigate here as user state change will trigger useEffect
    } catch (error) {
      console.error("Google auth error:", error);
      setAuthError(error.message || 'Google authentication failed. Please try again.');
      setLoading(false);
    }
  };

  // Update the order summary section to only show discount when coupon is valid
  const renderOrderSummary = () => (
    <div className="order-summary-card">
      <h2>Order Summary</h2>
      
      <div className="cart-items">
        {cart.map(item => (
          <div key={item.id} className="cart-item">
            <div className="item-details">
              <span className="item-title">{item.title}</span>
            </div>
            <span className="item-price">${item.price.toFixed(2)}</span>
          </div>
        ))}
      </div>
      
      {couponApplied && couponInfo && couponStatus === 'valid' && (
        <div className="discount-row">
          <span>Discount ({formData.couponCode})</span>
          <span>-${couponInfo.discount.toFixed(2)}</span>
        </div>
      )}
      
      <div className="total-row">
        <span>Total</span>
        <span>${(cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0) - 
          (couponApplied && couponInfo && couponStatus === 'valid' ? couponInfo.discount : 0)).toFixed(2)}</span>
      </div>
      
      {renderCouponSection()}
      
      <div className="benefits-section">
        <h3>What's Included</h3>
        <ul className="benefits-list">
          <li>✓ Full Access to All Purchased Content</li>
          <li>✓ Certificate of Completion</li>
          <li>✓ 1-Year Access to All Materials</li>
          <li>✓ Community Forum Access</li>
        </ul>
      </div>
    </div>
  );

  // Update the payment section to show error if coupon is invalid
  const renderPaymentSection = () => (
    <div className="card-section">
      <h2>Payment Method</h2>
      <div className="payment-info">
        <p>You'll be redirected to Stripe's secure payment page to complete your purchase.</p>
        {couponStatus === 'invalid' && (
          <p className="error-text">Please remove the invalid coupon before proceeding</p>
        )}
      </div>
      
      <button
        onClick={redirectToStripeCheckout}
        disabled={loading || redirectingToStripe || couponStatus === 'invalid'}
        className={`checkout-button ${couponStatus === 'invalid' ? 'disabled' : ''}`}
      >
        {redirectingToStripe ? 'Redirecting to secure payment...' : loading ? 'Processing...' : 'Proceed to Payment'}
      </button>
    </div>
  );

  // For non-logged in users, show auth forms
  if (!user) {
    return (
      <div className="checkout-container">
        <div className="checkout-header">
          <h1>Complete Your Purchase</h1>
          <p className="checkout-subtitle">Sign in to continue with your purchase</p>
        </div>
        
        <div className="checkout-grid">
          <div className="checkout-main">
            <div className="auth-card">
              <button 
                onClick={handleGoogleAuth} 
                className="google-auth-btn"
                disabled={loading}
              >
                <div className="google-icon">
                  <svg viewBox="0 0 24 24" width="18" height="18">
                    <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032 s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2 C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" 
                    fill="#4285F4"/>
                  </svg>
                </div>
                <span>{loading ? 'Processing...' : 'Continue with Google'}</span>
              </button>
              
              {authError && (
                <div className="auth-error">
                  {authError}
                </div>
              )}
              
              <div className="auth-info">
                <p>Sign in with your Google account to continue to checkout.</p>
              </div>
            </div>
          </div>
          
          <div className="checkout-sidebar">
            {renderOrderSummary()}
          </div>
        </div>
      </div>
    );
  }

  // For logged-in users, show the checkout form
  return (
    <div className="checkout-container">
      <div className="checkout-header">
        <h1>Complete Your Purchase</h1>
        <p className="checkout-subtitle">Review your order and proceed to payment</p>
      </div>
      
      <div className="checkout-grid">
        <div className="checkout-main">
          <div className="checkout-card">
            <div className="card-section">
              <h2>Contact Information</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="firstName">First Name</label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className={errors.firstName ? 'error' : ''}
                  />
                  {errors.firstName && <p className="error-text">{errors.firstName}</p>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="lastName">Last Name</label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className={errors.lastName ? 'error' : ''}
                  />
                  {errors.lastName && <p className="error-text">{errors.lastName}</p>}
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={errors.email ? 'error' : ''}
                />
                {errors.email && <p className="error-text">{errors.email}</p>}
              </div>
            </div>
            
            {renderPaymentSection()}
          </div>
        </div>
        
        <div className="checkout-sidebar">
          {renderOrderSummary()}
        </div>
      </div>
    </div>
  );
};

export default Checkout;