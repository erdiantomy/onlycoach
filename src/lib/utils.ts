import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a price given in Rupiah cents (price_cents from DB) as a display string.
 * All production prices are stored as integer cents (IDR × 100).
 */
export function formatIdr(cents: number): string {
  const idr = Math.round(cents / 100);
  return `Rp${idr.toLocaleString("id-ID")}`;
}
