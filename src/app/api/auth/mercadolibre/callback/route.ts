import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { encrypt } from "@/lib/utils/crypto";
import { ensureDb } from "@/lib/db/migrate";

ensureDb();

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

  const db = getDb();
  const existing = db
    .select()
    .from(schema.apiCredentials)
    .where(eq(schema.apiCredentials.platform, "mercadolibre"))
    .get();

  const values = {
    platform: "mercadolibre" as const,
    accessToken: encrypt(access_token),
    refreshToken: encrypt(refresh_token),
    tokenExpiresAt: Date.now() + expires_in * 1000,
    userId: String(user_id),
    updatedAt: Date.now(),
  };

  if (existing) {
    db.update(schema.apiCredentials)
      .set(values)
      .where(eq(schema.apiCredentials.platform, "mercadolibre"))
      .run();
  } else {
    db.insert(schema.apiCredentials).values(values).run();
  }

  return NextResponse.redirect(
    new URL("/settings/credentials?success=ml_connected", req.url)
  );
}
