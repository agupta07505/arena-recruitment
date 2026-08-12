"use client";

import { useState, useTransition } from "react";
import { assignReviewerAction, changeApplicationStatusAction, scheduleInterviewAction, submitInterviewFeedbackAction, submitReviewAction, updateApplicantDetailsAction, updateInterviewBookingAction } from "../../actions";
import styles from "../../staff.module.css";
import editorStyles from "./editor.module.css";

type Reviewer = { id: string; name: string; email: string };
type OwnAssignment = { id: string; review: { motivation: number; experience: number; roleFit: number; communication: number; availability: number; recommendation: string; comments: string } | null } | null;

export type EditableApplicant = { fullName: string; scholarId: string; degree: string; branch: string; year: string; gender: string; phone: string; email: string; experience: string; workLinks: string[] };

export function ApplicantDetailsEditor({ applicationId, applicant }: { applicationId: string; applicant: EditableApplicant }) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  return <form className={editorStyles.form} onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const links = String(data.get("workLinks") ?? "").split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean); startTransition(async () => setMessage((await updateApplicantDetailsAction({ applicationId, fullName: String(data.get("fullName")), scholarId: String(data.get("scholarId")), degree: String(data.get("degree")) as "B.Tech" | "MCA" | "M.Tech" | "Ph.D", branch: String(data.get("branch")), year: String(data.get("year")), gender: String(data.get("gender")) as "Male" | "Female" | "Third gender", phone: String(data.get("phone")), email: String(data.get("email")), experience: String(data.get("experience")), workLinks: links })).message)); }}>
    <label><span>Name</span><input defaultValue={applicant.fullName} name="fullName" required /></label>
    <label><span>Scholar No.</span><input defaultValue={applicant.scholarId} name="scholarId" required /></label>
    <label><span>Degree</span><select defaultValue={applicant.degree} name="degree">{["B.Tech","MCA","M.Tech","Ph.D"].map((value) => <option key={value}>{value}</option>)}</select></label>
    <label><span>Branch</span><input defaultValue={applicant.branch} name="branch" required /></label>
    <label><span>Year</span><input defaultValue={applicant.year} name="year" required /></label>
    <label><span>Gender</span><select defaultValue={applicant.gender} name="gender">{["Male","Female","Third gender"].map((value) => <option key={value}>{value}</option>)}</select></label>
    <label><span>Contact no.</span><input defaultValue={applicant.phone} name="phone" required /></label>
    <label><span>Email</span><input defaultValue={applicant.email} name="email" required type="email" /></label>
    <label className={editorStyles.wide}><span>Relevant experience</span><textarea defaultValue={applicant.experience} name="experience" required rows={5} /></label>
    <label className={editorStyles.wide}><span>Public work links / one per line</span><textarea defaultValue={applicant.workLinks.join("\n")} name="workLinks" rows={4} /></label>
    <button disabled={isPending} type="submit">{isPending ? "Saving…" : "Save applicant details"}</button>
    {message && <p>{message}</p>}
  </form>;
}

export function AssignmentControl({ applicationId, reviewers }: { applicationId: string; reviewers: Reviewer[] }) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  return <form className={styles.assignmentForm} onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); startTransition(async () => setMessage((await assignReviewerAction({ applicationId, reviewerId: String(data.get("reviewer")), dueAt: data.get("due") ? new Date(String(data.get("due"))).toISOString() : null })).message)); }}>
    <label><span>Reviewer</span><select name="reviewer" required><option value="">Select reviewer</option>{reviewers.map((reviewer) => <option key={reviewer.id} value={reviewer.id}>{reviewer.name || reviewer.email}</option>)}</select></label>
    <label><span>Due date</span><input name="due" type="datetime-local" /></label>
    <button disabled={isPending || !reviewers.length} type="submit">{isPending ? "Assigning…" : reviewers.length ? "Assign reviewer" : "Add reviewers first"}</button>
    {message && <p>{message}</p>}
  </form>;
}

export function ReviewRubric({ assignment }: { assignment: OwnAssignment }) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  if (!assignment) return <div className={styles.noAssignment}><span>Reviewer workspace</span><strong>No rubric assigned to this account.</strong></div>;
  const criteria = [["motivation", "Motivation"], ["experience", "Relevant experience"], ["roleFit", "Role fit"], ["communication", "Communication"], ["availability", "Availability"]] as const;
  return <form className={styles.rubric} onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); startTransition(async () => setMessage((await submitReviewAction({ assignmentId: assignment.id, motivation: Number(data.get("motivation")), experience: Number(data.get("experience")), roleFit: Number(data.get("roleFit")), communication: Number(data.get("communication")), availability: Number(data.get("availability")), recommendation: String(data.get("recommendation")) as "strong_yes" | "yes" | "maybe" | "no" | "strong_no", comments: String(data.get("comments") ?? "") })).message)); }}>
    <div className={styles.rubricGrid}>{criteria.map(([name, label]) => <fieldset key={name}><legend>{label}</legend><div>{[1,2,3,4,5].map((score) => <label key={score}><input defaultChecked={(assignment.review?.[name] ?? 3) === score} name={name} type="radio" value={score} /><span>{score}</span></label>)}</div></fieldset>)}</div>
    <label><span>Recommendation</span><select defaultValue={assignment.review?.recommendation ?? "maybe"} name="recommendation"><option value="strong_yes">Strong yes</option><option value="yes">Yes</option><option value="maybe">Maybe</option><option value="no">No</option><option value="strong_no">Strong no</option></select></label>
    <label><span>Private comments</span><textarea defaultValue={assignment.review?.comments ?? ""} name="comments" placeholder="Evidence, concerns, follow-up areas…" rows={6} /></label>
    <button disabled={isPending} type="submit">{isPending ? "Submitting…" : assignment.review ? "Update review" : "Submit review"}</button>
    {message && <p>{message}</p>}
  </form>;
}

