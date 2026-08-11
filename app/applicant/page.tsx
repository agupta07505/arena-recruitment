import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { signOutAction } from "@/app/auth/actions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { ProfileDraft } from "@/lib/recruitment-validation";
import { ApplicantWorkspace, type WorkspacePosition } from "./applicant-workspace";
import styles from "./applicant.module.css";

export const dynamic = "force-dynamic";

export default async function ApplicantPage() {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const [{ data: profile }, { data: campaign }, { data: applications }] = await Promise.all([
    supabase.from("profiles").select("full_name, scholar_id, phone, branch, academic_year, gender, availability, experience, motivation, work_links, recruitment_consent_at, reporting_consent_at, staff_access_consent_at").eq("id", user.id).maybeSingle(),
    supabase.from("campaigns").select("id, name, status, positions(id, slug, title, division, summary, capacity, eligible_years, sort_order)").eq("is_published", true).in("status", ["open", "closed"]).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("applications").select("id, position_id, status").eq("applicant_id", user.id),
  ]);

  const initialProfile: ProfileDraft = {
    fullName: profile?.full_name ?? user.user_metadata.full_name ?? user.user_metadata.name ?? "",
    scholarId: profile?.scholar_id ?? "",
    phone: profile?.phone ?? "",
    branch: profile?.branch ?? "",
    academicYear: profile?.academic_year ?? null,
    gender: profile?.gender ?? null,
    availability: profile?.availability ?? "",
    experience: profile?.experience ?? "",
    motivation: profile?.motivation ?? "",
    workLinks: profile?.work_links ?? [],
    recruitmentConsent: Boolean(profile?.recruitment_consent_at),
    reportingConsent: Boolean(profile?.reporting_consent_at),
    staffAccessConsent: Boolean(profile?.staff_access_consent_at),
  };
  const applicationByPosition = new Map((applications ?? []).map((application) => [application.position_id, application]));
  const positions: WorkspacePosition[] = (campaign?.positions ?? []).sort((a, b) => a.sort_order - b.sort_order).map((position) => {
    const application = applicationByPosition.get(position.id);
    return {
      id: position.id,
      slug: position.slug,
      title: position.title,
      division: position.division,
      summary: position.summary,
      capacity: position.capacity,
      eligibleYears: position.eligible_years,
      applicationId: application?.id ?? null,
      applicationStatus: application?.status ?? null,
    };
  });

  return (
    <main className={styles.shell}>
      <header><Link href="/"><BrandMark /></Link><div className={styles.headerIdentity}><span>{user.email}</span><form action={signOutAction}><button type="submit">Sign out</button></form></div></header>
      <section className={styles.hero}>
        <span>Applicant workspace / secure session</span>
        <h1>Build your<br /><em>lineup.</em></h1>
        <div><p>Welcome, {initialProfile.fullName.split(" ")[0] || "player"}. Complete one profile, then create independent drafts for every eligible position.</p><small>A.R.E.N.A recruitment console · 01</small></div>
      </section>
      <ApplicantWorkspace email={user.email ?? ""} initialProfile={initialProfile} positions={positions} campaignName={campaign?.name ?? null} campaignOpen={campaign?.status === "open"} />
    </main>
  );
}
