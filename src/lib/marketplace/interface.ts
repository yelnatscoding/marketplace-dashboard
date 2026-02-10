import type {
  UnifiedListing,
  UnifiedOrder,
  PriceUpdate,
  StockUpdate,
  TrackingUpdate,
} from "./types";

export interface MarketplaceProvider {
  readonly platform: "mercadolibre" | "backmarket";

  // Auth
  isAuthenticated(): Promise<boolean>;

  // Listings
  getListings(): Promise<UnifiedListing[]>;
  getListing(id: string): Promise<UnifiedListing | null>;
  updatePrice(update: PriceUpdate): Promise<void>;
  updateStock(update: StockUpdate): Promise<void>;

  // Orders
  getOrders(params?: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<UnifiedOrder[]>;
  getOrder(id: string): Promise<UnifiedOrder | null>;
  updateTracking(update: TrackingUpdate): Promise<void>;
}
