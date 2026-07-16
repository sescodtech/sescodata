import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import authRoutes from './routes/authRoutes';
import walletRoutes from './routes/walletRoutes';
import paymentRoutes from './routes/paymentRoutes';
import purchaseRoutes from './routes/purchaseRoutes';
import productRoutes from './routes/productRoutes';
import adminRoutes from './routes/adminRoutes';
import myRoutes from './routes/myRoutes';
import contactRoutes from './routes/contactRoutes';
import agentRoutes from './routes/agentRoutes';
import supportRoutes from './routes/supportRoutes';
import { protect } from './middlewares/authMiddleware';
import { AuthController } from './controllers/AuthController';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Routes — single-tenant platform. superAdminRoutes / tenantAdminRoutes removed;
// one /api/admin surface for the platform owner.
app.use('/api/auth', authRoutes);
app.get('/api/me', protect, AuthController.me);
app.use('/api/my', myRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/products', productRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/support', supportRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export { app };
