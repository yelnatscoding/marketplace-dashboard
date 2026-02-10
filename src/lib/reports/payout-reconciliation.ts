/**
 * Payout Reconciliation — ported from reconcile_payouts.py
 *
 * Semicolon-delimited CSV parsing, payment/refund/dispute categorization.
 * Categories: payment, payout, refund, mediation, reserve_for_dispute
 */

import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export interface PayoutMetrics {
  grossSales: number;
  mpFees: number;
  shippingFees: number;
  netPayments: number;
  numPayments: number;
  refunds: number;
  disputeHeld: number;
  disputeReleased: number;
  disputeNet: number;
  totalCredits: number;
  totalDebits: number;
}

export interface PayoutSummary {
  payouts: { date: string; amount: number }[];
  totalPaidOut: number;
  metrics: PayoutMetrics;
  stillHeld: number;
  pendingPayout: number;
}

export interface PayoutCsvRow {
  DATE: string;
  DESCRIPTION: string;
  ITEM_ID: string;
  PACK_ID: string;
  GROSS_AMOUNT: string;
  MP_FEE_AMOUNT: string;
  SHIPPING_FEE_AMOUNT: string;
  NET_CREDIT_AMOUNT: string;
  NET_DEBIT_AMOUNT: string;
  [key: string]: string;
}

/**
 * Parse semicolon-delimited CSV string (Mercado Libre payout format).
 */
export function parsePayoutCsv(csvText: string): PayoutCsvRow[] {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(";").map((h) => h.trim().replace(/"/g, ""));
  const rows: PayoutCsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(";").map((v) => v.trim().replace(/"/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });
    rows.push(row as PayoutCsvRow);
  }

  return rows;
}

function cleanNumeric(value: string | number | undefined): number {
  if (value === undefined || value === null || value === "" || value === "-")
    return 0;
  const num = typeof value === "number" ? value : parseFloat(value);
  return isNaN(num) ? 0 : num;
}

/**
 * Import parsed CSV rows into the payout_records table.
 */
export function importPayoutRecords(
  rows: PayoutCsvRow[],
  sourceFile: string
): number {
  const db = getDb();
  let imported = 0;

  // Filter out initial balance and total rows
  const validRows = rows.filter(
    (r) =>
      r.DATE &&
      r.DATE !== "" &&
      !r.DESCRIPTION?.includes("initial_available_balance") &&
      !r.DESCRIPTION?.includes("total")
  );

  for (const row of validRows) {
    db.insert(schema.payoutRecords)
      .values({
        date: row.DATE,
        description: row.DESCRIPTION,
        sourceType: row.DESCRIPTION,
        itemId: row.ITEM_ID || null,
        packId: row.PACK_ID || null,
        grossAmount: cleanNumeric(row.GROSS_AMOUNT),
        mpFeeAmount: cleanNumeric(row.MP_FEE_AMOUNT),
        shippingFeeAmount: cleanNumeric(row.SHIPPING_FEE_AMOUNT),
        netCreditAmount: cleanNumeric(row.NET_CREDIT_AMOUNT),
        netDebitAmount: cleanNumeric(row.NET_DEBIT_AMOUNT),
        sourceFile,
      })
      .run();
    imported++;
  }

  return imported;
}

/**
 * Calculate reconciliation metrics from stored payout records.
 * Ported from reconcile_payouts.py lines 68-95.
 */
export function calculatePayoutMetrics(): PayoutMetrics {
  const db = getDb();
  const records = db.select().from(schema.payoutRecords).all();

  const payments = records.filter((r) => r.description === "payment");
  const refunds = records.filter((r) => r.description === "refund");
  const disputes = records.filter((r) =>
    ["reserve_for_dispute", "mediation"].includes(r.description)
  );

  return {
    grossSales: payments.reduce((sum, r) => sum + (r.grossAmount || 0), 0),
    mpFees: payments.reduce((sum, r) => sum + (r.mpFeeAmount || 0), 0),
    shippingFees: payments.reduce(
      (sum, r) => sum + (r.shippingFeeAmount || 0),
      0
    ),
    netPayments: payments.reduce(
      (sum, r) => sum + (r.netCreditAmount || 0),
      0
    ),
    numPayments: payments.length,
    refunds: refunds.reduce((sum, r) => sum + (r.netCreditAmount || 0), 0),
    disputeHeld: disputes.reduce(
      (sum, r) => sum + (r.netDebitAmount || 0),
      0
    ),
    disputeReleased: disputes.reduce(
      (sum, r) => sum + (r.netCreditAmount || 0),
      0
    ),
    disputeNet:
      disputes.reduce((sum, r) => sum + (r.netCreditAmount || 0), 0) -
      disputes.reduce((sum, r) => sum + (r.netDebitAmount || 0), 0),
    totalCredits: records.reduce(
      (sum, r) => sum + (r.netCreditAmount || 0),
      0
    ),
    totalDebits: records.reduce(
      (sum, r) => sum + (r.netDebitAmount || 0),
      0
    ),
  };
}

/**
 * Get payout summary for the report page.
 */
export function getPayoutSummary(stillHeld: number = 0): PayoutSummary {
  const db = getDb();

  // Get payouts
  const payoutRows = db
    .select()
    .from(schema.payoutRecords)
    .where(eq(schema.payoutRecords.description, "payout"))
    .all();

  const payouts = payoutRows.map((r) => ({
    date: r.date.slice(0, 10),
    amount: r.netDebitAmount || 0,
  }));

  const totalPaidOut = payouts.reduce((sum, p) => sum + p.amount, 0);

  const metrics = calculatePayoutMetrics();

  // Pending = net payments - payouts - held
  const pendingPayout =
    metrics.netPayments - totalPaidOut - stillHeld + metrics.refunds;

  return {
    payouts,
    totalPaidOut,
    metrics,
    stillHeld,
    pendingPayout: Math.max(0, pendingPayout),
  };
}
