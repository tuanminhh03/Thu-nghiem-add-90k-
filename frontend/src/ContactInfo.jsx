// src/components/ContactInfo.jsx
import React from 'react';
import './ContactInfo.css';

export default function ContactInfo() {
  return (
    <div className="contact-info">
      <a
        className="contact-item"
        href="https://zalo.me/0383692419"
        aria-label="Chat Zalo (8h-24h)"
        rel="noopener noreferrer"
        target="_blank"
      >
        <img src="/images/zalo-icon.png" alt="Zalo" className="contact-icon" />
        <span className="contact-text">
          <span className="contact-name">Chat Zalo</span>
          <span className="contact-hours">(8h-24h)</span>
        </span>
      </a>

      <a
        className="contact-item"
        href="https://m.me/your.page"   // đổi link Messenger của bạn tại đây
        aria-label="Chat Messenger (8h-24h)"
        rel="noopener noreferrer"
        target="_blank"
      >
        <img src="/images/messeger-icon.png" alt="Messenger" className="contact-icon" />
        <span className="contact-text">
          <span className="contact-name">Chat Messenger</span>
          <span className="contact-hours">(8h-24h)</span>
        </span>
      </a>
    </div>
  );
}
