import { useEffect, useRef } from "react";

interface UseKeyboardShortcutsOptions {
  scaleValues: string[];
  roomState: "idle" | "voting" | "counting_down" | "revealed" | undefined;
  isAdmin: boolean;
  onVote: (value: string) => void;
  onReveal: () => void;
  onReset: () => void;
  onNextTicket: () => void;
  onPrevTicket: () => void;
  hasPrevTicket: boolean;
  hasNextTicket: boolean;
}

const DEBOUNCE_MS = 500;

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return true;
  if (
    (el as HTMLElement).isContentEditable ||
    el.getAttribute("contenteditable") === "true"
  ) {
    return true;
  }
  return false;
}

export function useKeyboardShortcuts({
  scaleValues,
  roomState,
  isAdmin,
  onVote,
  onReveal,
  onReset,
  onNextTicket,
  onPrevTicket,
  hasPrevTicket,
  hasNextTicket,
}: UseKeyboardShortcutsOptions) {
  const bufferRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Use refs for values that change frequently to avoid re-creating the
  // event listener (which clears the vote buffer mid-typing).
  const onVoteRef = useRef(onVote);
  const onRevealRef = useRef(onReveal);
  const onResetRef = useRef(onReset);
  const onNextTicketRef = useRef(onNextTicket);
  const onPrevTicketRef = useRef(onPrevTicket);
  const hasPrevTicketRef = useRef(hasPrevTicket);
  const hasNextTicketRef = useRef(hasNextTicket);
  const roomStateRef = useRef(roomState);
  const isAdminRef = useRef(isAdmin);

  onVoteRef.current = onVote;
  onRevealRef.current = onReveal;
  onResetRef.current = onReset;
  onNextTicketRef.current = onNextTicket;
  onPrevTicketRef.current = onPrevTicket;
  hasPrevTicketRef.current = hasPrevTicket;
  hasNextTicketRef.current = hasNextTicket;
  roomStateRef.current = roomState;
  isAdminRef.current = isAdmin;

  useEffect(() => {
    function clearBuffer() {
      bufferRef.current = "";
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    function tryMatch(buffer: string): string | null {
      const lower = buffer.toLowerCase();
      const exact = scaleValues.find((v) => v.toLowerCase() === lower);
      if (exact) return exact;
      return null;
    }

    function canMatchMore(buffer: string): boolean {
      const lower = buffer.toLowerCase();
      return scaleValues.some(
        (v) => v.toLowerCase().startsWith(lower) && v.toLowerCase() !== lower,
      );
    }

    function flushBuffer() {
      const match = tryMatch(bufferRef.current);
      if (match) {
        onVoteRef.current(match);
      }
      clearBuffer();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (isInputFocused()) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      // Admin-only shortcuts
      if (isAdminRef.current) {
        if (e.key === "Enter") {
          if (roomStateRef.current === "voting" || roomStateRef.current === "counting_down") {
            e.preventDefault();
            onRevealRef.current();
          }
          return;
        }
        if (e.key === " ") {
          if (roomStateRef.current === "revealed") {
            e.preventDefault();
            onResetRef.current();
          }
          return;
        }
        if (e.key === "ArrowLeft") {
          if (hasPrevTicketRef.current) {
            e.preventDefault();
            onPrevTicketRef.current();
          }
          return;
        }
        if (e.key === "ArrowRight") {
          if (hasNextTicketRef.current) {
            e.preventDefault();
            onNextTicketRef.current();
          }
          return;
        }
      }

      // Voting shortcuts - only during voting or counting_down state
      if (roomStateRef.current !== "voting" && roomStateRef.current !== "counting_down") return;

      // Only accept printable single characters for vote buffer
      if (e.key.length !== 1) return;

      const newBuffer = bufferRef.current + e.key;

      // Check for exact match
      const exactMatch = tryMatch(newBuffer);
      if (exactMatch && !canMatchMore(newBuffer)) {
        // Unique match - fire immediately
        onVoteRef.current(exactMatch);
        clearBuffer();
        return;
      }

      // Buffer the keystroke and wait for more
      bufferRef.current = newBuffer;
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(flushBuffer, DEBOUNCE_MS);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearBuffer();
    };
  }, [scaleValues]);
}
