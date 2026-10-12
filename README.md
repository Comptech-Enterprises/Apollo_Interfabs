# Apollo Interfabs - Inventory Management Web Portal

Custom inventory management portal designed and built for Apollo Interfabs by Comptech Enterprises. The platform provides centralized, real-time control over fabric stock arrivals, inventory balance tracking, role-gated price management, and sales recording.

---

## Overview and Key Features

1. **SKU and Product Management**
   - Add fabric SKUs with custom naming conventions (for example, BLK-POLY-JUN26).
   - Fabric attributes: Fabric Name, Fabric Type, Colour, Pattern, and additional identifiers.
   - Independent pricing for separate arrival batches of identical fabrics.
   - Manager-controlled fixed selling price per metre.
   - Toggle SKUs between Active and Inactive states.

2. **Stock-In and Purchase Tracking**
   - Record fabric arrivals against specific SKUs: Supplier Name, Quantity in Metres, Purchase Date, and Cost Price per metre.
   - Complete date-wise purchase history log per SKU.
   - Restrict stock-in entry creation to manager accounts only.

3. **Sales and Automated Stock Deduction**
   - Sales staff select an active SKU; the manager-set selling price auto-fills and cannot be manually overridden.
   - Atomic inventory deduction upon sale confirmation.
   - Concurrency-safe updates that prevent negative stock balances or overselling.
   - Detailed sales log recording date, SKU, metres sold, selling price, and optional buyer details.
   - Strict privacy: Cost figures, margins, and profit/loss metrics are never exposed to sales staff.

4. **Real-Time Inventory Dashboard**
   - Live overview of current stock balances across all fabric SKUs.
   - Low-stock alerts triggered by configurable threshold values per SKU.
   - Multi-parameter search and filtering by Fabric Type, Colour, Pattern, Status, and Low Stock.
   - Fully responsive design: Collapsible data cards on mobile viewports to prevent horizontal overflow.

5. **Role-Based Access Control (RBAC)**
   - Two distinct roles: Manager (Admin) and Sales Staff.
   - No open public registration; all accounts are managed and provisioned internally.
   - Comprehensive middleware and server-action authorization checks.
   - Audit trail tracking SKU updates, price modifications, and void actions.

---

## Role Permissions Matrix

| Feature / Action | Manager Role | Sales Role |
|---|:---:|:---:|
| View Live Dashboard & Stock Quantities | Allowed | Allowed |
| Search and Filter Inventory | Allowed | Allowed |
| Record Sales Transactions | Allowed | Allowed |
| View Selling Prices | Allowed | Allowed |
| Create and Modify SKUs | Allowed | Restricted |
| Set Selling Price per Metre | Allowed | Restricted |
| Configure Low Stock Thresholds | Allowed | Restricted |
| Record New Stock Arrivals (Stock-In) | Allowed | Restricted |
| View Cost Price per Metre | Allowed | Restricted |
| Access Full Purchase Logs | Allowed | Restricted |
| Access Global Sales Logs | Allowed | Restricted |
| Void Erroneous Entries (with Audit Reason) | Allowed | Restricted |
| Create User Accounts and Reset Passwords | Allowed | Restricted |

---

## Tech Stack

- **Framework**: Next.js 15 (App Router, React 19, Server Components & Server Actions)
- **Database**: PostgreSQL 16
- **ORM**: Prisma Client v6
- **Styling**: Tailwind CSS v4 (Mobile-first responsive design)
- **Authentication**: Signed stateless JWT sessions (HTTP-only cookies via `jose`) with bcrypt password hashing
- **Form Validation**: Zod schema validation
- **Testing**: Vitest for unit and integration testing

---

## Project Structure

