import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";

function fireKey(key: string, opts?: Partial<KeyboardEventInit>) {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, ...opts }));
}

function makeOptions(overrides: Partial<Parameters<typeof useKeyboardShortcuts>[0]> = {}) {
  return {
    scaleValues: ["1", "2", "3", "5", "8", "13", "21", "?"],
    roomState: "voting" as const,
    isAdmin: false,
    onVote: vi.fn(),
    onReveal: vi.fn(),
    onReset: vi.fn(),
    onNextTicket: vi.fn(),
    onPrevTicket: vi.fn(),
    hasPrevTicket: false,
    hasNextTicket: false,
    ...overrides,
  };
}

describe("useKeyboardShortcuts", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("immediately votes for unique single-char value", () => {
    const opts = makeOptions();
    renderHook(() => useKeyboardShortcuts(opts));

    fireKey("5");
    // "5" matches exactly and no other value starts with "5" (except "55" if present)
    // In fibonacci: "5" matches, but "55" is not in our test set. So immediate.
    expect(opts.onVote).toHaveBeenCalledWith("5");
  });

  it("buffers multi-char values and fires after debounce", () => {
    const opts = makeOptions();
    renderHook(() => useKeyboardShortcuts(opts));

    fireKey("1");
    // "1" matches exactly, but "13" and "21" start with "1" -> wait
    expect(opts.onVote).not.toHaveBeenCalled();

    fireKey("3");
    // "13" matches exactly and nothing else starts with "13" -> immediate
    expect(opts.onVote).toHaveBeenCalledWith("13");
  });

  it("fires single-char match after debounce when ambiguous", () => {
    const opts = makeOptions();
    renderHook(() => useKeyboardShortcuts(opts));

    fireKey("2");
    // "2" matches, but "21" also starts with "2" -> buffer
    expect(opts.onVote).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    expect(opts.onVote).toHaveBeenCalledWith("2");
  });

  it("handles case-insensitive t-shirt sizes", () => {
    const opts = makeOptions({
      scaleValues: ["XS", "S", "M", "L", "XL", "XXL", "?"],
    });
    renderHook(() => useKeyboardShortcuts(opts));

    fireKey("m");
    // "m" matches "M" exactly, no other value starts with just "m" -> immediate
    expect(opts.onVote).toHaveBeenCalledWith("M");
  });

  it("handles multi-char t-shirt size with buffering", () => {
    const opts = makeOptions({
      scaleValues: ["XS", "S", "M", "L", "XL", "XXL", "?"],
    });
    renderHook(() => useKeyboardShortcuts(opts));

    fireKey("x");
    expect(opts.onVote).not.toHaveBeenCalled();
    fireKey("x");
    expect(opts.onVote).not.toHaveBeenCalled();
    fireKey("l");
    // "xxl" matches "XXL" and nothing else starts with "xxl" -> immediate
    expect(opts.onVote).toHaveBeenCalledWith("XXL");
  });

  it("does not fire when focus is in an input", () => {
    const opts = makeOptions();
    renderHook(() => useKeyboardShortcuts(opts));

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    fireKey("5");
    expect(opts.onVote).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it("does not fire when focus is in a textarea", () => {
    const opts = makeOptions();
    renderHook(() => useKeyboardShortcuts(opts));

    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    textarea.focus();

    fireKey("5");
    expect(opts.onVote).not.toHaveBeenCalled();

    document.body.removeChild(textarea);
  });

  it("does not fire when focus is in contenteditable", () => {
    const opts = makeOptions();
    renderHook(() => useKeyboardShortcuts(opts));

    const div = document.createElement("div");
    div.setAttribute("contenteditable", "true");
    div.tabIndex = 0;
    document.body.appendChild(div);
    div.focus();

    fireKey("5");
    expect(opts.onVote).not.toHaveBeenCalled();

    document.body.removeChild(div);
  });

  it("ignores modifier keys", () => {
    const opts = makeOptions();
    renderHook(() => useKeyboardShortcuts(opts));

    fireKey("5", { ctrlKey: true });
    expect(opts.onVote).not.toHaveBeenCalled();

    fireKey("5", { altKey: true });
    expect(opts.onVote).not.toHaveBeenCalled();

    fireKey("5", { metaKey: true });
    expect(opts.onVote).not.toHaveBeenCalled();
  });

  it("does not fire voting shortcuts when not in voting state", () => {
    const opts = makeOptions({ roomState: "revealed" });
    renderHook(() => useKeyboardShortcuts(opts));

    fireKey("5");
    expect(opts.onVote).not.toHaveBeenCalled();
  });

  it("admin Enter triggers reveal during voting", () => {
    const opts = makeOptions({ isAdmin: true, roomState: "voting" });
    renderHook(() => useKeyboardShortcuts(opts));

    fireKey("Enter");
    expect(opts.onReveal).toHaveBeenCalled();
  });

  it("admin Enter triggers reveal during counting_down", () => {
    const opts = makeOptions({ isAdmin: true, roomState: "counting_down" });
    renderHook(() => useKeyboardShortcuts(opts));

    fireKey("Enter");
    expect(opts.onReveal).toHaveBeenCalled();
  });

  it("admin Enter does not trigger in idle state", () => {
    const opts = makeOptions({ isAdmin: true, roomState: "idle" });
    renderHook(() => useKeyboardShortcuts(opts));

    fireKey("Enter");
    expect(opts.onReveal).not.toHaveBeenCalled();
  });

  it("admin Space triggers reset during revealed", () => {
    const opts = makeOptions({ isAdmin: true, roomState: "revealed" });
    renderHook(() => useKeyboardShortcuts(opts));

    fireKey(" ");
    expect(opts.onReset).toHaveBeenCalled();
  });

  it("admin Space does not trigger during voting", () => {
    const opts = makeOptions({ isAdmin: true, roomState: "voting" });
    renderHook(() => useKeyboardShortcuts(opts));

    fireKey(" ");
    expect(opts.onReset).not.toHaveBeenCalled();
  });

  it("admin ArrowRight triggers next ticket", () => {
    const opts = makeOptions({ isAdmin: true, hasNextTicket: true });
    renderHook(() => useKeyboardShortcuts(opts));

    fireKey("ArrowRight");
    expect(opts.onNextTicket).toHaveBeenCalled();
  });

  it("admin ArrowLeft triggers prev ticket", () => {
    const opts = makeOptions({ isAdmin: true, hasPrevTicket: true });
    renderHook(() => useKeyboardShortcuts(opts));

    fireKey("ArrowLeft");
    expect(opts.onPrevTicket).toHaveBeenCalled();
  });

  it("admin ArrowRight does nothing when no next ticket", () => {
    const opts = makeOptions({ isAdmin: true, hasNextTicket: false });
    renderHook(() => useKeyboardShortcuts(opts));

    fireKey("ArrowRight");
    expect(opts.onNextTicket).not.toHaveBeenCalled();
  });

  it("non-admin Enter/Space/Arrow do nothing", () => {
    const opts = makeOptions({ isAdmin: false, roomState: "voting" });
    renderHook(() => useKeyboardShortcuts(opts));

    fireKey("Enter");
    expect(opts.onReveal).not.toHaveBeenCalled();

    fireKey(" ");
    expect(opts.onReset).not.toHaveBeenCalled();

    fireKey("ArrowRight");
    expect(opts.onNextTicket).not.toHaveBeenCalled();
  });

  it("discards buffer on no match after debounce", () => {
    const opts = makeOptions();
    renderHook(() => useKeyboardShortcuts(opts));

    fireKey("z");
    vi.advanceTimersByTime(500);
    expect(opts.onVote).not.toHaveBeenCalled();
  });

  it("cleans up event listener on unmount", () => {
    const opts = makeOptions();
    const { unmount } = renderHook(() => useKeyboardShortcuts(opts));

    unmount();

    fireKey("5");
    expect(opts.onVote).not.toHaveBeenCalled();
  });
});
