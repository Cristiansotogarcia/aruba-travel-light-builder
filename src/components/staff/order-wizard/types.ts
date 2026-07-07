import type { UserRole } from '@/types/types';

/** A live-catalog product normalized for the wizard (no mock data anywhere). */
export interface CatalogItem {
  id: string;
  name: string;
  description: string;
  category: string;
  categorySortOrder: number;
  subCategory: string;
  price_per_day: number;
  price_per_week: number | null;
  image: string | null;
  stock_quantity: number;
}

/** A category bucket of catalog items, ordered for display. */
export interface CatalogGroup {
  category: string;
  categorySortOrder: number;
  items: CatalogItem[];
}

/** A selected line in the wizard cart: catalog snapshot + chosen quantity. */
export interface WizardCartLine {
  item: CatalogItem;
  quantity: number;
}

export type WizardFulfillment = 'delivery' | 'pickup';
export type WizardInitialStatus = 'confirmed' | 'pending';

export interface OrderWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fired after a booking is successfully created. */
  onCreated?: (result: { bookingId: string; pickupCode: string | null }) => void;
  /** Pre-seed the fulfillment method (depot walk-in => 'pickup'). */
  defaultFulfillment?: WizardFulfillment;
  /** Hide the fulfillment toggle and lock to defaultFulfillment (depot walk-in). */
  lockFulfillment?: boolean;
  /** Pre-seed the rental range (ISO yyyy-MM-dd), e.g. today for a walk-in. */
  defaultStartDate?: string;
  defaultEndDate?: string;
  /** Caller's role — gates the discount field (StoreStaff cannot discount). */
  role?: UserRole | null;
}

export const CAN_DISCOUNT_ROLES: UserRole[] = ['Admin', 'SuperUser', 'Booker'];

export const WIZARD_STEPS = ['dates', 'catalog', 'fulfillment', 'customer', 'review'] as const;
export type WizardStepId = (typeof WIZARD_STEPS)[number];
