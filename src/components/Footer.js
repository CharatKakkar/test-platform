// components/Footer.js
import React from 'react';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <p>&copy; {currentYear} TestPro Platform. All rights reserved.</p>
    </footer>
  );
}

export default Footer;