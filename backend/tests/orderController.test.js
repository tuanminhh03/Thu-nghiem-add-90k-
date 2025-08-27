import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

import orderRoutes from '../routes/orderRoutes.js';
import Account50k from '../models/Account50k.js';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';

let mongoServer;
let app;
let customer;
let token;

beforeAll(async () => {
  process.env.JWT_SECRET = 'testsecret';
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  app = express();
  app.use(express.json());
  app.use('/api/orders', orderRoutes);

  customer = await Customer.create({
    phone: '1234567890',
    name: 'Test User',
    pin: '1234'
  });
  token = jwt.sign({ id: customer._id }, process.env.JWT_SECRET);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Order.deleteMany({});
  await Account50k.deleteMany({});
  await Account50k.create({ username: 'acc@test.com', password: 'pass123' });
});

describe('orderController sellAccount', () => {
  it('saves order with user field', async () => {
    const res = await request(app)
      .post('/api/orders/sell')
      .send({ customerId: customer._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.order.user).toBe(customer._id.toString());

    const order = await Order.findOne();
    expect(order).toBeTruthy();
    expect(order.user.toString()).toBe(customer._id.toString());
  });

  it('returns orders for current user', async () => {
    await request(app)
      .post('/api/orders/sell')
      .send({ customerId: customer._id.toString() });

    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].user).toBe(customer._id.toString());
  });
});
