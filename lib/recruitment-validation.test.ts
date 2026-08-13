import { describe, expect, it } from "vitest";
import { positions } from "@/lib/recruitment";
import {
  isEligibleForPosition,
  isValidGender,
  getProfileReadiness,
  formatApplicationStatus,
  getStatusStep,
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
  const eventOpsLead = positions.find((position) => position.slug === "event-ops-lead")!;

  it("accepts every academic year for regular positions", () => {
    [1, 2, 3, 4].forEach((year) => expect(isEligibleForPosition(year, designRole)).toBe(true));
  });

  it("keeps exclusive leadership positions limited to years 3 and 4", () => {
    expect(isEligibleForPosition(1, eventOpsLead)).toBe(false);
    expect(isEligibleForPosition(2, eventOpsLead)).toBe(false);
    expect(isEligibleForPosition(3, eventOpsLead)).toBe(true);
    expect(isEligibleForPosition(4, eventOpsLead)).toBe(true);
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

describe("application status presentation", () => {
  it("formats public status labels without exposing internal details", () => {
    expect(formatApplicationStatus("interview_scheduled")).toBe("Interview Scheduled");
  });

  it("maps applicant-visible progress to the timeline", () => {
    expect(getStatusStep("submitted")).toBe(0);
    expect(getStatusStep("shortlisted")).toBe(2);
    expect(getStatusStep("selected")).toBe(5);
    expect(getStatusStep("draft")).toBe(-1);
  });
});
