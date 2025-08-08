// src/PlanDetail.jsx
import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const plansData = {
  saving: {
    title: 'GÓI TIẾT KIỆM',
    features: ['Xem trên 1 thiết bị cùng lúc', 'Chất lượng SD'],
    prices: [
      { duration: '1 tháng', price: '50k' },
      { duration: '3 tháng', price: '140k' },
      { duration: '6 tháng', price: '270k' },
      { duration: '1 năm', price: '500k' },
    ],
  },
  premium: {
    title: 'GÓI CAO CẤP',
    features: ['Xem trên 4 thiết bị cùng lúc', 'Chất lượng HD/Ultra HD'],
    prices: [
      { duration: '1 tháng', price: '90k' },
      { duration: '3 tháng', price: '260k' },
      { duration: '6 tháng', price: '515k' },
      { duration: '1 năm', price: '1tr' },
    ],
  },
};

export default function PlanDetail() {
  const { planKey } = useParams();
  const plan = plansData[planKey];
  const navigate = useNavigate();

  const handleSavingPurchase = async () => {
    if (planKey !== 'saving') {
      alert('Chức năng mua chỉ áp dụng cho gói tiết kiệm');
      return;
    }
    const stored = localStorage.getItem('user');
    if (!stored) {
      alert('Vui lòng đăng nhập để mua gói này');
      navigate('/login');
      return;
    }
    const user = JSON.parse(stored);
    if (user.amount < 50000) {
      alert('Tài khoản của bạn không đủ tiền, vui lòng nạp thêm');
      navigate(`/top-up?phone=${encodeURIComponent(user.phone)}`);
      return;
    }
    const { phone } = user;
    const token = localStorage.getItem('token');
    const accounts = JSON.parse(localStorage.getItem('accounts50k') || '[]');
    const idx = accounts.findIndex(acc => !acc.phone);
    if (idx === -1) {
      alert('Hiện đã hết tài khoản. Vui lòng liên hệ admin.');
      return;
    }
    const soldCount = accounts.filter(a => a.phone).length;
    const purchaseDate = new Date();
    const expirationDate = new Date(purchaseDate);
    expirationDate.setDate(expirationDate.getDate() + 30);
    const orderCode = `GTK${soldCount + 1}`;
    const account = {
      ...accounts[idx],
      phone,
      orderCode,
      purchaseDate,
      expirationDate,
    };
    accounts[idx] = account;
    localStorage.setItem('accounts50k', JSON.stringify(accounts));
    const orders = JSON.parse(localStorage.getItem('orders50k') || '[]');
    orders.push({
      orderCode,
      phone,
      username: account.username,
      password: account.password,
      purchaseDate,
      expirationDate,
    });
    localStorage.setItem('orders50k', JSON.stringify(orders));
    user.amount -= 50000;
    localStorage.setItem('user', JSON.stringify(user));

    try {
      await axios.post(
        'http://localhost:5000/api/orders/local-savings',
        { amount: 50000 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error(err);
    }
    alert(
      `Mã đơn: ${orderCode}\nUsername: ${account.username}\nPassword: ${account.password}`
    );
    navigate('/my-orders');
  };

  if (!plan)
    return (
      <div className="p-6">
        <p>Không tìm thấy gói này.</p>
        <Link to="/" className="text-blue-600">Quay về trang chính</Link>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Link to="/" className="text-blue-600 mb-4 inline-block">{`← Quay về`}</Link>
      <h1 className="text-3xl font-bold mb-4">{plan.title}</h1>
      <ul className="list-disc ml-6 mb-6 text-gray-700">
        {plan.features.map(f => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <div className="max-w-xl mx-auto bg-white shadow-lg rounded-2xl p-6">
        <table className="w-full text-sm mb-6">
          <thead>
            <tr>
              <th className="text-left pb-2">Thời gian</th>
              <th className="text-right pb-2">Giá</th>
            </tr>
          </thead>
          <tbody>
            {plan.prices.map(item => (
              <tr key={item.duration} className="border-t">
                <td className="py-2">{item.duration}</td>
                <td className="py-2 text-right">{item.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          onClick={handleSavingPurchase}
          className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition"
        >
          Thanh toán
        </button>
      </div>
    </div>
  );
}
