// POS phase 3 (cash close-out) RPC wrappers and queries. Contract:
// PLANS/TLB_POS_PHASE3_CONTRACT.md. Pairs with migration
// 20261029220000_pos_phase3_close_out.sql and the pure helpers in
// src/lib/pos/closeOut.ts.
import { supabase } from '@/integrations/supabase/client';

export interface OpenDrawerResult {
  sessionId: string;
  openedAt: string;
  openingFloat: number;
}

interface OpenDrawerRow {
  session_id: string;
  opened_at: string;
  opening_float: number;
}

/** Opens the (one and only) cash drawer session. Refused DRAWER_ALREADY_OPEN
 * if one is already open, INVALID_FLOAT if the float is missing/negative. */
export async function openDrawer(openingFloat: number, note?: string): Promise<OpenDrawerResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('pos_open_drawer', {
    p_opening_float: openingFloat,
    p_note: note?.trim() || undefined,
  });
  if (error) throw error;
  const row = data as OpenDrawerRow;
  return {
    sessionId: row.session_id,
    openedAt: row.opened_at,
    openingFloat: Number(row.opening_float),
  };
}

/** A pos_cash_sessions row, open or closed. Reporting lists sessions opened
 * that day regardless of whether they've since closed, so status is not
 * narrowed to 'closed' here. */
export interface DrawerSessionRecord {
  id: string;
  status: 'open' | 'closed';
  openedBy: string;
  openedAt: string;
  openingFloat: number;
  openNote: string | null;
  closedBy: string | null;
  closedAt: string | null;
  cashSales: number | null;
  expectedCash: number | null;
  countedCash: number | null;
  variance: number | null;
  closeNote: string | null;
}

interface PosCashSessionRow {
  id: string;
  status: string;
  opened_by: string;
  opened_at: string;
  opening_float: number;
  open_note: string | null;
  closed_by: string | null;
  closed_at: string | null;
  cash_sales: number | null;
  expected_cash: number | null;
  counted_cash: number | null;
  variance: number | null;
  close_note: string | null;
}

const toSessionRecord = (row: PosCashSessionRow): DrawerSessionRecord => ({
  id: row.id,
  status: row.status === 'open' ? 'open' : 'closed',
  openedBy: row.opened_by,
  openedAt: row.opened_at,
  openingFloat: Number(row.opening_float),
  openNote: row.open_note,
  closedBy: row.closed_by,
  closedAt: row.closed_at,
  cashSales: row.cash_sales == null ? null : Number(row.cash_sales),
  expectedCash: row.expected_cash == null ? null : Number(row.expected_cash),
  countedCash: row.counted_cash == null ? null : Number(row.counted_cash),
  variance: row.variance == null ? null : Number(row.variance),
  closeNote: row.close_note,
});

/** Closes the session. Refused DRAWER_NOT_OPEN if it isn't open,
 * VARIANCE_NOTE_REQUIRED if counted cash doesn't match expected and no note
 * was given. Returns the closed row. */
export async function closeDrawer(
  sessionId: string,
  countedCash: number,
  note?: string,
): Promise<DrawerSessionRecord> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('pos_close_drawer', {
    p_session_id: sessionId,
    p_counted_cash: countedCash,
    p_note: note?.trim() || undefined,
  });
  if (error) throw error;
  return toSessionRecord(data as PosCashSessionRow);
}

export interface OpenDrawerSession {
  id: string;
  openedBy: string;
  openedByName: string | null;
  openedAt: string;
  openingFloat: number;
  openNote: string | null;
}

/** The current open session's metadata, or null when the drawer is closed.
 * Read directly off pos_cash_sessions (its SELECT RLS covers every drawer
 * role) plus a small profiles lookup for the opener's display name. */
export async function fetchOpenDrawerSession(): Promise<OpenDrawerSession | null> {
  // pos_cash_sessions is not in the generated Supabase types (same reason the
  // RPC calls above are cast), hence `as any` on the table name only.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('pos_cash_sessions')
    .select('id, opened_by, opened_at, opening_float, open_note')
    .eq('status', 'open')
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as Pick<PosCashSessionRow, 'id' | 'opened_by' | 'opened_at' | 'opening_float' | 'open_note'>;
  let openedByName: string | null = null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', row.opened_by)
    .maybeSingle();
  if (profile) openedByName = (profile as { name: string }).name;

  return {
    id: row.id,
    openedBy: row.opened_by,
    openedByName,
    openedAt: row.opened_at,
    openingFloat: Number(row.opening_float),
    openNote: row.open_note,
  };
}

export interface DrawerCashSoFar {
  sessionId: string;
  cashSales: number;
  expectedCash: number;
}

interface DrawerCashSoFarRow {
  session_id: string;
  cash_sales: number;
  expected_cash: number;
}

/** Live cash sales / expected cash for the open session (or null if none is
 * open), computed server-side with the exact same rule as pos_close_drawer —
 * see the migration header for why this is a SECURITY DEFINER RPC rather than
 * a direct booking_payments read (StoreStaff can't SELECT that table). */
export async function fetchDrawerCashSoFar(): Promise<DrawerCashSoFar | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('pos_drawer_cash_so_far');
  if (error) throw error;
  if (!data) return null;
  const row = data as DrawerCashSoFarRow;
  return {
    sessionId: row.session_id,
    cashSales: Number(row.cash_sales),
    expectedCash: Number(row.expected_cash),
  };
}

export interface EndOfDayByMethod {
  method: string;
  count: number;
  total: number;
}

export interface EndOfDayByStaff {
  staffId: string;
  staffName: string;
  salesCount: number;
  cash: number;
  card: number;
  other: number;
  creditNotesCount: number;
  creditNotesTotal: number;
  extensionsCount: number;
}

export interface EndOfDayReport {
  date: string;
  byMethod: EndOfDayByMethod[];
  byStaff: EndOfDayByStaff[];
  sessions: DrawerSessionRecord[];
  totals: {
    payments: number;
    creditNotes: number;
  };
}

interface EndOfDayReportRow {
  date: string;
  by_method: Array<{ method: string; count: number; total: number }>;
  by_staff: Array<{
    staff_id: string;
    staff_name: string;
    sales_count: number;
    cash: number;
    card: number;
    other: number;
    credit_notes_count: number;
    credit_notes_total: number;
    extensions_count: number;
  }>;
  sessions: PosCashSessionRow[];
  totals: { payments: number; credit_notes: number };
}

/** End-of-day report for the Aruba local day (p_date, 'YYYY-MM-DD'). */
export async function fetchEndOfDayReport(date: string): Promise<EndOfDayReport> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('pos_end_of_day_report', { p_date: date });
  if (error) throw error;
  const row = data as EndOfDayReportRow;
  return {
    date: row.date,
    byMethod: row.by_method.map((m) => ({ method: m.method, count: Number(m.count), total: Number(m.total) })),
    byStaff: row.by_staff.map((s) => ({
      staffId: s.staff_id,
      staffName: s.staff_name,
      salesCount: Number(s.sales_count),
      cash: Number(s.cash),
      card: Number(s.card),
      other: Number(s.other),
      creditNotesCount: Number(s.credit_notes_count),
      creditNotesTotal: Number(s.credit_notes_total),
      extensionsCount: Number(s.extensions_count),
    })),
    sessions: row.sessions.map(toSessionRecord),
    totals: {
      payments: Number(row.totals.payments),
      creditNotes: Number(row.totals.credit_notes),
    },
  };
}
