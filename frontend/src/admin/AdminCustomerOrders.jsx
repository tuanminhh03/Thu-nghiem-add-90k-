import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import AdminLayout from './AdminLayout';

export default function AdminCustomerOrders() {
  const { id } = useParams();
  const [orders, setOrders] = useState([]);
  const [customer, setCustomer] = useState(null);
  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const { data: cust } = await axios.get(`/api/admin/customers/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCustomer(cust);
        const { data } = await axios.get(`/api/admin/customers/${id}/orders`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setOrders(data);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [id, token]);

  return (
    <AdminLayout>
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-xl font-semibold mb-4">
          Lịch sử mua hàng - {customer?.phone}
        </h1>
        <Link to="/admin" className="text-blue-600 hover:underline mb-4 block">
          &larr; Quay lại
        </Link>
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2">STT</th>
              <th className="px-4 py-2">Plan</th>
              <th className="px-4 py-2">Ngày mua</th>
              <th className="px-4 py-2">Thời hạn</th>
              <th className="px-4 py-2">Số tiền</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o, idx) => (
              <tr key={o._id} className="odd:bg-gray-50">
                <td className="px-4 py-2 border-b">{idx + 1}</td>
                <td className="px-4 py-2 border-b">{o.plan}</td>
                <td className="px-4 py-2 border-b">
                  {new Date(o.purchaseDate).toLocaleDateString('vi-VN')}
                </td>
                <td className="px-4 py-2 border-b">{o.duration}</td>
                <td className="px-4 py-2 border-b">{o.amount}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td className="px-4 py-2 border-b text-center" colSpan="5">
                  Không có đơn hàng
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
