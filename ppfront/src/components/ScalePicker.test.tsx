import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ScalePicker } from "./ScalePicker";

describe("ScalePicker", () => {
  it("renders all scale options", () => {
    render(<ScalePicker selected="fibonacci" onSelect={() => {}} />);
    const select = screen.getByLabelText("Estimation Scale");
    expect(select).toBeInTheDocument();
    expect(screen.getByText(/Fibonacci/)).toBeInTheDocument();
    expect(screen.getByText(/Power of 2/)).toBeInTheDocument();
    expect(screen.getByText(/Linear/)).toBeInTheDocument();
    expect(screen.getByText(/T-shirt/)).toBeInTheDocument();
  });

  it("shows the selected value", () => {
    render(<ScalePicker selected="tshirt" onSelect={() => {}} />);
    const select = screen.getByLabelText("Estimation Scale") as HTMLSelectElement;
    expect(select.value).toBe("tshirt");
  });

  it("calls onSelect when changing", async () => {
    const onSelect = vi.fn();
    render(<ScalePicker selected="fibonacci" onSelect={onSelect} />);
    const select = screen.getByLabelText("Estimation Scale");
    await userEvent.selectOptions(select, "linear");
    expect(onSelect).toHaveBeenCalledWith("linear");
  });
});
