import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

function sanitizeUrl(raw?: string) {
  if (!raw) return "NOT_SET";
  try {
    // Check if there are multiple @ symbols (unencoded password)
    const atCount = (raw.match(/@/g) || []).length;
    const parts = raw.split("@");
    return {
      length: raw.length,
      atCount,
      hostPart: parts[parts.length - 1],
      hasPasswordPlaceholder: raw.includes("[YOUR-PASSWORD]"),
      protocol: raw.split("://")[0],
    };
  } catch (e: unknown) {
    return { error: String(e) };
  }
}

function getEffectiveDbUrl(): string | undefined {
  let url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.STORAGE_URL_POSTGRES_PRISMA_URL ||
    process.env.STORAGE_URL_POSTGRES_URL ||
    process.env.STORAGE_POSTGRES_PRISMA_URL ||
    process.env.STORAGE_POSTGRES_URL;

  if (!url) return undefined;

  // Fix unencoded '@' in password if present
  // e.g. postgres.gtxqgedfbfahuisiixrb:Tarry@26052004@...
  const match = url.match(/^(postgresql:\/\/[^:]+:)(.*)(@[^@]+:[0-9]+\/.*)$/);
  if (match) {
    const rawPass = match[2];
    if (rawPass.includes("@")) {
      const fixedPass = encodeURIComponent(decodeURIComponent(rawPass));
      url = `${match[1]}${fixedPass}${match[3]}`;
    }
  }

  return url;
}

export async function GET() {
  const envKeys = Object.keys(process.env).filter(
    (k) =>
      k.includes("DATABASE") ||
      k.includes("POSTGRES") ||
      k.includes("STORAGE") ||
      k.includes("SUPABASE") ||
      k.includes("URL") ||
      k.includes("AUTH")
  );

  const dbUrl = process.env.DATABASE_URL;
  const effectiveUrl = getEffectiveDbUrl();

  let prismaTest = "NOT_ATTEMPTED";
  let skuCount = -1;

  try {
    const testClient = effectiveUrl
      ? new PrismaClient({ datasources: { db: { url: effectiveUrl } } })
      : new PrismaClient();

    skuCount = await testClient.sku.count();
    prismaTest = "SUCCESS";
    await testClient.$disconnect();
  } catch (err: unknown) {
    prismaTest = "FAILED";
  }

  return NextResponse.json({
    status: prismaTest === "SUCCESS" ? "healthy" : "unhealthy",
    prismaTest,
    skuCount,
  });
}
