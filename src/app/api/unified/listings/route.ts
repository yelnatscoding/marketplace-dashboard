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

        // Calculate net payout using ML fee calculator API
        const sampleItem = items[0];
        const feeCache = new Map<number, number>();

        errors.push(`[debug] sample: cat=${sampleItem?.category_id} type=${sampleItem?.listing_type_id} price=${sampleItem?.price}`);

        if (sampleItem?.category_id && sampleItem?.listing_type_id) {
          // Test one fee calc and report result
          try {
            const testFees = await mlClient.getListingFees(
              sampleItem.price,
              sampleItem.category_id,
              sampleItem.listing_type_id
            );
            errors.push(`[debug] fee API response: ${JSON.stringify(testFees).slice(0, 500)}`);
          } catch (e) {
            errors.push(`[debug] fee API error: ${e instanceof Error ? e.message : String(e)}`);
          }

          for (const listing of mlListings) {
            try {
              if (feeCache.has(listing.price)) {
                listing.netPayout = Math.round((listing.price - feeCache.get(listing.price)!) * 100) / 100;
                continue;
              }
              const fees = await mlClient.getListingFees(
                listing.price,
                sampleItem.category_id,
                sampleItem.listing_type_id
              );
              const matchingFee = fees.find(
                (f) => f.listing_type_id === sampleItem.listing_type_id
              );
              if (matchingFee) {
                feeCache.set(listing.price, matchingFee.sale_fee_amount);
                listing.netPayout = Math.round((listing.price - matchingFee.sale_fee_amount) * 100) / 100;
              }
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e);
              if (!errors.includes(`[debug] fee loop error: ${msg}`)) {
                errors.push(`[debug] fee loop error: ${msg}`);
              }
            }
          }
        } else {
          errors.push(`[debug] missing category_id or listing_type_id on items`);
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
