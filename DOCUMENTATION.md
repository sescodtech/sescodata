# SESCOHUBS SaaS Platform - System Documentation

## 1. Architecture Overview
The system is a Multi-Tenant VTU/Data Reseller SaaS. It consists of a React/TypeScript frontend and a Node.js/TypeScript backend.

### Backend Layering
- **Controllers:** Express handlers for API requests.
- **Services:** Core business logic (Wallet, Auth, Product).
- **Orchestrator:** Handles provider failover and health checks.
- **Providers:** Specialized adapters for Jarapoint, CheapDataHub, and GladTidings.
- **Models:** Mongoose schemas for Tenant, User, and Transaction.

## 2. Multi-Tenancy Model
The platform supports white-labeling through the `Tenant` model.
- **Isolation:** Every user and transaction is linked to a `tenantId`.
- **Branding:** Tenants can customize colors, logos, and slugs.
- **Configuration:** API keys and profit markups are stored per-tenant.

## 3. Provider Failover Strategy
The `ProviderOrchestrator` implements a priority-based failover:
1. Checks tenant's preferred provider order.
2. Validates provider balance > ₦500.
3. Attempts purchase.
4. If failure occurs, automatically tries the next provider in the list.
5. Refunds user wallet if all providers fail.

## 4. API Reference (Summary)
- `POST /api/auth/login`: User authentication.
- `GET /api/products`: Unified plan catalog with applied markups.
- `POST /api/purchase/buy-data`: Atomic purchase with smart routing.
- `GET /api/my/wallet`: Current balance and transaction ledger.
- `PUT /api/tenant-admin/markup`: Update profit margins per category.

## 5. Deployment Guide
1. **Database:** Install MongoDB and create a database.
2. **Environment:** Create a `.env` file in `/server` with:
   - `MONGODB_URI`: Connection string.
   - `JWT_SECRET`: Random secure string.
   - `PAYSTACK_SECRET_KEY`: For payments.
   - `JARAPOINT_API_KEY`, `CHEAPDATAHUB_API_KEY`, `GLADTIDINGS_API_KEY`.
3. **Start Server:** 
   - `cd server && npm install`
   - `npm run dev`
4. **Frontend:**
   - `npm install`
   - Update `VITE_API_URL` in `.env` to point to the server.
   - `npm run dev`
