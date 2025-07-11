import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AdminLayout from './AdminLayout';

export default function AdminDashboard() {
  const [customers, setCustomers] = useState([]);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const token = localStorage.getItem('adminToken');

  const fetchCustomers = async () => {
    try {
      const { data } = await axios.get('/api/admin/customers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomers(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) fetchCustomers();
  }, [token]);

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
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">SĐT</th>
              <th className="px-4 py-2 text-left">Số dư</th>
              <th className="px-4 py-2">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(c => (
              <tr key={c._id} className="odd:bg-gray-50">
                <td className="px-4 py-2 border-b">{c.phone}</td>
                <td className="px-4 py-2 border-b">{c.amount}</td>
                <td className="px-4 py-2 border-b text-center">
                  <button
                    onClick={() => handleTopup(c._id)}
                    className="text-blue-600 hover:underline"
                  >
                    Nạp tiền
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
