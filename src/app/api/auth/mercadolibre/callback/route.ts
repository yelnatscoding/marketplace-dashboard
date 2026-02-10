import { NextRequest, NextResponse } from "next/server";
import { encrypt } from "@/lib/utils/crypto";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL("/settings/credentials?error=no_code", req.url)
    );
  }

  const clientId = process.env.ML_CLIENT_ID;
  const clientSecret = process.env.ML_CLIENT_SECRET;
  const redirectUri = process.env.ML_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(
      new URL("/settings/credentials?error=missing_env", req.url)
    );
  }

  // Exchange code for token
  const tokenRes = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error("ML token exchange failed:", err);
    return NextResponse.redirect(
      new URL("/settings/credentials?error=token_exchange_failed", req.url)
    );
  }

  const tokenData = await tokenRes.json();
  const { access_token, refresh_token, expires_in, user_id } = tokenData;

  const credentials = {
    accessToken: access_token,
    refreshToken: refresh_token,
    tokenExpiresAt: Date.now() + expires_in * 1000,
    userId: String(user_id),
  };

  const response = NextResponse.redirect(
    new URL("/settings/credentials?success=ml_connected", req.url)
  );

  response.cookies.set("ml_credentials", encrypt(JSON.stringify(credentials)), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 180,
    path: "/",
  });

  return response;
}
