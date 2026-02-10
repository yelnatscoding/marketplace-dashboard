"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Package, DollarSign, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { exportToCsv } from "@/lib/utils/csv-export";
import type { ProductReportSummary } from "@/lib/reports/product-report";

export default function ProductReportPage() {
  const { data: report, isLoading } = useQuery<ProductReportSummary>({
    queryKey: ["product-report"],
    queryFn: () => fetch("/api/reports/products").then((r) => r.json()),
  });

  function handleExport() {
    if (!report) return;
    exportToCsv(
      report.products.map((p) => ({
        "Product Name": p.productName,
        Sold: p.sold,
        Cost: p.cost,
        "Selling Rate": p.sellingRate,
        Received: p.received,
        Pending: p.pending,
        Profit: p.profit,
        SKU: p.sku,
        Size: p.size,
        Connectivity: p.connectivity,
        Color: p.color,
      })),
      "product-sales-report"
    );
  }

  return (
    <div>
      <PageHeader
        title="Product Sales Report"
        description="Revenue breakdown by product"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={!report?.products.length}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      {/* Payouts Summary */}
      {report?.payouts && report.payouts.length > 0 && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium mb-3">Payouts Received</h3>
            <div className="space-y-1">
              {report.payouts.map((p, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{p.date}</span>
                  <span>{formatCurrency(p.amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground">Total Sold</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-16" />
                ) : (
                  <p className="text-lg font-bold">{report?.totalSold || 0}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Received</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-20" />
                ) : (
                  <p className="text-lg font-bold">
                    {formatCurrency(report?.totalReceived || 0)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-20" />
                ) : (
                  <p className="text-lg font-bold">
                    {formatCurrency(report?.totalPending || 0)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Total Profit</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-20" />
                ) : (
                  <p
                    className={`text-lg font-bold ${
                      (report?.totalProfit || 0) >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatCurrency(report?.totalProfit || 0)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Name</TableHead>
              <TableHead className="text-center">Sold</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Selling Rate</TableHead>
              <TableHead className="text-right">Received</TableHead>
              <TableHead className="text-right">Pending</TableHead>
              <TableHead className="text-right">Profit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : !report?.products.length ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-12 text-muted-foreground"
                >
                  No product data available. Connect your accounts and import payouts.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {report.products.map((prod, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">
                          {prod.productName}
                        </p>
                        <div className="flex gap-1 mt-1">
                          {prod.size && (
                            <Badge variant="outline" className="text-xs">
                              {prod.size}
                            </Badge>
                          )}
                          {prod.connectivity && (
                            <Badge variant="outline" className="text-xs">
                              {prod.connectivity}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{prod.sold}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(prod.cost)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(prod.sellingRate)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(prod.received)}
                    </TableCell>
                    <TableCell className="text-right text-yellow-600">
                      {prod.pending > 0
                        ? formatCurrency(prod.pending)
                        : "-"}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        prod.profit > 0
                          ? "text-green-600"
                          : prod.profit < 0
                          ? "text-red-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      {prod.profit !== 0 ? formatCurrency(prod.profit) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Totals */}
                <TableRow className="bg-muted/50 font-medium">
                  <TableCell>TOTALS</TableCell>
                  <TableCell className="text-center">
                    {report.totalSold}
                  </TableCell>
                  <TableCell className="text-right">-</TableCell>
                  <TableCell className="text-right">-</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(report.totalReceived)}
                  </TableCell>
                  <TableCell className="text-right text-yellow-600">
                    {formatCurrency(report.totalPending)}
                  </TableCell>
                  <TableCell
                    className={`text-right ${
                      report.totalProfit >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatCurrency(report.totalProfit)}
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
