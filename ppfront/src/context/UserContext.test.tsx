import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { UserProvider, useUserContext } from "./UserContext";

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
