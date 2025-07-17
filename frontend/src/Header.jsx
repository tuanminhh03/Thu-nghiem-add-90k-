import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './Header.css';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const menuRef = useRef(null);

  // Lấy thông tin user và polling cập nhật định kỳ
  useEffect(() => {
    const stored = localStorage.getItem('user');
    setUser(stored ? JSON.parse(stored) : null);

    const token = localStorage.getItem('token');
    let pollId;

    const fetchUser = () => {
      axios
        .get('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
        .then(({ data }) => {
          setUser(prev => {
            if (prev && data.amount > prev.amount) {
              setNotice('Nạp tiền thành công');
              setTimeout(() => setNotice(''), 3000);
            }
            localStorage.setItem('user', JSON.stringify(data));
            return data;
          });
        })
        .catch(() => {});
    };

    if (token) {
      fetchUser();
      pollId = setInterval(fetchUser, 30000);
    }

    return () => {
      if (pollId) clearInterval(pollId);
    };
  }, [location]);

  // Nghe sự kiện nạp tiền qua SSE
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const es = new EventSource(`/api/auth/stream?token=${token}`);
    es.onmessage = e => {
      const data = JSON.parse(e.data);
      setUser(prev => {
        if (prev) {
          if (data.added > 0) {
            setNotice('Nạp tiền thành công');
            setTimeout(() => setNotice(''), 3000);
          }
          const next = { ...prev, amount: data.amount };
          localStorage.setItem('user', JSON.stringify(next));
          return next;
        }
        return prev;
      });
    };

    return () => es.close();
  }, []);

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
      {notice && (
        <div className="topup-overlay">
          <div className="topup-message">{notice}</div>
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
        <div className="nav-bar__right"></div>
      </div>
    </header>
  );
}
