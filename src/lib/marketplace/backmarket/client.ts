import { getBMCredentials } from "@/lib/storage/cookies";

const BM_BASE_URL = "https://www.backmarket.com/ws";

export class BackMarketClient {
  private async getToken(): Promise<string> {
    const cred = await getBMCredentials();
    if (!cred || !cred.accessToken) {
      throw new Error("BackMarket not connected");
    }
    return cred.accessToken;
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
    return this.request<BMOrdersResponse>(`/orders${qs ? `?${qs}` : ""}`);
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

// BM API types (matches actual API response)
export interface BMListingsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: BMListing[];
}

export interface BMListing {
  id: string; // UUID
  listing_id: number;
  title: string;
  sku: string;
  price: string; // string like "340.00"
  currency: string;
  quantity: number;
  state: number;
  grade: string;
  publication_state: number;
  backmarket_id: number;
  product_id: string;
  min_price: number | null;
  max_price: number | null;
  comment?: string;
  warranty_delay?: number;
}

export interface BMListingDetail extends BMListing {
  description?: string;
  category?: string;
}

export interface BMOrdersResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: BMOrder[];
}

export interface BMOrder {
  order_id: number;
  state: number;
  date_creation: string;
  date_modification: string;
  date_shipping: string | null;
  date_payment: string | null;
  price: string; // string like "296.00"
  shipping_price: string;
  currency: string;
  sales_taxes: string;
  payment_method: string;
  orderlines: {
    id: number;
    product_id: number;
    listing_id: number;
    listing: string; // SKU/listing name
    product: string; // product display name
    quantity: number;
    price: string; // string
    shipping_price: string;
    currency: string;
    state: number;
    orderline_fee: string;
    sales_taxes: string;
    brand: string;
    condition: number;
  }[];
  shipping_address?: {
    first_name: string;
    last_name: string;
    city: string;
    state_or_province: string;
    country: string;
  };
  tracking_number?: string;
  tracking_url?: string;
  shipper?: string;
}

export const bmClient = new BackMarketClient();
