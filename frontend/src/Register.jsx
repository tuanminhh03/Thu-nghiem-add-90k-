// src/Register.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import styles from './PhoneLogin.module.css';

export default function Register() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Tên khách hàng không được để trống.');
      return;
    }
    if (!/^[0-9]{9,11}$/.test(phone)) {
      setError('Số điện thoại phải gồm 9–11 chữ số.');
      return;
    }
    if (!/^\d{6}$/.test(pin)) {
      setError('Mã PIN phải gồm 6 chữ số.');
      return;
    }
    if (pin !== confirmPin) {
      setError('Mã PIN không trùng khớp.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post('/api/auth/register', { name, phone, pin });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setShowSuccess(true);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Đăng ký thất bại');
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
        <div className={styles.logo}>📝</div>
        <h2 className={styles.title}>Đăng ký tài khoản</h2>
        <p className={styles.subtitle}>Lưu ý : Xin quý khách hãy nhập đúng SDT để CSKH của dailywithminh liên hệ với quý khách.</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            Tên khách hàng
            <input
              type="text"
              className={styles.input}
              placeholder="Nhập tên của bạn"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </label>
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
          <label className={styles.label}>
            Nhập lại Mã PIN
            <input
              type="password"
              className={styles.input}
              placeholder="Nhập lại mã PIN"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.trim())}
              disabled={loading}
              maxLength={6}
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
              'Đăng ký'
            )}
          </button>
          <div className={styles.actions}>
            <Link className={styles.link} to="/login">
              Đã có tài khoản? Đăng nhập
            </Link>
          </div>
        </form>
      </div>

      {showSuccess && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Thành công!</h3>
            <p>Bạn đã đăng ký thành công.</p>
            <button className={styles.modalButton} onClick={handleOk}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
