import type { MLItem, MLOrder } from "./client";
import type { UnifiedListing, UnifiedOrder } from "../types";
import { extractMpnFromSku, parseColorFromTitle, parseSizeFromTitle, parseConnectivityFromTitle } from "@/lib/utils/sku";

export function mapMLItemToListing(item: MLItem): UnifiedListing {
  const sku = item.seller_custom_field ||
    item.variations?.[0]?.seller_custom_field || "";
  const mpn = extractMpnFromSku(sku);

  return {
    id: `ml-${item.id}`,
    platform: "mercadolibre",
    externalId: item.id,
    title: item.title,
    sku,
    mpn,
    price: item.price,
    currency: item.currency_id,
    stock: item.available_quantity,
    status: item.status,
    imageUrl: item.thumbnail,
    url: item.permalink,
    size: parseSizeFromTitle(item.title),
    connectivity: parseConnectivityFromTitle(item.title),
    color: parseColorFromTitle(item.title),
    updatedAt: item.last_updated,
  };
}

export function mapMLOrderToUnified(
  order: MLOrder,
  getCost: (sku: string) => number
): UnifiedOrder {
  const items = order.order_items.map((oi) => ({
    listingId: oi.item.id,
    title: oi.item.title,
    sku: oi.item.seller_custom_field || "",
    quantity: oi.quantity,
    unitPrice: oi.unit_price,
  }));

  const totalFees = order.payments?.reduce(
    (sum, p) => sum + (p.marketplace_fee || 0),
    0
  ) || 0;

  const shippingCost = order.payments?.reduce(
    (sum, p) => sum + (p.shipping_cost || 0),
    0
  ) || 0;

  const netAmount = order.total_amount - totalFees;

  const totalCost = items.reduce(
    (sum, item) => sum + getCost(item.sku) * item.quantity,
    0
  );

  // Margin is 0 for cancelled/returned orders
  const unsoldStatuses = ["cancelled", "invalid"];
  const margin = unsoldStatuses.includes(order.status)
    ? 0
    : netAmount - totalCost;

  return {
    id: `ml-${order.id}`,
    platform: "mercadolibre",
    externalId: String(order.id),
    orderNumber: `PO-211-${order.id}`,
    status: order.status_detail?.description || order.status,
    buyerName: order.buyer
      ? `${order.buyer.first_name} ${order.buyer.last_name}`.trim() || order.buyer.nickname
      : undefined,
    items,
    totalAmount: order.total_amount,
    currency: order.currency_id,
    fees: totalFees,
    shippingCost,
    netAmount,
    cost: totalCost,
    margin,
    trackingNumber: order.shipping?.tracking_number || undefined,
    orderDate: order.date_created,
    deliveredDate:
      order.status === "delivered" ? order.date_closed : undefined,
  };
}
