import React, { useEffect, useState } from 'react';
import AdminLayout from './AdminLayout';
import './Admin.css';

const PLAN_DAYS = 30; // số ngày mặc định của gói

export default function AdminNetflixAccounts50k() {
  const [accounts, setAccounts] = useState(() => {
    const saved = localStorage.getItem('accounts50k');
    if (!saved) return [];
    try {
      return JSON.parse(saved, (key, value) => {
        if (['purchaseDate', 'expirationDate', 'lastUsed'].includes(key) && value) {
          return new Date(value);
        }
        return value;
      });
    } catch {
      return [];
    }
  });

  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('purchaseDate');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    // Lưu kèm chuyển Date -> ISO string
    localStorage.setItem('accounts50k', JSON.stringify(accounts));
  }, [accounts]);

  const handleImport = e => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async evt => {
      const data = evt.target.result;
      let rows = [];

      if (file.name.toLowerCase().endsWith('.csv')) {
        const text = new TextDecoder().decode(
          data instanceof ArrayBuffer ? data : new TextEncoder().encode(String(data))
        ).trim();
        rows = text.split(/\r?\n/).map(line => line.split('|'));
      } else {
        const XLSX = await import('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm');
        const wb = XLSX.read(new Uint8Array(data), { type: 'array' });
        const sheet = wb.SheetNames[0];
        rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1 });
      }

      const imported = rows
        .filter(r => r[0] && r[1])
        .map(r => ({
          username: String(r[0]).trim(),
          password: String(r[1]).trim(),
          cookies: r[2] ? String(r[2]).trim() : '',
          phone: '',
          orderCode: '',
          purchaseDate: null,
          expirationDate: null,
          lastUsed: null,
        }));

      // Khử trùng lặp theo username
      setAccounts(prev => {
        const exist = new Set(prev.map(a => a.username));
        const deduped = imported.filter(a => !exist.has(a.username));
        return [...prev, ...deduped];
      });
    };

    // Dùng ArrayBuffer để đọc ổn định cả csv/xlsx
    reader.readAsArrayBuffer(file);
  };

  const remainingDays = acc => {
    if (!acc?.expirationDate) return '-';
    const end = acc.expirationDate instanceof Date ? acc.expirationDate : new Date(acc.expirationDate);
    if (isNaN(end)) return '-';
    return Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  const handleSell = idx => {
    const phone = prompt('Nhập số điện thoại khách hàng:');
    if (!phone) return;

    const trimmedPhone = phone.trim();
    if (!trimmedPhone) return;

    const soldCount = accounts.filter(a => a.orderCode).length;
    const purchaseDate = new Date();
    const expirationDate = new Date(purchaseDate);
    expirationDate.setDate(expirationDate.getDate() + PLAN_DAYS);

    const orderCode = `GTK${soldCount + 1}`;

    const updated = [...accounts];
    updated[idx] = {
      ...updated[idx],
      phone: trimmedPhone,
      orderCode,
      purchaseDate,
      expirationDate,
    };
    setAccounts(updated);

    const orders = JSON.parse(localStorage.getItem('orders50k') || '[]');
    orders.push({
      orderCode,
      phone: trimmedPhone,
      username: updated[idx].username,
      password: updated[idx].password,
      purchaseDate,
      expirationDate,
    });
    localStorage.setItem('orders50k', JSON.stringify(orders));
  };

  const handleEditExpiration = idx => {
    const current = accounts[idx].expirationDate;
    const currentStr =
      current instanceof Date && !isNaN(current) ? current.toISOString().slice(0, 10) : '';
    const input = prompt('Nhập ngày hết hạn mới (YYYY-MM-DD):', currentStr);
    if (!input) return;

    const expirationDate = new Date(input);
    if (isNaN(expirationDate)) {
      alert('Ngày hết hạn không hợp lệ');
      return;
    }

    const updated = [...accounts];
    updated[idx] = { ...updated[idx], expirationDate };
    setAccounts(updated);

    if (updated[idx].orderCode) {
      const orders = JSON.parse(localStorage.getItem('orders50k') || '[]');
      const orderIdx = orders.findIndex(o => o.orderCode === updated[idx].orderCode);
      if (orderIdx !== -1) {
        orders[orderIdx].expirationDate = expirationDate;
        localStorage.setItem('orders50k', JSON.stringify(orders));
      }
    }
  };

  const handleSort = field => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filtered = accounts.filter(acc =>
    (acc?.orderCode || '').toLowerCase().includes(search.trim().toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    const aOnline = a.phone ? 1 : 0;
    const bOnline = b.phone ? 1 : 0;
    if (aOnline !== bOnline) return bOnline - aOnline;

    let aVal = a?.[sortField];
    let bVal = b?.[sortField];

    // Chuẩn hóa Date -> ms, null/undefined -> 0
    const norm = v => {
      if (v == null) return 0;
      if (v instanceof Date) return v.getTime();
      if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) {
        const d = new Date(v);
        return isNaN(d) ? v : d.getTime();
      }
      return v;
    };

    aVal = norm(aVal);
    bVal = norm(bVal);

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleDelete = idx => {
    setAccounts(accs => accs.filter((_, i) => i !== idx));
  };

  const fmtDay = v => {
    if (!v) return '';
    const d = v instanceof Date ? v : new Date(v);
    return isNaN(d) ? '' : d.toLocaleDateString('vi-VN');
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
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Password</th>
                <th>Cookies</th>
                <th>SĐT (Khách hàng)</th>
                <th>Mã đơn hàng</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('purchaseDate')}>
                  Ngày mua {sortField === 'purchaseDate' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('expirationDate')}>
                  Ngày hết hạn {sortField === 'expirationDate' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th>Số ngày còn lại</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('lastUsed')}>
                  Lần cuối sử dụng {sortField === 'lastUsed' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((acc, idx) => {
                const remain = remainingDays(acc);
                const status = acc.phone ? 'Online' : 'Offline';
                return (
                  <tr key={`${acc.username}-${idx}`}>
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
                      <span className={`px-2 py-1 rounded text-white ${status === 'Online' ? 'bg-green-500' : 'bg-gray-400'}`}>
                        {status}
                      </span>
                    </td>
                    <td className="flex gap-2">
                      {!acc.phone && (
                        <button className="btn btn-primary" onClick={() => handleSell(idx)}>
                          Bán
                        </button>
                      )}
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleEditExpiration(idx)}
                      >
                        Sửa hạn
                      </button>
                      <button className="btn btn-danger" onClick={() => handleDelete(idx)}>
                        Xóa
                      </button>
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
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
