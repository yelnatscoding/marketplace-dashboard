"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Download, DollarSign, TrendingUp, TrendingDown, ShoppingCart } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { exportToCsv } from "@/lib/utils/csv-export";
import type { SalesReportSummary } from "@/lib/reports/sales-report";

type Period = "week" | "biweekly" | "month" | "quarter" | "year" | "all" | "custom";

function getDateRange(period: Period): { from?: string; to?: string } {
  const now = new Date();
  if (period === "week") {
    const from = new Date(now);
    from.setDate(from.getDate() - 7);
    return { from: from.toISOString(), to: now.toISOString() };
  }
  if (period === "biweekly") {
    const from = new Date(now);
    from.setDate(from.getDate() - 14);
    return { from: from.toISOString(), to: now.toISOString() };
  }
  if (period === "month") {
    const from = new Date(now);
    from.setMonth(from.getMonth() - 1);
    return { from: from.toISOString(), to: now.toISOString() };
  }
  if (period === "quarter") {
    const from = new Date(now);
    from.setMonth(from.getMonth() - 3);
    return { from: from.toISOString(), to: now.toISOString() };
  }
  if (period === "year") {
    const from = new Date(now);
    from.setFullYear(from.getFullYear() - 1);
    return { from: from.toISOString(), to: now.toISOString() };
  }
  return {};
}

type PlatformFilter = "all" | "mercadolibre" | "backmarket";

export default function SalesReportPage() {
  const [period, setPeriod] = useState<Period>("month");
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const range =
    period === "custom" && customFrom
      ? {
          from: new Date(customFrom).toISOString(),
          to: customTo ? new Date(customTo + "T23:59:59").toISOString() : new Date().toISOString(),
        }
      : getDateRange(period);
  const params = new URLSearchParams();
  if (range.from) params.set("from", range.from);
  if (range.to) params.set("to", range.to);

  const { data: fullReport, isLoading } = useQuery<SalesReportSummary>({
    queryKey: ["sales-report", period, customFrom, customTo],
    queryFn: () =>
      fetch(`/api/reports/sales?${params}`).then((r) => r.json()),
  });

  // Apply platform filter client-side
  const report = fullReport
    ? platformFilter === "all"
      ? fullReport
      : {
          ...fullReport,
          rows: fullReport.rows.filter((r) => r.platform === platformFilter),
          totalAmount: fullReport.rows
            .filter((r) => r.platform === platformFilter)
            .reduce((sum, r) => sum + r.basePrice - r.fees, 0),
          productCost: fullReport.rows
            .filter((r) => r.platform === platformFilter)
            .reduce((sum, r) => sum + r.cost, 0),
          profit: fullReport.rows
            .filter((r) => r.platform === platformFilter)
            .reduce((sum, r) => sum + r.margin, 0),
          refundWithdrawal: fullReport.rows
            .filter(
              (r) =>
                r.platform === platformFilter &&
                (r.status.toLowerCase().includes("cancel") ||
                  r.status.toLowerCase().includes("refund"))
            )
            .reduce((sum, r) => sum + r.basePrice, 0),
        }
    : undefined;

  function handleExport() {
    if (!report) return;
    exportToCsv(
      report.rows.map((r) => ({
        "Order ID": r.orderId,
        Status: r.status,
        SKU: r.sku,
        Description: r.itemDescription,
        Qty: r.quantity,
        Date: r.purchaseDate,
        "Base Price": r.basePrice,
        Fees: r.fees,
        "Shipping Fee": r.shippingFee,
        Cost: r.cost,
        "Total (Net)": r.totalNet,
        Margin: r.margin,
        Tracking: r.trackingNumber,
        Platform: r.platform,
      })),
      `sales-report-${period}`
    );
  }

  const periodLabel: Record<Period, string> = {
    week: "Weekly",
    biweekly: "Bi-Weekly",
    month: "Monthly",
    quarter: "Quarterly",
    year: "Yearly",
    all: "All-Time",
    custom: "Custom",
  };

  return (
    <div>
      <PageHeader
        title="Sales Report"
        description={`${periodLabel[period]} sales breakdown`}
        actions={
          <div className="flex items-center gap-2">
            <Select
              value={platformFilter}
              onValueChange={(v) => setPlatformFilter(v as PlatformFilter)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="mercadolibre">Mercado Libre</SelectItem>
                <SelectItem value="backmarket">BackMarket</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={period}
              onValueChange={(v) => setPeriod(v as Period)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Weekly</SelectItem>
                <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
                <SelectItem value="quarter">Quarterly</SelectItem>
                <SelectItem value="year">Yearly</SelectItem>
                <SelectItem value="all">All-Time</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={!report?.rows.length}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        }
      />

      {period === "custom" && (
        <div className="flex items-center gap-3 mb-6">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">From</label>
            <Input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="w-[160px]"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">To</label>
            <Input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="w-[160px]"
            />
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground">Total Amount</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-20" />
                ) : (
                  <p className="text-lg font-bold">
                    {formatCurrency(report?.totalAmount || 0)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">Product Cost</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-20" />
                ) : (
                  <p className="text-lg font-bold">
                    {formatCurrency(report?.productCost || 0)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-xs text-muted-foreground">Refunds</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-20" />
                ) : (
                  <p className="text-lg font-bold">
                    {formatCurrency(report?.refundWithdrawal || 0)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">
                  {periodLabel[period]} Profit
                </p>
                {isLoading ? (
                  <Skeleton className="h-6 w-20" />
                ) : (
                  <p
                    className={`text-lg font-bold ${
                      (report?.profit || 0) >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatCurrency(report?.profit || 0)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead className="text-right">Base Price</TableHead>
              <TableHead className="text-right">Fees</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Net</TableHead>
              <TableHead className="text-right">Margin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={9}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : !report?.rows.length ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center py-12 text-muted-foreground"
                >
                  No orders for this period
                </TableCell>
              </TableRow>
            ) : (
              <>
                {report.rows.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm font-mono">
                      {row.orderId}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.sku || "-"}
                    </TableCell>
                    <TableCell className="text-center">{row.quantity}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.basePrice)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(row.fees)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {row.cost > 0 ? formatCurrency(row.cost) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(row.totalNet)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        row.margin > 0
                          ? "text-green-600"
                          : row.margin < 0
                          ? "text-red-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      {row.margin !== 0 ? formatCurrency(row.margin) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Totals row */}
                <TableRow className="bg-muted/50 font-medium">
                  <TableCell>TOTALS</TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-center">
                    {report.rows.reduce((sum, r) => sum + r.quantity, 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(
                      report.rows.reduce((sum, r) => sum + r.basePrice, 0)
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(
                      report.rows.reduce((sum, r) => sum + r.fees, 0)
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(report.productCost)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(report.totalAmount)}
                  </TableCell>
                  <TableCell
                    className={`text-right ${
                      report.profit >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {formatCurrency(report.profit)}
                  </TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
