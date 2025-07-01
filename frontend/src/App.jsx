// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Header             from './Header';
import PlansOverview      from './PlansOverview';
import PlanDetail         from './PlanDetail';
import PhoneLogin         from './PhoneLogin';
import Dashboard          from './Dashboard';
import PrivateRoute       from './PrivateRoute';
import CustomerDashboard  from './CustomerDashboard';
import TopUpPage          from './TopUpPage';
import AdminLogin         from './AdminLogin';
import AdminDashboard     from './AdminDashboard';
import AdminRoute         from './AdminRoute';

import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <main className="main-content" style={{ paddingTop: '6rem' }}>
        <Routes>
          {/* User routes */}
          <Route path="/"              element={<PlansOverview />} />
          <Route path="/login"         element={<PhoneLogin />} />
          <Route path="/plan/:planKey" element={<PlanDetail />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route path="/my-orders"     element={<CustomerDashboard />} />
          <Route path="/top-up"        element={<TopUpPage />} />

          {/* Admin routes */}
          <Route path="/admin-login"   element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
