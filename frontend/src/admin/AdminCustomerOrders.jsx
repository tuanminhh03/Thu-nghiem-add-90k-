import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import './Admin.css';

export default function AdminCustomerOrders() {
  const { id } = useParams();
  const [orders, setOrders] = useState([]);
  const [customer, setCustomer] = useState(null);
  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const { data: cust } = await axios.get(
          `/api/admin/customers/${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setCustomer(cust);

        const { data } = await axios.get(
          `/api/admin/customers/${id}/orders`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setOrders(data);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [id, token]);

  return (
    <AdminLayout>
      <div className="card">
        <h1 className="text-xl font-semibold mb-4">
          Lịch sử mua hàng - {customer?.phone}
        </h1>

        <Link
          to="/admin"
          className="btn btn-primary mb-4 block"
        >
          &larr; Quay lại
        </Link>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>STT</th>
                <th>Plan</th>
                <th>Ngày mua</th>
                <th>Thời hạn</th>
                <th>Số tiền</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o, idx) => (
                <tr key={o._id}>
                  <td>{idx + 1}</td>
                  <td>{o.plan}</td>
                  <td>{new Date(o.purchaseDate).toLocaleDateString('vi-VN')}</td>
                  <td>{o.duration}</td>
                  <td>{o.amount}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center">
                    Không có đơn hàng
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}