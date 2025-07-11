import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

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
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-64 bg-gray-800 text-white flex flex-col">
        <div className="text-2xl font-semibold p-4 border-b border-gray-700">
          Admin Panel
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {links.map(l => (
            <Link
              key={l.href}
              to={l.href}
              className={`block px-3 py-2 rounded hover:bg-gray-700 ${
                location.pathname.startsWith(l.href) ? 'bg-gray-700' : ''
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="mt-auto p-4 border-t border-gray-700 text-left hover:bg-gray-700"
        >
          Đăng xuất
        </button>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
