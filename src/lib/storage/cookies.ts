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
  // Apple Watch SE2
  { id: 1, mpn: "4WWA3LW/A", cost: 221, size: "42mm", connectivity: "GPS", description: "42mm GPS Aluminum Silver" },
  { id: 2, mpn: "4WWF3LW/A", cost: 221, size: "42mm", connectivity: "GPS", description: "42mm GPS Aluminum Rose Gold" },
  { id: 3, mpn: "4WWJ3LW/A", cost: 221, size: "42mm", connectivity: "GPS", description: "42mm GPS Aluminum Jet Black" },
  { id: 4, mpn: "4WXA3LW/A", cost: 223, size: "42mm", connectivity: "Cell", description: "42mm Cell Aluminum Rose Gold" },
  { id: 5, mpn: "4WY03LW/A", cost: 234, size: "46mm", connectivity: "Cell", description: "46mm Cell Aluminum Silver" },
  { id: 6, mpn: "4WY33LW/A", cost: 234, size: "46mm", connectivity: "Cell", description: "46mm Cell Aluminum Jet Black" },
  // iPhones
  { id: 7, mpn: "IPHONE11-64GB", cost: 156.87, size: "64GB", connectivity: null, description: "iPhone 11 64GB" },
  { id: 8, mpn: "IPHONE11-128GB", cost: 163.82, size: "128GB", connectivity: null, description: "iPhone 11 128GB" },
  { id: 9, mpn: "IPHONE12-64GB", cost: 170.76, size: "64GB", connectivity: null, description: "iPhone 12 64GB" },
  { id: 10, mpn: "IPHONE12-128GB", cost: 244.37, size: "128GB", connectivity: null, description: "iPhone 12 128GB" },
  { id: 11, mpn: "IPHONE13-128GB", cost: 244.37, size: "128GB", connectivity: null, description: "iPhone 13 128GB" },
  { id: 12, mpn: "IPHONE13-256GB", cost: 254.10, size: "256GB", connectivity: null, description: "iPhone 13 256GB" },
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
