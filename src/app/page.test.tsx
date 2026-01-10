import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/Dashboard", () => ({
  default: () => null
}));

import HomePage from "@/app/page";

describe("HomePage", () => {
  it("renders hero copy and badge", () => {
    render(<HomePage />);

    expect(screen.getByText("Bscout")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /scout local businesses by the tags that matter/i
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/collect, tag, and search your business list/i)
    ).toBeInTheDocument();
  });
});
