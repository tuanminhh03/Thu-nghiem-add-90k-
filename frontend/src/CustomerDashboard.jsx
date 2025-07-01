// src/CustomerDashboard.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

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
    <div className="min-h-screen bg-gray-100 pt-24 pb-8 px-4">
      <div className="max-w-4xl mx-auto bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Lịch sử mua hàng</h2>
        {loading ? (
          <p>Đang tải...</p>
        ) : orders.length === 0 ? (
          <p className="text-gray-500">Bạn chưa có đơn hàng nào.</p>
        ) : (
          <ul className="space-y-4">
            {orders.map(o => (
              <li
                key={o._id}
                className="border p-4 rounded-lg hover:shadow"
              >
                <div className="flex justify-between">
                  <div>
                    <p>
                      <span className="font-semibold">Gói:</span> {o.plan}
                    </p>
                    <p>
                      <span className="font-semibold">Thời gian:</span> {o.duration}
                    </p>
                    <p>
                      <span className="font-semibold">Số tiền:</span>{' '}
                      {o.amount.toLocaleString()}₫
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      o.status === 'PAID'
                        ? 'bg-green-100 text-green-800'
                        : o.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {o.status}
                  </span>
                </div>
                <p className="text-gray-500 text-sm mt-2">
                  Ngày mua: {new Date(o.purchaseDate).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
