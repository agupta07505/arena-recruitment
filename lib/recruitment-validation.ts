import type { EligibleYear, Position } from "@/lib/recruitment";

export const genderValues = ["Man", "Woman"] as const;
export type Gender = (typeof genderValues)[number];

export function normalizeScholarId(value: string) {
  return value.trim().replace(/[\s-]+/g, "").toUpperCase();
}

export function isValidGender(value: unknown): value is Gender {
  return typeof value === "string" && genderValues.includes(value as Gender);
}

export function isEligibleForPosition(year: number, position: Position) {
  return position.eligibleYears.includes(year as EligibleYear);
}
