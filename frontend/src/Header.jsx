// src/Header.jsx
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './Header.css';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    setUser(stored ? JSON.parse(stored) : null);
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  const handleTopUp = () => {
    if (!user) return;
    const { phone, amount } = user;
    navigate(`/top-up?phone=${encodeURIComponent(phone)}&amount=${encodeURIComponent(amount)}`);
  };

  return (
    <header className="site-header">
      {/* Top bar */}
      <div className="top-bar container">
        <div className="top-bar__left">
          <Link to="/" className="site-logo-text">DAILYWITHMINH</Link>
        </div>
        <div className="top-bar__right">
          {user ? (
            <>
              <span className="user-phone">📱 {user.phone}</span>
              <span className="user-amount clickable" onClick={handleTopUp}>
                💰 {user.amount.toLocaleString()}₫
              </span>
              <button className="btn-link" onClick={handleLogout}>Đăng xuất</button>
            </>
          ) : (
            <Link to="/login" className="btn-link">Đăng nhập</Link>
          )}
        </div>
      </div>

      {/* Nav bar */}
      <div className="nav-bar container">
        <div className="nav-bar__left">
          <Link to="/">
            <img src="/images/netflix-icon.png" alt="Netflix" className="nav-icon" />
          </Link>
          <span className="nav-label">Netflix</span>
        </div>
        <div className="nav-bar__right"></div>
      </div>
    </header>
  );
}
