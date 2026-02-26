import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AdminControls } from "./AdminControls";

const noop = () => {};

describe("AdminControls", () => {
  it("disables reveal when not voting", () => {
    render(
      <AdminControls
        roomState="idle"
        ticketsEnabled={false}
        hasPrevTicket={false}
        hasNextTicket={true}
        hasTickets={true}
        onReveal={noop}
        onReset={noop}
        onPrevTicket={noop}
        onNextTicket={noop}
        onStartFreeVote={noop}
      />,
    );
    expect(screen.getByRole("button", { name: "Reveal Votes" })).toBeDisabled();
  });

  it("enables reveal when voting", () => {
    render(
      <AdminControls
        roomState="voting"
        ticketsEnabled={false}
        hasPrevTicket={false}
        hasNextTicket={true}
        hasTickets={true}
        onReveal={noop}
        onReset={noop}
        onPrevTicket={noop}
        onNextTicket={noop}
        onStartFreeVote={noop}
      />,
    );
    expect(screen.getByRole("button", { name: "Reveal Votes" })).toBeEnabled();
  });

  it("disables reset when idle", () => {
    render(
      <AdminControls
        roomState="idle"
        ticketsEnabled={false}
        hasPrevTicket={false}
        hasNextTicket={true}
        hasTickets={true}
        onReveal={noop}
        onReset={noop}
        onPrevTicket={noop}
        onNextTicket={noop}
        onStartFreeVote={noop}
      />,
    );
    expect(screen.getByRole("button", { name: "Reset Votes" })).toBeDisabled();
  });

  it("disables next ticket when hasNextTicket is false", () => {
    render(
      <AdminControls
        roomState="voting"
        ticketsEnabled={true}
        hasPrevTicket={false}
        hasNextTicket={false}
        hasTickets={true}
        onReveal={noop}
        onReset={noop}
        onPrevTicket={noop}
        onNextTicket={noop}
        onStartFreeVote={noop}
      />,
    );
    expect(screen.getByRole("button", { name: "Next Ticket" })).toBeDisabled();
  });

  it("disables prev ticket when hasPrevTicket is false", () => {
    render(
      <AdminControls
        roomState="voting"
        ticketsEnabled={true}
        hasPrevTicket={false}
        hasNextTicket={true}
        hasTickets={true}
        onReveal={noop}
        onReset={noop}
        onPrevTicket={noop}
        onNextTicket={noop}
        onStartFreeVote={noop}
      />,
    );
    expect(screen.getByRole("button", { name: "Prev Ticket" })).toBeDisabled();
  });

  it("calls onReveal when clicked", async () => {
    const onReveal = vi.fn();
    render(
      <AdminControls
        roomState="voting"
        ticketsEnabled={false}
        hasPrevTicket={false}
        hasNextTicket={true}
        hasTickets={true}
        onReveal={onReveal}
        onReset={noop}
        onPrevTicket={noop}
        onNextTicket={noop}
        onStartFreeVote={noop}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Reveal Votes" }));
    expect(onReveal).toHaveBeenCalledOnce();
  });

  it("calls onReset when clicked", async () => {
    const onReset = vi.fn();
    render(
      <AdminControls
        roomState="voting"
        ticketsEnabled={false}
        hasPrevTicket={false}
        hasNextTicket={true}
        hasTickets={true}
        onReveal={noop}
        onReset={onReset}
        onPrevTicket={noop}
        onNextTicket={noop}
        onStartFreeVote={noop}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Reset Votes" }));
    expect(onReset).toHaveBeenCalledOnce();
  });

  it("calls onNextTicket when clicked", async () => {
    const onNextTicket = vi.fn();
    render(
      <AdminControls
        roomState="voting"
        ticketsEnabled={true}
        hasPrevTicket={false}
        hasNextTicket={true}
        hasTickets={true}
        onReveal={noop}
        onReset={noop}
        onPrevTicket={noop}
        onNextTicket={onNextTicket}
        onStartFreeVote={noop}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Next Ticket" }));
    expect(onNextTicket).toHaveBeenCalledOnce();
  });

  it("calls onPrevTicket when clicked", async () => {
    const onPrevTicket = vi.fn();
    render(
      <AdminControls
        roomState="voting"
        ticketsEnabled={true}
        hasPrevTicket={true}
        hasNextTicket={true}
        hasTickets={true}
        onReveal={noop}
        onReset={noop}
        onPrevTicket={onPrevTicket}
        onNextTicket={noop}
        onStartFreeVote={noop}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Prev Ticket" }));
    expect(onPrevTicket).toHaveBeenCalledOnce();
  });

  it("shows Start Voting when idle and no tickets", () => {
    render(
      <AdminControls
        roomState="idle"
        ticketsEnabled={false}
        hasPrevTicket={false}
        hasNextTicket={false}
        hasTickets={false}
        onReveal={noop}
        onReset={noop}
        onPrevTicket={noop}
        onNextTicket={noop}
        onStartFreeVote={noop}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Start Voting" }),
    ).toBeInTheDocument();
  });

  it("hides Start Voting when tickets exist", () => {
    render(
      <AdminControls
        roomState="idle"
        ticketsEnabled={false}
        hasPrevTicket={false}
        hasNextTicket={false}
        hasTickets={true}
        onReveal={noop}
        onReset={noop}
        onPrevTicket={noop}
        onNextTicket={noop}
        onStartFreeVote={noop}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Start Voting" }),
    ).not.toBeInTheDocument();
  });

  it("hides Start Voting when not idle and not revealed", () => {
    render(
      <AdminControls
        roomState="voting"
        ticketsEnabled={false}
        hasPrevTicket={false}
        hasNextTicket={false}
        hasTickets={false}
        onReveal={noop}
        onReset={noop}
        onPrevTicket={noop}
        onNextTicket={noop}
        onStartFreeVote={noop}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Start Voting" }),
    ).not.toBeInTheDocument();
  });

  it("shows Start Voting when revealed and no tickets (free vote cycle)", () => {
    render(
      <AdminControls
        roomState="revealed"
        ticketsEnabled={false}
        hasPrevTicket={false}
        hasNextTicket={false}
        hasTickets={false}
        onReveal={noop}
        onReset={noop}
        onPrevTicket={noop}
        onNextTicket={noop}
        onStartFreeVote={noop}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Start Voting" }),
    ).toBeInTheDocument();
  });

  it("hides Start Voting when revealed but has tickets", () => {
    render(
      <AdminControls
        roomState="revealed"
        ticketsEnabled={false}
        hasPrevTicket={false}
        hasNextTicket={false}
        hasTickets={true}
        onReveal={noop}
        onReset={noop}
        onPrevTicket={noop}
        onNextTicket={noop}
        onStartFreeVote={noop}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Start Voting" }),
    ).not.toBeInTheDocument();
  });

  it("calls onStartFreeVote when clicked", async () => {
    const onStartFreeVote = vi.fn();
    render(
      <AdminControls
        roomState="idle"
        ticketsEnabled={false}
        hasPrevTicket={false}
        hasNextTicket={false}
        hasTickets={false}
        onReveal={noop}
        onReset={noop}
        onPrevTicket={noop}
        onNextTicket={noop}
        onStartFreeVote={onStartFreeVote}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Start Voting" }));
    expect(onStartFreeVote).toHaveBeenCalledOnce();
  });
});
