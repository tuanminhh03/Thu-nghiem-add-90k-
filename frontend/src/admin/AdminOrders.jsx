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
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [showDelete, setShowDelete] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyOrder, setHistoryOrder] = useState(null);
  const token = localStorage.getItem('adminToken');

  const fetchOrders = useCallback(
    async (pageParam, phoneParam) => {
      if (!token) return;
      setLoading(true);
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
        setPages(data.pages);
        setOrders(prev =>
          pageParam === 1
            ? [...data.data, ...localOrders]
            : [...prev, ...data.data]
        );
      } catch (err) {
        console.error(err);
        if (pageParam === 1) setOrders(localOrders);
      }
      setLoading(false);
    },
    [token]
  );

  useEffect(() => {
    fetchOrders(page, searchPhone);
  }, [token, page, searchPhone, fetchOrders]);

  const handleScroll = useCallback(() => {
    if (loading || page >= pages) return;
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 200) {
      setPage(p => p + 1);
    }
  }, [loading, page, pages]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const handleSearch = e => {
    e.preventDefault();
    setOrders([]);
    setPage(1);
    setSearchPhone(phone);
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

  const planFilterOptions = useMemo(
    () => [
      { value: 'all', label: 'Tất cả gói' },
      { value: 'Gói tiết kiệm', label: 'Gói tiết kiệm' },
      { value: 'Gói cao cấp', label: 'Gói cao cấp' },
    ],
    []
  );

  const stats = useMemo(() => {
    const premiumCount = orders.filter(o => o.plan === 'Gói cao cấp').length;
    const savingCount = orders.filter(o => o.plan === 'Gói tiết kiệm').length;
    const activeCount = orders.filter(o => {
      const expires = getExpiry(o);
      return expires.getTime() > Date.now();
    }).length;

    return {
      totalOrders: orders.length,
      premiumCount,
      savingCount,
      activeCount,
    };
  }, [orders]);

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

    const filtered =
      planFilter === 'all' ? orders : orders.filter(o => o.plan === planFilter);

    return [...filtered].sort((a, b) => {
      const aVal = getValue(a);
      const bVal = getValue(b);
      if (typeof aVal === 'string' || typeof bVal === 'string') {
        return sortOrder === 'asc'
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      }
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [orders, sortField, sortOrder, planFilter]);

  return (
    <AdminLayout>
      <div className="card orders-card">
        <section className="orders-hero">
          <div>
            <h1 className="orders-title">Quản lý đơn hàng</h1>
            <p className="orders-subtitle">
              Theo dõi trạng thái, tìm kiếm nhanh theo số điện thoại và quản lý các gói dịch vụ.
            </p>
          </div>
          <div className="orders-quick-stats">
            <div className="orders-stat">
              <span className="orders-stat-label">Tổng đơn</span>
              <strong className="orders-stat-value">{stats.totalOrders}</strong>
            </div>
            <div className="orders-stat">
              <span className="orders-stat-label">Đang hoạt động</span>
              <strong className="orders-stat-value">{stats.activeCount}</strong>
            </div>
            <div className="orders-stat">
              <span className="orders-stat-label">Gói cao cấp</span>
              <strong className="orders-stat-value">{stats.premiumCount}</strong>
            </div>
            <div className="orders-stat">
              <span className="orders-stat-label">Gói tiết kiệm</span>
              <strong className="orders-stat-value">{stats.savingCount}</strong>
            </div>
          </div>
        </section>

        <form onSubmit={handleSearch} className="orders-controls">
          <div className="orders-search-group">
            <label htmlFor="order-search" className="orders-label">
              Tìm theo SĐT
            </label>
            <div className="input-shell">
              <svg
                aria-hidden="true"
                className="input-shell-icon"
                fill="none"
                height="20"
                viewBox="0 0 24 24"
                width="20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M15.5 15.5L21 21"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                />
                <path
                  d="M17 10.5C17 14.0899 14.0899 17 10.5 17C6.91015 17 4 14.0899 4 10.5C4 6.91015 6.91015 4 10.5 4C14.0899 4 17 6.91015 17 10.5Z"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                />
              </svg>
              <input
                id="order-search"
                type="text"
                placeholder="Nhập số điện thoại khách hàng"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="orders-filter-group">
            <span className="orders-label">Lọc theo gói</span>
            <div className="filter-chip-group" role="group" aria-label="Lọc theo gói dịch vụ">
              {planFilterOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  className={`filter-chip ${planFilter === option.value ? 'active' : ''}`}
                  onClick={() => {
                    setPlanFilter(option.value);
                    setPage(1);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="orders-submit-group">
            <button type="submit" className="btn btn-primary">
              Tìm kiếm
            </button>
          </div>
        </form>

        <div className="table-container orders-table-container">
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
                    <td>
                      <span
                        className={`plan-badge ${
                          o.plan === 'Gói cao cấp' ? 'plan-badge-premium' : 'plan-badge-saving'
                        }`}
                      >
                        {o.plan}
                      </span>
                    </td>
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
        {loading && <p className="text-center my-2">Đang tải...</p>}
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
