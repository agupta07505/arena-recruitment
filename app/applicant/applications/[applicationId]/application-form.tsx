"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatApplicationStatus, getStatusStep } from "@/lib/recruitment-validation";
import { saveApplicationAnswerAction, submitApplicationAction, withdrawApplicationAction } from "../../actions";
import styles from "../../applicant.module.css";

export type ApplicationQuestion = { id: string; prompt: string; helpText: string | null; kind: "short_text" | "long_text" | "url" | "boolean" | "single_choice"; required: boolean; answer: string };
type ApplicationFormProps = {
  applicationId: string;
  position: { title: string; division: string; summary: string; eligibleYears: number[] };
  status: string;
  questions: ApplicationQuestion[];
  submittedAt: string | null;
  withdrawnAt: string | null;
  booking: { status: string; startsAt: string; endsAt: string; venue: string | null; meetingUrl: string | null } | null;
};

const timeline = ["Submitted", "Under review", "Shortlisted", "Interview", "Decision", "Complete"];
const withdrawableStatuses = ["submitted", "under_review", "shortlisted", "interview_scheduled", "interviewed", "waitlisted"];

function AnswerField({ disabled, question, value, onChange, onBlur }: { disabled: boolean; question: ApplicationQuestion; value: string; onChange: (value: string) => void; onBlur: () => void }) {
  const common = { disabled, id: question.id, name: question.id, value, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value), onBlur, required: question.required };
  if (question.kind === "long_text") return <textarea {...common} rows={7} placeholder="Write a specific, honest answer…" />;
  return <input {...common} type={question.kind === "url" ? "url" : "text"} placeholder={question.kind === "url" ? "https://" : "Your answer"} />;
}

