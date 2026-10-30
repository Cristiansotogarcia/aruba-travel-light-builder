import { specialRequestsDb } from './client';
import type { SpecialRequestFormValues, SpecialRequestType } from './specialRequestSchema';

export interface SpecialRequestRecord {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  request_type: SpecialRequestType;
  message: string;
  preferred_dates: string | null;
  status: 'new' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
}

/**
 * Submits a Special Request (PLANS/TLB_ROXANNE_NOTES_AND_POS_PLAN.md, Workstream B):
 * stores the row in public.special_requests (RLS: anyone may insert, staff-only
 * read/update, so the insert returns nothing) and best-effort notifies staff by email.
 *
 * The DB insert is the part that must succeed — once the row is stored, staff
 * can triage it even if the email notification fails, so a notification error
 * is logged, not thrown.
 */
export async function submitSpecialRequest(
  values: SpecialRequestFormValues
): Promise<SpecialRequestRecord> {
  // The id is made here because anon has no SELECT policy on special_requests
  // (staff-only read), so the insert cannot use RETURNING (.select()); Postgres
  // rejects RETURNING without a SELECT policy and the row would never persist.
  const payload = {
    id: crypto.randomUUID(),
    name: values.name.trim(),
    email: values.email.trim(),
    phone: values.phone?.trim() ? values.phone.trim() : null,
    request_type: values.request_type,
    message: values.message.trim(),
    preferred_dates: values.preferred_dates?.trim() ? values.preferred_dates.trim() : null,
  };

  const { error } = await specialRequestsDb.from('special_requests').insert(payload);

  if (error) {
    throw error;
  }

  const now = new Date().toISOString();
  const record: SpecialRequestRecord = { ...payload, status: 'new', created_at: now, updated_at: now };

  try {
    const { error: notifyError } = await specialRequestsDb.functions.invoke('special-request-email', {
      // Only the id: the function re-reads the stored row with the service
      // role and renders the email from that, never from caller input.
      body: { id: record.id },
    });
    if (notifyError) {
      console.warn('special-request-email function returned an error:', notifyError);
    }
  } catch (notifyError) {
    console.warn('Failed to notify staff of special request:', notifyError);
  }

  return record;
}
