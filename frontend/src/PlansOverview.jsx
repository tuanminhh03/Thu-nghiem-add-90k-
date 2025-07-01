// src/PlansOverview.jsx
import React, { useState } from 'react';
import './PlansOverview.css';
import { Link } from 'react-router-dom';  // Import Link từ react-router-dom để điều hướng
import {
  ChatBubbleLeftEllipsisIcon,
  ShoppingCartIcon,
  ShieldCheckIcon,
  StarIcon,
  ArrowsPointingOutIcon,
} from '@heroicons/react/24/outline';

export default function PlansOverview() {
  const plans = ['Gói tiết kiệm', 'Gói cao cấp'];
  const durations = ['01 tháng', '03 tháng', '06 tháng', '12 tháng'];
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState(durations[0]);

  const planDescriptions = {
    'Gói tiết kiệm': 'Trong quá trình sử dụng bạn có thể gặp vấn đề bị thoát tài khoản...',
    'Gói cao cấp': 'Đối với gói cao cấp, bên em sẽ tạo hồ sơ riêng...',
  };

  const priceMap = {
    'Gói tiết kiệm': { '01 tháng': '50.000₫', '03 tháng': '140.000₫', '06 tháng': '270.000₫', '12 tháng': '500.000₫' },
    'Gói cao cấp':  { '01 tháng': '90.000₫', '03 tháng': '260.000₫', '06 tháng': '515.000₫', '12 tháng': '1.000.000₫' },
  };

  const handlePlanChange = (plan) => {
    setSelectedPlan(plan);  // Cập nhật gói đã chọn
    setSelectedDuration(durations[0]);  // Reset lại số tháng mỗi khi thay đổi gói
  };

  return (
    <div className="plans-overview">
      <div className="bg-cover-bg"/>
      <div className="bg-overlay"/>

      <div className="content-wrapper">

        {/* LEFT PANEL (50%): Netflix icon + stats */}
        <div className="left-panel">
          <div className="netflix-card">
            <img src="/images/netflix-icon.png" alt="Netflix" className="netflix-icon"/>
            <button className="zoom-btn">
              <ArrowsPointingOutIcon className="zoom-icon"/>
            </button>
          </div>
          <div className="stats">
            <div className="stat-item">
              <ChatBubbleLeftEllipsisIcon className="stat-icon"/> <span>178 Đánh giá</span>
            </div>
            <div className="stat-item">
              <ShoppingCartIcon className="stat-icon"/> <span>32419 Đã bán</span>
            </div>
            <div className="stat-item">
              <ShieldCheckIcon className="stat-icon"/> <span>Chính sách bảo hành</span>
            </div>
            <div className="stat-item">
              <StarIcon className="stat-icon star"/> <span>5.0</span>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL (50%): Title, price, selection, payment */}
        <div className="right-panel">
          <h1 className="title">Mua Tài khoản Netflix Premium</h1>
          <p className="price">
            {selectedPlan
              ? priceMap[selectedPlan][selectedDuration]  // Hiển thị giá khi người dùng chọn gói và thời gian
              : 'Giá từ 50.000₫ đến 1.000.000₫'}
          </p>

          <div className="plan-selection">
            {plans.map(p => (
              <button
                key={p}
                onClick={() => handlePlanChange(p)}  // Cập nhật gói khi người dùng chọn
                className={`btn-plan ${selectedPlan === p ? 'active' : ''}`}
              >
                {p}
              </button>
            ))}
          </div>

          {selectedPlan && (
            <>
              <p className="description">{planDescriptions[selectedPlan]}</p>
              <div className="duration-selection">
                {durations.map(d => (
                  <button
                    key={d}
                    onClick={() => setSelectedDuration(d)}  // Cập nhật thời gian khi người dùng chọn
                    className={`btn-duration ${selectedDuration === d ? 'active' : ''}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Link to payment page and pass data in URL */}
          <Link to={`/payment?plan=${selectedPlan}&duration=${selectedDuration}`}>
            <button className="btn-pay">Thanh toán</button>
          </Link>
        </div>

      </div>
    </div>
  );
}
