import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB, User } from "./db.js";
import authRoutes from "./routes/auth.js";
import skuRoutes from "./routes/skus.js";
import stockRoutes from "./routes/stock.js";
import poRoutes from "./routes/purchase-orders.js";
import notificationRoutes from "./routes/notifications.js";
import userRoutes from "./routes/users.js";
import fabricTypeRoutes from "./routes/fabric-types.js";
import accessControlRoutes from "./routes/access-control.js";

const app = express();
const PORT = Number(process.env.API_PORT) || 4000;

// Flexible CORS setup supporting Vercel, localhost, and custom frontend domains
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://localhost:5173",
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow mobile apps, curl, server-to-server or requests without origin
      if (!origin) return callback(null, true);
      // Allow exact matches from allowed list
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Allow any Vercel deployment preview / production domain
      if (origin.endsWith(".vercel.app")) return callback(null, true);
      // Allow any localhost port in development
      if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
      // Fallback allow origin to ensure no unexpected CORS blocks
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json());

let superAdminEnsured = false;
async function ensureSuperAdmin() {
  if (superAdminEnsured) return;
  const existing = await User.findOne({ $or: [{ role: "SUPER_ADMIN" }, { username: "superadmin" }] }).select("_id");
  if (!existing) {
    await User.create({
      name: "Super Admin",
      username: "superadmin",
      email: "superadmin@apollo.local",
      role: "SUPER_ADMIN",
      passwordHash: await bcrypt.hash("superadmin@123", 12),
      active: true,
      mustChangePassword: false,
      warehouses: [],
    });
  }
  superAdminEnsured = true;
}

// Auto-connect database on cold starts (useful for serverless environments like Vercel)
app.use(async (_req, _res, next) => {
  try {
    if (process.env.DATABASE_URL) {
      await connectDB();
      await ensureSuperAdmin();
    }
  } catch (err) {
    console.error("Database connection error in middleware:", err);
  }
  next();
});

// Resource Routers
app.use("/api/auth", authRoutes);
app.use("/api/skus", skuRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/po", poRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/fabric-types", fabricTypeRoutes);
app.use("/api/access-control", accessControlRoutes);

// Helper function to build API status metadata
function getApiStatus() {
  const dbState = mongoose.connection.readyState;
  const dbStatus =
    dbState === 1
      ? "connected"
      : dbState === 2
      ? "connecting"
      : dbState === 3
      ? "disconnecting"
      : "disconnected";

  return {
    ok: true,
    service: "Apollo Interfabs API",
    status: "online",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "production",
    database: dbStatus,
    timestamp: new Date().toISOString(),
    endpoints: {
      health: "/api/health",
      auth: "/api/auth",
      skus: "/api/skus",
      stock: "/api/stock",
      po: "/api/po",
      notifications: "/api/notifications",
      users: "/api/users",
    },
  };
}

// Health Check Endpoint
app.get("/api/health", (_req, res) => {
  const status = getApiStatus();
  res.json({
    ok: true,
    service: status.service,
    status: "healthy",
    database: status.database,
    timestamp: status.timestamp,
  });
});