```
apollo_interfabs/
├── prisma/
│   ├── schema.prisma            # Prisma database schema definition
│   ├── seed.ts                  # Database seeding script for initial users and demo data
│   └── migrations/              # Automated database migration files
├── src/
│   ├── actions/                 # Server Actions for mutations (auth, skus, stock, users)
│   ├── app/
│   │   ├── (app)/               # Authenticated application shell and routes
│   │   │   ├── dashboard/       # Inventory dashboard with search and alerts
│   │   │   ├── sales/           # Sales log and new sale recording form
│   │   │   ├── skus/            # SKU management, details, and editor
│   │   │   ├── stock-in/        # Stock arrival form and purchase logs
│   │   │   ├── users/           # User administration and password resets
│   │   │   └── account/         # User profile and password management
│   │   ├── forbidden/           # Access denied page for unauthorized role access
│   │   ├── globals.css          # Tailwind CSS component and global styles
│   │   ├── layout.tsx           # Root layout and metadata configuration
│   │   ├── page.tsx             # Branded portal login interface
│   │   └── not-found.tsx        # Custom 404 page
│   ├── components/              # Reusable UI components (header, footer, forms, badges)
│   ├── lib/                     # Database client, auth guards, formatters, validation
│   └── middleware.ts            # Route protection and role-based redirect middleware
├── tests/
│   ├── unit.test.ts             # Unit test suite for validation and business helpers
│   ├── integration.test.ts      # Live database integration and concurrency tests
│   └── http-verify.mjs          # Live HTTP and RBAC verification suite
├── docker-compose.yml           # Local PostgreSQL container service definition
└── package.json                 # Project configuration and script definitions
```

---

## Getting Started

### Prerequisites

- Node.js (v20 or newer recommended)
- npm (v10 or newer)
- Docker Desktop (for running the PostgreSQL database container)

### Step 1: Clone the Repository

```bash
git clone https://github.com/Comptech-Enterprises/Apollo_Interfabs.git
cd Apollo_Interfabs
```

### Step 2: Configure Environment Variables

Create a local `.env` configuration file by copying `.env.example`:

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

- `DATABASE_URL`: Connection string for PostgreSQL (default local container port: 5433).
- `AUTH_SECRET`: A secure random 32-byte hexadecimal string.
- `SEED_MANAGER1_EMAIL`: Manager account email for initial setup.
- `SEED_MANAGER2_EMAIL`: Secondary manager account email.
- `SEED_SALES_EMAIL`: Sales staff account email.
- `SEED_TEMP_PASSWORD`: Temporary initial password for seeded accounts.

### Step 3: Start the PostgreSQL Container

```bash
docker compose up -d
```

### Step 4: Install Dependencies & Apply Migrations

```bash
npm install
npx prisma migrate deploy
```

### Step 5: Seed User Accounts

To seed the initial administrative and sales users:

```bash
npm run db:seed
```

To additionally populate sample demo fabric SKUs:

```bash
npm run db:seed:demo
```

### Step 6: Start the Development Server

```bash
npm run dev
```

The portal will be accessible at: `http://localhost:3000`

---

## Testing & Quality Assurance

Run the automated test suites:

```bash
# Run unit tests and live database integration tests
npm test

# Run TypeScript static type check
npm run typecheck

# Run production build validation
npm run build

# Run end-to-end HTTP and RBAC route verification
node --env-file=.env tests/http-verify.mjs
```

---

## Production Deployment

1. Provision a managed PostgreSQL instance (e.g., Neon, Supabase, Render, AWS RDS, or self-hosted PostgreSQL).
2. Configure environment variables (`DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL`) on your hosting platform (Vercel, Render, Railway, or VPS).
3. Execute database migrations in your deployment pipeline:
   ```bash
   npx prisma migrate deploy
   ```
4. Build and start the production application:
   ```bash
   npm run build
   npm start
   ```
5. Bind custom domain name provided by Apollo Interfabs and configure SSL/TLS certificates.

---

## License

Proprietary. Developed for Apollo Interfabs by Comptech Enterprises. All rights reserved.
