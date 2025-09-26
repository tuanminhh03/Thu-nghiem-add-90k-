// src/RotateHintOrders.jsx
import React from "react";

export default function RotateHintOrders() {
  const overlayStyle = {
    position: "fixed",
    inset: 0,
    background: "rgba(30,41,59,0.65)",
    backdropFilter: "blur(3px)",
    display: "grid",
    placeItems: "center",
    zIndex: 2147483647,
    pointerEvents: "all"
  };
  const cardStyle = {
    display: "grid",
    justifyItems: "center",
    gap: 14,
    padding: "22px 26px",
    borderRadius: 16,
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.18)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
    color: "#e5e7eb",
    fontWeight: 700,
    textAlign: "center"
  };

  return (
    <div style={overlayStyle} aria-hidden="true">
      <div style={cardStyle}>
        <svg width="85" height="135" viewBox="0 0 200 320"
             style={{ filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.35))",
                      animation: "rotTilt 2.2s ease-in-out infinite" }}>
          <rect x="40" y="20" rx="24" ry="24" width="120" height="280" fill="#0ea5e9"/>
          <circle cx="100" cy="40" r="6" fill="#fff"/>
          <rect x="65" y="60" width="70" height="180" rx="12" fill="#e2e8f0"/>
        </svg>
        <div>Vui lòng xoay ngang điện thoại<br/>để xem Lịch sử đơn hàng</div>
      </div>
      <style>{`
        @keyframes rotTilt {
          0%{transform:rotate(0deg)}
          30%{transform:rotate(90deg)}
          55%{transform:rotate(85deg)}
          75%{transform:rotate(90deg)}
          100%{transform:rotate(0deg)}
        }
      `}</style>
    </div>
  );
}
