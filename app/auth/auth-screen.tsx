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

type AuthMode = "sign-in" | "sign-up";

type AuthScreenProps = {
  mode: AuthMode;
  error: string | null;
  message: string | null;
};

const content = {
  "sign-in": {
    index: "01",
    eyebrow: "Returning applicant",
    title: <>Welcome<br /><em>back.</em></>,
    intro: "Return to your applicant workspace, continue your profile, and track every role from one secure account.",
    panelTitle: "Sign in",
    panelCopy: "Use the account connected to your recruitment profile.",
    google: "Sign in with Google",
    submit: "Enter applicant portal",
    switchCopy: "New to A.R.E.N.A recruitment?",
    switchLabel: "Create an account",
    switchHref: "/auth/sign-up",
  },
  "sign-up": {
    index: "02",
    eyebrow: "New applicant",
    title: <>Build your<br /><em>profile.</em></>,
    intro: "Create one reusable student profile, then submit independent applications for every position you are eligible for.",
    panelTitle: "Create account",
    panelCopy: "Start with Google or any verified email address.",
    google: "Sign up with Google",
    submit: "Create applicant account",
    switchCopy: "Already have an account?",
    switchLabel: "Sign in instead",
    switchHref: "/auth/sign-in",
  },
} satisfies Record<AuthMode, Record<string, React.ReactNode>>;

export function AuthScreen({ mode, error, message }: AuthScreenProps) {
  const configured = isSupabaseConfigured();
  const copy = content[mode];
  const isSignUp = mode === "sign-up";

  return (
    <main className={styles.shell}>
      <div className={styles.grid} aria-hidden="true" />
      <header className={styles.header}>
        <Link href="/"><BrandMark /></Link>
        <Link className={styles.back} href="/">Back to arena <ArrowUpRight /></Link>
      </header>

      <section className={styles.context}>
        <span className={styles.eyebrow}><i /> {copy.eyebrow} / {copy.index}</span>
        <h1>{copy.title}</h1>
        <p>{copy.intro}</p>
      </section>

      <section className={styles.authPanel} aria-labelledby="auth-title">
        <div className={styles.panelHeader}>
          <span>Applicant terminal</span><b>Secure</b>
        </div>

        <nav className={styles.modeNav} aria-label="Authentication options">
          <Link aria-current={!isSignUp ? "page" : undefined} href="/auth/sign-in">Sign in</Link>
          <Link aria-current={isSignUp ? "page" : undefined} href="/auth/sign-up">Sign up</Link>
        </nav>

        <h2 id="auth-title">{copy.panelTitle}</h2>
        <p>{copy.panelCopy}</p>

        {!configured && (
          <div className={styles.notice} role="status">
            Authentication is not connected. Add the Supabase values to <code>.env.local</code>.
          </div>
        )}
        {error && <div className={styles.error} role="alert">{error}</div>}
        {message && <div className={styles.success} role="status">{message}</div>}

        <form action={signInWithGoogleAction}>
          <input name="authMode" type="hidden" value={mode} />
          <button className={styles.googleButton} disabled={!configured} type="submit">
            <span>G</span> {copy.google}
          </button>
        </form>

        <div className={styles.divider}><span>or verified email</span></div>

        <form action={isSignUp ? signUpAction : signInAction} className={styles.form}>
          {isSignUp && (
            <label>
              <span>Full name</span>
              <input autoComplete="name" disabled={!configured} name="fullName" placeholder="Your full name" required type="text" />
            </label>
          )}
          <label>
            <span>Email address</span>
            <input autoComplete="email" disabled={!configured} name="email" placeholder="you@example.com" required type="email" />
          </label>
          <label>
            <span>Password</span>
            <input autoComplete={isSignUp ? "new-password" : "current-password"} disabled={!configured} minLength={8} name="password" placeholder="Minimum 8 characters" required type="password" />
          </label>
          <button className={styles.submitButton} disabled={!configured} type="submit">{copy.submit}</button>
        </form>

        {isSignUp && (
          <small className={styles.consent}>Account creation does not submit an application. Recruitment consent is collected separately in your profile.</small>
        )}
        <p className={styles.modeSwitch}>{copy.switchCopy} <Link href={String(copy.switchHref)}>{copy.switchLabel}</Link></p>
      </section>
    </main>
  );
}
