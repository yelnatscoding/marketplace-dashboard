import { getMLCredentials, setMLCredentials } from "@/lib/storage/cookies";
import { mlRateLimiter } from "@/lib/utils/rate-limiter";

const ML_BASE_URL = "https://api.mercadolibre.com";

export class MercadoLibreClient {
  private async getCredentials() {
    const cred = await getMLCredentials();
    if (!cred || !cred.accessToken) {
      throw new Error("Mercado Libre not connected");
    }
    return cred;
  }

  private async refreshTokenIfNeeded() {
    const cred = await this.getCredentials();

    // Refresh if token expires within 10 minutes
    if (cred.tokenExpiresAt && cred.tokenExpiresAt - Date.now() < 10 * 60 * 1000) {
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

      await setMLCredentials({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenExpiresAt: Date.now() + data.expires_in * 1000,
        userId: cred.userId,
      });

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

  async getItems(status: string = "active"): Promise<string[]> {
    const userId = await this.getUserId();
    const result = await this.request<{ results: string[] }>(
      `/users/${userId}/items/search?status=${status}&limit=100`
    );
    return result.results;
  }

  async getItem(itemId: string) {
    return this.request<MLItem>(`/items/${itemId}`);
  }

  async getItemsBatch(itemIds: string[]) {
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

  async searchAllOrders(params?: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{ results: MLOrder[]; total: number }> {
    const all: MLOrder[] = [];
    let offset = 0;
    const limit = 50;

    while (true) {
      const res = await this.searchOrders({
        ...params,
        limit,
        offset,
      });
      all.push(...res.results);

      if (all.length >= res.paging.total || res.results.length < limit) {
        return { results: all, total: res.paging.total };
      }
      offset += limit;
    }
  }

  async getOrder(orderId: string) {
    return this.request<MLOrder>(`/orders/${orderId}`);
  }

  async getListingFees(
    price: number,
    categoryId: string,
    listingTypeId: string
  ): Promise<MLListingFee> {
    return this.request<MLListingFee>(
      `/sites/MLM/listing_prices?price=${price}&category_id=${categoryId}&listing_type_id=${listingTypeId}`
    );
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
  category_id: string;
  listing_type_id: string;
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

export interface MLListingFee {
  listing_type_id: string;
  listing_type_name: string;
  sale_fee_amount: number;
  currency_id: string;
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
