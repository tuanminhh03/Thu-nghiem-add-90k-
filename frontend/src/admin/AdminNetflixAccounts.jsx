import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AdminLayout from './AdminLayout';
import './Admin.css';

export default function AdminNetflixAccounts() {
  const token = localStorage.getItem('adminToken');
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ email: '', password: '', note: '' });
  const [editingId, setEditingId] = useState(null);
  const [selected, setSelected] = useState(null);

  const fetchAccounts = async () => {
    try {
      const { data } = await axios.get('/api/admin/netflix-accounts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAccounts(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) fetchAccounts();
  }, [token]);

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`/api/admin/netflix-accounts/${editingId}`, form, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post('/api/admin/netflix-accounts', form, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setForm({ email: '', password: '', note: '' });
      setEditingId(null);
      fetchAccounts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = acc => {
    setForm({ email: acc.email, password: acc.password, note: acc.note || '' });
    setEditingId(acc._id);
  };

  const handleDelete = async id => {
    if (!window.confirm('Xóa tài khoản này?')) return;
    try {
      await axios.delete(`/api/admin/netflix-accounts/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAccounts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssign = async id => {
    const email = prompt('Email khách hàng');
    if (!email) return;
    const expirationDate = prompt('Ngày hết hạn (YYYY-MM-DD)') || '';
    try {
      await axios.post(
        `/api/admin/netflix-accounts/${id}/assign`,
        { email, expirationDate },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchAccounts();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi cấp hồ sơ');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ email: '', password: '', note: '' });
  };

  return (
    <AdminLayout>
      <div className="card">
        <h1 className="text-xl font-semibold mb-4">Quản lý tài khoản Netflix</h1>

        <form onSubmit={handleSubmit} className="form-search mb-4">
          <input
            type="text"
            placeholder="Email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            className="input"
            required
          />
          <input
            type="text"
            placeholder="Mật khẩu"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            className="input"
            required
          />
          <input
            type="text"
            placeholder="Ghi chú"
            value={form.note}
            onChange={e => setForm({ ...form, note: e.target.value })}
            className="input"
          />
          <button type="submit" className="btn btn-primary">
            {editingId ? 'Cập nhật' : 'Thêm'}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit} className="btn ml-2">
              Hủy
            </button>
          )}
        </form>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Mật khẩu</th>
                <th>Hồ sơ đã dùng</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map(acc => (
                <tr
                  key={acc._id}
                  onClick={() => setSelected(acc)}
                  className="cursor-pointer"
                >
                  <td>{acc.email}</td>
                  <td>{acc.password}</td>
                  <td>{acc.profiles.filter(p => p.status === 'used').length}/5</td>
                  <td className="text-center">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleAssign(acc._id);
                      }}
                      className="btn btn-primary mr-2"
                    >
                      Cấp hồ sơ
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleEdit(acc);
                      }}
                      className="btn btn-secondary mr-2"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleDelete(acc._id);
                      }}
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
        {selected && (
          <div className="modal-backdrop" onClick={() => setSelected(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h2 className="mb-2">Hồ sơ của {selected.email}</h2>
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Trạng thái</th>
                    <th>Email khách</th>
                    <th>Ngày mua</th>
                    <th>Ngày hết hạn</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.profiles.map(p => (
                    <tr key={p.id}>
                      <td>{p.id}</td>
                      <td>{p.status}</td>
                      <td>{p.customerEmail || '-'}</td>
                      <td>
                        {p.purchaseDate
                          ? new Date(p.purchaseDate).toLocaleDateString()
                          : '-'}
                      </td>
                      <td>
                        {p.expirationDate
                          ? new Date(p.expirationDate).toLocaleDateString()
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                onClick={() => setSelected(null)}
                className="btn mt-4"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
