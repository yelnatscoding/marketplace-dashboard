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
        let feeDebug = "";
        try {
          const ordersRes = await mlClient.searchOrders({ limit: 50 });
          let totalAmount = 0;
          let totalFees = 0;
          let usedOrders = 0;

          // Dump first order's payment structure for debugging
          const sampleOrder = ordersRes.results[0];
          if (sampleOrder) {
            feeDebug = JSON.stringify({
              orderId: sampleOrder.id,
              status: sampleOrder.status,
              total_amount: sampleOrder.total_amount,
              paymentsCount: sampleOrder.payments?.length ?? "null",
              firstPayment: sampleOrder.payments?.[0] ?? "none",
              totalOrders: ordersRes.results.length,
            });
          }

          for (const o of ordersRes.results) {
            if (o.total_amount > 0 && o.payments && o.payments.length > 0) {
              const orderFees = o.payments.reduce(
                (s, p) => s + (p.marketplace_fee || 0),
                0
              );
              const paidAmount = o.payments.reduce(
                (s, p) => s + (p.total_paid_amount || 0),
                0
              );

              if (orderFees > 0) {
                totalFees += orderFees;
                totalAmount += o.total_amount;
                usedOrders++;
              } else if (paidAmount > 0 && paidAmount !== o.total_amount) {
                totalFees += Math.abs(paidAmount - o.total_amount);
                totalAmount += o.total_amount;
                usedOrders++;
              }
            }
          }

          if (totalAmount > 0) {
            feeRate = totalFees / totalAmount;
          }

          feeDebug += ` | used=${usedOrders} totalAmt=${totalAmount} totalFees=${totalFees} rate=${(feeRate * 100).toFixed(1)}%`;
        } catch (e) {
          feeDebug = `error: ${e instanceof Error ? e.message : String(e)}`;
        }

        if (feeDebug) {
          errors.push(`[debug] ML fee: ${feeDebug}`);
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
