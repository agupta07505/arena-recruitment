import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { ArrowUpRight } from "@/components/icons";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requestPasswordResetAction, signInAction } from "@/app/auth/actions";
import styles from "./auth.module.css";

type AuthScreenProps = {
  error: string | null;
  message: string | null;
};

export function AuthScreen({ error, message }: AuthScreenProps) {
  const configured = isSupabaseConfigured();

  return (
    <main className={styles.shell}>
      <div className={styles.grid} aria-hidden="true" />
      <header className={styles.header}>
        <Link href="/"><BrandMark /></Link>
        <Link className={styles.back} href="/">Back to arena <ArrowUpRight /></Link>
      </header>

      <section className={styles.context}>
        <span className={styles.eyebrow}><i /> Authorized staff / 01</span>
        <h1>Staff<br /><em>access.</em></h1>
        <p>This sign-in is reserved for authorized A.R.E.N.A recruitment staff. Applicants do not need an account.</p>
      </section>

      <section className={styles.authPanel} aria-labelledby="auth-title">
        <div className={styles.panelHeader}>
          <span>Staff terminal</span><b>Secure</b>
        </div>
        <h2 id="auth-title">Sign in</h2>
        <p>Use the account granted access to the recruitment database.</p>

        {!configured && (
          <div className={styles.notice} role="status">
            Authentication is not connected. Add the Supabase values to <code>.env.local</code>.
          </div>
        )}
        {error && <div className={styles.error} role="alert">{error}</div>}
        {message && <div className={styles.success} role="status">{message}</div>}

        <form action={signInAction} className={styles.form}>
          <label>
            <span>Email address</span>
            <input autoComplete="email" disabled={!configured} name="email" placeholder="you@example.com" required type="email" />
          </label>
          <label>
            <span>Password</span>
            <input autoComplete="current-password" disabled={!configured} minLength={8} name="password" placeholder="Your password" required type="password" />
          </label>
          <button className={styles.submitButton} disabled={!configured} type="submit">Enter staff console</button>
        </form>
        <form action={requestPasswordResetAction} className={styles.resetForm}>
          <label><span>Forgot your password?</span><input autoComplete="email" disabled={!configured} name="email" placeholder="Staff email address" required type="email" /></label>
          <button disabled={!configured} type="submit">Send password reset link</button>
        </form>
        <p className={styles.modeSwitch}>Applying to A.R.E.N.A? <Link href="/apply">Open the application form</Link></p>
      </section>
    </main>
  );
}
