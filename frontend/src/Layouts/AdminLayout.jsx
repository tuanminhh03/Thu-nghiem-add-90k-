// src/Layouts/AdminLayout.jsx
import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import './AdminLayout.css';

export default function AdminLayout() {
  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <h2>Admin Panel</h2>
        <nav>
          <NavLink to="/admin" end>Dashboard</NavLink>
          <NavLink to="/admin/users">Users</NavLink>
          <NavLink to="/admin/transactions">Transactions</NavLink>
          <NavLink to="/admin/settings">Settings</NavLink>
        </nav>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
