// src/PinLogin.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './PinLogin.css';

export default function PinLogin() {
  const [digits, setDigits] = useState(Array(6).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const refs = useRef([]);
  const navigate = useNavigate();
  const { state } = useLocation();
  const phone = state?.phone;

  // Nếu không có phone (người dùng vào thẳng URL), quay về trang login
  useEffect(() => {
    if (!phone) navigate('/login', { replace: true });
  }, [phone, navigate]);

  // Tự focus ô đầu khi vào màn hình
  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const submitPin = async (pin) => {
    if (!/^\d{6}$/.test(pin) || loading) return;

    setLoading(true);
    setError('');
    try {
      const { data } = await axios.post('/api/auth/login', { phone, pin });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
      setDigits(Array(6).fill(''));
      refs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (idx, val) => {
    if (/^\d?$/.test(val) && !loading) {
      const next = [...digits];
      next[idx] = val;
      setDigits(next);

      // Tự chuyển ô khi gõ và auto-submit khi đủ 6 số
      if (val && idx < 5) refs.current[idx + 1]?.focus();
      if (next.every((d) => d)) submitPin(next.join(''));
    }
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && idx > 0) refs.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < 5) refs.current[idx + 1]?.focus();
    if (e.key === 'Enter') {
      e.preventDefault();
      submitPin(digits.join(''));
    }
  };

  const handlePaste = (e) => {
    const text = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    if (text.length) {
      e.preventDefault();
      const next = Array(6).fill('');
      for (let i = 0; i < text.length; i++) next[i] = text[i];
      setDigits(next);
      refs.current[Math.min(text.length, 5)]?.focus();
      if (text.length === 6) submitPin(text);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submitPin(digits.join(''));
  };

  return (
    <div className="pin-page">
      <div className="pin-status">Vui lòng nhập mã PIN để đăng nhập</div>

      <form onSubmit={handleSubmit} className="pin-form">
        <div className="pin-container" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              type="password"
              inputMode="numeric"
              maxLength={1}
              className="pin-input"
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              ref={(el) => (refs.current[i] = el)}
              disabled={loading}
              aria-label={`PIN digit ${i + 1}`}
            />
          ))}
        </div>

        {error && <div className="pin-error">{error}</div>}
      </form>

      <div className="pin-footer">
        <a href="#">Quên mã PIN?</a>
      </div>
    </div>
  );
}
