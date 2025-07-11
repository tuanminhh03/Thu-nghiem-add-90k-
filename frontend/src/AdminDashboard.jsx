import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState('customers');
  const [filter, setFilter] = useState('');

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

  const filteredCustomers = customers.filter(c =>
    c.phone.includes(filter) || (c.name || '').toLowerCase().includes(filter.toLowerCase())
  );
  const totalRevenue = orders.reduce((sum, o) => sum + o.amount, 0);

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
    <div className="admin-container">
      <div className="admin-card">
        <h1 className="text-2xl font-semibold mb-4">Bảng điều khiển Admin</h1>
        <div className="admin-stats">
          <div className="admin-stat">
            <h3>Tổng khách hàng</h3>
            <p>{customers.length}</p>
          </div>
          <div className="admin-stat">
            <h3>Doanh thu</h3>
            <p>{totalRevenue.toLocaleString()}₫</p>
          </div>
        </div>
        <div className="admin-tabs">
          <button
            className={tab === 'customers' ? 'active' : ''}
            onClick={() => setTab('customers')}
          >
            Khách hàng
          </button>
          <button
            className={tab === 'orders' ? 'active' : ''}
            onClick={() => setTab('orders')}
          >
            Đơn hàng
          </button>
        </div>

        {tab === 'customers' && (
          <>
            <div className="admin-search">
              <input
                type="text"
                placeholder="Tìm theo tên hoặc SĐT..."
                value={filter}
                onChange={e => setFilter(e.target.value)}
              />
            </div>
            <table className="admin-table">
            <thead>
              <tr>
                <th>Tên</th>
                <th>SĐT</th>
                <th className="text-right">Số dư</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map(c => (
                <tr key={c._id} className="hover:bg-gray-50">
                  <td>{c.name || '—'}</td>
                  <td>{c.phone}</td>
                  <td className="text-right">{c.amount?.toLocaleString()}₫</td>
                  <td className="admin-actions">
                    <button className="text-blue-600" onClick={() => handleTopUp(c._id)}>Nạp</button>
                    <button className="text-red-600" onClick={() => handleDeleteCustomer(c._id)}>Xóa</button>
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center py-4 text-gray-500">
                    Không có dữ liệu
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </>
        )}

        {tab === 'orders' && (
          <table className="admin-table">
            <thead>
              <tr>
                <th>SĐT</th>
                <th>Gói</th>
                <th>Thời gian</th>
                <th className="text-right">Số tiền</th>
                <th>Ngày mua</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o._id} className="hover:bg-gray-50">
                  <td>{o.user?.phone}</td>
                  <td>{o.plan}</td>
                  <td>{o.duration}</td>
                  <td className="text-right">{o.amount.toLocaleString()}₫</td>
                  <td>{new Date(o.purchaseDate).toLocaleDateString()}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-4 text-gray-500">
                    Không có dữ liệu
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
