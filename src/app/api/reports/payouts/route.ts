import { NextRequest, NextResponse } from "next/server";
import {
  parsePayoutCsv,
  calculateSummaryFromRows,
} from "@/lib/reports/payout-reconciliation";

// Get empty summary (no persistent storage)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stillHeld = parseFloat(searchParams.get("stillHeld") || "0");

  return NextResponse.json({
    payouts: [],
    totalPaidOut: 0,
    metrics: {
      grossSales: 0,
      mpFees: 0,
      shippingFees: 0,
      netPayments: 0,
      numPayments: 0,
      refunds: 0,
      disputeHeld: 0,
      disputeReleased: 0,
      disputeNet: 0,
      totalCredits: 0,
      totalDebits: 0,
    },
    stillHeld,
    pendingPayout: 0,
  });
}

// Upload and process payout CSV (stateless — returns results directly)
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const stillHeld = parseFloat(formData.get("stillHeld")?.toString() || "0");

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const text = await file.text();
  const rows = parsePayoutCsv(text);

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "No valid rows found in CSV" },
      { status: 400 }
    );
  }

  const summary = calculateSummaryFromRows(rows, stillHeld);

  return NextResponse.json({
    success: true,
    totalRows: rows.length,
    ...summary,
  });
}

// No-op delete (no persistent storage)
export async function DELETE() {
  return NextResponse.json({ success: true });
}
