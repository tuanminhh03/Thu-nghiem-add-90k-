import React from 'react';
import { useLocation } from 'react-router-dom';
import './PaymentPage.css';

export default function PaymentPage() {
  const location = useLocation();
  const { qrCodeUrl, customerName, customerPhone, amount } = location.state || {};

  if (!qrCodeUrl || !customerName || !customerPhone || !amount) {
    return <p>Không có dữ liệu thanh toán.</p>;
  }

  return (
    <div className="payment-page">
      <h2>Thông tin thanh toán</h2>
      <p><strong>Họ và tên:</strong> {customerName}</p>
      <p><strong>Số điện thoại:</strong> {customerPhone}</p>
      <p><strong>Số tiền thanh toán:</strong> {amount.toLocaleString()}đ</p>
      <div>
        <h3>QR Code Thanh Toán</h3>
        <img src={qrCodeUrl} alt="QR Code thanh toán" style={{ width: '200px', height: '200px' }} />
      </div>
    </div>
  );
}
