import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    $transaction: vi.fn()
  },
  formidable: {
    parse: vi.fn()
  },
  readFile: vi.fn(),
  xlsx: {
    read: vi.fn(),
    utils: {
      sheet_to_json: vi.fn()
    }
  },
  fetch: vi.fn()
}));

vi.mock("next-auth/next", () => ({
  getServerSession: mocks.getServerSession
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma
}));

vi.mock("formidable", () => {
  return {
    default: () => ({
      parse: mocks.formidable.parse
    })
  };
});

vi.mock("node:fs/promises", () => ({
  readFile: mocks.readFile,
  default: { readFile: mocks.readFile }
}));

vi.mock("xlsx", () => ({
  default: mocks.xlsx
}));

global.fetch = mocks.fetch as unknown as typeof fetch;

import handler from "@/pages/api/businesses/bulk";

const createResponse = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn()
  };
  return res;
};

const mockFormParse = (files: Record<string, { filepath: string }>) => {
  mocks.formidable.parse.mockImplementation((_req, cb) => {
    cb(null, {}, files);
  });
};

describe("/api/businesses/bulk", () => {
  beforeEach(() => {
    mocks.getServerSession.mockReset();
    mocks.prisma.$transaction.mockReset();
    mocks.formidable.parse.mockReset();
    mocks.readFile.mockReset();
    mocks.xlsx.read.mockReset();
    mocks.xlsx.utils.sheet_to_json.mockReset();
    mocks.fetch.mockReset();
  });

  it("returns preview without writing", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "user-1" } });
    mockFormParse({ file: { filepath: "/tmp/file.xlsx" } });
    mocks.readFile.mockResolvedValue(Buffer.from(""));
    mocks.xlsx.read.mockReturnValue({ SheetNames: ["Sheet1"], Sheets: { Sheet1: {} } });
    mocks.xlsx.utils.sheet_to_json.mockReturnValue([ ["Name", "Tags"], ["Cafe", "coffee"] ]);
    mocks.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        output: [
          {
            content: [
              {
                text: JSON.stringify([
                  { name: "Cafe", tags: ["coffee"] }
                ])
              }
            ]
          }
        ]
      })
    });

    const req = { method: "POST", query: { preview: "true" } };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      created: 0,
      skipped: 0,
      errors: [],
      preview: [{ name: "Cafe", tags: ["coffee"] }],
      totalParsed: 1
    });
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("requires auth", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    const req = { method: "POST", query: {} };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.status).toHaveBeenCalledWith(401);
  });
});
