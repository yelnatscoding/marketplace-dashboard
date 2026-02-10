"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { PlatformBadge } from "@/components/platform-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { toast } from "sonner";
import { ArrowLeft, Check } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import type { UnifiedListing } from "@/lib/marketplace/types";
import Link from "next/link";

export default function BulkEditPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adjustType, setAdjustType] = useState<"percent" | "absolute">("percent");
  const [adjustValue, setAdjustValue] = useState("");

  const { data: listings = [], isLoading } = useQuery<UnifiedListing[]>({
    queryKey: ["listings"],
    queryFn: () => fetch("/api/unified/listings").then((r) => r.json()),
  });

  const bulkUpdate = useMutation({
    mutationFn: async () => {
      const value = parseFloat(adjustValue);
      if (isNaN(value)) throw new Error("Invalid value");

      const updates = listings
        .filter((l) => selected.has(l.id))
        .map((l) => {
          const newPrice =
            adjustType === "percent"
              ? l.price * (1 + value / 100)
              : l.price + value;

          const endpoint =
            l.platform === "mercadolibre"
              ? "/api/mercadolibre/items"
              : "/api/backmarket/listings";

          const body =
            l.platform === "mercadolibre"
              ? { itemId: l.externalId, price: Math.round(newPrice * 100) / 100 }
              : { listingId: l.externalId, price: Math.round(newPrice * 100) / 100 };

          return fetch(endpoint, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
        });

      const results = await Promise.allSettled(updates);
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      return { succeeded, failed };
    },
    onSuccess: ({ succeeded, failed }) => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      setSelected(new Set());
      setAdjustValue("");
      if (failed === 0) {
        toast.success(`Updated ${succeeded} listings`);
      } else {
        toast.warning(`${succeeded} updated, ${failed} failed`);
      }
    },
    onError: (e) => {
      toast.error(`Bulk update failed: ${e.message}`);
    },
  });

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === listings.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(listings.map((l) => l.id)));
    }
  }

  function previewPrice(listing: UnifiedListing): number {
    const value = parseFloat(adjustValue);
    if (isNaN(value)) return listing.price;
    return adjustType === "percent"
      ? listing.price * (1 + value / 100)
      : listing.price + value;
  }

  return (
    <div>
      <PageHeader
        title="Bulk Price Update"
        description={`${selected.size} of ${listings.length} listings selected`}
        actions={
          <Link href="/listings">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
        }
      />

      {/* Adjustment Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Price Adjustment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Type
              </label>
              <Select
                value={adjustType}
                onValueChange={(v) => setAdjustType(v as "percent" | "absolute")}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percentage (%)</SelectItem>
                  <SelectItem value="absolute">Absolute ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Value
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder={adjustType === "percent" ? "e.g. 10" : "e.g. 50"}
                value={adjustValue}
                onChange={(e) => setAdjustValue(e.target.value)}
                className="w-[140px]"
              />
            </div>
            <Button
              onClick={() => bulkUpdate.mutate()}
              disabled={
                selected.size === 0 ||
                !adjustValue ||
                bulkUpdate.isPending
              }
            >
              {bulkUpdate.isPending
                ? "Updating..."
                : `Update ${selected.size} Listings`}
            </Button>
          </div>
          {adjustValue && (
            <p className="text-xs text-muted-foreground mt-2">
              {adjustType === "percent"
                ? `${parseFloat(adjustValue) > 0 ? "+" : ""}${adjustValue}% on current price`
                : `${parseFloat(adjustValue) > 0 ? "+" : ""}$${adjustValue} on current price`}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Listings Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  checked={selected.size === listings.length && listings.length > 0}
                  onChange={toggleAll}
                  className="rounded"
                />
              </TableHead>
              <TableHead className="w-12"></TableHead>
              <TableHead>Title</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Current Price</TableHead>
              <TableHead className="text-right">New Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              listings.map((listing) => {
                const newPrice = previewPrice(listing);
                const diff = newPrice - listing.price;
                return (
                  <TableRow
                    key={listing.id}
                    className={selected.has(listing.id) ? "bg-muted/50" : ""}
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selected.has(listing.id)}
                        onChange={() => toggleSelect(listing.id)}
                        className="rounded"
                      />
                    </TableCell>
                    <TableCell>
                      <PlatformBadge platform={listing.platform} />
                    </TableCell>
                    <TableCell className="text-sm truncate max-w-[250px]">
                      {listing.title}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {listing.sku || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(listing.price, listing.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {adjustValue && selected.has(listing.id) ? (
                        <span
                          className={
                            diff > 0
                              ? "text-green-600"
                              : diff < 0
                              ? "text-red-600"
                              : ""
                          }
                        >
                          {formatCurrency(newPrice, listing.currency)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
