import { NextRequest, NextResponse } from "next/server";
import { bmClient } from "@/lib/marketplace/backmarket/client";

// Update tracking on a BM order
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { orderId, tracking_number, tracking_url, shipper } = body;

  if (!orderId || !tracking_number) {
    return NextResponse.json(
      { error: "orderId and tracking_number are required" },
      { status: 400 }
    );
  }

  try {
    await bmClient.updateOrderTracking(orderId, {
      tracking_number,
      tracking_url,
      shipper,
    });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
