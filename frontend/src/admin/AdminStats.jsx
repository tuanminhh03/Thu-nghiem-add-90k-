import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  UsersIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import AdminLayout from './AdminLayout';
import './Admin.css';

// Recharts imports
import {
  ResponsiveContainer,
  BarChart as ReBarChart,
  Bar,
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

export default function AdminStats() {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  // date filters cho revenue detail
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)
      .toISOString()
      .substring(0, 10),
    end: new Date().toISOString().substring(0, 10),
  });

  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    if (!token) return;
    axios
      .get('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setStats(res.data))
      .catch(err => console.error(err));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    axios
      .get('/api/admin/orders', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setOrders(res.data))
      .catch(err => console.error(err));
  }, [token]);

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

  // prepare data cho recharts
  const revenueData = stats.revenueChart.map(d => ({
    date: new Date(d.date).toLocaleDateString('vi-VN'),
    total: d.total,
  }));
  const filteredRevenue = revenueData.filter(d => {
    const dd = new Date(d.date.split('/').reverse().join('-'));
    return (
      dd >= new Date(dateRange.start) &&
      dd <= new Date(dateRange.end)
    );
  });

  return (
    <AdminLayout>
      {/* Header */}
      <header className="admin-header">
        <h1 className="text-xl font-semibold">Dashboard</h1>
      </header>

      <div className="dashboard">
        {/* Stats cards */}
        <div className="stats-grid">
          <div className="card stats-card">
            <div>
              <p className="text-sm text-gray-500">Số lượng tài khoản</p>
              <p className="text-2xl font-bold">{stats.customerCount}</p>
            </div>
            <UsersIcon className="icon" />
          </div>

          <div
            className={`card stats-card ${selectedSection === 'revenue' ? 'active' : ''}`}
            onClick={() =>
              setSelectedSection(prev => (prev === 'revenue' ? null : 'revenue'))
            }
          >
            <div>
              <p className="text-sm text-gray-500">Doanh thu 30 ngày</p>
              <p className="text-2xl font-bold">{stats.revenueLast30Days}</p>
            </div>
            <CurrencyDollarIcon className="icon" />
          </div>

          <div
            className={`card stats-card ${selectedSection === 'visits' ? 'active' : ''}`}
            onClick={() =>
              setSelectedSection(prev => (prev === 'visits' ? null : 'visits'))
            }
          >
            <div>
              <p className="text-sm text-gray-500">Truy cập hôm nay</p>
              <p className="text-2xl font-bold">{stats.visitsToday}</p>
            </div>
            <ChartBarIcon className="icon" />
          </div>
        </div>

        {/* Chi tiết doanh thu khi click */}
        {selectedSection === 'revenue' && (
          <div className="card mb-6">
            <h2 className="font-semibold mb-4">Doanh thu theo ngày</h2>

            {/* Date filters */}
            <div className="flex items-center space-x-4 mb-4">
              <div>
                <label className="block text-sm">Từ ngày:</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={e =>
                    setDateRange(prev => ({ ...prev, start: e.target.value }))
                  }
                  className="border px-2 py-1 rounded"
                />
              </div>
              <div>
                <label className="block text-sm">Đến ngày:</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={e =>
                    setDateRange(prev => ({ ...prev, end: e.target.value }))
                  }
                  className="border px-2 py-1 rounded"
                />
              </div>
            </div>

            {/* Bar Chart */}
            <ResponsiveContainer width="100%" height={200}>
              <ReBarChart data={filteredRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="#3b82f6" />
              </ReBarChart>
            </ResponsiveContainer>

            {/* Line Chart */}
            <ResponsiveContainer width="100%" height={200} className="mt-6">
              <ReLineChart data={filteredRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#3b82f6"
                  strokeWidth={2}
                />
              </ReLineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Chi tiết visits */}
        {selectedSection === 'visits' && (
          <div className="card mb-6">
            <h2 className="font-semibold mb-2">Lượt truy cập 30 ngày</h2>
            <BarChart data={stats.visitChart} color="#f97316" />
          </div>
        )}

        {/* Đơn hàng mới nhất */}
        <div className="card">
          <h2 className="font-semibold mb-4">Đơn hàng mới nhất</h2>
          <div className="overflow-x-auto p-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">KH</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PLAN</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày mua</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Số tiền</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map(o => (
                  <tr key={o._id}>
                    <td className="px-6 py-4 whitespace-nowrap">{o.user.phone}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{o.plan}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(o.purchaseDate).toLocaleDateString('vi-VN')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">{o.amount}</td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-4">Không có đơn hàng</td>
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

// Giữ lại BarChart cũ cho visits
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
