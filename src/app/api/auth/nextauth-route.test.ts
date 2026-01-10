import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  NextAuth: vi.fn(() => "handler"),
  authOptions: { providers: [] }
}));

vi.mock("next-auth", () => ({
  default: mocks.NextAuth
}));

vi.mock("@/lib/auth", () => ({
  authOptions: mocks.authOptions
}));

import { GET, POST } from "@/app/api/auth/[...nextauth]/route";

describe("/api/auth/[...nextauth]", () => {
  it("wires GET and POST to NextAuth handler", () => {
    expect(mocks.NextAuth).toHaveBeenCalledWith(mocks.authOptions);
    expect(GET).toBe("handler");
    expect(POST).toBe("handler");
  });
});
