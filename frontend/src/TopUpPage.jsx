// src/TopUpPage.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import './TopUpPage.css';

export default function TopUpPage() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(search);
  const plan      = params.get('plan');
  const duration  = params.get('duration');
  const amount    = params.get('amount') || '0';
  const userPhone = params.get('phone') || '';

  // QR config
  const qrBankId    = 'mbbank';
  const accountNo   = '5358111112003';
  const template    = 'compact';
  const accountName = encodeURIComponent('YOUR_ACCOUNT_NAME');
  const qrUrl = `https://img.vietqr.io/image/${qrBankId}-${accountNo}-${template}.png?&addInfo=${userPhone}&accountName=${accountName}`;

  // Countdown 5 phút
  const [secondsLeft, setSecondsLeft] = useState(5 * 60);
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft(s => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  const minutes = Math.floor(secondsLeft / 60);
  const secs    = secondsLeft % 60;

  const handleContinue = () => {
    navigate('/');
  };

  return (
    <div className="topup-page page-wrapper">
      <div className="topup-card">
        <header className="topup-card__header">
          <Wallet className="icon" />
          <h2>Nạp tiền tài khoản</h2>
        </header>

        {plan && (
          <div className="badge badge-blue mb-4">
            <span>Gói: {plan}</span>
            <span>Thời gian: {duration}</span>
          </div>
        )}

        <div className="topup-info mb-6">
          <div>
            <p><strong>Ngân hàng:</strong> MBBank </p>
            <p><strong>Số TK:</strong> {accountNo}</p>
          </div>
          <div>
            <p><strong>Chủ TK: NGUYEN TUAN MINH</strong></p>
            <p>
              <strong>Hạn QR:</strong> {minutes}:
              {secs.toString().padStart(2,'0')} 
            </p>
          </div>
        </div>

        <ul className="instructions mb-6">
          <li>Mở app ngân hàng, chọn “Quét mã QR”. Nhập số tiền muốn chuyển.</li>
          <li>Nội dung chuyển khoản là số điện thoại mà quý khách đăng ký: <strong>{userPhone}</strong>.</li>
          <li>Sau khi chuyển khoản, quý khách chờ 30s-1p sẽ có thông báo chuyển khoản thành công</li>
        </ul>

        <div className="qr-container mb-6">
          <img
            src={qrUrl}
            alt="QR code nạp tiền"
            className="qr-image"
          />
        </div>

        <footer className="topup-card__footer">
          <button onClick={handleContinue}>
            Tiếp tục
          </button>
        </footer>
      </div>
    </div>
  );
}
