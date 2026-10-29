import type { PosCustomerFields, PosLeg, PosReturnLeg } from '@/lib/queries/pos';

export const POS_STEPS = ['rental', 'customer', 'pay', 'done'] as const;
export type PosStepId = (typeof POS_STEPS)[number];

export const EMPTY_POS_CUSTOMER: PosCustomerFields = {
  name: '',
  email: '',
  phone: '',
  address: '',
  roomNumber: '',
};

export type { PosCustomerFields, PosLeg, PosReturnLeg };
