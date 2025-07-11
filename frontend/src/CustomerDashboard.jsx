// src/CustomerDashboard.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './CustomerDashboard.css';
import { priceMapValue } from './priceMap';

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

  const handleExtend = async (order, months) => {
    const amountMap = priceMapValue[order.plan];
    const key = `${months.toString().padStart(2, '0')} tháng`;
    const amount = amountMap ? amountMap[key] : 0;
    if (!amount) {
      alert('Không có giá cho lựa chọn này');
      return;
    }
    if (!window.confirm(`Gia hạn ${months} tháng với giá ${amount.toLocaleString()}đ?`)) {
      return;
    }
    try {
      const { data } = await axios.post(
        `http://localhost:5000/api/orders/${order._id}/extend`,
        { months, amount },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOrders(orders.map(o => (o._id === order._id ? data : o)));
      const stored = localStorage.getItem('user');
      if (stored) {
        const user = JSON.parse(stored);
        user.amount -= amount;
        localStorage.setItem('user', JSON.stringify(user));
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Lỗi gia hạn');
    }
  };

  const handleExtendClick = (order) => {
    const months = parseInt(prompt('Gia hạn thêm mấy tháng? (1,3,6,12)'), 10);
    if (![1,3,6,12].includes(months)) return;
    handleExtend(order, months);
  };

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
                  <th className="px-4 py-2 text-left">Tên sản phẩm</th>
                  <th className="px-4 py-2 text-left">Ngày mua</th>
                  <th className="px-4 py-2 text-left">Ngày hết hạn</th>
                  <th className="px-4 py-2 text-left">Số ngày còn lại</th>
                  <th className="px-4 py-2 text-center">Chức năng</th>
                  <th className="px-4 py-2 text-left">Chú thích</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((o, idx) => {
                  const months = parseInt(o.duration, 10) || 0;
                  const purchase = new Date(o.purchaseDate);
                  const expiry = new Date(purchase);
                  expiry.setMonth(purchase.getMonth() + months);
                  const daysLeft = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));
                  return (
                    <tr key={o._id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">{idx + 1}</td>
                      <td className="px-4 py-2">{o._id}</td>
                      <td className="px-4 py-2">{o.plan}</td>
                      <td className="px-4 py-2">
                        {purchase.toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-4 py-2">
                        {expiry.toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-4 py-2">
                        {daysLeft > 0 ? `${daysLeft} ngày` : 'Đã hết hạn'}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => handleExtendClick(o)}
                          className="text-blue-600 hover:underline"
                        >
                          Gia hạn
                        </button>
                      </td>
                      <td className="px-4 py-2">
                        {o.plan === 'Gói cao cấp'
                          ? 'Vui lòng liên hệ Admin để lấy tài khoản'
                          : 'Ấn vào mã đơn hàng để lấy tài khoản'}
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
