import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { User, VoteInfo } from "../types";
import { VoteResults } from "./VoteResults";

const users: User[] = [
  { id: "u1", name: "Alice", avatarId: "cat", isAdmin: true, connected: true },
  { id: "u2", name: "Bob", avatarId: "dog", isAdmin: false, connected: true },
  {
    id: "u3",
    name: "Charlie",
    avatarId: "fox",
    isAdmin: false,
    connected: true,
  },
];

describe("VoteResults", () => {
  it("shows average for numeric votes", () => {
    const votes: VoteInfo[] = [
      { userId: "u1", value: "3" },
      { userId: "u2", value: "5" },
      { userId: "u3", value: "8" },
    ];
    render(<VoteResults votes={votes} users={users} />);
    // Average of 3, 5, 8 = 5.3
    expect(screen.getByText("Average: 5.3")).toBeInTheDocument();
  });

  it("shows individual votes with user names", () => {
    const votes: VoteInfo[] = [
      { userId: "u1", value: "5" },
      { userId: "u2", value: "8" },
    ];
    render(<VoteResults votes={votes} users={users} />);
    expect(screen.getByText("Alice: 5")).toBeInTheDocument();
    expect(screen.getByText("Bob: 8")).toBeInTheDocument();
  });

  it("skips ? votes from average calculation", () => {
    const votes: VoteInfo[] = [
      { userId: "u1", value: "4" },
      { userId: "u2", value: "?" },
    ];
    render(<VoteResults votes={votes} users={users} />);
    expect(screen.getByText("Average: 4.0")).toBeInTheDocument();
  });

  it("does not show average for non-numeric votes", () => {
    const votes: VoteInfo[] = [
      { userId: "u1", value: "XL" },
      { userId: "u2", value: "L" },
    ];
    render(<VoteResults votes={votes} users={users} />);
    expect(screen.queryByText(/Average/)).not.toBeInTheDocument();
  });
});
