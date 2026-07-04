import { describe, it, expect } from 'vitest';

// Vite's `?raw` suffix inlines the file contents as a string at transform time,
// which is a stable way to assert on source structure regardless of cwd.
import adminSource from '@/pages/Admin.tsx?raw';
import accountingSource from '@/pages/Accounting.tsx?raw';
import bookerSource from '@/pages/BookerDashboard.tsx?raw';
import driverSource from '@/pages/DriverDashboard.tsx?raw';
import depotSource from '@/pages/Depot.tsx?raw';
import customerSource from '@/pages/CustomerDashboard.tsx?raw';

/**
 * Structural guard: every gated staff dashboard must render inside the unified
 * AppShell and must NOT pull in the public marketing Header. This is the exact
 * regression the owner reported ("it still overlaps with the default website
 * pages"), so we lock it down at the source level.
 */

const STAFF_PAGES: Array<[string, string]> = [
  ['Admin', adminSource],
  ['Accounting', accountingSource],
  ['BookerDashboard', bookerSource],
  ['DriverDashboard', driverSource],
  ['Depot', depotSource],
];

describe('staff dashboards use the unified app shell', () => {
  it.each(STAFF_PAGES)('%s does not import the marketing Header', (_name, source) => {
    expect(source).not.toMatch(/from ['"]@\/components\/layout\/Header['"]/);
    expect(source).not.toMatch(/DriverTopBar/);
  });

  it.each(STAFF_PAGES)('%s mounts the AppShell', (_name, source) => {
    expect(source).toMatch(/AppShell/);
  });
});

describe('customer dashboard stays on the public site chrome', () => {
  it('CustomerDashboard keeps the marketing Header', () => {
    expect(customerSource).toMatch(/from ['"]@\/components\/layout\/Header['"]/);
  });
});
