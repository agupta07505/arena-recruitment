import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { updatePasswordAction } from "@/app/auth/actions";
import styles from "../auth.module.css";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main className={styles.shell}>
    <div className={styles.grid} aria-hidden="true" />
    <header className={styles.header}><Link href="/"><BrandMark /></Link><Link className={styles.back} href="/auth/sign-in">Back to sign in</Link></header>
    <section className={styles.context}><span className={styles.eyebrow}><i /> Staff security / reset</span><h1>New<br /><em>password.</em></h1><p>Choose a strong password for the authorized staff account.</p></section>
    <section className={styles.authPanel} aria-labelledby="reset-title">
      <div className={styles.panelHeader}><span>Staff terminal</span><b>Secure</b></div>
      <h2 id="reset-title">Reset password</h2>
      <p>The reset link must be opened from the staff email inbox.</p>
      {error && <div className={styles.error} role="alert">{error}</div>}
      <form action={updatePasswordAction} className={styles.form}>
        <label><span>New password</span><input autoComplete="new-password" minLength={10} name="password" required type="password" /></label>
        <label><span>Confirm password</span><input autoComplete="new-password" minLength={10} name="confirmation" required type="password" /></label>
        <button className={styles.submitButton} type="submit">Save new password</button>
      </form>
    </section>
  </main>;
}
