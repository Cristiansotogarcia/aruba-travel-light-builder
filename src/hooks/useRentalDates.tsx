/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { parseRangeFromParams, type RentalRange } from '@/lib/rentalDates';

interface RentalDatesContextType extends RentalRange {
  setRange: (startDate: string, endDate: string) => void;
  clear: () => void;
}

const STORAGE_KEY = 'rentalDates';
const RentalDatesContext = createContext<RentalDatesContextType | undefined>(undefined);

export const RentalDatesProvider = ({ children }: { children: ReactNode }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [range, setRangeState] = useState<RentalRange>(() => {
    const fromUrl = parseRangeFromParams(searchParams);
    if (fromUrl.startDate && fromUrl.endDate) return fromUrl;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored) as RentalRange;
    } catch { /* ignore */ }
    return { startDate: null, endDate: null };
  });

  useEffect(() => {
    if (range.startDate && range.endDate) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(range)); } catch { /* ignore */ }
      const next = new URLSearchParams(searchParams);
      next.set('start', range.startDate);
      next.set('end', range.endDate);
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.startDate, range.endDate]);

  const setRange = useCallback((startDate: string, endDate: string) => {
    setRangeState({ startDate, endDate });
  }, []);

  const clear = useCallback(() => {
    setRangeState({ startDate: null, endDate: null });
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    const next = new URLSearchParams(searchParams);
    next.delete('start'); next.delete('end');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  return (
    <RentalDatesContext.Provider value={{ ...range, setRange, clear }}>
      {children}
    </RentalDatesContext.Provider>
  );
};

export const useRentalDates = () => {
  const ctx = useContext(RentalDatesContext);
  if (!ctx) throw new Error('useRentalDates must be used within a RentalDatesProvider');
  return ctx;
};
