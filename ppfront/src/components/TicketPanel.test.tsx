import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TicketSnapshot } from "../types";
import { TicketPanel } from "./TicketPanel";

describe("TicketPanel", () => {
  it("shows empty state when no ticket", () => {
    render(<TicketPanel ticket={null} />);
    expect(screen.getByText(/no ticket selected/i)).toBeInTheDocument();
  });

  it("renders ticket content as markdown", () => {
    const ticket: TicketSnapshot = {
      id: "t1",
      content: "Some **bold** text",
      status: "voting",
      votes: [],
    };
    render(<TicketPanel ticket={ticket} />);
    expect(screen.getByText("bold")).toBeInTheDocument();
  });

  it("renders ticket content when status is revealed", () => {
    const ticket: TicketSnapshot = {
      id: "t1",
      content: "Test",
      status: "revealed",
      votes: [],
    };
    render(<TicketPanel ticket={ticket} />);
    expect(screen.getByText("Test")).toBeInTheDocument();
  });

  it("handles empty content gracefully", () => {
    const ticket: TicketSnapshot = {
      id: "t1",
      content: "",
      status: "pending",
      votes: [],
    };
    const { container } = render(<TicketPanel ticket={ticket} />);
    expect(
      container.querySelector(".ticket-panel.free-vote"),
    ).toBeInTheDocument();
  });
});
