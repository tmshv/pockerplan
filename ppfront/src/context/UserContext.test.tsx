import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { UserProvider, useUserContext } from "./UserContext";
import type { ReactNode } from "react";

const wrapper = ({ children }: { children: ReactNode }) => (
  <UserProvider>{children}</UserProvider>
);

beforeEach(() => {
  localStorage.clear();
});

describe("UserContext", () => {
  it("provides user state through context", () => {
    const { result } = renderHook(() => useUserContext(), { wrapper });
    expect(result.current.user).toBeNull();
  });

  it("setUser updates context value", () => {
    const { result } = renderHook(() => useUserContext(), { wrapper });
    act(() => {
      result.current.setUser({ name: "Eve", avatarId: "fox" });
    });
    expect(result.current.user).toEqual({ name: "Eve", avatarId: "fox" });
  });

  it("throws when used outside provider", () => {
    expect(() => {
      renderHook(() => useUserContext());
    }).toThrow("useUserContext must be used within a UserProvider");
  });
});
