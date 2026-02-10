import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { decrypt } from "@/lib/utils/crypto";

const BM_BASE_URL = "https://www.backmarket.com/ws";

export class BackMarketClient {
  private async getToken(): Promise<string> {
    const db = getDb();
    const cred = db
      .select()
      .from(schema.apiCredentials)
      .where(eq(schema.apiCredentials.platform, "backmarket"))
      .get();

    if (!cred || !cred.accessToken) {
      throw new Error("BackMarket not connected");
    }

    return decrypt(cred.accessToken);
  }

  async request<T>(path: string, options?: RequestInit): Promise<T> {
    const token = await this.getToken();

    const res = await fetch(`${BM_BASE_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Basic ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`BM API error ${res.status}: ${err}`);
    }

    return res.json();
  }

  async getListings(params?: { page?: number; limit?: number }) {
    const page = params?.page || 1;
    return this.request<BMListingsResponse>(`/listings?page=${page}`);
  }

  async getListing(listingId: string) {
    return this.request<BMListingDetail>(`/listings/${listingId}`);
  }

  async updateListing(
    listingId: string,
    data: { price?: number; quantity?: number }
  ) {
    return this.request(`/listings/${listingId}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getOrders(params?: { state?: number; page?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.state != null) searchParams.set("state", String(params.state));
    if (params?.page) searchParams.set("page", String(params.page));

    const qs = searchParams.toString();
    return this.request<BMOrder[]>(`/orders${qs ? `?${qs}` : ""}`);
  }

  async getOrder(orderId: string) {
    return this.request<BMOrder>(`/orders/${orderId}`);
  }

  async updateOrderTracking(
    orderId: string,
    tracking: { tracking_number: string; tracking_url?: string; shipper?: string }
  ) {
    return this.request(`/orders/${orderId}`, {
      method: "POST",
      body: JSON.stringify({
        new_state: 3, // Shipped
        ...tracking,
      }),
    });
  }
}

// BM API types
export interface BMListingsResponse {
  count: number;
  results: BMListing[];
}

export interface BMListing {
  id: number;
  title: string;
  sku: string;
  price: number;
  currency: string;
  quantity: number;
  state: number;
  image_url?: string;
  backmarket_id?: string;
}

export interface BMListingDetail extends BMListing {
  description?: string;
  category?: string;
}

export interface BMOrder {
  id: number;
  state: number;
  date_creation: string;
  date_modification: string;
  orderlines: {
    id: number;
    product_id: string;
    listing_id: number;
    label: string;
    sku: string;
    quantity: number;
    price: number;
    currency: string;
  }[];
  shipping_address?: {
    first_name: string;
    last_name: string;
    city: string;
    country: string;
  };
  tracking_number?: string;
  tracking_url?: string;
}

export const bmClient = new BackMarketClient();
