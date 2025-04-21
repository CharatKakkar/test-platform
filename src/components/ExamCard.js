// components/ExamCard.js
import React from 'react';
import { Link } from 'react-router-dom';
import './ExamCard.css';

const ExamCard = ({ exam, isOwned, isInCart, onAddToCart, onRemoveFromCart }) => {
  // Get default thumbnail SVG for exams without thumbnails
  const getDefaultThumbnail = (category) => {
    const colors = {
      'IT': '#275d8b',
      'Cloud': '#f90',
      'Project Management': '#4b9b4b',
      'Networking': '#005073',
      'Education': '#c41230',
      'Security': '#bd582c',
      'Development': '#0078d4'
    };
    
    const bgColor = colors[category] || '#333';
    const text = exam ? exam.title.split(' ').map(word => word[0]).join('').substring(0, 3) : 'EX';
    
    return `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="100" viewBox="0 0 160 100"%3E%3Crect width="160" height="100" fill="${bgColor.replace('#', '%23')}"/%3E%3Ctext x="80" y="50" font-family="Arial" font-size="18" text-anchor="middle" fill="white"%3E${text}%3C/text%3E%3C/svg%3E`;
  };

  return (
    <div className="exam-card">
      <Link to={`/exams/${exam.id}`} className="exam-card-link">
        <div className="exam-thumbnail">
          <img 
            src={exam.thumbnail || getDefaultThumbnail(exam.category)} 
            alt={exam.title}
            className="exam-thumbnail-img"
          />
        </div>
        <div className="exam-info">
          <h2>{exam.title}</h2>
          <p className="exam-category">{exam.category || 'Uncategorized'}</p>
          <p className="exam-description">{exam.description}</p>
          <div className="exam-details">
            <span><strong>Duration:</strong> {exam.duration || 'Not specified'}</span>
            <span><strong>Questions:</strong> {exam.questionCount || '0'}</span>
            <span><strong>Difficulty:</strong> {exam.difficulty || 'Not specified'}</span>
          </div>
          <div className="exam-price">${exam.price?.toFixed(2) || "0.00"}</div>
        </div>
      </Link>
      
      {/* Action buttons stay outside the Link to avoid navigation conflicts */}
      <div className="exam-actions">
        <Link to={`/exams/${exam.id}`} className="btn btn-primary">View Details</Link>
        <Link to={`/demo/${exam.id}`} className="btn btn-outline">Try Demo</Link>
        
        {isOwned ? (
          <Link to={`/exam/${exam.id}/practice-tests`} className="btn btn-success">
            Practice Tests
          </Link>
        ) : (
          <button 
            className={`btn ${isInCart ? 'btn-danger' : 'btn-success'}`}
            onClick={() => isInCart 
              ? onRemoveFromCart(exam.id) 
              : onAddToCart(exam)
            }
          >
            {isInCart ? 'Remove from Cart' : 'Add to Cart'}
          </button>
        )}
      </div>
      
      {/* Ownership badge */}
      {isOwned && (
        <div className="ownership-badge">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span>Purchased</span>
        </div>
      )}
    </div>
  );
};

export default ExamCard;