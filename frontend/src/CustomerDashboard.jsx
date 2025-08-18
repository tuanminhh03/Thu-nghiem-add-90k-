// src/CustomerDashboard.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './CustomerDashboard.css';
import { priceMapValue } from './priceMap';

function formatDateTime(date) {
  const pad = (n) => n.toString().padStart(2, '0');
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatHistoryEntry(entry) {
  if (!entry) return '-';
  const date = new Date(entry.date);
  const datePart = date.toLocaleDateString('vi-VN');
  const timePart = date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit'
  });
  return `${datePart} ${timePart} ${entry.message}`;
}

export default function CustomerDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [warrantyProcessingId, setWarrantyProcessingId] = useState(null);
  const [dotCount, setDotCount] = useState(1);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) return;
    (async () => {
      const storedUser = localStorage.getItem('user');
      const phone = storedUser ? JSON.parse(storedUser).phone : null;
      const localOrders = JSON.parse(localStorage.getItem('orders50k') || '[]')
        .filter(o => o.phone === phone)
        .map(o => ({
          _id: o.orderCode,
          orderCode: o.orderCode,
          plan: 'Gói tiết kiệm',
          purchaseDate: o.purchaseDate,
          expiresAt: o.expirationDate,
          accountEmail: o.username,
          accountPassword: o.password,
        }));

      try {
        const { data } = await axios.get('http://localhost:5000/api/orders', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const combined = [...data, ...localOrders];
        combined.sort((a, b) => new Date(a.purchaseDate) - new Date(b.purchaseDate));
        setOrders(combined);
      } catch (err) {
        console.error(err);
        const sortedLocal = [...localOrders].sort((a, b) => new Date(a.purchaseDate) - new Date(b.purchaseDate));
        setOrders(sortedLocal);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  useEffect(() => {
    if (!warrantyProcessingId) return;
    const interval = setInterval(() => {
      setDotCount((prev) => (prev % 3) + 1);
    }, 500);
    return () => clearInterval(interval);
  }, [warrantyProcessingId]);

  const handleExtend = async (order, months) => {
    const amountMap = priceMapValue[order.plan];
    const key = `${months.toString().padStart(2, '0')} tháng`;
    const amount = amountMap ? amountMap[key] : 0;

    if (!amount) {
      alert('Không có giá cho lựa chọn này');
      return;
    }
    if (
      !window.confirm(
        `Gia hạn ${months} tháng với giá ${amount.toLocaleString()}đ?`
      )
    ) {
      return;
    }

    try {
      const { data } = await axios.post(
        `http://localhost:5000/api/orders/${order._id}/extend`,
        { months, amount },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setOrders((prev) => prev.map((o) => (o._id === order._id ? data : o)));

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
    const input = prompt('Gia hạn thêm mấy tháng? (1,3,6,12)');
    if (input === null) return; // user bấm Cancel
    const months = parseInt(input, 10);
    if (![1, 3, 6, 12].includes(months)) {
      alert('Vui lòng nhập 1, 3, 6, hoặc 12');
      return;
    }
    handleExtend(order, months);
  };

  const handleWarrantyClick = (orderId) => {
    setWarrantyProcessingId(orderId);
    setDotCount(1);
    // TODO: call API bảo hành nếu có, xong thì setWarrantyProcessingId(null)
  };

  if (!token) {
    return (
      <div className="customer-dashboard">
        <div className="card">
          <p className="no-orders">Vui lòng đăng nhập để xem đơn hàng.</p>
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
                  const purchase = new Date(o.purchaseDate);
                  let expiry;
                  if (o.expiresAt) {
                    expiry = new Date(o.expiresAt);
                  } else {
                    const months = parseInt(o.duration, 10) || 0;
                    expiry = new Date(purchase);
                    expiry.setMonth(purchase.getMonth() + months);
                  }

                  const now = new Date();
                  const daysLeft = Math.ceil(
                    (expiry - now) / (1000 * 60 * 60 * 24)
                  );
                  const isExpired = o.status === 'EXPIRED' || daysLeft <= 0;

                  return (
                    <React.Fragment key={o._id}>
                      <tr>
                        <td>{idx + 1}</td>
                        <td>
                          <button
                            type="button"
                            className="order-id-button"
                            onClick={() =>
                              setExpandedOrderId(
                                expandedOrderId === o._id ? null : o._id
                              )
                            }
                          >
                            {o.orderCode || o._id}
                          </button>
                        </td>
                        <td>{o.plan}</td>
                        <td>{formatDateTime(purchase)}</td>
                        <td>{expiry.toLocaleDateString('vi-VN')}</td>
                        <td>{isExpired ? 'Đã hết hạn' : `${daysLeft} ngày`}</td>
                        <td>
                          <button
                            type="button"
                            className="extend-button"
                            onClick={() => handleExtendClick(o)}
                          >
                            Gia hạn
                          </button>
                        </td>
                      </tr>

                      {expandedOrderId === o._id && (
                        <tr className="order-details-row">
                          <td colSpan={7}>
                            <div className="order-details">
                              <p>
                                <strong>Email:</strong>{' '}
                                {isExpired ? '-' : o.accountEmail || '-'}
                              </p>
                              <p>
                                <strong>Password:</strong>{' '}
                                {isExpired ? '-' : o.accountPassword || '-'}
                              </p>

                              {o.plan === 'Gói cao cấp' && (
                                <>
                                  <p>
                                    <strong>Tên hồ sơ:</strong>{' '}
                                    {o.profileName || '-'}
                                  </p>
                                  <p>
                                    <strong>Mã PIN:</strong> {o.pin || '-'}
                                  </p>
                                  <p>
                                    <strong>Ngày cập nhật:</strong>{' '}
                                    {formatHistoryEntry(
                                      o.history && o.history[o.history.length - 1]
                                    )}
                                  </p>
                                </>
                              )}

                              {o.plan === 'Gói tiết kiệm' && !isExpired && (
                                warrantyProcessingId === o._id ? (
                                  <div className="warranty-processing">
                                    <p>
                                      Vui lòng chờ hệ thống check tài khoản
                                      xong
                                    </p>
                                    <button
                                      type="button"
                                      className="warranty-progress-button"
                                      disabled
                                    >
                                      {'.'.repeat(dotCount)}
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    className="warranty-button"
                                    onClick={() => handleWarrantyClick(o._id)}
                                  >
                                    Bảo hành
                                  </button>
                                )
                              )}
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
