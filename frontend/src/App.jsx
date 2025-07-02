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
import TopUpPage         from './TopUpPage';

import AdminLogin        from './AdminLogin';
import AdminRoute        from './AdminRoute';
import AdminLayout       from './Layouts/AdminLayout.jsx';
import AdminDashboard    from './AdminDashboard';

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

        {/* ==== ADMIN ROUTES ==== */}
        {/* 1. Login admin (layout riêng, không cần HeaderWrapper) */}
        <Route path="/admin-login" element={<AdminLogin />} />

        {/* 2. Tất cả các route /admin/* đều đi qua AdminRoute + AdminLayout */}
        <Route 
          path="/admin/*" 
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          {/* Khi vào /admin hoặc /admin/dashboard */}
          <Route index element={<AdminDashboard />} />
          {/* Thêm các sub-route khác nếu cần, ví dụ: users, transactions,... */}
          {/* <Route path="users" element={<AdminUsers />} /> */}
          {/* <Route path="transactions" element={<AdminTransactions />} /> */}
        </Route>
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
