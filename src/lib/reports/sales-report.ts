/**
 * Sales Report — ported from transform_mercado.py
 *
 * Fee calculation, margin calculation, status-based profit filtering.
 * Supports weekly/monthly/alltime period.
 */

import type { UnifiedOrder } from "@/lib/marketplace/types";

export interface SalesReportRow {
  orderId: string;
  status: string;
  sku: string;
  itemDescription: string;
  quantity: number;
  purchaseDate: string;
  basePrice: number;
  fees: number;
  shippingFee: number;
  cost: number;
  totalNet: number;
  margin: number;
  trackingNumber: string;
  platform: string;
}

export interface SalesReportSummary {
  totalAmount: number;
  productCost: number;
  refundWithdrawal: number;
  profit: number;
  orderCount: number;
  rows: SalesReportRow[];
}

// Statuses that indicate sold orders (still own product if cancelled/returned)
const SOLD_STATUSES = [
  "delivered",
  "mediation completed",
  "released the money",
  "on its way",
  "closed complaint",
  "processing",
  "shipped",
  "paid",
  "validated",
];

const UNSOLD_STATUSES = [
  "canceled",
  "cancelled",
  "return in progress",
  "refunded",
];

function isSold(status: string): boolean {
  const lower = status.toLowerCase();
  return SOLD_STATUSES.some((s) => lower.includes(s));
}

function isUnsold(status: string): boolean {
  const lower = status.toLowerCase();
  return UNSOLD_STATUSES.some((s) => lower.includes(s));
}

export function generateSalesReport(
  orders: UnifiedOrder[],
  period?: { from?: Date; to?: Date }
): SalesReportSummary {
  // Filter by period
  let filtered = orders;
  if (period?.from) {
    filtered = filtered.filter(
      (o) => new Date(o.orderDate) >= period.from!
    );
  }
  if (period?.to) {
    filtered = filtered.filter(
      (o) => new Date(o.orderDate) <= period.to!
    );
  }

  const rows: SalesReportRow[] = filtered.map((order) => {
    // Margin is 0 for cancelled/returned (we still own the product)
    const margin = isUnsold(order.status) ? 0 : order.netAmount - order.cost;

    return {
      orderId: order.orderNumber,
      status: order.status,
      sku: order.items[0]?.sku || "",
      itemDescription: order.items[0]?.title || "",
      quantity: order.items.reduce((sum, i) => sum + i.quantity, 0),
      purchaseDate: order.orderDate,
      basePrice: order.totalAmount,
      fees: order.fees,
      shippingFee: order.shippingCost,
      cost: order.cost,
      totalNet: order.netAmount,
      margin,
      trackingNumber: order.trackingNumber || "",
      platform: order.platform,
    };
  });

  const totalAmount = rows.reduce((sum, r) => sum + r.totalNet, 0);

  // Product cost only for sold orders
  const productCost = rows
    .filter((r) => isSold(r.status))
    .reduce((sum, r) => sum + r.cost, 0);

  // Refunds from unsold orders
  const refundWithdrawal = rows
    .filter((r) => isUnsold(r.status))
    .reduce((sum, r) => sum + Math.abs(r.totalNet), 0);

  const profit = totalAmount - productCost - refundWithdrawal;

  return {
    totalAmount,
    productCost,
    refundWithdrawal,
    profit,
    orderCount: rows.length,
    rows,
  };
}
