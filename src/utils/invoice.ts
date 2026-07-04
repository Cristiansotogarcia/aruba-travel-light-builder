/**
 * Invoicing & accounting helpers (Workstream W5).
 *
 * Tax model: Aruba turnover taxes (BBO/BAZV/BAVP) are applied on the business's
 * turnover. To avoid retroactively changing what customers were charged, we treat
 * the existing booking/invoice `total_amount` as TAX-INCLUSIVE and *extract* the
 * embedded tax for display ("includes X% tax: $Y") rather than adding a new line
 * on top. This keeps historical totals stable while still surfacing the tax split.
 */

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export interface InclusiveTaxResult {
  /** The tax-inclusive total (unchanged input, rounded to 2dp). */
  grossAmount: number;
  /** Portion of the gross that is turnover tax. */
  taxAmount: number;
  /** Gross minus tax (the pre-tax turnover). */
  netAmount: number;
}

/**
 * Extract the tax embedded in a tax-inclusive total.
 *
 * gross = net * (1 + rate/100)  =>  net = gross / (1 + rate/100)
 *
 * Returns zero tax for non-positive totals or non-positive rates, so a default
 * rate of 0 (or an unset booking) leaves the total untouched.
 */
export function computeInclusiveTax(total: number, ratePercent: number): InclusiveTaxResult {
  const gross = round2(Number(total) || 0);
  const rate = Number(ratePercent) || 0;

  if (gross <= 0 || rate <= 0) {
    return { grossAmount: Math.max(gross, 0) === 0 ? 0 : gross, taxAmount: 0, netAmount: gross };
  }

  const net = round2(gross / (1 + rate / 100));
  const tax = round2(gross - net);
  return { grossAmount: gross, taxAmount: tax, netAmount: round2(gross - tax) };
}

/**
 * Parse a system_settings tax-rate string into a non-negative number.
 * Invalid, empty, null/undefined, or negative values collapse to 0.
 */
export function parseTaxRate(value: string | null | undefined): number {
  if (value == null) return 0;
  const n = Number(String(value).trim());
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

/** Format a sequential invoice number: INV-YYYY-NNNN (min 4-digit zero pad). */
export function formatInvoiceNumber(year: number, seq: number): string {
  return `INV-${year}-${String(seq).padStart(4, '0')}`;
}

/** Format a sequential credit-note number: CN-YYYY-NNNN (min 4-digit zero pad). */
export function formatCreditNumber(year: number, seq: number): string {
  return `CN-${year}-${String(seq).padStart(4, '0')}`;
}
