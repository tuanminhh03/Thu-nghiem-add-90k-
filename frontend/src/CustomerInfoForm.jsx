// src/CustomerInfoForm.jsx
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './CustomerInfoForm.css';

export default function CustomerInfoForm() {
  const location = useLocation();
  const navigate = useNavigate();

  const queryParams = new URLSearchParams(location.search);
  const plan = queryParams.get('plan');
  const duration = queryParams.get('duration');

  const priceMap = {
    'Gói tiết kiệm': { '01 tháng': 50000, '03 tháng': 140000, '06 tháng': 270000, '12 tháng': 500000 },
    'Gói cao cấp': { '01 tháng': 90000, '03 tháng': 260000, '06 tháng': 515000, '12 tháng': 1000000 },
  };

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  const amount = priceMap[plan] ? priceMap[plan][duration] : 0;
  const qrCodeUrl = `https://img.vietqr.io/image/MB-5358111112003-print.png?amount=${amount}&addInfo=${customerPhone}`;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !paymentMethod) {
      alert('Vui lòng điền đầy đủ thông tin.');
      return;
    }
    navigate('/payment-page', { state: { qrCodeUrl, customerName, customerPhone, amount } }); // Điều hướng sang trang thanh toán
  };

  return (
    <div className="customer-info-form-page">
      <div className="customer-info-form-container">
        <h2>Thông tin thanh toán</h2>

        <div className="goi-info-container">
          <p><strong>Gói:</strong> {plan}</p>
          <p><strong>Thời gian:</strong> {duration}</p>
          <p><strong>Số tiền thanh toán:</strong> {amount.toLocaleString()}đ</p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Tên người mua"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)} 
          />
          <input
            type="text"
            placeholder="Số điện thoại"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)} 
          />
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)} 
          >
            <option value="">Chọn phương thức thanh toán</option>
            <option value="Chuyển khoản ngân hàng">Chuyển khoản ngân hàng</option>
            <option value="Thẻ ngân hàng">Thẻ ngân hàng</option>
          </select>

          <button type="submit">Tiếp tục</button>
        </form>
      </div>
    </div>
  );
}
