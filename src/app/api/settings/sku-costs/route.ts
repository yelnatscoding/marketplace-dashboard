import { NextRequest, NextResponse } from "next/server";
import { getSkuCosts, getDefaultSkuCosts } from "@/lib/storage/cookies";
import { encrypt } from "@/lib/utils/crypto";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 365,
  path: "/",
};

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

  const response = NextResponse.json({ success: true });
  response.cookies.set("sku_costs", encrypt(JSON.stringify(costs)), COOKIE_OPTS);
  return response;
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const costs = await getSkuCosts();
  const filtered = costs.filter((c) => c.id !== parseInt(id));

  const response = NextResponse.json({ success: true });
  response.cookies.set("sku_costs", encrypt(JSON.stringify(filtered)), COOKIE_OPTS);
  return response;
}

// Seed — reset to defaults
export async function PUT() {
  const defaults = getDefaultSkuCosts();

  const response = NextResponse.json({ seeded: defaults.length });
  response.cookies.set("sku_costs", encrypt(JSON.stringify(defaults)), COOKIE_OPTS);
  return response;
}
