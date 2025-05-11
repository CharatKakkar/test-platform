// components/Checkout.js
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Checkout.css';
import stripeService from '../services/stripeService.js'; // Import the stripeService

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
    if (!formData.couponCode.trim()) {
      setErrors(prev => ({
        ...prev,
        couponCode: 'Please enter a coupon code'
      }));
      return;
    }

    setCouponLoading(true);
    setErrors(prev => ({...prev, couponCode: ''}));

    try {
      // Calculate discount based on cart total
      const subtotal = cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
      const couponCode = formData.couponCode.toUpperCase();
      
      // Map coupon codes to their respective promotion code IDs and discount percentages
      const couponMap = {
        'WELCOME50': {
          promotionCodeId: 'promo_1RNQyFDBBYanrPYmQ5vtWzgt',
          discountPercentage: 0.5 // 50% discount
        },
        'WELCOME20': {
          promotionCodeId: 'promo_1RNQyFDBBYanrPYmQ5vtWzgt', // Using the same promotion code for now
          discountPercentage: 0.2 // 20% discount
        }
      };

      const couponDetails = couponMap[couponCode];
      
      if (couponDetails) {
        const discount = subtotal * couponDetails.discountPercentage;
        setCouponApplied(true);
        setCouponInfo({
          valid: true,
          promotionCodeId: couponDetails.promotionCodeId,
          discount: discount,
          message: `Coupon applied successfully! You saved $${discount.toFixed(2)}`
        });
        setErrors(prev => ({...prev, couponCode: ''}));
      } else {
        setCouponApplied(false);
        setCouponInfo(null);
        setErrors(prev => ({
          ...prev,
          couponCode: 'Invalid coupon code'
        }));
      }
    } catch (error) {
      setCouponApplied(false);
      setCouponInfo(null);
      setErrors(prev => ({
        ...prev,
        couponCode: error.message || 'Error applying coupon'
      }));
    } finally {
      setCouponLoading(false);
    }
  };

  // Redirect to Stripe Checkout - UPDATED to use stripeService
  const redirectToStripeCheckout = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    setRedirectingToStripe(true);
    
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
        couponApplied: couponApplied.toString()
      };
      
      // Use stripeService to create checkout session with the promotion code ID
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
        couponApplied ? couponInfo.promotionCodeId : null, // Pass the promotion code ID instead of coupon code
        metadata
      );
      
      // Save checkout information to localStorage
      localStorage.setItem('checkoutInfo', JSON.stringify({
        cart: cart,
        customerInfo: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email
        },
        couponApplied: couponApplied,
        couponCode: formData.couponCode,
        discountAmount: couponInfo?.discount || 0,
        finalTotal: cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0) - (couponInfo?.discount || 0),
        sessionId: response.sessionId
      }));
      
      console.log('Redirecting to:', response.url);
      window.location.href = response.url;
    } catch (error) {
      console.error('Checkout error:', error);
      setErrors(prev => ({
        ...prev,
        checkout: error.message || 'Error processing checkout'
      }));
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
              
              {couponApplied && couponInfo && (
                <div className="discount-row">
                  <span>Discount ({formData.couponCode})</span>
                  <span>-${couponInfo.discount.toFixed(2)}</span>
                </div>
              )}
              
              <div className="total-row">
                <span>Total</span>
                <span>${(cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0) - (couponInfo?.discount || 0)).toFixed(2)}</span>
              </div>
              
              <div className="coupon-section">
                <div className="coupon-input-group">
                  <input
                    type="text"
                    name="couponCode"
                    placeholder="Enter coupon code"
                    value={formData.couponCode}
                    onChange={handleInputChange}
                    className={errors.couponCode ? 'error' : ''}
                    disabled={couponLoading || couponApplied}
                  />
                  <button
                    onClick={applyCoupon}
                    disabled={couponLoading || couponApplied || !formData.couponCode.trim()}
                    className={couponApplied ? 'applied' : ''}
                  >
                    {couponLoading ? 'Validating...' : couponApplied ? 'Applied' : 'Apply'}
                  </button>
                </div>
                {errors.couponCode && <p className="error-text">{errors.couponCode}</p>}
                {couponApplied && couponInfo && (
                  <p className="success-text">{couponInfo.message}</p>
                )}
              </div>
              
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
            
            <div className="card-section">
              <h2>Payment Method</h2>
              <div className="payment-info">
                <p>You'll be redirected to Stripe's secure payment page to complete your purchase.</p>
              </div>
              
              {errors.submit && (
                <div className="error-banner">
                  {errors.submit}
                </div>
              )}
              
              <button
                onClick={redirectToStripeCheckout}
                disabled={loading || redirectingToStripe}
                className="checkout-button"
              >
                {redirectingToStripe ? 'Redirecting to secure payment...' : loading ? 'Processing...' : 'Proceed to Payment'}
              </button>
            </div>
          </div>
        </div>
        
        <div className="checkout-sidebar">
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
            
            {couponApplied && couponInfo && (
              <div className="discount-row">
                <span>Discount ({formData.couponCode})</span>
                <span>-${couponInfo.discount.toFixed(2)}</span>
              </div>
            )}
            
            <div className="total-row">
              <span>Total</span>
              <span>${(cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0) - (couponInfo?.discount || 0)).toFixed(2)}</span>
            </div>
            
            <div className="coupon-section">
              <div className="coupon-input-group">
                <input
                  type="text"
                  name="couponCode"
                  placeholder="Enter coupon code"
                  value={formData.couponCode}
                  onChange={handleInputChange}
                  className={errors.couponCode ? 'error' : ''}
                  disabled={couponLoading || couponApplied}
                />
                <button
                  onClick={applyCoupon}
                  disabled={couponLoading || couponApplied || !formData.couponCode.trim()}
                  className={couponApplied ? 'applied' : ''}
                >
                  {couponLoading ? 'Validating...' : couponApplied ? 'Applied' : 'Apply'}
                </button>
              </div>
              {errors.couponCode && <p className="error-text">{errors.couponCode}</p>}
              {couponApplied && couponInfo && (
                <p className="success-text">{couponInfo.message}</p>
              )}
            </div>
            
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
        </div>
      </div>
    </div>
  );
};

export default Checkout;