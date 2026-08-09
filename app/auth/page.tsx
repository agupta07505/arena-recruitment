import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { ArrowUpRight } from "@/components/icons";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  signInAction,
  signInWithGoogleAction,
  signUpAction,
} from "@/app/auth/actions";
import styles from "./auth.module.css";

type AuthPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;
  const message = typeof params.message === "string" ? params.message : null;
  const configured = isSupabaseConfigured();

  return (
    <main className={styles.shell}>
      <div className={styles.grid} aria-hidden="true" />
      <header className={styles.header}>
        <Link href="/"><BrandMark /></Link>
        <Link className={styles.back} href="/">Back to arena <ArrowUpRight /></Link>
      </header>

      <section className={styles.context}>
        <span className={styles.eyebrow}><i /> Recruitment access / 01</span>
        <h1>One profile.<br /><em>Every role.</em></h1>
        <p>
          Sign in once, build your reusable student profile, and submit independent
          applications for every position you are eligible for.
        </p>
        <div className={styles.securityNote}>
          <strong>Private by design</strong>
          <span>Applicants see only their own records. Scores and internal reviewer comments remain staff-only.</span>
        </div>
      </section>

      <section className={styles.authPanel} aria-labelledby="auth-title">
        <div className={styles.panelHeader}>
          <span>Applicant terminal</span><b>Secure</b>
        </div>
        <h2 id="auth-title">Enter recruitment</h2>
        <p>Use Google or a verified email account. Any email provider is accepted.</p>

        {!configured && (
          <div className={styles.notice} role="status">
            Authentication is ready in code but not connected. Add the Supabase values from <code>.env.example</code> to <code>.env.local</code>.
          </div>
        )}
        {error && <div className={styles.error} role="alert">{error}</div>}
        {message && <div className={styles.success} role="status">{message}</div>}

        <form action={signInWithGoogleAction}>
          <button className={styles.googleButton} disabled={!configured} type="submit">
            <span>G</span> Continue with Google
          </button>
        </form>

        <div className={styles.divider}><span>or verified email</span></div>

        <form className={styles.form}>
          <label>
            <span>Full name <small>required for signup</small></span>
            <input autoComplete="name" disabled={!configured} name="fullName" placeholder="Your full name" type="text" />
          </label>
          <label>
            <span>Email address</span>
            <input autoComplete="email" disabled={!configured} name="email" placeholder="you@example.com" required type="email" />
          </label>
          <label>
            <span>Password</span>
            <input autoComplete="current-password" disabled={!configured} minLength={8} name="password" placeholder="Minimum 8 characters" required type="password" />
          </label>
          <div className={styles.actions}>
            <button disabled={!configured} formAction={signInAction} type="submit">Sign in</button>
            <button disabled={!configured} formAction={signUpAction} type="submit">Create account</button>
          </div>
        </form>
        <small className={styles.consent}>Account creation does not submit an application. Recruitment consent is collected separately in your profile.</small>
      </section>
    </main>
  );
}
