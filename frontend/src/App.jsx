// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Header            from './Header';
import PlansOverview     from './PlansOverview';
import PlanDetail        from './PlanDetail';
import PhoneLogin        from './PhoneLogin';
import Dashboard         from './Dashboard';
import AdminDashboard    from './AdminDashboard';
import PrivateRoute      from './PrivateRoute';
import CustomerDashboard from './CustomerDashboard';
import TopUpPage         from './TopUpPage';

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
          path="/admin"
          element={
            <HeaderWrapper>
              <PrivateRoute>
                <AdminDashboard />
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
