import { useState, useCallback } from "react";
import type { StoredUser, StoredRoomInfo } from "../types";

const USER_KEY = "pockerplan_user";
const ROOM_KEY_PREFIX = "pockerplan_room_";

export function loadUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

function saveUser(user: StoredUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function loadRoomInfo(roomId: string): StoredRoomInfo | null {
  try {
    const raw = localStorage.getItem(ROOM_KEY_PREFIX + roomId);
    if (!raw) return null;
    return JSON.parse(raw) as StoredRoomInfo;
  } catch {
    return null;
  }
}

export function saveRoomInfo(roomId: string, info: StoredRoomInfo): void {
  localStorage.setItem(ROOM_KEY_PREFIX + roomId, JSON.stringify(info));
}

export function useUser() {
  const [user, setUserState] = useState<StoredUser | null>(() => loadUser());

  const setUser = useCallback((u: StoredUser) => {
    saveUser(u);
    setUserState(u);
  }, []);

  const clearUser = useCallback(() => {
    localStorage.removeItem(USER_KEY);
    setUserState(null);
  }, []);

  return { user, setUser, clearUser };
}
