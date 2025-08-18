// src/Login.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import styles from './PhoneLogin.module.css';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!/^[0-9]{9,11}$/.test(phone)) {
      setError('Số điện thoại phải gồm 9–11 chữ số.');
      return;
    }
    if (!/^\d{6}$/.test(pin)) {
      setError('Mã PIN phải gồm 6 chữ số.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post('/api/auth/login', { phone, pin });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setShowSuccess(true);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Đăng nhập thất bại');
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
        <p className={styles.subtitle}>
          Nhập số điện thoại và mã PIN (6 số)
        </p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            Số điện thoại
            <input
              type="text"
              className={styles.input}
              placeholder="Nhập số điện thoại của bạn"
              value={phone}
              onChange={(e) => setPhone(e.target.value.trim())}
              disabled={loading}
            />
          </label>
          <label className={styles.label}>
            Mã PIN
            <input
              type="password"
              className={styles.input}
              placeholder="Nhập mã PIN 6 số"
              value={pin}
              onChange={(e) => setPin(e.target.value.trim())}
              disabled={loading}
              maxLength={6}
            />
          </label>
          {error && <p className={styles.error}>{error}</p>}
          <button
            type="submit"
            className={styles.button}
            disabled={loading}
          >
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
