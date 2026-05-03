// Currency formatting helper. The platform's prices are quoted in IDR
// (Indonesian Rupiah) on the marketing surface, so we default to IDR
// everywhere unless a tier/booking explicitly carries another currency.
//
// IDR has no minor units in practice, so we render with grouping and
// no fraction digits ("IDR 304.000" — note the dot is a thousands
// separator in id-ID). Pass a different `currency` for tiers priced
// in USD or EUR.

export type CurrencyCode = "IDR" | "USD" | "EUR";

const formatters = new Map<string, Intl.NumberFormat>();

const get = (currency: CurrencyCode, locale: string) => {
  const key = `${currency}|${locale}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "IDR" ? 0 : 2,
      minimumFractionDigits: currency === "IDR" ? 0 : 0,
    });
    formatters.set(key, f);
  }
  return f;
};

export const formatCurrency = (
  amount: number,
  currency: CurrencyCode = "IDR",
  locale = currency === "IDR" ? "id-ID" : "en-US",
) => get(currency, locale).format(amount);

// Convenience: per-month price labels render the same way whether the
// number comes from a `subscription_tiers.price` row or a hardcoded
// preview tier.
export const formatPerMonth = (amount: number, currency: CurrencyCode = "IDR") =>
  `${formatCurrency(amount, currency)}/mo`;
