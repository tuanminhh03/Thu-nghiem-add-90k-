import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import AdminLayout from './AdminLayout';

export default function AdminDashboard() {
  const [customers, setCustomers] = useState([]);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [search, setSearch] = useState('');
  const token = localStorage.getItem('adminToken');

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
      fetchCustomers();
    } catch (err) {
      console.error(err);
      setMsg({
        text: err.response?.data?.message || 'Lỗi xóa tài khoản',
        type: 'error'
      });
    }
  };

  return (
    <AdminLayout>
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-xl font-semibold mb-4">Quản lý khách hàng</h1>
        {msg.text && (
          <p
            className={`mb-4 text-center ${
              msg.type === 'success' ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {msg.text}
          </p>
        )}
        <form onSubmit={handleSearch} className="mb-4 flex gap-2">
          <input
            type="text"
            placeholder="Tìm theo SĐT"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border rounded p-2 flex-1"
          />
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
            Tìm kiếm
          </button>
        </form>
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">STT</th>
              <th className="px-4 py-2 text-left">Tài khoản (SĐT)</th>
              <th className="px-4 py-2 text-left">Ngày tạo TK</th>
              <th className="px-4 py-2 text-left">Số dư hiện tại</th>
              <th className="px-4 py-2 text-center">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c, idx) => (
              <tr key={c._id} className="odd:bg-gray-50">
                <td className="px-4 py-2 border-b">{idx + 1}</td>
                <td className="px-4 py-2 border-b">
                  <Link
                    to={`/admin/customers/${c._id}/orders`}
                    className="text-blue-600 hover:underline"
                  >
                    {c.phone}
                  </Link>
                </td>
                <td className="px-4 py-2 border-b">
                  {new Date(c.createdAt).toLocaleDateString('vi-VN')}
                </td>
                <td className="px-4 py-2 border-b">{c.amount}</td>
                <td className="px-4 py-2 border-b text-center">
                  <button
                    onClick={() => handleTopup(c._id)}
                    className="text-blue-600 hover:underline mr-2"
                  >
                    Nạp tiền
                  </button>
                  <button
                    onClick={() => handleDelete(c._id)}
                    className="text-red-600 hover:underline"
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
