// components/Cart.js
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Cart({ cart = [], removeFromCart, updateQuantity, clearCart, cartTotal = 0, isAuthenticated }) {
  const navigate = useNavigate();

  console.log("CART TOTAL" + cartTotal);

  const handleQuantityChange = (examId, newQuantity) => {
    const quantity = parseInt(newQuantity);
    if (quantity > 0) {
      updateQuantity(examId, quantity);
    }
  };

  const handleRemoveItem = (examId) => {
    removeFromCart(examId);
  };

  const handleClearCart = () => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      clearCart();
    }
  };

  const handleCheckout = () => {
    if (isAuthenticated) {
      navigate('/checkout');
    } else {
      navigate('/login', { state: { from: '/checkout' } });
    }
  };

  return (
    <div className="cart-page">
      <div className="container">
        <h1>Your Shopping Cart</h1>
        
        {cart.length > 0 ? (
          <>
            <div className="cart-items-container">
              <table className="cart-table">
                <thead>
                  <tr>
                    <th>Exam</th>
                    <th>Price</th>
                    <th>Quantity</th>
                    <th>Total</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item) => {
                    const quantity = item.quantity || 1;
                    const itemTotal = item.price * quantity;
                    
                    return (
                      <tr key={item.id} className="cart-item">
                        <td className="cart-item-title">
                          <Link to={`/exams/${item.id}`}>{item.title}</Link>
                          {item.description && (
                            <p className="cart-item-description">{item.description}</p>
                          )}
                        </td>
                        <td className="cart-item-price">${item.price.toFixed(2)}</td>
                        <td className="cart-item-quantity">
                          <div className="quantity-control">
                            <button 
                              className="quantity-btn" 
                              onClick={() => handleQuantityChange(item.id, quantity - 1)}
                              disabled={quantity <= 1}
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={quantity}
                              onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                              className="quantity-input"
                            />
                            <button 
                              className="quantity-btn" 
                              onClick={() => handleQuantityChange(item.id, quantity + 1)}
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="cart-item-total">${itemTotal.toFixed(2)}</td>
                        <td className="cart-item-actions">
                          <button 
                            className="btn-remove"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <i className="fas fa-trash"></i> Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="cart-summary">
              <div className="cart-actions">
                <button 
                  className="btn-clear-cart" 
                  onClick={handleClearCart}
                >
                  Clear Cart
                </button>
                <Link to="/exams" className="btn-continue-shopping">
                  Continue Shopping
                </Link>
              </div>
              
              <div className="cart-totals">
                <div className="subtotal">
                  <span>Subtotal:</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
                <div className="tax">
                  <span>Tax:</span>
                  <span>${(cartTotal * 0.07).toFixed(2)}</span>
                </div>
                <div className="total">
                  <span>Total:</span>
                  <span>${(cartTotal * 1.07).toFixed(2)}</span>
                </div>
                <button 
                  className="btn-checkout"
                  onClick={handleCheckout}
                >
                  {isAuthenticated ? 'Proceed to Checkout' : 'Login to Checkout'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-cart">
            <i className="fas fa-shopping-cart"></i>
            <p>Your cart is empty</p>
            <Link to="/exams" className="btn-start-shopping">
              Browse Available Exams
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default Cart;