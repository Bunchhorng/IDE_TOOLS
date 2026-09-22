import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { flushQueue, listConflicts, resolveConflict as resolveOnServer, pendingOpCount, type FlushSummary } from '../lib/offline/sync';
import type { ConflictRecord } from '../lib/offline/db';

export type SyncState = 'online' | 'offline' | 'syncing' | 'synced' | 'error';

interface OfflineSyncValue {
  online: boolean;
  syncState: SyncState;
  syncedAt: string | null;
  pendingCount: number;
  conflicts: ConflictRecord[];
  syncNow: () => Promise<FlushSummary>;
  resolveConflict: (fileId: number, choice: 'local' | 'server') => Promise<void>;
}

const OfflineSyncContext = createContext<OfflineSyncValue | null>(null);

export function OfflineSyncProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [syncState, setSyncState] = useState<SyncState>('online');
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [conflicts, setConflicts] = useState<ConflictRecord[]>([]);
  const syncingRef = useRef(false);
  const retryTimerRef = useRef<number | null>(null);

  const refreshMeta = useCallback(() => {
    setPendingCount(pendingOpCount());
    setConflicts(listConflicts());
  }, []);

  const syncNow = useCallback(async (): Promise<FlushSummary> => {
    if (syncingRef.current) {
      return { completed: 0, failed: 0, conflicts: 0, done: false };
    }
    syncingRef.current = true;
    setSyncState('syncing');
    try {
      const summary = await flushQueue();
      if (summary.done) {
        setSyncedAt(new Date().toISOString());
        setSyncState('online');
      } else {
        setSyncState(summary.conflicts > 0 ? 'error' : 'online');
      }
      refreshMeta();
      return summary;
    } catch {
      setSyncState('error');
      refreshMeta();
      return { completed: 0, failed: 0, conflicts: 0, done: false };
    } finally {
      syncingRef.current = false;
    }
  }, [refreshMeta]);

  const retryWithBackoff = useCallback(
    (attempt: number) => {
      const delay = Math.min(1000 * 2 ** attempt, 30000);
      retryTimerRef.current = window.setTimeout(() => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) return;
        void syncNow().then((summary) => {
          if (!summary.done && typeof navigator !== 'undefined' && navigator.onLine) {
            retryWithBackoff(attempt + 1);
          }
        });
      }, delay);
    },
    [syncNow],
  );

  const onOnline = useCallback(() => {
    setOnline(true);
    setSyncState('online');
    void syncNow().then((summary) => {
      if (!summary.done) retryWithBackoff(0);
    });
  }, [syncNow, retryWithBackoff]);

  const onOffline = useCallback(() => {
    setOnline(false);
    setSyncState('offline');
    refreshMeta();
  }, [refreshMeta]);

  useEffect(() => {
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    refreshMeta();
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
    };
  }, [onOnline, onOffline, refreshMeta]);

  useEffect(() => {
    if (online) {
      const id = window.setInterval(() => {
        const n = pendingOpCount();
        setPendingCount(n);
        setConflicts(listConflicts());
      }, 10000);
      return () => window.clearInterval(id);
    }
    const id = window.setInterval(refreshMeta, 3000);
    return () => window.clearInterval(id);
  }, [online, refreshMeta]);

  const resolveConflict = useCallback(
    async (fileId: number, choice: 'local' | 'server') => {
      await resolveOnServer(fileId, choice);
      refreshMeta();
      if (choice === 'local') void syncNow();
    },
    [refreshMeta, syncNow],
  );

  const value = useMemo<OfflineSyncValue>(
    () => ({
      online,
      syncState,
      syncedAt,
      pendingCount,
      conflicts,
      syncNow,
      resolveConflict,
    }),
    [online, syncState, syncedAt, pendingCount, conflicts, syncNow, resolveConflict],
  );

  return <OfflineSyncContext.Provider value={value}>{children}</OfflineSyncContext.Provider>;
}

export function useOfflineSync(): OfflineSyncValue {
  const ctx = useContext(OfflineSyncContext);
  if (!ctx) throw new Error('useOfflineSync must be used within OfflineSyncProvider');
  return ctx;
}