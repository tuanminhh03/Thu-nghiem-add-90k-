import React, { useState, useRef } from 'react';
import './PinLogin.css';

export default function PinLogin() {
  const [digits, setDigits] = useState(Array(6).fill(''));
  const [error, setError] = useState('');
  const refs = useRef([]);

  const handleChange = (idx, val) => {
    if (/^\d?$/.test(val)) {
      const next = [...digits];
      next[idx] = val;
      setDigits(next);
      if (val && idx < 5) refs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && idx > 0) refs.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handlePaste = (e) => {
    const text = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    if (text.length) {
      e.preventDefault();
      const next = Array(6).fill('');
      for (let i = 0; i < text.length; i++) next[i] = text[i];
      setDigits(next);
      refs.current[Math.min(text.length, 5)]?.focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const pin = digits.join('');
    if (pin !== '123456') {
      setError('PIN bạn nhập đã sai vui lòng nhập lại');
      setDigits(Array(6).fill(''));
      refs.current[0]?.focus();
    } else {
      setError('');
    }
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
            />
          ))}
        </div>
        {error && <div className="pin-error">{error}</div>}
      </form>
      <div className="pin-footer">
        <a href="#">Quên mã PIN</a>
      </div>
    </div>
  );
}

