// components/Header.js
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Header({ isAuthenticated, user, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="logo">
        <Link to="/">TestPro</Link>
      </div>
      <nav className="nav">
        {isAuthenticated ? (
          <>
            <Link to="/">Dashboard</Link>
            <Link to="/tests">Tests</Link>
            <Link to="/history">History</Link>
            <div className="user-menu">
              <span className="username">Welcome, {user.name}</span>
              <button onClick={handleLogout} className="btn-logout">Logout</button>
            </div>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </nav>
    </header>
  );
}

export default Header;
