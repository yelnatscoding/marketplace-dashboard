import { NextRequest, NextResponse } from "next/server";
import { isPlatformConnected, createCostLookup } from "@/lib/marketplace/provider";
import { mlClient } from "@/lib/marketplace/mercadolibre/client";
import { bmClient } from "@/lib/marketplace/backmarket/client";
import { mapMLOrderToUnified } from "@/lib/marketplace/mercadolibre/mapper";
import { mapBMOrderToUnified } from "@/lib/marketplace/backmarket/mapper";
import { generateSalesReport } from "@/lib/reports/sales-report";
import type { UnifiedOrder } from "@/lib/marketplace/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const getCostForSku = await createCostLookup();
  const orders: UnifiedOrder[] = [];

  if (await isPlatformConnected("mercadolibre")) {
    try {
      const res = await mlClient.searchOrders({
        dateFrom: from || undefined,
        dateTo: to || undefined,
        limit: 50,
      });
      orders.push(
        ...res.results.map((o) => mapMLOrderToUnified(o, getCostForSku))
      );
    } catch (e) {
      console.error("ML sales report error:", e);
    }
  }

  if (await isPlatformConnected("backmarket")) {
    try {
      const bmRes = await bmClient.getAllOrders();
      orders.push(
        ...(bmRes.results || []).map((o) => mapBMOrderToUnified(o, getCostForSku))
      );
    } catch (e) {
      console.error("BM sales report error:", e);
    }
  }

  const period = {
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
  };

  const report = generateSalesReport(orders, period);
  return NextResponse.json(report);
}
