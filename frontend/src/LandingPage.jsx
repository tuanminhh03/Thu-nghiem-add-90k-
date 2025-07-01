// src/LandingPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const plans = [
  {
    key: 'saving',
    title: 'GÓI TIẾT KIỆM',
    subtitle: 'Chất lượng SD, 1 thiết bị',
    img: '/images/saving.jpg',     // đặt trong public/images/
  },
  {
    key: 'premium',
    title: 'GÓI CAO CẤP',
    subtitle: 'HD/Ultra HD, 4 thiết bị',
    img: '/images/premium.jpg',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden">
      {plans.map(plan => (
        <div
          key={plan.key}
          onClick={() => navigate(`/plan/${plan.key}`)}
          className="relative flex-1 group cursor-pointer"
        >
          {/* 1. Ảnh nền full-cover */}
          <img
            src={plan.img}
            alt={plan.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />

          {/* 2. Overlay gradient để chữ nổi bật */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50" />

          {/* 3. Nội dung chính */}
          <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-6">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold uppercase tracking-widest text-white mb-2">
              {plan.title}
            </h2>
            <p className="text-lg md:text-xl text-gray-200 mb-6">
              {plan.subtitle}
            </p>
            <button className="px-8 py-2 bg-red-600 text-white font-semibold rounded-full hover:bg-red-700 transition">
              Xem chi tiết
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
