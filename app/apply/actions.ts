"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeScholarId } from "@/lib/recruitment-validation";
import { isTurnstileConfigured, verifyTurnstile } from "@/lib/turnstile";

export type PublicApplicationResult = {
  ok: boolean;
  message: string;
  receipt?: string;
};

export const initialApplicationResult: PublicApplicationResult = { ok: false, message: "" };

const degrees = ["B.Tech", "MCA", "M.Tech", "Ph.D"] as const;
const genders = ["Male", "Female", "Third gender"] as const;
const btechBranches = ["CSE Core", "CSE AI", "CSE DS", "CSE CS", "CSE CPS", "IT", "MNC", "ECE", "PNC"] as const;

const applicationSchema = z.object({
  positionId: z.uuid(),
  fullName: z.string().trim().min(2).max(120),
  scholarId: z.string().trim().min(4).max(24),
  degree: z.enum(degrees),
  branch: z.string().trim().min(1).max(100),
  year: z.string().trim().min(1).max(40),
  gender: z.enum(genders),
  phone: z.string().trim().min(7).max(24),
  email: z.email().max(254),
  experience: z.string().trim().min(1).max(8_000),
  links: z.string().trim().max(4_000),
  turnstileToken: z.string().max(2_048).optional(),
  website: z.string().max(0).optional(),
}).superRefine((value, context) => {
  if (value.degree === "B.Tech" && !btechBranches.includes(value.branch as (typeof btechBranches)[number])) {
    context.addIssue({ code: "custom", path: ["branch"], message: "Choose a listed B.Tech branch." });
  }
  if (value.degree === "B.Tech" && !["1", "2", "3", "4"].includes(value.year)) {
    context.addIssue({ code: "custom", path: ["year"], message: "Choose a B.Tech year from 1 to 4." });
  }
});

function parsePublicLinks(value: string) {
  const links = value.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
  if (links.length > 12) return null;
  const parsed = z.array(z.url().max(500)).safeParse(links);
  return parsed.success ? parsed.data : null;
}

export async function submitPublicApplication(
  _previous: PublicApplicationResult,
  formData: FormData,
): Promise<PublicApplicationResult> {
  const parsed = applicationSchema.safeParse({
    positionId: formData.get("positionId"),
    fullName: formData.get("fullName"),
    scholarId: formData.get("scholarId"),
    degree: formData.get("degree"),
    branch: formData.get("branch"),
    year: formData.get("year"),
    gender: formData.get("gender"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    experience: formData.get("experience"),
    links: formData.get("links"),
    turnstileToken: formData.get("turnstileToken") || undefined,
    website: formData.get("website") || undefined,
  });

  if (!parsed.success) return { ok: false, message: "Please complete every required field with valid information." };
  if (parsed.data.website) return { ok: false, message: "Your application could not be submitted." };
  const workLinks = parsePublicLinks(parsed.data.links);
  if (workLinks === null) return { ok: false, message: "Add valid public URLs only, one per line." };
  if (isTurnstileConfigured() && !(await verifyTurnstile(parsed.data.turnstileToken ?? null))) {
    return { ok: false, message: "Please complete the security check and submit again." };
  }

  try {
    const admin = createAdminClient();
    const { data: position } = await admin
      .from("positions")
      .select("id, campaign_id, is_active, campaign:campaigns(status, is_published, opens_at, closes_at)")
      .eq("id", parsed.data.positionId)
      .maybeSingle();
    const campaign = position?.campaign
      ? (Array.isArray(position.campaign) ? position.campaign[0] : position.campaign)
      : null;
    const now = Date.now();
    if (!position?.is_active || !campaign?.is_published || campaign.status !== "open" || !campaign.opens_at || !campaign.closes_at || now < new Date(campaign.opens_at).getTime() || now > new Date(campaign.closes_at).getTime()) {
      return { ok: false, message: "Applications are not open right now." };
    }

    const { data: application, error } = await admin.from("applications").insert({
      campaign_id: position.campaign_id,
      position_id: position.id,
      applicant_id: null,
      status: "submitted",
      applicant_name: parsed.data.fullName,
      applicant_scholar_id: normalizeScholarId(parsed.data.scholarId),
      applicant_degree: parsed.data.degree,
      applicant_branch: parsed.data.branch,
      applicant_year: parsed.data.year,
      applicant_gender: parsed.data.gender,
      applicant_phone: parsed.data.phone,
      applicant_email: parsed.data.email.toLowerCase(),
      relevant_experience: parsed.data.experience,
      work_links: workLinks,
    }).select("id").single();

    if (error?.code === "23505") return { ok: false, message: "This email has already submitted an application for the selected position." };
    if (error || !application) return { ok: false, message: "We could not save your application. Please try again." };
    return { ok: true, message: "Application submitted", receipt: application.id.slice(0, 8).toUpperCase() };
  } catch {
    return { ok: false, message: "The application service is being updated. Please try again shortly." };
  }
}
