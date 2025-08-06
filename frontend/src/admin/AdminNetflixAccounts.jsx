import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AdminLayout from './AdminLayout';
import './Admin.css';

export default function AdminNetflixAccounts() {
  const token = localStorage.getItem('adminToken');
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ email: '', password: '', note: '' });
  const [editingId, setEditingId] = useState(null);

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
    const name = prompt('Tên khách hàng');
    if (!name) return;
    const email = prompt('Email khách hàng') || '';
    try {
      await axios.post(
        `/api/admin/netflix-accounts/${id}/assign`,
        { name, email },
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
                <th>Danh sách hồ sơ</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map(acc => (
                <tr key={acc._id}>
                  <td>{acc.email}</td>
                  <td>{acc.password}</td>
                  <td>{acc.profiles.filter(p => p.status === 'used').length}/5</td>
                  <td>
                    {acc.profiles.map(p => (
                      <div key={p.profileId}>
                        {p.profileId}: {p.status === 'used' ? `${p.customerName} (${p.contactEmail})` : 'trống'}
                      </div>
                    ))}
                  </td>
                  <td className="text-center">
                    <button
                      onClick={() => handleAssign(acc._id)}
                      className="btn btn-primary mr-2"
                    >
                      Cấp hồ sơ
                    </button>
                    <button
                      onClick={() => handleEdit(acc)}
                      className="btn btn-secondary mr-2"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(acc._id)}
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
