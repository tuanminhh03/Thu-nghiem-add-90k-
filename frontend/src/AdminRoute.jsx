// src/AdminRoute.jsx
import * as jwtDecode from 'jwt-decode';

// src/AdminRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';

function decodeJwt(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return {};
  }
}

export default function AdminRoute({ children }) {
  const token = localStorage.getItem('adminToken');
  if (!token) {
    // Chưa login admin
    return <Navigate to="/admin-login" replace />;
  }
  const { role } = decodeJwt(token);
  if (role !== 'admin') {
    // Không phải admin
    return <Navigate to="/admin-login" replace />;
  }
  return children;
}
