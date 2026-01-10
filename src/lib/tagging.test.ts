import { describe, expect, it } from "vitest";

import { normalizeTags } from "@/lib/tagging";

describe("normalizeTags", () => {
  it("trims, lowercases, and removes blanks", () => {
    expect(normalizeTags([" Coffee ", "", "  ", "WiFi"])).toEqual([
      "coffee",
      "wifi"
    ]);
  });

  it("dedupes tags case-insensitively", () => {
    expect(normalizeTags(["Bakery", "bakery", "BAKERY"]))
      .toEqual(["bakery"]);
  });
});
