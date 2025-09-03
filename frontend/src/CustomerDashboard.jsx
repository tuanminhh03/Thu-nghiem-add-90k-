// src/CustomerDashboard.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './CustomerDashboard.css';
import { priceMapValue } from './priceMap';

function formatDateTime(date) {
  if (!date) return '-';
  const d = new Date(date);
  const pad = (n) => n.toString().padStart(2, '0');
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatHistoryEntry(entry) {
  if (!entry) return '-';
  const date = new Date(entry.date);
  const datePart = date.toLocaleDateString('vi-VN');
  const timePart = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return `${datePart} ${timePart} ${entry.message}`;
}

export default function CustomerDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  const [warrantyProcessingId, setWarrantyProcessingId] = useState(null);
  const [warrantyStep, setWarrantyStep] = useState("");
  const [dotCount, setDotCount] = useState(1);

  // ✅ thông báo bảo hành theo từng order
  const [persistentMessages, setPersistentMessages] = useState({});

  const token = localStorage.getItem('token');

  // fetch orders
  const fetchOrders = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const ordersData = Array.isArray(res.data)
        ? res.data
        : res.data?.data;
      const sorted = Array.isArray(ordersData)
        ? ordersData.sort((a, b) => new Date(a.purchaseDate) - new Date(b.purchaseDate))
        : [];
      setOrders(sorted);
    } catch (err) {
      console.error('fetchOrders error:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!window.confirm(`Gia hạn ${months} tháng với giá ${amount.toLocaleString()}đ?`)) {
      return;
    }

    try {
      const idForApi = order.orderCode || order._id;
      await axios.post(
        `http://localhost:5000/api/orders/${idForApi}/extend`,
        { months, amount },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchOrders();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Lỗi gia hạn');
    }
  };

  const handleExtendClick = (order) => {
    const input = prompt('Gia hạn thêm mấy tháng? (1,3,6,12)');
    if (input === null) return;
    const months = parseInt(input, 10);
    if (![1, 3, 6, 12].includes(months)) {
      alert('Vui lòng nhập 1, 3, 6, hoặc 12');
      return;
    }
    handleExtend(order, months);
  };

  const handleTvLogin = async (order) => {
    const orderId = order._id || order.orderCode;
    if (!orderId) {
      alert("Không tìm thấy ID đơn hàng");
      return;
    }

    const tvCode = prompt("Nhập mã TV Code:");
    if (!tvCode) return;

    try {
      const res = await axios.post(
        `http://localhost:5000/api/account50k/${orderId}/tv-login`,
        { tvCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(res.data.message || "TV Login thành công");
    } catch (err) {
      console.error("tvLogin error:", err);
      alert(err.response?.data?.message || "Lỗi tv-login");
    }
  };

  const handleWarrantyClick = (orderId) => {
    setWarrantyProcessingId(orderId);
    setWarrantyStep("Bắt đầu bảo hành...");
    setDotCount(1);

    try {
      const evtSource = new EventSource(
        `http://localhost:5000/api/account50k/warranty?orderId=${orderId}&token=${token}`
      );

      evtSource.addEventListener("progress", (event) => {
        const payload = JSON.parse(event.data);
        console.log("[Warranty progress]", payload.message);
        setWarrantyStep(payload.message);
      });

      evtSource.addEventListener("done", async (event) => {
        const payload = JSON.parse(event.data);
        console.log("[Warranty done]", payload.message);

        evtSource.onerror = null;
        evtSource.close();

        const finalMsg = payload.message || "✅ Bảo hành thành công";

        // ✅ lưu message cho đúng order
        setPersistentMessages(prev => ({
          ...prev,
          [orderId]: finalMsg,
        }));

        try {
          await fetchOrders();
        } catch (err) {
          console.error("Lỗi fetch lại orders sau bảo hành:", err);
        }

        setTimeout(() => {
          setWarrantyProcessingId(null);
          setWarrantyStep("");
        }, 3000);
      });

      evtSource.onerror = (err) => {
        if (evtSource.readyState === EventSource.CLOSED) return;
        console.error("Warranty SSE error:", err);
        setWarrantyStep("Lỗi kết nối SSE ❌");
        evtSource.close();
      };
    } catch (err) {
      console.error("Warranty error:", err);
      setWarrantyStep("Lỗi khi bảo hành ❌");
    }
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
                  const expiry = o.expiresAt ? new Date(o.expiresAt) : new Date(purchase);
                  if (!o.expiresAt) {
                    const months = parseInt(o.duration, 10) || 0;
                    expiry.setMonth(purchase.getMonth() + months);
                  }

                  const now = new Date();
                  const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
                  const isExpired = o.status === 'EXPIRED' || daysLeft <= 0;
                  const rowId = o._id || o.orderCode;

                  return (
                    <React.Fragment key={rowId}>
                      <tr>
                        <td>{idx + 1}</td>
                        <td>
                          <button
                            type="button"
                            className="order-id-button"
                            onClick={() => setExpandedOrderId(expandedOrderId === rowId ? null : rowId)}
                          >
                            {o.orderCode || o._id}
                          </button>
                        </td>
                        <td>{o.plan}</td>
                        <td>{formatDateTime(purchase)}</td>
                        <td>{expiry.toLocaleDateString('vi-VN')}</td>
                        <td>{isExpired ? 'Đã hết hạn' : `${daysLeft} ngày`}</td>
                        <td>
                          <button type="button" className="extend-button" onClick={() => handleExtendClick(o)}>
                            Gia hạn
                          </button>
                        </td>
                      </tr>

                      {expandedOrderId === rowId && (
                        <tr className="order-details-row">
                          <td colSpan={7}>
                            <div className="order-details">
                              <p>
                                <strong>Email:</strong> {isExpired ? '-' : o.accountEmail || '-'}
                                {!isExpired && o.accountEmail && (
                                  <button
                                    className="copy-button"
                                    onClick={() => navigator.clipboard.writeText(o.accountEmail)}
                                  >
                                    📋 Copy
                                  </button>
                                )}
                              </p>
                              <p>
                                <strong>Password:</strong> {isExpired ? '-' : o.accountPassword || '-'}
                                {!isExpired && o.accountPassword && (
                                  <button
                                    className="copy-button"
                                    onClick={() => navigator.clipboard.writeText(o.accountPassword)}
                                  >
                                    📋 Copy
                                  </button>
                                )}
                              </p>

                              {o.plan === 'Gói cao cấp' && (
                                <>
                                  <p><strong>Tên hồ sơ:</strong> {o.profileName || '-'}</p>
                                  <p><strong>Mã PIN:</strong> {o.pin || '-'}</p>
                                  <p><strong>Ngày cập nhật:</strong> {formatHistoryEntry(o.history?.[o.history.length - 1])}</p>
                                </>
                              )}
                              {o.plan === 'Gói tiết kiệm' && !isExpired && (
                                <>
                                  <div className="warranty-row">
                                    {persistentMessages[rowId] && (
                                      <div className="warranty-message">{persistentMessages[rowId]}</div>
                                    )}


                                    {/* ✅ Chỉ cho GTK/ADGTK mới có select chức năng */}
                                    {(((o.orderCode || "").startsWith("GTK") || (o.orderCode || "").startsWith("ADGTK"))) && warrantyProcessingId !== rowId && (

                                      <div className="action-select">
                                        <select
                                          defaultValue=""
                                          onChange={(e) => {
                                            if (e.target.value === "tv") handleTvLogin(o);
                                            if (e.target.value === "warranty") handleWarrantyClick(rowId);
                                            e.target.value = "";
                                          }}
                                        >
                                          <option value="" disabled>-- Chọn chức năng --</option>
                                          <option value="tv">TV Login</option>
                                          <option value="warranty">Bảo hành</option>
                                        </select>
                                      </div>
                                    )}
                                  </div>

                                  {warrantyProcessingId === rowId && (
                                    <div className="warranty-processing">
                                      <p>{warrantyStep}</p>
                                      <button type="button" className="warranty-progress-button" disabled>
                                        {'.'.repeat(dotCount)}
                                      </button>
                                    </div>
                                  )}
                                </>
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
