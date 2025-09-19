import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const accounts = [];
const orders = [];
const customers = new Map();
const netflixAccounts = [];

function resolvePathValues(source, path) {
  if (source === null || source === undefined) return undefined;
  if (!path) return source;
  const segments = Array.isArray(path) ? path : String(path).split('.');
  return (function walk(current, remaining) {
    if (current === null || current === undefined) return undefined;
    if (remaining.length === 0) return current;
    const [head, ...tail] = remaining;
    if (Array.isArray(current)) {
      const aggregated = current.flatMap((item) => {
        const val = walk(item, remaining);
        if (Array.isArray(val)) return val;
        if (val === undefined) return [];
        return [val];
      });
      return aggregated;
    }
    const next = current[head];
    if (tail.length === 0) return next;
    return walk(next, tail);
  })(source, segments);
}

function matchesFilter(filter = {}, doc) {
  if (!filter || Object.keys(filter).length === 0) {
    return true;
  }

  return Object.entries(filter).every(([key, value]) => {
    if (key === '$or' && Array.isArray(value)) {
      return value.some((item) => matchesFilter(item, doc));
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if ('$exists' in value) {
        const resolved = resolvePathValues(doc, key);
        const exists = Array.isArray(resolved)
          ? resolved.length > 0
          : resolved !== undefined && resolved !== null;
        return value.$exists ? exists : !exists;
      }
    }

    const resolved = resolvePathValues(doc, key);
    if (Array.isArray(resolved)) {
      return resolved.some((item) => String(item) === String(value));
    }
    return String(resolved) === String(value);
  });
}

class FakeAccount {
  constructor(data = {}) {
    this._id = data._id ? String(data._id) : new mongoose.Types.ObjectId().toString();
    this.username = data.username || '';
    this.password = data.password || '';
    this.status = data.status ?? 'available';
    this.lastUsed = data.lastUsed || null;
  }

  toJSON() {
    return {
      _id: this._id,
      username: this.username,
      password: this.password,
      status: this.status,
      lastUsed: this.lastUsed,
    };
  }

  async save() {
    const idx = accounts.findIndex((acc) => acc._id === this._id);
    if (idx >= 0) {
      accounts[idx] = this;
    } else {
      accounts.push(this);
    }
    return this;
  }
}

class FakeOrder {
  constructor(data = {}) {
    this._id = data._id ? String(data._id) : new mongoose.Types.ObjectId().toString();
    this.user = data.user ? String(data.user) : null;
    this.plan = data.plan || '';
    this.productId = data.productId ? String(data.productId) : undefined;
    this.orderCode = data.orderCode || '';
    this.duration = data.duration || '';
    this.amount = data.amount ?? 0;
    this.accountEmail = data.accountEmail || '';
    this.accountPassword = data.accountPassword || '';
    this.profileId = data.profileId || '';
    this.profileName = data.profileName || '';
    this.pin = data.pin || '';
    this.status = data.status || '';
    this.purchaseDate = data.purchaseDate || new Date();
    this.expiresAt = data.expiresAt || undefined;
    this.history = data.history ? [...data.history] : [];
    this.createdAt = data.createdAt || new Date();
  }

  toJSON() {
    return {
      _id: this._id,
      user: this.user,
      plan: this.plan,
      productId: this.productId,
      orderCode: this.orderCode,
      duration: this.duration,
      amount: this.amount,
      accountEmail: this.accountEmail,
      accountPassword: this.accountPassword,
      profileId: this.profileId,
      profileName: this.profileName,
      pin: this.pin,
      status: this.status,
      purchaseDate: this.purchaseDate,
      expiresAt: this.expiresAt,
      history: this.history,
      createdAt: this.createdAt,
    };
  }

  async save() {
    const idx = orders.findIndex((order) => order._id === this._id);
    if (idx >= 0) {
      orders[idx] = this;
    } else {
      orders.push(this);
    }
    return this;
  }
}

