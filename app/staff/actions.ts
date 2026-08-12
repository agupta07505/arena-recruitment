"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type StaffActionResult = { ok: boolean; message: string };

const staffRoles = ["admin", "reviewer", "interviewer", "observer"] as const;
const recommendations = ["strong_yes", "yes", "maybe", "no", "strong_no"] as const;
const applicantDetailsSchema = z.object({
  applicationId: z.uuid(),
  fullName: z.string().trim().min(2).max(120),
  scholarId: z.string().trim().min(4).max(24),
  degree: z.enum(["B.Tech", "MCA", "M.Tech", "Ph.D"]),
  branch: z.string().trim().min(1).max(100),
  year: z.string().trim().min(1).max(40),
  gender: z.enum(["Male", "Female", "Third gender"]),
  phone: z.string().trim().min(7).max(24),
  email: z.email().max(254),
  experience: z.string().trim().min(1).max(8_000),
  workLinks: z.array(z.url().max(500)).max(12),
});

const assignmentSchema = z.object({
  applicationId: z.uuid(),
  reviewerId: z.uuid(),
  dueAt: z.iso.datetime().nullable(),
});

const reviewSchema = z.object({
  assignmentId: z.uuid(),
  motivation: z.number().int().min(1).max(5),
  experience: z.number().int().min(1).max(5),
  roleFit: z.number().int().min(1).max(5),
  communication: z.number().int().min(1).max(5),
  availability: z.number().int().min(1).max(5),
  recommendation: z.enum(recommendations),
  comments: z.string().trim().max(8_000),
});

const slotSchema = z.object({
  applicationId: z.uuid(),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  venue: z.string().trim().max(200),
  meetingUrl: z.string().trim().max(500),
  capacity: z.number().int().min(1).max(50),
  interviewerIds: z.array(z.uuid()).max(12),
});

const feedbackSchema = z.object({
  bookingId: z.uuid(),
  attended: z.boolean(),
  feedback: z.string().trim().max(8_000),
  recommendation: z.enum(recommendations).nullable(),
  finalNotes: z.string().trim().max(8_000),
});

async function getStaff(required: (typeof staffRoles)[number][]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Your staff session has expired." } as const;
  const { data: roles } = await supabase.from("staff_roles").select("role").eq("user_id", user.id).in("role", required);
  if (!roles?.length) return { error: "You do not have permission for this action." } as const;
  return { supabase, user } as const;
}

export async function grantStaffRoleAction(input: { email: string; role: (typeof staffRoles)[number] }): Promise<StaffActionResult> {
  const parsed = z.object({ email: z.email(), role: z.enum(staffRoles) }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "Enter an existing account email and a valid role." };
  const auth = await getStaff(["admin"]);
  if ("error" in auth) return { ok: false, message: auth.error ?? "You do not have permission for this action." };
  const { data: profile } = await auth.supabase.from("profiles").select("id").ilike("email", parsed.data.email).maybeSingle();
  if (!profile) return { ok: false, message: "That person must create an A.R.E.N.A account first." };
  const { error } = await auth.supabase.from("staff_roles").upsert({ user_id: profile.id, role: parsed.data.role, granted_by: auth.user.id });
  if (error) return { ok: false, message: "Staff access could not be granted." };
  revalidatePath("/staff");
  return { ok: true, message: `${parsed.data.role} access granted.` };
}

export async function assignReviewerAction(input: z.infer<typeof assignmentSchema>): Promise<StaffActionResult> {
  const parsed = assignmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Choose a reviewer and valid due date." };
  const auth = await getStaff(["admin"]);
  if ("error" in auth) return { ok: false, message: auth.error ?? "You do not have permission for this action." };
  const { data: reviewerRole } = await auth.supabase.from("staff_roles").select("user_id").eq("user_id", parsed.data.reviewerId).eq("role", "reviewer").maybeSingle();
  if (!reviewerRole) return { ok: false, message: "That account is not an active reviewer." };
  const { error } = await auth.supabase.from("review_assignments").upsert({
    application_id: parsed.data.applicationId,
    reviewer_id: parsed.data.reviewerId,
    assigned_by: auth.user.id,
    due_at: parsed.data.dueAt,
  }, { onConflict: "application_id,reviewer_id" });
  if (error) return { ok: false, message: "Reviewer assignment could not be saved." };
  await auth.supabase.from("applications").update({ status: "under_review" }).eq("id", parsed.data.applicationId).eq("status", "submitted");
  revalidatePath("/staff");
  revalidatePath(`/staff/applications/${parsed.data.applicationId}`);
  return { ok: true, message: "Reviewer assigned." };
}

