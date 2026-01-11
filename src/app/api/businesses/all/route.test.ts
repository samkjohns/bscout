import { describe, expect, it, beforeEach, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    business: {
      findMany: vi.fn()
    }
  }
}));

vi.mock("next-auth/next", () => ({
  getServerSession: mocks.getServerSession
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma
}));

import handler from "@/pages/api/businesses/all";

const createResponse = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn()
  };
  return res;
};

describe("/api/businesses/all", () => {
  beforeEach(() => {
    mocks.getServerSession.mockReset();
    mocks.prisma.business.findMany.mockReset();
  });

  it("rejects unauthenticated requests", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    const req = { method: "GET", query: {} };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns all businesses with owners", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "user-1" } });
    mocks.prisma.business.findMany.mockResolvedValue([
      {
        id: "biz-1",
        ownerId: "user-9",
        name: "Cafe",
        description: null,
        website: null,
        tags: [{ tag: { name: "coffee" } }],
        owner: { name: "Sam", email: "sam@example.com" }
      }
    ]);

    const req = { method: "GET", query: { tag: "coffee" } };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mocks.prisma.business.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ ownerId: expect.any(String) })
      })
    );
    expect(res.json).toHaveBeenCalledWith({
      businesses: [
        {
          id: "biz-1",
          ownerId: "user-9",
          name: "Cafe",
          description: null,
          website: null,
          tags: ["coffee"],
          owner: { name: "Sam", email: "sam@example.com" }
        }
      ]
    });
  });
});
