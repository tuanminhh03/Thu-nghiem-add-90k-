import React from 'react';
import './ContactInfo.css';

export default function ContactInfo() {
  return (
    <div className="contact-info">
      <div className="contact-item">
        <img src="/public/images/zalo-icon.svg" alt="Zalo" className="contact-icon" />
        <div className="contact-text">
          <span className="contact-name">Chat Zalo</span>
          <span className="contact-hours">(8h-24h)</span>
        </div>
      </div>
      <div className="contact-item">
        <img src="./public/images/messenger-icon.svg" alt="Messenger" className="contact-icon" />
        <div className="contact-text">
          <span className="contact-name">Chat Messenger</span>
          <span className="contact-hours">(8h-24h)</span>
        </div>
      </div>
    </div>
  );
}
