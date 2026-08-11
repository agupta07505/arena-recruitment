import { describe, expect, it } from "vitest";
import { positions } from "@/lib/recruitment";
import {
  isEligibleForPosition,
  isValidGender,
  getProfileReadiness,
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

describe("getProfileReadiness", () => {
  const completeProfile = {
    fullName: "Aarav Sharma",
    scholarId: "22BCY041",
    phone: "+91 98765 43210",
    branch: "Computer Science and Engineering",
    academicYear: 2,
    gender: "Man" as const,
    availability: "Available after classes and on weekends.",
    experience: "",
    motivation: "",
    workLinks: [],
    recruitmentConsent: true,
    reportingConsent: true,
    staffAccessConsent: true,
  };

  it("marks a submission-ready reusable profile as complete", () => {
    expect(getProfileReadiness(completeProfile)).toEqual({ completed: 10, percentage: 100, ready: true, total: 10 });
  });

  it("keeps optional portfolio and experience fields outside readiness", () => {
    expect(getProfileReadiness({ ...completeProfile, workLinks: [], experience: "", motivation: "" }).ready).toBe(true);
  });

  it("requires all three consent checkpoints", () => {
    expect(getProfileReadiness({ ...completeProfile, staffAccessConsent: false })).toMatchObject({ completed: 9, percentage: 90, ready: false });
  });
});
