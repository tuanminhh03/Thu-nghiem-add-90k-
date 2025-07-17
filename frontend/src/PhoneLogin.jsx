// src/PhoneLogin.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './PhoneLogin.module.css';

export default function PhoneLogin() {
  const [phone, setPhone] = useState('');
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

    setLoading(true);
    try {
      const { data } = await axios.post('/api/auth/login', { phone });
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

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>📱</div>
        <h2 className={styles.title}>Đăng nhập nhanh</h2>
        <p className={styles.subtitle}>
          Không cần đăng ký, chỉ cần nhập số điện thoại để đăng nhập
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
              'Tiếp tục'
            )}
          </button>
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