// HTML Landing Page for Browser Visits to / or /api
function renderLandingHtml() {
  const status = getApiStatus();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Apollo Interfabs API — Online</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23dc2626'><path d='M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5'/></svg>">
  <style>
    :root {
      --primary: #dc2626;
      --primary-dark: #b91c1c;
      --primary-light: #fef2f2;
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --text: #0f172a;
      --text-muted: #64748b;
      --border: #e2e8f0;
      --success: #16a34a;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .container {
      width: 100%;
      max-width: 680px;
      background: var(--card-bg);
      border-radius: 1rem;
      border: 1px solid var(--border);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #991b1b 0%, #dc2626 50%, #ef4444 100%);
      color: white;
      padding: 2rem 2rem 1.75rem;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(8px);
      padding: 0.3rem 0.8rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 0.75rem;
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      background: #4ade80;
      border-radius: 50%;
      box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.7);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.7); }
      70% { box-shadow: 0 0 0 8px rgba(74, 222, 128, 0); }
      100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); }
    }
    .title {
      font-size: 1.65rem;
      font-weight: 700;
      letter-spacing: -0.025em;
      margin-bottom: 0.25rem;
    }
    .subtitle {
      font-size: 0.9rem;
      opacity: 0.9;
    }
    .content {
      padding: 1.75rem 2rem;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }
    @media (max-width: 600px) {
      .grid { grid-template-columns: 1fr; }
    }
    .stat-card {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 0.625rem;
      padding: 0.75rem 1rem;
    }
    .stat-label {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 0.25rem;
      font-weight: 600;
    }
    .stat-val {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text);
    }
    .stat-val.online {
      color: var(--success);
    }
    .section-title {
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 0.75rem;
    }
    .endpoints {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
    }
    .endpoint-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.6rem 0.85rem;
      background: #ffffff;
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      text-decoration: none;
      color: inherit;
      transition: all 0.15s ease;
    }
    .endpoint-item:hover {
      border-color: var(--primary);
      background: var(--primary-light);
    }
    .endpoint-left {
      display: flex;
      align-items: center;
      gap: 0.625rem;
    }
    .method {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 0.15rem 0.4rem;
      border-radius: 0.25rem;
      letter-spacing: 0.025em;
    }
    .method.get { background: #e0f2fe; color: #0369a1; }
    .method.post { background: #dcfce7; color: #15803d; }
    .route-path {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .route-desc {
      font-size: 0.8rem;
      color: var(--text-muted);
    }
    .actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.55rem 1.1rem;
      font-size: 0.85rem;
      font-weight: 600;
      border-radius: 0.5rem;
      text-decoration: none;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.15s ease;
    }
    .btn-primary {
      background: var(--primary);
      color: white;
    }
    .btn-primary:hover {
      background: var(--primary-dark);
    }
    .btn-secondary {
      background: white;
      border-color: var(--border);
      color: var(--text);
    }
    .btn-secondary:hover {
      background: var(--bg);
      border-color: #cbd5e1;
    }
    .footer {
      padding: 0.875rem 2rem;
      background: var(--bg);
      border-top: 1px solid var(--border);
      font-size: 0.75rem;
      color: var(--text-muted);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    #health-output {
      display: none;
      margin-top: 1rem;
      padding: 0.875rem;
      background: #0f172a;
      color: #38bdf8;
      border-radius: 0.5rem;
      font-family: ui-monospace, monospace;
      font-size: 0.8rem;
      overflow-x: auto;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">
        <span class="pulse-dot"></span>
        API Operational
      </div>
      <h1 class="title">Apollo Interfabs API</h1>
      <p class="subtitle">Inventory Management, Purchase Orders & Warehouse Operations</p>
    </div>

    <div class="content">
      <div class="grid">
        <div class="stat-card">
          <div class="stat-label">System Status</div>
          <div class="stat-val online">● Online</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Version</div>
          <div class="stat-val">${status.version}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Database</div>
          <div class="stat-val">${status.database}</div>
        </div>
      </div>

      <div class="section-title">Core API Endpoints</div>
      <div class="endpoints">
        <a href="/api/health" class="endpoint-item">
          <div class="endpoint-left">
            <span class="method get">GET</span>
            <span class="route-path">/api/health</span>
          </div>
          <span class="route-desc">System health & database check</span>
        </a>
        <div class="endpoint-item">
          <div class="endpoint-left">
            <span class="method post">POST</span>
            <span class="route-path">/api/auth/login</span>
          </div>
          <span class="route-desc">User authentication & session</span>
        </div>
        <a href="/api/skus" class="endpoint-item">
          <div class="endpoint-left">
            <span class="method get">GET</span>
            <span class="route-path">/api/skus</span>
          </div>
          <span class="route-desc">SKU catalog & inventory list</span>
        </a>
        <a href="/api/stock/purchases" class="endpoint-item">
          <div class="endpoint-left">
            <span class="method get">GET</span>
            <span class="route-path">/api/stock/purchases</span>
          </div>
          <span class="route-desc">Inward stock logs & quality review</span>
        </a>
        <a href="/api/po" class="endpoint-item">
          <div class="endpoint-left">
            <span class="method get">GET</span>
            <span class="route-path">/api/po</span>
          </div>
          <span class="route-desc">Purchase order register & status</span>
        </a>
      </div>

      <div class="actions">
        <button id="ping-btn" class="btn btn-primary" onclick="testHealth()">⚡ Test Health Check</button>
        <a href="/api?format=json" class="btn btn-secondary">{ } View JSON API</a>
      </div>

      <pre id="health-output"></pre>
    </div>

    <div class="footer">
      <span>Apollo Interfabs © 2026</span>
      <span>${status.timestamp}</span>
    </div>
  </div>

  <script>
    async function testHealth() {
      const btn = document.getElementById('ping-btn');
      const box = document.getElementById('health-output');
      btn.innerText = 'Pinging...';
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        box.style.display = 'block';
        box.innerText = JSON.stringify(data, null, 2);
        btn.innerText = '✓ Health OK';
      } catch (err) {
        box.style.display = 'block';
        box.innerText = 'Error pinging health: ' + err.message;
        btn.innerText = '⚡ Retry Test';
      }
    }
  </script>
</body>
</html>`;
}

// Root Route (GET /)
app.get("/", (req, res) => {
  if (req.query.format === "json" || !req.accepts("html")) {
    return res.json(getApiStatus());
  }
  return res.type("html").send(renderLandingHtml());
});

// Root API Directory Route (GET /api)
app.get("/api", (req, res) => {
  if (req.query.format === "json" || !req.accepts("html")) {
    return res.json(getApiStatus());
  }
  return res.type("html").send(renderLandingHtml());
});

// Custom 404 Handler
app.use((req, res) => {
  if (req.accepts("html")) {
    res.status(404).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>404 Not Found — Apollo API</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; color: #0f172a; }
    .card { background: white; padding: 2.5rem; border-radius: 1rem; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); text-align: center; max-width: 440px; border: 1px solid #e2e8f0; }
    h1 { color: #dc2626; font-size: 2.5rem; margin: 0 0 0.5rem; font-weight: 800; }
    p { color: #64748b; font-size: 0.95rem; margin-bottom: 1.5rem; line-height: 1.5; }
    code { background: #fee2e2; color: #991b1b; padding: 0.2rem 0.4rem; border-radius: 0.25rem; font-size: 0.85rem; }
    a { display: inline-block; background: #dc2626; color: white; text-decoration: none; padding: 0.65rem 1.3rem; border-radius: 0.5rem; font-weight: 600; font-size: 0.875rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>404</h1>
    <p>The requested endpoint <code>${req.originalUrl || req.url}</code> does not exist on this API.</p>
    <a href="/">Return to API Overview</a>
  </div>
</body>
</html>`);
  } else {
    res.status(404).json({
      ok: false,
      message: `Endpoint ${req.method} ${req.originalUrl || req.url} not found`,
    });
  }
});

// Global Error Handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled API error:", err);
  res.status(500).json({ ok: false, message: "Internal server error" });
});

if (!process.env.VERCEL) {
  (async () => {
    try {
      if (process.env.DATABASE_URL) {
        await connectDB();
        await ensureSuperAdmin();
        console.log("Connected to MongoDB via Mongoose.");
      } else {
        console.warn("DATABASE_URL is not set. Database not connected yet.");
      }
    } catch (err) {
      console.error("Failed to connect to MongoDB:", err);
    }
    app.listen(PORT, () => {
      console.log(`Apollo API running on http://localhost:${PORT}`);
    });
  })();
}

export default app;
export { app };
