import { useEffect, useRef } from 'react';

export const ACTIVITY_EVENTS = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
] as const;

export const STORAGE_KEY = 'auth:lastActivity';

interface Options {
  isActive: boolean;
  onInactive: () => void;
  inactivityLimit?: number;
  checkInterval?: number;
}

export const useInactivityLogout = ({
  isActive,
  onInactive,
  inactivityLimit = 5 * 60 * 1000,
  checkInterval = 1000,
}: Options) => {
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    if (!isActive) return;

    const updateActivity = () => {
      const now = Date.now();
      lastActivityRef.current = now;
      try {
        localStorage.setItem(STORAGE_KEY, String(now));
      } catch (e) {
        // ignore
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        lastActivityRef.current = parseInt(e.newValue, 10);
      }
    };

    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, updateActivity));
    window.addEventListener('storage', handleStorage);
    updateActivity();

    const interval = setInterval(() => {
      let stored = lastActivityRef.current;
      try {
        const v = localStorage.getItem(STORAGE_KEY);
        if (v) stored = Math.max(stored, parseInt(v, 10));
      } catch (e) {
        // ignore
      }
      if (Date.now() - stored > inactivityLimit) {
        onInactive();
      }
    }, checkInterval);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, updateActivity));
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, [isActive, onInactive, inactivityLimit, checkInterval]);
};
