// src/PlanDetail.jsx
import React from 'react';
import { useParams, Link } from 'react-router-dom';

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

  if (!plan) return (
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
        {plan.features.map(f => <li key={f}>{f}</li>)}
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
        <button className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition">
          Thanh toán
        </button>
      </div>
    </div>
  );
}
