import React, { useEffect, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';

const ThankYouPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Get data passed from the PaymentStatusRouter via router state
    const { sessionId, sessionData, purchaseDetails, purchasedItems, metadata } = location.state || {};
    
    if (sessionData) {
      // If we have session data from router state, use it
      setOrderDetails({
        ...sessionData,
        purchases: purchaseDetails || [],
        purchasedItems: purchasedItems || [],
        metadata: metadata || {}
      });
      setLoading(false);
    }
  }, [location, navigate]);
  
  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading order details...</p>
      </div>
    );
  }
  
  if (!orderDetails) {
    return (
      <div className="error-state">
        <h2>Order Details Not Found</h2>
        <p>We couldn't find information about your order.</p>
        <Link to="/" className="primary-button">Return to Home</Link>
      </div>
    );
  }

  // Calculate subtotal from purchased items
  const subtotal = orderDetails.purchasedItems.reduce((sum, item) => {
    return sum + (item.price * (item.quantity || 1));
  }, 0);

  // Get discount information from metadata
  const discountAmount = orderDetails.metadata?.amount_discount ? 
    parseFloat(orderDetails.metadata.amount_discount) / 100 : 0;
  const hasDiscount = discountAmount > 0;
  const couponCode = orderDetails.metadata?.couponCode;
  
  return (
    <div className="thank-you-container">
      <div className="success-icon">
        <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M22 4L12 14.01l-3-3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      
      <h1>Thank You for Your Purchase!</h1>
      <p className="confirmation-message">
        Your order has been successfully processed. You'll receive a confirmation email shortly at {orderDetails.customer?.email}.
      </p>
      
      <div className="order-details">
        <h2>Order Summary</h2>
        <div className="order-info">
          <div className="info-row">
            <span>Order Date:</span>
            <span>{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          {orderDetails.customer && (
            <>
              <div className="info-row">
                <span>Email:</span>
                <span>{orderDetails.customer.email}</span>
              </div>
              <div className="info-row">
                <span>Name:</span>
                <span>{orderDetails.customer.name}</span>
              </div>
            </>
          )}
        </div>
        
        <h3>Purchased Items</h3>
        <div className="purchased-items">
          {orderDetails.purchasedItems?.length > 0 ? (
            <>
              {orderDetails.purchasedItems.map((item, index) => (
                <div key={index} className="purchased-item">
                  <h4>{item.name || item.title}</h4>
                  <div className="purchase-details">
                    <div className="detail-row">
                      <span>Category:</span>
                      <span>{item.category || 'Uncategorized'}</span>
                    </div>
                    <div className="detail-row">
                      <span>Price:</span>
                      <span>${item.price.toFixed(2)}</span>
                    </div>
                    <div className="detail-row">
                      <span>Quantity:</span>
                      <span>{item.quantity || 1}</span>
                    </div>
                    <div className="detail-row">
                      <span>Subtotal:</span>
                      <span>${((item.price * (item.quantity || 1)).toFixed(2))}</span>
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="order-summary">
                <div className="summary-row">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {hasDiscount && (
                  <>
                    <div className="summary-row coupon">
                      <span>Coupon Applied:</span>
                      <span>{couponCode}</span>
                    </div>
                    <div className="summary-row discount">
                      <span>Discount:</span>
                      <span>-${discountAmount.toFixed(2)}</span>
                    </div>
                  </>
                )}
                <div className="summary-row total">
                  <span>Total:</span>
                  <span>${(subtotal - discountAmount).toFixed(2)}</span>
                </div>
              </div>
            </>
          ) : (
            <p>No items found in this order.</p>
          )}
        </div>
      </div>
      
      <div className="action-buttons">
        <Link to="/purchased" className="primary-button">
          View My Purchases
        </Link>
        <Link to="/" className="secondary-button">
          Return to Home
        </Link>
      </div>
      
      <style jsx>{`
        .thank-you-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
        }
        
        .success-icon {
          color: #10b981;
          margin: 0 auto;
          text-align: center;
          margin-bottom: 1.5rem;
        }
        
        h1, h2, h3 {
          text-align: center;
        }
        
        .confirmation-message {
          text-align: center;
          font-size: 1.1rem;
          margin-bottom: 2rem;
        }
        
        .order-details {
          background-color: #f8fafc;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 2rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .purchased-items {
          margin-top: 1rem;
        }
        
        .purchased-item {
          background-color: white;
          border-radius: 6px;
          padding: 1rem;
          margin-bottom: 1rem;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }
        
        .purchased-item h4 {
          margin-top: 0;
          margin-bottom: 0.5rem;
          color: #1e40af;
        }
        
        .purchase-details {
          font-size: 0.9rem;
        }
        
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 0.25rem 0;
        }
        
        .order-summary {
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 2px solid #e2e8f0;
        }
        
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          font-size: 1rem;
        }
        
        .summary-row.coupon {
          color: #2563eb;
          font-weight: 500;
        }
        
        .summary-row.discount {
          color: #10b981;
          font-weight: bold;
        }
        
        .summary-row.total {
          font-weight: bold;
          font-size: 1.1rem;
          border-top: 1px solid #e2e8f0;
          margin-top: 0.5rem;
          padding-top: 0.5rem;
        }
        
        .action-buttons {
          display: flex;
          justify-content: center;
          gap: 1rem;
          margin-top: 2rem;
        }
        
        .primary-button, .secondary-button {
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.2s;
        }
        
        .primary-button {
          background-color: #2563eb;
          color: white;
        }
        
        .primary-button:hover {
          background-color: #1d4ed8;
        }
        
        .secondary-button {
          background-color: #e2e8f0;
          color: #1e293b;
        }
        
        .secondary-button:hover {
          background-color: #cbd5e1;
        }
        
        .loading, .error-state {
          text-align: center;
          padding: 3rem;
        }
        
        .spinner {
          border: 4px solid rgba(0, 0, 0, 0.1);
          border-radius: 50%;
          border-top: 4px solid #3498db;
          width: 40px;
          height: 40px;
          margin: 0 auto 1rem;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ThankYouPage;