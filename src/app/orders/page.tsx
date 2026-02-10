"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { PlatformBadge } from "@/components/platform-badge";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ShoppingCart } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import type { UnifiedOrder } from "@/lib/marketplace/types";
import Link from "next/link";

export default function OrdersPage() {
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: ordersData, isLoading } = useQuery<{ orders: UnifiedOrder[]; errors: string[] }>({
    queryKey: ["orders"],
    queryFn: () => fetch("/api/unified/orders").then((r) => r.json()),
  });
  const orders = ordersData?.orders || [];
  const apiErrors = ordersData?.errors || [];

  const filtered = orders.filter((o) => {
    const matchesSearch =
      !search ||
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.buyerName?.toLowerCase().includes(search.toLowerCase()) ||
      o.items.some((i) =>
        i.title.toLowerCase().includes(search.toLowerCase())
      );

    const matchesPlatform =
      platformFilter === "all" || o.platform === platformFilter;

    const matchesStatus =
      statusFilter === "all" ||
      o.status.toLowerCase().includes(statusFilter.toLowerCase());

    return matchesSearch && matchesPlatform && matchesStatus;
  });

  const statusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("deliver") || s.includes("closed")) return "bg-green-100 text-green-700";
    if (s.includes("way") || s.includes("ship") || s.includes("transit")) return "bg-blue-100 text-blue-700";
    if (s.includes("paid") || s.includes("process") || s.includes("pending") || s.includes("new")) return "bg-yellow-100 text-yellow-700";
    if (s.includes("cancel") || s.includes("return") || s.includes("refund")) return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-700";
  };

  function formatDate(dateStr: string) {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  }

  // Calculate totals for filtered view
  const totalRevenue = filtered.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalProfit = filtered.reduce((sum, o) => sum + o.margin, 0);

  return (
    <div>
      <PageHeader
        title="Orders"
        description={`${orders.length} orders across all platforms`}
      />

      {apiErrors.length > 0 && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {apiErrors.map((err, i) => (
            <p key={i}>{err}</p>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order #, buyer, or product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="mercadolibre">Mercado Libre</SelectItem>
            <SelectItem value="backmarket">BackMarket</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="deliver">Delivered</SelectItem>
            <SelectItem value="ship">Shipped</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="cancel">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      {filtered.length > 0 && (
        <div className="flex gap-6 mb-4 text-sm">
          <span className="text-muted-foreground">
            Showing {filtered.length} orders
          </span>
          <span>
            Revenue: <strong>{formatCurrency(totalRevenue)}</strong>
          </span>
          <span>
            Profit: <strong className={totalProfit >= 0 ? "text-green-600" : "text-red-600"}>{formatCurrency(totalProfit)}</strong>
          </span>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Order #</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Margin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-12 text-muted-foreground"
                >
                  <ShoppingCart className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  {orders.length === 0
                    ? "No orders yet. Connect your marketplace accounts in Settings."
                    : "No orders match your filters."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((order) => (
                <TableRow
                  key={order.id}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell>
                    <PlatformBadge platform={order.platform} />
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/orders/${order.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <p className="text-sm truncate">
                      {order.items[0]?.title || "-"}
                    </p>
                    {order.items.length > 1 && (
                      <p className="text-xs text-muted-foreground">
                        +{order.items.length - 1} more
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={statusColor(order.status)}
                    >
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(order.orderDate)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(order.totalAmount)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {order.cost > 0
                      ? formatCurrency(order.cost)
                      : "-"}
                  </TableCell>
                  <TableCell
                    className={`text-right font-medium ${
                      order.margin > 0
                        ? "text-green-600"
                        : order.margin < 0
                        ? "text-red-600"
                        : "text-muted-foreground"
                    }`}
                  >
                    {order.margin !== 0
                      ? formatCurrency(order.margin)
                      : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
