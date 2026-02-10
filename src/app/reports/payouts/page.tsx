"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Upload,
  Download,
  Trash2,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { exportToCsv } from "@/lib/utils/csv-export";
import type { PayoutSummary } from "@/lib/reports/payout-reconciliation";

export default function PayoutsPage() {
  const queryClient = useQueryClient();
  const [stillHeld, setStillHeld] = useState("0");
  const [dragOver, setDragOver] = useState(false);

  const { data: summary, isLoading } = useQuery<PayoutSummary>({
    queryKey: ["payout-summary", stillHeld],
    queryFn: () =>
      fetch(`/api/reports/payouts?stillHeld=${stillHeld}`).then((r) =>
        r.json()
      ),
  });

  const uploadCsv = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/reports/payouts", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["payout-summary"] });
      toast.success(`Imported ${data.imported} records from CSV`);
    },
    onError: (e) => {
      toast.error(e.message);
    },
  });

  const clearRecords = useMutation({
    mutationFn: () =>
      fetch("/api/reports/payouts", { method: "DELETE" }).then((r) =>
        r.json()
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payout-summary"] });
      toast.success("All payout records cleared");
    },
  });

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith(".csv")) {
        uploadCsv.mutate(file);
      } else {
        toast.error("Please drop a CSV file");
      }
    },
    [uploadCsv]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        uploadCsv.mutate(file);
        e.target.value = "";
      }
    },
    [uploadCsv]
  );

  function handleExport() {
    if (!summary) return;
    const data = [
      { Section: "PAYOUTS RECEIVED", Label: "", Amount: "" },
      ...summary.payouts.map((p) => ({
        Section: "",
        Label: p.date,
        Amount: p.amount,
      })),
      {
        Section: "",
        Label: "TOTAL RECEIVED",
        Amount: summary.totalPaidOut,
      },
      { Section: "", Label: "", Amount: "" },
      { Section: "SALES SUMMARY", Label: "", Amount: "" },
      {
        Section: "",
        Label: "Gross Sales",
        Amount: summary.metrics.grossSales,
      },
      {
        Section: "",
        Label: "Mercado Fees",
        Amount: summary.metrics.mpFees,
      },
      {
        Section: "",
        Label: "Net Payments",
        Amount: summary.metrics.netPayments,
      },
      { Section: "", Label: "", Amount: "" },
      { Section: "DISPUTES", Label: "", Amount: "" },
      {
        Section: "",
        Label: "Net Dispute Impact",
        Amount: summary.metrics.disputeNet,
      },
      { Section: "", Label: "", Amount: "" },
      { Section: "STATUS", Label: "", Amount: "" },
      {
        Section: "",
        Label: "Still Held",
        Amount: summary.stillHeld,
      },
      {
        Section: "",
        Label: "Pending Payout",
        Amount: summary.pendingPayout,
      },
      {
        Section: "",
        Label: "Total Coming",
        Amount: summary.stillHeld + summary.pendingPayout,
      },
    ];
    exportToCsv(data, "payout-reconciliation");
  }

  return (
    <div>
      <PageHeader
        title="Payout Reconciliation"
        description="Track payouts, fees, disputes, and pending amounts"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={!summary?.payouts.length}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600"
              onClick={() => clearRecords.mutate()}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear All
            </Button>
          </div>
        }
      />

      {/* CSV Upload */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`mb-6 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
      >
        <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
        <p className="text-sm font-medium">
          {uploadCsv.isPending
            ? "Importing..."
            : "Drop payout CSV file here"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Semicolon-delimited reserve-release CSV from Mercado Libre
        </p>
        <label className="mt-3 inline-block">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileInput}
            className="hidden"
          />
          <Button variant="outline" size="sm" asChild>
            <span>
              <Upload className="mr-2 h-4 w-4" />
              Browse Files
            </span>
          </Button>
        </label>
      </div>

      {/* Still Held Input */}
      <div className="mb-6 flex items-center gap-3">
        <label className="text-sm text-muted-foreground whitespace-nowrap">
          Amount still held by Mercado:
        </label>
        <Input
          type="number"
          step="0.01"
          value={stillHeld}
          onChange={(e) => setStillHeld(e.target.value)}
          className="w-32"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : summary ? (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Payouts Received */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                Payouts Received
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {summary.payouts.length > 0 ? (
                <>
                  {summary.payouts.map((p, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{p.date}</span>
                      <span>{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between text-sm font-medium">
                    <span>Total Received</span>
                    <span className="text-green-600">
                      {formatCurrency(summary.totalPaidOut)}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No payouts imported yet
                </p>
              )}
            </CardContent>
          </Card>

          {/* Sales Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                Sales Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Gross Sales</span>
                <span>{formatCurrency(summary.metrics.grossSales)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Mercado Fees</span>
                <span>{formatCurrency(summary.metrics.mpFees)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping Fees</span>
                <span>{formatCurrency(summary.metrics.shippingFees)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm font-medium">
                <span>Net Payments</span>
                <span className="text-green-600">
                  {formatCurrency(summary.metrics.netPayments)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Refunds</span>
                <span>{formatCurrency(summary.metrics.refunds)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Disputes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Disputes / Mediations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Held for Disputes</span>
                <span className="text-red-600">
                  {formatCurrency(-summary.metrics.disputeHeld)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Released</span>
                <span>{formatCurrency(summary.metrics.disputeReleased)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm font-medium">
                <span>Net Impact</span>
                <span
                  className={
                    summary.metrics.disputeNet >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  {formatCurrency(summary.metrics.disputeNet)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Current Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                Current Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Still Held by Mercado
                </span>
                <span>{formatCurrency(summary.stillHeld)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pending Payout</span>
                <span>{formatCurrency(summary.pendingPayout)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm font-bold">
                <span>Total Coming to You</span>
                <span className="text-green-600">
                  {formatCurrency(summary.stillHeld + summary.pendingPayout)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
