import React from 'react';

export default function NetflixPricing() {
  const plans = [
    {
      title: 'Gói tiết kiệm',
      features: [
        'Xem trên 1 thiết bị cùng lúc',
        'Chất lượng SD',
      ],
      prices: [
        { duration: '1 tháng', price: '50k' },
        { duration: '3 tháng', price: '140k' },
        { duration: '6 tháng', price: '270k' },
        { duration: '1 năm', price: '500k' },
      ],
    },
    {
      title: 'Gói cao cấp',
      features: [
        'Xem trên 4 thiết bị cùng lúc',
        'Chất lượng HD/Ultra HD',
      ],
      prices: [
        { duration: '1 tháng', price: '90k' },
        { duration: '3 tháng', price: '260k' },
        { duration: '6 tháng', price: '515k' },
        { duration: '1 năm', price: '1tr' },
      ],
    },
  ];

  return (
    <div className="max-w-4xl mx-auto py-8 grid grid-cols-1 md:grid-cols-2 gap-6">
      {plans.map(plan => (
        <div key={plan.title} className="bg-white shadow rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-2">{plan.title}</h2>
          <ul className="list-disc ml-5 mb-4 text-gray-600">
            {plan.features.map(f => <li key={f}>{f}</li>)}
          </ul>
          <table className="w-full text-sm">
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
        </div>
      ))}
    </div>
  );
}
