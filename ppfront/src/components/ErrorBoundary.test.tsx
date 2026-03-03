import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ErrorBoundary from "./ErrorBoundary";

function BrokenComponent(): React.ReactElement {
  throw new Error("boom");
}

describe("ErrorBoundary", () => {
  it("renders fallback UI when a child throws", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    spy.mockRestore();
  });

  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <span>ok</span>
      </ErrorBoundary>
    );
    expect(screen.getByText("ok")).toBeInTheDocument();
  });
});
