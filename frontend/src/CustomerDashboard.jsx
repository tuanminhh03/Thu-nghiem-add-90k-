// src/CustomerDashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import "./CustomerDashboard.css";
import { priceMapValue } from "./priceMap";
import RotateHintOrders from "./RotateHintOrders";

/* ================== CONFIG ================== */
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  window.__API_URL__ ||
  "http://localhost:5000";

/* Axios instance để tự động gắn baseURL + token */
const useAxios = (token) =>
  useMemo(() => {
    const instance = axios.create({
      baseURL: API_BASE,
      withCredentials: false,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return instance;
  }, [token]);

/* ================== UTILS ================== */
const pad2 = (n) => n.toString().padStart(2, "0");

function formatDateTime(date) {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d)) return "-";
  return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}/${d.getFullYear()} ${pad2(
    d.getHours()
  )}:${pad2(d.getMinutes())}`;
}

function formatHistoryEntry(entry) {
  if (!entry) return "-";
  const date = new Date(entry.date);
  if (isNaN(date)) return "-";
  const datePart = date.toLocaleDateString("vi-VN");
  const timePart = date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return `${datePart} ${timePart} ${entry.message || ""}`.trim();
}

const normalizeId = (v) => (v ? String(v) : "");

/* ================== COMPONENT ================== */
export default function CustomerDashboard() {
  const token = localStorage.getItem("token");
  const api = useAxios(token);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [premiumActionId, setPremiumActionId] = useState(null);

  // Bảo hành (SSE)
  const [warrantyProcessingId, setWarrantyProcessingId] = useState(null);
  const [warrantyStep, setWarrantyStep] = useState("");
  const [dotCount, setDotCount] = useState(1);
  const [persistentMessages, setPersistentMessages] = useState({});
  const sseRef = useRef(null);

  // Detect orientation chắc chắn
  const [isPortrait, setIsPortrait] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait)");
    const onChange = (e) => setIsPortrait(e.matches);
    setIsPortrait(mq.matches);
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);

    const onResize = () => setIsPortrait(window.innerHeight >= window.innerWidth);
    window.addEventListener("resize", onResize);

    // DEBUG: xem trạng thái trong console
    console.log("[CustomerDashboard] portrait?", mq.matches, window.innerWidth, window.innerHeight);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  

  /* ========== Helpers ========== */
  const applyUpdatedOrder = (updated) => {
    if (!updated) return;
    setOrders((prev) =>
      Array.isArray(prev)
        ? prev.map((entry) => {
            const entryId = normalizeId(entry._id || entry.orderCode);
            const updatedId = normalizeId(updated._id || updated.orderCode);
            return entryId === updatedId ? { ...entry, ...updated } : entry;
          })
        : prev
    );
  };

  const fetchOrders = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.get("/api/orders");
      const ordersData = Array.isArray(res.data) ? res.data : res.data?.data;
      const sorted = Array.isArray(ordersData)
        ? ordersData.sort(
            (a, b) =>
              new Date(b.purchaseDate || 0) - new Date(a.purchaseDate || 0)
          )
        : [];
      setOrders(sorted);
    } catch (err) {
      console.error("fetchOrders error:", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const runPremiumAction = async (order, actionFn, fallbackMessage = "") => {
    const orderId = normalizeId(order._id || order.orderCode);
    if (!orderId) {
      alert("Không tìm thấy mã đơn hàng");
      return null;
    }
    setPremiumActionId(orderId);
    try {
      const response = await actionFn(orderId);
      const updatedOrder = response?.data?.order;
      if (updatedOrder) applyUpdatedOrder(updatedOrder);
      else await fetchOrders();

      const message = response?.data?.message || fallbackMessage;
      if (message) alert(message);
      return response;
    } catch (err) {
      console.error("Premium action error:", err);
      alert(err?.response?.data?.message || "Có lỗi xảy ra khi thực hiện chức năng");
      return null;
    } finally {
      setPremiumActionId(null);
    }
  };

  const handlePremiumAction = async (order, action) => {
    if (!action) return;

    if (action === "household") {
      const noteInput = window.prompt(
        "Nhập ghi chú (có thể để trống nếu không có):",
        order.householdNote || ""
      );
      if (noteInput === null) return;
      const trimmed = noteInput.trim();
      await runPremiumAction(
        order,
        (orderId) => api.post(`/api/orders/${orderId}/household`, { note: trimmed }),
        "Đã gửi yêu cầu cập nhật hộ gia đình"
      );
      return;
    }

    if (action === "profileName") {
      const nameInput = window.prompt("Nhập tên hồ sơ mới:", order.profileName || "");
      if (nameInput === null) return;
      const trimmed = nameInput.trim();
      if (!trimmed) return alert("Tên hồ sơ không được để trống");
      if (trimmed.length > 50) return alert("Tên hồ sơ tối đa 50 ký tự");
      await runPremiumAction(
        order,
        (orderId) => api.put(`/api/orders/${orderId}/profile-name`, { profileName: trimmed }),
        "Đã cập nhật tên hồ sơ"
      );
      return;
    }

    if (action === "pin") {
      const pinInput = window.prompt("Nhập mã PIN mới (4 chữ số):", "");
      if (pinInput === null) return;
      const trimmed = pinInput.trim();
      if (!/^\d{4}$/.test(trimmed)) return alert("Mã PIN phải gồm đúng 4 chữ số");
      await runPremiumAction(
        order,
        (orderId) => api.put(`/api/orders/${orderId}/pin`, { pin: trimmed }),
        "Đã cập nhật mã PIN"
      );
    }
  };

  const handleExtend = async (order, months) => {
    const amountMap = priceMapValue[order.plan];
    const key = `${months.toString().padStart(2, "0")} tháng`;
    const amount = amountMap ? amountMap[key] : 0;

    if (!amount) return alert("Không có giá cho lựa chọn này");
    if (!window.confirm(`Gia hạn ${months} tháng với giá ${amount.toLocaleString()}đ?`)) return;

    try {
      const idForApi = order.orderCode || order._id;
      await api.post(`/api/orders/${idForApi}/extend`, { months, amount });
      await fetchOrders();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Lỗi gia hạn");
    }
  };

  const handleExtendClick = (order) => {
    const input = prompt("Gia hạn thêm mấy tháng? (1,3,6,12)");
    if (input === null) return;
    const months = parseInt(input, 10);
    if (![1, 3, 6, 12].includes(months)) return alert("Vui lòng nhập 1, 3, hoặc 12");
    handleExtend(order, months);
  };

  const handleTvLogin = async (order) => {
    const orderId = order._id || order.orderCode;
    if (!orderId) return alert("Không tìm thấy ID đơn hàng");

    const tvCode = prompt("Nhập mã TV Code:");
    if (!tvCode) return;

    try {
      const res = await api.post(`/api/account50k/${orderId}/tv-login`, { tvCode });
      alert(res.data.message || "TV Login thành công");
    } catch (err) {
      console.error("tvLogin error:", err);
      alert(err.response?.data?.message || "Lỗi tv-login");
    }
  };

  const handleWarrantyClick = (orderId) => {
    // đóng SSE cũ nếu có
    if (sseRef.current) {
      sseRef.current.onerror = null;
      sseRef.current.close?.();
      sseRef.current = null;
    }

    setWarrantyProcessingId(orderId);
    setWarrantyStep("Bắt đầu bảo hành...");
    setDotCount(1);

    try {
      const url = `${API_BASE}/api/account50k/warranty?orderId=${orderId}&token=${encodeURIComponent(
        token || ""
      )}`;
      const evtSource = new EventSource(url);
      sseRef.current = evtSource;

      evtSource.addEventListener("progress", (event) => {
        const payload = JSON.parse(event.data || "{}");
        setWarrantyStep(payload.message || "Đang xử lý…");
      });

      evtSource.addEventListener("done", async (event) => {
        const payload = JSON.parse(event.data || "{}");

        evtSource.onerror = null;
        evtSource.close();

        const finalMsg = payload.message || "✅ Bảo hành thành công";
        setPersistentMessages((prev) => ({ ...prev, [orderId]: finalMsg }));

        try {
          await fetchOrders();
        } catch (err) {
          console.error("Lỗi fetch lại orders sau bảo hành:", err);
        }

        setTimeout(() => {
          setWarrantyProcessingId(null);
          setWarrantyStep("");
        }, 2500);
        sseRef.current = null;
      });

      evtSource.onerror = (err) => {
        if (evtSource.readyState === EventSource.CLOSED) return;
        console.error("Warranty SSE error:", err);
        setWarrantyStep("Lỗi kết nối SSE ❌");
        evtSource.close();
        sseRef.current = null;
      };
    } catch (err) {
      console.error("Warranty error:", err);
      setWarrantyStep("Lỗi khi bảo hành ❌");
    }
  };

  /* ========== Effects ========== */
  useEffect(() => {
    if (!token) return;
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!warrantyProcessingId) return;
    const interval = setInterval(() => setDotCount((prev) => (prev % 3) + 1), 500);
    return () => clearInterval(interval);
  }, [warrantyProcessingId]);

  if (!token) {
    return (
      <div className="customer-dashboard">
        {isPortrait && <RotateHintOrders />}
        <div className="card">
          <p className="no-orders">Vui lòng đăng nhập để xem đơn hàng.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-dashboard">
      {isPortrait && <RotateHintOrders />}

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
                  <th>Thông tin</th>
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
                  const isDeleted = o.status === "DELETED";
                  const isExpired = o.status === "EXPIRED" || (!isDeleted && daysLeft <= 0);
                  const isInactive = isExpired || isDeleted;
                  const remainingText = isDeleted
                    ? "Bị xóa"
                    : isExpired
                    ? "Đã hết hạn"
                    : `${daysLeft} ngày`;
                  const rowId = o._id || o.orderCode;
                  const latestHistory =
                    Array.isArray(o.history) && o.history.length > 0
                      ? o.history[o.history.length - 1]
                      : null;

                  return (
                    <React.Fragment key={rowId}>
                      <tr>
                        <td>{idx + 1}</td>
                        <td>
                          <button
                            type="button"
                            className="order-id-button"
                            onClick={() =>
                              setExpandedOrderId(expandedOrderId === rowId ? null : rowId)
                            }
                          >
                            {o.orderCode || o._id}
                          </button>
                        </td>
                        <td>{o.plan}</td>
                        <td>{formatDateTime(purchase)}</td>
                        <td>{expiry.toLocaleDateString("vi-VN")}</td>
                        <td>{remainingText}</td>
                        <td>
                          <button
                            type="button"
                            className="info-button"
                            onClick={() =>
                              setExpandedOrderId(expandedOrderId === rowId ? null : rowId)
                            }
                            aria-expanded={expandedOrderId === rowId}
                          >
                            Xem
                          </button>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="extend-button"
                            onClick={() => handleExtendClick(o)}
                            disabled={isInactive}
                          >
                            Gia hạn
                          </button>
                        </td>
                      </tr>

                      {expandedOrderId === rowId && (
                        <tr className="order-details-row">
                          <td colSpan={8}>
                            <div className="order-details">
                              <p>
                                <strong>Email:</strong> {isInactive ? "-" : o.accountEmail || "-"}
                                {!isInactive && o.accountEmail && (
                                  <button
                                    className="copy-button"
                                    onClick={() => navigator.clipboard.writeText(o.accountEmail)}
                                  >
                                    📋 Copy
                                  </button>
                                )}
                              </p>
                              <p>
                                <strong>Password:</strong> {isInactive ? "-" : o.accountPassword || "-"}
                                {!isInactive && o.accountPassword && (
                                  <button
                                    className="copy-button"
                                    onClick={() => navigator.clipboard.writeText(o.accountPassword)}
                                  >
                                    📋 Copy
                                  </button>
                                )}
                              </p>

                              {o.plan === "Gói cao cấp" && (
                                <>
                                  <p><strong>Tên hồ sơ:</strong> {o.profileName || "-"}</p>
                                  <p><strong>Mã PIN:</strong> {o.pin || "-"}</p>
                                  <p><strong>Ngày cập nhật:</strong> {formatHistoryEntry(latestHistory)}</p>
                                  {(o.householdNote || o.householdUpdatedAt) && (
                                    <p>
                                      <strong>Link cập nhập hộ gia đình:</strong>{" "}
                                      {o.householdNote || "Đã cập nhật"}
                                      {o.householdUpdatedAt && ` (${formatDateTime(o.householdUpdatedAt)})`}
                                    </p>
                                  )}
                                  <div className="premium-actions">
                                    <div className="action-select">
                                      <select
                                        defaultValue=""
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          e.target.value = "";
                                          handlePremiumAction(o, value);
                                        }}
                                        disabled={premiumActionId === rowId}
                                      >
                                        <option value="" disabled>-- Chọn chức năng --</option>
                                        <option value="household">Cập nhập hộ gia đình</option>
                                        <option value="profileName">Thay đổi tên hồ sơ</option>
                                        <option value="pin">Đổi mã PIN</option>
                                      </select>
                                    </div>
                                    {premiumActionId === rowId && (
                                      <span className="premium-action-status">Đang xử lý...</span>
                                    )}
                                  </div>
                                </>
                              )}

                              {o.plan === "Gói tiết kiệm" && !isExpired && (
                                <>
                                  <div className="warranty-row">
                                    {persistentMessages[rowId] && (
                                      <div className="warranty-message">{persistentMessages[rowId]}</div>
                                    )}

                                    {/* Chỉ GTK/ADGTK mới có select chức năng */}
                                    {(((o.orderCode || "").startsWith("GTK") ||
                                       (o.orderCode || "").startsWith("ADGTK"))) &&
                                      warrantyProcessingId !== rowId && (
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
