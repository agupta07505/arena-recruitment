"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { saveApplicationAnswerAction } from "../../actions";
import styles from "../../applicant.module.css";

export type ApplicationQuestion = {
  id: string;
  prompt: string;
  helpText: string | null;
  kind: "short_text" | "long_text" | "url" | "boolean" | "single_choice";
  required: boolean;
  answer: string;
};

type ApplicationFormProps = {
  applicationId: string;
  position: { title: string; division: string; summary: string; eligibleYears: number[] };
  status: string;
  questions: ApplicationQuestion[];
};

function AnswerField({ question, value, onChange, onBlur }: { question: ApplicationQuestion; value: string; onChange: (value: string) => void; onBlur: () => void }) {
  const common = { id: question.id, name: question.id, value, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value), onBlur, required: question.required };
  if (question.kind === "long_text") return <textarea {...common} rows={7} placeholder="Write a specific, honest answer…" />;
  return <input {...common} type={question.kind === "url" ? "url" : "text"} placeholder={question.kind === "url" ? "https://" : "Your answer"} />;
}

export function ApplicationForm({ applicationId, position, questions, status }: ApplicationFormProps) {
  const [answers, setAnswers] = useState(() => Object.fromEntries(questions.map((question) => [question.id, question.answer])));
  const [saveStatus, setSaveStatus] = useState("All answers saved");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const timers = useRef<Record<string, number>>({});

  useEffect(() => () => Object.values(timers.current).forEach(window.clearTimeout), []);

  const completion = useMemo(() => {
    const required = questions.filter((question) => question.required);
    const answered = required.filter((question) => answers[question.id]?.trim()).length;
    return { answered, total: required.length, percentage: required.length ? Math.round((answered / required.length) * 100) : 100 };
  }, [answers, questions]);

  function saveAnswer(question: ApplicationQuestion, answer: string) {
    window.clearTimeout(timers.current[question.id]);
    setSaveStatus("Unsaved change");
    timers.current[question.id] = window.setTimeout(() => {
      startTransition(async () => {
        setSaveStatus("Saving draft…");
        const result = await saveApplicationAnswerAction({ applicationId, questionId: question.id, answer });
        if (result.ok) { setSaveStatus("All answers saved"); setError(null); }
        else { setSaveStatus("Save interrupted"); setError(result.message); }
      });
    }, 800);
  }

  return (
    <main className={styles.applicationShell}>
      <header className={styles.applicationHeader}>
        <Link href="/applicant">← Workspace</Link>
        <div><span>Application draft</span><b>{isPending ? "Syncing…" : saveStatus}</b></div>
      </header>
      <section className={styles.applicationHero}>
        <div><span className={styles.overline}>{position.division} / independent application</span><h1>{position.title}</h1><p>{position.summary}</p></div>
        <div className={styles.applicationMeter}><span style={{ "--answer-progress": `${completion.percentage}%` } as React.CSSProperties} /><b>{completion.percentage}%</b><small>{completion.answered} of {completion.total} required answers</small></div>
      </section>
      <section className={styles.questionLayout}>
        <aside><span>Status</span><strong>{status}</strong><p>Your answers remain private to authorized recruitment staff. Each role has its own draft, review, and decision.</p><div><b>Autosave active</b><small>You can leave and continue later.</small></div></aside>
        <form className={styles.questionForm} onSubmit={(event) => event.preventDefault()}>
          {questions.map((question, index) => <label key={question.id} htmlFor={question.id}><span><b>{String(index + 1).padStart(2, "0")}</b>{question.required ? "Required" : "Optional"}</span><strong>{question.prompt}</strong>{question.helpText && <small>{question.helpText}</small>}<AnswerField question={question} value={answers[question.id] ?? ""} onChange={(value) => { setAnswers((current) => ({ ...current, [question.id]: value })); saveAnswer(question, value); }} onBlur={() => saveAnswer(question, answers[question.id] ?? "")} /></label>)}
          {error && <p className={styles.applicationError} role="alert">{error}</p>}
          <footer><div><span>{completion.percentage === 100 ? "Draft complete" : "Keep building"}</span><p>Final review and submission unlock in the next workflow stage.</p></div><button disabled type="button">Review & submit</button></footer>
        </form>
      </section>
    </main>
  );
}
