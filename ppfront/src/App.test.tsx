import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { UserProvider } from "./context/UserContext";
import { HomePage } from "./pages/HomePage";
import { JoinPage } from "./pages/JoinPage";
import { RoomPage } from "./pages/RoomPage";
import { Routes, Route, Link } from "react-router-dom";

const mockSub = {
  on: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  removeAllListeners: vi.fn(),
};
vi.mock("./api/centrifuge", () => ({
  getCentrifuge: () => ({
    rpc: vi.fn(),
    newSubscription: () => mockSub,
    removeSubscription: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  }),
}));

function NotFound() {
  return (
    <div className="page">
      <div className="error-state">
        <h2>Page Not Found</h2>
        <p>The page you are looking for does not exist.</p>
        <Link to="/" className="error-home-link">Go Home</Link>
      </div>
    </div>
  );
}

function renderWithRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <UserProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/room/:id/join" element={<JoinPage />} />
          <Route path="/room/:id" element={<RoomPage />} />
          <Route path="*" element={<NotFound />} />
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

  it("redirects to join when not joined", () => {
    renderWithRoute("/room/abc");
    expect(screen.getByRole("heading", { name: "Join Room" })).toBeInTheDocument();
  });

  it("renders RoomPage when room info exists", () => {
    localStorage.setItem(
      "pockerplan_room_abc",
      JSON.stringify({ userId: "u1" })
    );
    renderWithRoute("/room/abc");
    expect(screen.getByText("Connecting...")).toBeInTheDocument();
    localStorage.clear();
  });

  it("renders NotFound for unknown routes", () => {
    renderWithRoute("/unknown-page");
    expect(screen.getByText("Page Not Found")).toBeInTheDocument();
    expect(screen.getByText("Go Home")).toBeInTheDocument();
  });
});
