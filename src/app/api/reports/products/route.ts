import { NextResponse } from "next/server";
import { isPlatformConnected, createCostLookup } from "@/lib/marketplace/provider";
import { mlClient } from "@/lib/marketplace/mercadolibre/client";
import { bmClient } from "@/lib/marketplace/backmarket/client";
import { mapMLOrderToUnified } from "@/lib/marketplace/mercadolibre/mapper";
import { mapBMOrderToUnified } from "@/lib/marketplace/backmarket/mapper";
import { generateProductReport } from "@/lib/reports/product-report";
import type { UnifiedOrder } from "@/lib/marketplace/types";

export async function GET() {
  const getCostForSku = await createCostLookup();
  const orders: UnifiedOrder[] = [];

  if (await isPlatformConnected("mercadolibre")) {
    try {
      const res = await mlClient.searchOrders({ limit: 50 });
      orders.push(
        ...res.results.map((o) => mapMLOrderToUnified(o, getCostForSku))
      );
    } catch (e) {
      console.error("ML product report error:", e);
    }
  }

  if (await isPlatformConnected("backmarket")) {
    try {
      const bmRes = await bmClient.getAllOrders();
      orders.push(
        ...(bmRes.results || []).map((o) => mapBMOrderToUnified(o, getCostForSku))
      );
    } catch (e) {
      console.error("BM product report error:", e);
    }
  }

  const report = generateProductReport(orders);
  return NextResponse.json(report);
}
