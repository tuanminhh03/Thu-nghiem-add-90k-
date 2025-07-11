import React, { useEffect, useState } from 'react';

export default function Account() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    setUser(stored ? JSON.parse(stored) : null);
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen pt-24 flex justify-center items-start p-4 bg-gray-100">
        <p>Vui lòng đăng nhập để xem thông tin tài khoản.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 flex justify-center items-start p-4 bg-gray-100">
      <div className="bg-white shadow rounded-lg p-6 w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-4">Thông tin tài khoản</h2>
        <p className="mb-2">
          <strong>Số điện thoại:</strong> {user.phone}
        </p>
        <p>
          <strong>Số dư:</strong> {Number(user.amount).toLocaleString()}₫
        </p>
      </div>
    </div>
  );
}
