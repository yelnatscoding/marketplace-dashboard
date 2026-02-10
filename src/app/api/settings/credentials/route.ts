import { NextRequest, NextResponse } from "next/server";
import {
  getMLCredentials,
  getBMCredentials,
  setBMCredentials,
  deleteMLCredentials,
  deleteBMCredentials,
} from "@/lib/storage/cookies";

export async function GET() {
  const mlCred = await getMLCredentials();
  const bmCred = await getBMCredentials();

  const result = [];

  if (mlCred) {
    result.push({
      id: 1,
      platform: "mercadolibre",
      isConnected: true,
      userId: mlCred.userId,
      tokenExpiresAt: mlCred.tokenExpiresAt,
      updatedAt: null,
    });
  }

  if (bmCred) {
    result.push({
      id: 2,
      platform: "backmarket",
      isConnected: true,
      userId: null,
      tokenExpiresAt: bmCred.tokenExpiresAt,
      updatedAt: null,
    });
  }

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { platform, token } = body;

  if (platform !== "backmarket" || !token) {
    return NextResponse.json(
      { error: "Only backmarket token can be set manually" },
      { status: 400 }
    );
  }

  await setBMCredentials({
    accessToken: token,
    tokenExpiresAt: Date.now() + 90 * 24 * 60 * 60 * 1000,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform");

  if (!platform) {
    return NextResponse.json({ error: "platform is required" }, { status: 400 });
  }

  if (platform === "mercadolibre") {
    await deleteMLCredentials();
  } else if (platform === "backmarket") {
    await deleteBMCredentials();
  }

  return NextResponse.json({ success: true });
}
