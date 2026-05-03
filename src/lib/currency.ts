/**
 * Single source of truth for price formatting.
 * Default currency is IDR — the platform charges in Rupiah.
 *
 * Inputs are integer "cents" (matching every DB price_cents column).
 * For IDR there are no sub-units, so cents are divided by 100 and rounded
 * to the nearest whole rupiah.
 */

type Currency = "IDR" | "USD";

interface FormatOpts {
  /** Currency code. Defaults to IDR. */
  currency?: Currency;
  /** When true (default), input is integer cents; when false, input is already in major units. */
  fromCents?: boolean;
}

export function formatCurrency(amount: number, opts: FormatOpts = {}): string {
  const { currency = "IDR", fromCents = true } = opts;
  const major = fromCents ? amount / 100 : amount;

  if (currency === "IDR") {
    return `IDR ${Math.round(major).toLocaleString("id-ID")}`;
  }
  // USD fallback
  return `$${major.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function formatPerMonth(amount: number, opts: FormatOpts = {}): string {
  return `${formatCurrency(amount, opts)}/mo`;
}
