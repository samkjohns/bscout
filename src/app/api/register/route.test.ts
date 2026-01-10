import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn()
    }
  },
  bcrypt: {
    hash: vi.fn()
  }
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma
}));

vi.mock("bcryptjs", () => ({
  default: mocks.bcrypt
}));

import { POST } from "@/app/api/register/route";

describe("/api/register", () => {
  beforeEach(() => {
    mocks.prisma.user.findUnique.mockReset();
    mocks.prisma.user.create.mockReset();
    mocks.bcrypt.hash.mockReset();
  });

  it("requires email and password", async () => {
    const response = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "" })
      })
    );

    expect(response.status).toBe(400);
  });

  it("rejects existing email", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "user-1" });

    const response = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Sam",
          email: "sam@example.com",
          password: "secret"
        })
      })
    );

    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toMatch(/already registered/i);
  });

  it("creates a user", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue(null);
    mocks.bcrypt.hash.mockResolvedValue("hashed");
    mocks.prisma.user.create.mockResolvedValue({
      id: "user-1",
      email: "sam@example.com",
      name: "Sam"
    });

    const response = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Sam",
          email: "sam@example.com",
          password: "secret"
        })
      })
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.bcrypt.hash).toHaveBeenCalledWith("secret", 10);
    expect(payload).toEqual({
      id: "user-1",
      email: "sam@example.com",
      name: "Sam"
    });
  });
});
