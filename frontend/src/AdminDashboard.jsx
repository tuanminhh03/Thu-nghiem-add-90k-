import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function AdminDashboard() {
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState('customers');

  const fetchCustomers = async () => {
    try {
      const { data } = await axios.get('/api/admin/customers');
      setCustomers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOrders = async () => {
    try {
      const { data } = await axios.get('/api/admin/orders');
      setOrders(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchOrders();
  }, []);

  const handleDeleteCustomer = async (id) => {
    if (!window.confirm('Xóa khách hàng này?')) return;
    try {
      await axios.delete(`/api/admin/customers/${id}`);
      fetchCustomers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTopUp = async (id) => {
    const amountStr = prompt('Nhập số tiền nạp:');
    const amount = Number(amountStr);
    if (!amount || amount <= 0) return;
    try {
      await axios.post(`/api/admin/customers/${id}/topup`, { amount });
      fetchCustomers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pt-24 px-4">
      <div className="max-w-6xl mx-auto bg-white shadow rounded-lg p-6">
        <div className="mb-4 space-x-4">
          <button
            className={`px-4 py-2 rounded ${tab==='customers' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => setTab('customers')}
          >
            Khách hàng
          </button>
          <button
            className={`px-4 py-2 rounded ${tab==='orders' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => setTab('orders')}
          >
            Đơn hàng
          </button>
        </div>

        {tab === 'customers' && (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-200">
                <th className="border px-4 py-2">Tên</th>
                <th className="border px-4 py-2">SĐT</th>
                <th className="border px-4 py-2">Số dư</th>
                <th className="border px-4 py-2">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c._id} className="hover:bg-gray-50">
                  <td className="border px-4 py-2">{c.name || '—'}</td>
                  <td className="border px-4 py-2">{c.phone}</td>
                  <td className="border px-4 py-2 text-right">{c.amount?.toLocaleString()}₫</td>
                  <td className="border px-4 py-2 space-x-2">
                    <button className="text-blue-600" onClick={() => handleTopUp(c._id)}>Nạp</button>
                    <button className="text-red-600" onClick={() => handleDeleteCustomer(c._id)}>Xóa</button>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr><td colSpan="4" className="text-center py-4 text-gray-500">Không có dữ liệu</td></tr>
              )}
            </tbody>
          </table>
        )}

        {tab === 'orders' && (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-200">
                <th className="border px-4 py-2">SĐT</th>
                <th className="border px-4 py-2">Gói</th>
                <th className="border px-4 py-2">Thời gian</th>
                <th className="border px-4 py-2">Số tiền</th>
                <th className="border px-4 py-2">Ngày mua</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o._id} className="hover:bg-gray-50">
                  <td className="border px-4 py-2">{o.user?.phone}</td>
                  <td className="border px-4 py-2">{o.plan}</td>
                  <td className="border px-4 py-2">{o.duration}</td>
                  <td className="border px-4 py-2 text-right">{o.amount.toLocaleString()}₫</td>
                  <td className="border px-4 py-2">{new Date(o.purchaseDate).toLocaleDateString()}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan="5" className="text-center py-4 text-gray-500">Không có dữ liệu</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
