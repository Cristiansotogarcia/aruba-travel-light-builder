import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  countPendingActions,
  deletePendingAction,
  getPendingActions,
} from '@/lib/offline/depotDb';
import { useOnlineStatus } from './useOnlineStatus';

export const DEPOT_PICKUPS_QUERY_KEY = ['depot', 'pickups'];

/**
 * Drains the `pendingActions` queue by replaying each queued RPC against
 * Supabase. Stops on the first failure and leaves the remainder queued for
 * the next sync attempt.
 *
 * Returns:
 *   - `pendingCount` — live count of queued actions (0 when all synced).
 *   - `syncNow()` — manually trigger a drain (e.g. after the user taps "Sync").
 */
export function useDepotSync() {
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();
  const [pendingCount, setPendingCount] = useState(0);
  const syncingRef = useRef(false);

  // Refresh the badge count without draining.
  const refreshCount = useCallback(async () => {
    const n = await countPendingActions();
    setPendingCount(n);
  }, []);

  // Drain the queue and invalidate the pickups query if anything succeeded.
  const syncNow = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;

    try {
      const actions = await getPendingActions();
      if (actions.length === 0) return;

      let anySynced = false;

      for (const action of actions) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error } = await (supabase as any).rpc(action.rpcName, action.args);
          if (error) {
            // Network or server error — stop and try again next time.
            break;
          }
          await deletePendingAction(action.id);
          anySynced = true;
        } catch {
          // Network failure — stop and try again next time.
          break;
        }
      }

      await refreshCount();

      if (anySynced) {
        await queryClient.invalidateQueries({ queryKey: DEPOT_PICKUPS_QUERY_KEY });
      }
    } finally {
      syncingRef.current = false;
    }
  }, [queryClient, refreshCount]);

  // Refresh count on mount.
  useEffect(() => {
    void refreshCount();
  }, [refreshCount]);

  // Drain when the app comes back online.
  const prevOnlineRef = useRef(isOnline);
  useEffect(() => {
    const wasOffline = !prevOnlineRef.current;
    prevOnlineRef.current = isOnline;

    if (isOnline && wasOffline) {
      void syncNow();
    }
  }, [isOnline, syncNow]);

  return { pendingCount, syncNow, refreshCount };
}
