// components/Checkout.js
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Checkout.css';
import purchasedExamsService from '../services/purchasedExamsService.js';


const Checkout = ({ cart = [], user, clearCart, removeFromCart, updateQuantity, cartTotal = 0, onLogin }) => {
  const navigate = useNavigate();
  const [examResults, setExamResults] = useState(null);
  const [activeTab, setActiveTab] = useState(user ? 'checkout' : 'login');
  
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
      paymentMethod: 'credit',
      cardNumber: '',
      cardExpiry: '',
      cardCvc: '',
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
  const [loading, setLoading] = useState(false);
  const [couponApplied, setCouponApplied] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [authError, setAuthError] = useState('');

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
    
    // Validate payment details if credit card is selected
    if (formData.paymentMethod === 'credit') {
      if (!formData.cardNumber.trim()) {
        newErrors.cardNumber = 'Card number is required';
      } else if (!/^\d{16}$/.test(formData.cardNumber.replace(/\s/g, ''))) {
        newErrors.cardNumber = 'Please enter a valid 16-digit card number';
      }
      
      if (!formData.cardExpiry.trim()) {
        newErrors.cardExpiry = 'Expiration date is required';
      } else if (!/^\d{2}\/\d{2}$/.test(formData.cardExpiry)) {
        newErrors.cardExpiry = 'Please use MM/YY format';
      }
      
      if (!formData.cardCvc.trim()) {
        newErrors.cardCvc = 'Security code is required';
      } else if (!/^\d{3,4}$/.test(formData.cardCvc)) {
        newErrors.cardCvc = 'Please enter a valid security code';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const applyCoupon = () => {
    // Simple coupon validation
    if (formData.couponCode.toUpperCase() === 'DEMO50') {
      setCouponApplied(true);
      setErrors(prev => ({...prev, couponCode: ''}));
    } else {
      setErrors(prev => ({
        ...prev,
        couponCode: 'Invalid coupon code'
      }));
    }
  };

// Inside the Checkout component

const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!validateForm()) return;
  
  setLoading(true);
  
  // Simulate API call to process payment
  try {
    // Process payment (in a real app, this would integrate with a payment processor)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mark exams as purchased in Firebase
    if (cart && cart.length > 0) {
      const purchaseSuccess = await purchasedExamsService.processPurchase(cart);
      if (!purchaseSuccess) {
        throw new Error('Failed to process purchase');
      }
    }
    
    setOrderComplete(true);
    
    // Clear cart after successful checkout
    clearCart();
    localStorage.removeItem('examResults');
  } catch (error) {
    setErrors(prev => ({
      ...prev,
      submit: 'Payment processing failed. Please try again.'
    }));
  } finally {
    setLoading(false);
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

  if (orderComplete) {
    return (
      <div className="order-complete-container">
        <div className="success-icon">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold mb-2">Order Complete!</h1>
        <p className="text-gray-600 mb-6">Thank you for your purchase</p>
        
        <div className="order-details">
          <div className="order-section">
            <p>
              <span className="order-label">Name:</span> {formData.firstName} {formData.lastName}
            </p>
            <p>
              <span className="order-label">Email:</span> {formData.email}
            </p>
            <p>
              <span className="order-label">Order ID:</span> ORD-{Math.random().toString(36).substring(2, 10).toUpperCase()}
            </p>
          </div>
          
          <div className="order-section">
            <h3 className="font-medium mb-3">Your Purchase</h3>
            
            {cart.map(item => (
              <div key={item.id} className="flex justify-between mb-2">
                <span>{item.title}</span>
                <span>${item.price.toFixed(2)}</span>
              </div>
            ))}
            
            {couponApplied && (
              <div className="flex justify-between mb-2 text-green-600">
                <span>Discount (DEMO50)</span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between font-bold mt-4 pt-4 border-t border-gray-200">
              <span>Total</span>
              <span>${finalTotal}</span>
            </div>
          </div>
        </div>
        
        <p className="mb-6">
          You will receive a confirmation email at {formData.email} with instructions to access your purchases.
        </p>
        
        <Link 
          to="/"
          className="btn btn-primary"
        >
          Return to Homepage
        </Link>
      </div>
    );
  }

  // For non-logged in users, show auth forms
  if (!user) {
    return (
      <div className="checkout-container">
        <h1 className="text-2xl font-bold mb-6 text-center">Complete Your Purchase</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Auth forms - 3 columns */}
          <div className="md:col-span-3 bg-white rounded-lg shadow-md p-6">
            <div className="auth-tabs">
              <button 
                className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
                onClick={() => setActiveTab('login')}
              >
                Login
              </button>
              <button 
                className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`}
                onClick={() => setActiveTab('register')}
              >
                Register
              </button>
            </div>
            
            {authError && (
              <div className="bg-red-50 text-red-600 p-4 mb-4 rounded-md">
                {authError}
              </div>
            )}
            
            {/* Google Login Button for either tab */}
            <div className="social-auth-container mt-6 mb-4">
              <button 
                onClick={() => handleGoogleAuth(activeTab === 'login')} 
                className="google-auth-btn"
                disabled={loading}
                type="button"
              >
                <div className="google-icon">
                  <svg viewBox="0 0 24 24" width="18" height="18">
                    <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032 s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2 C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" 
                    fill="#4285F4"/>
                  </svg>
                </div>
                <span>{loading ? 'Processing...' : activeTab === 'login' ? 'Continue with Google' : 'Sign up with Google'}</span>
              </button>
            </div>
            
            <div className="auth-info-text text-center mb-4 text-gray-600">
              <p>{activeTab === 'login' ? 'Login with your Google account to continue to checkout.' : 'Create an account with Google to checkout faster in the future.'}</p>
            </div>
          </div>
          
          {/* Order summary - 2 columns */}
          <div className="md:col-span-2">
            <div className="order-summary">
              <h2 className="summary-title">Order Summary</h2>
              
              {cart.length > 0 ? (
                <div>
                  {cart.map(item => (
                    <div key={item.id} className="summary-item">
                      <span className="summary-item-title">{item.title}</span>
                      <span className="summary-item-price">${item.price.toFixed(2)}</span>
                    </div>
                  ))}
                  
                  {couponApplied && (
                    <div className="summary-item summary-discount">
                      <span>Discount (DEMO50)</span>
                      <span>-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="summary-total">
                    <span>Total</span>
                    <span>${finalTotal}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500">Your cart is empty</p>
                  <Link to="/exams" className="text-blue-600 font-medium mt-2 inline-block">Browse Exams</Link>
                </div>
              )}
              
              <div className="coupon-container">
                <input
                  type="text"
                  name="couponCode"
                  placeholder="Coupon Code"
                  value={formData.couponCode}
                  onChange={handleInputChange}
                  className={`coupon-input ${errors.couponCode ? 'error' : ''}`}
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  disabled={couponApplied}
                  className={`coupon-button ${couponApplied ? 'applied' : ''}`}
                >
                  {couponApplied ? 'Applied' : 'Apply'}
                </button>
                {errors.couponCode && <p className="error-message">{errors.couponCode}</p>}
                {couponApplied && <p className="text-green-600 text-sm mt-1">Coupon applied successfully!</p>}
                <p className="text-gray-500 text-xs mt-2">Try code "DEMO50" for $50 off</p>
              </div>
              
              {examResults && (
                <div className="score-box">
                  <h3 className="score-title">Your Demo Exam Score</h3>
                  <p className="score-value">
                    Score: {examResults.score} out of {examResults.totalQuestions} ({examResults.percentage}%)
                  </p>
                  <div className="score-bar">
                    <div 
                      className={`score-progress ${examResults.percentage >= 70 ? 'pass' : 'fail'}`}
                      style={{ width: `${examResults.percentage}%` }}
                    ></div>
                  </div>
                  <p className="score-message">
                    {examResults.percentage >= 70 
                      ? 'Great job! You are ready for the full course.'
                      : 'The full course will help you improve your skills!'}
                  </p>
                </div>
              )}
              
              <div className="benefits-list">
                <h3 className="font-semibold mb-3">What You'll Get</h3>
                <div className="benefit-item">
                  <span className="benefit-icon">✓</span>
                  <span>Full Access to All Purchased Content</span>
                </div>
                <div className="benefit-item">
                  <span className="benefit-icon">✓</span>
                  <span>Certificate of Completion</span>
                </div>
                <div className="benefit-item">
                  <span className="benefit-icon">✓</span>
                  <span>1-Year Access to All Materials</span>
                </div>
                <div className="benefit-item">
                  <span className="benefit-icon">✓</span>
                  <span>Community Forum Access</span>
                </div>
              </div>
              
              <div className="mt-6 text-sm text-gray-600">
                <p>
                  By completing your purchase, you agree to our <a href="#" className="text-blue-600 hover:underline">Terms of Service</a> and <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // For logged-in users, show the regular checkout form
  return (
    <div className="checkout-container">
      <h1 className="text-2xl font-bold mb-8 text-center">Complete Your Purchase</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Your Information</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="form-group">
                  <label className="form-label" htmlFor="firstName">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className={`form-input ${errors.firstName ? 'error' : ''}`}
                  />
                  {errors.firstName && <p className="error-message">{errors.firstName}</p>}
                </div>
                
                <div className="form-group">
                  <label className="form-label" htmlFor="lastName">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className={`form-input ${errors.lastName ? 'error' : ''}`}
                  />
                  {errors.lastName && <p className="error-message">{errors.lastName}</p>}
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`form-input ${errors.email ? 'error' : ''}`}
                />
                {errors.email && <p className="error-message">{errors.email}</p>}
              </div>
              
              <div className="border-t border-gray-200 pt-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Payment Method</h2>
                
                <div className="payment-methods">
                  <div className="payment-option">
                    <input
                      id="credit"
                      name="paymentMethod"
                      type="radio"
                      value="credit"
                      checked={formData.paymentMethod === 'credit'}
                      onChange={handleInputChange}
                      className="payment-radio"
                    />
                    <label htmlFor="credit" className="text-gray-700">
                      Credit / Debit Card
                    </label>
                  </div>
                  
                  <div className="payment-option">
                    <input
                      id="paypal"
                      name="paymentMethod"
                      type="radio"
                      value="paypal"
                      checked={formData.paymentMethod === 'paypal'}
                      onChange={handleInputChange}
                      className="payment-radio"
                    />
                    <label htmlFor="paypal" className="text-gray-700">
                      PayPal
                    </label>
                  </div>
                </div>
                
                {formData.paymentMethod === 'credit' && (
                  <div className="payment-details">
                    <div className="form-group">
                      <label className="form-label" htmlFor="cardNumber">
                        Card Number
                      </label>
                      <input
                        id="cardNumber"
                        name="cardNumber"
                        type="text"
                        maxLength="19"
                        placeholder="1234 5678 9012 3456"
                        value={formData.cardNumber}
                        onChange={handleInputChange}
                        className={`form-input ${errors.cardNumber ? 'error' : ''}`}
                      />
                      {errors.cardNumber && <p className="error-message">{errors.cardNumber}</p>}
                    </div>
                    
                    <div className="card-row">
                      <div className="form-group">
                        <label className="form-label" htmlFor="cardExpiry">
                          Expiry Date (MM/YY)
                        </label>
                        <input
                          id="cardExpiry"
                          name="cardExpiry"
                          type="text"
                          placeholder="MM/YY"
                          maxLength="5"
                          value={formData.cardExpiry}
                          onChange={handleInputChange}
                          className={`form-input ${errors.cardExpiry ? 'error' : ''}`}
                        />
                        {errors.cardExpiry && <p className="error-message">{errors.cardExpiry}</p>}
                      </div>
                      
                      <div className="form-group">
                        <label className="form-label" htmlFor="cardCvc">
                          CVC
                        </label>
                        <input
                          id="cardCvc"
                          name="cardCvc"
                          type="text"
                          placeholder="123"
                          maxLength="4"
                          value={formData.cardCvc}
                          onChange={handleInputChange}
                          className={`form-input ${errors.cardCvc ? 'error' : ''}`}
                        />
                        {errors.cardCvc && <p className="error-message">{errors.cardCvc}</p>}
                      </div>
                    </div>
                  </div>
                )}
                
                {formData.paymentMethod === 'paypal' && (
                  <div className="payment-details text-center">
                    <p className="mb-4">You will be redirected to PayPal to complete your purchase after submission.</p>
                    <div className="flex justify-center">
                      <img src="/api/placeholder/120/40" alt="PayPal" className="h-10" />
                    </div>
                  </div>
                )}
              </div>
              
              {errors.submit && (
                <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-md">
                  {errors.submit}
                </div>
              )}
              
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-full"
              >
                {loading ? 'Processing...' : 'Complete Purchase'}
              </button>
            </form>
          </div>
        </div>
        
        <div className="lg:col-span-1">
          <div className="order-summary mb-6">
            <h2 className="summary-title">Order Summary</h2>
            
            <div>
              {cart.map(item => (
                <div key={item.id} className="summary-item">
                  <span className="summary-item-title">{item.title}</span>
                  <span className="summary-item-price">${item.price.toFixed(2)}</span>
                </div>
              ))}
              
              {couponApplied && (
                <div className="summary-item summary-discount">
                  <span>Discount (DEMO50)</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              
              <div className="summary-total">
                <span>Total</span>
                <span>${finalTotal}</span>
              </div>
            </div>
            
            <div className="coupon-container">
              <input
                type="text"
                name="couponCode"
                placeholder="Coupon Code"
                value={formData.couponCode}
                onChange={handleInputChange}
                className={`coupon-input ${errors.couponCode ? 'error' : ''}`}
              />
              <button
                type="button"
                onClick={applyCoupon}
                disabled={couponApplied}
                className={`coupon-button ${couponApplied ? 'applied' : ''}`}
              >
                {couponApplied ? 'Applied' : 'Apply'}
              </button>
              {errors.couponCode && <p className="error-message">{errors.couponCode}</p>}
              {couponApplied && <p className="text-green-600 text-sm mt-1">Coupon applied successfully!</p>}
              <p className="text-gray-500 text-xs mt-2">Try code "DEMO50" for $50 off</p>
            </div>
            
            {examResults && (
              <div className="score-box">
                <h3 className="score-title">Your Demo Exam Score</h3>
                <p className="score-value">
                  Score: {examResults.score} out of {examResults.totalQuestions} ({examResults.percentage}%)
                </p>
                <div className="score-bar">
                  <div 
                    className={`score-progress ${examResults.percentage >= 70 ? 'pass' : 'fail'}`}
                    style={{ width: `${examResults.percentage}%` }}
                  ></div>
                </div>
                <p className="score-message">
                  {examResults.percentage >= 70 
                    ? 'Great job! You are ready for the full course.'
                    : 'The full course will help you improve your skills!'}
                </p>
              </div>
            )}
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="font-semibold mb-3">What You'll Get</h3>
            <div className="benefits-list">
              <div className="benefit-item">
                <span className="benefit-icon">✓</span>
                <span>Full Access to All Purchased Content</span>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">✓</span>
                <span>Certificate of Completion</span>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">✓</span>
                <span>1-Year Access to All Materials</span>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">✓</span>
                <span>Community Forum Access</span>
              </div>
            </div>
            
            <div className="border-t border-gray-200 mt-4 pt-4">
              <h3 className="font-semibold mb-3">Secure Checkout</h3>
              <p className="text-sm text-gray-600 mb-4">
                Your payment information is processed securely. We do not store credit card details.
              </p>
              <div className="flex justify-center space-x-2">
                <img src="/api/placeholder/40/25" alt="Visa" className="h-8" />
                <img src="/api/placeholder/40/25" alt="Mastercard" className="h-8" />
                <img src="/api/placeholder/40/25" alt="Amex" className="h-8" />
                <img src="/api/placeholder/40/25" alt="PayPal" className="h-8" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;