import { NextResponse } from "next/server";
import { isPlatformConnected } from "@/lib/marketplace/provider";
import { mlClient } from "@/lib/marketplace/mercadolibre/client";
import { bmClient } from "@/lib/marketplace/backmarket/client";
import { mapMLItemToListing } from "@/lib/marketplace/mercadolibre/mapper";
import { mapBMListingToUnified } from "@/lib/marketplace/backmarket/mapper";
import type { UnifiedListing } from "@/lib/marketplace/types";

export async function GET() {
  const listings: UnifiedListing[] = [];
  const errors: string[] = [];

  if (await isPlatformConnected("mercadolibre")) {
    try {
      const itemIds = await mlClient.getItems();
      if (itemIds.length > 0) {
        const items = await mlClient.getItemsBatch(itemIds);
        const mlListings = items.map(mapMLItemToListing);

        // Calculate avg ML fee rate from recent orders to estimate net payout
        let feeRate = 0;
        try {
          const ordersRes = await mlClient.searchOrders({ limit: 20 });
          let totalAmount = 0;
          let totalFees = 0;
          for (const o of ordersRes.results) {
            if (o.total_amount > 0) {
              totalAmount += o.total_amount;
              totalFees += o.payments?.reduce((s, p) => s + (p.marketplace_fee || 0), 0) || 0;
            }
          }
          if (totalAmount > 0) feeRate = totalFees / totalAmount;
        } catch {
          // If we can't get orders, skip net payout estimation
        }

        // Apply net payout estimate to each listing
        for (const listing of mlListings) {
          listing.netPayout = feeRate > 0
            ? Math.round((listing.price * (1 - feeRate)) * 100) / 100
            : null;
        }

        listings.push(...mlListings);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`ML: ${msg}`);
      console.error("ML listings error:", e);
    }
  }

  if (await isPlatformConnected("backmarket")) {
    try {
      const res = await bmClient.getAllListings();
      listings.push(...(res.results || []).map(mapBMListingToUnified));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`BM: ${msg}`);
      console.error("BM listings error:", e);
    }
  }

  return NextResponse.json({ listings, errors });
}
