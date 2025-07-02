// src/AdminDashboard.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './AdminDashboard.css';  // CSS cho layout admin dashboard

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, total: 0, avg: 0 });
  const [users, setUsers] = useState([]);
  const token = localStorage.getItem('adminToken');

  // Hàm loadUsers để fetch data từ server
  const loadUsers = async () => {
    try {
      const res = await axios.get('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const list = res.data;

      // Tổng số dư hiện tại
      const totalAmt = list.reduce((sum, u) => sum + (u.amount || 0), 0);
      // Trung bình số dư
      const avgAmt = list.length ? Math.round(totalAmt / list.length) : 0;

      setStats({ users: list.length, total: totalAmt, avg: avgAmt });
      setUsers(list);
    } catch (err) {
      console.error('Lỗi khi fetch users:', err);
    }
  };

  // Khi component mount, gọi loadUsers
  useEffect(() => {
    loadUsers();
  }, []);

  // Xử lý top-up cho user
  const handleTopup = async (userId) => {
    const input = document.getElementById(`amt-${userId}`);
    const amt = Number(input.value);
    if (!amt || amt <= 0) {
      return alert('Vui lòng nhập số tiền hợp lệ.');
    }
    try {
      await axios.post('/api/admin/top-up', { userId, amount: amt }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      input.value = '';
      // Reload dữ liệu sau khi top-up
      await loadUsers();
    } catch (err) {
      console.error('Lỗi khi top-up:', err);
      alert(err.response?.data?.message || 'Top-up thất bại');
    }
  };

  return (
    <div className="admin-main">
      <h1>Admin Dashboard</h1>

      <div className="cards-row">
        <div className="card">
          <h3>{stats.users.toLocaleString()}</h3>
          <p>Total Users</p>
        </div>
        <div className="card">
          <h3>{stats.total.toLocaleString()}₫</h3>
          <p>Total Balance</p>
        </div>
        <div className="card">
          <h3>{stats.avg.toLocaleString()}₫</h3>
          <p>Avg Balance</p>
        </div>
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Phone</th>
            <th>Balance (₫)</th>
            <th>Top-up</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u._id}>
              <td>{u.phone}</td>
              <td>{(u.amount || 0).toLocaleString()}₫</td>
              <td>
                <div className="topup-cell">
                  <input
                    type="number"
                    placeholder="Amount"
                    id={`amt-${u._id}`}
                  />
                  <button onClick={() => handleTopup(u._id)}>
                    Top-up
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
