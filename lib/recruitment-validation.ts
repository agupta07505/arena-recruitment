import type { EligibleYear, Position } from "@/lib/recruitment";
import { z } from "zod";

export const genderValues = ["Man", "Woman"] as const;
export type Gender = (typeof genderValues)[number];

export const academicYears = [1, 2, 3, 4, 5] as const;
export const branchOptions = [
  "Computer Science and Engineering",
  "Information Technology",
  "Electronics and Communication Engineering",
] as const;

export const profileDraftSchema = z.object({
  fullName: z.string().trim().max(120),
  scholarId: z.string().trim().max(24),
  phone: z.string().trim().max(24),
  branch: z.string().trim().max(80),
  academicYear: z.number().int().min(1).max(5).nullable(),
  gender: z.enum(genderValues).nullable(),
  availability: z.string().trim().max(2_000),
  experience: z.string().trim().max(4_000),
  motivation: z.string().trim().max(4_000),
  workLinks: z.array(z.string().trim().max(500)).max(8),
  recruitmentConsent: z.boolean(),
  reportingConsent: z.boolean(),
  staffAccessConsent: z.boolean(),
});

export type ProfileDraft = z.infer<typeof profileDraftSchema>;

export const applicationAnswerSchema = z.object({
  applicationId: z.uuid(),
  questionId: z.uuid(),
  answer: z.string().trim().max(8_000),
});

export const submissionSchema = z.object({
  applicationId: z.uuid(),
  answers: z.array(applicationAnswerSchema.omit({ applicationId: true })).max(40),
  turnstileToken: z.string().max(2_048).nullable().optional(),
});

export const applicantVisibleStatuses = [
  "draft",
  "submitted",
  "under_review",
  "shortlisted",
  "interview_scheduled",
  "interviewed",
  "selected",
  "waitlisted",
  "rejected",
  "withdrawn",
] as const;

export function formatApplicationStatus(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getStatusStep(status: string) {
  if (status === "withdrawn" || status === "rejected") return 4;
  if (status === "selected" || status === "waitlisted") return 5;
  if (status === "interviewed") return 4;
  if (status === "interview_scheduled") return 3;
  if (status === "shortlisted") return 2;
  if (status === "under_review") return 1;
  if (status === "submitted") return 0;
  return -1;
}

export function normalizeScholarId(value: string) {
  return value.trim().replace(/[\s-]+/g, "").toUpperCase();
}

export function isValidGender(value: unknown): value is Gender {
  return typeof value === "string" && genderValues.includes(value as Gender);
}

export function isEligibleForPosition(year: number, position: Position) {
  return position.eligibleYears.includes(year as EligibleYear);
}

export function getProfileReadiness(profile: ProfileDraft) {
  const checks = [
    profile.fullName.length >= 2,
    normalizeScholarId(profile.scholarId).length >= 6,
    profile.phone.replace(/\D/g, "").length >= 10,
    profile.branch.length > 0,
    profile.academicYear !== null,
    profile.gender !== null,
    profile.availability.length >= 10,
    profile.recruitmentConsent,
    profile.reportingConsent,
    profile.staffAccessConsent,
  ];

  return {
    completed: checks.filter(Boolean).length,
    percentage: Math.round((checks.filter(Boolean).length / checks.length) * 100),
    ready: checks.every(Boolean),
    total: checks.length,
  };
}
