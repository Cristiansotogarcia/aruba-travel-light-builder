import type { UserRole } from '@/types/types';

/**
 * Where a signed-in user lands by default for their role. Shared by the
 * post-login redirect (Login.tsx) and any "back to my home" control (e.g. the
 * Blog Studio header) so the two never drift apart.
 */
export function getRoleHomeRoute(role: UserRole | null | undefined): string {
  switch (role) {
    case 'Admin':
    case 'SuperUser':
      return '/admin';
    case 'Accounting':
      return '/accounting';
    case 'Driver':
      return '/driver-dashboard';
    case 'Booker':
      return '/booker';
    case 'StoreStaff':
      return '/depot';
    case 'Customer':
      return '/customer-dashboard';
    default:
      return '/';
  }
}
