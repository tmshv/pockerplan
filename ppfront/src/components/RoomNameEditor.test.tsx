import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RoomNameEditor } from "./RoomNameEditor";

describe("RoomNameEditor", () => {
  it("shows room name as text for guest", () => {
    render(
      <RoomNameEditor name="Sprint 42" isAdmin={false} onSave={() => {}} />,
    );
    expect(screen.getByText("Sprint 42")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("shows placeholder when name is empty for guest", () => {
    render(<RoomNameEditor name="" isAdmin={false} onSave={() => {}} />);
    expect(screen.getByText("Unnamed Room")).toBeInTheDocument();
  });

  it("shows room name as clickable button for admin", () => {
    render(
      <RoomNameEditor name="Sprint 42" isAdmin={true} onSave={() => {}} />,
    );
    expect(
      screen.getByRole("button", { name: "Sprint 42" }),
    ).toBeInTheDocument();
  });

  it("shows placeholder as clickable button for admin when name is empty", () => {
    render(<RoomNameEditor name="" isAdmin={true} onSave={() => {}} />);
    expect(
      screen.getByRole("button", { name: "Unnamed Room" }),
    ).toBeInTheDocument();
  });

  it("enters edit mode on click for admin", async () => {
    render(
      <RoomNameEditor name="Sprint 42" isAdmin={true} onSave={() => {}} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Sprint 42" }));
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("Sprint 42");
  });

  it("calls onSave with new name on Enter", async () => {
    const onSave = vi.fn();
    render(<RoomNameEditor name="Sprint 42" isAdmin={true} onSave={onSave} />);
    await userEvent.click(screen.getByRole("button", { name: "Sprint 42" }));
    await userEvent.clear(screen.getByRole("textbox"));
    await userEvent.type(screen.getByRole("textbox"), "Sprint 43{Enter}");
    expect(onSave).toHaveBeenCalledWith("Sprint 43");
  });

  it("does not call onSave if name is unchanged", async () => {
    const onSave = vi.fn();
    render(<RoomNameEditor name="Sprint 42" isAdmin={true} onSave={onSave} />);
    await userEvent.click(screen.getByRole("button", { name: "Sprint 42" }));
    await userEvent.keyboard("{Enter}");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("cancels edit on Escape", async () => {
    const onSave = vi.fn();
    render(<RoomNameEditor name="Sprint 42" isAdmin={true} onSave={onSave} />);
    await userEvent.click(screen.getByRole("button", { name: "Sprint 42" }));
    await userEvent.clear(screen.getByRole("textbox"));
    await userEvent.type(screen.getByRole("textbox"), "Changed");
    await userEvent.keyboard("{Escape}");
    expect(onSave).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Sprint 42" }),
    ).toBeInTheDocument();
  });

  it("saves on blur", async () => {
    const onSave = vi.fn();
    render(<RoomNameEditor name="Sprint 42" isAdmin={true} onSave={onSave} />);
    await userEvent.click(screen.getByRole("button", { name: "Sprint 42" }));
    await userEvent.clear(screen.getByRole("textbox"));
    await userEvent.type(screen.getByRole("textbox"), "Sprint 43");
    await userEvent.tab();
    expect(onSave).toHaveBeenCalledWith("Sprint 43");
  });
});
