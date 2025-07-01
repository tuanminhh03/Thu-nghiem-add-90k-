// src/PhoneLogin.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './PhoneLogin.css';

export default function PhoneLogin() {
  const [phone, setPhone]     = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // validate số điện thoại cơ bản
    if (!/^[0-9]{9,11}$/.test(phone)) {
      setError('Số điện thoại phải gồm 9–11 chữ số.');
      return;
    }

    setLoading(true);
    try {
      // 1) Gọi API đăng nhập
      const { data } = await axios.post('/api/auth/login', { phone });

      // 2) Lưu token và thông tin user vào localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // 3) Redirect về trang chủ (hoặc bất cứ route nào bạn muốn)
      navigate('/');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="phone-login-page">
      <div className="phone-login-box">
        <h2>Đăng nhập bằng số điện thoại</h2>
        <form onSubmit={handleSubmit}>
          <label className="phone-login-label">
            Số điện thoại
            <input
              type="text"
              className="phone-login-input"
              placeholder="Nhập số điện thoại"
              value={phone}
              onChange={e => setPhone(e.target.value.trim())}
              disabled={loading}
            />
          </label>
          {error && <p className="phone-login-error">{error}</p>}
          <button
            type="submit"
            className="phone-login-btn"
            disabled={loading}
          >
            {loading ? 'Đang xử lý…' : 'Tiếp tục'}
          </button>
        </form>
      </div>
    </div>
  );
}
