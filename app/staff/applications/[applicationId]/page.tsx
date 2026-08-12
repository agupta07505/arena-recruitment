import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { formatApplicationStatus } from "@/lib/recruitment-validation";
import { createClient } from "@/lib/supabase/server";
import { ApplicantDetailsEditor, AssignmentControl, DecisionControl, InterviewBookingControl, InterviewScheduler, ReviewRubric } from "./review-console";
import styles from "../../staff.module.css";

export const dynamic = "force-dynamic";

export default async function StaffApplicationPage({ params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");
  const { data: roleRows } = await supabase.from("staff_roles").select("role").eq("user_id", user.id);
  const roles = (roleRows ?? []).map((row) => row.role);
  if (!roles.length) redirect("/");

  const { data: application } = await supabase.from("applications").select("id, status, submitted_at, applicant_id, applicant_name, applicant_scholar_id, applicant_degree, applicant_branch, applicant_year, applicant_gender, applicant_phone, applicant_email, relevant_experience, work_links, applicant:profiles(full_name, scholar_id, email, phone, branch, academic_year, gender, experience, work_links), position:positions(id, title, division, summary)").eq("id", applicationId).maybeSingle();
  if (!application) notFound();
  const applicant = Array.isArray(application.applicant) ? application.applicant[0] : application.applicant;
  const position = Array.isArray(application.position) ? application.position[0] : application.position;
  if (!position) notFound();
  const legacyGender = applicant?.gender === "Man" ? "Male" : applicant?.gender === "Woman" ? "Female" : "";
  const applicantDetails = {
    fullName: application.applicant_name ?? applicant?.full_name ?? "",
    scholarId: application.applicant_scholar_id ?? applicant?.scholar_id ?? "",
    degree: application.applicant_degree ?? "B.Tech",
    branch: application.applicant_branch ?? applicant?.branch ?? "",
    year: application.applicant_year ?? (applicant?.academic_year ? String(applicant.academic_year) : ""),
    gender: application.applicant_gender ?? legacyGender,
    phone: application.applicant_phone ?? applicant?.phone ?? "",
    email: application.applicant_email ?? applicant?.email ?? "",
    experience: application.relevant_experience ?? applicant?.experience ?? "",
    workLinks: ((application.work_links?.length ? application.work_links : applicant?.work_links ?? []) as unknown[]).filter((link): link is string => typeof link === "string"),
  };

  const [{ data: answerRows }, { data: assignmentRows }, { data: reviewRows }, { data: reviewerRoleRows }, { data: interviewerRoleRows }, { data: bookingRow }] = await Promise.all([
    supabase.from("application_answers").select("answer_text, question:position_questions(prompt, sort_order)").eq("application_id", application.id),
    supabase.from("review_assignments").select("id, reviewer_id, assigned_at, due_at, completed_at").eq("application_id", application.id),
    supabase.from("reviews").select("assignment_id, reviewer_id, motivation_score, experience_score, role_fit_score, communication_score, availability_score, recommendation, private_comments, submitted_at"),
    supabase.from("staff_roles").select("user_id").eq("role", "reviewer"),
    supabase.from("staff_roles").select("user_id").eq("role", "interviewer"),
    supabase.from("interview_bookings").select("id, status, slot:interview_slots(starts_at, ends_at, venue, meeting_url, interviewer_ids)").eq("application_id", application.id).in("status", ["pending", "confirmed", "declined", "cancelled"]).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const reviewerIds = (reviewerRoleRows ?? []).map((row) => row.user_id);
  const interviewerIds = (interviewerRoleRows ?? []).map((row) => row.user_id);
  const staffProfileIds = Array.from(new Set([...reviewerIds, ...interviewerIds]));
  const { data: staffProfiles } = staffProfileIds.length ? await supabase.from("profiles").select("id, full_name, email").in("id", staffProfileIds) : { data: [] };
  const reviewerProfiles = (staffProfiles ?? []).filter((profile) => reviewerIds.includes(profile.id));
  const interviewerProfiles = (staffProfiles ?? []).filter((profile) => interviewerIds.includes(profile.id));
  const reviewerById = new Map((reviewerProfiles ?? []).map((profile) => [profile.id, profile]));
  const reviewByAssignment = new Map((reviewRows ?? []).map((review) => [review.assignment_id, review]));
  const ownAssignmentRow = (assignmentRows ?? []).find((assignment) => assignment.reviewer_id === user.id);
  const ownReview = ownAssignmentRow ? reviewByAssignment.get(ownAssignmentRow.id) : null;
  const ownAssignment = ownAssignmentRow ? { id: ownAssignmentRow.id, review: ownReview ? { motivation: ownReview.motivation_score, experience: ownReview.experience_score, roleFit: ownReview.role_fit_score, communication: ownReview.communication_score, availability: ownReview.availability_score, recommendation: ownReview.recommendation, comments: ownReview.private_comments ?? "" } : null } : null;
  const bookingSlot = bookingRow?.slot ? (Array.isArray(bookingRow.slot) ? bookingRow.slot[0] : bookingRow.slot) : null;
  const canFeedback = Boolean(bookingSlot?.interviewer_ids.includes(user.id));
  const { data: feedbackRow } = bookingRow && canFeedback ? await supabase.from("interview_feedback").select("attended, feedback, recommendation, final_notes").eq("booking_id", bookingRow.id).eq("interviewer_id", user.id).maybeSingle() : { data: null };
  const booking = bookingRow && bookingSlot ? { id: bookingRow.id, status: bookingRow.status, startsAt: bookingSlot.starts_at, endsAt: bookingSlot.ends_at, venue: bookingSlot.venue, meetingUrl: bookingSlot.meeting_url, feedback: feedbackRow ? { attended: feedbackRow.attended, feedback: feedbackRow.feedback ?? "", recommendation: feedbackRow.recommendation, finalNotes: feedbackRow.final_notes ?? "" } : null } : null;

  return <main className={styles.recordShell}>
    <header><Link href="/staff">← Application queue</Link><div><span>{position.division}</span><strong>{formatApplicationStatus(application.status)}</strong></div></header>
    <section className={styles.recordHero}><div><span>Applicant record / {application.id.slice(0,8).toUpperCase()}</span><h1>{applicantDetails.fullName || "Unnamed"}</h1><p>{position.title}</p></div><dl><div><dt>Scholar No.</dt><dd>{applicantDetails.scholarId || "—"}</dd></div><div><dt>Academic details</dt><dd>{applicantDetails.degree} · Year {applicantDetails.year || "—"}<br />{applicantDetails.branch || "—"}</dd></div><div><dt>Contact</dt><dd>{applicantDetails.email}<br />{applicantDetails.phone || "—"}</dd></div><div><dt>Submitted</dt><dd>{application.submitted_at ? new Date(application.submitted_at).toLocaleString() : "—"}</dd></div></dl></section>
    <div className={styles.recordGrid}>
      <section><div className={styles.panelTitle}><span>01</span><h2>Applicant details</h2></div><div className={styles.signalCards}><article><span>Gender</span><p>{applicantDetails.gender || "Not provided"}</p></article><article><span>Relevant experience</span><p>{applicantDetails.experience || "Not provided"}</p></article>{applicantDetails.workLinks.length ? <article><span>Work links</span>{applicantDetails.workLinks.map((link: string) => <a href={link} key={link} rel="noreferrer" target="_blank">{link} ↗</a>)}</article> : null}</div>
        {(answerRows ?? []).length ? <><div className={styles.panelTitle}><span>02</span><h2>Legacy answers</h2></div><div className={styles.answerStack}>{(answerRows ?? []).sort((a,b) => { const aq = Array.isArray(a.question) ? a.question[0] : a.question; const bq = Array.isArray(b.question) ? b.question[0] : b.question; return (aq?.sort_order ?? 0) - (bq?.sort_order ?? 0); }).map((answer, index) => { const question = Array.isArray(answer.question) ? answer.question[0] : answer.question; return <article key={index}><span>{String(index + 1).padStart(2,"0")}</span><h3>{question?.prompt}</h3><p>{answer.answer_text}</p></article>; })}</div></> : null}
      </section>
      <aside>
        {roles.includes("admin") && <section><div className={styles.panelTitle}><span>A</span><h2>Edit applicant</h2></div><ApplicantDetailsEditor applicationId={application.id} applicant={applicantDetails} /></section>}
        {roles.includes("admin") && <section><div className={styles.panelTitle}><span>B</span><h2>Assign reviewers</h2></div><AssignmentControl applicationId={application.id} reviewers={(reviewerProfiles ?? []).map((profile) => ({ id: profile.id, name: profile.full_name ?? "", email: profile.email }))} /></section>}
        <section><div className={styles.panelTitle}><span>B</span><h2>Your rubric</h2></div><ReviewRubric assignment={ownAssignment} /></section>
        <section><div className={styles.panelTitle}><span>C</span><h2>Panel progress</h2></div><div className={styles.panelReviews}>{(assignmentRows ?? []).map((assignment) => { const reviewer = reviewerById.get(assignment.reviewer_id); const review = reviewByAssignment.get(assignment.id); return <article key={assignment.id}><div><strong>{reviewer?.full_name ?? reviewer?.email ?? "Reviewer"}</strong><small>{assignment.completed_at ? "Completed" : "Pending"}</small></div><span>{review ? `${((review.motivation_score + review.experience_score + review.role_fit_score + review.communication_score + review.availability_score) / 5).toFixed(1)}` : "—"}</span></article>; })}</div></section>
        {roles.includes("admin") && !booking && <section><div className={styles.panelTitle}><span>D</span><h2>Schedule interview</h2></div><InterviewScheduler applicationId={application.id} interviewers={interviewerProfiles.map((profile) => ({ id: profile.id, name: profile.full_name ?? "", email: profile.email }))} /></section>}
        {(booking || roles.includes("interviewer")) && <section><div className={styles.panelTitle}><span>E</span><h2>Interview desk</h2></div><InterviewBookingControl booking={booking} canAdmin={roles.includes("admin")} canFeedback={canFeedback} /></section>}
        {roles.includes("admin") && <section><div className={styles.panelTitle}><span>F</span><h2>Decision control</h2></div><DecisionControl applicationId={application.id} currentStatus={application.status} /></section>}
      </aside>
    </div>
  </main>;
}
