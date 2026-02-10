import { NextRequest, NextResponse } from "next/server";
import { ensureDb } from "@/lib/db/migrate";
import {
  parsePayoutCsv,
  importPayoutRecords,
  getPayoutSummary,
} from "@/lib/reports/payout-reconciliation";
import { getDb, schema } from "@/lib/db";

ensureDb();

// Get payout reconciliation summary
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stillHeld = parseFloat(searchParams.get("stillHeld") || "0");

  const summary = getPayoutSummary(stillHeld);
  return NextResponse.json(summary);
}

// Upload and import payout CSV
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

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

  const imported = importPayoutRecords(rows, file.name);

  return NextResponse.json({
    success: true,
    imported,
    totalRows: rows.length,
  });
}

// Clear all payout records
export async function DELETE() {
  const db = getDb();
  db.delete(schema.payoutRecords).run();
  return NextResponse.json({ success: true });
}
