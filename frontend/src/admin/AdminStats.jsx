import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AdminLayout from './AdminLayout';

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
        <Metric label="Số lượng tài khoản" value={stats.customerCount} />
        <Metric label="Doanh thu 30 ngày" value={stats.revenueLast30Days} />
        <Metric label="Truy cập hôm nay" value={stats.visitsToday} />
      </div>
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <h2 className="font-semibold mb-2">Doanh thu 30 ngày</h2>
        <BarChart data={stats.revenueChart} color="#3b82f6" />
      </div>
      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="font-semibold mb-2">Lượt truy cập 30 ngày</h2>
        <BarChart data={stats.visitChart} color="#f97316" />
      </div>
    </AdminLayout>
  );
}

function Metric({ label, value }) {
  return (
    <div className="bg-white shadow rounded-lg p-4 text-center">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
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