export function ApplicationForm({ applicationId, booking, position, questions, status: initialStatus, submittedAt, withdrawnAt }: ApplicationFormProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState(() => Object.fromEntries(questions.map((question) => [question.id, question.answer])));
  const [saveStatus, setSaveStatus] = useState(initialStatus === "draft" ? "All answers saved" : "Application locked");
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(initialStatus !== "draft" ? `ARENA-${applicationId.slice(0, 8).toUpperCase()}` : null);
  const [status, setStatus] = useState(initialStatus);
  const [confirmation, setConfirmation] = useState<"submit" | "withdraw" | null>(null);
  const [isPending, startTransition] = useTransition();
  const timers = useRef<Record<string, number>>({});
  const editable = status === "draft";

  useEffect(() => () => Object.values(timers.current).forEach(window.clearTimeout), []);
  const completion = useMemo(() => { const required = questions.filter((question) => question.required); const answered = required.filter((question) => answers[question.id]?.trim()).length; return { answered, total: required.length, percentage: required.length ? Math.round((answered / required.length) * 100) : 100 }; }, [answers, questions]);

  function saveAnswer(question: ApplicationQuestion, answer: string) {
    if (!editable) return;
    window.clearTimeout(timers.current[question.id]); setSaveStatus("Unsaved change");
    timers.current[question.id] = window.setTimeout(() => startTransition(async () => {
      setSaveStatus("Saving draft…"); const result = await saveApplicationAnswerAction({ applicationId, questionId: question.id, answer });
      if (result.ok) { setSaveStatus("All answers saved"); setError(null); } else { setSaveStatus("Save interrupted"); setError(result.message); }
    }), 800);
  }

  function submitApplication() {
    setConfirmation(null); startTransition(async () => {
      setSaveStatus("Submitting securely…");
      const result = await submitApplicationAction({ applicationId, answers: questions.map((question) => ({ questionId: question.id, answer: answers[question.id] ?? "" })) });
      if (result.ok) { setStatus("submitted"); setReceipt(result.receipt ?? null); setReviewing(false); setSaveStatus("Application locked"); setError(null); router.refresh(); }
      else { setSaveStatus("Submission stopped"); setError(result.message); }
    });
  }

  function withdrawApplication() {
    setConfirmation(null); startTransition(async () => {
      const result = await withdrawApplicationAction(applicationId);
      if (result.ok) { setStatus("withdrawn"); setError(null); router.refresh(); } else setError(result.message);
    });
  }

  const currentStep = getStatusStep(status);
  return (
    <main className={styles.applicationShell}>
      <header className={styles.applicationHeader}><Link href="/applicant">← Workspace</Link><div><span>{editable ? "Application draft" : formatApplicationStatus(status)}</span><b>{isPending ? "Syncing…" : saveStatus}</b></div></header>
      <section className={styles.applicationHero}><div><span className={styles.overline}>{position.division} / independent application</span><h1>{position.title}</h1><p>{position.summary}</p></div><div className={styles.applicationMeter}><span style={{ "--answer-progress": `${completion.percentage}%` } as React.CSSProperties} /><b>{completion.percentage}%</b><small>{completion.answered} of {completion.total} required answers</small></div></section>

      {!editable && <section className={styles.statusConsole}>
        <div className={styles.receiptBlock}><span>Submission receipt</span><strong>{receipt}</strong><small>{status === "withdrawn" && withdrawnAt ? `Withdrawn ${new Date(withdrawnAt).toLocaleString()}` : submittedAt ? `Submitted ${new Date(submittedAt).toLocaleString()}` : "Recorded securely"}</small></div>
        <div className={styles.timeline}>{timeline.map((label, index) => <div className={index <= currentStep ? styles.reached : ""} key={label}><i>{index < currentStep ? "✓" : String(index + 1).padStart(2, "0")}</i><span>{label}</span></div>)}</div>
        {booking && <div className={styles.interviewCard}><span>Interview / {booking.status}</span><strong>{new Date(booking.startsAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</strong><p>{booking.venue ?? booking.meetingUrl ?? "Details will be shared soon"}</p></div>}
      </section>}

      <section className={styles.questionLayout}>
        <aside><span>Status</span><strong>{formatApplicationStatus(status)}</strong><p>{editable ? "Your answers remain private to authorized recruitment staff. Each role has its own draft, review, and decision." : "Your submitted answers are locked. Only your public status and interview information appear here—never reviewer scores or private comments."}</p><div><b>{editable ? "Autosave active" : "Audit trail active"}</b><small>{editable ? "You can leave and continue later." : "Every status change is recorded."}</small></div>{withdrawableStatuses.includes(status) && <button className={styles.withdrawButton} onClick={() => setConfirmation("withdraw")} type="button">Withdraw application</button>}</aside>
        <form className={styles.questionForm} onSubmit={(event) => event.preventDefault()}>
          {questions.map((question, index) => <label key={question.id} htmlFor={question.id}><span><b>{String(index + 1).padStart(2, "0")}</b>{question.required ? "Required" : "Optional"}</span><strong>{question.prompt}</strong>{question.helpText && <small>{question.helpText}</small>}<AnswerField disabled={!editable} question={question} value={answers[question.id] ?? ""} onChange={(value) => { setAnswers((current) => ({ ...current, [question.id]: value })); saveAnswer(question, value); }} onBlur={() => saveAnswer(question, answers[question.id] ?? "")} /></label>)}
          {error && <p className={styles.applicationError} role="alert">{error}</p>}
          {editable && !reviewing && <footer><div><span>{completion.percentage === 100 ? "Draft complete" : "Keep building"}</span><p>{completion.percentage === 100 ? "Review every answer before locking your application." : "Complete every required answer to unlock final review."}</p></div><button disabled={completion.percentage < 100 || isPending} onClick={() => setReviewing(true)} type="button">Review & submit</button></footer>}
          {editable && reviewing && <section className={styles.reviewGate}><span>Final checkpoint</span><h2>Ready to enter<br />the lineup?</h2><p>After submission, you cannot edit this application unless an administrator reopens it. Your other role applications remain independent.</p><div><button onClick={() => setReviewing(false)} type="button">Keep editing</button><button onClick={() => setConfirmation("submit")} type="button">Submit application</button></div></section>}
        </form>
      </section>

      {confirmation && <div className={styles.confirmOverlay} role="presentation"><section aria-modal="true" role="dialog" aria-labelledby="confirm-title"><span>{confirmation === "submit" ? "Lock application" : "Leave recruitment flow"}</span><h2 id="confirm-title">{confirmation === "submit" ? "Submit this application?" : "Withdraw this application?"}</h2><p>{confirmation === "submit" ? "Your answers will be locked and sent to the authorized review panel." : "This action is final for applicants. Contact an administrator if you withdraw by mistake."}</p><div><button onClick={() => setConfirmation(null)} type="button">Cancel</button><button onClick={confirmation === "submit" ? submitApplication : withdrawApplication} type="button">{confirmation === "submit" ? "Confirm submission" : "Confirm withdrawal"}</button></div></section></div>}
    </main>
  );
}
