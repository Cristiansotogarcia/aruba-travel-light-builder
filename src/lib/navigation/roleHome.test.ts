import { describe, expect, it } from 'vitest';
import { getRoleHomeRoute } from './roleHome';

describe('getRoleHomeRoute', () => {
  it('sends Admin and SuperUser to the admin dashboard', () => {
    expect(getRoleHomeRoute('Admin')).toBe('/admin');
    expect(getRoleHomeRoute('SuperUser')).toBe('/admin');
  });

  it('sends each other role to its own dashboard', () => {
    expect(getRoleHomeRoute('Accounting')).toBe('/accounting');
    expect(getRoleHomeRoute('Driver')).toBe('/driver-dashboard');
    expect(getRoleHomeRoute('Booker')).toBe('/booker');
    expect(getRoleHomeRoute('StoreStaff')).toBe('/depot');
    expect(getRoleHomeRoute('Customer')).toBe('/customer-dashboard');
  });

  it('falls back to the homepage for an unrecognized or missing role', () => {
    expect(getRoleHomeRoute(null)).toBe('/');
    expect(getRoleHomeRoute(undefined)).toBe('/');
    expect(getRoleHomeRoute('NotARole' as never)).toBe('/');
  });
});
