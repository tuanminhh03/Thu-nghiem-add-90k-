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
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';

const API_BASE = "http://localhost:5000/api";

export default function PlansOverview() {
  const plans = ['Gói tiết kiệm', 'Gói cao cấp'];
  const durations = ['01 tháng', '03 tháng', '06 tháng', '12 tháng'];
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState(durations[0]);
  const [profileName, setProfileName] = useState('');
  const [profilePin, setProfilePin] = useState('');
  const [openFaq, setOpenFaq] = useState(null); // <— state cho accordion FAQ
  const navigate = useNavigate();

  const planDescriptions = {
    'Gói tiết kiệm':
      'Trong quá trình sử dụng, tài khoản có thể gặp sự cố đăng xuất và phải đổi tài khoản khác. Để khắc phục, hệ thống bảo hành tự động 24/7 của Dailywithminh cho phép bạn chủ động lấy tài khoản khác tự động 24/7, giúp bạn không bị gián đoạn thời gian xem phim',
    'Gói cao cấp':
      'Gói này phù hợp với quý khách yêu thích sự ổn định, không bị đổi tài khoản. Quý khách sẽ được cấp tài khoản có chứa 5 hồ sơ, quý khách sẽ dụng 1 hồ sơ trong 5 hồ sơ đó. Quý khách được đặt hồ sơ riêng + mã PIN riêng.Có đường link lấy mã hộ gia đình tự động 24/7',
  };

  // Giá hiển thị (tĩnh, để render)
  const priceMapDisplay = {
    'Gói tiết kiệm': {
      '01 tháng': '50.000₫',
      '03 tháng': '140.000₫',
      '06 tháng': '270.000₫',
      '12 tháng': '500.000₫',
    },
    'Gói cao cấp': {
      '01 tháng': '90.000₫',
      '03 tháng': '260.000₫',
      '06 tháng': '515.000₫',
      '12 tháng': '1.000.000₫',
    },
  };

  const handlePlanChange = (plan) => {
    setSelectedPlan(plan);
    setSelectedDuration(durations[0]);
    if (plan !== 'Gói cao cấp') {
      setProfileName('');
      setProfilePin('');
    }
  };

  // amount dựa trên priceMapValue
  const amount = selectedPlan ? priceMapValue[selectedPlan][selectedDuration] : 0;
  const displayPrice = selectedPlan
    ? priceMapDisplay[selectedPlan][selectedDuration]
    : 'Giá từ 50.000₫ đến 1.000.000₫';

  const token = localStorage.getItem('token');

  const durationToDays = {
    '01 tháng': 30,
    '03 tháng': 90,
    '06 tháng': 180,
    '12 tháng': 365,
  };

  const handlePayment = async () => {
    if (!selectedPlan) return;

    if (selectedPlan === 'Gói cao cấp') {
      const trimmedName = profileName.trim();
      const sanitizedPin = profilePin.trim();

      if (!trimmedName) {
        alert('Vui lòng nhập tên hồ sơ mà bạn muốn sử dụng.');
        return;
      }
      if (!/^\d{4}$/.test(sanitizedPin)) {
        alert('Mã PIN phải gồm đúng 4 chữ số.');
        return;
      }
    }

    if (!window.confirm('Bạn có muốn thanh toán không?')) return;

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

    if (selectedPlan === 'Gói tiết kiệm') {
      try {
        const planDays = durationToDays[selectedDuration] || 30;
        const res = await axios.post(
          `${API_BASE}/account50k/buy`,
          { planDays, amount },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!res.data || res.data.success !== true) {
          throw new Error(res.data?.message || 'Mua thất bại');
        }

        const { order } = res.data.data;
        alert(
          `Thanh toán thành công!\nMã đơn: ${order.orderCode}\nUsername: ${order.accountEmail}\nPassword: ${order.accountPassword}`
        );
        navigate('/my-orders');
      } catch (err) {
        console.error('Lỗi mua Gói tiết kiệm:', err);
        alert(err?.response?.data?.message || err.message || 'Mua thất bại');
      }
      return;
    }

    // Gói cao cấp
    try {
      const payload = {
        plan: selectedPlan,
        duration: selectedDuration,
        amount,
        ...(selectedPlan === 'Gói cao cấp' && {
          profileName: profileName.trim(),
          pin: profilePin.trim(),
        }),
      };

      const { data } = await axios.post(
        `${API_BASE}/orders`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      user.amount -= amount;
      localStorage.setItem('user', JSON.stringify(user));

      if (data.netflixAccount) {
        const { email, password, profileName, pin } = data.netflixAccount;
        alert(
          `Thanh toán thành công!\nEmail: ${email}\nMật khẩu: ${password}\nTên hồ sơ: ${profileName}\nMã PIN: ${pin}`
        );
      } else {
        alert('Thanh toán thành công!');
      }

      if (selectedPlan === 'Gói cao cấp') {
        setProfileName('');
        setProfilePin('');
      }

      navigate('/my-orders');
    } catch (err) {
      console.error('Lỗi mua Gói cao cấp:', err);
      const serverMsg = err?.response?.data?.message || err?.message;
      alert(`Thanh toán thất bại: ${serverMsg || 'Lỗi server'}`);
    }
  };

  // ===== FAQ content =====
  const faqs = [
    {
      q: 'Sự khác nhau giữa Gói tiết kiệm và Gói cao cấp?',
      a: 'Gói tiết kiệm có thể bị đổi tài khoản khi phát sinh lỗi, nhưng có hệ thống bảo hành tự động 24/7. Gói cao cấp giữ tài khoản ổn định, có hồ sơ riêng và PIN riêng, không bị đổi tài khoản.',
    },
    {
      q: 'Làm sao để tránh bị đổi tài khoản ở Gói Tiết Kiệm?',
      a: 'Để hạn chế bị đăng xuất và phải đổi tài khoản khác thì \n1. Không thêm xóa sửa hồ sơ có sẵn trong tài khoản, có hồ sơ nào mình cứ dùng.\n2. Không được đổi ngôn ngữ giao diện có sẵn trong hồ sơ. Nếu ngôn ngữ khó nhìn quá vui lòng liên hệ CSKH của dailywithminh để được đổi ngôn ngữ hoặc đổi tài khoản khác nha',
    },
    {
      q: 'Đối với gói Tiết Kiệm làm sao để xem được vietsub khi mà tài khoản đang giao diện ngôn ngữ khác?',
      a: 'Bạn có thể tìm phim bạn muốn xem bằng tiếng việt nó sẽ hiện ra ngay đầu. Nếu muốn xem phim với vietsub bạn cứ ấn vào phim sau đó chọn phụ đề là vietnamese hoặc liên quan đến vietnam như là vietnamita, ...',
    },
    {
      q: 'Dailywithminh có uy tín không?',
      a: 'Quá uy tín là quá uy tín =)))))))))',
    },
  ];

  return (
    <div className="plans-overview">
      <div className="bg-cover-bg" />
      <div className="bg-overlay" />

      <div className="content-wrapper">
        {/* LEFT PANEL */}
        <div className="left-panel">
          <div className="netflix-card">
            <img src="/images/netflix-icon.png" alt="Netflix" className="netflix-icon" />
            <button className="zoom-btn">
              <ArrowsPointingOutIcon className="zoom-icon" />
            </button>
          </div>

          <div className="stats">
            <div className="stat-item">
              <ChatBubbleLeftEllipsisIcon className="stat-icon" /> <span>178 Đánh giá</span>
            </div>
            <div className="stat-item">
              <ShoppingCartIcon className="stat-icon" /> <span>32419 Đã bán</span>
            </div>
            <div className="stat-item">
              <ShieldCheckIcon className="stat-icon" /> <span>Bảo hành 24/7</span>
            </div>
            <div className="stat-item">
              <StarIcon className="stat-icon" /> <span>5.0</span>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="right-panel mobile-card">
          <h1 className="title">Mua Tài khoản Netflix Premium</h1>
          <p className="price">{displayPrice}</p>

          <div className="plan-selection">
            {plans.map((p) => (
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

              {selectedPlan === 'Gói cao cấp' && (
                <div className="profile-form">
                  <h3>Đặt thông tin hồ sơ riêng</h3>
                  <div className="profile-input-group">
                    <label className="profile-label" htmlFor="profileName">
                      Tên hồ sơ Netflix
                    </label>
                    <input
                      id="profileName"
                      type="text"
                      maxLength={50}
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="profile-input"
                      placeholder="Ví dụ: DAILYWITHMINH, MINHDEPTRAI"
                    />
                    <span className="profile-hint">
                      Tên hồ sơ sẽ được tạo trong tài khoản Netflix.
                    </span>
                  </div>
                  <div className="profile-input-group">
                    <label className="profile-label" htmlFor="profilePin">
                      Mã PIN 4 số
                    </label>
                    <input
                      id="profilePin"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      value={profilePin}
                      onChange={(e) => {
                        const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setProfilePin(digitsOnly);
                      }}
                      className="profile-input"
                      placeholder="Nhập 4 chữ số"
                    />
                    <span className="profile-hint">
                      Mã PIN dùng để khóa hồ sơ của bạn. Vui lòng chỉ nhập số.
                    </span>
                  </div>
                </div>
              )}

              <div className="duration-selection">
                {durations.map((d) => (
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
            <button className="btn-pay main-pay" onClick={handlePayment}>
              Thanh toán
            </button>
          )}
        </div>
      </div>

      {/* Sticky CTA (mobile) */}
      {selectedPlan && (
        <div className="sticky-cta">
          <div className="summary">
            <div>
              <strong>{selectedPlan}</strong> • {selectedDuration}
            </div>
            <div>{displayPrice}</div>
          </div>
          <button className="btn-pay" onClick={handlePayment}>
            Thanh toán
          </button>
        </div>
      )}

      {/* ===== FAQ SECTION (nằm dưới giao diện) ===== */}
      <section id="faq" className="faq-section pro">
  <div className="faq-container">
    <header className="faq-head">
      <p className="faq-eyebrow">Hỗ trợ nhanh</p>
      <h2 className="faq-title">Câu hỏi thường gặp</h2>
      <p className="faq-subtitle">Những thắc mắc phổ biến khi mua gói Netflix tại Dailywithminh</p>
    </header>

    <ul className="faq-list">
      {faqs.map((item, idx) => {
        const opened = openFaq === idx;
        return (
          <li key={idx} className={`faq-item pro ${opened ? 'open' : ''}`}>
            <button
              className="faq-question pro"
              onClick={() => setOpenFaq(opened ? null : idx)}
              aria-expanded={opened}
            >
              <span className="q-text">{item.q}</span>
              <span className={`chev ${opened ? 'rot' : ''}`} aria-hidden />
            </button>
            <div className="faq-answer pro" style={{ maxHeight: opened ? '320px' : '0px' }}>
              <p>{item.a}</p>
            </div>
          </li>
        );
      })}
    </ul>
  </div>
</section>

    </div>
  );
}
