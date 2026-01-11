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

vi.mock("next-auth/next", () => ({
  getServerSession: mocks.getServerSession
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma
}));

import handler from "@/pages/api/businesses/[id]/comments";

const createResponse = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn()
  };
  return res;
};

describe("/api/businesses/[id]/comments", () => {
  beforeEach(() => {
    mocks.getServerSession.mockReset();
    mocks.prisma.business.findUnique.mockReset();
    mocks.prisma.comment.create.mockReset();
  });

  it("rejects unauthenticated requests", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    const req = {
      method: "POST",
      query: { id: "biz-1" },
      body: { text: "Great spot!" }
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("requires comment text", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "user-1" } });

    const req = {
      method: "POST",
      query: { id: "biz-1" },
      body: { text: "" }
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 404 for missing business", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "user-1" } });
    mocks.prisma.business.findUnique.mockResolvedValue(null);

    const req = {
      method: "POST",
      query: { id: "biz-1" },
      body: { text: "Great spot!" }
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.status).toHaveBeenCalledWith(404);
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

    const req = {
      method: "POST",
      query: { id: "biz-1" },
      body: { text: "Great spot!" }
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mocks.prisma.comment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          businessId: "biz-1",
          userId: "user-1",
          body: "Great spot!"
        })
      })
    );
    expect(res.json).toHaveBeenCalledWith({
      id: "comment-1",
      body: "Great spot!",
      createdAt: "2024-01-01T00:00:00.000Z",
      user: { name: "Sam", email: "sam@example.com" }
    });
  });
});
