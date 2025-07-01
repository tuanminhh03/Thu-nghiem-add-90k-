// src/AdminLogin.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setErr('');
    try {
      const { data } = await axios.post('http://localhost:5000/api/auth/admin-login', {
        username,
        password
      });
      localStorage.setItem('adminToken', data.token);
      navigate('/admin');
    } catch (e) {
      setErr(e.response?.data?.message || 'Đăng nhập thất bại');
    }
  };

  return (
    <div className="admin-login">
      <form onSubmit={handleSubmit}>
        <h2>Đăng nhập Admin</h2>
        {err && <p className="error">{err}</p>}
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <button type="submit">Đăng nhập</button>
      </form>
    </div>
  );
}
