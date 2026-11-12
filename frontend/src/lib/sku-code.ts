const ABBR: Record<string, string> = {
  polyester: "POLY",
  cotton: "COT",
  rayon: "RAY",
  viscose: "VIS",
  linen: "LIN",
  silk: "SILK",
  wool: "WOOL",
  nylon: "NYL",
  denim: "DEN",
  georgette: "GEO",
  chiffon: "CHIF",
  velvet: "VEL",
};

const COLOUR: Record<string, string> = {
  black: "BLK",
  white: "WHT",
  red: "RED",
  blue: "BLU",
  green: "GRN",
  yellow: "YEL",
  grey: "GRY",
  gray: "GRY",
  brown: "BRN",
  pink: "PNK",
  orange: "ORG",
  purple: "PUR",
  navy: "NVY",
  beige: "BGE",
  cream: "CRM",
};

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

const abbr = (s: string, map: Record<string, string>) => {
  const k = s.trim().toLowerCase();
  if (!k) return "";
  if (map[k]) return map[k];
  // Check if starts with a known key
  for (const [key, val] of Object.entries(map)) {
    if (k.startsWith(key) || key.startsWith(k)) return val;
  }
  return k.replace(/[^a-z0-9]/g, "").slice(0, 4).toUpperCase();
};

/** Suggest a SKU code like BLK-POLY-JUN26 from variant, type and a date. */
export function suggestSkuCode(variant: string, fabricType: string, date = new Date(), fallback = false): string {
  const c = abbr(variant, COLOUR);
  const t = abbr(fabricType, ABBR);
  if (!fallback && (!c || !t)) return "";

  const colPart = c || "SKU";
  const typePart = t || "FAB";
  const my = `${MONTHS[date.getMonth()]}${String(date.getFullYear()).slice(-2)}`;
  return `${colPart}-${typePart}-${my}`;
}
