import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AdminLayout from './AdminLayout';
import './Admin.css';

export default function AdminExpiringOrders() {
  const [orders, setOrders] = useState([]);
  const token = localStorage.getItem('adminToken');
  const SOON_THRESHOLD_DAYS = 3;

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const { data } = await axios.get('/api/admin/orders/expiring', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setOrders(data);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [token]);

  return (
    <AdminLayout>
      <div className="card">
        <header className="admin-header">
          <h1 className="text-xl font-semibold">Đơn sắp hết hạn</h1>
        </header>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>STT</th>
                <th>SĐT</th>
                <th>Gói</th>
                <th>Ngày hết hạn</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o, idx) => {
                const expires = new Date(o.expiresAt);
                const daysLeft = Math.ceil((expires - Date.now()) / (1000 * 60 * 60 * 24));
                const soon = daysLeft <= SOON_THRESHOLD_DAYS;
                return (
                  <tr key={o._id} className={soon ? 'expiring-soon' : ''}>
                    <td>{idx + 1}</td>
                    <td>{o.user?.phone || o.phone}</td>
                    <td>{o.plan}</td>
                    <td>{expires.toLocaleDateString('vi-VN')}</td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center">
                    Không có đơn sắp hết hạn
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