class FakeCustomer {
  constructor(data = {}) {
    this._id = data._id ? String(data._id) : new mongoose.Types.ObjectId().toString();
    this.phone = data.phone || '';
    this.name = data.name || '';
    this.pin = data.pin || '';
    this.amount = data.amount ?? 0;
  }

  toJSON() {
    return {
      _id: this._id,
      phone: this.phone,
      name: this.name,
      pin: this.pin,
      amount: this.amount,
    };
  }

  async save() {
    customers.set(this._id, this);
    return this;
  }
}

class FakeNetflixAccount {
  constructor(data = {}) {
    this._id = data._id ? String(data._id) : new mongoose.Types.ObjectId().toString();
    this.email = data.email || '';
    this.password = data.password || '';
    this.plan = data.plan || 'Gói cao cấp';
    const profiles = Array.isArray(data.profiles)
      ? data.profiles
      : Array.from({ length: 5 }, (_, idx) => ({
          id: `P${idx + 1}`,
          name: '',
          pin: '',
          status: 'empty',
        }));
    this.profiles = profiles.map((p, idx) => ({
      id: p.id || `P${idx + 1}`,
      name: p.name || '',
      pin: p.pin || '',
      status: p.status || 'empty',
      customerPhone: p.customerPhone || '',
      purchaseDate: p.purchaseDate || null,
      expirationDate: p.expirationDate || null,
    }));
  }

  async save() {
    const idx = netflixAccounts.findIndex((acc) => acc._id === this._id);
    if (idx >= 0) {
      netflixAccounts[idx] = this;
    } else {
      netflixAccounts.push(this);
    }
    return this;
  }
}

const Account50kMock = {
  async create(data) {
    const doc = new FakeAccount(data);
    accounts.push(doc);
    return doc;
  },

  async deleteMany() {
    accounts.length = 0;
  },

  async findOne(filter = {}) {
    return accounts.find((doc) => matchesFilter(filter, doc)) || null;
  },

  find(filter = {}) {
    const result = accounts.filter((doc) => matchesFilter(filter, doc));
    return {
      lean: async () => result.map((doc) => doc.toJSON()),
    };
  },
};

const OrderMock = {
  async create(input, _options = {}) {
    const source = Array.isArray(input) ? input : [input];
    const created = source.map((data) => {
      const doc = new FakeOrder(data);
      orders.push(doc);
      return doc;
    });
    return Array.isArray(input) ? created : created[0];
  },

  async deleteMany() {
    orders.length = 0;
  },

  async findOne(filter = {}) {
    return orders.find((doc) => matchesFilter(filter, doc)) || null;
  },

  find(filter = {}) {
    const filtered = orders.filter((doc) => matchesFilter(filter, doc));

    const buildLean = (items) => ({
      lean: () => items.map((doc) => doc.toJSON()),
    });

    return {
      sort(sortSpec = {}) {
        const entries = Object.entries(sortSpec);
        if (entries.length === 0) {
          return buildLean(filtered);
        }

        const [[field, direction]] = entries;
        const sorted = [...filtered].sort((a, b) => {
          const aVal = a[field];
          const bVal = b[field];
          if (aVal === bVal) return 0;
          const dir = direction >= 0 ? 1 : -1;
          return aVal > bVal ? dir : -dir;
        });

        return buildLean(sorted);
      },

      lean: () => filtered.map((doc) => doc.toJSON()),
    };
  },
};

const CustomerMock = {
  async create(data) {
    const doc = new FakeCustomer(data);
    customers.set(doc._id, doc);
    return doc;
  },

  async findById(id) {
    if (!id) return null;
    return customers.get(String(id)) || null;
  },
};

const NetflixAccountMock = {
  async create(data) {
    const doc = new FakeNetflixAccount(data);
    netflixAccounts.push(doc);
    return doc;
  },

  async deleteMany() {
    netflixAccounts.length = 0;
  },

  findOne(filter = {}) {
    const doc = netflixAccounts.find((account) => matchesFilter(filter, account)) || null;
    return {
      session: async () => doc,
      then: (resolve, reject) => Promise.resolve(doc).then(resolve, reject),
      catch: (reject) => Promise.resolve(doc).catch(reject),
    };
  },
};

