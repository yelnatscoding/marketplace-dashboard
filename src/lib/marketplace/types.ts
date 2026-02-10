export type Platform = "mercadolibre" | "backmarket";

export interface UnifiedListing {
  id: string;
  platform: Platform;
  externalId: string;
  title: string;
  sku: string;
  mpn: string;
  price: number;
  currency: string;
  stock: number;
  status: string;
  imageUrl?: string;
  url?: string;
  size?: string;
  connectivity?: string;
  color?: string;
  updatedAt?: string;
  minPrice?: number | null;
  maxPrice?: number | null;
  netPayout?: number | null;
}

export interface UnifiedOrder {
  id: string;
  platform: Platform;
  externalId: string;
  orderNumber: string;
  status: string;
  buyerName?: string;
  items: UnifiedOrderItem[];
  totalAmount: number;
  currency: string;
  fees: number;
  shippingCost: number;
  netAmount: number;
  cost: number;
  margin: number;
  trackingNumber?: string;
  trackingUrl?: string;
  orderDate: string;
  shippedDate?: string;
  deliveredDate?: string;
}

export interface UnifiedOrderItem {
  listingId: string;
  title: string;
  sku: string;
  quantity: number;
  unitPrice: number;
}

export interface PriceUpdate {
  listingId: string;
  platform: Platform;
  newPrice: number;
}

export interface StockUpdate {
  listingId: string;
  platform: Platform;
  newStock: number;
}

export interface TrackingUpdate {
  orderId: string;
  platform: Platform;
  trackingNumber: string;
  trackingUrl?: string;
  carrier?: string;
}

export interface DashboardKPIs {
  totalListings: number;
  activeOrders: number;
  totalRevenue: number;
  totalProfit: number;
  revenueByPlatform: Record<Platform, number>;
  ordersByPlatform: Record<Platform, number>;
  recentOrders: UnifiedOrder[];
}
