"use client";

import { useState } from "react";
import Link from "next/link";
import { TurnstileWidget } from "@/components/turnstile-widget";
import styles from "./apply.module.css";

export type PublicPosition = { id: string; slug: string; title: string; division: string; eligibleYears: number[] };
type ApplicationResult = { ok: boolean; message: string; receipt?: string };

const btechBranches = ["CSE Core", "CSE AI", "CSE DS", "CSE CS", "CSE CPS", "IT", "MNC", "ECE", "PNC"];

export function ApplicationForm({ positions, initialPosition }: { positions: PublicPosition[]; initialPosition: string }) {
  const [result, setResult] = useState<ApplicationResult>({ ok: false, message: "" });
  const [pending, setPending] = useState(false);
  const [year, setYear] = useState("");
  const [selectedPositionIds, setSelectedPositionIds] = useState<string[]>(initialPosition ? [initialPosition] : []);
  const [turnstileToken, setTurnstileToken] = useState("");
  const eligiblePositions = year ? positions.filter((position) => position.eligibleYears.includes(Number(year))) : [];

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setResult({ ok: false, message: "" });
    const form = new FormData(event.currentTarget);
    const payload = { ...Object.fromEntries(form.entries()), positionIds: form.getAll("positionIds") };
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

  function changeYear(nextYear: string) {
    setYear(nextYear);
    setSelectedPositionIds((current) => current.filter((id) => positions.some((position) => position.id === id && position.eligibleYears.includes(Number(nextYear)))));
  }

  function togglePosition(positionId: string) {
    setSelectedPositionIds((current) => current.includes(positionId)
      ? current.filter((id) => id !== positionId)
      : current.length < 4 ? [...current, positionId] : current);
  }

  if (result.ok) {
    return <section className={styles.success} aria-live="polite">
      <span>Submission received / {result.receipt}</span>
      <div className={styles.successMark}>✓</div>
      <h2>You&apos;re on the list.</h2>
      <p>Your application has been submitted for every selected position. We will contact you later with recruitment updates.</p>
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
        <label className={styles.wide}>Year *<select name="year" onChange={(event) => changeYear(event.target.value)} required value={year}><option disabled value="">Select year</option>{[1,2,3,4].map((item) => <option key={item} value={item}>Year {item}</option>)}</select><small>Your year determines which positions you can apply for.</small></label>
        <fieldset aria-required="true" className={styles.wide}>
          <legend>Positions * <em>Select up to 4</em></legend>
          {!year ? <p className={styles.positionHint}>Choose your year first to see eligible positions.</p> : <div className={styles.positionGrid}>{eligiblePositions.map((position) => {
            const checked = selectedPositionIds.includes(position.id);
            return <label key={position.id}><input checked={checked} disabled={!checked && selectedPositionIds.length >= 4} name="positionIds" onChange={() => togglePosition(position.id)} type="checkbox" value={position.id} /><span>{position.title}<small>{position.division}</small></span></label>;
          })}</div>}
          {year && <small>{selectedPositionIds.length} of 4 positions selected.</small>}
        </fieldset>
      </div>
    </section>

    <section className={styles.formSection}>
      <div className={styles.sectionNumber}>02</div>
      <div className={styles.fields}>
        <label className={styles.wide}>Full name *<input autoComplete="name" maxLength={120} name="fullName" placeholder="Your official name" required /></label>
        <label>Scholar No. *<input autoCapitalize="characters" maxLength={24} name="scholarId" placeholder="Scholar number" required /></label>
        <label>Branch *<select defaultValue="" name="branch" required><option disabled value="">Select branch</option>{btechBranches.map((branch) => <option key={branch}>{branch}</option>)}</select></label>
        <fieldset className={styles.wide}>
          <legend>Gender *</legend>
          <div className={styles.radioRow}>{["Male", "Female"].map((gender) => <label key={gender}><input name="gender" required type="radio" value={gender} /><span>{gender}</span></label>)}</div>
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
      <button disabled={pending || selectedPositionIds.length === 0} type="submit">{pending ? "Submitting…" : selectedPositionIds.length ? `Submit ${selectedPositionIds.length} application${selectedPositionIds.length === 1 ? "" : "s"}` : "Select a position"}<span>↗</span></button>
      <small>After submitting, A.R.E.N.A will contact you later through your email or phone number.</small>
    </div>
  </form>;
}