jest.unstable_mockModule('../models/Account50k.js', () => ({
  __esModule: true,
  default: Account50kMock,
}));

jest.unstable_mockModule('../models/Order.js', () => ({
  __esModule: true,
  default: OrderMock,
}));

jest.unstable_mockModule('../models/Customer.js', () => ({
  __esModule: true,
  default: CustomerMock,
}));

jest.unstable_mockModule('../models/NetflixAccount.js', () => ({
  __esModule: true,
  default: NetflixAccountMock,
}));

const triggerNetflixAutomationMock = jest.fn();

jest.unstable_mockModule('../services/netflixAutomation.js', () => ({
  __esModule: true,
  triggerNetflixAutomation: triggerNetflixAutomationMock,
}));

const { default: orderRoutes } = await import('../routes/orderRoutes.js');
const Account50k = (await import('../models/Account50k.js')).default;
const Order = (await import('../models/Order.js')).default;
const Customer = (await import('../models/Customer.js')).default;
const NetflixAccount = (await import('../models/NetflixAccount.js')).default;

const fakeSession = {
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  abortTransaction: jest.fn(),
  endSession: jest.fn(),
  inTransaction: () => false,
};

jest.spyOn(mongoose, 'startSession').mockImplementation(async () => fakeSession);
const fakeClient = {
  topology: { description: { type: 'Single' }, s: { description: { type: 'Single' } } },
  s: { description: { type: 'Single' } },
};
mongoose.connection.getClient = () => fakeClient;
mongoose.connection.client = fakeClient;

let app;
let customer;
let token;

beforeAll(async () => {
  process.env.JWT_SECRET = 'testsecret';

  app = express();
  app.use(express.json());
  app.use('/api/orders', orderRoutes);

  customer = await Customer.create({
    phone: '1234567890',
    name: 'Test User',
    pin: '1234',
  });

  token = jwt.sign({ id: customer._id }, process.env.JWT_SECRET);
});

beforeEach(async () => {
  await Order.deleteMany({});
  await Account50k.deleteMany({});
  await Account50k.create({ username: 'acc@test.com', password: 'pass123' });
  await NetflixAccount.deleteMany({});
  await NetflixAccount.create({
    email: 'netflix@test.com',
    password: 'netflixpass',
    plan: 'Gói cao cấp',
    profiles: [
      { id: 'P1', name: '', pin: '', status: 'empty' },
      { id: 'P2', name: 'Old', pin: '0000', status: 'used' },
      { id: 'P3', name: '', pin: '', status: 'empty' },
    ],
  });
  triggerNetflixAutomationMock.mockClear();
});

describe('orderController sellAccount', () => {
  it('saves order with user field', async () => {
    const res = await request(app)
      .post('/api/orders/sell')
      .send({ customerId: customer._id });

    expect(res.status).toBe(200);
    expect(res.body.order.user).toBe(customer._id);

    const order = await Order.findOne();
    expect(order).toBeTruthy();
    expect(order.user).toBe(customer._id);
  });

  it('returns orders for current user', async () => {
    await request(app)
      .post('/api/orders/sell')
      .send({ customerId: customer._id });

    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].user).toBe(customer._id);
  });
});

describe('orderController createOrder', () => {
  it('triggers netflix automation after premium purchase', async () => {
    customer.amount = 500000;
    await customer.save();

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        plan: 'Gói cao cấp',
        duration: '1 tháng',
        amount: 200000,
        profileName: 'Khách Vip',
        pin: '4321',
      });

    expect(res.status).toBe(200);
    expect(triggerNetflixAutomationMock).toHaveBeenCalledTimes(1);
    expect(triggerNetflixAutomationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'netflix@test.com',
        password: 'netflixpass',
        profileName: 'Khách Vip',
        pin: '4321',
      })
    );

    const automationArgs = triggerNetflixAutomationMock.mock.calls[0][0];
    expect(automationArgs.isKids).toBe(false);
  });
});
