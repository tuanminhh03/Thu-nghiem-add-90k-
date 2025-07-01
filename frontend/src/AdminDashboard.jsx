// src/AdminDashboard.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const { data } = await axios.get('/api/admin/users', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsers(data);
      } catch (err) {
        console.error(err);
        alert('Không thể tải danh sách khách hàng');
      }
    };
    fetchUsers();
  }, []);

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>
      <table>
        <thead>
          <tr><th>Phone</th><th>Số dư</th></tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u._id}>
              <td>{u.phone}</td>
              <td>{u.amount?.toLocaleString() ?? 0}₫</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
