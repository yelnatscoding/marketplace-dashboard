import type { BMListing, BMOrder } from "./client";
import type { UnifiedListing, UnifiedOrder } from "../types";
import { extractMpnFromSku, parseColorFromTitle, parseSizeFromTitle, parseConnectivityFromTitle } from "@/lib/utils/sku";

const BM_STATE_MAP: Record<number, string> = {
  0: "New",
  1: "Pending",
  2: "Validated",
  3: "Shipped",
  4: "Delivered",
  5: "Cancelled",
  6: "Refunded",
};

export function mapBMListingToUnified(listing: BMListing): UnifiedListing {
  const mpn = extractMpnFromSku(listing.sku);

  return {
    id: `bm-${listing.id}`,
    platform: "backmarket",
    externalId: String(listing.id),
    title: listing.title,
    sku: listing.sku || "",
    mpn,
    price: listing.price,
    currency: listing.currency || "USD",
    stock: listing.quantity,
    status: listing.state === 1 ? "active" : "paused",
    imageUrl: listing.image_url,
    size: parseSizeFromTitle(listing.title),
    connectivity: parseConnectivityFromTitle(listing.title),
    color: parseColorFromTitle(listing.title),
  };
}

export function mapBMOrderToUnified(
  order: BMOrder,
  getCost: (sku: string) => number
): UnifiedOrder {
  const items = order.orderlines.map((ol) => ({
    listingId: String(ol.listing_id),
    title: ol.label,
    sku: ol.sku || "",
    quantity: ol.quantity,
    unitPrice: ol.price,
  }));

  const totalAmount = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  const totalCost = items.reduce(
    (sum, item) => sum + getCost(item.sku) * item.quantity,
    0
  );

  const status = BM_STATE_MAP[order.state] || `State ${order.state}`;
  const cancelledStates = [5, 6];
  const margin = cancelledStates.includes(order.state)
    ? 0
    : totalAmount - totalCost;

  const buyerName = order.shipping_address
    ? `${order.shipping_address.first_name} ${order.shipping_address.last_name}`
    : undefined;

  return {
    id: `bm-${order.id}`,
    platform: "backmarket",
    externalId: String(order.id),
    orderNumber: `BM-${order.id}`,
    status,
    buyerName,
    items,
    totalAmount,
    currency: items[0]?.unitPrice ? "USD" : "USD",
    fees: 0,
    shippingCost: 0,
    netAmount: totalAmount,
    cost: totalCost,
    margin,
    trackingNumber: order.tracking_number || undefined,
    trackingUrl: order.tracking_url || undefined,
    orderDate: order.date_creation,
  };
}
