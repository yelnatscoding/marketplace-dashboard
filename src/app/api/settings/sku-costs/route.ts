import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { ensureDb } from "@/lib/db/migrate";
import { seedSkuCosts } from "@/lib/db/seed";

ensureDb();

export async function GET() {
  const db = getDb();
  const costs = db.select().from(schema.skuCostTable).all();
  return NextResponse.json(costs);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { mpn, cost, size, connectivity, description } = body;

  if (!mpn || cost == null) {
    return NextResponse.json({ error: "mpn and cost are required" }, { status: 400 });
  }

  const db = getDb();
  const existing = db
    .select()
    .from(schema.skuCostTable)
    .where(eq(schema.skuCostTable.mpn, mpn))
    .get();

  if (existing) {
    db.update(schema.skuCostTable)
      .set({ cost, size, connectivity, description, updatedAt: Date.now() })
      .where(eq(schema.skuCostTable.mpn, mpn))
      .run();
  } else {
    db.insert(schema.skuCostTable)
      .values({ mpn, cost, size, connectivity, description })
      .run();
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const db = getDb();
  db.delete(schema.skuCostTable)
    .where(eq(schema.skuCostTable.id, parseInt(id)))
    .run();

  return NextResponse.json({ success: true });
}

// Seed endpoint
export async function PUT() {
  ensureDb();
  const count = await seedSkuCosts();
  return NextResponse.json({ seeded: count });
}
