import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { VoteInfo } from "../types";
import { VoteResults } from "./VoteResults";

describe("VoteResults", () => {
  it("shows average for numeric votes", () => {
    const votes: VoteInfo[] = [
      { userId: "u1", value: "3" },
      { userId: "u2", value: "5" },
      { userId: "u3", value: "8" },
    ];
    render(<VoteResults votes={votes} />);
    // Average of 3, 5, 8 = 5.3
    expect(screen.getByText("Average: 5.3")).toBeInTheDocument();
  });

  it("skips ? votes from average calculation", () => {
    const votes: VoteInfo[] = [
      { userId: "u1", value: "4" },
      { userId: "u2", value: "?" },
    ];
    render(<VoteResults votes={votes} />);
    expect(screen.getByText("Average: 4.0")).toBeInTheDocument();
  });

  it("does not show average for non-numeric votes", () => {
    const votes: VoteInfo[] = [
      { userId: "u1", value: "XL" },
      { userId: "u2", value: "L" },
    ];
    render(<VoteResults votes={votes} />);
    expect(screen.queryByText(/Average/)).not.toBeInTheDocument();
  });
});
