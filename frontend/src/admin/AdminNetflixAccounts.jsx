import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import AdminLayout from './AdminLayout';
import './Admin.css';

export default function AdminNetflixAccounts() {
  const token = localStorage.getItem('adminToken');
  const [accounts, setAccounts] = useState([]);
  const createDefaultForm = () => ({
    email: '',
    password: '',
    note: '',
    loginIssue: false,
  });
  const [form, setForm] = useState(createDefaultForm);
  const [editingId, setEditingId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [profileEdits, setProfileEdits] = useState({});

  const selectedProfileCount = selected ? selected.profiles.length : 0;
  const selectedUsedCount = selected
    ? selected.profiles.filter(p => p.status === 'used').length
    : 0;

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
      setForm(createDefaultForm());
      setEditingId(null);
      const updated = await fetchAccounts();
      if (selected) {
        setSelected(updated?.find(a => a._id === selected._id) || null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = acc => {
    setForm({
      email: acc.email,
      password: acc.password,
      note: acc.note || '',
      loginIssue: !!acc.loginIssue,
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
      const updated = await fetchAccounts();
      if (selected) {
        setSelected(updated?.find(a => a._id === selected._id) || null);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi cấp hồ sơ');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(createDefaultForm());
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

  const now = Date.now();

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
          <label className="checkbox-inline">
            <input
              type="checkbox"
              checked={form.loginIssue}
              onChange={e =>
                setForm({ ...form, loginIssue: e.target.checked })
              }
            />
            <span>Tài khoản không đăng nhập được</span>
          </label>
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
              {accounts.map(acc => {
                const hasExpiredProfiles = acc.profiles.some(p => {
                  if (!p.expirationDate) return false;
                  const expiry = new Date(p.expirationDate);
                  return !Number.isNaN(expiry.getTime()) && expiry.getTime() < now;
                });
                const hasLoginIssue = !!acc.loginIssue;

                return (
                  <tr
                    key={acc._id}
                    onClick={() => setSelected(acc)}
                    className="cursor-pointer"
                  >
                    <td className="account-email-cell">
                      {acc.email}
                      {hasLoginIssue && (
                        <button
                          type="button"
                          className="issue-warning-icon"
                          title={acc.note || 'Không đăng nhập được'}
                          onClick={e => {
                            e.stopPropagation();
                            alert(acc.note?.trim() || 'Không đăng nhập được');
                          }}
                        >
                          !
                        </button>
                      )}
                      {hasExpiredProfiles && (
                        <span
                          className="expiration-warning-icon"
                          title="Đơn hàng đã hết hạn"
                          role="img"
                          aria-label="Đơn hàng đã hết hạn"
                        />
                      )}
                    </td>
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
                );
              })}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="modal-backdrop" onClick={() => setSelected(null)}>
            <div
              className="modal modal--accounts"
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <div>
                  <h2 className="modal-title">Hồ sơ của {selected.email}</h2>
                  <p className="modal-subtitle">
                    {selected.plan} · {selectedUsedCount}/{selectedProfileCount} hồ
                    sơ đã dùng
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost modal-close"
                  onClick={() => setSelected(null)}
                  aria-label="Đóng"
                >
                  ×
                </button>
              </div>

              <div className="modal-body">
                <div className="modal-table">
                  <table className="table table--profiles">
                    <thead>
                      <tr>
                        <th>Tên hồ sơ</th>
                        <th>Mã Pin</th>
                        <th>SDT khách</th>
                        <th>Ngày mua</th>
                        <th>Ngày hết hạn</th>
                        <th className="text-center">Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.profiles.map(p => {
                        const expirationDate = p.expirationDate
                          ? new Date(p.expirationDate)
                          : null;
                        const isExpired =
                          !!expirationDate && !Number.isNaN(expirationDate.getTime())
                            ? expirationDate.getTime() < now
                            : false;

                        return (
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
                                className="input input-inline"
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
                                className="input input-inline"
                              />
                            </td>
                            <td>{p.customerPhone || '-'}</td>
                            <td>
                              {p.purchaseDate
                                ? new Date(p.purchaseDate).toLocaleDateString()
                                : '-'}
                            </td>
                            <td className="expiration-cell">
                              {p.expirationDate
                                ? new Date(p.expirationDate).toLocaleDateString()
                                : '-'}
                              {isExpired && (
                                <span
                                  className="expiration-warning-icon"
                                  title="Đơn hàng đã hết hạn"
                                  role="img"
                                  aria-label="Đơn hàng đã hết hạn"
                                />
                              )}
                            </td>
                            <td className="modal-profile-actions">
                              <button
                                type="button"
                                onClick={() => handleProfileDelete(p.id)}
                                className="btn btn-danger btn-sm"
                              >
                                Xóa
                              </button>
                              <button
                                type="button"
                                onClick={() => handleProfileTransfer(p.id)}
                                className="btn btn-secondary btn-sm"
                              >
                                Chuyển
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="btn btn-ghost"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
