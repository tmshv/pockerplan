import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { AvatarPicker } from "./AvatarPicker";
import { avatars } from "../data/avatars";

describe("AvatarPicker", () => {
  it("renders all avatars", () => {
    render(<AvatarPicker selected="" onSelect={() => {}} />);
    for (const avatar of avatars) {
      expect(screen.getByRole("radio", { name: avatar.label })).toBeInTheDocument();
    }
  });

  it("marks selected avatar", () => {
    render(<AvatarPicker selected="fox" onSelect={() => {}} />);
    const foxBtn = screen.getByRole("radio", { name: "Fox" });
    expect(foxBtn).toHaveAttribute("aria-checked", "true");
    const catBtn = screen.getByRole("radio", { name: "Cat" });
    expect(catBtn).toHaveAttribute("aria-checked", "false");
  });

  it("calls onSelect when clicking an avatar", async () => {
    const onSelect = vi.fn();
    render(<AvatarPicker selected="" onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("radio", { name: "Owl" }));
    expect(onSelect).toHaveBeenCalledWith("owl");
  });
});
