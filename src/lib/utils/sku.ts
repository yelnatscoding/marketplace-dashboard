/**
 * Extract the MPN (e.g., 4WY33LW/A) from full SKU (e.g., 4WY33LW/A-ASIS-PLUS).
 * Ported from Python: split on '-', take first part.
 */
export function extractMpnFromSku(sku: string | null | undefined): string {
  if (!sku) return "";
  const parts = String(sku).split("-");
  return parts[0] || "";
}

/**
 * Parse color from listing title. Order matters — more specific first.
 * Ported 1:1 from product_sales_report.py
 */
export function parseColorFromTitle(title: string | null | undefined): string {
  if (!title) return "Unknown";
  const lower = title.toLowerCase();

  const colors: [string, string][] = [
    ["rose gold", "Rose Gold"],
    ["jet black", "Jet Black"],
    ["space gray", "Space Gray"],
    ["space grey", "Space Gray"],
    ["blush pink", "Pink"],
    ["midnight", "Midnight"],
    ["starlight", "Starlight"],
    ["silver", "Silver"],
    ["pink", "Pink"],
    ["gold", "Gold"],
    ["blue", "Blue"],
    ["red", "Red"],
    ["green", "Green"],
    ["graphite", "Graphite"],
    ["black", "Black"],
    ["white", "White"],
    ["titanium", "Titanium"],
    ["natural", "Natural"],
  ];

  for (const [pattern, colorName] of colors) {
    if (lower.includes(pattern)) return colorName;
  }
  return "Unknown";
}

/**
 * Parse size from listing title. Matches 4Xmm patterns.
 * Ported from product_sales_report.py
 */
export function parseSizeFromTitle(title: string | null | undefined): string {
  if (!title) return "";
  const match = title.match(/(\d{2})\s*mm/i);
  if (match) return `${match[1]}mm`;
  return "";
}

/**
 * Parse connectivity from listing title.
 * Ported from product_sales_report.py
 */
export function parseConnectivityFromTitle(
  title: string | null | undefined
): string {
  if (!title) return "";
  const lower = title.toLowerCase();

  if (
    lower.includes("cellular") ||
    lower.includes("cell") ||
    lower.includes("gps + cel") ||
    lower.includes("lte")
  ) {
    return "Cell";
  }
  if (lower.includes("gps")) return "GPS";
  return "";
}
