import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import AdminLayout from './AdminLayout';
import './Admin.css';

export default function AdminResetPin() {
  const { id } = useParams();
  const [digits, setDigits] = useState(Array(6).fill(''));
  const [msg, setMsg] = useState({ text: '', type: '' });
  const refs = useRef([]);
  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const handleChange = (idx, val) => {
    if (/^\d?$/.test(val)) {
      const next = [...digits];
      next[idx] = val;
      setDigits(next);
      if (val && idx < 5) refs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && idx > 0) refs.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handlePaste = (e) => {
    const text = (e.clipboardData.getData('text') || '')
      .replace(/\D/g, '')
      .slice(0, 6);
    if (text.length) {
      e.preventDefault();
      const next = Array(6).fill('');
      for (let i = 0; i < text.length; i++) next[i] = text[i];
      setDigits(next);
      refs.current[Math.min(text.length, 5)]?.focus();
    }
  };

  const savePin = async () => {
    const pin = digits.join('');
    if (!/^\d{6}$/.test(pin)) return;
    try {
      await axios.post(
        `/api/admin/customers/${id}/reset-pin`,
        { pin },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMsg({ text: 'Đặt lại PIN thành công', type: 'success' });
      setDigits(Array(6).fill(''));
    } catch (err) {
      setMsg({
        text: err.response?.data?.message || 'Lỗi đặt lại PIN',
        type: 'error',
      });
    }
  };

  const canSave = digits.every((d) => d);

  return (
    <AdminLayout>
      <div className="card p-6 max-w-sm">
        <h1 className="text-xl font-semibold mb-4">Đặt lại PIN</h1>
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
          className="flex justify-center gap-2 mb-2"
          onPaste={handlePaste}
        >
          {digits.map((d, i) => (
            <input
              key={i}
              type="text"
              inputMode="numeric"
              maxLength={1}
              className="w-12 h-12 text-center border border-gray-300 rounded"
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              ref={(el) => (refs.current[i] = el)}
            />
          ))}
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Lưu ý: Mã PIN không cần thiết để thay đổi cài đặt hoặc xóa hồ sơ.
        </p>
        <div className="text-right space-x-2">
          <button
            className="btn"
            style={{ background: '#000', color: '#fff' }}
            disabled={!canSave}
            onClick={savePin}
          >
            Lưu mã PIN
          </button>
          <button
            className="btn"
            style={{ background: '#e5e7eb', color: '#374151' }}
            onClick={() => window.close()}
          >
            Hủy
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}

