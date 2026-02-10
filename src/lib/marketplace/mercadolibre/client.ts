import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { decrypt, encrypt } from "@/lib/utils/crypto";
import { mlRateLimiter } from "@/lib/utils/rate-limiter";

const ML_BASE_URL = "https://api.mercadolibre.com";

export class MercadoLibreClient {
  private async getCredentials() {
    const db = getDb();
    const cred = db
      .select()
      .from(schema.apiCredentials)
      .where(eq(schema.apiCredentials.platform, "mercadolibre"))
      .get();

    if (!cred || !cred.accessToken) {
      throw new Error("Mercado Libre not connected");
    }

    return {
      accessToken: decrypt(cred.accessToken),
      refreshToken: cred.refreshToken ? decrypt(cred.refreshToken) : null,
      expiresAt: cred.tokenExpiresAt,
      userId: cred.userId,
    };
  }

  private async refreshTokenIfNeeded() {
    const cred = await this.getCredentials();

    // Refresh if token expires within 10 minutes
    if (cred.expiresAt && cred.expiresAt - Date.now() < 10 * 60 * 1000) {
      if (!cred.refreshToken) throw new Error("No refresh token available");

      const res = await fetch(`${ML_BASE_URL}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: process.env.ML_CLIENT_ID!,
          client_secret: process.env.ML_CLIENT_SECRET!,
          refresh_token: cred.refreshToken,
        }),
      });

      if (!res.ok) {
        throw new Error(`Token refresh failed: ${res.status}`);
      }

      const data = await res.json();
      const db = getDb();
      db.update(schema.apiCredentials)
        .set({
          accessToken: encrypt(data.access_token),
          refreshToken: encrypt(data.refresh_token),
          tokenExpiresAt: Date.now() + data.expires_in * 1000,
          updatedAt: Date.now(),
        })
        .where(eq(schema.apiCredentials.platform, "mercadolibre"))
        .run();

      return data.access_token;
    }

    return cred.accessToken;
  }

  async request<T>(path: string, options?: RequestInit): Promise<T> {
    await mlRateLimiter.waitForSlot();
    const token = await this.refreshTokenIfNeeded();

    const res = await fetch(`${ML_BASE_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`ML API error ${res.status}: ${err}`);
    }

    return res.json();
  }

  async getUserId(): Promise<string> {
    const cred = await this.getCredentials();
    if (cred.userId) return cred.userId;
    const me = await this.request<{ id: number }>("/users/me");
    return String(me.id);
  }

  async getItems(): Promise<string[]> {
    const userId = await this.getUserId();
    const result = await this.request<{ results: string[] }>(
      `/users/${userId}/items/search?limit=100`
    );
    return result.results;
  }

  async getItem(itemId: string) {
    return this.request<MLItem>(`/items/${itemId}`);
  }

  async getItemsBatch(itemIds: string[]) {
    // ML supports multiget up to 20 items
    const batches: string[][] = [];
    for (let i = 0; i < itemIds.length; i += 20) {
      batches.push(itemIds.slice(i, i + 20));
    }

    const results: MLItem[] = [];
    for (const batch of batches) {
      const items = await this.request<{ code: number; body: MLItem }[]>(
        `/items?ids=${batch.join(",")}`
      );
      results.push(...items.filter((i) => i.code === 200).map((i) => i.body));
    }
    return results;
  }

  async updateItem(
    itemId: string,
    data: { price?: number; available_quantity?: number }
  ) {
    return this.request(`/items/${itemId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async searchOrders(params?: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }) {
    const userId = await this.getUserId();
    const searchParams = new URLSearchParams({
      seller: userId,
      sort: "date_desc",
      limit: String(params?.limit || 50),
      offset: String(params?.offset || 0),
    });

    if (params?.status) searchParams.set("order.status", params.status);
    if (params?.dateFrom)
      searchParams.set("order.date_created.from", params.dateFrom);
    if (params?.dateTo)
      searchParams.set("order.date_created.to", params.dateTo);

    return this.request<{ results: MLOrder[]; paging: { total: number } }>(
      `/orders/search?${searchParams}`
    );
  }

  async getOrder(orderId: string) {
    return this.request<MLOrder>(`/orders/${orderId}`);
  }
}

// ML API types
export interface MLItem {
  id: string;
  title: string;
  price: number;
  currency_id: string;
  available_quantity: number;
  sold_quantity: number;
  status: string;
  permalink: string;
  thumbnail: string;
  seller_custom_field: string | null;
  attributes: { id: string; name: string; value_name: string }[];
  variations: {
    id: number;
    attribute_combinations: { name: string; value_name: string }[];
    seller_custom_field: string | null;
  }[];
  date_created: string;
  last_updated: string;
}

export interface MLOrder {
  id: number;
  status: string;
  status_detail: { description: string } | null;
  date_created: string;
  date_closed: string;
  order_items: {
    item: { id: string; title: string; seller_custom_field: string | null };
    quantity: number;
    unit_price: number;
    currency_id: string;
  }[];
  total_amount: number;
  currency_id: string;
  buyer: { id: number; nickname: string; first_name: string; last_name: string };
  payments: {
    id: number;
    status: string;
    total_paid_amount: number;
    marketplace_fee: number;
    shipping_cost: number;
  }[];
  shipping: {
    id: number;
    status: string;
    tracking_number: string | null;
  } | null;
  pack_id: number | null;
}

export const mlClient = new MercadoLibreClient();
