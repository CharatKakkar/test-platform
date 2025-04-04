// components/Cart.js with fixed layout
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Cart = ({ cart = [], removeFromCart, updateQuantity, clearCart, cartTotal = 0, isAuthenticated }) => {
  const [notification, setNotification] = useState({ show: false, message: '' });

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

  const handleQuantityChange = (item, newQuantity) => {
    updateQuantity(item.id, newQuantity);
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
                    <button 
                      onClick={() => handleQuantityChange(item, (item.quantity || 1) - 1)}
                      disabled={(item.quantity || 1) <= 1}
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        border: '1px solid #ddd',
                        background: (item.quantity || 1) <= 1 ? '#f5f5f5' : 'white',
                        color: (item.quantity || 1) <= 1 ? '#aaa' : '#333',
                        cursor: (item.quantity || 1) <= 1 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      -
                    </button>
                    <span style={{ margin: '0 10px', minWidth: '20px', textAlign: 'center' }}>
                      {item.quantity || 1}
                    </span>
                    <button 
                      onClick={() => handleQuantityChange(item, (item.quantity || 1) + 1)}
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        border: '1px solid #ddd',
                        background: 'white',
                        cursor: 'pointer'
                      }}
                    >
                      +
                    </button>
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
                <span>${cartTotal.toFixed(2)}</span>
              </div>
              
              {isAuthenticated ? (
                <Link
                  to="/checkout"
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
                    fontSize: '16px'
                  }}
                >
                  Proceed to Checkout
                </Link>
              ) : (
                <Link
                  to="/checkout"
                  state={{ from: '/checkout' }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#4a90e2',
                    color: 'white',
                    textAlign: 'center',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    fontSize: '16px'
                  }}
                >
                   Checkout
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;