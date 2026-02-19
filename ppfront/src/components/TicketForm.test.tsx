import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TicketForm } from "./TicketForm";

vi.mock("./MarkdownEditor");

describe("TicketForm", () => {
  it("renders form with editor and submit button", () => {
    render(<TicketForm onAdd={async () => {}} />);
    expect(screen.getByLabelText("Ticket content")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add Ticket" }),
    ).toBeInTheDocument();
  });

  it("disables submit when content is empty", () => {
    render(<TicketForm onAdd={async () => {}} />);
    expect(screen.getByRole("button", { name: "Add Ticket" })).toBeDisabled();
  });

  it("enables submit when content is provided", async () => {
    render(<TicketForm onAdd={async () => {}} />);
    await userEvent.type(screen.getByLabelText("Ticket content"), "Some content");
    expect(screen.getByRole("button", { name: "Add Ticket" })).toBeEnabled();
  });

  it("calls onAdd with content", async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(<TicketForm onAdd={onAdd} />);
    await userEvent.type(screen.getByLabelText("Ticket content"), "# My ticket");
    await userEvent.click(screen.getByRole("button", { name: "Add Ticket" }));
    expect(onAdd).toHaveBeenCalledWith("# My ticket");
  });

  it("clears form after successful submit", async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(<TicketForm onAdd={onAdd} />);
    const editor = screen.getByLabelText("Ticket content");
    await userEvent.type(editor, "My ticket");
    await userEvent.click(screen.getByRole("button", { name: "Add Ticket" }));
    expect(editor).toHaveValue("");
  });

  it("shows error on failure", async () => {
    const onAdd = vi.fn().mockRejectedValue(new Error("Network error"));
    render(<TicketForm onAdd={onAdd} />);
    await userEvent.type(screen.getByLabelText("Ticket content"), "Fail ticket");
    await userEvent.click(screen.getByRole("button", { name: "Add Ticket" }));
    expect(await screen.findByText("Network error")).toBeInTheDocument();
  });
});
