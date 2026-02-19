import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { UserProvider } from "../context/UserContext";
import { JoinPage } from "./JoinPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockRpc = vi.fn();
vi.mock("../api/centrifuge", () => ({
  getCentrifuge: () => ({ rpc: mockRpc }),
}));

function renderJoinPage(roomId = "room-123") {
  return render(
    <MemoryRouter initialEntries={[`/room/${roomId}/join`]}>
      <UserProvider>
        <Routes>
          <Route path="/room/:id/join" element={<JoinPage />} />
        </Routes>
      </UserProvider>
    </MemoryRouter>
  );
}

describe("JoinPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders the join form", () => {
    renderJoinPage();
    expect(screen.getByRole("heading", { name: "Join Room" })).toBeInTheDocument();
    expect(screen.getByLabelText("Your Name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Join Room" })).toBeInTheDocument();
  });

  it("does not show scale picker", () => {
    renderJoinPage();
    expect(screen.queryByLabelText("Estimation Scale")).not.toBeInTheDocument();
  });

  it("disables submit when name is empty", () => {
    renderJoinPage();
    expect(screen.getByRole("button", { name: "Join Room" })).toBeDisabled();
  });

  it("joins room and navigates on submit", async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        userId: "user-789",
        state: { id: "room-123", scale: "fibonacci", state: "idle", users: [], tickets: [], currentTicketId: "" },
      },
    });

    renderJoinPage();
    await userEvent.type(screen.getByLabelText("Your Name"), "Bob");
    await userEvent.click(screen.getByRole("radio", { name: "Dog" }));
    await userEvent.click(screen.getByRole("button", { name: "Join Room" }));

    expect(mockRpc).toHaveBeenCalledWith("join_room", {
      roomId: "room-123",
      userName: "Bob",
      avatarId: "dog",
      userId: undefined,
    });
    expect(mockNavigate).toHaveBeenCalledWith("/room/room-123");
  });

  it("shows error when join fails", async () => {
    mockRpc.mockRejectedValueOnce(new Error("room not found"));

    renderJoinPage();
    await userEvent.type(screen.getByLabelText("Your Name"), "Bob");
    await userEvent.click(screen.getByRole("radio", { name: "Dog" }));
    await userEvent.click(screen.getByRole("button", { name: "Join Room" }));

    expect(await screen.findByText("room not found")).toBeInTheDocument();
  });
});
