import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import AdminLayout from './AdminLayout';
import './Admin.css';

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('vi-VN');

const formatCurrency = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '—';
  return currencyFormatter.format(parsed);
};

const formatNumber = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '0';
  return numberFormatter.format(parsed);
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('vi-VN');
};

const parseISODate = (value) => {
  if (!value || typeof value !== 'string') return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const createDefaultRange = () => ({
  start: new Date(Date.now() - 29 * 86_400_000).toISOString().slice(0, 10),
  end: new Date().toISOString().slice(0, 10),
});

const renderMetricIcon = (key) => {
  switch (key) {
    case 'customers':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-8 0a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.31 0-6 1.79-6 4v1a1 1 0 0 0 1 1h10.2A6.26 6.26 0 0 1 11 17.5a6.5 6.5 0 0 1 10.5-6.5 6.32 6.32 0 0 1 1.5.18V7c0-2.21-2.69-4-6-4a6.32 6.32 0 0 0-1.5.18 6.32 6.32 0 0 0-1.5-.18c-3.31 0-6 1.79-6 4Z" />
        </svg>
      );
    case 'revenue':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm.75 15.5h-1.5v-1.17a3.49 3.49 0 0 1-2.75-3.33h1.75a1.76 1.76 0 0 0 1.5 1.67V11a3.49 3.49 0 0 1-2.75-3.33A2.92 2.92 0 0 1 11.25 5.5V4.5h1.5v1a3.49 3.49 0 0 1 2.75 3.33h-1.75a1.76 1.76 0 0 0-1.5-1.67V11a3.49 3.49 0 0 1 2.75 3.33 2.92 2.92 0 0 1-2.75 3.17Z" />
        </svg>
      );
    case 'visits':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 19a1 1 0 0 1-.74-1.67l6-6a1 1 0 0 1 1.42 0l3.29 3.3 5.29-5.3a1 1 0 0 1 1.42 0L21.71 12 20 13.71l-1.29-1.3-5.29 5.3a1 1 0 0 1-1.42 0l-3.29-3.3-4.29 4.3A1 1 0 0 1 4 19Z" />
          <path d="M5 5h2v10H5Zm7-3h2v12h-2Zm7 6h2v6h-2Z" />
        </svg>
      );
    case 'orders':
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M17 3h-2.18A3 3 0 0 0 12 1a3 3 0 0 0-2.82 2H7a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm-5-0.5A1.5 1.5 0 1 1 10.5 4 1.5 1.5 0 0 1 12 2.5Zm3 15.5H9v-2h6Zm0-4H9v-2h6Zm0-4H9V8h6Z" />
        </svg>
      );
  }
};

const getDelta = (current, previous, { currency = false } = {}) => {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  const diff = current - previous;
  if (diff === 0) return { label: 'Không đổi', tone: 'neutral', symbol: '→' };
  const formatted = currency ? formatCurrency(Math.abs(diff)) : formatNumber(Math.abs(diff));
  return {
    label: `${diff > 0 ? 'Tăng' : 'Giảm'} ${formatted}`,
    tone: diff > 0 ? 'positive' : 'negative',
    symbol: diff > 0 ? '▲' : '▼',
  };
};

