import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeScholarId } from "@/lib/recruitment-validation";
import { isTurnstileConfigured, verifyTurnstile } from "@/lib/turnstile";

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

export async function GET() {
  try {
    const admin = createAdminClient();
    const { count, error } = await admin.from("positions").select("id", { count: "exact", head: true });
    if (error) return Response.json({ ok: false, stage: "database", code: error.code }, { status: 503 });
    return Response.json({ ok: true, positions: count ?? 0 }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false, stage: "configuration" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const errorId = crypto.randomUUID().slice(0, 8).toUpperCase();
  try {
    const parsed = applicationSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ ok: false, message: "Please complete every required field with valid information." }, { status: 400 });
    if (parsed.data.website) return Response.json({ ok: false, message: "Your application could not be submitted." }, { status: 400 });
    const workLinks = parsePublicLinks(parsed.data.links);
    if (workLinks === null) return Response.json({ ok: false, message: "Add valid public URLs only, one per line." }, { status: 400 });

    if (isTurnstileConfigured() && !(await verifyTurnstile(parsed.data.turnstileToken ?? null))) {
      return Response.json({ ok: false, message: "Please complete the security check again, then resubmit." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: position, error: positionError } = await admin
      .from("positions")
      .select("id, campaign_id, is_active, campaign:campaigns(status, is_published, opens_at, closes_at)")
      .eq("id", parsed.data.positionId)
      .maybeSingle();
    if (positionError) throw positionError;
    const campaign = position?.campaign ? (Array.isArray(position.campaign) ? position.campaign[0] : position.campaign) : null;
    const now = Date.now();
    if (!position?.is_active || !campaign?.is_published || campaign.status !== "open" || !campaign.opens_at || !campaign.closes_at || now < new Date(campaign.opens_at).getTime() || now > new Date(campaign.closes_at).getTime()) {
      return Response.json({ ok: false, message: "Applications are not open right now." }, { status: 400 });
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

    if (error?.code === "23505") return Response.json({ ok: false, message: "This email has already submitted an application for the selected position." }, { status: 409 });
    if (error || !application) throw error ?? new Error("Application insert returned no record");
    return Response.json({ ok: true, message: "Application submitted", receipt: application.id.slice(0, 8).toUpperCase() });
  } catch (error) {
    console.error(`[application:${errorId}]`, error);
    return Response.json({ ok: false, message: `We could not save your application. Please try again. Reference: ${errorId}` }, { status: 500 });
  }
}
