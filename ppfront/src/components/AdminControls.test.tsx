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
        hasPrevTicket={false}
        hasNextTicket={true}
        onReveal={noop}
        onReset={noop}
        onPrevTicket={noop}
        onNextTicket={noop}
      />,
    );
    expect(screen.getByRole("button", { name: "Reveal Votes" })).toBeDisabled();
  });

  it("enables reveal when voting", () => {
    render(
      <AdminControls
        roomState="voting"
        hasPrevTicket={false}
        hasNextTicket={true}
        onReveal={noop}
        onReset={noop}
        onPrevTicket={noop}
        onNextTicket={noop}
      />,
    );
    expect(screen.getByRole("button", { name: "Reveal Votes" })).toBeEnabled();
  });

  it("disables reset when idle", () => {
    render(
      <AdminControls
        roomState="idle"
        hasPrevTicket={false}
        hasNextTicket={true}
        onReveal={noop}
        onReset={noop}
        onPrevTicket={noop}
        onNextTicket={noop}
      />,
    );
    expect(screen.getByRole("button", { name: "Reset Votes" })).toBeDisabled();
  });

  it("disables next ticket when hasNextTicket is false", () => {
    render(
      <AdminControls
        roomState="voting"
        hasPrevTicket={false}
        hasNextTicket={false}
        onReveal={noop}
        onReset={noop}
        onPrevTicket={noop}
        onNextTicket={noop}
      />,
    );
    expect(screen.getByRole("button", { name: "Next Ticket" })).toBeDisabled();
  });

  it("disables prev ticket when hasPrevTicket is false", () => {
    render(
      <AdminControls
        roomState="voting"
        hasPrevTicket={false}
        hasNextTicket={true}
        onReveal={noop}
        onReset={noop}
        onPrevTicket={noop}
        onNextTicket={noop}
      />,
    );
    expect(screen.getByRole("button", { name: "Prev Ticket" })).toBeDisabled();
  });

  it("calls onReveal when clicked", async () => {
    const onReveal = vi.fn();
    render(
      <AdminControls
        roomState="voting"
        hasPrevTicket={false}
        hasNextTicket={true}
        onReveal={onReveal}
        onReset={noop}
        onPrevTicket={noop}
        onNextTicket={noop}
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
        hasPrevTicket={false}
        hasNextTicket={true}
        onReveal={noop}
        onReset={onReset}
        onPrevTicket={noop}
        onNextTicket={noop}
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
        hasPrevTicket={false}
        hasNextTicket={true}
        onReveal={noop}
        onReset={noop}
        onPrevTicket={noop}
        onNextTicket={onNextTicket}
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
        hasPrevTicket={true}
        hasNextTicket={true}
        onReveal={noop}
        onReset={noop}
        onPrevTicket={onPrevTicket}
        onNextTicket={noop}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Prev Ticket" }));
    expect(onPrevTicket).toHaveBeenCalledOnce();
  });
});
