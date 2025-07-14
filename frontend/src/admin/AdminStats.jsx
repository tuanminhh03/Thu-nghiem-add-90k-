import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  UsersIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import AdminLayout from './AdminLayout';
import './Admin.css';

export default function AdminStats() {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    if (!token) return;
    axios
      .get('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setStats(res.data))
      .catch(err => console.error(err));
  }, [token]);

  // Fetch recent orders
  useEffect(() => {
    if (!token) return;
    axios
      .get('/api/admin/orders', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setOrders(res.data))
      .catch(err => console.error(err));
  }, [token]);

  // Listen for order updates
  useEffect(() => {
    if (!token) return;
    const es = new EventSource(`/api/admin/orders/stream?token=${token}`);
    es.onmessage = e => {
      try {
        const data = JSON.parse(e.data);
        setOrders(prev => {
          const idx = prev.findIndex(o => o._id === data._id);
          if (idx !== -1) {
            const copy = [...prev];
            copy[idx] = data;
            return copy;
          }
          return [data, ...prev].slice(0, 20);
        });
      } catch {}
    };
    return () => es.close();
  }, [token]);

  if (!stats) {
    return (
      <AdminLayout>
        <p>Đang tải...</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="dashboard">
        <header className="admin-header">
          <h1 className="text-xl font-semibold">Dashboard</h1>
        </header>

        <div className="stats-grid">
          <div className="card stats-card">
            <div>
              <p className="text-sm text-gray-500">Số lượng tài khoản</p>
              <p className="text-2xl font-bold">{stats.customerCount}</p>
            </div>
            <UsersIcon className="icon" />
          </div>
          <div className="card stats-card">
            <div>
              <p className="text-sm text-gray-500">Doanh thu 30 ngày</p>
              <p className="text-2xl font-bold">{stats.revenueLast30Days}</p>
            </div>
            <CurrencyDollarIcon className="icon" />
          </div>
          <div className="card stats-card">
            <div>
              <p className="text-sm text-gray-500">Truy cập hôm nay</p>
              <p className="text-2xl font-bold">{stats.visitsToday}</p>
            </div>
            <ChartBarIcon className="icon" />
          </div>
        </div>

        <div className="card mb-6">
          <h2 className="font-semibold mb-2">Doanh thu 30 ngày</h2>
          <BarChart data={stats.revenueChart} color="#3b82f6" />
        </div>

        <div className="card">
          <h2 className="font-semibold mb-2">Lượt truy cập 30 ngày</h2>
          <BarChart data={stats.visitChart} color="#f97316" />
        </div>

        <div className="card mb-6">
          <h2 className="font-semibold mb-2">Đơn hàng mới nhất</h2>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>KH</th>
                  <th>Plan</th>
                  <th>Ngày mua</th>
                  <th>Số tiền</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o._id}>
                    <td>{o.user.phone}</td>
                    <td>{o.plan}</td>
                    <td>{new Date(o.purchaseDate).toLocaleDateString('vi-VN')}</td>
                    <td>{o.amount}</td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center">
                      Không có đơn hàng
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function BarChart({ data, color }) {
  const max = Math.max(...data.map(d => d.total), 1);
  return (
    <div className="flex items-end h-40 space-x-1">
      {data.map(d => (
        <div key={d.date} className="flex-1 flex flex-col items-center">
          <div
            style={{ height: `${(d.total / max) * 100}%`, backgroundColor: color }}
            className="w-full"
          />
          <span className="text-[10px]">{new Date(d.date).getDate()}</span>
        </div>
      ))}
    </div>
  );
}