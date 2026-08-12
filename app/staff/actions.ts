"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type StaffActionResult = { ok: boolean; message: string };

const staffRoles = ["admin", "reviewer", "interviewer", "observer"] as const;
const recommendations = ["strong_yes", "yes", "maybe", "no", "strong_no"] as const;

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
