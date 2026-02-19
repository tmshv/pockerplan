import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { VoteCard } from "./VoteCard";

describe("VoteCard", () => {
  it("renders the value", () => {
    render(<VoteCard value="5" selected={false} disabled={false} onClick={() => {}} />);
    expect(screen.getByRole("button", { name: "5" })).toBeInTheDocument();
  });

  it("marks selected state with aria-pressed", () => {
    render(<VoteCard value="5" selected={true} disabled={false} onClick={() => {}} />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<VoteCard value="8" selected={false} disabled={false} onClick={onClick} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("is disabled when disabled prop is true", () => {
    render(<VoteCard value="3" selected={false} disabled={true} onClick={() => {}} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("applies selected class when selected", () => {
    render(<VoteCard value="5" selected={true} disabled={false} onClick={() => {}} />);
    expect(screen.getByRole("button")).toHaveClass("selected");
  });
});
