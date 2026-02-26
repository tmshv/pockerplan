import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../context/ThemeContext";
import { UserProvider } from "../context/UserContext";
import { HomePage } from "./HomePage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockRpc = vi.fn();
vi.mock("../api/centrifuge", () => ({
  getCentrifuge: () => ({ rpc: mockRpc }),
}));

function renderHomePage() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <UserProvider>
          <HomePage />
        </UserProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe("HomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders the create room form", () => {
    renderHomePage();
    expect(screen.getByText("pockerplan")).toBeInTheDocument();
    expect(screen.getByLabelText("Your Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Estimation Scale")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create Room" }),
    ).toBeInTheDocument();
  });

  it("disables submit when name is empty", () => {
    renderHomePage();
    expect(screen.getByRole("button", { name: "Create Room" })).toBeDisabled();
  });

  it("disables submit when no avatar is selected", async () => {
    renderHomePage();
    await userEvent.type(screen.getByLabelText("Your Name"), "Alice");
    expect(screen.getByRole("button", { name: "Create Room" })).toBeDisabled();
  });

  it("enables submit when name and avatar are provided", async () => {
    renderHomePage();
    await userEvent.type(screen.getByLabelText("Your Name"), "Alice");
    await userEvent.click(screen.getByRole("radio", { name: "Cat" }));
    expect(screen.getByRole("button", { name: "Create Room" })).toBeEnabled();
  });

  it("creates room and navigates on submit", async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        roomId: "room-123",
        adminSecret: "secret-abc",
        userId: "user-456",
        state: "idle",
      },
    });

    renderHomePage();
    await userEvent.type(screen.getByLabelText("Your Name"), "Alice");
    await userEvent.click(screen.getByRole("radio", { name: "Cat" }));
    await userEvent.click(screen.getByRole("button", { name: "Create Room" }));

    expect(mockRpc).toHaveBeenCalledWith("create_room", {
      scaleId: "fibonacci",
      userName: "Alice",
      avatarId: "cat",
    });
    expect(mockNavigate).toHaveBeenCalledWith("/room/room-123");
  });

  it("shows error when create fails", async () => {
    mockRpc.mockRejectedValueOnce(new Error("connection failed"));

    renderHomePage();
    await userEvent.type(screen.getByLabelText("Your Name"), "Alice");
    await userEvent.click(screen.getByRole("radio", { name: "Cat" }));
    await userEvent.click(screen.getByRole("button", { name: "Create Room" }));

    expect(await screen.findByText("connection failed")).toBeInTheDocument();
  });
});
