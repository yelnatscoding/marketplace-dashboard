/**
 * Payout Reconciliation — ported from reconcile_payouts.py
 *
 * Semicolon-delimited CSV parsing, payment/refund/dispute categorization.
 * Categories: payment, payout, refund, mediation, reserve_for_dispute
 *
 * Fully stateless — processes CSV rows in-memory and returns results.
 */

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
 * Calculate reconciliation summary from raw CSV rows (stateless).
 */
export function calculateSummaryFromRows(
  rows: PayoutCsvRow[],
  stillHeld: number = 0
): PayoutSummary {
  const validRows = rows.filter(
    (r) =>
      r.DATE &&
      r.DATE !== "" &&
      !r.DESCRIPTION?.includes("initial_available_balance") &&
      !r.DESCRIPTION?.includes("total")
  );

  const payments = validRows.filter((r) => r.DESCRIPTION === "payment");
  const refunds = validRows.filter((r) => r.DESCRIPTION === "refund");
  const disputes = validRows.filter((r) =>
    ["reserve_for_dispute", "mediation"].includes(r.DESCRIPTION)
  );
  const payoutRows = validRows.filter((r) => r.DESCRIPTION === "payout");

  const metrics: PayoutMetrics = {
    grossSales: payments.reduce((sum, r) => sum + cleanNumeric(r.GROSS_AMOUNT), 0),
    mpFees: payments.reduce((sum, r) => sum + cleanNumeric(r.MP_FEE_AMOUNT), 0),
    shippingFees: payments.reduce(
      (sum, r) => sum + cleanNumeric(r.SHIPPING_FEE_AMOUNT),
      0
    ),
    netPayments: payments.reduce(
      (sum, r) => sum + cleanNumeric(r.NET_CREDIT_AMOUNT),
      0
    ),
    numPayments: payments.length,
    refunds: refunds.reduce((sum, r) => sum + cleanNumeric(r.NET_CREDIT_AMOUNT), 0),
    disputeHeld: disputes.reduce(
      (sum, r) => sum + cleanNumeric(r.NET_DEBIT_AMOUNT),
      0
    ),
    disputeReleased: disputes.reduce(
      (sum, r) => sum + cleanNumeric(r.NET_CREDIT_AMOUNT),
      0
    ),
    disputeNet:
      disputes.reduce((sum, r) => sum + cleanNumeric(r.NET_CREDIT_AMOUNT), 0) -
      disputes.reduce((sum, r) => sum + cleanNumeric(r.NET_DEBIT_AMOUNT), 0),
    totalCredits: validRows.reduce(
      (sum, r) => sum + cleanNumeric(r.NET_CREDIT_AMOUNT),
      0
    ),
    totalDebits: validRows.reduce(
      (sum, r) => sum + cleanNumeric(r.NET_DEBIT_AMOUNT),
      0
    ),
  };

  const payouts = payoutRows.map((r) => ({
    date: r.DATE.slice(0, 10),
    amount: cleanNumeric(r.NET_DEBIT_AMOUNT),
  }));

  const totalPaidOut = payouts.reduce((sum, p) => sum + p.amount, 0);
  const pendingPayout = Math.max(
    0,
    metrics.netPayments - totalPaidOut - stillHeld + metrics.refunds
  );

  return {
    payouts,
    totalPaidOut,
    metrics,
    stillHeld,
    pendingPayout,
  };
}
