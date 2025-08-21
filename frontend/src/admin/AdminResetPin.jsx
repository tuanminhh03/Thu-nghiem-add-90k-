import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import AdminLayout from './AdminLayout';
import './Admin.css';

export default function AdminResetPin() {
  const { id } = useParams();
  const PIN_LENGTH = 6; // ✅ 4 chữ số
  const [digits, setDigits] = useState(() => Array(PIN_LENGTH).fill(''));
  const [msg, setMsg] = useState({ text: '', type: '' });
  const refs = useRef([]);
  const token = useMemo(() => localStorage.getItem('adminToken'), []);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const handleChange = (idx, val) => {
    if (/^\d?$/.test(val)) {
      const next = [...digits];
      next[idx] = val;
      setDigits(next);
      if (val && idx < PIN_LENGTH - 1) refs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && idx > 0) refs.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < PIN_LENGTH - 1) refs.current[idx + 1]?.focus();
  };

  const handlePaste = (e) => {
    const text = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, PIN_LENGTH);
    if (text.length) {
      e.preventDefault();
      const next = Array(PIN_LENGTH).fill('');
      for (let i = 0; i < text.length; i++) next[i] = text[i];
      setDigits(next);
      refs.current[Math.min(text.length, PIN_LENGTH - 1)]?.focus();
    }
  };

  const savePin = async () => {
    const pin = digits.join('');
    if (!new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin)) return;

    try {
      await axios.post(
        `/api/admin/customers/${id}/reset-pin`,
        { pin },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMsg({ text: 'Đặt lại PIN thành công', type: 'success' });
      setDigits(Array(PIN_LENGTH).fill(''));
      refs.current[0]?.focus();
    } catch (err) {
      setMsg({
        text: err.response?.data?.message || 'Lỗi đặt lại PIN',
        type: 'error',
      });
    }
  };

  const canSave = digits.every((d) => d);

  // ✅ Styles khắc chế input { width:100% } toàn cục
  const boxStyle = { width: 48, height: 48, flex: '0 0 48px' };
  const inputStyle = {
    width: '100%',
    height: '100%',
    textAlign: 'center',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 20,
    outline: 'none',
  };

  return (
    <AdminLayout>
      <div className="card p-6" style={{ maxWidth: 720 }}>
        <h1 className="text-3xl font-bold text-center mb-6">Đặt lại PIN</h1>

        {msg.text && (
          <p
            className={`mb-4 text-center ${
              msg.type === 'success' ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {msg.text}
          </p>
        )}

        <div
          className="flex justify-center items-center gap-3 mb-3"
          onPaste={handlePaste}
          // tránh zoom iOS khi focus input nhỏ
        >
          {digits.map((d, i) => (
            <div key={i} className="pin-box" style={boxStyle}>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={1}
                style={inputStyle}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                ref={(el) => (refs.current[i] = el)}
                aria-label={`PIN digit ${i + 1}`}
              />
            </div>
          ))}
        </div>

        <p className="text-sm text-gray-600 mb-5 text-center">
          Lưu ý: Mã PIN không cần thiết để thay đổi cài đặt hoặc xóa hồ sơ.
        </p>

        <div className="flex justify-end gap-2">
          <button
            className="btn"
            style={{
              background: canSave ? '#000' : '#9ca3af',
              color: '#fff',
              cursor: canSave ? 'pointer' : 'not-allowed',
            }}
            disabled={!canSave}
            onClick={savePin}
          >
            Lưu mã PIN
          </button>
    `  <button
        className="btn"
        style={{ background: '#e5e7eb', color: '#374151' }}
        onClick={() => (window.location.href = '/admin')}
      >
        Hủy
      </button>`
        </div>
      </div>
    </AdminLayout>
  );
}
