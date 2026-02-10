import { NextRequest, NextResponse } from "next/server";
import { isPlatformConnected, createCostLookup } from "@/lib/marketplace/provider";
import { mlClient } from "@/lib/marketplace/mercadolibre/client";
import { bmClient } from "@/lib/marketplace/backmarket/client";
import { mapMLOrderToUnified } from "@/lib/marketplace/mercadolibre/mapper";
import { mapBMOrderToUnified } from "@/lib/marketplace/backmarket/mapper";
import type { UnifiedOrder } from "@/lib/marketplace/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const dateFrom = searchParams.get("dateFrom") || undefined;
  const dateTo = searchParams.get("dateTo") || undefined;
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  const getCostForSku = await createCostLookup();
  const orders: UnifiedOrder[] = [];

  if (await isPlatformConnected("mercadolibre")) {
    try {
      const res = await mlClient.searchOrders({
        status,
        dateFrom,
        dateTo,
        limit,
        offset,
      });
      orders.push(
        ...res.results.map((o) => mapMLOrderToUnified(o, getCostForSku))
      );
    } catch (e) {
      console.error("ML orders error:", e);
    }
  }

  if (await isPlatformConnected("backmarket")) {
    try {
      const bmRes = await bmClient.getOrders();
      orders.push(
        ...(bmRes.results || []).map((o) => mapBMOrderToUnified(o, getCostForSku))
      );
    } catch (e) {
      console.error("BM orders error:", e);
    }
  }

  // Sort by date descending
  orders.sort(
    (a, b) =>
      new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
  );

  return NextResponse.json(orders);
}
