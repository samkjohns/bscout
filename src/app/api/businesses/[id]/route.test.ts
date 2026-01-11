import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    business: {
      findFirst: vi.fn(),
      update: vi.fn()
    },
    businessTag: {
      deleteMany: vi.fn(),
      create: vi.fn()
    },
    tag: {
      upsert: vi.fn()
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

import handler from "@/pages/api/businesses/[id]";

const createResponse = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn()
  };
  return res;
};

describe("/api/businesses/[id]", () => {
  beforeEach(() => {
    mocks.getServerSession.mockReset();
    mocks.prisma.business.findFirst.mockReset();
    mocks.prisma.business.update.mockReset();
    mocks.prisma.businessTag.deleteMany.mockReset();
    mocks.prisma.businessTag.create.mockReset();
    mocks.prisma.tag.upsert.mockReset();
    mocks.prisma.$transaction.mockReset();
  });

  it("rejects unauthenticated requests", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    const req = { method: "PATCH", query: { id: "biz-1" }, body: { name: "Cafe" } };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("rejects missing name", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "user-1" } });

    const req = { method: "PATCH", query: { id: "biz-1" }, body: { name: "" } };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 404 when not owner", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "user-1" } });
    mocks.prisma.business.findFirst.mockResolvedValue(null);

    const req = { method: "PATCH", query: { id: "biz-1" }, body: { name: "Cafe" } };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("updates business and tags", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "user-1" } });
    mocks.prisma.business.findFirst.mockResolvedValue({
      id: "biz-1",
      ownerId: "user-1"
    });

    const tx = {
      business: {
        update: vi.fn().mockResolvedValue({})
      },
      businessTag: {
        deleteMany: vi.fn().mockResolvedValue({}),
        create: vi.fn().mockResolvedValue({})
      },
      tag: {
        upsert: vi.fn().mockResolvedValue({ id: "tag-1", name: "coffee" })
      }
    };

    mocks.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx)
    );

    const req = {
      method: "PATCH",
      query: { id: "biz-1" },
      body: {
        name: "Cafe",
        description: "Cozy",
        website: "https://cafe.example",
        tags: ["Coffee"]
      }
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(tx.business.update).toHaveBeenCalled();
    expect(tx.businessTag.deleteMany).toHaveBeenCalledWith({
      where: { businessId: "biz-1" }
    });
    expect(tx.tag.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { name: "coffee" }
      })
    );
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it("handles duplicate business names", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "user-1" } });
    mocks.prisma.business.findFirst.mockResolvedValue({
      id: "biz-1",
      ownerId: "user-1"
    });

    mocks.prisma.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Duplicate", {
        code: "P2002",
        clientVersion: "test"
      })
    );

    const req = { method: "PATCH", query: { id: "biz-1" }, body: { name: "Cafe" } };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: "You already added a business with this name."
    });
  });
});
