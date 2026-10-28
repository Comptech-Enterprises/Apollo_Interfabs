"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export type SearchResult = {
  id: string;
  code: string;
  fabricName: string;
  fabricType: string;
  colour: string;
  pattern: string | null;
  otherIdentifiers: string | null;
  sellingPricePerMetre: number;
  currentStock: number;
  lowStockThreshold: number;
  active: boolean;
};

export async function searchSkus(query: string, filters?: {
  type?: string;
  colour?: string;
  pattern?: string;
  status?: string;
  low?: boolean;
}): Promise<SearchResult[]> {
  const user = await requireUser();
  const where: Record<string, unknown> = {};

  if (query.trim()) {
    const tokens = query.trim().split(/\s+/).filter(Boolean);
    where.AND = tokens.map((token: string) => ({
      OR: [
        { code: { contains: token, mode: "insensitive" } },
        { fabricName: { contains: token, mode: "insensitive" } },
        { fabricType: { contains: token, mode: "insensitive" } },
        { colour: { contains: token, mode: "insensitive" } },
        { pattern: { contains: token, mode: "insensitive" } },
        { otherIdentifiers: { contains: token, mode: "insensitive" } },
      ],
    }));
  }

  if (filters?.type) where.fabricType = filters.type;
  if (filters?.colour) where.colour = filters.colour;
  if (filters?.pattern) where.pattern = filters.pattern;

  if (user.role !== "MANAGER") where.active = true;
  else if (filters?.status === "active") where.active = true;
  else if (filters?.status === "inactive") where.active = false;

  const skus = await prisma.sku.findMany({
    where,
    orderBy: [{ code: "asc" }],
    take: 50,
  });

  let results: SearchResult[] = skus.map((s) => ({
    id: s.id,
    code: s.code,
    fabricName: s.fabricName,
    fabricType: s.fabricType,
    colour: s.colour,
    pattern: s.pattern,
    otherIdentifiers: s.otherIdentifiers,
    sellingPricePerMetre: Number(s.sellingPricePerMetre),
    currentStock: Number(s.currentStock),
    lowStockThreshold: Number(s.lowStockThreshold),
    active: s.active,
  }));

  if (filters?.low) {
    results = results.filter((s) => s.lowStockThreshold > 0 && s.currentStock <= s.lowStockThreshold);
  }

  return results;
}

export async function getFacets(): Promise<{
  types: string[];
  colours: string[];
  patterns: string[];
}> {
  const facets = await prisma.sku.findMany({
    select: { fabricType: true, colour: true, pattern: true },
    distinct: ["fabricType", "colour", "pattern"],
  });
  return {
    types: [...new Set(facets.map((f) => f.fabricType))].sort(),
    colours: [...new Set(facets.map((f) => f.colour))].sort(),
    patterns: [...new Set(facets.map((f) => f.pattern).filter((p): p is string => !!p))].sort(),
  };
}
