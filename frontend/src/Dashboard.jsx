// src/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Dashboard = () => {
  const [customers, setCustomers] = useState([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [plan, setPlan] = useState('');

  // Lấy danh sách khách hàng từ API
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await axios.get('http://localhost:5000/customers');
        setCustomers(response.data);
      } catch (error) {
        console.error('Error fetching customers', error);
      }
    };
    fetchCustomers();
  }, []);

  // Xử lý form khi thêm khách hàng
  const handleAddCustomer = async () => {
    try {
      // Gửi yêu cầu thêm khách hàng
      await axios.post('http://localhost:5000/add-customer', {
        name,
        phone,
        paymentMethod,
        plan,
      });

      // Làm trống form sau khi thêm thành công
      setName('');
      setPhone('');
      setPaymentMethod('');
      setPlan('');

      // Lấy lại danh sách khách hàng mới nhất
      const response = await axios.get('http://localhost:5000/customers');
      setCustomers(response.data);

      alert('Customer added successfully');
    } catch (error) {
      console.error('Error adding customer', error);
      alert('Failed to add customer');
    }
  };

  return (
    <div>
      <h2>Dashboard - Quản lý Khách Hàng</h2>

      <div>
        <h3>Thêm Khách Hàng</h3>
        <form onSubmit={(e) => e.preventDefault()}>
          <input
            type="text"
            placeholder="Tên khách hàng"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Số điện thoại"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <input
            type="text"
            placeholder="Phương thức thanh toán"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          />
          <input
            type="text"
            placeholder="Gói mua"
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
          />
          <button type="button" onClick={handleAddCustomer}>
            Thêm khách hàng
          </button>
        </form>
      </div>

      <div>
        <h3>Danh sách Khách Hàng</h3>
        <table>
          <thead>
            <tr>
              <th>Tên</th>
              <th>Số điện thoại</th>
              <th>Phương thức thanh toán</th>
              <th>Gói</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer._id}>
                <td>{customer.name}</td>
                <td>{customer.phone}</td>
                <td>{customer.paymentMethod}</td>
                <td>{customer.plan}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;
