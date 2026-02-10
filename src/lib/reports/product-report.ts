/**
 * Product Sales Report — ported from product_sales_report.py
 *
 * Aggregation by product, received vs pending payouts,
 * color/size/connectivity parsing.
 */

import type { UnifiedOrder } from "@/lib/marketplace/types";
import {
  extractMpnFromSku,
  parseColorFromTitle,
  parseSizeFromTitle,
  parseConnectivityFromTitle,
} from "@/lib/utils/sku";
import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export interface ProductReportRow {
  productName: string;
  itemId: string;
  sku: string;
  mpn: string;
  size: string;
  connectivity: string;
  color: string;
  sold: number;
  cost: number;
  sellingRate: number;
  received: number;
  pending: number;
  profit: number;
}

export interface ProductReportSummary {
  products: ProductReportRow[];
  totalSold: number;
  totalReceived: number;
  totalPending: number;
  totalProfit: number;
  payouts: { date: string; amount: number }[];
}

function getSkuInfo(mpn: string): { size: string; connectivity: string; cost: number } | null {
  if (!mpn) return null;
  const db = getDb();
  const row = db
    .select()
    .from(schema.skuCostTable)
    .where(eq(schema.skuCostTable.mpn, mpn))
    .get();

  if (!row) return null;
  return {
    size: row.size || "",
    connectivity: row.connectivity || "",
    cost: row.cost,
  };
}

export function generateProductReport(
  orders: UnifiedOrder[],
  lastPayoutDate?: string
): ProductReportSummary {
  // Group by first item's listing ID (product)
  const products: Record<string, ProductReportRow> = {};

  for (const order of orders) {
    const item = order.items[0];
    if (!item) continue;

    const itemId = item.listingId;
    const sku = item.sku || "";
    const mpn = extractMpnFromSku(sku);
    const title = item.title;

    if (!products[itemId]) {
      const skuInfo = getSkuInfo(mpn);

      const size = skuInfo?.size || parseSizeFromTitle(title);
      const connectivity =
        skuInfo?.connectivity || parseConnectivityFromTitle(title);
      const color = parseColorFromTitle(title);
      const cost = skuInfo?.cost || 0;

      // Build product name: size - connectivity - color
      const parts = [size, connectivity, color !== "Unknown" ? color : ""].filter(Boolean);
      const productName = parts.length > 0 ? parts.join(" - ") : itemId;

      products[itemId] = {
        productName,
        itemId,
        sku,
        mpn,
        size,
        connectivity,
        color,
        sold: 0,
        cost,
        sellingRate: 0,
        received: 0,
        pending: 0,
        profit: 0,
      };
    }

    products[itemId].sold += item.quantity;

    // Determine received vs pending based on last payout date
    const orderDate = order.orderDate.slice(0, 10);
    if (lastPayoutDate && orderDate > lastPayoutDate) {
      products[itemId].pending += order.netAmount;
    } else {
      products[itemId].received += order.netAmount;
    }
  }

  // Calculate derived values
  const productList = Object.values(products).map((p) => {
    p.sellingRate = p.sold > 0 ? (p.received + p.pending) / p.sold : 0;

    const totalCost = p.cost * p.sold;
    p.profit = p.received - totalCost;

    // Don't show negative profit when money is still pending
    if (p.profit < 0 && p.pending > 0) {
      p.profit = 0;
    }

    return p;
  });

  // Sort by received descending
  productList.sort((a, b) => b.received - a.received);

  // Get payouts from DB
  const db = getDb();
  const payoutRows = db
    .select()
    .from(schema.payoutRecords)
    .where(eq(schema.payoutRecords.description, "payout"))
    .all();

  const payouts = payoutRows.map((r) => ({
    date: r.date,
    amount: r.netDebitAmount || 0,
  }));

  return {
    products: productList,
    totalSold: productList.reduce((sum, p) => sum + p.sold, 0),
    totalReceived: productList.reduce((sum, p) => sum + p.received, 0),
    totalPending: productList.reduce((sum, p) => sum + p.pending, 0),
    totalProfit: productList.reduce((sum, p) => sum + p.profit, 0),
    payouts,
  };
}
