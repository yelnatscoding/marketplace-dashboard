"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { PlatformBadge } from "@/components/platform-badge";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Search, Pencil, ExternalLink } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import type { UnifiedListing, Platform } from "@/lib/marketplace/types";
import Link from "next/link";

export default function ListingsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [editingListing, setEditingListing] = useState<UnifiedListing | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editStock, setEditStock] = useState("");

  const { data: listingsData, isLoading } = useQuery<{ listings: UnifiedListing[]; errors: string[] }>({
    queryKey: ["listings"],
    queryFn: () => fetch("/api/unified/listings").then((r) => r.json()),
  });
  const listings = listingsData?.listings || [];
  const apiErrors = listingsData?.errors || [];

  const updatePrice = useMutation({
    mutationFn: async () => {
      if (!editingListing) return;
      const endpoint =
        editingListing.platform === "mercadolibre"
          ? "/api/mercadolibre/items"
          : "/api/backmarket/listings";

      const body =
        editingListing.platform === "mercadolibre"
          ? {
              itemId: editingListing.externalId,
              price: parseFloat(editPrice) || undefined,
              available_quantity: editStock ? parseInt(editStock) : undefined,
            }
          : {
              listingId: editingListing.externalId,
              price: parseFloat(editPrice) || undefined,
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
      setEditingListing(null);
      toast.success("Listing updated");
    },
    onError: (e) => {
      toast.error(`Failed to update: ${e.message}`);
    },
  });

  const filtered = listings.filter((l) => {
    const matchesSearch =
      !search ||
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.sku.toLowerCase().includes(search.toLowerCase()) ||
      l.mpn.toLowerCase().includes(search.toLowerCase());

    const matchesPlatform =
      platformFilter === "all" || l.platform === platformFilter;

    return matchesSearch && matchesPlatform;
  });

  const statusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700";
      case "paused":
        return "bg-yellow-100 text-yellow-700";
      case "closed":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  function openEdit(listing: UnifiedListing) {
    setEditingListing(listing);
    setEditPrice(String(listing.price));
    setEditStock(String(listing.stock));
  }

  return (
    <div>
      <PageHeader
        title="Listings"
        description={`${listings.length} listings across all platforms`}
        actions={
          <Link href="/listings/bulk-edit">
            <Button variant="outline" size="sm">
              Bulk Edit
            </Button>
          </Link>
        }
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
            placeholder="Search by title, SKU, or MPN..."
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
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Title</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Net Payout</TableHead>
              <TableHead className="text-right">Min Price</TableHead>
              <TableHead className="text-right">Max Price</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={10}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="text-center py-12 text-muted-foreground"
                >
                  {listings.length === 0
                    ? "No listings. Connect your marketplace accounts in Settings."
                    : "No listings match your filters."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((listing) => (
                <TableRow key={listing.id}>
                  <TableCell>
                    <PlatformBadge platform={listing.platform} />
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      <p className="text-sm font-medium truncate">
                        {listing.title}
                      </p>
                      <div className="flex gap-1 mt-1">
                        {listing.size && (
                          <Badge variant="outline" className="text-xs">
                            {listing.size}
                          </Badge>
                        )}
                        {listing.connectivity && (
                          <Badge variant="outline" className="text-xs">
                            {listing.connectivity}
                          </Badge>
                        )}
                        {listing.color && listing.color !== "Unknown" && (
                          <Badge variant="outline" className="text-xs">
                            {listing.color}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {listing.sku || listing.mpn || "-"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(listing.price, listing.currency)}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium text-green-600">
                    {listing.netPayout != null
                      ? formatCurrency(listing.netPayout, listing.currency)
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {listing.minPrice != null
                      ? formatCurrency(listing.minPrice, listing.currency)
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {listing.maxPrice != null
                      ? formatCurrency(listing.maxPrice, listing.currency)
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {listing.stock}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={statusColor(listing.status)}
                    >
                      {listing.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(listing)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {listing.url && (
                        <a
                          href={listing.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingListing}
        onOpenChange={() => setEditingListing(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Listing</DialogTitle>
          </DialogHeader>
          {editingListing && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground truncate">
                {editingListing.title}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Price ({editingListing.currency})
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Stock
                  </label>
                  <Input
                    type="number"
                    value={editStock}
                    onChange={(e) => setEditStock(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingListing(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => updatePrice.mutate()}
              disabled={updatePrice.isPending}
            >
              {updatePrice.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
