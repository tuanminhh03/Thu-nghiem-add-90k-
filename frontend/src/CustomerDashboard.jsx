// src/CustomerDashboard.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './CustomerDashboard.css';
import { priceMapValue } from './priceMap';

export default function CustomerDashboard() {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
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
      <div className="customer-dashboard">
        <div className="card">
          <p className="no-orders">
            Vui lòng đăng nhập để xem đơn hàng.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-dashboard">
      <div className="orders-bg" />
      <div className="orders-overlay" />
      <div className="card">
        <h2>Lịch sử mua hàng</h2>
        {loading ? (
          <p>Đang tải...</p>
        ) : orders.length === 0 ? (
          <p className="no-orders">Bạn chưa có đơn hàng nào.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Mã đơn hàng</th>
                  <th>Tên sản phẩm</th>
                  <th>Ngày mua</th>
                  <th>Ngày hết hạn</th>
                  <th>Số ngày còn lại</th>
                  <th>Chức năng</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o, idx) => {
                  const months = parseInt(o.duration, 10) || 0;
                  const purchase = new Date(o.purchaseDate);
                  const expiry = new Date(purchase);
                  expiry.setMonth(purchase.getMonth() + months);
                  const daysLeft = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));
                  return (
                    <React.Fragment key={o._id}>
                      <tr>
                        <td>{idx + 1}</td>
                        <td>
                          <button
                            className="order-id-button"
                            onClick={() =>
                              setExpandedOrderId(expandedOrderId === o._id ? null : o._id)
                            }
                          >
                            {o._id}
                          </button>
                        </td>
                        <td>{o.plan}</td>
                        <td>{purchase.toLocaleDateString('vi-VN')}</td>
                        <td>{expiry.toLocaleDateString('vi-VN')}</td>
                        <td>{daysLeft > 0 ? `${daysLeft} ngày` : 'Đã hết hạn'}</td>
                        <td className="text-center">
                          <button onClick={() => handleExtendClick(o)}>
                            Gia hạn
                          </button>
                        </td>
                      </tr>
                      {expandedOrderId === o._id && (
                        <tr className="order-details-row">
                          <td colSpan={7}>
                            <div className="order-details">
                              <p><strong>Email:</strong> {o.accountEmail || '-'}</p>
                              <p><strong>Password:</strong> {o.accountPassword || '-'}</p>
                              <p><strong>Tên hồ sơ:</strong> {o.profileName || '-'}</p>
                              <p><strong>Mã PIN:</strong> {o.pin || '-'}</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
