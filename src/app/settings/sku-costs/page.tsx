"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { toast } from "sonner";
import { Plus, Trash2, Download, Upload } from "lucide-react";

interface SkuCost {
  id: number;
  mpn: string;
  cost: number;
  size: string | null;
  connectivity: string | null;
  description: string | null;
}

export default function SkuCostsPage() {
  const queryClient = useQueryClient();
  const [newSku, setNewSku] = useState({
    mpn: "",
    cost: "",
    size: "",
    connectivity: "",
    description: "",
  });

  const { data: skus = [], isLoading } = useQuery<SkuCost[]>({
    queryKey: ["sku-costs"],
    queryFn: () => fetch("/api/settings/sku-costs").then((r) => r.json()),
  });

  const addSku = useMutation({
    mutationFn: () =>
      fetch("/api/settings/sku-costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newSku,
          cost: parseFloat(newSku.cost),
        }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sku-costs"] });
      setNewSku({ mpn: "", cost: "", size: "", connectivity: "", description: "" });
      toast.success("SKU added");
    },
  });

  const deleteSku = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/settings/sku-costs?id=${id}`, { method: "DELETE" }).then((r) =>
        r.json()
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sku-costs"] });
      toast.success("SKU deleted");
    },
  });

  const seedSkus = useMutation({
    mutationFn: () =>
      fetch("/api/settings/sku-costs", { method: "PUT" }).then((r) => r.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sku-costs"] });
      toast.success(`Seeded ${data.seeded} SKUs from Python data`);
    },
  });

  return (
    <div>
      <PageHeader
        title="SKU Cost Table"
        description="Manage product costs for profit calculation"
        actions={
          <Button variant="outline" size="sm" onClick={() => seedSkus.mutate()}>
            <Upload className="mr-2 h-4 w-4" />
            Seed from Python Data
          </Button>
        }
      />

      {/* Add new SKU */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Add SKU</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[140px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                MPN
              </label>
              <Input
                placeholder="e.g. 4WWA3LW/A"
                value={newSku.mpn}
                onChange={(e) => setNewSku({ ...newSku, mpn: e.target.value })}
              />
            </div>
            <div className="w-24">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Cost ($)
              </label>
              <Input
                type="number"
                placeholder="0.00"
                value={newSku.cost}
                onChange={(e) => setNewSku({ ...newSku, cost: e.target.value })}
              />
            </div>
            <div className="w-24">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Size
              </label>
              <Select
                value={newSku.size}
                onValueChange={(v) => setNewSku({ ...newSku, size: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="42mm">42mm</SelectItem>
                  <SelectItem value="44mm">44mm</SelectItem>
                  <SelectItem value="45mm">45mm</SelectItem>
                  <SelectItem value="46mm">46mm</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-24">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Type
              </label>
              <Select
                value={newSku.connectivity}
                onValueChange={(v) =>
                  setNewSku({ ...newSku, connectivity: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GPS">GPS</SelectItem>
                  <SelectItem value="Cell">Cell</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Description
              </label>
              <Input
                placeholder="Optional description"
                value={newSku.description}
                onChange={(e) =>
                  setNewSku({ ...newSku, description: e.target.value })
                }
              />
            </div>
            <Button
              onClick={() => addSku.mutate()}
              disabled={!newSku.mpn || !newSku.cost || addSku.isPending}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SKU Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>MPN</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Connectivity</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : skus.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No SKUs yet. Add one above or seed from Python data.
                  </TableCell>
                </TableRow>
              ) : (
                skus.map((sku) => (
                  <TableRow key={sku.id}>
                    <TableCell className="font-mono text-sm">
                      {sku.mpn}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${sku.cost.toFixed(2)}
                    </TableCell>
                    <TableCell>{sku.size || "-"}</TableCell>
                    <TableCell>{sku.connectivity || "-"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {sku.description || "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-red-600"
                        onClick={() => deleteSku.mutate(sku.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
