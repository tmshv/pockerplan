import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { User, VoteInfo } from "../types";
import { UserList } from "./UserList";

const users: User[] = [
  { id: "u1", name: "Alice", avatarId: "cat", isAdmin: true, connected: true },
  { id: "u2", name: "Bob", avatarId: "dog", isAdmin: false, connected: true },
  {
    id: "u3",
    name: "Charlie",
    avatarId: "fox",
    isAdmin: false,
    connected: false,
  },
];

describe("UserList", () => {
  it("renders all users", () => {
    render(<UserList users={users} votes={[]} revealed={false} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();
  });

  it("shows admin badge", () => {
    render(<UserList users={users} votes={[]} revealed={false} />);
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("shows 'Voted' when user has voted but not revealed", () => {
    const votes: VoteInfo[] = [{ userId: "u1", value: "5" }];
    render(<UserList users={users} votes={votes} revealed={false} />);
    expect(screen.getByText("Voted")).toBeInTheDocument();
  });

  it("shows vote value when revealed", () => {
    const votes: VoteInfo[] = [{ userId: "u1", value: "5" }];
    render(<UserList users={users} votes={votes} revealed={true} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("marks disconnected users", () => {
    const { container } = render(
      <UserList users={users} votes={[]} revealed={false} />,
    );
    const disconnected = container.querySelectorAll(".disconnected");
    expect(disconnected).toHaveLength(1);
  });
});
