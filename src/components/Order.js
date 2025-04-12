// components/Order.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import purchasedExamsService from '../services/purchasedExamsService';
import './Orders.css';

function Order({ isAuthenticated, user }) {
  const navigate = useNavigate();
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Redirect if not authenticated
    if (!isAuthenticated || !user) {
      navigate('/login', { state: { from: '/order' } });
      return;
    }

    // Use the service to load purchase history
    const loadPurchaseHistory = async () => {
      try {
        setLoading(true);
        
        // Get purchase history directly from the service
        const history = await purchasedExamsService.getPurchaseHistory();
        console.log('Purchase history loaded:', history);
        
        setPurchaseHistory(history);
        setLoading(false);
      } catch (err) {
        console.error('Error loading purchase history:', err);
        setError('Failed to load purchase history. Please try again later.');
        setLoading(false);
      }
    };

    loadPurchaseHistory();
  }, [isAuthenticated, navigate, user]);

  const downloadReceipt = async (order) => {
    try {
      // Import jsPDF dynamically
      const { default: jsPDF } = await import('jspdf');
      
      // Create a new PDF document
      const doc = new jsPDF();
      const fileName = `receipt-${order.id}.pdf`;
      
      // Format purchase date
      const purchaseDate = new Date(order.date).toLocaleDateString();
      
      // Add receipt content
      doc.setFontSize(20);
      doc.text('Exam Purchase Receipt', 105, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(`Receipt ID: ${order.id}`, 20, 40);
      doc.text(`Purchase Date: ${purchaseDate}`, 20, 50);
      doc.text(`Customer: ${user.name || user.email}`, 20, 60);
      
      // Add items table
      doc.text('Purchased Exams:', 20, 80);
      let yPos = 90;
      
      order.items.forEach((item, index) => {
        doc.text(`${index + 1}. ${item.title} (${item.category})`, 30, yPos);
        doc.text(`$${(item.price || 9.99).toFixed(2)}`, 160, yPos, { align: 'right' });
        yPos += 10;
      });
      
      // Add total
      doc.line(20, yPos + 5, 190, yPos + 5);
      doc.text('Total:', 140, yPos + 15);
      doc.text(`$${order.total.toFixed(2)}`, 160, yPos + 15, { align: 'right' });
      
      // Add footer
      doc.setFontSize(10);
      doc.text('Thank you for your purchase! Exams are valid for 1 year from purchase date.', 105, 270, { align: 'center' });
      
      // Save and download the PDF
      doc.save(fileName);
      
    } catch (err) {
      console.error('Error generating receipt:', err);
      alert('Failed to generate receipt. Please try again later.');
    }
  };

  if (loading) {
    return <div className="orders-container loading">Loading purchase history...</div>;
  }

  if (error) {
    return <div className="orders-container error">Error: {error}</div>;
  }

  return (
    <div className="orders-container">
      <h1>My Purchase History</h1>
      
      {purchaseHistory.length === 0 ? (
        <div className="no-orders">
          <p>You haven't purchased any exams yet.</p>
          <button onClick={() => navigate('/exams')} className="explore-btn">
            Explore Exams
          </button>
        </div>
      ) : (
        <div className="orders-list">
          {purchaseHistory.map(order => (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <span className="order-date">{new Date(order.date).toLocaleDateString()}</span>
              </div>
              
              <div className="order-items">
                {order.items.map(item => (
                  <div key={item.id} className="order-item">
                    <div>
                      <span className="item-title">{item.title}</span>
                      <span className="item-category"> ({item.category})</span>
                    </div>
                    <span className="item-price">${(item.price || 9.99).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              
              <div className="order-footer">
                <div className="order-total">
                  <span>Total:</span>
                  <span>${order.total.toFixed(2)}</span>
                </div>
                <button 
                  onClick={() => downloadReceipt(order)} 
                  className="download-receipt-btn"
                >
                  Download Receipt
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Order;