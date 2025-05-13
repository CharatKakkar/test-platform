// components/Cart.js with fixed layout
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import stripeService from '../services/stripeService';
import { auth } from '../firebase';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

const Cart = ({ cart = [], removeFromCart, clearCart, cartTotal = 0, isAuthenticated }) => {
  const [notification, setNotification] = useState({ show: false, message: '' });
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponInfo, setCouponInfo] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [loading, setLoading] = useState(false);

  // Get current user from auth
  const user = auth.currentUser;

  const handleRemoveFromCart = (item) => {
    removeFromCart(item.id);
    
    // Show notification
    setNotification({
      show: true,
      message: `${item.title} removed from cart!`
    });
    
    // Hide notification after 3 seconds
    setTimeout(() => {
      setNotification({ show: false, message: '' });
    }, 3000);
  };

  const handleClearCart = () => {
    clearCart();
    
    // Show notification
    setNotification({
      show: true,
      message: `Cart has been cleared`
    });
    
    // Hide notification after 3 seconds
    setTimeout(() => {
      setNotification({ show: false, message: '' });
    }, 3000);
  };

  const handleApplyCoupon = async () => {
    // Reset states
    setCouponLoading(true);
    setCouponError('');

    try {
      // Basic validation
      const code = couponCode.trim().toUpperCase();
      if (!code) {
        setCouponError('Please enter a coupon code');
        return;
      }

      // Validate code format (alphanumeric only)
      if (!/^[A-Z0-9]+$/.test(code)) {
        setCouponError('Coupon code can only contain letters and numbers');
        return;
      }

      // Validate minimum length
      if (code.length < 4) {
        setCouponError('Coupon code must be at least 4 characters');
        return;
      }

      // Validate maximum length
      if (code.length > 20) {
        setCouponError('Coupon code cannot exceed 20 characters');
        return;
      }

      // Check if cart is empty
      if (cart.length === 0) {
        setCouponError('Add items to cart before applying a coupon');
        return;
      }

      // Check if cart total is 0
      if (cartTotal <= 0) {
        setCouponError('Cart total must be greater than 0');
        return;
      }

      // Check if a coupon is already applied
      if (couponApplied) {
        setCouponError('Please remove the current coupon before applying a new one');
        return;
      }

      // Validate coupon with Stripe service
      const result = await stripeService.validateCoupon(code, cartTotal);
      
      if (result.valid) {
        // All validations passed, apply the coupon
        const couponInfo = {
          code: code,
          type: result.type,
          value: result.value,
          discount: result.discount,
          stripeCouponId: result.stripeCouponId
        };
        
        setCouponApplied(true);
        setCouponInfo(couponInfo);
        setNotification({
          show: true,
          message: result.message
        });

        // Store coupon info in localStorage for persistence
        localStorage.setItem('appliedCoupon', JSON.stringify({
          code: code,
          info: couponInfo,
          appliedAt: new Date().toISOString()
        }));
      } else {
        setCouponApplied(false);
        setCouponInfo(null);
        setCouponError(result.message || 'Invalid coupon code');
      }
    } catch (error) {
      setCouponApplied(false);
      setCouponInfo(null);
      setCouponError(error.message || 'Error applying coupon');
    } finally {
      setCouponLoading(false);
    }
  };

  // Add useEffect to restore coupon from localStorage
  useEffect(() => {
    const savedCoupon = localStorage.getItem('appliedCoupon');
    if (savedCoupon) {
      try {
        const { code, info, appliedAt } = JSON.parse(savedCoupon);
        // Check if coupon is still valid (not expired)
        const appliedDate = new Date(appliedAt);
        const now = new Date();
        const hoursSinceApplied = (now - appliedDate) / (1000 * 60 * 60);
        
        // Only restore if applied within last 24 hours
        if (hoursSinceApplied < 24) {
          setCouponCode(code);
          setCouponApplied(true);
          setCouponInfo(info);
        } else {
          // Clear expired coupon
          localStorage.removeItem('appliedCoupon');
        }
      } catch (error) {
        console.error('Error restoring coupon:', error);
        localStorage.removeItem('appliedCoupon');
      }
    }
  }, []);

  // Update handleRemoveCoupon to also clear localStorage
  const handleRemoveCoupon = () => {
    setCouponApplied(false);
    setCouponInfo(null);
    setCouponCode('');
    setCouponError('');
    localStorage.removeItem('appliedCoupon');
  };

  // Calculate final total with coupon discount
  const finalTotal = couponApplied && couponInfo ? 
    (cartTotal - couponInfo.discount).toFixed(2) : 
    cartTotal.toFixed(2);

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      window.location.href = '/login?redirect=/cart';
      return;
    }

    try {
      setLoading(true);
      const customerInfo = {
        email: user?.email || '',
        firstName: user?.displayName?.split(' ')[0] || '',
        lastName: user?.displayName?.split(' ').slice(1).join(' ') || ''
      };
      
      // Calculate totals
      const subtotal = cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
      const finalTotal = couponApplied && couponInfo ? 
        (subtotal - couponInfo.discount).toFixed(2) : 
        subtotal.toFixed(2);

      // Prepare metadata
      const metadata = {
        userId: user?.uid || 'guest',
        firstName: customerInfo.firstName || '',
        lastName: customerInfo.lastName || '',
        email: customerInfo.email || '',
        couponApplied: couponApplied ? 'true' : 'false',
        couponCode: couponApplied ? couponCode : '',
        amount_total: (parseFloat(finalTotal) * 100).toString(),
        amount_subtotal: (subtotal * 100).toString(),
        amount_discount: (couponApplied && couponInfo ? couponInfo.discount * 100 : 0).toString(),
        amount_tax: '0',
        amount_shipping: '0'
      };

      if (couponApplied && couponInfo) {
        metadata.couponType = couponInfo.type || '';
        metadata.couponValue = (couponInfo.value || 0).toString();
        metadata.couponDiscount = (couponInfo.discount || 0).toString();
      }
      
      // Get the Stripe coupon ID if a coupon is applied
      const promotionCodeId = couponApplied && couponInfo ? couponInfo.stripeCouponId : null;
      
      console.log('Creating checkout session with:', {
        promotionCodeId,
        couponInfo,
        couponApplied,
        stripeCouponId: couponInfo?.stripeCouponId // Debug log
      });
      
      // Create checkout session
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
      
      // Save checkout information to localStorage
      localStorage.setItem('checkoutInfo', JSON.stringify({
        cart: cart,
        customerInfo,
        couponApplied,
        couponCode: couponApplied ? couponCode : '',
        couponInfo: couponApplied ? couponInfo : null,
        discountAmount: couponApplied && couponInfo ? couponInfo.discount : 0,
        subtotal: subtotal,
        finalTotal: parseFloat(finalTotal),
        sessionId: response.sessionId
      }));
      
      // Redirect to Stripe checkout
      window.location.href = response.url;
    } catch (error) {
      console.error('Checkout error:', error);
      setNotification({
        show: true,
        message: error.message || 'Error processing checkout'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4" style={{ maxWidth: '1200px' }}>
      <h1 className="text-2xl font-bold mb-6">Your Shopping Cart</h1>
      
      {/* Notification */}
      {notification.show && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: '#4CAF50',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '4px',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
          zIndex: 1000
        }}>
          <p>{notification.message}</p>
        </div>
      )}
      
      {cart.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '50px 0',
          backgroundColor: '#f9f9f9',
          borderRadius: '8px',
          marginBottom: '30px'
        }}>
          <div style={{ fontSize: '24px', color: '#666', marginBottom: '20px' }}>Your cart is empty</div>
          <p style={{ color: '#888', marginBottom: '20px' }}>Browse our catalog and discover certification exams to enhance your skills.</p>
          <Link 
            to="/exams" 
            style={{
              display: 'inline-block',
              padding: '10px 20px',
              backgroundColor: '#4a90e2',
              color: 'white',
              borderRadius: '4px',
              textDecoration: 'none',
              fontWeight: 'bold'
            }}
          >
            Browse Exams
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '10px 20px',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
            fontWeight: 'bold'
          }}>
            <div style={{ flex: '3' }}>Product</div>
            <div style={{ flex: '1', textAlign: 'center' }}>Price</div>
            <div style={{ flex: '1', textAlign: 'center' }}>Quantity</div>
            <div style={{ flex: '1', textAlign: 'center' }}>Total</div>
            <div style={{ flex: '0 0 40px' }}></div>
          </div>
          
          {/* Cart items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {cart.map((item) => (
              <div 
                key={item.id} 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '15px',
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
                }}
              >
                {/* Product */}
                <div style={{ flex: '3', display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <img 
                    src={item.thumbnail || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 160 100'%3E%3Crect width='160' height='100' fill='%234a90e2'/%3E%3Ctext x='80' y='50' font-family='Arial' font-size='18' text-anchor='middle' fill='white'%3EExam%3C/text%3E%3C/svg%3E"} 
                    alt={item.title} 
                    style={{ width: '80px', height: '50px', objectFit: 'cover', borderRadius: '4px' }}
                  />
                  <div>
                    <h3 style={{ fontWeight: 'bold', marginBottom: '5px' }}>{item.title}</h3>
                    <p style={{ color: '#666', fontSize: '14px' }}>{item.category}</p>
                  </div>
                </div>
                
                {/* Price */}
                <div style={{ flex: '1', textAlign: 'center' }}>
                  ${item.price.toFixed(2)}
                </div>
                
                {/* Quantity */}
                <div style={{ flex: '1', textAlign: 'center' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <span style={{ margin: '0 10px', minWidth: '20px', textAlign: 'center' }}>
                      {item.quantity || 1}
                    </span>
                  </div>
                </div>
                
                {/* Total */}
                <div style={{ flex: '1', textAlign: 'center', fontWeight: 'bold' }}>
                  ${(item.price * (item.quantity || 1)).toFixed(2)}
                </div>
                
                {/* Remove button */}
                <div style={{ flex: '0 0 40px', textAlign: 'right' }}>
                  <button 
                    onClick={() => handleRemoveFromCart(item)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#e74c3c',
                      fontSize: '18px',
                      cursor: 'pointer',
                      padding: '5px'
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {/* Cart actions and summary */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginTop: '20px'
          }}>
            {/* Actions */}
            <div>
              <button 
                onClick={handleClearCart}
                style={{
                  padding: '10px 15px',
                  backgroundColor: '#f8f8f8',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  color: '#666',
                  cursor: 'pointer'
                }}
              >
                Clear Cart
              </button>
              <Link 
                to="/exams"
                style={{
                  display: 'inline-block',
                  marginLeft: '10px',
                  padding: '10px 15px',
                  backgroundColor: '#f8f8f8',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  color: '#666',
                  textDecoration: 'none'
                }}
              >
                Continue Shopping
              </Link>
            </div>
            
            {/* Summary */}
            <div style={{ 
              width: '350px',
              padding: '20px',
              backgroundColor: '#f9f9f9',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
            }}>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: 'bold', 
                marginBottom: '15px',
                paddingBottom: '10px',
                borderBottom: '1px solid #eee'
              }}>
                Order Summary
              </h3>
              
              <div style={{ marginBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span>Subtotal ({cart.length} items)</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
                
                {/* Coupon Section */}
                <div style={{ marginBottom: '15px' }}>
                  {!couponApplied ? (
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="Enter coupon code"
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      />
                      <button
                        onClick={handleApplyCoupon}
                        disabled={couponLoading}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#4a90e2',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          opacity: couponLoading ? 0.7 : 1
                        }}
                      >
                        {couponLoading ? 'Applying...' : 'Apply'}
                      </button>
                    </div>
                  ) : (
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      backgroundColor: '#e8f5e9',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      marginBottom: '10px'
                    }}>
                      <span style={{ color: '#2e7d32' }}>
                        Coupon applied: {couponCode.toUpperCase()}
                      </span>
                      <button
                        onClick={handleRemoveCoupon}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2e7d32',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  {couponError && (
                    <div style={{ color: '#d32f2f', fontSize: '14px', marginTop: '5px' }}>
                      {couponError}
                    </div>
                  )}
                </div>
                
                {couponApplied && couponInfo && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    color: '#2e7d32',
                    marginBottom: '10px'
                  }}>
                    <span>Discount</span>
                    <span>-${couponInfo.discount.toFixed(2)}</span>
                  </div>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', fontSize: '14px' }}>
                  <span>Taxes</span>
                  <span>Calculated at checkout</span>
                </div>
              </div>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                fontWeight: 'bold',
                fontSize: '18px',
                padding: '15px 0',
                borderTop: '1px solid #eee',
                borderBottom: '1px solid #eee',
                marginBottom: '20px'
              }}>
                <span>Total</span>
                <span>${finalTotal}</span>
              </div>
              
              <button
                onClick={handleCheckout}
                disabled={loading || (couponApplied && !couponInfo)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  textAlign: 'center',
                  borderRadius: '4px',
                  textDecoration: 'none',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? 'Processing...' : isAuthenticated ? 'Proceed to Payment' : 'Sign in to Checkout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;