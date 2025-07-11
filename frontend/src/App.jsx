// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Header            from './Header';
import PlansOverview     from './PlansOverview';
import PlanDetail        from './PlanDetail';
import PhoneLogin        from './PhoneLogin';
import Dashboard         from './Dashboard';
import PrivateRoute      from './PrivateRoute';
import CustomerDashboard from './CustomerDashboard';
import Account           from './Account';
import TopUpPage         from './TopUpPage';
import AdminLogin            from './admin/AdminLogin';
import AdminDashboard        from './admin/AdminDashboard';
import AdminNetflixAccounts  from './admin/AdminNetflixAccounts';
import AdminRoute            from './admin/AdminRoute';

import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ==== USER ROUTES (có Header) ==== */}
        <Route
          path="/"
          element={
            <HeaderWrapper>
              <PlansOverview />
            </HeaderWrapper>
          }
        />
        <Route
          path="/login"
          element={
            <HeaderWrapper>
              <PhoneLogin />
            </HeaderWrapper>
          }
        />
        <Route
          path="/plan/:planKey"
          element={
            <HeaderWrapper>
              <PlanDetail />
            </HeaderWrapper>
          }
        />
        <Route
          path="/dashboard"
          element={
            <HeaderWrapper>
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            </HeaderWrapper>
          }
        />
        <Route
          path="/my-orders"
          element={
            <HeaderWrapper>
              <CustomerDashboard />
            </HeaderWrapper>
          }
        />
        <Route
          path="/top-up"
          element={
            <HeaderWrapper>
              <TopUpPage />
            </HeaderWrapper>
          }
        />

        {/* ==== ADMIN ROUTES (không Header) ==== */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/netflix-accounts"
          element={
            <AdminRoute>
              <AdminNetflixAccounts />
            </AdminRoute>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

// Wrapper để render Header + padding chung cho các trang user
function HeaderWrapper({ children }) {
  return (
    <>
      <Header />
      <main className="main-content" style={{ paddingTop: '6rem' }}>
        {children}
      </main>
    </>
  );
}
