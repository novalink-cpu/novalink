export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'verified'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export type OrderType = 'purchase' | 'renew';

export interface Region {
  id: string;
  name: string;
  /** ISO 3166-1 alpha-2 country code for flag image */
  flagCode: string;
  regionCode?: string;
}

export interface Package {
  id: string;
  label: string;
  months: number;
  price: number;
}

export interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  accountNumber: string;
  accountName: string;
}

export interface Order {
  id: number;
  telegramUserId?: string;
  regionId: string;
  regionName: string;
  packageId: string;
  packageLabel: string;
  amount: number;
  paymentMethodId?: string;
  paymentMethodName?: string;
  status: OrderStatus;
  reference?: string;
  /** Local preview (data URL) */
  screenshot?: string;
  /** API-hosted screenshot URL */
  screenshotUrl?: string;
  orderType?: OrderType;
  accessUrl?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface VpnKey {
  id: string;
  region: string;
  packageLabel: string;
  accessUrl: string;
  expiresAt: string;
  isActive: boolean;
  orderId?: number;
}

export interface PurchaseDraft {
  regionId?: string;
  packageId?: string;
  orderId?: number;
  paymentMethodId?: string;
}
