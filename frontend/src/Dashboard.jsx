// src/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

export default function Dashboard() {
  const [customers, setCustomers] = useState([]);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [lastUpdated, setLastUpdated] = useState(null);
  const perPage = 5;

  // Fetch all customers
  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await axios.get('http://localhost:5000/customers');
      setCustomers(res.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    }
  };

  // Delete a customer
  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa khách hàng này?')) return;
    try {
      await axios.delete(`http://localhost:5000/customers/${id}`);
      fetchCustomers();
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered + paginated
  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(filter.toLowerCase()) ||
    c.phone.includes(filter)
  );
  const paginated = filtered.slice((page-1)*perPage, page*perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  return (
    <div className="min-h-screen bg-gray-100 p-6 pt-24">
      <div className="max-w-5xl mx-auto bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-4">Dashboard Quản lý Khách hàng</h1>

        <div className="flex justify-between items-center mb-4">
          <p className="text-gray-600">Tổng khách hàng: {customers.length}</p>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-sm text-gray-500">
                Cập nhật: {lastUpdated.toLocaleString()}
              </span>
            )}
            <button
              onClick={fetchCustomers}
              className="flex items-center gap-1 bg-green-500 text-white rounded px-3 py-1 hover:bg-green-600 transition"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Làm mới
            </button>
          </div>
        </div>

        <div className="flex items-center mb-4">
          <input
            type="text"
            placeholder="Tìm theo tên hoặc số điện thoại..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-grow border rounded px-4 py-2 mr-2 focus:outline-none focus:ring"
          />
          <button
            onClick={() => setPage(1)}
            className="bg-blue-500 text-white rounded px-4 py-2 hover:bg-blue-600 transition"
          >
            Tìm
          </button>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-200">
              <th className="border px-4 py-2">#</th>
              <th className="border px-4 py-2">Tên</th>
              <th className="border px-4 py-2">SĐT</th>
              <th className="border px-4 py-2">Phương thức</th>
              <th className="border px-4 py-2">Gói</th>
              <th className="border px-4 py-2">Ngày mua</th>
              <th className="border px-4 py-2">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((c, i) => (
              <tr key={c._id} className="hover:bg-gray-50">
                <td className="border px-4 py-2 text-center">{(page-1)*perPage + i + 1}</td>
                <td className="border px-4 py-2">{c.name || '—'}</td>
                <td className="border px-4 py-2">{c.phone}</td>
                <td className="border px-4 py-2">{c.paymentMethod || '—'}</td>
                <td className="border px-4 py-2">{c.plan || '—'}</td>
                <td className="border px-4 py-2">
                  {new Date(c.purchaseDate).toLocaleDateString()}
                </td>
                <td className="border px-4 py-2 text-center">
                  <button
                    onClick={() => handleDelete(c._id)}
                    className="text-red-500 hover:underline"
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center py-4 text-gray-500">
                  Không có dữ liệu
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-4">
          <p>
            Trang {page} / {totalPages || 1}
          </p>
          <div className="space-x-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Trước
            </button>
            <button
              disabled={page === totalPages || totalPages===0}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Sau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
