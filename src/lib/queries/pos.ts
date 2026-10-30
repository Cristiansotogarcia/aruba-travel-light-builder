// POS phase 1 (counter rental) queries. Contract: PLANS/TLB_POS_PHASE1_CONTRACT.md
// (Buzz Nest, goal tlb-pos). Pairs with supabase/migrations/20261029203000_pos_phase1_counter_sale.sql
// and src/lib/pos/posPayments.ts (pure payment validation shared with the Pay screen).
import { supabase } from '@/integrations/supabase/client';
import type { PosPaymentLine } from '@/lib/pos/posPayments';

/** Outbound leg choices offered at the counter. Both pickup variants persist
 * as fulfillment_method = 'pickup' — the RPC has no "later" concept, the
 * difference is purely how the counter frames it to the customer. */
export type PosLeg = 'pickup_now' | 'pickup_later' | 'delivery';

/** Return leg choices offered at the counter. Phase 1's schema has no
 * dedicated return-leg column (contract: "RLS unchanged otherwise. No data
 * changes"), so this is folded into customer_comment as a note for staff —
 * it never changes a field pos_create_sale validates. */
export type PosReturnLeg = 'store_return' | 'collection';

export interface PosCustomerFields {
  name: string;
  email: string;
  phone: string;
  address: string;
  roomNumber: string;
}

export interface PosCustomerMatch {
  name: string;
  email: string;
  phone: string;
  address: string;
  roomNumber: string;
}

interface PosCustomerSearchRow {
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  room_number: string | null;
}

/**
 * Search past bookings for an existing customer by name/email/phone (there is
 * no separate customers table — same source CustomersList/searchCustomers
 * use). Deduped client-side since the same person can have many bookings.
 * Requires at least 2 characters to avoid scanning the whole table on every
 * keystroke.
 */
export async function searchPosCustomers(term: string): Promise<PosCustomerMatch[]> {
  const q = term.trim();
  if (q.length < 2) return [];
  const like = `%${q.replace(/[,%]/g, '')}%`;
  const { data, error } = await supabase
    .from('bookings')
    .select('customer_name, customer_email, customer_phone, customer_address, room_number')
    .or(`customer_name.ilike.${like},customer_email.ilike.${like},customer_phone.ilike.${like}`)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;

  const rows = (data ?? []) as PosCustomerSearchRow[];
  const seen = new Set<string>();
  const matches: PosCustomerMatch[] = [];
  for (const row of rows) {
    const name = (row.customer_name ?? '').trim();
    if (!name) continue;
    const email = (row.customer_email ?? '').trim().toLowerCase();
    const phone = (row.customer_phone ?? '').trim();
    const key = email || phone || name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    matches.push({
      name,
      email,
      phone,
      address: (row.customer_address ?? '').trim(),
      roomNumber: (row.room_number ?? '').trim(),
    });
    if (matches.length >= 8) break;
  }
  return matches;
}

export interface PosSaleItemInput {
  equipmentId: string;
  equipmentName: string;
  quantity: number;
}

export interface CreatePosSaleInput {
  startDate: string;
  endDate: string;
  leg: PosLeg;
  returnLeg: PosReturnLeg;
  customer: PosCustomerFields;
  items: PosSaleItemInput[];
  /** Empty array = "Pay later" (0 payments, status lands on pending). */
  payments: PosPaymentLine[];
}

export interface PosSaleResult {
  bookingId: string;
  pickupCode: string | null;
  paymentStatus: string;
  /** Server-derived, authoritative total from price_booking via pos_create_sale. */
  total: number;
  paid: number;
  changeDue: number;
}

const legToFulfillment = (leg: PosLeg): 'pickup' | 'delivery' => (leg === 'delivery' ? 'delivery' : 'pickup');

/** Folds the "pickup later" / "collection" leg choices into a note, since
 * neither has a dedicated column yet (see PosReturnLeg above). Returns
 * undefined when there is nothing to note (both defaults chosen). */
function buildLegNote(leg: PosLeg, returnLeg: PosReturnLeg): string | undefined {
  const notes: string[] = [];
  if (leg === 'pickup_later') notes.push('Store pickup: later, not at counter time');
  if (returnLeg === 'collection') notes.push('Return: collection requested, not store return');
  return notes.length ? notes.join(' | ') : undefined;
}

/**
 * Builds the pos_create_sale RPC args. PRICING IS SERVER-DERIVED: no price,
 * subtotal or total field is ever included here, by construction — the RPC
 * rejects the call outright if one is present. The authoritative total only
 * exists in the RPC's response (see PosSaleResult), never in this input.
 */
export function buildPosSaleArgs(input: CreatePosSaleInput) {
  const fulfillment = legToFulfillment(input.leg);
  return {
    p_booking: {
      start_date: input.startDate,
      end_date: input.endDate,
      fulfillment_method: fulfillment,
      customer_name: input.customer.name.trim(),
      customer_email: input.customer.email.trim().toLowerCase(),
      customer_phone: input.customer.phone.trim(),
      customer_address: fulfillment === 'delivery' ? input.customer.address.trim() : '',
      room_number: input.customer.roomNumber.trim(),
      customer_comment: buildLegNote(input.leg, input.returnLeg) ?? null,
    },
    p_items: input.items.map((i) => ({
      equipment_id: i.equipmentId,
      equipment_name: i.equipmentName,
      quantity: i.quantity,
    })),
    p_payments: input.payments.map((p) => ({
      method: p.method,
      amount: p.amount,
      reference: p.reference?.trim() || undefined,
      tendered: p.tendered ?? undefined,
    })),
  };
}

interface PosCreateSaleRow {
  booking_id: string;
  pickup_code: string | null;
  payment_status: string;
  total: number;
  paid: number;
  change_due: number;
}

export async function createPosSale(input: CreatePosSaleInput): Promise<PosSaleResult> {
  const args = buildPosSaleArgs(input);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('pos_create_sale', args);
  if (error) throw error;
  const row = data as PosCreateSaleRow;
  return {
    bookingId: row.booking_id,
    pickupCode: row.pickup_code ?? null,
    paymentStatus: row.payment_status,
    total: Number(row.total),
    paid: Number(row.paid),
    changeDue: Number(row.change_due),
  };
}
