import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import AdminLayout from './AdminLayout';
import './Admin.css';

export default function AdminNetflixAccounts() {
  const token = localStorage.getItem('adminToken');
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({
    email: '',
    password: '',
    note: '',
  });
  const [editingId, setEditingId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [profileEdits, setProfileEdits] = useState({});

  const fetchAccounts = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/admin/netflix-accounts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const premium = data.filter(acc => acc.plan === 'Gói cao cấp');
      setAccounts(premium);
      return premium;
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchAccounts();
  }, [token, fetchAccounts]);

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(
          `/api/admin/netflix-accounts/${editingId}`,
          form,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          '/api/admin/netflix-accounts',
          form,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      setForm({ email: '', password: '', note: '' });
      setEditingId(null);
      fetchAccounts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = acc => {
    setForm({
      email: acc.email,
      password: acc.password,
      note: acc.note || '',
    });
    setEditingId(acc._id);
  };

  const handleDelete = async id => {
    if (!window.confirm('Xóa tài khoản này?')) return;
    try {
      await axios.delete(
        `/api/admin/netflix-accounts/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchAccounts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleProfileDelete = async id => {
    if (!window.confirm('Xóa hồ sơ này?')) return;
    try {
      await axios.delete(
        `/api/admin/netflix-accounts/${selected._id}/profiles/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await fetchAccounts();
      setSelected(data.find(a => a._id === selected._id) || null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleProfileTransfer = async id => {
    const email = prompt('Email tài khoản nhận hồ sơ');
    if (!email) return;
    const dest = accounts.find(a => a.email === email);
    if (!dest) return alert('Không tìm thấy tài khoản đích');
    try {
      await axios.post(
        `/api/admin/netflix-accounts/${selected._id}/profiles/${id}/transfer`,
        { toAccountId: dest._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await fetchAccounts();
      setSelected(data.find(a => a._id === selected._id) || null);
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi chuyển hồ sơ');
    }
  };

  const handleAssign = async id => {
    const phone = prompt('SDT khách hàng');
    if (!phone) return;
    const expirationDate = prompt('Ngày hết hạn (YYYY-MM-DD)') || '';
    try {
      await axios.post(
        `/api/admin/netflix-accounts/${id}/assign`,
        { phone, expirationDate },
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

  const handleProfileChange = (id, field, value) => {
    setProfileEdits(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const saveProfile = async id => {
    if (!profileEdits[id]) return;
    try {
      await axios.put(
        `/api/admin/netflix-accounts/${selected._id}/profiles/${id}`,
        profileEdits[id],
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelected(prev => ({
        ...prev,
        profiles: prev.profiles.map(p =>
          p.id === id ? { ...p, ...profileEdits[id] } : p
        )
      }));
      setProfileEdits(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      const data = await fetchAccounts();
      setSelected(data.find(a => a._id === selected._id) || null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AdminLayout>
      <div className="card">
        <h1 className="text-xl font-semibold mb-4">Tài Khoản 90k / Gói Cao Cấp</h1>

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
                <th>Gói</th>
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
                  <td>{acc.plan}</td>
                  <td>
                    {acc.profiles.filter(p => p.status === 'used').length}/5
                  </td>
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
                    <th>Tên hồ sơ</th>
                    <th>Mã Pin</th>
                    <th>SDT khách</th>
                    <th>Ngày mua</th>
                    <th>Ngày hết hạn</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.profiles.map(p => (
                    <tr key={p.id}>
                      <td>
                        <input
                          type="text"
                          value={
                            profileEdits[p.id]?.name ?? p.name ?? ''
                          }
                          onChange={e =>
                            handleProfileChange(p.id, 'name', e.target.value)
                          }
                          onBlur={() => saveProfile(p.id)}
                          className="input"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={profileEdits[p.id]?.pin ?? p.pin ?? ''}
                          onChange={e =>
                            handleProfileChange(p.id, 'pin', e.target.value)
                          }
                          onBlur={() => saveProfile(p.id)}
                          className="input"
                        />
                      </td>
                      <td>{p.customerPhone || '-'}</td>
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
                      <td className="text-center">
                        <button
                          onClick={() => handleProfileDelete(p.id)}
                          className="btn btn-danger mr-2"
                        >
                          Xóa
                        </button>
                        <button
                          onClick={() => handleProfileTransfer(p.id)}
                          className="btn btn-secondary"
                        >
                          Chuyển
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button onClick={() => setSelected(null)} className="btn mt-4">
                Đóng
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
