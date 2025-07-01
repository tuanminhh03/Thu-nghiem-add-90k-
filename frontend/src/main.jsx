// src/main.jsx
import React from 'react';
import { createRoot } from 'react-dom/client';  // ← lấy đúng hàm createRoot
import './index.css';
import App from './App';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
