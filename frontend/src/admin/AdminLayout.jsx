import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Admin.css';

export default function AdminLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const links = [
    { href: '/admin/dashboard', label: 'Dashboard' },
    { href: '/admin', label: 'Khách hàng' },
    { href: '/admin/netflix-accounts', label: 'Tài khoản Netflix' }
  ];

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  };

  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        {/* tiêu đề sidebar */}
        <div className="text-2xl font-semibold p-4 border-b border-gray-700">
          Admin Panel
        </div>

        {/* nav links */}
        <nav className="flex-1 overflow-y-auto">
          {links.map(l => (
            <Link
              key={l.href}
              to={l.href}
              className={`nav-link ${
                location.pathname.startsWith(l.href) ? 'active' : ''
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* logout */}
        <button
          onClick={handleLogout}
          className="btn btn-danger"
        >
          Đăng xuất
        </button>
      </aside>

      <main className="admin-content">
        {children}
      </main>
    </div>
  );
}
