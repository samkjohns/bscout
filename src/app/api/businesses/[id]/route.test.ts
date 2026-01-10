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

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma
}));

import { PATCH } from "@/app/api/businesses/[id]/route";

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

    const response = await PATCH(
      new Request("http://localhost/api/businesses/biz-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Cafe" })
      }),
      { params: { id: "biz-1" } }
    );

    expect(response.status).toBe(401);
  });

  it("rejects missing name", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "user-1" } });

    const response = await PATCH(
      new Request("http://localhost/api/businesses/biz-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "" })
      }),
      { params: { id: "biz-1" } }
    );

    expect(response.status).toBe(400);
  });

  it("returns 404 when not owner", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "user-1" } });
    mocks.prisma.business.findFirst.mockResolvedValue(null);

    const response = await PATCH(
      new Request("http://localhost/api/businesses/biz-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Cafe" })
      }),
      { params: { id: "biz-1" } }
    );

    expect(response.status).toBe(404);
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

    const response = await PATCH(
      new Request("http://localhost/api/businesses/biz-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Cafe",
          description: "Cozy",
          website: "https://cafe.example",
          tags: ["Coffee"]
        })
      }),
      { params: { id: "biz-1" } }
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(tx.business.update).toHaveBeenCalled();
    expect(tx.businessTag.deleteMany).toHaveBeenCalledWith({
      where: { businessId: "biz-1" }
    });
    expect(tx.tag.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { name: "coffee" }
      })
    );
    expect(payload.ok).toBe(true);
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

    const response = await PATCH(
      new Request("http://localhost/api/businesses/biz-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Cafe" })
      }),
      { params: { id: "biz-1" } }
    );

    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toMatch(/already added/i);
  });
});
