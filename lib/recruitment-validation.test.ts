import { describe, expect, it } from "vitest";
import { positions } from "@/lib/recruitment";
import {
  isEligibleForPosition,
  isValidGender,
  normalizeScholarId,
} from "@/lib/recruitment-validation";

describe("normalizeScholarId", () => {
  it("creates a stable uppercase identifier", () => {
    expect(normalizeScholarId("  22-bcy 041 ")).toBe("22BCY041");
  });
});

describe("isValidGender", () => {
  it.each(["Man", "Woman"])("accepts %s", (value) => {
    expect(isValidGender(value)).toBe(true);
  });

  it.each(["man", "woman", "", null])("rejects %s", (value) => {
    expect(isValidGender(value)).toBe(false);
  });
});

describe("isEligibleForPosition", () => {
  const designRole = positions.find((position) => position.slug === "graphic-designer")!;

  it("accepts configured academic years", () => {
    expect(isEligibleForPosition(1, designRole)).toBe(true);
    expect(isEligibleForPosition(2, designRole)).toBe(true);
  });

  it("rejects unconfigured academic years", () => {
    expect(isEligibleForPosition(3, designRole)).toBe(false);
  });
});
