"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { PlatformBadge } from "@/components/platform-badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils/currency";
import type { UnifiedOrder, DashboardKPIs } from "@/lib/marketplace/types";

function KPICard({
  title,
  value,
  icon: Icon,
  description,
  loading,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function RecentOrderRow({ order }: { order: UnifiedOrder }) {
  const s = order.status.toLowerCase();
  let colorClass = "bg-gray-100 text-gray-700";
  if (s.includes("deliver") || s.includes("completed") || s.includes("closed")) colorClass = "bg-green-100 text-green-700";
  else if (s.includes("ship") || s.includes("way") || s.includes("transit")) colorClass = "bg-blue-100 text-blue-700";
  else if (s.includes("paid") || s.includes("pending") || s.includes("new") || s.includes("process")) colorClass = "bg-yellow-100 text-yellow-700";
  else if (s.includes("cancel") || s.includes("refund")) colorClass = "bg-red-100 text-red-700";

  return (
    <Link
      href={`/orders/${order.externalId}`}
      className="flex items-center justify-between py-3 px-1 hover:bg-muted/50 rounded-md transition-colors -mx-1"
    >
      <div className="flex items-center gap-3 min-w-0">
        <PlatformBadge platform={order.platform} />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            {order.items[0]?.title || order.orderNumber}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {formatDate(order.orderDate)}
            {order.platform === "backmarket" && order.buyerName ? ` · ${order.buyerName}` : ""}
            {" · "}{order.orderNumber}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <Badge variant="secondary" className={colorClass}>
          {order.status}
        </Badge>
        <span className="text-sm font-medium w-20 text-right">
          {formatCurrency(order.totalAmount)}
        </span>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { data: kpis, isLoading } = useQuery<DashboardKPIs>({
    queryKey: ["dashboard-kpis"],
    queryFn: () => fetch("/api/unified/dashboard").then((r) => r.json()),
  });

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of your marketplace stores" />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <KPICard
          title="Total Listings"
          value={kpis ? String(kpis.totalListings) : "0"}
          icon={Package}
          description="Active across all platforms"
          loading={isLoading}
        />
        <KPICard
          title="Active Orders"
          value={kpis ? String(kpis.activeOrders) : "0"}
          icon={ShoppingCart}
          description="Pending & in transit"
          loading={isLoading}
        />
        <KPICard
          title="Total Revenue"
          value={kpis ? formatCurrency(kpis.totalRevenue) : "$0"}
          icon={DollarSign}
          description={kpis ? `ML ${formatCurrency(kpis.revenueByPlatform.mercadolibre)} · BM ${formatCurrency(kpis.revenueByPlatform.backmarket)}` : "All time"}
          loading={isLoading}
        />
        <KPICard
          title="Total Profit"
          value={kpis ? formatCurrency(kpis.totalProfit) : "$0"}
          icon={TrendingUp}
          description={kpis ? `${kpis.ordersByPlatform.mercadolibre + kpis.ordersByPlatform.backmarket} orders · after costs & fees` : "After costs & fees"}
          loading={isLoading}
        />
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Orders</CardTitle>
          <Link
            href="/orders"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : kpis?.recentOrders && kpis.recentOrders.length > 0 ? (
            <div className="divide-y">
              {kpis.recentOrders.map((order) => (
                <RecentOrderRow key={order.id} order={order} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>No orders yet</p>
              <p className="text-xs mt-1">
                Connect your marketplace accounts in Settings
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
