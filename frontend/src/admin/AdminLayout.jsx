import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Admin.css';

export default function AdminLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const links = [
    { href: '/admin/dashboard', label: 'Dashboard' },
    { href: '/admin', label: 'Khách hàng' },
    { href: '/admin/orders', label: 'Đơn hàng' },
    { href: '/admin/netflix-accounts', label: 'Tài khoản gói cao cấp' },
    { href: '/admin/netflix-accounts-50k', label: 'Tài khoản gói tiết kiệm' },
    { href: '/admin/logs', label: 'Nhật ký' },
  ];

  const activeLink = links.find((l) => location.pathname.startsWith(l.href));

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <span className="admin-brand-initial">A</span>
          <div>
            <p className="admin-brand-title">Admin Panel</p>
            <p className="admin-brand-subtitle">Netflix Management</p>
          </div>
        </div>

        <nav className="admin-nav">
          {links.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`nav-link ${
                location.pathname.startsWith(link.href) ? 'active' : ''
              }`}
            >
              <span className="nav-indicator" />
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <button onClick={handleLogout} className="btn btn-ghost">
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="topbar-label">Trang quản trị</p>
            <h1 className="topbar-title">{activeLink?.label || 'Admin'}</h1>
          </div>

          <div className="topbar-actions">
            <button
              className="btn btn-soft"
              onClick={() => window.open('https://t.me/netflixsupport', '_blank')}
              type="button"
            >
              Hỗ trợ
            </button>
            <div className="topbar-user">
              <span className="topbar-avatar">AD</span>
              <div>
                <p className="user-name">Quản trị viên</p>
                <p className="user-role">Administrator</p>
              </div>
            </div>
          </div>
        </header>

        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
