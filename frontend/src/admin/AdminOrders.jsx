// src/AdminOrders.jsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import AdminLayout from './AdminLayout';
import Modal from './Modal';
import './Admin.css';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [sortField, setSortField] = useState('purchaseDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [phone, setPhone] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyOrder, setHistoryOrder] = useState(null);
  const token = localStorage.getItem('adminToken');

  const fetchOrders = useCallback(
    async (pageParam, phoneParam) => {
      if (!token) return;
      const localOrders = JSON.parse(localStorage.getItem('orders50k') || '[]').map(o => ({
        _id: o.orderCode,
        orderCode: o.orderCode,
        plan: 'Gói tiết kiệm',
        purchaseDate: o.purchaseDate,
        expiresAt: o.expirationDate,
        user: { phone: o.phone },
      }));
      try {
        const { data } = await axios.get('/api/admin/orders', {
          headers: { Authorization: `Bearer ${token}` },
          params: { page: pageParam, phone: phoneParam || undefined }
        });
        setOrders([...data.data, ...localOrders]);
        setPages(data.pages);
      } catch (err) {
        console.error(err);
        setOrders(localOrders);
      }
    },
    [token]
  );

  useEffect(() => {
    fetchOrders(page, phone);
  }, [token, page, phone, fetchOrders]);

  const handleSearch = e => {
    e.preventDefault();
    setPage(1);
    fetchOrders(1, phone);
  };

  const handleSort = field => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getExpiry = o => {
    if (o.expiresAt) return new Date(o.expiresAt);
    const purchase = new Date(o.purchaseDate);
    const months = parseInt(o.duration, 10) || 0;
    const exp = new Date(purchase);
    exp.setMonth(exp.getMonth() + months);
    return exp;
  };

  const daysLeft = o => {
    const diff = Math.ceil((getExpiry(o) - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const openDelete = id => {
    setSelectedId(id);
    setShowDelete(true);
  };

  const openHistory = async o => {
    setHistoryOrder(o);
    setShowHistory(true);
    setHistory([]);
    if (/^[0-9a-fA-F]{24}$/.test(o._id)) {
      try {
        const { data } = await axios.get(`/api/admin/orders/${o._id}/history`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setHistory(data.history || []);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const confirmDelete = async () => {
    const id = selectedId;
    const isLocal = !/^[0-9a-fA-F]{24}$/.test(id);
    if (isLocal) {
      const stored = JSON.parse(localStorage.getItem('orders50k') || '[]');
      const updated = stored.filter(o => o.orderCode !== id);
      localStorage.setItem('orders50k', JSON.stringify(updated));
      setOrders(orders.filter(o => o._id !== id));
      setShowDelete(false);
      return;
    }
    try {
      await axios.delete(`/api/admin/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(orders.filter(o => o._id !== id));
    } catch (err) {
      console.error(err);
    }
    setShowDelete(false);
  };

  const sorted = useMemo(() => {
    const getValue = o => {
      if (sortField === 'orderCode') {
        const code = o.orderCode || o.code || '';
        const num = Number(code);
        return isNaN(num) ? code.toString() : num;
      }
      if (sortField === 'purchaseDate') {
        return new Date(o.purchaseDate).getTime();
      }
      if (sortField === 'expiresAt') {
        return getExpiry(o).getTime();
      }
      return 0;
    };

    return [...orders].sort((a, b) => {
      const aVal = getValue(a);
      const bVal = getValue(b);
      if (typeof aVal === 'string' || typeof bVal === 'string') {
        return sortOrder === 'asc'
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      }
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [orders, sortField, sortOrder]);

  return (
    <AdminLayout>
      <div className="card">
        <header className="admin-header">
          <h1 className="text-xl font-semibold">Quản lý đơn hàng</h1>
        </header>
        <form onSubmit={handleSearch} className="form-search">
          <input
            type="text"
            placeholder="Tìm theo SĐT"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="input"
          />
          <button type="submit" className="btn btn-primary">
            Tìm kiếm
          </button>
        </form>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>STT</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('orderCode')}>
                  Mã đơn {sortField === 'orderCode' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th>SĐT</th>
                <th>Gói</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('purchaseDate')}>
                  Ngày mua {sortField === 'purchaseDate' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('expiresAt')}>
                  Ngày hết hạn {sortField === 'expiresAt' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th>Còn lại (ngày)</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((o, idx) => {
                const expires = getExpiry(o);
                const left = daysLeft(o);
                return (
                  <tr key={o._id}>
                    <td>{idx + 1}</td>
                    <td>
                      <button
                        type="button"
                        className="text-blue-600 underline"
                        onClick={() => openHistory(o)}
                      >
                        {o.orderCode || o.code || o._id}
                      </button>
                    </td>
                    <td>{o.user?.phone || ''}</td>
                    <td>{o.plan}</td>
                    <td>{new Date(o.purchaseDate).toLocaleDateString('vi-VN')}</td>
                    <td>{expires.toLocaleDateString('vi-VN')}</td>
                    <td>{left > 0 ? left : 'Đã hết hạn'}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => openDelete(o._id)}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center">
                    Không có đơn hàng
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <button
            className="btn"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Trang trước
          </button>
          <span className="mx-2">{page}/{pages}</span>
          <button
            className="btn"
            onClick={() => setPage(p => Math.min(pages, p + 1))}
            disabled={page === pages}
          >
            Trang sau
          </button>
        </div>
      </div>
      {showDelete && (
        <Modal onClose={() => setShowDelete(false)}>
          <p>Bạn chắc chắn muốn xóa đơn này?</p>
          <div className="text-right mt-4">
            <button className="btn btn-danger mr-2" onClick={confirmDelete}>
              Xóa
            </button>
            <button className="btn" onClick={() => setShowDelete(false)}>
              Hủy
            </button>
          </div>
        </Modal>
      )}
      {showHistory && (
        <Modal onClose={() => setShowHistory(false)}>
          <h2 className="text-lg font-semibold mb-2">
            Lịch sử đơn {historyOrder?.orderCode || historyOrder?._id}
          </h2>
          {history.length > 0 ? (
            <ul className="list-disc pl-5">
              {history.map((h, idx) => (
                <li key={idx}>
                  {new Date(h.date).toLocaleString('vi-VN')} - {h.message}
                </li>
              ))}
            </ul>
          ) : (
            <p>Không có lịch sử</p>
          )}
        </Modal>
      )}
    </AdminLayout>
  );
}
