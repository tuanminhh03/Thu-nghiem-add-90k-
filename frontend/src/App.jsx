// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './Header'; 
import PlansOverview from './PlansOverview';
import PlanDetail from './PlanDetail';
import CustomerInfoForm from './CustomerInfoForm';  // Trang nhập thông tin
import PaymentMethod from './PaymentMethod';      // Trang chọn phương thức thanh toán
import Dashboard from './Dashboard'; // Dashboard component
import PaymentPage from './PaymentPage'; // Trang thanh toán

export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <div style={{ paddingTop: '6rem' }}>
        <Routes>
          <Route path="/" element={<PlansOverview />} />
          <Route path="/plan/:planKey" element={<PlanDetail />} />
          <Route path="/payment" element={<CustomerInfoForm />} />  {/* Trang nhập thông tin */}
          <Route path="/payment-method" element={<PaymentMethod />} />
          <Route path="/dashboard" element={<Dashboard />} />  {/* Route để truy cập dashboard */}
          <Route path="/payment-page" element={<PaymentPage />} /> {/* Trang thanh toán */}
        </Routes>
      </div>
    </BrowserRouter>
  );
}
