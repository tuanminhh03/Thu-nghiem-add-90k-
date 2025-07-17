// src/Header.jsx
import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import axios from 'axios';
import './Header.css';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [addedAmount, setAddedAmount] = useState(0);
  const menuRef = useRef(null);

  // Lấy user & polling cập nhật định kỳ nhanh hơn
  useEffect(() => {
    const stored = localStorage.getItem('user');
    setUser(stored ? JSON.parse(stored) : null);
    const token = localStorage.getItem('token');
    let pollId;

    const fetchUser = () => {
      axios.get('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(({ data }) => {
          setUser(prev => {
            if (prev && data.amount > prev.amount) {
              const diff = data.amount - prev.amount;
              // Hiện notification
              setAddedAmount(diff);
              // 3s sau: clear notification và nếu đang ở page /top-up thì redirect về home
              setTimeout(() => {
                setAddedAmount(0);
                if (location.pathname.startsWith('/top-up')) {
                  navigate('/');
                }
              }, 3000);
            }
            localStorage.setItem('user', JSON.stringify(data));
            return data;
          });
        })
        .catch(() => {});
    };

    if (token) {
      fetchUser();
      // Giảm interval xuống 5s (trước là 30000ms) để notification hiện nhanh hơn
      pollId = setInterval(fetchUser, 5000);
    }
    return () => pollId && clearInterval(pollId);
  }, [location, navigate]);

  // Nghe SSE nạp tiền (nhanh nhất)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const es = new EventSource(`/api/auth/stream?token=${token}`);
    es.onmessage = e => {
      const data = JSON.parse(e.data);
      setUser(prev => {
        if (prev && data.added > 0) {
          setAddedAmount(data.added);
          setTimeout(() => {
            setAddedAmount(0);
            if (location.pathname.startsWith('/top-up')) {
              navigate('/');
            }
          }, 3000);
        }
        const next = prev ? { ...prev, amount: data.amount } : prev;
        localStorage.setItem('user', JSON.stringify(next));
        return next;
      });
    };
    return () => es.close();
  }, [location, navigate]);

  // Đóng menu khi click ngoài
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [menuOpen]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setMenuOpen(false);
    navigate('/login');
  };

  const handleTopUp = () => {
    if (!user) return;
    const { phone, amount } = user;
    navigate(
      `/top-up?phone=${encodeURIComponent(phone)}&amount=${encodeURIComponent(amount)}`
    );
  };

  return (
    <header className="site-header">
      {addedAmount > 0 && (
        <div className="topup-overlay">
          <div className="topup-message">
            <CheckCircle size={32} style={{ marginBottom: '0.5rem' }} />
            <h3>Nạp tiền thành công</h3>
            <p>Số tiền: {addedAmount.toLocaleString()} VNĐ</p>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="top-bar container">
        <div className="top-bar__left">
          <Link to="/" className="site-logo-text">DAILYWITHMINH</Link>
        </div>
        <div className="top-bar__right">
          {user ? (
            <>
              <span className="user-amount clickable" onClick={handleTopUp}>
                💰 {user.amount.toLocaleString()}₫
              </span>
              <div className="user-menu" ref={menuRef}>
                <button
                  className="user-icon"
                  onClick={() => setMenuOpen(o => !o)}
                >
                  👤
                </button>
                {menuOpen && (
                  <ul className="user-dropdown">
                    <li className="account-line">Tài khoản: {user.phone}</li>
                    <li>
                      <Link to="/my-orders" onClick={() => setMenuOpen(false)}>
                        Đơn hàng của tôi
                      </Link>
                    </li>
                    <li>
                      <button onClick={handleLogout}>Đăng xuất</button>
                    </li>
                  </ul>
                )}
              </div>
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
        <div className="nav-bar__right">
          {/* Nav items nếu có */}
        </div>
      </div>
    </header>
);
}
