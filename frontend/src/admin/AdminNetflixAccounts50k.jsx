import React, { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import "./Admin.css";

const PLAN_DAYS = 30; // số ngày mặc định của gói

export default function AdminNetflixAccounts50k() {
  const [accounts, setAccounts] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("purchaseDate");
  const [sortOrder, setSortOrder] = useState("asc");

  // Lấy danh sách account từ backend
  useEffect(() => {
    fetchAccounts();
  }, []);
const fetchAccounts = async () => {
  setLoading(true);
  setError(null);
  try {
    const res = await fetch("http://localhost:5000/api/account50k");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // ✅ fix: lấy data.data thay vì data trực tiếp
    if (data.success && Array.isArray(data.data)) {
      setAccounts(data.data);
    } else {
      console.error("API không trả về mảng:", data);
      setAccounts([]);
    }
  } catch (err) {
    console.error("Lỗi khi load accounts:", err);
    setError("Không tải được dữ liệu từ server");
    setAccounts([]);
  } finally {
    setLoading(false);
  }
};

const handleImport = e => {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async evt => {
    const data = evt.target.result;
    let rows = [];

    try {
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

  const remainingDays = acc => {
    if (!acc?.expirationDate) return "-";
    const end = new Date(acc.expirationDate);
    if (isNaN(end)) return "-";
    return Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  const handleSell = async acc => {
    const phone = prompt("Nhập số điện thoại khách hàng:");
    if (!phone) return;

    try {
      await fetch(`http://localhost:5000/api/account50k/${acc._id}/sell`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, planDays: PLAN_DAYS }),
      });
      fetchAccounts();
    } catch (err) {
      console.error("Lỗi khi bán account:", err);
    }
  };

  const handleEditExpiration = async acc => {
    const current = acc.expirationDate
      ? new Date(acc.expirationDate).toISOString().slice(0, 10)
      : "";
    const input = prompt("Nhập ngày hết hạn mới (YYYY-MM-DD):", current);
    if (!input) return;

    const expirationDate = new Date(input);
    if (isNaN(expirationDate)) {
      alert("Ngày hết hạn không hợp lệ");
      return;
    }

    try {
      await fetch(`http://localhost:5000/api/account50k/${acc._id}/expiration`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expirationDate }),
      });
      fetchAccounts();
    } catch (err) {
      console.error("Lỗi khi sửa hạn:", err);
    }
  };

  const handleDelete = async acc => {
    if (!window.confirm("Bạn có chắc muốn xóa tài khoản này?")) return;

    try {
      await fetch(`http://localhost:5000/api/account50k/${acc._id}`, {
        method: "DELETE",
      });
      fetchAccounts();
    } catch (err) {
      console.error("Lỗi khi xóa account:", err);
    }
  };

  const handleSort = field => {
    if (sortField === field) {
      setSortOrder(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const filtered = accounts.filter(acc =>
    (acc?.orderCode || "").toLowerCase().includes(search.trim().toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    let aVal = a?.[sortField];
    let bVal = b?.[sortField];

    const norm = v => {
      if (!v) return 0;
      const d = new Date(v);
      return isNaN(d) ? v : d.getTime();
    };

    aVal = norm(aVal);
    bVal = norm(bVal);

    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const fmtDay = v => {
    if (!v) return "";
    const d = new Date(v);
    return isNaN(d) ? "" : d.toLocaleDateString("vi-VN");
  };

  return (
    <AdminLayout>
      <div className="card">
        <h1 className="text-xl font-semibold mb-4">Tài khoản 50k / Gói tiết kiệm</h1>

        <div className="mb-4 flex flex-col md:flex-row md:items-center gap-2">
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleImport}
            className="input"
          />
          <input
            type="text"
            placeholder="Tìm theo mã đơn hàng"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input"
          />
        </div>

        {loading && <p>Đang tải dữ liệu...</p>}
        {error && <p className="text-red-500">{error}</p>}

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Password</th>
                <th>Cookies</th>
                <th>SĐT (Khách hàng)</th>
                <th>Mã đơn hàng</th>
                <th onClick={() => handleSort("purchaseDate")} style={{ cursor: "pointer" }}>
                  Ngày mua {sortField === "purchaseDate" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                </th>
                <th onClick={() => handleSort("expirationDate")} style={{ cursor: "pointer" }}>
                  Ngày hết hạn {sortField === "expirationDate" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                </th>
                <th>Số ngày còn lại</th>
                <th onClick={() => handleSort("lastUsed")} style={{ cursor: "pointer" }}>
                  Lần cuối sử dụng {sortField === "lastUsed" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                </th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length > 0 ? (
                sorted.map((acc, idx) => {
                  const remain = remainingDays(acc);
                  const status = acc.phone ? "Online" : "Offline";
                  return (
                    <tr key={acc._id || idx}>
                      <td>{acc.username}</td>
                      <td>{acc.password}</td>
                      <td>
                        {acc.cookies && (
                          <details className="cookie-details">
                            <summary>Xem cookies</summary>
                            <div className="cookie-content">{acc.cookies}</div>
                          </details>
                        )}
                      </td>
                      <td>{acc.phone}</td>
                      <td>{acc.orderCode}</td>
                      <td>{fmtDay(acc.purchaseDate)}</td>
                      <td>{fmtDay(acc.expirationDate)}</td>
                      <td>{remain}</td>
                      <td>{fmtDay(acc.lastUsed)}</td>
                      <td>
                        <span
                          className={`px-2 py-1 rounded text-white ${
                            status === "Online" ? "bg-green-500" : "bg-gray-400"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="flex gap-2">
                        {!acc.phone && (
                          <button className="btn btn-primary" onClick={() => handleSell(acc)}>
                            Bán
                          </button>
                        )}
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleEditExpiration(acc)}
                        >
                          Sửa hạn
                        </button>
                        <button className="btn btn-danger" onClick={() => handleDelete(acc)}>
                          Xóa
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="11" className="text-center">
                    Không có dữ liệu
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
