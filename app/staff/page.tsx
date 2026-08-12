import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { signOutAction } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { StaffDashboard, type QueueApplication } from "./staff-dashboard";
import styles from "./staff.module.css";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");
  const { data: roleRows } = await supabase.from("staff_roles").select("role").eq("user_id", user.id);
  const roles = (roleRows ?? []).map((row) => row.role);
  if (!roles.length) redirect("/applicant");

  const [{ data: applicationRows }, { data: assignmentRows }, { data: reviewRows }, { data: staffRows }, { data: campaign }] = await Promise.all([
    supabase.from("applications").select("id, status, submitted_at, applicant:profiles(full_name, scholar_id, email, academic_year, branch), position:positions(title, division)").neq("status", "draft").order("submitted_at", { ascending: false }),
    supabase.from("review_assignments").select("application_id, id, completed_at"),
    supabase.from("reviews").select("assignment_id, motivation_score, experience_score, role_fit_score, communication_score, availability_score"),
    supabase.from("staff_roles").select("user_id"),
    supabase.from("campaigns").select("name").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const reviewByAssignment = new Map((reviewRows ?? []).map((review) => [review.assignment_id, review]));
  const assignmentsByApplication = new Map<string, typeof assignmentRows>();
  for (const assignment of assignmentRows ?? []) assignmentsByApplication.set(assignment.application_id, [...(assignmentsByApplication.get(assignment.application_id) ?? []), assignment]);
  const applications: QueueApplication[] = (applicationRows ?? []).map((application) => {
    const applicant = Array.isArray(application.applicant) ? application.applicant[0] : application.applicant;
    const position = Array.isArray(application.position) ? application.position[0] : application.position;
    const reviews = (assignmentsByApplication.get(application.id) ?? []).map((assignment) => reviewByAssignment.get(assignment.id)).filter(Boolean);
    const averages = reviews.map((review) => review ? (review.motivation_score + review.experience_score + review.role_fit_score + review.communication_score + review.availability_score) / 5 : 0);
    return { id: application.id, applicantName: applicant?.full_name ?? "", scholarId: applicant?.scholar_id ?? "", email: applicant?.email ?? "", year: applicant?.academic_year ?? null, branch: applicant?.branch ?? "", position: position?.title ?? "Unknown position", division: position?.division ?? "operations", status: application.status, submittedAt: application.submitted_at, reviewCount: reviews.length, averageScore: averages.length ? averages.reduce((sum, value) => sum + value, 0) / averages.length : null };
  });
  const staffCount = new Set((staffRows ?? []).map((row) => row.user_id)).size;

  return <main className={styles.shell}>
    <header><Link href="/"><BrandMark /></Link><nav><Link href="/applicant">Applicant view</Link><span>{roles.join(" / ")}</span><form action={signOutAction}><button type="submit">Sign out</button></form></nav></header>
    <section className={styles.hero}><div><span>Authorized operations / live system</span><h1>Recruitment<br /><em>control.</em></h1></div><p>A calmer command surface for the people building A.R.E.N.A’s first operational lineup.<small>{user.email}</small></p></section>
    <StaffDashboard applications={applications} campaignName={campaign?.name ?? null} roles={roles} staffCount={staffCount} />
  </main>;
}
