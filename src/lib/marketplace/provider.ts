import { getMLCredentials, getBMCredentials, getSkuCosts } from "@/lib/storage/cookies";
import { extractMpnFromSku } from "@/lib/utils/sku";

/**
 * Create a synchronous cost lookup function by preloading SKU costs.
 */
export async function createCostLookup(): Promise<(sku: string) => number> {
  const costs = await getSkuCosts();
  return (sku: string) => {
    const mpn = extractMpnFromSku(sku);
    if (!mpn) return 0;
    return costs.find((s) => s.mpn === mpn)?.cost || 0;
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
