import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  status: "authenticated",
  push: vi.fn(),
  fetch: vi.fn()
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ status: mocks.status })
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push })
}));

global.fetch = mocks.fetch as unknown as typeof fetch;

import BusinessPage from "@/app/businesses/[id]/page";

describe("BusinessPage", () => {
  it("redirects unauthenticated users", async () => {
    mocks.status = "unauthenticated";

    render(<BusinessPage params={{ id: "biz-1" }} />);

    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith("/auth/signin");
    });
  });

  it("renders business details", async () => {
    mocks.status = "authenticated";
    mocks.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "biz-1",
        ownerId: "user-1",
        name: "Cafe",
        description: "Cozy spot",
        website: "https://cafe.example",
        tags: ["coffee"],
        owner: { name: "Sam", email: "sam@example.com" },
        comments: [
          {
            id: "comment-1",
            body: "Great!",
            createdAt: "2024-01-01T00:00:00.000Z",
            user: { name: "Alex", email: "alex@example.com" }
          }
        ]
      })
    });

    render(<BusinessPage params={{ id: "biz-1" }} />);

    expect(await screen.findByRole("heading", { name: "Cafe" })).toBeInTheDocument();
    expect(screen.getByText("Cozy spot")).toBeInTheDocument();
    expect(screen.getByText("coffee")).toBeInTheDocument();
    expect(screen.getByText("Great!")).toBeInTheDocument();
  });
});
