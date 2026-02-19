import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { AdminControls } from "./AdminControls";

describe("AdminControls", () => {
  it("disables reveal when not voting", () => {
    render(
      <AdminControls
        roomState="idle"
        hasTickets={true}
        onReveal={() => {}}
        onReset={() => {}}
        onNextTicket={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: "Reveal Votes" })).toBeDisabled();
  });

  it("enables reveal when voting", () => {
    render(
      <AdminControls
        roomState="voting"
        hasTickets={true}
        onReveal={() => {}}
        onReset={() => {}}
        onNextTicket={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: "Reveal Votes" })).toBeEnabled();
  });

  it("disables reset when idle", () => {
    render(
      <AdminControls
        roomState="idle"
        hasTickets={true}
        onReveal={() => {}}
        onReset={() => {}}
        onNextTicket={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: "Reset Votes" })).toBeDisabled();
  });

  it("disables next ticket when no tickets", () => {
    render(
      <AdminControls
        roomState="voting"
        hasTickets={false}
        onReveal={() => {}}
        onReset={() => {}}
        onNextTicket={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: "Next Ticket" })).toBeDisabled();
  });

  it("calls onReveal when clicked", async () => {
    const onReveal = vi.fn();
    render(
      <AdminControls
        roomState="voting"
        hasTickets={true}
        onReveal={onReveal}
        onReset={() => {}}
        onNextTicket={() => {}}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Reveal Votes" }));
    expect(onReveal).toHaveBeenCalledOnce();
  });

  it("calls onReset when clicked", async () => {
    const onReset = vi.fn();
    render(
      <AdminControls
        roomState="voting"
        hasTickets={true}
        onReveal={() => {}}
        onReset={onReset}
        onNextTicket={() => {}}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Reset Votes" }));
    expect(onReset).toHaveBeenCalledOnce();
  });

  it("calls onNextTicket when clicked", async () => {
    const onNextTicket = vi.fn();
    render(
      <AdminControls
        roomState="voting"
        hasTickets={true}
        onReveal={() => {}}
        onReset={() => {}}
        onNextTicket={onNextTicket}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Next Ticket" }));
    expect(onNextTicket).toHaveBeenCalledOnce();
  });
});
