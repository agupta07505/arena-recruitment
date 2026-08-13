import { describe, expect, it } from "vitest";
import { applicationSchema } from "./schema";

const baseApplication = {
  positionIds: ["20000000-0000-4000-8000-000000000001"],
  fullName: "Arena Applicant",
  scholarId: "2312345",
  branch: "CSE Core",
  year: "3",
  gender: "Female",
  phone: "9876543210",
  email: "applicant@example.com",
  experience: "Event volunteering",
  links: "",
};

describe("public application input", () => {
  it("accepts a B.Tech application without a degree field", () => {
    expect(applicationSchema.safeParse(baseApplication).success).toBe(true);
  });

  it("accepts up to four distinct positions", () => {
    const positionIds = [1, 2, 3, 4].map((value) => `20000000-0000-4000-8000-00000000000${value}`);
    expect(applicationSchema.safeParse({ ...baseApplication, positionIds }).success).toBe(true);
  });

  it("rejects more than four or duplicate positions", () => {
    const positionIds = [1, 2, 3, 4, 5].map((value) => `20000000-0000-4000-8000-00000000000${value}`);
    expect(applicationSchema.safeParse({ ...baseApplication, positionIds }).success).toBe(false);
    expect(applicationSchema.safeParse({ ...baseApplication, positionIds: [positionIds[0], positionIds[0]] }).success).toBe(false);
  });

  it("accepts only male or female gender values", () => {
    expect(applicationSchema.safeParse({ ...baseApplication, gender: "Male" }).success).toBe(true);
    expect(applicationSchema.safeParse({ ...baseApplication, gender: "Third gender" }).success).toBe(false);
  });
});
