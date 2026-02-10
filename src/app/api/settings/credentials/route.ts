import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { encrypt } from "@/lib/utils/crypto";
import { ensureDb } from "@/lib/db/migrate";

ensureDb();

export async function GET() {
  const db = getDb();
  const creds = db.select().from(schema.apiCredentials).all();

  // Return without actual tokens, just connection status
  const result = creds.map((c) => ({
    id: c.id,
    platform: c.platform,
    isConnected: !!c.accessToken,
    userId: c.userId,
    tokenExpiresAt: c.tokenExpiresAt,
    updatedAt: c.updatedAt,
  }));

  return NextResponse.json(result);
}

// Save BackMarket token
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { platform, token } = body;

  if (platform !== "backmarket" || !token) {
    return NextResponse.json(
      { error: "Only backmarket token can be set manually" },
      { status: 400 }
    );
  }

  const db = getDb();
  const existing = db
    .select()
    .from(schema.apiCredentials)
    .where(eq(schema.apiCredentials.platform, "backmarket"))
    .get();

  const values = {
    platform: "backmarket" as const,
    accessToken: encrypt(token),
    tokenExpiresAt: Date.now() + 90 * 24 * 60 * 60 * 1000, // 90 days
    updatedAt: Date.now(),
  };

  if (existing) {
    db.update(schema.apiCredentials)
      .set(values)
      .where(eq(schema.apiCredentials.platform, "backmarket"))
      .run();
  } else {
    db.insert(schema.apiCredentials).values(values).run();
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform");

  if (!platform) {
    return NextResponse.json({ error: "platform is required" }, { status: 400 });
  }

  const db = getDb();
  db.delete(schema.apiCredentials)
    .where(eq(schema.apiCredentials.platform, platform))
    .run();

  return NextResponse.json({ success: true });
}
