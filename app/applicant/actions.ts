"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  applicationAnswerSchema,
  getProfileReadiness,
  normalizeScholarId,
  profileDraftSchema,
  type ProfileDraft,
} from "@/lib/recruitment-validation";
import { createClient } from "@/lib/supabase/server";

export type ApplicantActionResult = {
  ok: boolean;
  message: string;
  savedAt?: string;
  applicationId?: string;
  readiness?: number;
};

async function getAuthenticatedApplicant() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Your session has expired. Sign in again." } as const;
  return { supabase, user } as const;
}

function nullableText(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeWorkLinks(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean);
}

export async function saveProfileAction(input: ProfileDraft): Promise<ApplicantActionResult> {
  const parsed = profileDraftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Some profile fields are too long or invalid." };

  const auth = await getAuthenticatedApplicant();
  if ("error" in auth) return { ok: false, message: auth.error ?? "Your session has expired. Sign in again." };

  const profile = parsed.data;
  const now = new Date().toISOString();
  const { error } = await auth.supabase.from("profiles").upsert({
    id: auth.user.id,
    email: auth.user.email,
    full_name: nullableText(profile.fullName),
    scholar_id: nullableText(normalizeScholarId(profile.scholarId)),
    phone: nullableText(profile.phone),
    branch: nullableText(profile.branch),
    academic_year: profile.academicYear,
    gender: profile.gender,
    availability: nullableText(profile.availability),
    experience: nullableText(profile.experience),
    motivation: nullableText(profile.motivation),
    work_links: normalizeWorkLinks(profile.workLinks),
    recruitment_consent_at: profile.recruitmentConsent ? now : null,
    reporting_consent_at: profile.reportingConsent ? now : null,
    staff_access_consent_at: profile.staffAccessConsent ? now : null,
  }, { onConflict: "id" });

  if (error) {
    const message = error.code === "23505"
      ? "That scholar ID is already linked to another account."
      : "We could not save your profile. Try again.";
    return { ok: false, message };
  }

  const readiness = getProfileReadiness(profile);
  revalidatePath("/applicant");
  return { ok: true, message: readiness.ready ? "Profile ready" : "Draft saved", savedAt: now, readiness: readiness.percentage };
}

export async function createDraftApplicationAction(positionId: string): Promise<ApplicantActionResult> {
  const parsedId = z.uuid().safeParse(positionId);
  if (!parsedId.success) return { ok: false, message: "That position is not available." };

  const auth = await getAuthenticatedApplicant();
  if ("error" in auth) return { ok: false, message: auth.error ?? "Your session has expired. Sign in again." };

  const [{ data: profile }, { data: position }] = await Promise.all([
    auth.supabase.from("profiles").select("academic_year, full_name, scholar_id, phone, branch, gender, availability, recruitment_consent_at, reporting_consent_at, staff_access_consent_at").eq("id", auth.user.id).maybeSingle(),
    auth.supabase.from("positions").select("id, campaign_id, eligible_years, campaigns!inner(status, is_published, opens_at, closes_at)").eq("id", parsedId.data).maybeSingle(),
  ]);

  if (!profile || !position) return { ok: false, message: "Complete your profile and choose an active position." };
  const profileDraft: ProfileDraft = {
    fullName: profile.full_name ?? "",
    scholarId: profile.scholar_id ?? "",
    phone: profile.phone ?? "",
    branch: profile.branch ?? "",
    academicYear: profile.academic_year,
    gender: profile.gender,
    availability: profile.availability ?? "",
    experience: "",
    motivation: "",
    workLinks: [],
    recruitmentConsent: Boolean(profile.recruitment_consent_at),
    reportingConsent: Boolean(profile.reporting_consent_at),
    staffAccessConsent: Boolean(profile.staff_access_consent_at),
  };
  if (!getProfileReadiness(profileDraft).ready) return { ok: false, message: "Finish the required profile fields before starting an application." };
  if (!position.eligible_years.includes(profile.academic_year)) return { ok: false, message: "Your academic year is not eligible for this position." };

  const { data: existing } = await auth.supabase.from("applications").select("id").eq("applicant_id", auth.user.id).eq("position_id", position.id).maybeSingle();
  if (existing) return { ok: true, message: "Opening existing draft", applicationId: existing.id };

  const { data: application, error } = await auth.supabase.from("applications").insert({
    applicant_id: auth.user.id,
    campaign_id: position.campaign_id,
    position_id: position.id,
    status: "draft",
  }).select("id").single();

  if (error || !application) return { ok: false, message: "This campaign is not accepting applications right now." };
  revalidatePath("/applicant");
  return { ok: true, message: "Application draft created", applicationId: application.id };
}

export async function saveApplicationAnswerAction(input: z.infer<typeof applicationAnswerSchema>): Promise<ApplicantActionResult> {
  const parsed = applicationAnswerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "This answer could not be saved." };

  const auth = await getAuthenticatedApplicant();
  if ("error" in auth) return { ok: false, message: auth.error ?? "Your session has expired. Sign in again." };

  const { data: application } = await auth.supabase.from("applications").select("id, position_id, status, applicant_id").eq("id", parsed.data.applicationId).maybeSingle();
  if (!application || application.applicant_id !== auth.user.id || application.status !== "draft") {
    return { ok: false, message: "This application is no longer editable." };
  }

  const { data: question } = await auth.supabase.from("position_questions").select("id, kind").eq("id", parsed.data.questionId).eq("position_id", application.position_id).maybeSingle();
  if (!question) return { ok: false, message: "That question is not part of this application." };
  if (question.kind === "url" && parsed.data.answer) {
    try { new URL(parsed.data.answer); } catch { return { ok: false, message: "Enter a complete public link, including https://" }; }
  }

  if (!parsed.data.answer) {
    const { error } = await auth.supabase.from("application_answers").delete().eq("application_id", application.id).eq("question_id", question.id);
    return error ? { ok: false, message: "We could not clear this answer." } : { ok: true, message: "Draft saved", savedAt: new Date().toISOString() };
  }

  const { error } = await auth.supabase.from("application_answers").upsert({
    application_id: application.id,
    question_id: question.id,
    answer_text: parsed.data.answer,
    answer_json: null,
  }, { onConflict: "application_id,question_id" });

  if (error) return { ok: false, message: "We could not save this answer. Try again." };
  return { ok: true, message: "Draft saved", savedAt: new Date().toISOString() };
}