export function DecisionControl({ applicationId, currentStatus }: { applicationId: string; currentStatus: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  return <form className={styles.decisionForm} onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); startTransition(async () => setMessage((await changeApplicationStatusAction({ applicationId, status: String(data.get("status")) })).message)); }}>
    <label><span>Public applicant status</span><select defaultValue={currentStatus} name="status">{["under_review", "shortlisted", "interviewed", "selected", "waitlisted", "rejected", "draft"].map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></label>
    <button disabled={isPending} type="submit">{isPending ? "Recording…" : "Record decision"}</button>
    {message && <p>{message}</p>}
  </form>;
}

type Interviewer = { id: string; name: string; email: string };
export function InterviewScheduler({ applicationId, interviewers }: { applicationId: string; interviewers: Interviewer[] }) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  return <form className={styles.interviewForm} onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const startsAt = new Date(String(data.get("startsAt"))); const endsAt = new Date(String(data.get("endsAt"))); startTransition(async () => setMessage((await scheduleInterviewAction({ applicationId, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), venue: String(data.get("venue") ?? ""), meetingUrl: String(data.get("meetingUrl") ?? ""), capacity: Number(data.get("capacity")), interviewerIds: data.getAll("interviewers").map(String) })).message)); }}>
    <div><label><span>Starts</span><input name="startsAt" required type="datetime-local" /></label><label><span>Ends</span><input name="endsAt" required type="datetime-local" /></label></div>
    <label><span>Venue</span><input name="venue" placeholder="Room / ground / lab" /></label><label><span>Meeting link</span><input name="meetingUrl" placeholder="https://meet.google.com/…" type="url" /></label>
    <label><span>Capacity</span><input defaultValue="1" min="1" name="capacity" type="number" /></label>
    <fieldset><legend>Interviewers</legend>{interviewers.map((person) => <label key={person.id}><input name="interviewers" type="checkbox" value={person.id} /><span>{person.name || person.email}</span></label>)}</fieldset>
    <button disabled={isPending || !interviewers.length} type="submit">{isPending ? "Scheduling…" : interviewers.length ? "Assign interview" : "Add interviewers first"}</button>{message && <p>{message}</p>}
  </form>;
}

export function InterviewBookingControl({ booking, canAdmin, canFeedback }: { booking: { id: string; status: string; startsAt: string; endsAt: string; venue: string | null; meetingUrl: string | null; feedback: { attended: boolean; feedback: string; recommendation: string | null; finalNotes: string } | null } | null; canAdmin: boolean; canFeedback: boolean }) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  if (!booking) return <div className={styles.noAssignment}><span>Interview desk</span><strong>No interview assigned.</strong></div>;
  return <div className={styles.bookingControl}><article><span>{booking.status}</span><strong>{new Date(booking.startsAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</strong><p>{booking.venue ?? booking.meetingUrl}</p>{canAdmin && !["cancelled", "declined"].includes(booking.status) && <button disabled={isPending} onClick={() => startTransition(async () => setMessage((await updateInterviewBookingAction({ bookingId: booking.id, action: "cancel" })).message))} type="button">Cancel interview</button>}</article>
    {canFeedback && <form className={styles.feedbackForm} onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); startTransition(async () => setMessage((await submitInterviewFeedbackAction({ bookingId: booking.id, attended: data.get("attended") === "true", feedback: String(data.get("feedback") ?? ""), recommendation: data.get("recommendation") ? String(data.get("recommendation")) as "strong_yes" | "yes" | "maybe" | "no" | "strong_no" : null, finalNotes: String(data.get("finalNotes") ?? "") })).message)); }}><label><span>Attendance</span><select defaultValue={booking.feedback?.attended === false ? "false" : "true"} name="attended"><option value="true">Attended</option><option value="false">Absent</option></select></label><label><span>Feedback</span><textarea defaultValue={booking.feedback?.feedback ?? ""} name="feedback" rows={4} /></label><label><span>Recommendation</span><select defaultValue={booking.feedback?.recommendation ?? ""} name="recommendation"><option value="">No recommendation</option><option value="strong_yes">Strong yes</option><option value="yes">Yes</option><option value="maybe">Maybe</option><option value="no">No</option><option value="strong_no">Strong no</option></select></label><label><span>Final notes</span><textarea defaultValue={booking.feedback?.finalNotes ?? ""} name="finalNotes" rows={3} /></label><button disabled={isPending} type="submit">Record feedback</button></form>}{message && <p>{message}</p>}
  </div>;
}
