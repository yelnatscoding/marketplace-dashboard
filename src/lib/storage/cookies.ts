import { cookies } from "next/headers";
import { encrypt, decrypt } from "@/lib/utils/crypto";

export interface MLCredentials {
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: number;
  userId: string;
}

export interface BMCredentials {
  accessToken: string;
  tokenExpiresAt: number;
}

export interface SkuCost {
  id: number;
  mpn: string;
  cost: number;
  size: string | null;
  connectivity: string | null;
  description: string | null;
}

const DEFAULT_SKU_COSTS: SkuCost[] = [
  { id: 1, mpn: "4WWA3LW/A", cost: 244, size: "42mm", connectivity: "GPS", description: "42mm GPS Aluminum" },
  { id: 2, mpn: "4WWF3LW/A", cost: 244, size: "42mm", connectivity: "GPS", description: "42mm GPS Aluminum" },
  { id: 3, mpn: "4WWJ3LW/A", cost: 244, size: "42mm", connectivity: "GPS", description: "42mm GPS Aluminum" },
  { id: 4, mpn: "4WXA3LW/A", cost: 274, size: "42mm", connectivity: "Cell", description: "42mm Cell Aluminum" },
  { id: 5, mpn: "4WY03LW/A", cost: 290, size: "46mm", connectivity: "Cell", description: "46mm Cell Aluminum" },
  { id: 6, mpn: "4WY33LW/A", cost: 290, size: "46mm", connectivity: "Cell", description: "46mm Cell Aluminum" },
];

const COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
};

// --- ML Credentials ---
export async function getMLCredentials(): Promise<MLCredentials | null> {
  const store = await cookies();
  const val = store.get("ml_credentials")?.value;
  if (!val) return null;
  try {
    return JSON.parse(decrypt(val));
  } catch {
    return null;
  }
}

export async function setMLCredentials(cred: MLCredentials): Promise<void> {
  const store = await cookies();
  store.set("ml_credentials", encrypt(JSON.stringify(cred)), {
    ...COOKIE_OPTS,
    maxAge: 60 * 60 * 24 * 180,
  });
}

export async function deleteMLCredentials(): Promise<void> {
  const store = await cookies();
  store.delete("ml_credentials");
}

// --- BM Credentials ---
export async function getBMCredentials(): Promise<BMCredentials | null> {
  const store = await cookies();
  const val = store.get("bm_credentials")?.value;
  if (!val) return null;
  try {
    return JSON.parse(decrypt(val));
  } catch {
    return null;
  }
}

export async function setBMCredentials(cred: BMCredentials): Promise<void> {
  const store = await cookies();
  store.set("bm_credentials", encrypt(JSON.stringify(cred)), {
    ...COOKIE_OPTS,
    maxAge: 60 * 60 * 24 * 90,
  });
}

export async function deleteBMCredentials(): Promise<void> {
  const store = await cookies();
  store.delete("bm_credentials");
}

// --- SKU Costs ---
export async function getSkuCosts(): Promise<SkuCost[]> {
  const store = await cookies();
  const val = store.get("sku_costs")?.value;
  if (val) {
    try {
      return JSON.parse(decrypt(val));
    } catch {}
  }
  return [...DEFAULT_SKU_COSTS];
}

export async function setSkuCosts(costs: SkuCost[]): Promise<void> {
  const store = await cookies();
  store.set("sku_costs", encrypt(JSON.stringify(costs)), {
    ...COOKIE_OPTS,
    maxAge: 60 * 60 * 24 * 365,
  });
}

export function getDefaultSkuCosts(): SkuCost[] {
  return [...DEFAULT_SKU_COSTS];
}
