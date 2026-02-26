import { useCallback, useEffect, useRef } from "react";

const THINKING_TIMEOUT_MS = 3000;

interface UseThinkingHeartbeatOptions {
  setThinking: (active: boolean) => Promise<void>;
  isVoting: boolean;
}

export function useThinkingHeartbeat({
  setThinking,
  isVoting,
}: UseThinkingHeartbeatOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const onInteraction = useCallback(() => {
    if (!isVoting) return;
    if (!activeRef.current) {
      activeRef.current = true;
      setThinking(true).catch(() => {});
    }
    clearTimer();
    timerRef.current = setTimeout(() => {
      activeRef.current = false;
      setThinking(false).catch(() => {});
    }, THINKING_TIMEOUT_MS);
  }, [isVoting, setThinking]);

  useEffect(() => {
    if (!isVoting && activeRef.current) {
      clearTimer();
      activeRef.current = false;
      setThinking(false).catch(() => {});
    }
    if (!isVoting) {
      clearTimer();
    }
  }, [isVoting, setThinking]);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, []);

  return { onInteraction };
}
