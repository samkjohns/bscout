import { describe, expect, it, beforeEach, vi } from "vitest";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    business: {
      findMany: vi.fn()
    },
    $transaction: vi.fn()
  }
}));

vi.mock("next-auth/next", () => ({
  getServerSession: mocks.getServerSession
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma
}));

import handler from "@/pages/api/businesses";

const createResponse = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn()
  };
  return res;
};

describe("/api/businesses", () => {
  beforeEach(() => {
    mocks.getServerSession.mockReset();
    mocks.prisma.business.findMany.mockReset();
    mocks.prisma.$transaction.mockReset();
  });

  it("rejects unauthenticated GET", async () => {
    mocks.getServerSession.mockResolvedValue(null);
    const req = { method: "GET", query: {} };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("filters businesses by tag", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "user-1" } });
    mocks.prisma.business.findMany.mockResolvedValue([
      {
        id: "biz-1",
        ownerId: "user-1",
        name: "Cafe",
        description: "Neighborhood spot",
        website: null,
        tags: [{ tag: { name: "coffee" } }]
      }
    ]);

    const req = { method: "GET", query: { tag: "coffee" } };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mocks.prisma.business.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ownerId: "user-1",
          tags: expect.any(Object)
        })
      })
    );
    expect(res.json).toHaveBeenCalledWith({
      businesses: [
        {
          id: "biz-1",
          ownerId: "user-1",
          name: "Cafe",
          description: "Neighborhood spot",
          website: null,
          tags: ["coffee"]
        }
      ]
    });
  });

  it("creates a business with tags", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "user-1" } });

    const tx = {
      business: {
        create: vi.fn().mockResolvedValue({ id: "biz-1", name: "Cafe" })
      },
      tag: {
        upsert: vi.fn().mockResolvedValue({ id: "tag-1", name: "coffee" })
      },
      businessTag: {
        create: vi.fn().mockResolvedValue({})
      }
    };

    mocks.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx)
    );

    const req = {
      method: "POST",
      body: {
        name: "Cafe",
        description: "Neighborhood spot",
        website: "https://cafe.example",
        tags: ["Coffee"]
      }
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(tx.business.create).toHaveBeenCalled();
    expect(tx.tag.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { name: "coffee" }
      })
    );
    expect(res.json).toHaveBeenCalledWith({ id: "biz-1", name: "Cafe" });
  });

  it("handles duplicate business names", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "user-1" } });

    mocks.prisma.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Duplicate", {
        code: "P2002",
        clientVersion: "test"
      })
    );

    const req = {
      method: "POST",
      body: {
        name: "Cafe"
      }
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: "You already added a business with this name."
    });
  });
});