export async function submitReviewAction(input: z.infer<typeof reviewSchema>): Promise<StaffActionResult> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Score every criterion from 1 to 5." };
  const auth = await getStaff(["reviewer", "admin"]);
  if ("error" in auth) return { ok: false, message: auth.error ?? "You do not have permission for this action." };
  const { data: assignment } = await auth.supabase.from("review_assignments").select("id, application_id, reviewer_id").eq("id", parsed.data.assignmentId).maybeSingle();
  if (!assignment || assignment.reviewer_id !== auth.user.id) return { ok: false, message: "This review is not assigned to your account." };
  const { error } = await auth.supabase.from("reviews").upsert({
    assignment_id: assignment.id,
    reviewer_id: auth.user.id,
    motivation_score: parsed.data.motivation,
    experience_score: parsed.data.experience,
    role_fit_score: parsed.data.roleFit,
    communication_score: parsed.data.communication,
    availability_score: parsed.data.availability,
    recommendation: parsed.data.recommendation,
    private_comments: parsed.data.comments || null,
  }, { onConflict: "assignment_id" });
  if (error) return { ok: false, message: "Your review could not be submitted." };
  await auth.supabase.from("review_assignments").update({ completed_at: new Date().toISOString() }).eq("id", assignment.id).eq("reviewer_id", auth.user.id);
  revalidatePath("/staff");
  revalidatePath(`/staff/applications/${assignment.application_id}`);
  return { ok: true, message: "Review submitted and locked to your account." };
}

