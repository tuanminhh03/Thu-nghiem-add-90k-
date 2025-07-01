// server.js (Backend)
app.post('/create-customer', async (req, res) => {
  const { name, phone, paymentMethod, plan } = req.body;
  try {
    // Lưu thông tin khách hàng vào MongoDB
    const customer = new Customer({ name, phone, paymentMethod, plan });
    await customer.save();
    res.status(201).json({ message: 'Customer added successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add customer' });
  }
});
