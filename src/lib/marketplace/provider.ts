import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { extractMpnFromSku } from "@/lib/utils/sku";

/**
 * Get cost for a given SKU by looking up MPN in the DB.
 */
export function getCostForSku(sku: string): number {
  const mpn = extractMpnFromSku(sku);
  if (!mpn) return 0;

  const db = getDb();
  const row = db
    .select()
    .from(schema.skuCostTable)
    .where(eq(schema.skuCostTable.mpn, mpn))
    .get();

  return row?.cost || 0;
}

/**
 * Check if a platform is connected.
 */
export function isPlatformConnected(platform: string): boolean {
  const db = getDb();
  const cred = db
    .select()
    .from(schema.apiCredentials)
    .where(eq(schema.apiCredentials.platform, platform))
    .get();

  return !!cred?.accessToken;
}
