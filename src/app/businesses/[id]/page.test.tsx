import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  redirect: vi.fn(),
  notFound: vi.fn(),
  prisma: {
    business: {
      findUnique: vi.fn()
    }
  }
}));

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  notFound: mocks.notFound
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma
}));

vi.mock("@/components/CommentForm", () => ({
  default: () => <div data-testid="comment-form" />
}));

import BusinessPage from "@/app/businesses/[id]/page";

describe("BusinessPage", () => {
  it("redirects unauthenticated users", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    await BusinessPage({ params: { id: "biz-1" } });

    expect(mocks.redirect).toHaveBeenCalledWith("/auth/signin");
  });

  it("renders business details and comments", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "user-1" } });
    mocks.prisma.business.findUnique.mockResolvedValue({
      id: "biz-1",
      name: "Cafe",
      description: "Cozy spot",
      website: "https://cafe.example",
      owner: { name: "Sam", email: "sam@example.com" },
      tags: [{ tag: { id: "tag-1", name: "coffee" } }],
      comments: [
        {
          id: "comment-1",
          body: "Great!",
          createdAt: new Date("2024-01-01T00:00:00.000Z"),
          user: { name: "Alex", email: "alex@example.com" }
        }
      ]
    });

    render(await BusinessPage({ params: { id: "biz-1" } }));

    expect(screen.getByRole("heading", { name: "Cafe" })).toBeInTheDocument();
    expect(screen.getByText("Cozy spot")).toBeInTheDocument();
    expect(screen.getByText("coffee")).toBeInTheDocument();
    expect(screen.getByTestId("comment-form")).toBeInTheDocument();
    expect(screen.getByText("Great!")).toBeInTheDocument();
  });
});
