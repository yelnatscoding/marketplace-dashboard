import { NextResponse } from "next/server";
import { isPlatformConnected, createCostLookup } from "@/lib/marketplace/provider";
import { mlClient } from "@/lib/marketplace/mercadolibre/client";
import { bmClient } from "@/lib/marketplace/backmarket/client";
import { mapMLItemToListing, mapMLOrderToUnified } from "@/lib/marketplace/mercadolibre/mapper";
import { mapBMListingToUnified, mapBMOrderToUnified } from "@/lib/marketplace/backmarket/mapper";
import type { DashboardKPIs, UnifiedOrder } from "@/lib/marketplace/types";

export async function GET() {
  const getCostForSku = await createCostLookup();

  const kpis: DashboardKPIs = {
    totalListings: 0,
    activeOrders: 0,
    totalRevenue: 0,
    totalProfit: 0,
    revenueByPlatform: { mercadolibre: 0, backmarket: 0 },
    ordersByPlatform: { mercadolibre: 0, backmarket: 0 },
    recentOrders: [],
  };

  const allOrders: UnifiedOrder[] = [];

  // Mercado Libre
  if (await isPlatformConnected("mercadolibre")) {
    try {
      const itemIds = await mlClient.getItems();
      kpis.totalListings += itemIds.length;

      const ordersRes = await mlClient.searchOrders({ limit: 20 });
      const orders = ordersRes.results.map((o) =>
        mapMLOrderToUnified(o, getCostForSku)
      );

      const activeStatuses = ["paid", "confirmed", "partially_paid"];
      kpis.activeOrders += orders.filter((o) =>
        activeStatuses.some((s) => o.status.toLowerCase().includes(s))
      ).length;

      kpis.revenueByPlatform.mercadolibre = orders.reduce(
        (sum, o) => sum + o.totalAmount,
        0
      );
      kpis.ordersByPlatform.mercadolibre = ordersRes.paging.total;
      allOrders.push(...orders);
    } catch (e) {
      console.error("ML dashboard error:", e);
    }
  }

  // BackMarket
  if (await isPlatformConnected("backmarket")) {
    try {
      const listingsRes = await bmClient.getListings();
      kpis.totalListings += listingsRes.count || listingsRes.results?.length || 0;

      const orders = await bmClient.getOrders();
      const unified = (orders || []).map((o) =>
        mapBMOrderToUnified(o, getCostForSku)
      );

      const activeStates = ["New", "Pending", "Validated", "Shipped"];
      kpis.activeOrders += unified.filter((o) =>
        activeStates.includes(o.status)
      ).length;

      kpis.revenueByPlatform.backmarket = unified.reduce(
        (sum, o) => sum + o.totalAmount,
        0
      );
      kpis.ordersByPlatform.backmarket = unified.length;
      allOrders.push(...unified);
    } catch (e) {
      console.error("BM dashboard error:", e);
    }
  }

  kpis.totalRevenue =
    kpis.revenueByPlatform.mercadolibre + kpis.revenueByPlatform.backmarket;
  kpis.totalProfit = allOrders.reduce((sum, o) => sum + o.margin, 0);
  kpis.recentOrders = allOrders
    .sort(
      (a, b) =>
        new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
    )
    .slice(0, 10);

  return NextResponse.json(kpis);
}
