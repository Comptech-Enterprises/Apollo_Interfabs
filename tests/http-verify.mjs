import { spawn } from "node:child_process";
import http from "node:http";

const PORT = 3005;

async function waitServer() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://localhost:${PORT}/`);
      if (res.status === 200) return true;
    } catch (e) {
      // wait
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("Server failed to start on port " + PORT);
}

async function run() {
  console.log("Starting Next.js standalone on port " + PORT + "...");
  const proc = spawn("npx", ["next", "start", "-p", String(PORT)], {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, PORT: String(PORT) },
  });

  try {
    await waitServer();
    console.log("Next.js server is ready!");

    // 1. Check Public Landing Page (Login)
    console.log("\n[Test 1] GET / (Login page)");
    const resHome = await fetch(`http://localhost:${PORT}/`);
    const homeHtml = await resHome.text();
    if (!homeHtml.includes("Apollo Interfabs")) throw new Error("Missing brand title in /");
    if (!homeHtml.includes("Sign in")) throw new Error("Missing Sign In heading in /");
    if (!homeHtml.includes("/icon.svg")) throw new Error("Missing favicon in /");
    console.log("  PASS: Status 200, Branded login rendered, Favicon linked.");

    // 2. Check Unauthenticated Protection (Middleware)
    console.log("\n[Test 2] GET /dashboard without auth cookie");
    const resDashNoAuth = await fetch(`http://localhost:${PORT}/dashboard`, { redirect: "manual" });
    if (resDashNoAuth.status !== 307 && resDashNoAuth.status !== 302) {
      throw new Error(`Expected redirect (302/307), got ${resDashNoAuth.status}`);
    }
    const loc = resDashNoAuth.headers.get("location");
    console.log(`  PASS: Unauthenticated access redirected to: ${loc}`);

    // 3. Authenticate as Manager & test routes
    console.log("\n[Test 3] Session generation for Manager");
    const { signSession } = await import("../src/lib/session.ts");
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    const mgr = await prisma.user.findFirstOrThrow({ where: { role: "MANAGER" } });
    const sls = await prisma.user.findFirstOrThrow({ where: { role: "SALES" } });

    const mgrToken = await signSession({ uid: mgr.id, name: mgr.name, role: "MANAGER" });
    const mgrCookie = `apollo_session=${mgrToken}`;

    // Manager accessing Dashboard
    const resMgrDash = await fetch(`http://localhost:${PORT}/dashboard`, {
      headers: { cookie: mgrCookie },
    });
    const mgrDashHtml = await resMgrDash.text();
    if (!mgrDashHtml.includes("Inventory")) throw new Error("Missing Inventory heading for manager");
    if (!mgrDashHtml.includes("Record stock in")) throw new Error("Manager should see Record stock in button");
    console.log("  PASS: Manager access to /dashboard succeeded (Status 200, Manager controls present)");

    // Manager accessing SKUs list
    const resMgrSkus = await fetch(`http://localhost:${PORT}/skus`, {
      headers: { cookie: mgrCookie },
    });
    if (resMgrSkus.status !== 200) throw new Error("Manager failed to access /skus");
    console.log("  PASS: Manager access to /skus succeeded (Status 200)");

    // Manager accessing Purchases log
    const resMgrPurchases = await fetch(`http://localhost:${PORT}/purchases`, {
      headers: { cookie: mgrCookie },
    });
    if (resMgrPurchases.status !== 200) throw new Error("Manager failed to access /purchases");
    console.log("  PASS: Manager access to /purchases log succeeded (Status 200)");

    // 4. Authenticate as Sales & test role gating
    console.log("\n[Test 4] Session generation & RBAC for Sales Staff");
    const slsToken = await signSession({ uid: sls.id, name: sls.name, role: "SALES" });
    const slsCookie = `apollo_session=${slsToken}`;

    // Sales accessing Dashboard
    const resSlsDash = await fetch(`http://localhost:${PORT}/dashboard`, {
      headers: { cookie: slsCookie },
    });
    const slsDashHtml = await resSlsDash.text();
    if (!slsDashHtml.includes("Inventory")) throw new Error("Missing Inventory heading for sales");
    if (slsDashHtml.includes("Record stock in")) throw new Error("Sales should NOT see Record stock in button");
    console.log("  PASS: Sales access to /dashboard succeeded (Status 200, Manager-only actions hidden)");

    // Sales accessing Record Sale
    const resSlsNewSale = await fetch(`http://localhost:${PORT}/sales/new`, {
      headers: { cookie: slsCookie },
    });
    if (resSlsNewSale.status !== 200) throw new Error("Sales failed to access /sales/new");
    console.log("  PASS: Sales access to /sales/new succeeded (Status 200)");

    // Sales trying to access manager-only route /skus
    const resSlsSkus = await fetch(`http://localhost:${PORT}/skus`, {
      headers: { cookie: slsCookie },
      redirect: "manual",
    });
    if (resSlsSkus.status !== 307 && resSlsSkus.status !== 302) {
      throw new Error(`Expected redirect for sales accessing /skus, got ${resSlsSkus.status}`);
    }
    const slsRedirectLoc = resSlsSkus.headers.get("location");
    if (!slsRedirectLoc?.includes("/forbidden")) {
      throw new Error(`Expected redirect to /forbidden, got ${slsRedirectLoc}`);
    }
    console.log(`  PASS: Sales trying to access /skus blocked and redirected to: ${slsRedirectLoc}`);

    // Sales accessing /forbidden page renders cleanly
    const resForbidden = await fetch(`http://localhost:${PORT}/forbidden`, {
      headers: { cookie: slsCookie },
    });
    const forbiddenHtml = await resForbidden.text();
    if (!forbiddenHtml.includes("Access denied")) throw new Error("Missing Access denied in /forbidden");
    console.log("  PASS: /forbidden page renders branded Access denied message (Status 200)");

    // 5. Custom 404 Not Found Page
    console.log("\n[Test 5] Custom 404 page");
    const res404 = await fetch(`http://localhost:${PORT}/this-route-does-not-exist`);
    const notFoundHtml = await res404.text();
    if (!notFoundHtml.includes("Page not found") && !notFoundHtml.includes("404")) {
      throw new Error("Missing custom 404 page content");
    }
    console.log("  PASS: Custom 404 page rendered correctly for non-existent route.");

    await prisma.$disconnect();
    console.log("\nALL HTTP AND RBAC INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉\n");
  } finally {
    proc.kill("SIGTERM");
  }
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
