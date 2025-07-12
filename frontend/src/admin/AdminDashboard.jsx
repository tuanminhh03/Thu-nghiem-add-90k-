import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import './Admin.css';

export default function AdminDashboard() {
  // ========================
  // 1. Khai báo states
  // ========================
  const [customers, setCustomers] = useState([]);
  const [msg, setMsg] = useState({ text: '', type: '' });  // ← đảm bảo có dòng này
  const [search, setSearch] = useState('');
  const token = localStorage.getItem('adminToken');

  // ========================
  // 2. Fetch dữ liệu
  // ========================
  const fetchCustomers = async () => {
    try {
      const { data } = await axios.get('/api/admin/customers', {
        headers: { Authorization: `Bearer ${token}` },
        params: search ? { phone: search } : {}
      });
      setCustomers(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) fetchCustomers();
  }, [token]);

  // ========================
  // 3. Handlers
  // ========================
  const handleSearch = e => {
    e.preventDefault();
    fetchCustomers();
  };

  const handleTopup = async id => {
    const amount = parseInt(prompt('Nhập số tiền muốn nạp'), 10);
    if (!amount) return;
    try {
      await axios.post(
        `/api/admin/customers/${id}/topup`,
        { amount },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMsg({ text: 'Nạp tiền thành công', type: 'success' });
      fetchCustomers();
    } catch (err) {
      console.error(err);
      setMsg({
        text: err.response?.data?.message || 'Lỗi nạp tiền',
        type: 'error'
      });
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('Xóa tài khoản này?')) return;
    try {
      await axios.delete(`/api/admin/customers/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMsg({ text: 'Xóa thành công', type: 'success' });
      fetchCustomers();
    } catch (err) {
      console.error(err);
      setMsg({
        text: err.response?.data?.message || 'Lỗi xóa tài khoản',
        type: 'error'
      });
    }
  };

  // ========================
  // 4. JSX
  // ========================
  return (
    <AdminLayout>
      <div className="card">
        <header className="admin-header">
          <h1 className="text-xl font-semibold">Quản lý khách hàng</h1>
        </header>

        {/* Thông báo lỗi/thành công */}
        {msg?.text && (
          <p
            className={`mb-4 text-center ${
              msg.type === 'success' ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {msg.text}
          </p>
        )}

        {/* Form tìm kiếm */}
        <form onSubmit={handleSearch} className="form-search">
          <input
            type="text"
            placeholder="Tìm theo SĐT"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input"
          />
          <button type="submit" className="btn btn-primary">
            Tìm kiếm
          </button>
        </form>

        {/* Bảng dữ liệu */}
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>STT</th>
                <th>Tài khoản (SĐT)</th>
                <th>Ngày tạo TK</th>
                <th>Số dư hiện tại</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c, idx) => (
                <tr key={c._id}>
                  <td>{idx + 1}</td>
                  <td>
                    <Link
                      to={`/admin/customers/${c._id}/orders`}
                      className="text-blue-600 hover:underline"
                    >
                      {c.phone}
                    </Link>
                  </td>
                  <td>
                    {new Date(c.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td>{c.amount}</td>
                  <td className="text-center">
                    <button
                      onClick={() => handleTopup(c._id)}
                      className="btn btn-primary mr-2"
                    >
                      Nạp tiền
                    </button>
                    <button
                      onClick={() => handleDelete(c._id)}
                      className="btn btn-danger"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
