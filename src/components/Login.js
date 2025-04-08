// components/Login.js
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../styles/Auth.css';

function Login({ onLogin }) {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = location.state?.from || '/dashboard';

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Call onLogin with Google authentication flag
      await onLogin(null, null, true);
      navigate(redirectPath);
    } catch (error) {
      console.error("Google login error:", error);
      setError(error.message || 'Google login failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Login to Your Account</h2>
      {error && <div className="error">{error}</div>}
      
      {/* Google Login Button */}
      <div className="social-auth-container">
        <button 
          onClick={handleGoogleLogin} 
          className="google-auth-btn"
          disabled={isLoading}
          type="button"
        >
          <div className="google-icon">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032 s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2 C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" 
              fill="#4285F4"/>
            </svg>
          </div>
          <span>{isLoading ? 'Logging in...' : 'Continue with Google'}</span>
        </button>
      </div>
      
      <div className="auth-footer">
        <p>
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;