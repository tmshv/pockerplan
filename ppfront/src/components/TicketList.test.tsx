import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TicketSnapshot } from "../types";
import { TicketList } from "./TicketList";

const tickets: TicketSnapshot[] = [
  { id: "t1", content: "First ticket", status: "revealed", votes: [] },
  { id: "t2", content: "Second ticket", status: "voting", votes: [] },
  { id: "t3", content: "Third ticket", status: "pending", votes: [] },
];

describe("TicketList", () => {
  it("renders empty state when no tickets", () => {
    render(
      <TicketList
        tickets={[]}
        currentTicketId=""
        isAdmin={false}
        onSelectTicket={() => {}}
      />,
    );
    expect(screen.getByText("No tickets yet")).toBeInTheDocument();
  });

  it("renders all tickets with index numbers", () => {
    render(
      <TicketList
        tickets={tickets}
        currentTicketId="t2"
        isAdmin={false}
        onSelectTicket={() => {}}
      />,
    );
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("First ticket")).toBeInTheDocument();
    expect(screen.getByText("Second ticket")).toBeInTheDocument();
    expect(screen.getByText("Third ticket")).toBeInTheDocument();
  });

  it("shows status badges", () => {
    render(
      <TicketList
        tickets={tickets}
        currentTicketId="t2"
        isAdmin={false}
        onSelectTicket={() => {}}
      />,
    );
    expect(screen.getByText("revealed")).toBeInTheDocument();
    expect(screen.getByText("voting")).toBeInTheDocument();
    expect(screen.getByText("pending")).toBeInTheDocument();
  });

  it("highlights current ticket", () => {
    const { container } = render(
      <TicketList
        tickets={tickets}
        currentTicketId="t2"
        isAdmin={false}
        onSelectTicket={() => {}}
      />,
    );
    const currentItems = container.querySelectorAll(
      ".ticket-list-item.current",
    );
    expect(currentItems).toHaveLength(1);
    expect(
      currentItems[0].querySelector(".ticket-list-content")?.textContent,
    ).toBe("Second ticket");
  });

  it("admin can click non-current tickets", () => {
    const onSelect = vi.fn();
    render(
      <TicketList
        tickets={tickets}
        currentTicketId="t2"
        isAdmin={true}
        onSelectTicket={onSelect}
      />,
    );
    fireEvent.click(screen.getByText("First ticket"));
    expect(onSelect).toHaveBeenCalledWith("t1");
  });

  it("admin cannot click current ticket", () => {
    const onSelect = vi.fn();
    render(
      <TicketList
        tickets={tickets}
        currentTicketId="t2"
        isAdmin={true}
        onSelectTicket={onSelect}
      />,
    );
    fireEvent.click(screen.getByText("Second ticket"));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("non-admin clicks do nothing", () => {
    const onSelect = vi.fn();
    render(
      <TicketList
        tickets={tickets}
        currentTicketId="t2"
        isAdmin={false}
        onSelectTicket={onSelect}
      />,
    );
    fireEvent.click(screen.getByText("First ticket"));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("truncates long ticket content", () => {
    const longTickets: TicketSnapshot[] = [
      {
        id: "t1",
        content:
          "This is a very long ticket description that should be truncated at fifty characters",
        status: "pending",
        votes: [],
      },
    ];
    render(
      <TicketList
        tickets={longTickets}
        currentTicketId=""
        isAdmin={false}
        onSelectTicket={() => {}}
      />,
    );
    expect(
      screen.getByText("This is a very long ticket description that should..."),
    ).toBeInTheDocument();
  });

  it("uses first line only for multiline content", () => {
    const multilineTickets: TicketSnapshot[] = [
      {
        id: "t1",
        content: "First line\nSecond line\nThird line",
        status: "pending",
        votes: [],
      },
    ];
    render(
      <TicketList
        tickets={multilineTickets}
        currentTicketId=""
        isAdmin={false}
        onSelectTicket={() => {}}
      />,
    );
    expect(screen.getByText("First line")).toBeInTheDocument();
  });

  it("shows Untitled for empty content", () => {
    const emptyTickets: TicketSnapshot[] = [
      { id: "t1", content: "", status: "pending", votes: [] },
    ];
    render(
      <TicketList
        tickets={emptyTickets}
        currentTicketId=""
        isAdmin={false}
        onSelectTicket={() => {}}
      />,
    );
    expect(screen.getByText("Untitled")).toBeInTheDocument();
  });

  it("disables clicks when onSelectTicket is undefined", () => {
    const { container } = render(
      <TicketList tickets={tickets} currentTicketId="t2" isAdmin={true} />,
    );
    const items = container.querySelectorAll(".ticket-list-item.clickable");
    expect(items).toHaveLength(0);
  });
});
