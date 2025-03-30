import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Checkout = () => {
  const navigate = useNavigate();
  const [examResults, setExamResults] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    paymentMethod: 'credit',
    cardNumber: '',
    cardExpiry: '',
    cardCvc: '',
    couponCode: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [couponApplied, setCouponApplied] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);

  const coursePrice = 299.99;
  const discountAmount = couponApplied ? 50 : 0;

  useEffect(() => {
    // Get exam results from localStorage
    const results = localStorage.getItem('examResults');
    if (results) {
      setExamResults(JSON.parse(results));
    } else {
      // Redirect if no exam results found
      navigate('/demo-exam');
    }
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
    
    // Validate phone (optional but must be valid if provided)
    if (formData.phone && !/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    // Simulate API call to process payment
    try {
      // Replace with actual payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      setOrderComplete(true);
      
      // Clear exam results from localStorage after successful checkout
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

  if (orderComplete) {
    return (
      <div className="max-w-4xl mx-auto p-8 bg-white rounded-lg shadow-md">
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Order Complete!</h1>
          <p className="text-gray-600 mb-6">Thank you for your purchase</p>
        </div>
        
        <div className="bg-gray-50 p-6 rounded-lg mb-8">
          <h2 className="text-xl font-semibold mb-4">Order Details</h2>
          <div className="border-b border-gray-200 pb-4 mb-4">
            <p className="mb-2">
              <span className="font-medium">Name:</span> {formData.firstName} {formData.lastName}
            </p>
            <p className="mb-2">
              <span className="font-medium">Email:</span> {formData.email}
            </p>
            <p>
              <span className="font-medium">Order ID:</span> ORD-{Math.random().toString(36).substring(2, 10).toUpperCase()}
            </p>
          </div>
          
          <div>
            <h3 className="font-medium mb-3">Your Purchase</h3>
            <div className="flex justify-between mb-2">
              <span>Complete React Course</span>
              <span>${coursePrice.toFixed(2)}</span>
            </div>
            {couponApplied && (
              <div className="flex justify-between mb-2 text-green-600">
                <span>Discount (DEMO50)</span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold mt-4 pt-4 border-t border-gray-200">
              <span>Total</span>
              <span>${(coursePrice - discountAmount).toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <div className="text-center">
          <p className="mb-6">
            You will receive a confirmation email at {formData.email} with instructions to access your course.
          </p>
          <button 
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-200"
          >
            Return to Homepage
          </button>
        </div>
      </div>
    );
  }

  if (!examResults) {
    return <div className="max-w-4xl mx-auto p-6 text-center">Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-8 text-center">Complete Your Registration</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Your Information</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="firstName">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className={`w-full p-2 border rounded-md ${errors.firstName ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="lastName">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className={`w-full p-2 border rounded-md ${errors.lastName ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full p-2 border rounded-md ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="phone">
                  Phone Number (optional)
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="(123) 456-7890"
                  className={`w-full p-2 border rounded-md ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
              </div>
              
              <div className="border-t border-gray-200 pt-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Payment Method</h2>
                
                <div className="mb-4">
                  <div className="flex items-center mb-4">
                    <input
                      id="credit"
                      name="paymentMethod"
                      type="radio"
                      value="credit"
                      checked={formData.paymentMethod === 'credit'}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600"
                    />
                    <label htmlFor="credit" className="ml-2 text-gray-700">
                      Credit / Debit Card
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="paypal"
                      name="paymentMethod"
                      type="radio"
                      value="paypal"
                      checked={formData.paymentMethod === 'paypal'}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600"
                    />
                    <label htmlFor="paypal" className="ml-2 text-gray-700">
                      PayPal
                    </label>
                  </div>
                </div>
                
                {formData.paymentMethod === 'credit' && (
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="cardNumber">
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
                        className={`w-full p-2 border rounded-md ${errors.cardNumber ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors.cardNumber && <p className="text-red-500 text-sm mt-1">{errors.cardNumber}</p>}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="cardExpiry">
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
                          className={`w-full p-2 border rounded-md ${errors.cardExpiry ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {errors.cardExpiry && <p className="text-red-500 text-sm mt-1">{errors.cardExpiry}</p>}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="cardCvc">
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
                          className={`w-full p-2 border rounded-md ${errors.cardCvc ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {errors.cardCvc && <p className="text-red-500 text-sm mt-1">{errors.cardCvc}</p>}
                      </div>
                    </div>
                  </div>
                )}
                
                {formData.paymentMethod === 'paypal' && (
                  <div className="bg-gray-50 p-4 rounded-md text-center">
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
                className={`w-full py-3 rounded-lg font-semibold text-white ${
                  loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
                } transition duration-200`}
              >
                {loading ? 'Processing...' : 'Complete Purchase'}
              </button>
            </form>
          </div>
        </div>
        
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6 sticky top-6">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
            
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <span>Complete React Course</span>
                <span>${coursePrice.toFixed(2)}</span>
              </div>
              
              {couponApplied && (
                <div className="flex justify-between text-green-600 mb-2">
                  <span>Discount (DEMO50)</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              
              <div className="pt-4 mt-4 border-t border-gray-200">
                <div className="flex justify-between font-bold mb-2">
                  <span>Total</span>
                  <span>${(coursePrice - discountAmount).toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  name="couponCode"
                  placeholder="Coupon Code"
                  value={formData.couponCode}
                  onChange={handleInputChange}
                  className={`w-full p-2 pr-24 border rounded-md ${errors.couponCode ? 'border-red-500' : 'border-gray-300'}`}
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  disabled={couponApplied}
                  className={`absolute right-1 top-1 px-3 py-1 rounded text-sm font-medium ${
                    couponApplied 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {couponApplied ? 'Applied' : 'Apply'}
                </button>
              </div>
              {errors.couponCode && <p className="text-red-500 text-sm mt-1">{errors.couponCode}</p>}
              {couponApplied && <p className="text-green-600 text-sm mt-1">Coupon applied successfully!</p>}
              <p className="text-gray-500 text-xs mt-2">Try code "DEMO50" for $50 off</p>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-md mb-6">
              <h3 className="font-semibold text-blue-800 mb-2">Your Demo Exam Score</h3>
              <p className="text-blue-700 mb-1">
                Score: {examResults.score} out of {examResults.totalQuestions} ({examResults.percentage}%)
              </p>
              <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                <div 
                  className={`h-2 rounded-full ${examResults.percentage >= 70 ? 'bg-green-500' : 'bg-yellow-500'}`}
                  style={{ width: `${examResults.percentage}%` }}
                ></div>
              </div>
              <p className="text-sm text-blue-600">
                {examResults.percentage >= 70 
                  ? 'Great job! You are ready for the full course.'
                  : 'The full course will help you improve your skills!'}
              </p>
            </div>
            
            <div className="text-sm text-gray-600">
              <p className="mb-2">
                By completing your purchase, you agree to our <a href="#" className="text-blue-600 hover:underline">Terms of Service</a> and <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>.
              </p>
              <p>
                Need help? Contact our <a href="#" className="text-blue-600 hover:underline">support team</a>.
              </p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="font-semibold mb-3">What You'll Get</h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span>Full Access to 120+ React Lessons</span>
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span>Certificate of Completion</span>
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span>10 Real-World Projects</span>
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span>1-Year Access to All Materials</span>
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span>Community Forum Access</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;