import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
  UsersIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  HomeIcon,
} from '@heroicons/react/24/outline';
import AdminLayout from './AdminLayout';
import './Admin.css';

// Recharts
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

// Reusable Card component
function Card({ children, onClick }) {
  return (
    <div className="card-ui" onClick={onClick}>
      {children}
    </div>
  );
}

export default function AdminStats() {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [section, setSection] = useState(null); // 'revenue' | 'visits' | null
  const [range, setRange] = useState({
    start: new Date(Date.now() - 29 * 86400_000).toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10),
  });
  const token = localStorage.getItem('adminToken');

  // Fetch stats & orders
  const fetchStats = useCallback(() => {
    axios
      .get('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setStats(r.data))
      .catch(console.error);
  }, [token]);
  const fetchOrders = useCallback(() => {
    axios
      .get('/api/admin/orders', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setOrders(Array.isArray(r.data.data) ? r.data.data : []))
      .catch(console.error);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchStats();
    fetchOrders();
    // real-time update
    const es = new EventSource(
      `http://localhost:5000/api/admin/orders/stream?token=${token}`
    );
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      fetchStats();
      setOrders((prev) => [data, ...prev.filter((o) => o._id !== data._id)].slice(0, 20));
    };
    return () => es.close();
  }, [token, fetchStats, fetchOrders]);

  if (!stats)
    return (
      <AdminLayout>
        <p className="loading">Đang tải...</p>
      </AdminLayout>
    );

  // chart data filtered by date
  const revenueData = stats.revenueChart
    .map((d) => ({
      date: new Date(d.date).toLocaleDateString('vi-VN'),
      total: d.total,
    }))
    .filter((d) => {
      const [dd, mm, yy] = d.date.split('/');
      const dt = new Date(`${yy}-${mm}-${dd}`);
      return dt >= new Date(range.start) && dt <= new Date(range.end);
    });

  return (
    <AdminLayout>
      {/* Header & Breadcrumb */}
      <header className="stats-header">
        <div className="breadcrumb">
          <HomeIcon className="icon-sm" />
          <span>/ Dashboard</span>
        </div>
        <h1>Dashboard</h1>
      </header>

      {/* Summary Banner */}
      <section className="summary-banner">
        <Card>
          <UsersIcon className="icon-lg text-blue-500" />
          <div>
            <p className="label">Tài khoản Active</p>
            <p className="value">{stats.customerCount}</p>
          </div>
        </Card>
        <Card onClick={() => setSection('revenue')}>
          <CurrencyDollarIcon className="icon-lg text-green-500" />
          <div>
            <p className="label">Doanh thu 30d</p>
            <p className="value">{stats.revenueLast30Days}</p>
          </div>
        </Card>
        <Card onClick={() => setSection('visits')}>
          <ChartBarIcon className="icon-lg text-purple-500" />
          <div>
            <p className="label">Truy cập 30d</p>
            <p className="value">
              {stats.visitChart.reduce((sum, d) => sum + d.total, 0)}
            </p>
          </div>
        </Card>
      </section>

      {/* Charts & Filters */}
      {section === 'revenue' && (
        <section className="chart-section">
          <div className="filter-date">
            <label>
              Từ: <input type="date" value={range.start} onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))} />
            </label>
            <label>
              Đến: <input type="date" value={range.end} onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))} />
            </label>
          </div>
          <div className="charts">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" />
              </BarChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {section === 'visits' && (
        <section className="chart-section">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={stats.visitChart.map((d) => ({
                date: new Date(d.date).toLocaleDateString('vi-VN'),
                total: d.total,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" />
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* Latest Orders */}
      <section className="orders-section">
        <h2>Đơn hàng mới</h2>
        <div className="orders-table">
          <table>
            <thead>
              <tr>
                <th>KH</th>
                <th>Plan</th>
                <th>Ngày</th>
                <th className="text-right">Số tiền</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o._id}>
                  <td>{o.user.phone}</td>
                  <td>{o.plan}</td>
                  <td>{new Date(o.purchaseDate).toLocaleDateString('vi-VN')}</td>
                  <td className="text-right">{o.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminLayout>
  );
}
