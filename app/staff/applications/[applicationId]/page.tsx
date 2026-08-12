import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { formatApplicationStatus } from "@/lib/recruitment-validation";
import { createClient } from "@/lib/supabase/server";
import { AssignmentControl, DecisionControl, ReviewRubric } from "./review-console";
import styles from "../../staff.module.css";

export const dynamic = "force-dynamic";

export default async function StaffApplicationPage({ params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");
  const { data: roleRows } = await supabase.from("staff_roles").select("role").eq("user_id", user.id);
  const roles = (roleRows ?? []).map((row) => row.role);
  if (!roles.length) redirect("/applicant");

  const { data: application } = await supabase.from("applications").select("id, status, submitted_at, applicant_id, applicant:profiles(full_name, scholar_id, email, phone, branch, academic_year, gender, availability, experience, motivation, work_links), position:positions(id, title, division, summary)").eq("id", applicationId).maybeSingle();
  if (!application) notFound();
  const applicant = Array.isArray(application.applicant) ? application.applicant[0] : application.applicant;
  const position = Array.isArray(application.position) ? application.position[0] : application.position;
  if (!applicant || !position) notFound();

  const [{ data: answerRows }, { data: assignmentRows }, { data: reviewRows }, { data: reviewerRoleRows }] = await Promise.all([
    supabase.from("application_answers").select("answer_text, question:position_questions(prompt, sort_order)").eq("application_id", application.id),
    supabase.from("review_assignments").select("id, reviewer_id, assigned_at, due_at, completed_at").eq("application_id", application.id),
    supabase.from("reviews").select("assignment_id, reviewer_id, motivation_score, experience_score, role_fit_score, communication_score, availability_score, recommendation, private_comments, submitted_at"),
    supabase.from("staff_roles").select("user_id").eq("role", "reviewer"),
  ]);
  const reviewerIds = (reviewerRoleRows ?? []).map((row) => row.user_id);
  const { data: reviewerProfiles } = reviewerIds.length ? await supabase.from("profiles").select("id, full_name, email").in("id", reviewerIds) : { data: [] };
  const reviewerById = new Map((reviewerProfiles ?? []).map((profile) => [profile.id, profile]));
  const reviewByAssignment = new Map((reviewRows ?? []).map((review) => [review.assignment_id, review]));
  const ownAssignmentRow = (assignmentRows ?? []).find((assignment) => assignment.reviewer_id === user.id);
  const ownReview = ownAssignmentRow ? reviewByAssignment.get(ownAssignmentRow.id) : null;
  const ownAssignment = ownAssignmentRow ? { id: ownAssignmentRow.id, review: ownReview ? { motivation: ownReview.motivation_score, experience: ownReview.experience_score, roleFit: ownReview.role_fit_score, communication: ownReview.communication_score, availability: ownReview.availability_score, recommendation: ownReview.recommendation, comments: ownReview.private_comments ?? "" } : null } : null;

  return <main className={styles.recordShell}>
    <header><Link href="/staff">← Application queue</Link><div><span>{position.division}</span><strong>{formatApplicationStatus(application.status)}</strong></div></header>
    <section className={styles.recordHero}><div><span>Applicant record / {application.id.slice(0,8).toUpperCase()}</span><h1>{applicant.full_name ?? "Unnamed"}</h1><p>{position.title}</p></div><dl><div><dt>Scholar ID</dt><dd>{applicant.scholar_id ?? "—"}</dd></div><div><dt>Academic signal</dt><dd>Year {applicant.academic_year ?? "—"} · {applicant.branch ?? "—"}</dd></div><div><dt>Contact</dt><dd>{applicant.email}<br />{applicant.phone ?? "—"}</dd></div><div><dt>Submitted</dt><dd>{application.submitted_at ? new Date(application.submitted_at).toLocaleString() : "—"}</dd></div></dl></section>
    <div className={styles.recordGrid}>
      <section><div className={styles.panelTitle}><span>01</span><h2>Applicant signal</h2></div><div className={styles.signalCards}><article><span>Availability</span><p>{applicant.availability ?? "Not provided"}</p></article><article><span>Experience</span><p>{applicant.experience ?? "Not provided"}</p></article><article><span>Motivation</span><p>{applicant.motivation ?? "Not provided"}</p></article>{Array.isArray(applicant.work_links) && applicant.work_links.length ? <article><span>Work links</span>{applicant.work_links.filter((link): link is string => typeof link === "string").map((link) => <a href={link} key={link} rel="noreferrer" target="_blank">{link} ↗</a>)}</article> : null}</div>
        <div className={styles.panelTitle}><span>02</span><h2>Application answers</h2></div><div className={styles.answerStack}>{(answerRows ?? []).sort((a,b) => { const aq = Array.isArray(a.question) ? a.question[0] : a.question; const bq = Array.isArray(b.question) ? b.question[0] : b.question; return (aq?.sort_order ?? 0) - (bq?.sort_order ?? 0); }).map((answer, index) => { const question = Array.isArray(answer.question) ? answer.question[0] : answer.question; return <article key={index}><span>{String(index + 1).padStart(2,"0")}</span><h3>{question?.prompt}</h3><p>{answer.answer_text}</p></article>; })}</div>
      </section>
      <aside>
        {roles.includes("admin") && <section><div className={styles.panelTitle}><span>A</span><h2>Assign reviewers</h2></div><AssignmentControl applicationId={application.id} reviewers={(reviewerProfiles ?? []).map((profile) => ({ id: profile.id, name: profile.full_name ?? "", email: profile.email }))} /></section>}
        <section><div className={styles.panelTitle}><span>B</span><h2>Your rubric</h2></div><ReviewRubric assignment={ownAssignment} /></section>
        <section><div className={styles.panelTitle}><span>C</span><h2>Panel progress</h2></div><div className={styles.panelReviews}>{(assignmentRows ?? []).map((assignment) => { const reviewer = reviewerById.get(assignment.reviewer_id); const review = reviewByAssignment.get(assignment.id); return <article key={assignment.id}><div><strong>{reviewer?.full_name ?? reviewer?.email ?? "Reviewer"}</strong><small>{assignment.completed_at ? "Completed" : "Pending"}</small></div><span>{review ? `${((review.motivation_score + review.experience_score + review.role_fit_score + review.communication_score + review.availability_score) / 5).toFixed(1)}` : "—"}</span></article>; })}</div></section>
        {roles.includes("admin") && <section><div className={styles.panelTitle}><span>D</span><h2>Decision control</h2></div><DecisionControl applicationId={application.id} currentStatus={application.status} /></section>}
      </aside>
    </div>
  </main>;
}
