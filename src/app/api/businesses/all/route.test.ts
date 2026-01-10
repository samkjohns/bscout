import { describe, expect, it, beforeEach, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    business: {
      findMany: vi.fn()
    }
  }
}));

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma
}));

import { GET } from "@/app/api/businesses/all/route";

describe("/api/businesses/all", () => {
  beforeEach(() => {
    mocks.getServerSession.mockReset();
    mocks.prisma.business.findMany.mockReset();
  });

  it("rejects unauthenticated requests", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/businesses/all")
    );

    expect(response.status).toBe(401);
  });

  it("returns all businesses with owners", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "user-1" } });
    mocks.prisma.business.findMany.mockResolvedValue([
      {
        id: "biz-1",
        name: "Cafe",
        description: null,
        website: null,
        tags: [{ tag: { name: "coffee" } }],
        owner: { name: "Sam", email: "sam@example.com" }
      }
    ]);

    const response = await GET(
      new Request("http://localhost/api/businesses/all?tag=coffee")
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.prisma.business.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ ownerId: expect.any(String) })
      })
    );
    expect(payload.businesses).toEqual([
      {
        id: "biz-1",
        name: "Cafe",
        description: null,
        website: null,
        tags: ["coffee"],
        owner: { name: "Sam", email: "sam@example.com" }
      }
    ]);
  });
});
