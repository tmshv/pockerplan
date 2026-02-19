import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { loadRoomInfo, saveRoomInfo, useUser } from "./useUser";

beforeEach(() => {
  localStorage.clear();
});

describe("useUser", () => {
  it("returns null when no user stored", () => {
    const { result } = renderHook(() => useUser());
    expect(result.current.user).toBeNull();
  });

  it("loads user from localStorage on mount", () => {
    localStorage.setItem(
      "pockerplan_user",
      JSON.stringify({ name: "Alice", avatarId: "cat" }),
    );
    const { result } = renderHook(() => useUser());
    expect(result.current.user).toEqual({ name: "Alice", avatarId: "cat" });
  });

  it("setUser persists to localStorage and updates state", () => {
    const { result } = renderHook(() => useUser());
    act(() => {
      result.current.setUser({ name: "Bob", avatarId: "dog" });
    });
    expect(result.current.user).toEqual({ name: "Bob", avatarId: "dog" });
    expect(JSON.parse(localStorage.getItem("pockerplan_user")!)).toEqual({
      name: "Bob",
      avatarId: "dog",
    });
  });

  it("clearUser removes from localStorage and clears state", () => {
    localStorage.setItem(
      "pockerplan_user",
      JSON.stringify({ name: "Alice", avatarId: "cat" }),
    );
    const { result } = renderHook(() => useUser());
    act(() => {
      result.current.clearUser();
    });
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem("pockerplan_user")).toBeNull();
  });

  it("handles corrupted localStorage gracefully", () => {
    localStorage.setItem("pockerplan_user", "not-json");
    const { result } = renderHook(() => useUser());
    expect(result.current.user).toBeNull();
  });
});

describe("loadRoomInfo / saveRoomInfo", () => {
  it("returns null when no room info stored", () => {
    expect(loadRoomInfo("room-1")).toBeNull();
  });

  it("saves and loads room info", () => {
    saveRoomInfo("room-1", { userId: "u1", adminSecret: "secret" });
    const info = loadRoomInfo("room-1");
    expect(info).toEqual({ userId: "u1", adminSecret: "secret" });
  });

  it("saves room info without admin secret", () => {
    saveRoomInfo("room-2", { userId: "u2" });
    const info = loadRoomInfo("room-2");
    expect(info).toEqual({ userId: "u2" });
  });

  it("handles corrupted room info gracefully", () => {
    localStorage.setItem("pockerplan_room_room-1", "{bad}");
    expect(loadRoomInfo("room-1")).toBeNull();
  });
});
