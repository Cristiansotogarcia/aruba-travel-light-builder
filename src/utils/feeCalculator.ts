/**
 * Utility functions for calculating payment processor fees and net amounts
 * Used for accounting and financial reconciliation
 */

/**
 * Calculate processor fee amount from gross amount and fee percentage
 * @param grossAmount - The total booking/payment amount
 * @param feePercent - The processor fee percentage (e.g., 3.99 for 3.99%)
 * @returns The calculated fee amount
 */
export function calculateProcessorFee(grossAmount: number, feePercent: number): number {
  if (grossAmount <= 0 || feePercent < 0) return 0;
  return Math.round((grossAmount * feePercent / 100) * 100) / 100;
}

/**
 * Calculate net amount after processor fee
 * @param grossAmount - The total booking/payment amount
 * @param feePercent - The processor fee percentage (e.g., 3.99 for 3.99%)
 * @returns The net amount after fee deduction
 */
export function calculateNetAmount(grossAmount: number, feePercent: number): number {
  if (grossAmount <= 0) return 0;
  const fee = calculateProcessorFee(grossAmount, feePercent);
  return Math.round((grossAmount - fee) * 100) / 100;
}

/**
 * Calculate net amount from fee amount directly
 * @param grossAmount - The total booking/payment amount
 * @param feeAmount - The processor fee amount (absolute value)
 * @returns The net amount after fee deduction
 */
export function calculateNetFromFee(grossAmount: number, feeAmount: number): number {
  if (grossAmount <= 0) return 0;
  return Math.round((grossAmount - feeAmount) * 100) / 100;
}

/**
 * Calculate fee percentage from gross and fee amounts
 * @param grossAmount - The total booking/payment amount
 * @param feeAmount - The processor fee amount (absolute value)
 * @returns The calculated fee percentage
 */
export function calculateFeePercent(grossAmount: number, feeAmount: number): number {
  if (grossAmount <= 0) return 0;
  return Math.round((feeAmount / grossAmount * 100) * 100) / 100;
}

/**
 * Format amount as currency string
 * @param amount - The amount to format
 * @param currency - Currency code (default: AWG)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string = 'AWG'): string {
  return `${currency} ${amount.toFixed(2)}`;
}

/**
 * Payment record data structure for accounting
 */
export interface PaymentRecordData {
  booking_id: string;
  gross_amount: number;
  processor_fee_percent: number;
  processor_fee_amount: number;
  net_amount: number;
  currency_code: string;
  status: string;
  payment_method?: string;
  card_last_four?: string;
  processor_transaction_id?: string;
  settlement_date?: string;
  statement_reference?: string;
  is_refund?: boolean;
  refund_amount?: number;
}

/**
 * Create a complete payment record with calculated fee fields
 * @param bookingId - The booking ID
 * @param grossAmount - The gross payment amount
 * @param feePercent - The processor fee percentage to apply
 * @param currency - Currency code
 * @param options - Additional payment options
 * @returns Complete payment record data
 */
export function createPaymentRecord(
  bookingId: string,
  grossAmount: number,
  feePercent: number,
  currency: string = 'AWG',
  options?: {
    status?: string;
    payment_method?: string;
    card_last_four?: string;
    processor_transaction_id?: string;
    is_refund?: boolean;
    refund_amount?: number;
  }
): PaymentRecordData {
  const processor_fee_amount = calculateProcessorFee(grossAmount, feePercent);
  const net_amount = calculateNetAmount(grossAmount, feePercent);
  
  return {
    booking_id: bookingId,
    gross_amount: grossAmount,
    processor_fee_percent: feePercent,
    processor_fee_amount,
    net_amount,
    currency_code: currency,
    status: options?.status || 'paid',
    payment_method: options?.payment_method,
    card_last_four: options?.card_last_four,
    processor_transaction_id: options?.processor_transaction_id,
    settlement_date: new Date().toISOString().split('T')[0],
    is_refund: options?.is_refund || false,
    refund_amount: options?.refund_amount || 0,
  };
}

/**
 * Summary data for accounting reports
 */
export interface AccountingSummary {
  totalGross: number;
  totalFees: number;
  totalNet: number;
  totalRefunds: number;
  transactionCount: number;
  averageTransaction: number;
  averageFeePercent: number;
}

/**
 * Calculate accounting summary from payment records
 * @param payments - Array of payment records
 * @returns Summary statistics
 */
export function calculateAccountingSummary(
  payments: Array<{
    gross_amount?: number;
    processor_fee_amount?: number;
    net_amount?: number;
    refund_amount?: number;
    is_refund?: boolean;
  }>
): AccountingSummary {
  let totalGross = 0;
  let totalFees = 0;
  let totalNet = 0;
  let totalRefunds = 0;
  
  payments.forEach(p => {
    const gross = p.gross_amount || 0;
    const fee = p.processor_fee_amount || 0;
    const net = p.net_amount || 0;
    const refund = p.is_refund ? (p.refund_amount || gross) : 0;
    
    totalGross += gross;
    totalFees += fee;
    totalNet += net;
    totalRefunds += refund;
  });
  
  const transactionCount = payments.length;
  const averageTransaction = transactionCount > 0 ? totalGross / transactionCount : 0;
  const averageFeePercent = totalGross > 0 ? (totalFees / totalGross) * 100 : 0;
  
  return {
    totalGross: Math.round(totalGross * 100) / 100,
    totalFees: Math.round(totalFees * 100) / 100,
    totalNet: Math.round(totalNet * 100) / 100,
    totalRefunds: Math.round(totalRefunds * 100) / 100,
    transactionCount,
    averageTransaction: Math.round(averageTransaction * 100) / 100,
    averageFeePercent: Math.round(averageFeePercent * 100) / 100,
  };
}