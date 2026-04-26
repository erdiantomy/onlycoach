import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const USD_TO_IDR = 16000;

/**
 * Format a USD price as IDR with thousands separator.
 * Mock data is in USD; production payments + DB use Rupiah-priced cents.
 * Single conversion point so the UI can switch fully to IDR without
 * touching every page.
 */
export function formatIdr(usd: number): string {
  const idr = Math.round(usd * USD_TO_IDR);
  return `IDR ${idr.toLocaleString("id-ID")}`;
}

/** Same as formatIdr but for already-rupiah amounts (e.g. seed data). */
export function formatIdrRaw(idr: number): string {
  return `IDR ${idr.toLocaleString("id-ID")}`;
}

