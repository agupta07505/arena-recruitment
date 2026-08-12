"use client";

import { useState, useTransition } from "react";
import { assignReviewerAction, changeApplicationStatusAction, submitReviewAction } from "../../actions";
import styles from "../../staff.module.css";

type Reviewer = { id: string; name: string; email: string };
type OwnAssignment = { id: string; review: { motivation: number; experience: number; roleFit: number; communication: number; availability: number; recommendation: string; comments: string } | null } | null;

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
