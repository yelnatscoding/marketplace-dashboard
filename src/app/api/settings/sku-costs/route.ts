import { NextRequest, NextResponse } from "next/server";
import { getSkuCosts, setSkuCosts, getDefaultSkuCosts } from "@/lib/storage/cookies";

export async function GET() {
  const costs = await getSkuCosts();
  return NextResponse.json(costs);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { mpn, cost, size, connectivity, description } = body;

  if (!mpn || cost == null) {
    return NextResponse.json({ error: "mpn and cost are required" }, { status: 400 });
  }

  const costs = await getSkuCosts();
  const idx = costs.findIndex((c) => c.mpn === mpn);

  if (idx >= 0) {
    costs[idx] = { ...costs[idx], cost, size, connectivity, description };
  } else {
    const maxId = Math.max(0, ...costs.map((c) => c.id));
    costs.push({
      id: maxId + 1,
      mpn,
      cost,
      size: size || null,
      connectivity: connectivity || null,
      description: description || null,
    });
  }

  await setSkuCosts(costs);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const costs = await getSkuCosts();
  const filtered = costs.filter((c) => c.id !== parseInt(id));
  await setSkuCosts(filtered);

  return NextResponse.json({ success: true });
}

// Seed — reset to defaults
export async function PUT() {
  const defaults = getDefaultSkuCosts();
  await setSkuCosts(defaults);
  return NextResponse.json({ seeded: defaults.length });
}
