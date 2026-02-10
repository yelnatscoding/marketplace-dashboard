import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "marketplace.db");

export function ensureDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS api_credentials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      access_token TEXT,
      refresh_token TEXT,
      token_expires_at INTEGER,
      user_id TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS sku_cost_table (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mpn TEXT NOT NULL UNIQUE,
      cost REAL NOT NULL,
      size TEXT,
      connectivity TEXT,
      description TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS cached_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      external_id TEXT NOT NULL,
      data TEXT NOT NULL,
      fetched_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS cached_listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      external_id TEXT NOT NULL,
      data TEXT NOT NULL,
      fetched_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS payout_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      source_type TEXT,
      item_id TEXT,
      pack_id TEXT,
      gross_amount REAL,
      mp_fee_amount REAL,
      shipping_fee_amount REAL,
      net_credit_amount REAL,
      net_debit_amount REAL,
      source_file TEXT,
      imported_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE INDEX IF NOT EXISTS idx_cached_orders_platform ON cached_orders(platform, external_id);
    CREATE INDEX IF NOT EXISTS idx_cached_listings_platform ON cached_listings(platform, external_id);
    CREATE INDEX IF NOT EXISTS idx_payout_records_date ON payout_records(date);
    CREATE INDEX IF NOT EXISTS idx_payout_records_description ON payout_records(description);
  `);

  sqlite.close();
}
