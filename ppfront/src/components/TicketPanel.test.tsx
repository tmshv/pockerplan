import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TicketPanel } from "./TicketPanel";
import type { TicketSnapshot } from "../types";

describe("TicketPanel", () => {
  it("shows empty state when no ticket", () => {
    render(<TicketPanel ticket={null} />);
    expect(screen.getByText(/no ticket selected/i)).toBeInTheDocument();
  });

  it("renders ticket title", () => {
    const ticket: TicketSnapshot = {
      id: "t1",
      title: "Add login page",
      description: "",
      status: "voting",
      votes: [],
    };
    render(<TicketPanel ticket={ticket} />);
    expect(screen.getByText("Add login page")).toBeInTheDocument();
  });

  it("renders markdown description", () => {
    const ticket: TicketSnapshot = {
      id: "t1",
      title: "Test ticket",
      description: "Some **bold** text",
      status: "voting",
      votes: [],
    };
    render(<TicketPanel ticket={ticket} />);
    expect(screen.getByText("bold")).toBeInTheDocument();
  });

  it("shows ticket status", () => {
    const ticket: TicketSnapshot = {
      id: "t1",
      title: "Test",
      description: "",
      status: "revealed",
      votes: [],
    };
    render(<TicketPanel ticket={ticket} />);
    expect(screen.getByText("revealed")).toBeInTheDocument();
  });
});
