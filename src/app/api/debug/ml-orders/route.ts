import { NextResponse } from "next/server";
import { mlClient } from "@/lib/marketplace/mercadolibre/client";
import { isPlatformConnected } from "@/lib/marketplace/provider";

export async function GET() {
  if (!(await isPlatformConnected("mercadolibre"))) {
    return NextResponse.json({ error: "ML not connected" });
  }

  try {
    const ordersRes = await mlClient.searchOrders({ limit: 5 });

    return NextResponse.json({
      paging: ordersRes.paging,
      totalResults: ordersRes.results.length,
      orders: ordersRes.results.map((o) => ({
        id: o.id,
        status: o.status,
        total_amount: o.total_amount,
        currency_id: o.currency_id,
        payments: o.payments,
      })),
    });
  } catch (e) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
