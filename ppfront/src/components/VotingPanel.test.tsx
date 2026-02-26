import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { VotingPanel } from "./VotingPanel";

describe("VotingPanel", () => {
  it("renders cards for the fibonacci scale", () => {
    render(
      <VotingPanel
        scaleId="fibonacci"
        selectedValue={null}
        disabled={false}
        onVote={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "0" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "13" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "?" })).toBeInTheDocument();
  });

  it("renders cards for the tshirt scale", () => {
    render(
      <VotingPanel
        scaleId="tshirt"
        selectedValue={null}
        disabled={false}
        onVote={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "XS" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "XXL" })).toBeInTheDocument();
  });

  it("marks selected value", () => {
    render(
      <VotingPanel
        scaleId="fibonacci"
        selectedValue="5"
        disabled={false}
        onVote={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "5" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "3" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("calls onVote when a card is clicked", async () => {
    const onVote = vi.fn();
    render(
      <VotingPanel
        scaleId="fibonacci"
        selectedValue={null}
        disabled={false}
        onVote={onVote}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "8" }));
    expect(onVote).toHaveBeenCalledWith("8");
  });

  it("calls onVote when the already-selected card is clicked again", async () => {
    const onVote = vi.fn();
    render(
      <VotingPanel
        scaleId="fibonacci"
        selectedValue="5"
        disabled={false}
        onVote={onVote}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "5" }));
    expect(onVote).toHaveBeenCalledWith("5");
  });

  it("disables all cards when disabled", () => {
    render(
      <VotingPanel
        scaleId="fibonacci"
        selectedValue={null}
        disabled={true}
        onVote={() => {}}
      />,
    );
    const buttons = screen.getAllByRole("button");
    for (const btn of buttons) {
      expect(btn).toBeDisabled();
    }
  });
});
