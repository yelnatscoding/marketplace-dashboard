import { NextRequest, NextResponse } from "next/server";
import { mlClient } from "@/lib/marketplace/mercadolibre/client";

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { itemId, price, available_quantity } = body;

  if (!itemId) {
    return NextResponse.json({ error: "itemId is required" }, { status: 400 });
  }

  const update: Record<string, number> = {};
  if (price != null) update.price = price;
  if (available_quantity != null) update.available_quantity = available_quantity;

  try {
    await mlClient.updateItem(itemId, update);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
