import { NextRequest, NextResponse } from "next/server";
import { bmClient } from "@/lib/marketplace/backmarket/client";

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { listingId, price, quantity } = body;

  if (!listingId) {
    return NextResponse.json({ error: "listingId is required" }, { status: 400 });
  }

  const update: Record<string, number> = {};
  if (price != null) update.price = price;
  if (quantity != null) update.quantity = quantity;

  try {
    await bmClient.updateListing(listingId, update);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
