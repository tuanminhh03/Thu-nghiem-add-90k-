import React, { useEffect, useState } from 'react';
import axios from 'axios';

import AdminLayout from './AdminLayout';


export default function AdminDashboard() {
  const [customers, setCustomers] = useState([]);
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
      fetchCustomers();
    } catch (err) {
      console.error(err);
    }
  };

  return (

    <AdminLayout>
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-xl font-semibold mb-4">Quản lý khách hàng</h1>
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

    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-4">Quản lý tài khoản</h1>
      <table className="w-full border-collapse bg-white shadow">
        <thead>
          <tr className="bg-gray-200 text-left">
            <th className="border px-4 py-2">SĐT</th>
            <th className="border px-4 py-2">Số dư</th>
            <th className="border px-4 py-2">Hành động</th>
          </tr>
        </thead>
        <tbody>
          {customers.map(c => (
            <tr key={c._id} className="hover:bg-gray-50">
              <td className="border px-4 py-2">{c.phone}</td>
              <td className="border px-4 py-2">{c.amount}</td>
              <td className="border px-4 py-2">
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

  );
}
