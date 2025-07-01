// src/TopUpPage.jsx
import React from 'react';
import { useLocation } from 'react-router-dom';

export default function TopUpPage() {
  // Nếu bạn muốn nhận luôn plan & duration hay amount từ query:
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const plan     = params.get('plan');
  const duration = params.get('duration');
  const amount   = params.get('amount');

  return (
    <div className="min-h-screen bg-gray-100 pt-24 flex justify-center items-start p-4">
      <div className="bg-white shadow rounded-lg p-6 w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-4">Nạp tiền</h2>
        {plan && (
          <p className="mb-2">
            <strong>Gói:</strong> {plan} — <strong>Thời gian:</strong> {duration}
          </p>
        )}
        {amount && (
          <p className="mb-4">
            <strong>Số tiền cần nạp:</strong> {Number(amount).toLocaleString()}₫
          </p>
        )}
        {/* TODO: chèn form hoặc QR nạp tiền ở đây */}
        <p>Chức năng nạp tiền sẽ được triển khai tại đây.</p>
      </div>
    </div>
  );
}
