// src/PaymentMethod.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const PaymentMethod = () => {
  const customerInfo = JSON.parse(sessionStorage.getItem('customerInfo'));
  const navigate = useNavigate();

  const handlePayment = (method) => {
    // Tiến hành thanh toán qua phương thức đã chọn
    if (method === 'bankCard') {
      // Logic thanh toán qua thẻ ngân hàng
      alert(`Thanh toán bằng thẻ ngân hàng cho khách: ${customerInfo.name}`);
    } else if (method === 'eWallet') {
      // Logic thanh toán qua ví điện tử
      alert(`Thanh toán qua ví điện tử cho khách: ${customerInfo.name}`);
    }

    // Chuyển hướng đến trang xác nhận thanh toán thành công
    navigate('/payment-success');
  };

  return (
    <div className="payment-method">
      <h2>Chọn phương thức thanh toán</h2>
      <p><strong>Tên khách hàng:</strong> {customerInfo.name}</p>
      <p><strong>Số điện thoại:</strong> {customerInfo.phone}</p>

      <button onClick={() => handlePayment('bankCard')}>Thanh toán qua thẻ ngân hàng</button>
      <button onClick={() => handlePayment('eWallet')}>Thanh toán qua ví điện tử</button>
    </div>
  );
};

export default PaymentMethod;
