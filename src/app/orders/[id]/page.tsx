"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { PlatformBadge } from "@/components/platform-badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Truck, Package, DollarSign, ArrowLeft } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import type { UnifiedOrder } from "@/lib/marketplace/types";
import Link from "next/link";

export default function OrderDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const orderId = params.id as string;

  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");

  // Find order from cache or fetch
  const { data: orders = [] } = useQuery<UnifiedOrder[]>({
    queryKey: ["orders"],
    queryFn: () => fetch("/api/unified/orders").then((r) => r.json()),
  });

  const order = orders.find((o) => o.id === orderId);

  const updateTracking = useMutation({
    mutationFn: async () => {
      if (!order) return;
      if (order.platform !== "backmarket") {
        throw new Error("Tracking upload only supported for BackMarket");
      }

      const res = await fetch("/api/backmarket/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.externalId,
          tracking_number: trackingNumber,
          tracking_url: trackingUrl || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to update tracking");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setTrackingNumber("");
      setTrackingUrl("");
      toast.success("Tracking updated");
    },
    onError: (e) => {
      toast.error(e.message);
    },
  });

  if (!order) {
    return (
      <div>
        <PageHeader title="Order Detail" />
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Package className="h-12 w-12 mb-4 opacity-50" />
          <p>Order not found</p>
          <Link href="/orders" className="mt-4">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Orders
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("deliver")) return "bg-green-100 text-green-700";
    if (s.includes("ship") || s.includes("way")) return "bg-blue-100 text-blue-700";
    if (s.includes("paid") || s.includes("process")) return "bg-yellow-100 text-yellow-700";
    if (s.includes("cancel")) return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-700";
  };

  return (
    <div>
      <PageHeader
        title={order.orderNumber}
        actions={
          <Link href="/orders">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
        }
      />

      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-xl font-bold">
                  {formatCurrency(order.totalAmount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cost</p>
                <p className="text-xl font-bold">
                  {order.cost > 0 ? formatCurrency(order.cost) : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${order.margin > 0 ? "bg-green-100" : order.margin < 0 ? "bg-red-100" : "bg-muted"}`}>
                <DollarSign className={`h-5 w-5 ${order.margin > 0 ? "text-green-600" : order.margin < 0 ? "text-red-600" : ""}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Margin</p>
                <p className={`text-xl font-bold ${order.margin > 0 ? "text-green-600" : order.margin < 0 ? "text-red-600" : ""}`}>
                  {order.margin !== 0 ? formatCurrency(order.margin) : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Order Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Platform</span>
              <PlatformBadge platform={order.platform} />
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <Badge variant="secondary" className={statusColor(order.status)}>
                {order.status}
              </Badge>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Order Date</span>
              <span>
                {new Date(order.orderDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Buyer</span>
              <span>{order.buyerName || "-"}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Fees</span>
              <span>{formatCurrency(order.fees)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Net Amount</span>
              <span className="font-medium">
                {formatCurrency(order.netAmount)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Items + Tracking */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Items</CardTitle>
            </CardHeader>
            <CardContent>
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between py-2">
                  <div>
                    <p className="text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {item.sku || "-"} x{item.quantity}
                    </p>
                  </div>
                  <span className="text-sm font-medium">
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Tracking */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.trackingNumber ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Number</span>
                    <span className="font-mono">{order.trackingNumber}</span>
                  </div>
                  {order.trackingUrl && (
                    <a
                      href={order.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Track shipment
                    </a>
                  )}
                </div>
              ) : order.platform === "backmarket" ? (
                <div className="space-y-3">
                  <Input
                    placeholder="Tracking number"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                  />
                  <Input
                    placeholder="Tracking URL (optional)"
                    value={trackingUrl}
                    onChange={(e) => setTrackingUrl(e.target.value)}
                  />
                  <Button
                    className="w-full"
                    size="sm"
                    onClick={() => updateTracking.mutate()}
                    disabled={!trackingNumber || updateTracking.isPending}
                  >
                    {updateTracking.isPending
                      ? "Uploading..."
                      : "Upload Tracking"}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No tracking information available
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
