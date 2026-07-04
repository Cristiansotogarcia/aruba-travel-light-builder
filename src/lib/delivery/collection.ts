import { supabase } from '@/integrations/supabase/client';

/**
 * Storage path (inside the private `delivery-proofs` bucket) for a collection
 * signature image.
 */
export const buildCollectionSignaturePath = (
  bookingId: string,
  taskId: string,
  timestamp: number = Date.now(),
) => `bookings/${bookingId}/tasks/${taskId}/collection-signature-${timestamp}.png`;

/**
 * Display number for a collection receipt, mirroring
 * getDeliverySlipDisplayNumber but with the COL- fallback prefix.
 */
export const getCollectionReceiptDisplayNumber = (
  slipNumber: string | null | undefined,
  fallbackId: string,
) => slipNumber?.trim() || `COL-${fallbackId.slice(0, 8).toUpperCase()}`;

/**
 * Extracts the receipt/slip id from a task-completion RPC payload.
 */
export const extractSlipId = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object') return null;
  const slipId = (payload as { slip_id?: unknown }).slip_id;
  return typeof slipId === 'string' && slipId.length > 0 ? slipId : null;
};

export interface CompleteCollectionTaskArgs {
  taskId: string;
  signedByName: string;
  signaturePath: string;
  conditionNotes?: string;
  notes?: string;
}

interface UntypedRpcClient {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

/**
 * Calls the complete_collection_task RPC. The function is not present in the
 * generated Database types yet (types are regenerated at integration), so the
 * call is funneled through a single narrow cast here.
 */
export const completeCollectionTask = async ({
  taskId,
  signedByName,
  signaturePath,
  conditionNotes,
  notes,
}: CompleteCollectionTaskArgs) => {
  const client = supabase as unknown as UntypedRpcClient;
  const { data, error } = await client.rpc('complete_collection_task', {
    p_task_id: taskId,
    p_signed_by_name: signedByName,
    p_signature_path: signaturePath,
    p_condition_notes: conditionNotes ?? undefined,
    p_notes: notes ?? undefined,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { slipId: extractSlipId(data) };
};
