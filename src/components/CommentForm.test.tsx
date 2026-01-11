import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  fetch: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh })
}));

global.fetch = mocks.fetch as unknown as typeof fetch;

import CommentForm from "@/components/CommentForm";

describe("CommentForm", () => {
  afterEach(() => {
    cleanup();
    mocks.fetch.mockReset();
  });

  it("submits a comment and refreshes", async () => {
    mocks.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });

    render(<CommentForm businessId="biz-1" />);

    fireEvent.change(screen.getByLabelText(/comment/i), {
      target: { value: "Nice place" }
    });

    fireEvent.click(screen.getByRole("button", { name: /post comment/i }));

    expect(mocks.fetch).toHaveBeenCalledWith(
      "/api/businesses/biz-1/comments",
      expect.objectContaining({
        method: "POST"
      })
    );
  });

  it("shows errors from the API", async () => {
    mocks.fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Nope" })
    });

    render(<CommentForm businessId="biz-1" />);

    fireEvent.change(screen.getByLabelText(/comment/i), {
      target: { value: "Nope" }
    });

    fireEvent.click(screen.getByRole("button", { name: /post comment/i }));

    expect(await screen.findByText("Nope")).toBeInTheDocument();
  });
});
