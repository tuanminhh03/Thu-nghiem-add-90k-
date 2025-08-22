import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';

import authRoutes from './routes/authRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import miscRoutes from './routes/miscRoutes.js';
import account50kRoutes from './routes/account50kRoutes.js'; 

import Order from './models/Order.js';
import NetflixAccount from './Models/NetflixAccount.js'; 

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

const app = express();
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: corsOrigin, credentials: true }));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('🗄️  MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', miscRoutes);
app.use('/api/account50k', account50kRoutes);

cron.schedule('0 0 * * *', async () => {
  const now = new Date();
  try {
    const expiredOrders = await Order.find({ expiresAt: { $lt: now }, status: { $ne: 'EXPIRED' } });
    for (const order of expiredOrders) {
      order.status = 'EXPIRED';
      await order.save();
      if (order.profileId) {
        await NetflixAccount.updateOne(
          { 'profiles.id': order.profileId },
          {
            $set: { 'profiles.$.status': 'empty' },
            $unset: {
              'profiles.$.customerPhone': '',
              'profiles.$.purchaseDate': '',
              'profiles.$.expirationDate': ''
            }
          }
        );
      }
    }
  } catch (err) {
    console.error('Cron job error:', err);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
