import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
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
import settingsRoutes from './routes/settingsRoutes';
import { protect } from './middlewares/authMiddleware';
import { AuthController } from './controllers/AuthController';
import { generalLimiter } from './middlewares/rateLimiter';

dotenv.config();

const app = express();

// Security headers. CSP is left to Helmet's defaults rather than a custom
// policy, since this API serves no HTML/templates of its own — the SPA
// frontend is a separate deployment with its own CSP concerns.
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(generalLimiter);

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
app.use('/api/settings', settingsRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export { app };
