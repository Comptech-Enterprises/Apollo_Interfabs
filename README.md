# Apollo Interfabs – Inventory Portal

Web portal for fabric SKUs, stock-in, sales (with automatic stock deduction), an inventory dashboard with low-stock alerts, and role-based access (managers and sales).

Built with Next.js 15, PostgreSQL, Prisma, Tailwind CSS. Built by Comptech Enterprises.

## Local setup

```powershell
copy .env.example .env      # then set AUTH_SECRET and the seed emails/password
docker compose up -d        # PostgreSQL on port 5433 (start Docker Desktop first)
npm install
npx prisma migrate dev
npm run db:seed             # 2 managers + 1 sales user (temp password from .env)
npm run db:seed:demo        # optional: demo SKUs
npm run dev                 # http://localhost:3000
```

Seeded users must change their temporary password at first sign-in.

## Roles

| | Manager | Sales |
|---|:-:|:-:|
| View inventory, selling prices, low-stock alerts | ✅ | ✅ |
| Record sales | ✅ | ✅ |
| Add/edit SKUs, set prices, activate/deactivate, low-stock thresholds | ✅ | ❌ |
| Record stock-in, view purchase & sales logs, void entries, manage users | ✅ | ❌ |

Cost price is stored on stock-in entries and shown only to managers in the purchase log/SKU history. No totals, margins or profit/loss figures exist anywhere.

## Configuration

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Long random string used to sign sessions |
| `NEXT_PUBLIC_COMPANY_PHONE` / `NEXT_PUBLIC_COMPANY_EMAIL` | Shown as clickable `tel:` / `mailto:` links when set |
| `NEXT_PUBLIC_SITE_URL` | Public URL (set once the domain is available) |

## Deployment

1. Provision PostgreSQL (e.g. Neon, Supabase, Render) and set `DATABASE_URL`.
2. Set the environment variables above on the host (Vercel, Render or a VPS).
3. Run `npm run db:deploy` then `npm run db:seed` once.
4. `npm run build` and `npm start` (the host usually does this).
5. Attach the client's domain at the host and enable HTTPS.

## Scripts

`npm run dev` · `npm run build` · `npm test` · `npm run typecheck` · `npm run db:migrate` · `npm run db:seed`
