import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AdminLayout from './AdminLayout';
import './Admin.css';

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const token = localStorage.getItem('adminToken');

  const fetchLogs = async () => {
    try {
      const { data } = await axios.get('/api/admin/logs', {
        headers: { Authorization: `Bearer ${token}` },
        params: { page }
      });
      setLogs(data.data);
      setPages(data.pages);
    } catch (err) {
      console.error(err);
      setLogs([]);
    }
  };

  useEffect(() => {
    if (token) fetchLogs();
  }, [token, page]);

  return (
    <AdminLayout>
      <div className="card">
        <header className="admin-header">
          <h1 className="text-xl font-semibold">Nhật ký hoạt động</h1>
        </header>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Admin</th>
                <th>Hành động</th>
                <th>Mục tiêu</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l._id}>
                  <td>{new Date(l.createdAt).toLocaleString('vi-VN')}</td>
                  <td>{l.admin}</td>
                  <td>{l.action}</td>
                  <td>{l.target || '-'}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center">
                    Không có nhật ký
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <button
            className="btn"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Trang trước
          </button>
          <span className="mx-2">{page}/{pages}</span>
          <button
            className="btn"
            onClick={() => setPage(p => Math.min(pages, p + 1))}
            disabled={page === pages}
          >
            Trang sau
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
