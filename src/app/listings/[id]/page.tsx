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
import { toast } from "sonner";
import { ArrowLeft, Package, Save } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import type { UnifiedListing } from "@/lib/marketplace/types";
import Link from "next/link";

export default function ListingDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const listingId = params.id as string;

  const [editPrice, setEditPrice] = useState<string | null>(null);
  const [editStock, setEditStock] = useState<string | null>(null);

  const { data: listings = [] } = useQuery<UnifiedListing[]>({
    queryKey: ["listings"],
    queryFn: () => fetch("/api/unified/listings").then((r) => r.json()),
  });

  const listing = listings.find((l) => l.id === listingId);

  const updateListing = useMutation({
    mutationFn: async () => {
      if (!listing) return;
      const endpoint =
        listing.platform === "mercadolibre"
          ? "/api/mercadolibre/items"
          : "/api/backmarket/listings";

      const body =
        listing.platform === "mercadolibre"
          ? {
              itemId: listing.externalId,
              price: editPrice ? parseFloat(editPrice) : undefined,
              available_quantity: editStock ? parseInt(editStock) : undefined,
            }
          : {
              listingId: listing.externalId,
              price: editPrice ? parseFloat(editPrice) : undefined,
              quantity: editStock ? parseInt(editStock) : undefined,
            };

      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      setEditPrice(null);
      setEditStock(null);
      toast.success("Listing updated");
    },
    onError: (e) => {
      toast.error(`Failed: ${e.message}`);
    },
  });

  if (!listing) {
    return (
      <div>
        <PageHeader title="Listing Detail" />
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Package className="h-12 w-12 mb-4 opacity-50" />
          <p>Listing not found</p>
          <Link href="/listings" className="mt-4">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Listings
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isEditing = editPrice !== null || editStock !== null;

  return (
    <div>
      <PageHeader
        title={listing.title}
        actions={
          <Link href="/listings">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Listing Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Platform</span>
              <PlatformBadge platform={listing.platform} />
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <Badge variant="secondary">{listing.status}</Badge>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">SKU</span>
              <span className="font-mono">{listing.sku || "-"}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">MPN</span>
              <span className="font-mono">{listing.mpn || "-"}</span>
            </div>
            <Separator />
            {listing.size && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Size</span>
                  <span>{listing.size}</span>
                </div>
                <Separator />
              </>
            )}
            {listing.connectivity && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Connectivity</span>
                  <span>{listing.connectivity}</span>
                </div>
                <Separator />
              </>
            )}
            {listing.color && listing.color !== "Unknown" && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Color</span>
                <span>{listing.color}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Price & Stock Editor */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Price & Stock</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Price ({listing.currency})
              </label>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">
                  {formatCurrency(listing.price, listing.currency)}
                </span>
              </div>
              {editPrice !== null ? (
                <Input
                  type="number"
                  step="0.01"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="mt-2"
                  placeholder="New price"
                />
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setEditPrice(String(listing.price))}
                >
                  Edit Price
                </Button>
              )}
            </div>
            <Separator />
            <div>
              <label className="text-sm font-medium mb-1 block">Stock</label>
              <span className="text-2xl font-bold">{listing.stock}</span>
              {editStock !== null ? (
                <Input
                  type="number"
                  value={editStock}
                  onChange={(e) => setEditStock(e.target.value)}
                  className="mt-2"
                  placeholder="New stock"
                />
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setEditStock(String(listing.stock))}
                >
                  Edit Stock
                </Button>
              )}
            </div>
            {isEditing && (
              <>
                <Separator />
                <div className="flex gap-2">
                  <Button
                    onClick={() => updateListing.mutate()}
                    disabled={updateListing.isPending}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {updateListing.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditPrice(null);
                      setEditStock(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
