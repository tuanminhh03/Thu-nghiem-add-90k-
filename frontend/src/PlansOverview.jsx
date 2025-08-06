// src/PlansOverview.jsx
import React, { useState } from 'react';
import './PlansOverview.css';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { priceMapValue } from './priceMap';
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
  const navigate = useNavigate();

  const planDescriptions = {
    'Gói tiết kiệm': 'Trong quá trình sử dụng bạn có thể gặp vấn đề bị thoát tài khoản và phải đổi tài khoản khác trong quá trình sử dụng, để khắc phục cho vấn đề đó, bên em có Website bảo hành tự động 24/7, đảm bảo rằng mọi người có thể tự lấy tài khoản dễ dàng khi gặp lỗi. ',
    'Gói cao cấp': 'Đối với gói cao cấp, quý khách sẽ được cấp tài khoản có chứa 5 hồ sơ, quý khách sẽ dụng 1 hồ sơ trong 5 hồ sơ đó. Quý khách được đặt hồ sơ riêng + mã PIN riêng. Có Website lấy mã hộ gia đình tự động 24/7',
  };

  // Giá dạng số để so sánh và trừ
  // Giá hiển thị
  const priceMapDisplay = {
    'Gói tiết kiệm': { '01 tháng': '50.000₫', '03 tháng': '140.000₫', '06 tháng': '270.000₫', '12 tháng': '500.000₫' },
    'Gói cao cấp':  { '01 tháng': '90.000₫', '03 tháng': '260.000₫', '06 tháng': '515.000₫', '12 tháng': '1.000.000₫' },
  };

  const handlePlanChange = (plan) => {
    setSelectedPlan(plan);
    setSelectedDuration(durations[0]);
  };

  const amount = selectedPlan ? priceMapValue[selectedPlan][selectedDuration] : 0;
  const displayPrice = selectedPlan
    ? priceMapDisplay[selectedPlan][selectedDuration]
    : 'Giá từ 50.000₫ đến 1.000.000₫';

  const token = localStorage.getItem('token');

  const handlePayment = async () => {
    if (!selectedPlan) return;

    if (!window.confirm('Bạn có muốn thanh toán không?')) {
      return;
    }

    const stored = localStorage.getItem('user');
    if (!stored) {
      alert('Vui lòng đăng nhập để thanh toán');
      navigate('/login');
      return;
    }

    const user = JSON.parse(stored);
    if (user.amount < amount) {
      alert('Tài khoản của bạn không đủ tiền, vui lòng nạp thêm');
      navigate(`/top-up?phone=${encodeURIComponent(user.phone)}&amount=0`);
      return;
    }

    try {
      const { data } = await axios.post(
        'http://localhost:5000/api/orders',
        { plan: selectedPlan, duration: selectedDuration, amount },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Trừ tiền và cập nhật localStorage
      user.amount -= amount;
      localStorage.setItem('user', JSON.stringify(user));
      if (data.netflixAccount) {
        const { email, password, profileId } = data.netflixAccount;
        alert(
          `Thanh toán thành công!\nEmail: ${email}\nMật khẩu: ${password}\nHồ sơ: ${profileId}`
        );
      } else {
        alert('Thanh toán thành công!');
      }
      navigate('/my-orders');
    } catch (err) {
      console.error(err);
      alert('Thanh toán thất bại');
    }
  };

  return (
    <div className="plans-overview">
      <div className="bg-cover-bg"/>
      <div className="bg-overlay"/>

      <div className="content-wrapper">
        {/* LEFT PANEL */}
        <div className="left-panel">
          <div className="netflix-card">
            <img src="/images/netflix-icon.png" alt="Netflix" className="netflix-icon"/>
            <button className="zoom-btn">
              <ArrowsPointingOutIcon className="zoom-icon"/>
            </button>
          </div>
          <div className="stats">
            <div className="stat-item"><ChatBubbleLeftEllipsisIcon className="stat-icon"/> <span>178 Đánh giá</span></div>
            <div className="stat-item"><ShoppingCartIcon className="stat-icon"/> <span>32419 Đã bán</span></div>
            <div className="stat-item"><ShieldCheckIcon className="stat-icon"/> <span>Chính sách bảo hành</span></div>
            <div className="stat-item"><StarIcon className="stat-icon star"/> <span>5.0</span></div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="right-panel">
          <h1 className="title">Mua Tài khoản Netflix Premium</h1>
          <p className="price">{displayPrice}</p>

          <div className="plan-selection">
            {plans.map(p => (
              <button
                key={p}
                onClick={() => handlePlanChange(p)}
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
                    onClick={() => setSelectedDuration(d)}
                    className={`btn-duration ${selectedDuration === d ? 'active' : ''}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </>
          )}

          {selectedPlan && (
            <button className="btn-pay" onClick={handlePayment}>
              Thanh toán
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
