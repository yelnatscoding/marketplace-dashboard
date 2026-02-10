import { NextResponse } from "next/server";
import { ensureDb } from "@/lib/db/migrate";
import { isPlatformConnected, getCostForSku } from "@/lib/marketplace/provider";
import { mlClient } from "@/lib/marketplace/mercadolibre/client";
import { bmClient } from "@/lib/marketplace/backmarket/client";
import { mapMLOrderToUnified } from "@/lib/marketplace/mercadolibre/mapper";
import { mapBMOrderToUnified } from "@/lib/marketplace/backmarket/mapper";
import { generateProductReport } from "@/lib/reports/product-report";
import { getDb, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import type { UnifiedOrder } from "@/lib/marketplace/types";

ensureDb();

export async function GET() {
  const orders: UnifiedOrder[] = [];

  if (isPlatformConnected("mercadolibre")) {
    try {
      const res = await mlClient.searchOrders({ limit: 50 });
      orders.push(
        ...res.results.map((o) => mapMLOrderToUnified(o, getCostForSku))
      );
    } catch (e) {
      console.error("ML product report error:", e);
    }
  }

  if (isPlatformConnected("backmarket")) {
    try {
      const bmOrders = await bmClient.getOrders();
      orders.push(
        ...(bmOrders || []).map((o) => mapBMOrderToUnified(o, getCostForSku))
      );
    } catch (e) {
      console.error("BM product report error:", e);
    }
  }

  // Get last payout date from DB
  const db = getDb();
  const lastPayout = db
    .select()
    .from(schema.payoutRecords)
    .where(eq(schema.payoutRecords.description, "payout"))
    .orderBy(desc(schema.payoutRecords.date))
    .limit(1)
    .get();

  const lastPayoutDate = lastPayout?.date?.slice(0, 10);

  const report = generateProductReport(orders, lastPayoutDate);
  return NextResponse.json(report);
}
