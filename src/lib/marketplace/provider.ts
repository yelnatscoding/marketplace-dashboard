import { getMLCredentials, getBMCredentials, getSkuCosts } from "@/lib/storage/cookies";
import { extractMpnFromSku } from "@/lib/utils/sku";

/**
 * Create a synchronous cost lookup function by preloading SKU costs.
 * Tries multiple matching strategies:
 * 1. Exact match on full SKU string
 * 2. MPN extraction (first segment before "-")
 * 3. Size + connectivity match (for BM SKUs like "GPS-42-ALUM-...")
 */
export async function createCostLookup(): Promise<(sku: string) => number> {
  const costs = await getSkuCosts();
  return (sku: string) => {
    if (!sku) return 0;

    // 1. Exact match on full SKU
    const exactMatch = costs.find((s) => s.mpn === sku);
    if (exactMatch) return exactMatch.cost;

    // 2. MPN extraction (first segment)
    const mpn = extractMpnFromSku(sku);
    if (mpn) {
      const mpnMatch = costs.find((s) => s.mpn === mpn);
      if (mpnMatch) return mpnMatch.cost;
    }

    // 3. Parse size+connectivity from BM-style SKUs and match
    // e.g. "GPS-42-ALUM-JET BLACK-ASIS" → size=42mm, connectivity=GPS
    // e.g. "CELL-46-ALUM-JET BLACK-ASIS" → size=46mm, connectivity=Cell
    const upper = sku.toUpperCase();
    let skuConnectivity = "";
    let skuSize = "";

    if (upper.startsWith("GPS")) skuConnectivity = "GPS";
    else if (upper.startsWith("CELL")) skuConnectivity = "Cell";

    const sizeMatch = sku.match(/\b(\d{2})\b/);
    if (sizeMatch) skuSize = `${sizeMatch[1]}mm`;

    if (skuConnectivity && skuSize) {
      const sizeConnMatch = costs.find(
        (s) => s.size === skuSize && s.connectivity === skuConnectivity
      );
      if (sizeConnMatch) return sizeConnMatch.cost;
    }

    return 0;
  };
}

/**
 * Check if a platform is connected.
 */
export async function isPlatformConnected(platform: string): Promise<boolean> {
  if (platform === "mercadolibre") {
    const cred = await getMLCredentials();
    return !!cred?.accessToken;
  }
  if (platform === "backmarket") {
    const cred = await getBMCredentials();
    return !!cred?.accessToken;
  }
  return false;
}
