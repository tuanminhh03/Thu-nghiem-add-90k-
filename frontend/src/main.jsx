// src/main.jsx
import React from 'react';
import { createRoot } from 'react-dom/client';  // ← lấy đúng hàm createRoot
import './index.css';
import App from './App';
import axios from 'axios';

// Giảm thiểu phải viết full URL mỗi lần gọi
axios.defaults.baseURL = 'http://localhost:5000';
axios.defaults.withCredentials = true;
const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
