// server.js (ES Module version)
import express from 'express';  // Thay require thành import
import mongoose from 'mongoose';
import Customer from './models/Customer.js';  // Cập nhật đường dẫn của mô hình

const app = express();

app.use(express.json());

// Kết nối MongoDB
mongoose.connect('mongodb://localhost:27017/customer-dashboard', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.log('MongoDB connection error: ', err));

// API để thêm khách hàng vào cơ sở dữ liệu
app.post('/add-customer', async (req, res) => {
  const { name, phone, paymentMethod, plan } = req.body;

  try {
    const customer = new Customer({ name, phone, paymentMethod, plan });
    await customer.save();
    res.status(201).json({ message: 'Customer added successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add customer' });
  }
});

// API để lấy danh sách khách hàng
app.get('/customers', async (req, res) => {
  try {
    const customers = await Customer.find();
    res.status(200).json(customers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Bắt đầu server
app.listen(5000, () => console.log('Server running on port 5000'));
