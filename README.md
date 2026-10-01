# Restaurant SaaS Backend

A comprehensive, multi-tenant Software-as-a-Service (SaaS) backend designed for restaurant management. It provides a robust API for Point of Sale (POS) systems, inventory management, multi-branch operations, employee shifts, and subscription billing.

## 🚀 Features

- **Multi-Tenancy:** Secure data isolation per organization and branch using Mongoose plugins.
- **Identity & Access Management:** JWT-based authentication with Role-Based Access Control (RBAC).
- **Menu Management:** Manage products, categories, modifiers, and composite recipes.
- **Inventory & Supply Chain:** Track stock levels, manage suppliers, process purchase orders, and receive automated low-stock alerts.
- **Point of Sale (POS):** Handle dine-in/takeout orders, tables, payments, refunds, and cash drawer shifts.
- **Platform & SaaS:** Manage tenant subscriptions and track usage.
- **Background Processing:** Redis-backed queues (BullMQ) for background tasks (e.g., low-stock checks, subscription expiry).
- **Storage:** S3-compatible cloud storage support (Cloudflare R2) for media and uploads.

## 🛠 Tech Stack

- **Runtime:** Node.js (ES Modules)
- **Framework:** Express.js 5.x
- **Database:** MongoDB (via Mongoose 9.x)
- **Caching & Queues:** Redis (via `ioredis`), BullMQ
- **Validation:** Zod
- **Logging:** Pino
- **Storage:** AWS SDK (for Cloudflare R2 / S3)

## 📁 Project Structure

The project follows a highly modular domain-driven structure:

```text
src/
├── app.js                 # Express app setup and middleware
├── server.js              # Application entry point & worker registration
├── config/                # Configuration files (DB, Redis, Logger, Constants)
├── middleware/            # Global Express middlewares (Auth, Tenant, RBAC, Rate Limiting)
├── common/                # Shared utilities, models, plugins, jobs, and events
└── modules/               # Domain-driven feature modules
    ├── auth/              # Authentication & JWT
    ├── organizations/     # Multi-tenant management
    ├── branches/          # Restaurant locations
    ├── products/          # Menu items
    ├── inventory/         # Stock management
    ├── orders/            # POS operations
    └── ...                # Other domain modules (roles, subscriptions, shifts, etc.)
```

Each module typically contains its own `*.controller.js`, `*.service.js`, `*.model.js`, `*.routes.js`, and `*.validation.js`.

## ⚙️ Prerequisites

- Node.js (v18+ recommended)
- MongoDB
- Redis

## 📝 Environment Variables

Copy the `.env.example` file to `.env` and fill in your variables:

```bash
cp .env.example .env
```

**Key variables include:**
- `NODE_ENV`, `PORT`
- `MONGO_URI`, `REDIS_URL`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` (For file uploads)
- `BULKSMS_API_KEY` (For SMS notifications)

## 💻 Installation & Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Database Seeding**
   The project includes several seed scripts to help you get started quickly:
   ```bash
   npm run seed:plan         # Seeds subscription plans
   npm run create:superadmin # Creates the initial platform super admin
   npm run seed:demo         # Seeds demo data for testing
   ```

3. **Start the Development Server**
   ```bash
   npm run dev
   ```

4. **Start in Production Mode**
   ```bash
   npm start
   ```

## 🧪 Linting & Testing

- **Run Linter:**
  ```bash
  npm run lint
  ```
- **Run Tests:**
  Testing is set up with Jest and Supertest. *(Check `tests/` directory for implementation)*

## 📄 License
ISC

---
*Maintained by [Uthoai]*
