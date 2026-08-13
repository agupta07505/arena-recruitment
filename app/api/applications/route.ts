import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeScholarId } from "@/lib/recruitment-validation";
import { isTurnstileConfigured, verifyTurnstile } from "@/lib/turnstile";
import { applicationSchema } from "./schema";

function parsePublicLinks(value: string) {
  const links = value.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
  if (links.length > 12) return null;
  const parsed = z.array(z.url().max(500)).safeParse(links);
  return parsed.success ? parsed.data : null;
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
    const { data: positions, error: positionError } = await admin
      .from("positions")
      .select("id, campaign_id, is_active, eligible_years, campaign:campaigns(status, is_published, opens_at, closes_at)")
      .in("id", parsed.data.positionIds);
    if (positionError) throw positionError;
    if (!positions || positions.length !== parsed.data.positionIds.length) {
      return Response.json({ ok: false, message: "One or more selected positions are unavailable." }, { status: 400 });
    }
    const campaignId = positions[0].campaign_id;
    const campaign = positions[0].campaign ? (Array.isArray(positions[0].campaign) ? positions[0].campaign[0] : positions[0].campaign) : null;
    const now = Date.now();
    if (positions.some((position) => !position.is_active || position.campaign_id !== campaignId || !position.eligible_years.includes(Number(parsed.data.year))) || !campaign?.is_published || campaign.status !== "open" || !campaign.opens_at || !campaign.closes_at || now < new Date(campaign.opens_at).getTime() || now > new Date(campaign.closes_at).getTime()) {
      return Response.json({ ok: false, message: "Applications are not open right now." }, { status: 400 });
    }

    const applicationRows = positions.map((position) => ({
      campaign_id: campaignId,
      position_id: position.id,
      applicant_id: null,
      status: "submitted",
      applicant_name: parsed.data.fullName,
      applicant_scholar_id: normalizeScholarId(parsed.data.scholarId),
      applicant_degree: "B.Tech",
      applicant_branch: parsed.data.branch,
      applicant_year: parsed.data.year,
      applicant_gender: parsed.data.gender,
      applicant_phone: parsed.data.phone,
      applicant_email: parsed.data.email.toLowerCase(),
      relevant_experience: parsed.data.experience,
      work_links: workLinks,
    }));
    const { data: applications, error } = await admin.from("applications").insert(applicationRows).select("id");

    if (error || !applications || applications.length !== applicationRows.length) throw error ?? new Error("Application insert returned an unexpected number of records");
    return Response.json({ ok: true, message: "Applications submitted", receipt: applications.map((application) => application.id.slice(0, 8).toUpperCase()).join(" / ") });
  } catch (error) {
    console.error(`[application:${errorId}]`, error);
    return Response.json({ ok: false, message: `We could not save your application. Please try again. Reference: ${errorId}` }, { status: 500 });
  }
}
