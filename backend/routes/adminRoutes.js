import { Router } from 'express';
import { authenticateAdmin, authorizeRoles } from '../middleware/auth.js';
import {
  login,
  ordersStream,
  getCustomers,
  getCustomer,
  topupCustomer,
  deleteCustomer,
  getCustomerOrders,
  getOrders,
  deleteOrder,
  getNetflixAccounts,
  createNetflixAccount,
  updateNetflixAccount,
  deleteNetflixAccount,
  deleteProfile,
  transferProfile,
  stats
} from '../controllers/adminController.js';

const router = Router();

router.post('/login', login);
router.get('/orders/stream', ordersStream);
router.get('/customers', authenticateAdmin, getCustomers);
router.get('/customers/:id', authenticateAdmin, getCustomer);
router.post('/customers/:id/topup', authenticateAdmin, authorizeRoles('superadmin'), topupCustomer);
router.delete('/customers/:id', authenticateAdmin, authorizeRoles('superadmin'), deleteCustomer);
router.get('/customers/:id/orders', authenticateAdmin, getCustomerOrders);
router.get('/orders', authenticateAdmin, getOrders);
router.delete('/orders/:id', authenticateAdmin, deleteOrder);
router.get('/netflix-accounts', authenticateAdmin, getNetflixAccounts);
router.post('/netflix-accounts', authenticateAdmin, createNetflixAccount);
router.put('/netflix-accounts/:id', authenticateAdmin, updateNetflixAccount);
router.delete('/netflix-accounts/:id', authenticateAdmin, deleteNetflixAccount);
router.delete('/netflix-accounts/:accountId/profiles/:profileId', authenticateAdmin, deleteProfile);
router.post('/netflix-accounts/:accountId/profiles/:profileId/transfer', authenticateAdmin, transferProfile);
router.get('/stats', authenticateAdmin, stats);

export default router;
