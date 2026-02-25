import { useEffect, useRef } from "react";

interface UseKeyboardShortcutsOptions {
  scaleValues: string[];
  roomState: "idle" | "voting" | "counting_down" | "revealed" | undefined;
  currentTicketId: string | undefined;
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

function isTextInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (
    (el as HTMLElement).isContentEditable ||
    el.getAttribute("contenteditable") === "true"
  ) {
    return true;
  }
  return false;
}

function isInteractiveElementFocused(): boolean {
  if (isTextInputFocused()) return true;
  const el = document.activeElement;
  if (!el) return false;
  if (el.tagName === "BUTTON" || el.tagName === "A") return true;
  // Elements with role="button" (e.g. ticket list rows) handle their own
  // Enter/Space, so global shortcuts must not interfere.
  if (el.getAttribute("role") === "button") return true;
  return false;
}

export function useKeyboardShortcuts({
  scaleValues,
  roomState,
  currentTicketId,
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
  const bufferTicketIdRef = useRef<string | undefined>(undefined);

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
  const currentTicketIdRef = useRef(currentTicketId);
  const isAdminRef = useRef(isAdmin);

  onVoteRef.current = onVote;
  onRevealRef.current = onReveal;
  onResetRef.current = onReset;
  onNextTicketRef.current = onNextTicket;
  onPrevTicketRef.current = onPrevTicket;
  hasPrevTicketRef.current = hasPrevTicket;
  hasNextTicketRef.current = hasNextTicket;
  roomStateRef.current = roomState;
  currentTicketIdRef.current = currentTicketId;
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
      // Re-check room state and ticket context before submitting - either may
      // have changed (e.g. admin navigated to another ticket) during the
      // debounce window. Submitting after a ticket change would apply the vote
      // to the wrong ticket because the backend uses the current ticket.
      if (
        roomStateRef.current !== "voting" &&
        roomStateRef.current !== "counting_down"
      ) {
        clearBuffer();
        return;
      }
      if (currentTicketIdRef.current !== bufferTicketIdRef.current) {
        clearBuffer();
        return;
      }
      const match = tryMatch(bufferRef.current);
      if (match) {
        onVoteRef.current(match);
      }
      clearBuffer();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      // Admin shortcuts only need to be suppressed in text inputs, not when
      // a button has focus (buttons retain focus after clicks in the admin
      // panel, and we still want Enter/Space/Arrow to work).
      if (isAdminRef.current && !isTextInputFocused()) {
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

      // Voting shortcuts need the full interactive-element guard so typing
      // vote characters doesn't interfere with focused buttons or links.
      if (isInteractiveElementFocused()) return;

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

      // Buffer the keystroke and wait for more.
      // Capture the ticket ID when the buffer starts so flushBuffer can detect
      // cross-ticket races.
      bufferRef.current = newBuffer;
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      } else {
        bufferTicketIdRef.current = currentTicketIdRef.current;
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
