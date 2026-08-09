import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { signOutAction } from "@/app/auth/actions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import styles from "./applicant.module.css";

export const dynamic = "force-dynamic";

export default async function ApplicantPage() {
  if (!isSupabaseConfigured()) redirect("/auth");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, scholar_id, phone, branch, academic_year, gender")
    .eq("id", user.id)
    .maybeSingle();
  const completeFields = profile
    ? [profile.full_name, profile.scholar_id, profile.phone, profile.branch, profile.academic_year, profile.gender].filter(Boolean).length
    : 0;
  const completion = Math.round((completeFields / 6) * 100);

  return (
    <main className={styles.shell}>
      <header><Link href="/"><BrandMark /></Link><form action={signOutAction}><button type="submit">Sign out</button></form></header>
      <section className={styles.hero}>
        <span>Applicant workspace / authenticated</span>
        <h1>Welcome, {profile?.full_name?.split(" ")[0] ?? "player"}.</h1>
        <p>Your reusable profile is the starting point for every position application.</p>
      </section>
      <section className={styles.grid}>
        <article>
          <small>Profile readiness</small><strong>{completion}%</strong>
          <div className={styles.progress}><i style={{ width: `${completion}%` }} /></div>
          <p>Complete your scholar ID, contact details, academic information, gender, availability, and consent before submitting.</p>
          <button disabled type="button">Profile editor — next build</button>
        </article>
        <article><small>Applications</small><strong>00</strong><p>Your eligible positions and independent application drafts will appear here when the campaign is published.</p></article>
        <article><small>Recruitment status</small><strong>Standby</strong><p>The seeded campaign remains safely unpublished until dates and final wording are confirmed.</p></article>
      </section>
    </main>
  );
}
