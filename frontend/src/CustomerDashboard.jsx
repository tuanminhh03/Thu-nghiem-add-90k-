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

  const token = localStorage.getItem('token'); // chỉ giữ token để auth

  // fetch orders từ backend
  const fetchOrders = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await axios.get('http://localhost:5000/api/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const sorted = Array.isArray(data)
        ? data.sort((a, b) => new Date(a.purchaseDate) - new Date(b.purchaseDate))
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
  const handleWarrantyClick = (orderId) => {
    setWarrantyProcessingId(orderId);
    setWarrantyStep("Bắt đầu bảo hành...");
    setDotCount(1);

    try {
      const evtSource = new EventSource(
        `http://localhost:5000/api/account50k/warranty?orderId=${orderId}&token=${token}`
      );

      // Lắng nghe progress
      evtSource.addEventListener("progress", (event) => {
        const payload = JSON.parse(event.data);
        console.log("[Warranty progress]", payload.message);
        setWarrantyStep(payload.message);
      });

      // Lắng nghe done
      evtSource.addEventListener("done", async (event) => {
        const payload = JSON.parse(event.data);
        console.log("[Warranty done]", payload.message);

        // Ngừng lắng nghe lỗi SSE để không báo giả
        evtSource.onerror = null;
        evtSource.close();

        // Hiển thị thông báo cuối
        setWarrantyStep(payload.message || "✅ Bảo hành thành công");

        // Refresh dữ liệu orders ngay lập tức
        try {
          await fetchOrders();
        } catch (err) {
          console.error("Lỗi fetch lại orders sau bảo hành:", err);
        }

        // Reset state hiển thị step và animation dot sau 3 giây
        setTimeout(() => {
          setWarrantyProcessingId(null);
          setWarrantyStep("");
        }, 3000);
      });

      // Bắt lỗi SSE thật sự (khác đóng stream bình thường)
      evtSource.onerror = (err) => {
        if (evtSource.readyState === EventSource.CLOSED) return; // bình thường
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
                              <p><strong>Email:</strong> {isExpired ? '-' : o.accountEmail || '-'}</p>
                              <p><strong>Password:</strong> {isExpired ? '-' : o.accountPassword || '-'}</p>

                              {o.plan === 'Gói cao cấp' && (
                                <>
                                  <p><strong>Tên hồ sơ:</strong> {o.profileName || '-'}</p>
                                  <p><strong>Mã PIN:</strong> {o.pin || '-'}</p>
                                  <p><strong>Ngày cập nhật:</strong> {formatHistoryEntry(o.history?.[o.history.length - 1])}</p>
                                </>
                              )}

                              {o.plan === 'Gói tiết kiệm' && !isExpired && (
                                warrantyProcessingId === rowId ? (
                                  <div className="warranty-processing">
                                    <p>{warrantyStep}</p>
                                    <button type="button" className="warranty-progress-button" disabled>{'.'.repeat(dotCount)}</button>
                                  </div>
                                ) : (
                                  <button type="button" className="warranty-button" onClick={() => handleWarrantyClick(rowId)}>
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
