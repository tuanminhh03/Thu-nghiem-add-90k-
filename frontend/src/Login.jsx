// src/Login.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import styles from './PhoneLogin.module.css';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);      // dùng chung cho submit/pin
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinDigits, setPinDigits] = useState(Array(6).fill(''));
  const [pinError, setPinError] = useState('');

  const pinRefs = useRef([]);
  const navigate = useNavigate();

  // Tự focus ô PIN đầu tiên khi mở modal
  useEffect(() => {
    if (showPinModal) {
      setTimeout(() => pinRefs.current[0]?.focus(), 0);
    }
  }, [showPinModal]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!/^[0-9]{9,11}$/.test(phone)) {
      setError('Số điện thoại phải gồm 9–11 chữ số.');
      return;
    }

    setPinDigits(Array(6).fill(''));
    setPinError('');
    setShowPinModal(true);
  };

  const handlePinChange = (idx, val) => {
    if (/^\d?$/.test(val)) {
      const next = [...pinDigits];
      next[idx] = val;
      setPinDigits(next);
      if (val && idx < 5) pinRefs.current[idx + 1]?.focus();
    }
  };

  const handlePinKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !pinDigits[idx] && idx > 0) {
      pinRefs.current[idx - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && idx > 0) pinRefs.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < 5) pinRefs.current[idx + 1]?.focus();
  };

  // Cho phép dán 6 chữ số một lần
  const handlePinPaste = (e) => {
    const text = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    if (text.length) {
      e.preventDefault();
      const next = Array(6).fill('');
      for (let i = 0; i < text.length; i++) next[i] = text[i];
      setPinDigits(next);
      pinRefs.current[Math.min(text.length, 5)]?.focus();
    }
  };

  const handlePinSubmit = async () => {
    const pin = pinDigits.join('');
    if (!/^\d{6}$/.test(pin)) {
      setPinError('Mã PIN phải gồm 6 chữ số.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post('/api/auth/login', { phone, pin });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setShowPinModal(false);
      setShowSuccess(true);
    } catch (err) {
      console.error(err);
      setPinError(err.response?.data?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleOk = () => {
    setShowSuccess(false);
    navigate('/');
  };

  const handleForgot = () => {
    alert('Vui lòng liên hệ Admin tại góc trái màn hình để lấy lại mật khẩu');
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>📱</div>
        <h2 className={styles.title}>Đăng nhập</h2>
        <p className={styles.subtitle}>Nhập số điện thoại để tiếp tục</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            Số điện thoại
            <input
              type="text"
              inputMode="numeric"
              className={styles.input}
              placeholder="Nhập số điện thoại của bạn"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              disabled={loading}
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? (
              <span className={styles.buttonContent}>
                <div className={styles.spinner}></div>
                <span>Đang xử lý…</span>
              </span>
            ) : (
              'Đăng nhập'
            )}
          </button>

          <div className={styles.actions}>
            <span className={styles.link} onClick={handleForgot}>
              Quên mật khẩu?
            </span>
            <Link className={styles.link} to="/register">
              Đăng ký
            </Link>
          </div>
        </form>
      </div>

      {showPinModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Nhập mã PIN</h3>
            <div className={styles.pinContainer} onPaste={handlePinPaste}>
              {pinDigits.map((d, i) => (
                <input
                  key={i}
                  type="password"
                  inputMode="numeric"
                  className={styles.pinInput}
                  maxLength={1}
                  value={d}
                  onChange={(e) => handlePinChange(i, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(i, e)}
                  ref={(el) => (pinRefs.current[i] = el)}
                  disabled={loading}
                />
              ))}
            </div>

            {pinError && <p className={styles.error}>{pinError}</p>}

            <button className={styles.modalButton} onClick={handlePinSubmit} disabled={loading}>
              {loading ? <div className={styles.spinner}></div> : 'Xác nhận'}
            </button>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Thành công!</h3>
            <p>Bạn đã đăng nhập thành công.</p>
            <button className={styles.modalButton} onClick={handleOk}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
