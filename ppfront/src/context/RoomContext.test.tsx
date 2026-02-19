import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useRoomContext } from "./RoomContext";

describe("useRoomContext", () => {
  it("throws when used outside RoomProvider", () => {
    expect(() => {
      renderHook(() => useRoomContext());
    }).toThrow("useRoomContext must be used within a RoomProvider");
  });
});
