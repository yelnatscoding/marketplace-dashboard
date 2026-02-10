import type { BMListing, BMOrder } from "./client";
import type { UnifiedListing, UnifiedOrder } from "../types";
import { extractMpnFromSku, parseColorFromTitle, parseSizeFromTitle, parseConnectivityFromTitle } from "@/lib/utils/sku";

const BM_ORDER_STATE_MAP: Record<number, string> = {
  1: "New",
  2: "Pending",
  3: "Shipped",
  4: "Cancelled",
  5: "Cancelled",
  6: "Refunded",
  7: "Under Review",
  8: "Dispute",
  9: "Completed",
};

export function mapBMListingToUnified(listing: BMListing): UnifiedListing {
  const mpn = extractMpnFromSku(listing.sku);

  return {
    id: `bm-${listing.listing_id}`,
    platform: "backmarket",
    externalId: String(listing.listing_id),
    title: listing.title,
    sku: listing.sku || "",
    mpn,
    price: parseFloat(listing.price) || 0,
    currency: listing.currency || "USD",
    stock: listing.quantity,
    status: listing.publication_state === 2 ? "active" : "paused",
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
    title: ol.product || ol.listing,
    sku: ol.listing || "",
    quantity: ol.quantity,
    unitPrice: parseFloat(ol.price) || 0,
  }));

  const totalAmount = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  const totalCost = items.reduce(
    (sum, item) => sum + getCost(item.sku) * item.quantity,
    0
  );

  const fees = order.orderlines.reduce(
    (sum, ol) => sum + (parseFloat(ol.orderline_fee) || 0),
    0
  );

  const shippingCost = parseFloat(order.shipping_price) || 0;

  const status = BM_ORDER_STATE_MAP[order.state] || `State ${order.state}`;
  const cancelledStates = [4, 5, 6];
  const margin = cancelledStates.includes(order.state)
    ? 0
    : totalAmount - totalCost - fees;

  const buyerName = order.shipping_address
    ? `${order.shipping_address.first_name} ${order.shipping_address.last_name}`
    : undefined;

  return {
    id: `bm-${order.order_id}`,
    platform: "backmarket",
    externalId: String(order.order_id),
    orderNumber: `BM-${order.order_id}`,
    status,
    buyerName,
    items,
    totalAmount,
    currency: order.currency || "USD",
    fees,
    shippingCost,
    netAmount: totalAmount - fees,
    cost: totalCost,
    margin,
    trackingNumber: order.tracking_number || undefined,
    trackingUrl: order.tracking_url || undefined,
    orderDate: order.date_creation,
    shippedDate: order.date_shipping || undefined,
  };
}
