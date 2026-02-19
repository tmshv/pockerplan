import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ShareButton } from "./ShareButton";

describe("ShareButton", () => {
  it("renders with Share text", () => {
    render(<ShareButton roomId="abc123" />);
    expect(screen.getByRole("button", { name: "Share" })).toBeInTheDocument();
  });

  it("copies join URL to clipboard on click", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    render(<ShareButton roomId="abc123" />);
    await userEvent.click(screen.getByRole("button", { name: "Share" }));

    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/room/abc123/join`,
    );
  });

  it("shows Copied! feedback after click", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    render(<ShareButton roomId="abc123" />);
    await userEvent.click(screen.getByRole("button", { name: "Share" }));

    expect(screen.getByRole("button", { name: "Copied!" })).toBeInTheDocument();
  });

  it("reverts to Share text after 2 seconds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    render(<ShareButton roomId="abc123" />);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByRole("button", { name: "Share" }));

    expect(screen.getByRole("button", { name: "Copied!" })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByRole("button", { name: "Share" })).toBeInTheDocument();

    vi.useRealTimers();
  });
});
