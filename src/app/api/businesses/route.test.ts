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

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma
}));

import { GET, POST } from "@/app/api/businesses/route";

describe("/api/businesses", () => {
  beforeEach(() => {
    mocks.getServerSession.mockReset();
    mocks.prisma.business.findMany.mockReset();
    mocks.prisma.$transaction.mockReset();
  });

  it("rejects unauthenticated GET", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/businesses"));

    expect(response.status).toBe(401);
  });

  it("filters businesses by tag", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "user-1" } });
    mocks.prisma.business.findMany.mockResolvedValue([
      {
        id: "biz-1",
        name: "Cafe",
        description: "Neighborhood spot",
        website: null,
        tags: [{ tag: { name: "coffee" } }]
      }
    ]);

    const response = await GET(
      new Request("http://localhost/api/businesses?tag=coffee")
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.prisma.business.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ownerId: "user-1",
          tags: expect.any(Object)
        })
      })
    );
    expect(payload.businesses).toEqual([
      {
        id: "biz-1",
        name: "Cafe",
        description: "Neighborhood spot",
        website: null,
        tags: ["coffee"]
      }
    ]);
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

    const response = await POST(
      new Request("http://localhost/api/businesses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: "Cafe",
          description: "Neighborhood spot",
          website: "https://cafe.example",
          tags: ["Coffee"]
        })
      })
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(tx.business.create).toHaveBeenCalled();
    expect(tx.tag.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { name: "coffee" }
      })
    );
    expect(payload).toEqual({ id: "biz-1", name: "Cafe" });
  });

  it("handles duplicate business names", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "user-1" } });

    mocks.prisma.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Duplicate", {
        code: "P2002",
        clientVersion: "test"
      })
    );

    const response = await POST(
      new Request("http://localhost/api/businesses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: "Cafe"
        })
      })
    );

    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toMatch(/already added/i);
  });
});
