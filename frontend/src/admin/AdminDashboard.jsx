import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import Modal from './Modal';
import './Admin.css';

export default function AdminDashboard() {
  // ========================
  // 1. Khai báo states
  // ========================
  const [customers, setCustomers] = useState([]);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [showTopup, setShowTopup] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selected, setSelected] = useState(null);
  const [amount, setAmount] = useState('');
  const token = localStorage.getItem('adminToken');
  const navigate = useNavigate();

  // ========================
  // 2. Fetch dữ liệu
  // ========================
  const fetchCustomers = async () => {
    try {
      const { data } = await axios.get('/api/admin/customers', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          phone: search || undefined,
          page,
        },
      });
      setCustomers(data.data);
      setPages(data.pages);
      // Clear any previous message on successful refresh (kept from feature branch)
      setMsg({ text: '', type: '' });
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        localStorage.removeItem('adminToken');
        navigate('/admin/login');
        return;
      }
      setCustomers([]);
      setMsg({
        text: err.response?.data?.message || 'Không tải được dữ liệu',
        type: 'error',
      });
    }
  };

  useEffect(() => {
    if (token) fetchCustomers();
  }, [token, page]);

  // ========================
  // 3. Handlers
  // ========================
  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  };

  const openTopup = (c) => {
    setSelected(c);
    setAmount('');
    setShowTopup(true);
  };

  const submitTopup = async () => {
    const amt = parseInt(amount, 10);
    if (!amt || amt <= 0) return;
    try {
      await axios.post(
        `/api/admin/customers/${selected._id}/topup`,
        { amount: amt },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMsg({ text: 'Nạp tiền thành công', type: 'success' });
      setShowTopup(false);
      fetchCustomers();
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        localStorage.removeItem('adminToken');
        navigate('/admin/login');
        return;
      }
      setMsg({
        text: err.response?.data?.message || 'Lỗi nạp tiền',
        type: 'error',
      });
    }
  };

  const openDelete = (c) => {
    setSelected(c);
    setShowDelete(true);
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`/api/admin/customers/${selected._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMsg({ text: 'Xóa thành công', type: 'success' });
      setShowDelete(false);
      fetchCustomers();
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        localStorage.removeItem('adminToken');
        navigate('/admin/login');
        return;
      }
      setMsg({
        text: err.response?.data?.message || 'Lỗi xóa tài khoản',
        type: 'error',
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
          <button onClick={fetchCustomers} className="btn btn-primary">
            Làm mới
          </button>
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
            onChange={(e) => setSearch(e.target.value)}
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
                  <td>{new Date(c.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td>{c.amount}</td>
                  <td className="text-center">
                    <button
                      onClick={() => openTopup(c)}
                      className="btn btn-primary mr-2"
                    >
                      Nạp tiền
                    </button>
                    <button
                      onClick={() => openDelete(c)}
                      className="btn btn-danger"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center">
                    Không có khách hàng
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <button
            className="btn"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Trang trước
          </button>
          <span className="mx-2">
            {page}/{pages}
          </span>
          <button
            className="btn"
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
          >
            Trang sau
          </button>
        </div>
      </div>
      {showTopup && (
        <Modal onClose={() => setShowTopup(false)}>
          <h2 className="text-lg mb-4">Nạp tiền cho {selected?.phone}</h2>
          <input
            type="number"
            className="input mb-4"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <div className="text-right">
            <button className="btn btn-primary mr-2" onClick={submitTopup}>
              Xác nhận
            </button>
            <button className="btn" onClick={() => setShowTopup(false)}>
              Hủy
            </button>
          </div>
        </Modal>
      )}
      {showDelete && (
        <Modal onClose={() => setShowDelete(false)}>
          <p>Bạn chắc chắn muốn xóa {selected?.phone}?</p>
          <div className="text-right mt-4">
            <button className="btn btn-danger mr-2" onClick={confirmDelete}>
              Xóa
            </button>
            <button className="btn" onClick={() => setShowDelete(false)}>
              Hủy
            </button>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}
