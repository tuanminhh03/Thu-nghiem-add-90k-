import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import Modal from './Modal';
import './Admin.css';

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});
const numberFormatter = new Intl.NumberFormat('vi-VN');

const formatCurrency = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }
  return currencyFormatter.format(Number(value));
};

const formatNumber = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '0';
  }
  return numberFormatter.format(Number(value));
};

const formatDate = (value) => {
  try {
    return new Date(value).toLocaleDateString('vi-VN');
  } catch {
    return '—';
  }
};

const getBalanceTone = (amount) => {
  if (amount >= 300000) return 'success';
  if (amount >= 100000) return 'warning';
  return 'neutral';
};

const statIcon = (type) => {
  switch (type) {
    case 'customers':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-8 0a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.31 0-6 1.79-6 4v1a1 1 0 0 0 1 1h10.2a6.26 6.26 0 0 1-.2-1.5A6.5 6.5 0 0 1 21.5 11a6.32 6.32 0 0 1 1.5.18V7c0-2.21-2.69-4-6-4a6.32 6.32 0 0 0-1.5.18 6.32 6.32 0 0 0-1.5-.18c-3.31 0-6 1.79-6 4v6Z" />
        </svg>
      );
    case 'balance':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 5a1 1 0 0 0-1 1v3h18V6a1 1 0 0 0-1-1Zm17 6H3v7a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1Zm-11 5H7a1 1 0 0 1 0-2h3a1 1 0 0 1 0 2Zm7-3h-3a1 1 0 0 1 0-2h3a1 1 0 0 1 0 2Z" />
        </svg>
      );
    case 'active':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-6 8a6 6 0 0 1 12 0v1H6Zm12.3-9.7 1.7 1.71-5 5-3-3 1.71-1.71 1.29 1.3Z" />
        </svg>
      );
    case 'growth':
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m3 13 5-5 4 4 6-6 3 3-9 9-4-4-3 3Z" />
        </svg>
      );
  }
};

