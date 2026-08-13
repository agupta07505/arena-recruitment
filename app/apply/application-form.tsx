"use client";

import { useState } from "react";
import Link from "next/link";
import { TurnstileWidget } from "@/components/turnstile-widget";
import styles from "./apply.module.css";

export type PublicPosition = { id: string; slug: string; title: string; division: string };
type ApplicationResult = { ok: boolean; message: string; receipt?: string };

const degrees = ["B.Tech", "MCA", "M.Tech", "Ph.D"];
const btechBranches = ["CSE Core", "CSE AI", "CSE DS", "CSE CS", "CSE CPS", "IT", "MNC", "ECE", "PNC"];

export function ApplicationForm({ positions, initialPosition }: { positions: PublicPosition[]; initialPosition: string }) {
  const [result, setResult] = useState<ApplicationResult>({ ok: false, message: "" });
  const [pending, setPending] = useState(false);
  const [degree, setDegree] = useState("B.Tech");
  const [turnstileToken, setTurnstileToken] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setResult({ ok: false, message: "" });
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const next = await response.json() as ApplicationResult;
      setResult(next);
      if (!next.ok) resetTurnstile();
    } catch {
      setResult({ ok: false, message: "The connection was interrupted. Your application was not submitted; please try again." });
      resetTurnstile();
    } finally {
      setPending(false);
    }
  }

  function resetTurnstile() {
    const target = window as typeof window & { turnstile?: { reset: () => void } };
    target.turnstile?.reset();
    setTurnstileToken("");
  }

  if (result.ok) {
    return <section className={styles.success} aria-live="polite">
      <span>Submission received / {result.receipt}</span>
      <div className={styles.successMark}>✓</div>
      <h2>You&apos;re on the list.</h2>
      <p>We will contact you later with recruitment updates. Please keep checking the email address and contact number you submitted.</p>
      <Link href="/">Return to A.R.E.N.A</Link>
    </section>;
  }

  return <form className={styles.form} onSubmit={submit}>
    <div className={styles.formIntro}>
      <span>Application form / all fields marked * are required</span>
      <h2>Tell us about yourself.</h2>
    </div>

    <section className={styles.formSection}>
      <div className={styles.sectionNumber}>01</div>
      <div className={styles.fields}>
        <label className={styles.wide}>Position *<select defaultValue={initialPosition} name="positionId" required><option disabled value="">Select the position you are applying for</option>{positions.map((position) => <option key={position.id} value={position.id}>{position.title}</option>)}</select></label>
      </div>
    </section>

    <section className={styles.formSection}>
      <div className={styles.sectionNumber}>02</div>
      <div className={styles.fields}>
        <label className={styles.wide}>Full name *<input autoComplete="name" maxLength={120} name="fullName" placeholder="Your official name" required /></label>
        <label>Scholar No. *<input autoCapitalize="characters" maxLength={24} name="scholarId" placeholder="Scholar number" required /></label>
        <label>Degree *<select name="degree" onChange={(event) => setDegree(event.target.value)} value={degree}>{degrees.map((item) => <option key={item}>{item}</option>)}</select></label>
        {degree === "B.Tech" ? <>
          <label>Branch *<select defaultValue="" name="branch" required><option disabled value="">Select branch</option>{btechBranches.map((branch) => <option key={branch}>{branch}</option>)}</select></label>
          <label>Year *<select defaultValue="" name="year" required><option disabled value="">Select year</option>{[1,2,3,4].map((year) => <option key={year} value={year}>Year {year}</option>)}</select></label>
        </> : <>
          <label>Branch / discipline *<input maxLength={100} name="branch" placeholder="Enter your branch or discipline" required /></label>
          <label>Current year *<input maxLength={40} name="year" placeholder="For example: 1st year" required /></label>
        </>}
        <fieldset className={styles.wide}>
          <legend>Gender *</legend>
          <div className={styles.radioRow}>{["Male", "Female", "Third gender"].map((gender) => <label key={gender}><input name="gender" required type="radio" value={gender} /><span>{gender}</span></label>)}</div>
        </fieldset>
      </div>
    </section>

    <section className={styles.formSection}>
      <div className={styles.sectionNumber}>03</div>
      <div className={styles.fields}>
        <label>Contact no. *<input autoComplete="tel" inputMode="tel" maxLength={24} name="phone" placeholder="Phone / WhatsApp number" required /></label>
        <label>Email ID *<input autoComplete="email" maxLength={254} name="email" placeholder="you@example.com" required type="email" /></label>
        <label className={styles.wide}>Relevant experience *<textarea maxLength={8000} name="experience" placeholder="Tell us about relevant projects, events, teams, volunteering, creative work, or other experience." required rows={6} /></label>
        <label className={styles.wide}>Work experience links <em>Optional</em><textarea maxLength={4000} name="links" placeholder="https://drive.google.com/...&#10;https://github.com/..." rows={4} /><small>Resume, portfolio, certificates, or project links. Add one URL per line and make sure every link has public viewing access.</small></label>
      </div>
    </section>

    <input aria-hidden="true" className={styles.honeypot} name="website" tabIndex={-1} />
    <input name="turnstileToken" type="hidden" value={turnstileToken} />
    <div className={styles.submitArea}>
      <TurnstileWidget onToken={setTurnstileToken} siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
      {result.message && <p className={styles.error} role="alert">{result.message}</p>}
      <button disabled={pending} type="submit">{pending ? "Submitting…" : "Submit application"}<span>↗</span></button>
      <small>After submitting, A.R.E.N.A will contact you later through your email or phone number.</small>
    </div>
  </form>;
}
