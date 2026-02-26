import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FloatingAdminPanel } from "./FloatingAdminPanel";

vi.mock("./MarkdownEditor");

const defaultProps = {
  roomId: "room-1",
  roomState: "voting" as const,
  ticketsEnabled: true,
  hasPrevTicket: false,
  hasNextTicket: true,
  hasTickets: true,
  onReveal: vi.fn(),
  onReset: vi.fn(),
  onPrevTicket: vi.fn(),
  onNextTicket: vi.fn(),
  onAddTicket: vi.fn().mockResolvedValue(undefined),
  onStartFreeVote: vi.fn(),
};

describe("FloatingAdminPanel", () => {
  it("renders ShareButton, AdminControls, and TicketForm", () => {
    render(<FloatingAdminPanel {...defaultProps} />);
    expect(screen.getByRole("button", { name: "Share" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reveal Votes" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add Ticket" }),
    ).toBeInTheDocument();
  });

  it("shows Hide button when expanded", () => {
    render(<FloatingAdminPanel {...defaultProps} />);
    expect(screen.getByRole("button", { name: "Hide" })).toBeInTheDocument();
  });

  it("collapses when toggle is clicked", async () => {
    render(<FloatingAdminPanel {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: "Hide" }));

    expect(screen.getByRole("button", { name: "Admin" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Reveal Votes" }),
    ).not.toBeInTheDocument();
  });

  it("expands when collapsed toggle is clicked", async () => {
    render(<FloatingAdminPanel {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: "Hide" }));
    await userEvent.click(screen.getByRole("button", { name: "Admin" }));

    expect(
      screen.getByRole("button", { name: "Reveal Votes" }),
    ).toBeInTheDocument();
  });

  it("has collapsed class when collapsed", async () => {
    const { container } = render(<FloatingAdminPanel {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: "Hide" }));

    expect(container.querySelector(".floating-admin-panel")).toHaveClass(
      "collapsed",
    );
  });
});
