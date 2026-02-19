import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TicketForm } from "./TicketForm";

describe("TicketForm", () => {
  it("renders form inputs", () => {
    render(<TicketForm onAdd={async () => {}} />);
    expect(screen.getByLabelText("Ticket title")).toBeInTheDocument();
    expect(screen.getByLabelText("Ticket description")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add Ticket" }),
    ).toBeInTheDocument();
  });

  it("disables submit when title is empty", () => {
    render(<TicketForm onAdd={async () => {}} />);
    expect(screen.getByRole("button", { name: "Add Ticket" })).toBeDisabled();
  });

  it("enables submit when title is provided", async () => {
    render(<TicketForm onAdd={async () => {}} />);
    await userEvent.type(screen.getByLabelText("Ticket title"), "Test ticket");
    expect(screen.getByRole("button", { name: "Add Ticket" })).toBeEnabled();
  });

  it("calls onAdd with title and description", async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(<TicketForm onAdd={onAdd} />);
    await userEvent.type(screen.getByLabelText("Ticket title"), "My ticket");
    await userEvent.type(
      screen.getByLabelText("Ticket description"),
      "Some details",
    );
    await userEvent.click(screen.getByRole("button", { name: "Add Ticket" }));
    expect(onAdd).toHaveBeenCalledWith("My ticket", "Some details");
  });

  it("clears form after successful submit", async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(<TicketForm onAdd={onAdd} />);
    const titleInput = screen.getByLabelText("Ticket title");
    await userEvent.type(titleInput, "My ticket");
    await userEvent.click(screen.getByRole("button", { name: "Add Ticket" }));
    expect(titleInput).toHaveValue("");
  });

  it("shows error on failure", async () => {
    const onAdd = vi.fn().mockRejectedValue(new Error("Network error"));
    render(<TicketForm onAdd={onAdd} />);
    await userEvent.type(screen.getByLabelText("Ticket title"), "Fail ticket");
    await userEvent.click(screen.getByRole("button", { name: "Add Ticket" }));
    expect(await screen.findByText("Network error")).toBeInTheDocument();
  });
});
