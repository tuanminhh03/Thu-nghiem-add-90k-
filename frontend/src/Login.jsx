// src/Login.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';                    // <— cần thiết nếu gọi API
import styles from './PhoneLogin.module.css';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Chỉ cho phép 9–11 chữ số
    if (!/^[0-9]{9,11}$/.test(phone)) {
      setError('Số điện thoại phải gồm 9–11 chữ số.');
      return;
    }

    // (Tuỳ chọn) Kiểm tra số điện thoại trước khi vào màn hình PIN
    try {
      await axios.post('/api/auth/check-phone', { phone });
      navigate('/pin-login', { state: { phone } });
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại');
    }
    // Nếu không muốn gọi API check trước, chỉ cần:
    // navigate('/pin-login', { state: { phone } });
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
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.button}>
            Đăng nhập
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
    </div>
  );
}
