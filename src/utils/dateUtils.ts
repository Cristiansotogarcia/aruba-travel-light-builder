// Date utilities using optimized date-fns imports
// Only import English locale by default, other locales loaded dynamically

import { format, parseISO, subDays, eachDayOfInterval, compareAsc, startOfMonth, subMonths, formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';

// Export typically used functions directly
export {
  format,
  parseISO,
  subDays,
  eachDayOfInterval,
  compareAsc,
  startOfMonth,
  subMonths,
  formatDistanceToNow,
  enUS as defaultLocale
};

// Lazy load other locales only when needed (not implemented here due to complexity)
// For now, we use only English locale to avoid loading 100+KB of other locales

export const LOCALE = enUS;

// Commonly used date formatting functions with optimized locale
export const formatShort = (date: Date | string | number) => {
  const d = typeof date === 'string' ? parseISO(date) : new Date(date);
  return format(d, 'MMM d, yyyy', { locale: LOCALE });
};

export const formatLong = (date: Date | string | number) => {
  const d = typeof date === 'string' ? parseISO(date) : new Date(date);
  return format(d, 'EEEE, MMMM do, yyyy', { locale: LOCALE });
};

export const formatRelative = (date: Date | string | number) => {
  const d = typeof date === 'string' ? parseISO(date) : new Date(date);
  return formatDistanceToNow(d, { addSuffix: true, locale: LOCALE });
};

// Month utilities
export const getLastNMonths = (n: number) => {
  const months = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const month = subMonths(now, i);
    months.push({
      key: format(startOfMonth(month), 'yyyy-MM'),
      label: format(month, 'MMM yyyy', { locale: LOCALE })
    });
  }
  return months;
};

// Date range utilities
export const getDateRange = (days: number) => ({
  from: subDays(new Date(), days),
  to: new Date()
});