export default function AdminDashboard() {
  // ========================
  // 1. Khai báo states
  // ========================
  const [customers, setCustomers] = useState([]);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [showTopup, setShowTopup] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selected, setSelected] = useState(null);
  const [amount, setAmount] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const token = localStorage.getItem('adminToken');
  const navigate = useNavigate();

  // ========================
  // 2. Fetch dữ liệu
  // ========================
  const fetchCustomers = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/admin/customers', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          phone: search || undefined,
          page,
        },
      });
      setCustomers(data.data);
      setPages(data.pages);
      setLastUpdated(new Date());
      // Clear any previous message on successful refresh
      setMsg({ text: '', type: '' });
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        localStorage.removeItem('adminToken');
        navigate('/admin/login');
        return;
      }
      setCustomers([]);
      setMsg({
        text: err.response?.data?.message || 'Không tải được dữ liệu',
        type: 'error',
      });
    }
  }, [token, search, page, navigate]);

  useEffect(() => {
    if (token) fetchCustomers();
  }, [token, fetchCustomers]);

  const dashboardMetrics = useMemo(() => {
    if (!customers.length) {
      return {
        total: 0,
        active: 0,
        balance: 0,
        newThisMonth: 0,
      };
    }

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const totalBalance = customers.reduce(
      (acc, customer) => acc + (Number(customer.amount) || 0),
      0
    );

    const activeCustomers = customers.filter(
      (customer) => (Number(customer.amount) || 0) > 0
    ).length;

    const recentCustomers = customers.filter((customer) => {
      const created = new Date(customer.createdAt);
      return (
        created.getMonth() === thisMonth && created.getFullYear() === thisYear
      );
    }).length;

    return {
      total: customers.length,
      active: activeCustomers,
      balance: totalBalance,
      newThisMonth: recentCustomers,
    };
  }, [customers]);

  const statCards = useMemo(
    () => [
      {
        key: 'customers',
        label: 'Tổng khách hàng',
        value: formatNumber(dashboardMetrics.total),
        helper: 'Tổng số tài khoản đang quản lý',
      },
      {
        key: 'active',
        label: 'Khách đang hoạt động',
        value: formatNumber(dashboardMetrics.active),
        helper: 'Có số dư dương trong ví',
      },
      {
        key: 'balance',
        label: 'Tổng số dư',
        value: formatCurrency(dashboardMetrics.balance),
        helper: 'Tổng số dư trong ví khách hàng',
      },
      {
        key: 'growth',
        label: 'Khách mới trong tháng',
        value: formatNumber(dashboardMetrics.newThisMonth),
        helper: 'Tính theo tháng hiện tại',
      },
    ],
    [dashboardMetrics]
  );

  const formattedLastUpdated = useMemo(() => {
    if (!lastUpdated) return '';
    try {
      return new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(lastUpdated);
    } catch {
      return '';
    }
  }, [lastUpdated]);

  const balanceSegments = useMemo(() => {
    if (!customers.length) {
      return [
        { key: 'high', label: '≥ 300K', count: 0, percent: 0, tone: 'success' },
        { key: 'medium', label: '100K - 300K', count: 0, percent: 0, tone: 'warning' },
        { key: 'low', label: '0 - 100K', count: 0, percent: 0, tone: 'neutral' },
        { key: 'debt', label: 'Âm số dư', count: 0, percent: 0, tone: 'danger' },
      ];
    }

    const distribution = {
      high: 0,
      medium: 0,
      low: 0,
      debt: 0,
    };

    customers.forEach((customer) => {
      const amountValue = Number(customer.amount) || 0;
      if (amountValue >= 300000) distribution.high += 1;
      else if (amountValue >= 100000) distribution.medium += 1;
      else if (amountValue > 0) distribution.low += 1;
      else distribution.debt += 1;
    });

    const total = customers.length || 1;

    return [
      {
        key: 'high',
        label: '≥ 300K',
        count: distribution.high,
        percent: Math.round((distribution.high / total) * 100) || 0,
        tone: 'success',
      },
      {
        key: 'medium',
        label: '100K - 300K',
        count: distribution.medium,
        percent: Math.round((distribution.medium / total) * 100) || 0,
        tone: 'warning',
      },
      {
        key: 'low',
        label: '0 - 100K',
        count: distribution.low,
        percent: Math.round((distribution.low / total) * 100) || 0,
        tone: 'neutral',
      },
      {
        key: 'debt',
        label: 'Âm số dư',
        count: distribution.debt,
        percent: Math.round((distribution.debt / total) * 100) || 0,
        tone: 'danger',
      },
    ];
  }, [customers]);

  const topBalances = useMemo(() => {
    if (!customers.length) return [];

    return [...customers]
      .filter((customer) => Number(customer.amount) > 0)
      .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))
      .slice(0, 3);
  }, [customers]);

  const recentCustomers = useMemo(() => {
    if (!customers.length) return [];

    return [...customers]
      .filter((customer) => customer.createdAt)
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 5);
  }, [customers]);

  const averageBalance = useMemo(() => {
    if (!dashboardMetrics.total) return 0;
    return dashboardMetrics.balance / dashboardMetrics.total;
  }, [dashboardMetrics]);

  // ========================
  // 3. Handlers
  // ========================
  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  };

  const openTopup = (c) => {
    setSelected(c);
    setAmount('');
    setShowTopup(true);
  };

  const submitTopup = async () => {
    const amt = parseInt(amount, 10);
    if (!amt || amt <= 0) return;
    try {
      await axios.post(
        `/api/admin/customers/${selected._id}/topup`,
        { amount: amt },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMsg({ text: 'Nạp tiền thành công', type: 'success' });
      setShowTopup(false);
      fetchCustomers();
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        localStorage.removeItem('adminToken');
        navigate('/admin/login');
        return;
      }
      setMsg({
        text: err.response?.data?.message || 'Lỗi nạp tiền',
        type: 'error',
      });
    }
  };

  const openDelete = (c) => {
    setSelected(c);
    setShowDelete(true);
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`/api/admin/customers/${selected._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMsg({ text: 'Xóa thành công', type: 'success' });
      setShowDelete(false);
      fetchCustomers();
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        localStorage.removeItem('adminToken');
        navigate('/admin/login');
        return;
      }
      setMsg({
        text: err.response?.data?.message || 'Lỗi xóa tài khoản',
        type: 'error',
      });
    }
  };

  // ========================
  // 4. JSX
  // ========================
  return (
    <AdminLayout>
      <section className="dashboard">
        <div className="dashboard-hero">
        <div className="dashboard-hero-body">
          <span className="hero-kicker">Tổng quan khách hàng</span>
          <h1>Quản lý khách hàng</h1>
          <p>Theo dõi tình trạng tài khoản và số dư khách hàng theo thời gian thực.</p>
            <div className="hero-meta">
              <span className="hero-pill">
                <strong>{formatNumber(dashboardMetrics.total)}</strong> khách hàng
              </span>
              <span className="hero-pill">
                <strong>{formatNumber(dashboardMetrics.active)}</strong> đang hoạt động
              </span>
              <span className="hero-pill">
                <strong>{formatNumber(dashboardMetrics.newThisMonth)}</strong> mới tháng này
              </span>
            </div>
          </div>
          <div className="dashboard-hero-actions">
            {formattedLastUpdated && (
              <p className="hero-updated">Cập nhật: {formattedLastUpdated}</p>
            )}
            <div className="hero-actions-group">
              <button onClick={fetchCustomers} className="btn btn-primary" type="button">
                Làm mới dữ liệu
              </button>
              <Link to="/admin/orders" className="btn btn-outline">
                Xem đơn hàng
              </Link>
            </div>
          </div>
        </div>

        {msg?.text && (
          <div className={`alert ${msg.type === 'success' ? 'alert-success' : 'alert-danger'}`}>
            {msg.text}
          </div>
        )}

        <div className="stat-card-grid">
          {statCards.map((card) => (
            <article key={card.key} className={`stat-card stat-card--${card.key}`}>
              <div className="stat-icon">{statIcon(card.key)}</div>
              <div className="stat-content">
                <p className="stat-label">{card.label}</p>
                <p className="stat-value">{card.value}</p>
                <p className="stat-helper">{card.helper}</p>
              </div>
            </article>
          ))}
        </div>

        <section className="surface-card surface-dashboard">
          <header className="surface-header">
            <div>
              <h2>Danh sách khách hàng</h2>
              <p>Thông tin trạng thái ví, đơn hàng và tác vụ quản lý nhanh.</p>
            </div>
            <div className="surface-meta">
              <span className="meta-item">Tổng số: {formatNumber(dashboardMetrics.total)}</span>
              <span className="meta-item">Đang hoạt động: {formatNumber(dashboardMetrics.active)}</span>
              {formattedLastUpdated && (
                <span className="meta-item">Lần cuối: {formattedLastUpdated}</span>
              )}
            </div>
          </header>

          <div className="surface-body">
            <div className="data-region">
              <form onSubmit={handleSearch} className="form-search">
                <div className="input-group">
                  <span className="input-icon" aria-hidden="true">🔍</span>
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo số điện thoại"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input"
                  />
                </div>
                <button type="submit" className="btn btn-soft">
                  Tìm kiếm
                </button>
              </form>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>STT</th>
                      <th>Khách hàng</th>
                      <th>Số điện thoại</th>
                      <th>Ngày tạo</th>
                      <th>Số dư</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer, idx) => {
                      const safeId = customer._id || `${customer.phone}-${idx}`;
                      const shortId = customer._id ? customer._id.slice(-6) : 'N/A';
                      const avatarText = (customer.name || customer.phone || 'U')[0]?.toUpperCase();

                      return (
                        <tr key={safeId}>
                          <td>{(page - 1) * 10 + idx + 1}</td>
                          <td>
                            <div className="customer-cell">
                              <span className="customer-avatar">{avatarText}</span>
                              <div>
                                <p className="customer-name">{customer.name || 'Chưa cập nhật'}</p>
                                <p className="customer-note">ID: {shortId}</p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <Link
                              to={`/admin/customers/${customer._id}/orders`}
                              className="link"
                            >
                              {customer.phone}
                            </Link>
                          </td>
                          <td>{formatDate(customer.createdAt)}</td>
                          <td>
                            <span
                              className={`balance-badge ${getBalanceTone(Number(customer.amount) || 0)}`}
                            >
                              {formatCurrency(customer.amount)}
                            </span>
                          </td>
                          <td>
                            <div className="table-actions">
                              <a
                                href={`/admin/customers/${customer._id}/reset-pin`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-ghost"
                              >
                                Đặt lại PIN
                              </a>
                              <button
                                onClick={() => openTopup(customer)}
                                className="btn btn-soft"
                                type="button"
                              >
                                Nạp tiền
                              </button>
                              <button
                                onClick={() => openDelete(customer)}
                                className="btn btn-danger"
                                type="button"
                              >
                                Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {customers.length === 0 && (
                      <tr>
                        <td colSpan="6">
                          <div className="empty-state">
                            <h3>Không có dữ liệu</h3>
                            <p>Hãy thử điều chỉnh bộ lọc hoặc thêm khách hàng mới.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="pagination">
                <button
                  className="btn btn-ghost"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  type="button"
                >
                  Trang trước
                </button>
                <span className="pagination-status">
                  Trang {page} / {pages}
                </span>
                <button
                  className="btn btn-ghost"
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page === pages}
                  type="button"
                >
                  Trang sau
                </button>
              </div>
            </div>

            <aside className="insight-sidebar" aria-label="Thông tin bổ sung">
              <article className="insight-card insight-card-highlight">
                <h3>Tình trạng số dư</h3>
                <p className="insight-number">{formatCurrency(dashboardMetrics.balance)}</p>
                <p className="insight-helper">Tổng số dư đang quản lý</p>
                <div className="insight-divider" aria-hidden="true" />
                <p className="insight-secondary">
                  Trung bình <strong>{formatCurrency(averageBalance)}</strong> / khách
                </p>
              </article>

              <article className="insight-card">
                <h3>Phân bố số dư</h3>
                <ul className="insight-progress-list">
                  {balanceSegments.map((segment) => (
                    <li key={segment.key} className="insight-progress-item">
                      <div className="insight-progress-header">
                        <span className={`insight-dot ${segment.tone}`} aria-hidden="true" />
                        <span className="insight-progress-label">{segment.label}</span>
                        <span className="insight-progress-value">
                          {formatNumber(segment.count)} khách
                        </span>
                      </div>
                      <div className="insight-progress-bar" role="presentation">
                        <span
                          className={`insight-progress-track ${segment.tone}`}
                          style={{ width: `${segment.percent}%` }}
                          aria-hidden="true"
                        />
                        <span className="sr-only">{segment.percent}% tổng khách</span>
                      </div>
                      <div className="insight-progress-meta">{segment.percent}% tổng khách</div>
                    </li>
                  ))}
                </ul>
              </article>

              <article className="insight-card">
                <h3>Khách số dư cao</h3>
                <ul className="insight-list">
                  {topBalances.length === 0 && <li className="insight-empty">Chưa có dữ liệu</li>}
                  {topBalances.map((customer, idx) => (
                    <li
                      key={customer._id || `${customer.phone}-top-${idx}`}
                      className="insight-list-item"
                    >
                      <div className="insight-avatar" aria-hidden="true">
                        {(customer.name || customer.phone || 'U')[0]?.toUpperCase()}
                      </div>
                      <div className="insight-list-content">
                        <p className="insight-list-title">{customer.name || 'Chưa cập nhật'}</p>
                        <p className="insight-list-subtitle">{customer.phone}</p>
                      </div>
                      <span className="insight-list-value">{formatCurrency(customer.amount)}</span>
                    </li>
                  ))}
                </ul>
              </article>

              <article className="insight-card">
                <h3>Khách hàng mới</h3>
                <ul className="insight-list">
                  {recentCustomers.length === 0 && (
                    <li className="insight-empty">Chưa có dữ liệu</li>
                  )}
                  {recentCustomers.map((customer, idx) => (
                    <li
                      key={customer._id || `${customer.phone}-recent-${idx}`}
                      className="insight-list-item"
                    >
                      <div className="insight-bullet" aria-hidden="true" />
                      <div className="insight-list-content">
                        <p className="insight-list-title">{customer.name || customer.phone}</p>
                        <p className="insight-list-subtitle">
                          Ngày tạo: {formatDate(customer.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            </aside>
          </div>
        </section>
      </section>
      {showTopup && (
        <Modal onClose={() => setShowTopup(false)}>
          <h2 className="text-lg mb-4">Nạp tiền cho {selected?.phone}</h2>
          <input
            type="number"
            className="input mb-4"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <div className="text-right">
            <button className="btn btn-primary mr-2" onClick={submitTopup}>
              Xác nhận
            </button>
            <button className="btn" onClick={() => setShowTopup(false)}>
              Hủy
            </button>
          </div>
        </Modal>
      )}
      {showDelete && (
        <Modal onClose={() => setShowDelete(false)}>
          <p>Bạn chắc chắn muốn xóa {selected?.phone}?</p>
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
    </AdminLayout>
  );
}
