
# Netflix Subscription Platform – Nền tảng quản lý & bán tài khoản Netflix chia sẻ

Đây là một **ứng dụng web full-stack** giúp quản lý và bán tài khoản Netflix dùng chung.  
Hệ thống có **bảng điều khiển quản trị**, **quản lý khách hàng**, **xử lý đơn hàng tự động** và **cập nhật số dư theo thời gian thực**.

---

## **Tính năng**
- 📱 **Đăng nhập qua số điện thoại** – Khách hàng xác thực bằng số điện thoại.  
- 🔒 **Bảo mật JWT cho trang quản trị** – Chỉ admin hợp lệ mới truy cập được.  
- 🔄 **Cập nhật số dư & đơn hàng thời gian thực** – Sử dụng Server-Sent Events (SSE).  
- 🛒 **Quản lý đơn hàng** – Tạo mới, gia hạn, và tự động hết hạn.  
- 📊 **Bảng điều khiển Admin** – Quản lý khách hàng, đơn hàng và hồ sơ tài khoản Netflix.  
- 💳 **Tích hợp thanh toán Stripe** – Hỗ trợ thanh toán trực tuyến.  
- 📈 **Thống kê & biểu đồ** – Sử dụng thư viện Recharts.

---

## **Công nghệ sử dụng**
**Backend:**
- Node.js, Express, MongoDB
- JSON Web Tokens (JWT)
- Node-cron (tác vụ định kỳ)

**Frontend:**
- React + Vite
- Tailwind CSS
- Stripe
- Recharts

---

## **Yêu cầu trước khi cài đặt**
- Node.js v18 trở lên
- npm (hoặc yarn/pnpm)
- MongoDB (có thể dùng local hoặc MongoDB Atlas)

---

## **Cài đặt Backend**
```bash
cd backend
npm install
```
Tạo file `.env` với nội dung:
```env
MONGO_URI=chuoi_ket_noi_mongo
JWT_SECRET=ma_bi_mat
ADMIN_USER=ten_dang_nhap_admin
ADMIN_PASS=mat_khau_admin
```
Chạy server ở chế độ phát triển:
```bash
npm run dev
```
Backend mặc định chạy tại: `http://localhost:5000`

---

## **Cài đặt Frontend**
```bash
cd frontend
npm install
npm run dev
```
Frontend mặc định chạy tại: `http://localhost:5173`  
Được cấu hình để gọi API từ backend: `http://localhost:5000`

---

## **Build bản production**
```bash
npm run build
```
Kết quả build sẽ nằm trong thư mục `/dist`.

---

## **Script dự án**
| Lệnh | Vị trí | Mô tả |
|------|--------|-------|
| `npm run dev` | Backend & Frontend | Chạy server phát triển |
| `npm run build` | Frontend | Build cho môi trường production |
| `npm run lint` | Frontend | Kiểm tra lỗi code với ESLint |

---

## **Cấu trúc thư mục**
```
.
├── backend
│   ├── src
│   │   ├── config/       # Cấu hình DB & JWT
│   │   ├── controllers/  # Xử lý logic API
│   │   ├── models/       # Mongoose schema
│   │   ├── routes/       # Định nghĩa API
│   │   ├── utils/        # Hàm hỗ trợ (cron, SSE, ...)
│   │   └── server.js
├── frontend
│   ├── src
│   │   ├── components/   # Thành phần UI
│   │   ├── pages/        # Giao diện trang
│   │   ├── services/     # Gọi API
│   │   ├── store/        # Quản lý state
│   │   └── main.jsx
└── README.md
```

---

## **Hướng phát triển tương lai**
- Thêm phân quyền admin nhiều cấp  
- Hỗ trợ đa ngôn ngữ  
- Tự động thay thế tài khoản khi bị khóa  
