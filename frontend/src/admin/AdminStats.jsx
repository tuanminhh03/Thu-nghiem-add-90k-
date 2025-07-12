import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AdminLayout from './AdminLayout';
import './Admin.css';

export default function AdminStats() {
  const [stats, setStats] = useState(null);
  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    if (!token) return;
    axios
      .get('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setStats(res.data))
      .catch(err => console.error(err));
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card text-center">
          <p className="text-sm text-gray-500">Số lượng tài khoản</p>
          <p className="text-2xl font-bold">{stats.customerCount}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Doanh thu 30 ngày</p>
          <p className="text-2xl font-bold">{stats.revenueLast30Days}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Truy cập hôm nay</p>
          <p className="text-2xl font-bold">{stats.visitsToday}</p>
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