import { describe, it, expect } from "vitest";
import { isRoomSnapshot } from "./validate";

describe("isRoomSnapshot", () => {
  it("returns true for a valid snapshot shape", () => {
    expect(isRoomSnapshot({ id: "x", users: [], state: "voting" })).toBe(true);
  });

  it("returns false when id is missing", () => {
    expect(isRoomSnapshot({ users: [], state: "voting" })).toBe(false);
  });

  it("returns false for null", () => {
    expect(isRoomSnapshot(null)).toBe(false);
  });

  it("returns false for non-object", () => {
    expect(isRoomSnapshot("string")).toBe(false);
  });
});
