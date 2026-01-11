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

import handler from "@/pages/api/register";

const createResponse = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn()
  };
  return res;
};

describe("/api/register", () => {
  beforeEach(() => {
    mocks.prisma.user.findUnique.mockReset();
    mocks.prisma.user.create.mockReset();
    mocks.bcrypt.hash.mockReset();
  });

  it("requires email and password", async () => {
    const req = {
      method: "POST",
      body: { email: "" }
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects existing email", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "user-1" });

    const req = {
      method: "POST",
      body: {
        name: "Sam",
        email: "sam@example.com",
        password: "secret"
      }
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: "Email is already registered."
    });
  });

  it("creates a user", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue(null);
    mocks.bcrypt.hash.mockResolvedValue("hashed");
    mocks.prisma.user.create.mockResolvedValue({
      id: "user-1",
      email: "sam@example.com",
      name: "Sam"
    });

    const req = {
      method: "POST",
      body: {
        name: "Sam",
        email: "sam@example.com",
        password: "secret"
      }
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mocks.bcrypt.hash).toHaveBeenCalledWith("secret", 10);
    expect(res.json).toHaveBeenCalledWith({
      id: "user-1",
      email: "sam@example.com",
      name: "Sam"
    });
  });
});