export default function AdminStats() {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [section, setSection] = useState('revenue');
  const [range, setRange] = useState(createDefaultRange);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const tokenRef = useRef(localStorage.getItem('adminToken'));
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchStats = useCallback(async () => {
    const token = tokenRef.current;
    if (!token || !isMountedRef.current) return;
    try {
      const response = await axios.get('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!isMountedRef.current) return;
      setStats(response.data);
      setLastUpdated(new Date());
      setLoadError(null);
    } catch (error) {
      if (isMountedRef.current) {
        console.error(error);
        setLoadError('Không tải được dữ liệu thống kê. Vui lòng thử lại.');
      }
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    const token = tokenRef.current;
    if (!token || !isMountedRef.current) return;
    try {
      const response = await axios.get('/api/admin/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!isMountedRef.current) return;
      setOrders(Array.isArray(response.data.data) ? response.data.data : []);
    } catch (error) {
      if (isMountedRef.current) {
        console.error(error);
      }
    }
  }, []);

  const handleRetry = useCallback(() => {
    setLoadError(null);
    fetchStats();
    fetchOrders();
  }, [fetchOrders, fetchStats]);

  useEffect(() => {
    const token = tokenRef.current;
    if (!token) return undefined;

    fetchStats();
    fetchOrders();

    const es = new EventSource(
      `http://localhost:5000/api/admin/orders/stream?token=${encodeURIComponent(token)}`
    );

    es.onmessage = (event) => {
      if (!isMountedRef.current) return;
      try {
        const data = JSON.parse(event.data);
        if (!data || !data._id) return;
        fetchStats();
        setOrders((prev) => [data, ...prev.filter((o) => o._id !== data._id)].slice(0, 20));
      } catch (error) {
        console.error('orders stream parse error', error);
      }
    };

    es.onerror = (error) => {
      if (isMountedRef.current) {
        console.error('orders stream error', error);
      }
      es.close();
    };

    return () => {
      es.close();
    };
  }, [fetchStats, fetchOrders]);

  let formattedLastUpdated = '';
  if (lastUpdated) {
    try {
      formattedLastUpdated = new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(lastUpdated);
    } catch (error) {
      console.error(error);
    }
  }

  if (loadError && !stats)
    return (
      <AdminLayout>
        <section className="surface-card empty-state">
          <h2>Không thể tải thống kê</h2>
          <p>{loadError}</p>
          <button type="button" className="btn btn-primary" onClick={handleRetry}>
            Thử lại
          </button>
        </section>
      </AdminLayout>
    );

  if (!stats)
    return (
      <AdminLayout>
        <p className="loading">Đang tải...</p>
      </AdminLayout>
    );

  // ---- Safely derive arrays ----
  const revenueChart = Array.isArray(stats.revenueChart) ? stats.revenueChart : [];
  const visitChart = Array.isArray(stats.visitChart) ? stats.visitChart : [];
  const ordersChart = Array.isArray(stats.ordersChart) ? stats.ordersChart : [];

  // ---- Metrics & deltas ----
  const revenueToday = Number(revenueChart[revenueChart.length - 1]?.total ?? 0);
  const revenueYesterday = Number(revenueChart[revenueChart.length - 2]?.total ?? revenueToday);
  const revenueDelta = getDelta(revenueToday, revenueYesterday, { currency: true });

  const totalVisits30Days = visitChart.reduce((sum, d) => sum + Number(d?.total ?? 0), 0);
  const visitsToday = Number(stats.visitsToday ?? 0);
  const visitsLatest = Number(visitChart[visitChart.length - 1]?.total ?? visitsToday);
  const visitsYesterday = Number(visitChart[visitChart.length - 2]?.total ?? visitsLatest);
  const visitDelta = getDelta(visitsLatest, visitsYesterday);

  const revenueAverage = revenueChart.length > 0 ? Number(stats.revenueLast30Days ?? 0) / revenueChart.length : 0;
  const visitsAverage = visitChart.length > 0 ? totalVisits30Days / visitChart.length : 0;

  const ordersLast30Days = Number(stats.ordersLast30Days ?? 0);
  const ordersToday = Number(stats.ordersToday ?? 0);
  const ordersLatest = Number(ordersChart[ordersChart.length - 1]?.total ?? ordersToday);
  const ordersYesterday = Number(ordersChart[ordersChart.length - 2]?.total ?? ordersLatest);
  const orderDelta = getDelta(ordersLatest, ordersYesterday);
  const ordersAverage = ordersChart.length > 0 ? ordersLast30Days / ordersChart.length : 0;

  const metricCards = useMemo(
    () => [
      {
        key: 'customers',
        label: 'Tổng khách hàng',
        value: formatNumber(stats.customerCount),
        helper: 'Số tài khoản đang quản lý',
      },
      {
        key: 'revenue',
        label: 'Doanh thu 30 ngày',
        value: formatCurrency(stats.revenueLast30Days),
        helper: `Hôm nay: ${formatCurrency(revenueToday)}`,
        delta: revenueDelta,
        active: section === 'revenue',
        onClick: () => setSection('revenue'),
      },
      {
        key: 'visits',
        label: 'Lượt truy cập 30 ngày',
        value: formatNumber(totalVisits30Days),
        helper: `Hôm nay: ${formatNumber(visitsToday)}`,
        delta: visitDelta,
        active: section === 'visits',
        onClick: () => setSection('visits'),
      },
      {
        key: 'orders',
        label: 'Đơn hàng 30 ngày',
        value: formatNumber(ordersLast30Days),
        helper: `Hôm nay: ${formatNumber(ordersToday)}`,
        delta: orderDelta,
        active: section === 'orders',
        onClick: () => setSection('orders'),
      },
    ],
    [
      stats.customerCount,
      stats.revenueLast30Days,
      revenueToday,
      revenueDelta,
      section,
      totalVisits30Days,
      visitsToday,
      visitDelta,
      ordersLast30Days,
      ordersToday,
      orderDelta,
    ]
  );

  const chartData = useMemo(() => {
    const dataset =
      section === 'visits' ? visitChart : section === 'orders' ? ordersChart : revenueChart;
    if (!Array.isArray(dataset) || dataset.length === 0) return [];

    const startDate = parseISODate(range.start);
    const endDate = parseISODate(range.end);
    if (endDate) endDate.setHours(23, 59, 59, 999);

    return dataset
      .map((entry) => {
        const parsedDate = parseISODate(entry.date);
        if (!parsedDate) return null;
        return {
          raw: parsedDate,
          label: parsedDate.toLocaleDateString('vi-VN'),
          total: Number(entry.total ?? 0),
        };
      })
      .filter((entry) => {
        if (!entry) return false;
        if (startDate && entry.raw < startDate) return false;
        if (endDate && entry.raw > endDate) return false;
        return true;
      })
      .map((entry) => ({ date: entry.label, total: entry.total }));
  }, [section, revenueChart, visitChart, ordersChart, range]);

  const highlightItems = useMemo(() => {
    if (section === 'visits') {
      return [
        { label: 'Lượt truy cập hôm nay', value: formatNumber(visitsToday || visitsLatest) },
        { label: 'Trung bình mỗi ngày', value: formatNumber(Math.round(visitsAverage)) },
        { label: 'So với hôm qua', value: visitDelta ? visitDelta.label : 'Chưa có dữ liệu so sánh' },
      ];
    }
    if (section === 'orders') {
      return [
        { label: 'Đơn hàng hôm nay', value: formatNumber(ordersToday || ordersLatest) },
        { label: 'Trung bình mỗi ngày', value: formatNumber(Math.round(ordersAverage)) },
        { label: 'So với hôm qua', value: orderDelta ? orderDelta.label : 'Chưa có dữ liệu so sánh' },
      ];
    }
    return [
      { label: 'Doanh thu hôm nay', value: formatCurrency(revenueToday) },
      { label: 'Trung bình mỗi ngày', value: formatCurrency(Math.round(revenueAverage)) },
      { label: 'So với hôm qua', value: revenueDelta ? revenueDelta.label : 'Chưa có dữ liệu so sánh' },
    ];
  }, [
    section,
    visitsToday,
    visitsLatest,
    visitsAverage,
    visitDelta,
    ordersToday,
    ordersLatest,
    ordersAverage,
    orderDelta,
    revenueToday,
    revenueAverage,
    revenueDelta,
  ]);

  const resetRange = () => setRange(createDefaultRange());

  return (
    <AdminLayout>
      <section className="dashboard stats-dashboard">
        <div className="dashboard-hero stats-hero">
          <div className="dashboard-hero-body">
            <span className="hero-kicker">Trang quản trị</span>
            <h1>Dashboard tổng quan</h1>
            <p>Giám sát doanh thu, lượt truy cập và đơn hàng nổi bật trong 30 ngày gần nhất.</p>
            <div className="hero-meta">
              <span className="hero-pill">
                <strong>{formatCurrency(stats.revenueLast30Days)}</strong> doanh thu 30 ngày
              </span>
              <span className="hero-pill">
                <strong>{formatNumber(totalVisits30Days)}</strong> lượt truy cập
              </span>
              <span className="hero-pill">
                <strong>{formatNumber(ordersLast30Days)}</strong> đơn hàng
              </span>
              <span className="hero-pill">
                <strong>{formatNumber(stats.customerCount)}</strong> khách hàng
              </span>
            </div>
          </div>
          <div className="dashboard-hero-actions stats-hero-actions">
            {formattedLastUpdated && <p className="hero-updated">Cập nhật: {formattedLastUpdated}</p>}
            <div className="hero-actions-group">
              <button onClick={fetchStats} className="btn btn-primary" type="button">
                Làm mới số liệu
              </button>
              <button onClick={fetchOrders} className="btn btn-outline" type="button">
                Làm mới đơn hàng
              </button>
            </div>
          </div>
        </div>

        <div className="stat-card-grid">
          {metricCards.map((metric) => {
            const clickable = typeof metric.onClick === 'function';
            const handleKeyDown = (event) => {
              if (!clickable) return;
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                metric.onClick();
              }
            };
            return (
              <article
                key={metric.key}
                className={`stat-card stat-card--${metric.key}${clickable ? ' is-clickable' : ''}${
                  metric.active ? ' is-active' : ''
                }`}
                onClick={clickable ? metric.onClick : undefined}
                role={clickable ? 'button' : undefined}
                tabIndex={clickable ? 0 : undefined}
                onKeyDown={handleKeyDown}
              >
                <div className="stat-icon">{renderMetricIcon(metric.key)}</div>
                <div className="stat-content">
                  <p className="stat-label">{metric.label}</p>
                  <p className="stat-value">{metric.value}</p>
                  <div className="metric-foot">
                    <p className="stat-helper">{metric.helper}</p>
                    {metric.delta && (
                      <span className={`metric-trend ${metric.delta.tone}`}>
                        <span aria-hidden="true">{metric.delta.symbol}</span>
                        {metric.delta.label}
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <section className="surface-card analytics-surface">
          <header className="surface-header">
            <div>
              <h2>
                {section === 'revenue'
                  ? 'Doanh thu theo ngày'
                  : section === 'visits'
                  ? 'Lượt truy cập theo ngày'
                  : 'Đơn hàng theo ngày'}
              </h2>
              <p>Biểu đồ tương tác giúp theo dõi xu hướng trong phạm vi ngày đã chọn.</p>
            </div>
            <div className="analytics-actions">
              <div className="toggle-group" role="tablist" aria-label="Chọn loại biểu đồ">
                <button
                  type="button"
                  role="tab"
                  className={`toggle-btn ${section === 'revenue' ? 'active' : ''}`}
                  aria-selected={section === 'revenue'}
                  onClick={() => setSection('revenue')}
                >
                  Doanh thu
                </button>
                <button
                  type="button"
                  role="tab"
                  className={`toggle-btn ${section === 'visits' ? 'active' : ''}`}
                  aria-selected={section === 'visits'}
                  onClick={() => setSection('visits')}
                >
                  Truy cập
                </button>
                <button
                  type="button"
                  role="tab"
                  className={`toggle-btn ${section === 'orders' ? 'active' : ''}`}
                  aria-selected={section === 'orders'}
                  onClick={() => setSection('orders')}
                >
                  Đơn hàng
                </button>
              </div>
            </div>
          </header>

          <div className="analytics-controls">
            <div className="range-inputs">
              <label>
                Từ
                <input
                  type="date"
                  className="date-input"
                  value={range.start}
                  max={range.end}
                  onChange={(event) => setRange((prev) => ({ ...prev, start: event.target.value }))}
                />
              </label>
              <label>
                Đến
                <input
                  type="date"
                  className="date-input"
                  value={range.end}
                  min={range.start}
                  onChange={(event) => setRange((prev) => ({ ...prev, end: event.target.value }))}
                />
              </label>
            </div>
            <button type="button" className="btn btn-soft" onClick={resetRange}>
              Mặc định 30 ngày
            </button>
          </div>

          <div className="chart-wrapper" role="img" aria-label="Biểu đồ thống kê">
            {chartData.length === 0 ? (
              <div className="empty-state">
                <h3>Chưa có dữ liệu trong khoảng ngày này</h3>
                <p>Hãy điều chỉnh phạm vi hoặc thử làm mới dữ liệu.</p>
              </div>
            ) : section === 'revenue' ? (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.08)" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} dy={6} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => formatCurrency(value)} labelStyle={{ fontWeight: 600 }} />
                  <Line type="monotone" dataKey="total" stroke="#e50914" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.08)" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} dy={6} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => formatNumber(value)} labelStyle={{ fontWeight: 600 }} />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]} fill={section === 'orders' ? '#16a34a' : '#2563eb'} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="analytics-summary">
            {highlightItems.map((item) => (
              <p key={item.label}>
                <strong>{item.label}:</strong> {item.value}
              </p>
            ))}
          </div>
        </section>

        <section className="surface-card orders-surface">
          <header className="surface-header">
            <div>
              <h2>Đơn hàng mới</h2>
              <p>Theo dõi các giao dịch gần nhất và trạng thái thanh toán.</p>
            </div>
            <div className="orders-header-actions">
              <div className="surface-meta">
                <span className="meta-item">Hiển thị: {formatNumber(orders.length)} đơn</span>
              </div>
              <button type="button" className="btn btn-soft" onClick={fetchOrders}>
                Làm mới danh sách
              </button>
            </div>
          </header>
          {orders.length === 0 ? (
            <div className="empty-state">
              <h3>Chưa có đơn hàng</h3>
              <p>Đơn hàng mới sẽ hiển thị tại đây ngay khi có giao dịch.</p>
            </div>
          ) : (
            <div className="table-container orders-table">
              <table className="table">
                <thead>
                  <tr>
                    <th>Khách hàng</th>
                    <th>Gói dịch vụ</th>
                    <th>Ngày mua</th>
                    <th className="text-right">Số tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order._id}>
                      <td>
                        <div className="order-customer">
                          <span className="order-phone">{order.user?.phone || '—'}</span>
                          <span className="order-meta">ID đơn: {order._id?.slice(-6) || '—'}</span>
                        </div>
                      </td>
                      <td>
                        <span className="order-plan">{order.plan || 'Không xác định'}</span>
                      </td>
                      <td>{formatDate(order.purchaseDate)}</td>
                      <td className="text-right">
                        <span className="order-amount">{formatCurrency(order.amount)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </AdminLayout>
  );
}
