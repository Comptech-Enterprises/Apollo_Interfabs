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
  if (map[k]) return map[k];
  return k.replace(/[^a-z0-9]/g, "").slice(0, 4).toUpperCase();
};

/** Suggest a SKU code like BLK-POLY-JUN26 from colour, type and a date. */
export function suggestSkuCode(colour: string, fabricType: string, date = new Date()): string {
  const c = abbr(colour, COLOUR);
  const t = abbr(fabricType, ABBR);
  if (!c || !t) return "";
  return `${c}-${t}-${MONTHS[date.getMonth()]}${String(date.getFullYear()).slice(-2)}`;
}
