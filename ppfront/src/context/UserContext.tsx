import { createContext, useContext } from "react";
import type { StoredUser } from "../types";
import { useUser } from "../hooks/useUser";

interface UserContextValue {
  user: StoredUser | null;
  setUser: (u: StoredUser) => void;
  clearUser: () => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const value = useUser();
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUserContext(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUserContext must be used within a UserProvider");
  }
  return ctx;
}
