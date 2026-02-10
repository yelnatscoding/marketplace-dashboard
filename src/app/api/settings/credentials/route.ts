import { NextRequest, NextResponse } from "next/server";
import {
  getMLCredentials,
  getBMCredentials,
} from "@/lib/storage/cookies";
import { encrypt } from "@/lib/utils/crypto";

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

  const cred = {
    accessToken: token,
    tokenExpiresAt: Date.now() + 90 * 24 * 60 * 60 * 1000,
  };

  const response = NextResponse.json({ success: true });
  response.cookies.set("bm_credentials", encrypt(JSON.stringify(cred)), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 90,
    path: "/",
  });

  return response;
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform");

  if (!platform) {
    return NextResponse.json({ error: "platform is required" }, { status: 400 });
  }

  const response = NextResponse.json({ success: true });

  if (platform === "mercadolibre") {
    response.cookies.delete("ml_credentials");
  } else if (platform === "backmarket") {
    response.cookies.delete("bm_credentials");
  }

  return response;
}
