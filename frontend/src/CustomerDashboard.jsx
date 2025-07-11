// src/CustomerDashboard.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './CustomerDashboard.css';

export default function CustomerDashboard() {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const { data } = await axios.get(
          'http://localhost:5000/api/orders',
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setOrders(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-red-600">
          Vui lòng đăng nhập để xem đơn hàng.
        </p>
      </div>
    );
  }

  return (
    <div className="customer-dashboard pt-24 pb-8 px-4">
      <div className="orders-bg" />
      <div className="orders-overlay" />
      <div className="max-w-4xl mx-auto bg-white shadow rounded-lg p-6 relative">
        <h2 className="text-2xl font-bold mb-4">Lịch sử mua hàng</h2>
        {loading ? (
          <p>Đang tải...</p>
        ) : orders.length === 0 ? (
          <p className="text-gray-500">Bạn chưa có đơn hàng nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">STT</th>
                  <th className="px-4 py-2 text-left">Mã đơn hàng</th>
                  <th className="px-4 py-2 text-left">Ngày mua</th>
                  <th className="px-4 py-2 text-left">Ngày hết hạn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((o, idx) => {
                  const months = parseInt(o.duration, 10) || 0;
                  const purchase = new Date(o.purchaseDate);
                  const expiry = new Date(purchase);
                  expiry.setMonth(purchase.getMonth() + months);
                  return (
                    <tr key={o._id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">{idx + 1}</td>
                      <td className="px-4 py-2">{o._id}</td>
                      <td className="px-4 py-2">
                        {purchase.toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-4 py-2">
                        {expiry.toLocaleDateString('vi-VN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
