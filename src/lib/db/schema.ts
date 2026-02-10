import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const apiCredentials = sqliteTable("api_credentials", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  platform: text("platform").notNull(), // 'mercadolibre' | 'backmarket'
  accessToken: text("access_token"), // encrypted
  refreshToken: text("refresh_token"), // encrypted (ML only)
  tokenExpiresAt: integer("token_expires_at"), // unix timestamp
  userId: text("user_id"), // ML user ID
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});

export const skuCostTable = sqliteTable("sku_cost_table", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  mpn: text("mpn").notNull().unique(),
  cost: real("cost").notNull(),
  size: text("size"), // '42mm', '46mm'
  connectivity: text("connectivity"), // 'GPS', 'Cell'
  description: text("description"),
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});

export const cachedOrders = sqliteTable("cached_orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  platform: text("platform").notNull(),
  externalId: text("external_id").notNull(),
  data: text("data").notNull(), // JSON blob
  fetchedAt: integer("fetched_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});

export const cachedListings = sqliteTable("cached_listings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  platform: text("platform").notNull(),
  externalId: text("external_id").notNull(),
  data: text("data").notNull(), // JSON blob
  fetchedAt: integer("fetched_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});

export const payoutRecords = sqliteTable("payout_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  description: text("description").notNull(),
  sourceType: text("source_type"), // 'payment', 'payout', 'refund', etc.
  itemId: text("item_id"),
  packId: text("pack_id"),
  grossAmount: real("gross_amount"),
  mpFeeAmount: real("mp_fee_amount"),
  shippingFeeAmount: real("shipping_fee_amount"),
  netCreditAmount: real("net_credit_amount"),
  netDebitAmount: real("net_debit_amount"),
  sourceFile: text("source_file"),
  importedAt: integer("imported_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});
