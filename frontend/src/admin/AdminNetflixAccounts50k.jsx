import React, { useEffect, useState } from 'react';
import AdminLayout from './AdminLayout';
import './Admin.css';

export default function AdminNetflixAccounts50k() {
  const PLAN_DAYS = 30;
  const [accounts, setAccounts] = useState(() => {
    const saved = localStorage.getItem('accounts50k');
    if (!saved) return [];
    try {
      return JSON.parse(saved, (key, value) => {
        if (
          ['purchaseDate', 'expirationDate', 'lastUsed'].includes(key) &&
          value
        ) {
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
    localStorage.setItem('accounts50k', JSON.stringify(accounts));
  }, [accounts]);

  const handleImport = e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async evt => {
      const data = evt.target.result;
      let rows = [];
      if (file.name.endsWith('.csv')) {
        const text = data.trim();
        rows = text.split(/\r?\n/).map(line => line.split('|'));
      } else {
        const XLSX = await import('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm');
        const wb = XLSX.read(data, { type: 'binary' });
        const sheet = wb.SheetNames[0];
        rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1 });
      }
      const imported = rows
        .filter(r => r[0] && r[1])
        .map(r => ({
          username: r[0].trim(),
          password: r[1].trim(),
          cookies: r[2] ? r[2].trim() : '',
          phone: '',
          orderCode: '',
          purchaseDate: null,
          expirationDate: null,
          lastUsed: null,
        }));
      setAccounts(prev => [...prev, ...imported]);
    };
    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  const remainingDays = acc => {
    if (!acc.expirationDate) return '-';
    return Math.ceil((acc.expirationDate - Date.now()) / (1000 * 60 * 60 * 24));
  };

  const handleSell = idx => {
    const phone = prompt('Nhập số điện thoại khách hàng:');
    if (!phone) return;
    setAccounts(accs => {
      const soldCount = accs.filter(a => a.orderCode).length;
      const purchaseDate = new Date();
      const expirationDate = new Date(purchaseDate);
      expirationDate.setDate(expirationDate.getDate() + PLAN_DAYS);
      const orderCode = `GTK${soldCount + 1}`;

      const updated = [...accs];
      updated[idx] = {
        ...updated[idx],
        phone: phone.trim(),
        orderCode,
        purchaseDate,
        expirationDate,
      };

      const orders = JSON.parse(localStorage.getItem('orders50k') || '[]');
      orders.push({
        orderCode,
        phone: phone.trim(),
        username: updated[idx].username,
        password: updated[idx].password,
        purchaseDate,
        expirationDate,
      });
      localStorage.setItem('orders50k', JSON.stringify(orders));

      return updated;
    });
  };

  const handleSort = field => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filtered = accounts.filter(acc =>
    (acc.orderCode || '').toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    if (aVal === null || aVal === undefined) aVal = 0;
    if (bVal === null || bVal === undefined) bVal = 0;
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleDelete = idx => {
    setAccounts(accs => accs.filter((_, i) => i !== idx));
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
                  <tr key={acc.username + idx}>
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
                    <td>
                      {acc.purchaseDate
                        ? new Date(acc.purchaseDate).toLocaleDateString('vi-VN')
                        : ''}
                    </td>
                    <td>
                      {acc.expirationDate
                        ? new Date(acc.expirationDate).toLocaleDateString('vi-VN')
                        : ''}
                    </td>
                    <td>{remain}</td>
                    <td>{acc.lastUsed ? new Date(acc.lastUsed).toLocaleDateString('vi-VN') : ''}</td>
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
