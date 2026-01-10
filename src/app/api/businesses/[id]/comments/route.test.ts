import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    business: {
      findUnique: vi.fn()
    },
    comment: {
      create: vi.fn()
    }
  }
}));

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma
}));

import { POST } from "@/app/api/businesses/[id]/comments/route";

describe("/api/businesses/[id]/comments", () => {
  beforeEach(() => {
    mocks.getServerSession.mockReset();
    mocks.prisma.business.findUnique.mockReset();
    mocks.prisma.comment.create.mockReset();
  });

  it("rejects unauthenticated requests", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/businesses/biz-1/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Great spot!" })
      }),
      { params: { id: "biz-1" } }
    );

    expect(response.status).toBe(401);
  });

  it("requires comment text", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "user-1" } });

    const response = await POST(
      new Request("http://localhost/api/businesses/biz-1/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "" })
      }),
      { params: { id: "biz-1" } }
    );

    expect(response.status).toBe(400);
  });

  it("returns 404 for missing business", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "user-1" } });
    mocks.prisma.business.findUnique.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/businesses/biz-1/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Great spot!" })
      }),
      { params: { id: "biz-1" } }
    );

    expect(response.status).toBe(404);
  });

  it("creates a comment", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "user-1" } });
    mocks.prisma.business.findUnique.mockResolvedValue({ id: "biz-1" });
    mocks.prisma.comment.create.mockResolvedValue({
      id: "comment-1",
      body: "Great spot!",
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      user: { name: "Sam", email: "sam@example.com" }
    });

    const response = await POST(
      new Request("http://localhost/api/businesses/biz-1/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Great spot!" })
      }),
      { params: { id: "biz-1" } }
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.prisma.comment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          businessId: "biz-1",
          userId: "user-1",
          body: "Great spot!"
        })
      })
    );
    expect(payload).toEqual({
      id: "comment-1",
      body: "Great spot!",
      createdAt: "2024-01-01T00:00:00.000Z",
      user: { name: "Sam", email: "sam@example.com" }
    });
  });
});
