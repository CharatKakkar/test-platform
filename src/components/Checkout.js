// components/Checkout.js
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createOrder, applyCoupon } from '../services/orderService';
import { getCart } from '../services/cartService';
import './Checkout.css';

const Checkout = ({ user }) => {
  const navigate = useNavigate();
  
  const [cart, setCart] = useState([]);
  const [examResults, setExamResults] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: user?.name?.split(' ')[0] || '',
    lastName: user?.name?.split(' ')[1] || '',
    email: user?.email || '',
    paymentMethod: 'credit',
    cardNumber: '',
    cardExpiry: '',
    cardCvc: '',
    couponCode: ''
  });
  
  // UI state
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [couponResponse, setCouponResponse] = useState(null);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);
  
  useEffect(() => {
    const fetchCartData = async () => {
      try {
        const cartData = await getCart();
        setCart(cartData);
        
        // If cart is empty, redirect to exams page
        if (!cartData || cartData.length === 0) {
          // Check if we have exam results from a demo
          const results = localStorage.getItem('examResults');
          if (!results) {
            navigate('/exams');
          } else {
            setExamResults(JSON.parse(results));
          }
        }
      } catch (error) {
        console.error('Error fetching cart:', error);
      }
    };
    
    fetchCartData();
  }, [navigate]);

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

  const handleApplyCoupon = async () => {
    if (!formData.couponCode) {
      setErrors(prev => ({
        ...prev,
        couponCode: 'Please enter a coupon code'
      }));
      return;
    }
    
    try {
      const response = await applyCoupon(formData.couponCode);
      setCouponResponse(response);
      
      if (!response.valid) {
        setErrors(prev => ({
          ...prev,
          couponCode: response.message
        }));
      }
    } catch (error) {
      console.error('Error applying coupon:', error);
      setErrors(prev => ({
        ...prev,
        couponCode: 'Error applying coupon'
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      // Calculate totals
      const subtotal = cart.reduce((total, item) => total + item.price, 0);
      const discountAmount = couponResponse?.valid 
        ? (couponResponse.discountType === 'fixed' 
          ? couponResponse.discountAmount 
          : subtotal * (couponResponse.discountPercentage / 100))
        : 0;
      const total = Math.max(0, subtotal - discountAmount);
      
      // Prepare order data
      const orderData = {
        items: cart,
        totalAmount: total,
        subtotal: subtotal,
        discountApplied: discountAmount,
        couponCode: couponResponse?.valid ? couponResponse.code : null,
        paymentMethod: formData.paymentMethod,
        billing: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email
        },
        paymentDetails: formData.paymentMethod === 'credit' ? {
          lastFour: formData.cardNumber.slice(-4),
          expiry: formData.cardExpiry
        } : null
      };
      
      // Create order in Firebase
      const orderResult = await createOrder(orderData);
      
      // Clear exam results from localStorage if present
      localStorage.removeItem('examResults');
      
      // Set order details and mark as complete
      setOrderDetails(orderResult);
      setOrderComplete(true);
      
    } catch (error) {
      console.error('Error creating order:', error);
      setErrors(prev => ({
        ...prev,
        submit: 'Error processing your order. Please try again.'
      }));
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const calculateSubtotal = () => {
    return cart.reduce((total, item) => total + item.price, 0);
  };
  
  const calculateDiscount = () => {
    if (!couponResponse?.valid) return 0;
    
    const subtotal = calculateSubtotal();
    return couponResponse.discountType === 'fixed' 
      ? couponResponse.discountAmount 
      : subtotal * (couponResponse.discountPercentage / 100);
  };
  
  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    return Math.max(0, subtotal - discount).toFixed(2);
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
              <span className="order-label">Order ID:</span> {orderDetails?.id || 'N/A'}
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
            
            {couponResponse?.valid && (
              <div className="flex justify-between mb-2 text-green-600">
                <span>Discount ({couponResponse.code})</span>
                <span>-${calculateDiscount().toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between font-bold mt-4 pt-4 border-t border-gray-200">
              <span>Total</span>
              <span>${calculateTotal()}</span>
            </div>
          </div>
        </div>
        
        <p className="mb-6">
          You will receive a confirmation email at {formData.email} with instructions to access your purchases.
        </p>
        
        <Link 
          to="/dashboard"
          className="btn btn-primary"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

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
                disabled={loading || cart.length === 0}
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
            
            {cart.length > 0 ? (
              <div>
                {cart.map(item => (
                  <div key={item.id} className="summary-item">
                    <span className="summary-item-title">{item.title}</span>
                    <span className="summary-item-price">${item.price.toFixed(2)}</span>
                  </div>
                ))}
                
                {couponResponse?.valid && (
                  <div className="summary-item summary-discount">
                    <span>Discount ({couponResponse.code})</span>
                    <span>-${calculateDiscount().toFixed(2)}</span>
                  </div>
                )}
                
                <div className="summary-total">
                  <span>Total</span>
                  <span>${calculateTotal()}</span>
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
                disabled={couponResponse?.valid}
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={couponResponse?.valid}
                className={`coupon-button ${couponResponse?.valid ? 'applied' : ''}`}
              >
                {couponResponse?.valid ? 'Applied' : 'Apply'}
              </button>
              {errors.couponCode && <p className="error-message">{errors.couponCode}</p>}
              {couponResponse?.valid && <p className="text-green-600 text-sm mt-1">{couponResponse.message}</p>}
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