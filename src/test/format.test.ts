import { describe, expect, it } from "vitest";
import { formatIdr, formatIdrRaw } from "@/lib/utils";

describe("formatIdr", () => {
  it("converts USD-equivalent to IDR with thousands separator", () => {
    // 19 (mock USD) * 16000 = 304_000 → "IDR 304.000"
    expect(formatIdr(19)).toBe("IDR 304.000");
  });

  it("rounds to whole rupiah", () => {
    expect(formatIdr(0.5)).toBe("IDR 8.000");
  });

  it("handles zero", () => {
    expect(formatIdr(0)).toBe("IDR 0");
  });
});

describe("formatIdrRaw", () => {
  it("formats already-rupiah amounts with id-ID separators", () => {
    expect(formatIdrRaw(149_000)).toBe("IDR 149.000");
  });

  it("handles big numbers", () => {
    expect(formatIdrRaw(1_234_567)).toBe("IDR 1.234.567");
  });
});
