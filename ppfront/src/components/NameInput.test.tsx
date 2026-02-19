import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { NameInput } from "./NameInput";

describe("NameInput", () => {
  it("renders with label and input", () => {
    render(<NameInput value="" onChange={() => {}} />);
    expect(screen.getByLabelText("Your Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter your name")).toBeInTheDocument();
  });

  it("displays the current value", () => {
    render(<NameInput value="Alice" onChange={() => {}} />);
    expect(screen.getByDisplayValue("Alice")).toBeInTheDocument();
  });

  it("calls onChange when typing", async () => {
    const onChange = vi.fn();
    render(<NameInput value="" onChange={onChange} />);
    const input = screen.getByLabelText("Your Name");
    await userEvent.type(input, "B");
    expect(onChange).toHaveBeenCalledWith("B");
  });
});
