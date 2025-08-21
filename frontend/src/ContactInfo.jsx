import React from 'react';
import './ContactInfo.css';

export default function ContactInfo() {
  return (
    <div className="contact-info">
      <div className="contact-item">
        <img src="/public/images/zalo-icon.png" alt="Zalo" className="contact-icon" />
        <a href="https://zalo.me/0383692419">
          <div className="contact-text">
            <span className="contact-name">Chat Zalo</span>
            <span className="contact-hours">(8h-24h)</span>
          </div>
        </a>
      </div>
      <div className="contact-item">
        <img src="./public/images/messeger-icon.png" alt="Messenger" className="contact-icon" />
        <div className="contact-text">
          <span className="contact-name">Chat Messenger</span>
          <span className="contact-hours">(8h-24h)</span>
        </div>
      </div>
    </div>
  );
}