export async function changeApplicationStatusAction(input: { applicationId: string; status: string }): Promise<StaffActionResult> {
  const parsed = z.object({ applicationId: z.uuid(), status: z.enum(["under_review", "shortlisted", "interviewed", "selected", "waitlisted", "rejected", "draft"]) }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "That status change is not available." };
  const auth = await getStaff(["admin"]);
  if ("error" in auth) return { ok: false, message: auth.error ?? "You do not have permission for this action." };
  const { error } = await auth.supabase.from("applications").update({ status: parsed.data.status }).eq("id", parsed.data.applicationId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/staff");
  revalidatePath(`/staff/applications/${parsed.data.applicationId}`);
  return { ok: true, message: "Application status updated." };
}

export async function updateApplicantDetailsAction(input: z.infer<typeof applicantDetailsSchema>): Promise<StaffActionResult> {
  const parsed = applicantDetailsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Check every applicant field and public link." };
  const auth = await getStaff(["admin"]);
  if ("error" in auth) return { ok: false, message: auth.error ?? "Administrator access required." };
  const { error } = await auth.supabase.from("applications").update({
    applicant_name: parsed.data.fullName,
    applicant_scholar_id: parsed.data.scholarId.toUpperCase().replace(/[\s-]+/g, ""),
    applicant_degree: parsed.data.degree,
    applicant_branch: parsed.data.branch,
    applicant_year: parsed.data.year,
    applicant_gender: parsed.data.gender,
    applicant_phone: parsed.data.phone,
    applicant_email: parsed.data.email.toLowerCase(),
    relevant_experience: parsed.data.experience,
    work_links: parsed.data.workLinks,
  }).eq("id", parsed.data.applicationId);
  if (error) return { ok: false, message: error.code === "23505" ? "That email already applied for this position." : error.message };
  revalidatePath("/staff");
  revalidatePath(`/staff/applications/${parsed.data.applicationId}`);
  return { ok: true, message: "Applicant details updated." };
}

export async function scheduleInterviewAction(input: z.infer<typeof slotSchema>): Promise<StaffActionResult> {
  const parsed = slotSchema.safeParse(input);
  if (!parsed.success || (!parsed.data.venue && !parsed.data.meetingUrl) || new Date(parsed.data.startsAt) >= new Date(parsed.data.endsAt)) return { ok: false, message: "Add valid times and either a venue or meeting link." };
  const auth = await getStaff(["admin"]);
  if ("error" in auth) return { ok: false, message: auth.error ?? "Administrator access required." };
  const { data: application } = await auth.supabase.from("applications").select("id, campaign_id, position_id").eq("id", parsed.data.applicationId).maybeSingle();
  if (!application) return { ok: false, message: "Application not found." };
  const { data: slot, error: slotError } = await auth.supabase.from("interview_slots").insert({
    campaign_id: application.campaign_id,
    position_id: application.position_id,
    starts_at: parsed.data.startsAt,
    ends_at: parsed.data.endsAt,
    venue: parsed.data.venue || null,
    meeting_url: parsed.data.meetingUrl || null,
    capacity: parsed.data.capacity,
    interviewer_ids: parsed.data.interviewerIds,
    created_by: auth.user.id,
  }).select("id").single();
  if (slotError || !slot) return { ok: false, message: "Interview slot could not be created." };
  const { error: bookingError } = await auth.supabase.from("interview_bookings").insert({ slot_id: slot.id, application_id: application.id, status: "pending" });
  if (bookingError) {
    await auth.supabase.from("interview_slots").delete().eq("id", slot.id);
    return { ok: false, message: bookingError.message };
  }
  const { error: statusError } = await auth.supabase.from("applications").update({ status: "interview_scheduled" }).eq("id", application.id);
  if (statusError) return { ok: false, message: "Slot created, but application status needs manual review." };
  revalidatePath("/staff"); revalidatePath(`/staff/applications/${application.id}`); revalidatePath(`/applicant/applications/${application.id}`);
  return { ok: true, message: "Interview assigned and applicant notified." };
}

export async function updateInterviewBookingAction(input: { bookingId: string; action: "cancel" }): Promise<StaffActionResult> {
  const parsed = z.object({ bookingId: z.uuid(), action: z.literal("cancel") }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "Booking not found." };
  const auth = await getStaff(["admin"]);
  if ("error" in auth) return { ok: false, message: auth.error ?? "Administrator access required." };
  const { data: booking, error } = await auth.supabase.from("interview_bookings").update({ status: "cancelled" }).eq("id", parsed.data.bookingId).select("application_id").maybeSingle();
  if (error || !booking) return { ok: false, message: "Interview could not be cancelled." };
  revalidatePath("/staff"); revalidatePath(`/staff/applications/${booking.application_id}`); revalidatePath(`/applicant/applications/${booking.application_id}`);
  return { ok: true, message: "Interview cancelled and applicant notified." };
}

export async function submitInterviewFeedbackAction(input: z.infer<typeof feedbackSchema>): Promise<StaffActionResult> {
  const parsed = feedbackSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Interview feedback is invalid." };
  const auth = await getStaff(["interviewer", "admin"]);
  if ("error" in auth) return { ok: false, message: auth.error ?? "Interviewer access required." };
  const { data: booking } = await auth.supabase.from("interview_bookings").select("id, application_id, slot:interview_slots(interviewer_ids)").eq("id", parsed.data.bookingId).maybeSingle();
  const slot = booking?.slot ? (Array.isArray(booking.slot) ? booking.slot[0] : booking.slot) : null;
  if (!booking || !slot?.interviewer_ids.includes(auth.user.id)) return { ok: false, message: "This interview is not assigned to your account." };
  const { error } = await auth.supabase.from("interview_feedback").upsert({ booking_id: booking.id, interviewer_id: auth.user.id, attended: parsed.data.attended, feedback: parsed.data.feedback || null, recommendation: parsed.data.recommendation, final_notes: parsed.data.finalNotes || null }, { onConflict: "booking_id,interviewer_id" });
  if (error) return { ok: false, message: "Feedback could not be saved." };
  if (parsed.data.attended) await auth.supabase.from("applications").update({ status: "interviewed" }).eq("id", booking.application_id).eq("status", "interview_scheduled");
  revalidatePath("/staff"); revalidatePath(`/staff/applications/${booking.application_id}`);
  return { ok: true, message: "Interview feedback recorded." };
}

export async function updateCampaignAction(input: { campaignId: string; opensAt: string; closesAt: string; action: "save" | "publish" | "close" }): Promise<StaffActionResult> {
  const parsed = z.object({ campaignId: z.uuid(), opensAt: z.iso.datetime(), closesAt: z.iso.datetime(), action: z.enum(["save", "publish", "close"]) }).safeParse(input);
  if (!parsed.success || new Date(parsed.data.opensAt) >= new Date(parsed.data.closesAt)) return { ok: false, message: "Set a valid opening and closing window." };
  const auth = await getStaff(["admin"]);
  if ("error" in auth) return { ok: false, message: auth.error ?? "Administrator access required." };
  if (parsed.data.action === "publish") {
    const missing = [!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || !process.env.TURNSTILE_SECRET_KEY ? "Turnstile" : null, !process.env.BREVO_API_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.CRON_SECRET ? "transactional email" : null].filter(Boolean);
    if (missing.length) return { ok: false, message: `Launch blocked: configure ${missing.join(" and ")} first.` };
  }
  const update = parsed.data.action === "publish" ? { opens_at: parsed.data.opensAt, closes_at: parsed.data.closesAt, status: "open", is_published: true } : parsed.data.action === "close" ? { opens_at: parsed.data.opensAt, closes_at: parsed.data.closesAt, status: "closed", is_published: true } : { opens_at: parsed.data.opensAt, closes_at: parsed.data.closesAt };
  const { error } = await auth.supabase.from("campaigns").update(update).eq("id", parsed.data.campaignId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/"); revalidatePath("/applicant"); revalidatePath("/staff");
  return { ok: true, message: parsed.data.action === "publish" ? "Campaign published." : parsed.data.action === "close" ? "Campaign closed." : "Campaign window saved as draft." };
}
