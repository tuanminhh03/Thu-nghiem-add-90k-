import React, { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import "./Admin.css";

const PLAN_DAYS = 30;

export default function AdminNetflixAccounts50k() {
  const [accounts, setAccounts] = useState([]); // Kho account
  const [orders, setOrders] = useState([]);     // Orders đã bán
  const [view, setView] = useState("accounts"); // "accounts" hoặc "orders"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ================== FETCH DATA ==================
  useEffect(() => {
    if (view === "accounts") fetchAccounts();
    if (view === "orders") fetchOrders();
  }, [view]);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/account50k");
      const data = await res.json();
      if (data.success) setAccounts(data.data || []);
    } catch (err) {
      console.error("Lỗi khi load accounts:", err);
      setError("Không tải được dữ liệu kho");
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/account50k/orders");
      const data = await res.json();
      if (data.success) setOrders(data.data || []);
    } catch (err) {
      console.error("Lỗi khi load orders:", err);
      setError("Không tải được dữ liệu orders");
    } finally {
      setLoading(false);
    }
  };

  // ================== HÀNH ĐỘNG ==================
  const handleImport = e => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async evt => {
      try {
        const data = evt.target.result;
        let rows = [];

        if (file.name.toLowerCase().endsWith(".csv")) {
          const text = new TextDecoder().decode(
            data instanceof ArrayBuffer ? data : new TextEncoder().encode(String(data))
          ).trim();
          rows = text.split(/\r?\n/).map(line => line.split("|"));
        } else {
          const XLSX = await import("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm");
          const wb = XLSX.read(new Uint8Array(data), { type: "array" });
          const sheet = wb.SheetNames[0];
          rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1 });
        }

        const imported = rows
          .filter(r => r[0] && r[1])
          .map(r => ({
            username: String(r[0]).trim(),
            password: String(r[1]).trim(),
            cookies: r[2] ? String(r[2]).trim() : "",
          }))
          .filter(
            acc =>
              acc.username.toLowerCase() !== "username" &&
              acc.password.toLowerCase() !== "password"
          );

        await fetch("http://localhost:5000/api/account50k/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accounts: imported }),
        });

        fetchAccounts();
      } catch (err) {
        console.error("Lỗi khi import:", err);
        alert("Import thất bại!");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSell = async acc => {
    const phone = prompt("Nhập số điện thoại khách hàng:");
    if (!phone) return;

    try {
      const res = await fetch(`http://localhost:5000/api/account50k/${acc._id}/sell`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, planDays: PLAN_DAYS }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || "Bán thất bại!");
        return;
      }
      fetchAccounts();
      alert("Đã bán thành công!");
    } catch (err) {
      console.error("Lỗi khi bán account:", err);
      alert("Bán thất bại!");
    }
  };

  const handleSwitchAccount = async (order) => {
    if (!window.confirm("Bạn có chắc muốn chuyển tài khoản mới cho khách hàng này?")) return;
    try {
      const res = await fetch(`http://localhost:5000/api/account50k/orders/${order._id}/switch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || "Chuyển thất bại!");
        return;
      }
      fetchOrders();
      alert("Đã chuyển tài khoản mới!");
    } catch (err) {
      console.error("Lỗi khi chuyển account:", err);
    }
  };

  const handleEditExpiration = async order => {
    const current = order.expiresAt
        ? new Date(order.expiresAt).toISOString().slice(0, 10)
        : "";
      const input = prompt("Nhập ngày hết hạn mới (YYYY-MM-DD):", current);
      if (!input) return;

      const expirationDate = new Date(input);
      if (isNaN(expirationDate)) {
        alert("Ngày hết hạn không hợp lệ");
        return;
      }

      try {
        await fetch(`http://localhost:5000/api/account50k/orders/${order._id}/expiration`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expirationDate }),
        });
        fetchOrders();
        alert("Cập nhật hạn thành công!");
      } catch (err) {
        console.error("Lỗi khi sửa hạn:", err);
        alert("Sửa hạn thất bại!");
      }
  };

  const handleDelete = async order => {
    if (!window.confirm("Bạn có chắc muốn xóa đơn hàng này?")) return;
    try {
      await fetch(`http://localhost:5000/api/account50k/${order._id}`, {
        method: "DELETE",
      });
      fetchOrders();
    } catch (err) {
      console.error("Lỗi khi xóa:", err);
    }
  };

  // ================== RENDER BẢNG ==================
  const renderAccountsTable = () => (
    <div>
      <h2 className="text-lg font-semibold mb-2">Kho Account50k (chưa bán)</h2>
      <input type="file" accept=".csv,.xlsx,.xls" onChange={handleImport} className="mb-2" />
      <table className="table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Password</th>
            <th>Cookies</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {accounts.length ? accounts.map((acc, idx) => (
            <tr key={acc._id || idx}>
              <td>{acc.username}</td>
              <td>{acc.password}</td>
              <td>{acc.cookies ? acc.cookies.substring(0, 10) + "..." : "-"}</td>
              <td><button className="btn btn-primary" onClick={() => handleSell(acc)}>Bán</button></td>
            </tr>
          )) : (
            <tr><td colSpan="4" className="text-center">Kho trống</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const renderOrdersTable = () => (
    <div>
      <h2 className="text-lg font-semibold mb-2">Đơn hàng (đã bán)</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Mã đơn hàng</th>
            <th>Khách</th>
            <th>Email/Acc</th>
            <th>Ngày mua</th>
            <th>Ngày hết hạn</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {orders.length ? orders.map(o => (
            <tr key={o._id}>
              <td>{o.orderCode}</td>
              <td>{o.user?.phone}</td>
              <td>{o.accountEmail}</td>
              <td>{o.purchaseDate ? new Date(o.purchaseDate).toLocaleDateString("vi-VN") : ""}</td>
              <td>{o.expiresAt ? new Date(o.expiresAt).toLocaleDateString("vi-VN") : ""}</td>
              <td className="flex gap-2">
                <button className="btn btn-warning" onClick={() => handleSwitchAccount(o)}>Chuyển</button>
                <button className="btn btn-secondary" onClick={() => handleEditExpiration(o)}>Sửa hạn</button>
                <button className="btn btn-danger" onClick={() => handleDelete(o)}>Xóa</button>
              </td>
            </tr>
          )) : (
            <tr><td colSpan="6" className="text-center">Không có đơn hàng</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <AdminLayout>
      <div className="card">
        <h1 className="text-xl font-semibold mb-4">Quản lý Account50k</h1>

        <div className="mb-4 flex gap-2">
          <button
            className={`btn ${view === "accounts" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setView("accounts")}
          >
            Xem kho Account50k
          </button>
          <button
            className={`btn ${view === "orders" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setView("orders")}
          >
            Xem Orders (đã bán)
          </button>
        </div>

        {loading && <p>Đang tải dữ liệu...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {view === "accounts" ? renderAccountsTable() : renderOrdersTable()}
      </div>
    </AdminLayout>
  );
}
