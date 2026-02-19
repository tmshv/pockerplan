import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { UserProvider } from "./context/UserContext";
import { HomePage } from "./pages/HomePage";
import { JoinPage } from "./pages/JoinPage";
import { RoomPage } from "./pages/RoomPage";
import { Routes, Route } from "react-router-dom";

vi.mock("./api/centrifuge", () => ({
  getCentrifuge: () => ({ rpc: vi.fn() }),
}));

function renderWithRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <UserProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/room/:id/join" element={<JoinPage />} />
          <Route path="/room/:id" element={<RoomPage />} />
        </Routes>
      </UserProvider>
    </MemoryRouter>
  );
}

describe("App routing", () => {
  it("renders HomePage at /", () => {
    renderWithRoute("/");
    expect(screen.getByText("Planning Poker")).toBeInTheDocument();
  });

  it("renders JoinPage at /room/:id/join", () => {
    renderWithRoute("/room/abc/join");
    expect(screen.getByRole("heading", { name: "Join Room" })).toBeInTheDocument();
  });

  it("renders RoomPage at /room/:id", () => {
    renderWithRoute("/room/abc");
    expect(screen.getByText("Room abc")).toBeInTheDocument();
  });
});
