// src/AdminOrders.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AdminLayout from './AdminLayout';
import './Admin.css';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [sortField, setSortField] = useState('purchaseDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    if (!token) return;
    (async () => {
      const localOrders = JSON.parse(localStorage.getItem('orders50k') || '[]').map(o => ({
        _id: o.orderCode,
        orderCode: o.orderCode,
        plan: 'Gói tiết kiệm',
        purchaseDate: o.purchaseDate,
        expiresAt: o.expirationDate,
        user: { phone: o.phone },
      }));
      try {
        const { data } = await axios.get('/api/admin/orders', {
          headers: { Authorization: `Bearer ${token}` },
          params: { limit: 1000 }
        });
        setOrders([...data, ...localOrders]);
      } catch (err) {
        console.error(err);
        setOrders(localOrders);
      }
    })();
  }, [token]);

  const handleSort = field => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getExpiry = o => {
    if (o.expiresAt) return new Date(o.expiresAt);
    const purchase = new Date(o.purchaseDate);
    const months = parseInt(o.duration, 10) || 0;
    const exp = new Date(purchase);
    exp.setMonth(exp.getMonth() + months);
    return exp;
  };

  const daysLeft = o => {
    const diff = Math.ceil((getExpiry(o) - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const handleDelete = async id => {
    if (!window.confirm('Xóa đơn hàng này?')) return;
    try {
      await axios.delete(`/api/admin/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(orders.filter(o => o._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const sorted = [...orders].sort((a, b) => {
    let aVal, bVal;
    if (sortField === 'orderCode') {
      aVal = (a.orderCode || a.code || '').toString();
      bVal = (b.orderCode || b.code || '').toString();
    } else if (sortField === 'purchaseDate') {
      aVal = new Date(a.purchaseDate);
      bVal = new Date(b.purchaseDate);
    } else if (sortField === 'expiresAt') {
      aVal = getExpiry(a);
      bVal = getExpiry(b);
    }
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <AdminLayout>
      <div className="card">
        <header className="admin-header">
          <h1 className="text-xl font-semibold">Quản lý đơn hàng</h1>
        </header>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>STT</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('orderCode')}>
                  Mã đơn {sortField === 'orderCode' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th>SĐT</th>
                <th>Gói</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('purchaseDate')}>
                  Ngày mua {sortField === 'purchaseDate' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('expiresAt')}>
                  Ngày hết hạn {sortField === 'expiresAt' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th>Còn lại (ngày)</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((o, idx) => {
                const expires = getExpiry(o);
                const left = daysLeft(o);
                return (
                  <tr key={o._id}>
                    <td>{idx + 1}</td>
                    <td>{o.orderCode || o.code || o._id}</td>
                    <td>{o.user?.phone || ''}</td>
                    <td>{o.plan}</td>
                    <td>{new Date(o.purchaseDate).toLocaleDateString('vi-VN')}</td>
                    <td>{expires.toLocaleDateString('vi-VN')}</td>
                    <td>{left > 0 ? left : 'Đã hết hạn'}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => handleDelete(o._id)}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center">
                    Không có đơn hàng
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
