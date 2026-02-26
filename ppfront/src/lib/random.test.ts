import { describe, expect, it } from "vitest";
import { hashString, makeRng } from "./random";

describe("hashString", () => {
  it("returns a number", () => {
    expect(typeof hashString("abc")).toBe("number");
  });

  it("is deterministic", () => {
    expect(hashString("hello")).toBe(hashString("hello"));
  });

  it("returns different values for different inputs", () => {
    expect(hashString("foo")).not.toBe(hashString("bar"));
  });

  it("returns an unsigned 32-bit integer", () => {
    const h = hashString("test");
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
  });

  it("handles empty string", () => {
    expect(typeof hashString("")).toBe("number");
  });
});

describe("makeRng", () => {
  it("returns values in [0, 1)", () => {
    const rng = makeRng(42);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("is deterministic for the same seed", () => {
    const a = makeRng(12345);
    const b = makeRng(12345);
    for (let i = 0; i < 20; i++) {
      expect(a()).toBe(b());
    }
  });

  it("produces different sequences for different seeds", () => {
    const a = makeRng(1);
    const b = makeRng(2);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });

  it("seeding with hashString gives stable sequences", () => {
    const rng = makeRng(hashString("my-room-id"));
    const seq = Array.from({ length: 5 }, () => rng());
    const rng2 = makeRng(hashString("my-room-id"));
    const seq2 = Array.from({ length: 5 }, () => rng2());
    expect(seq).toEqual(seq2);
  });
});
