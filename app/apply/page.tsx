import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { createClient } from "@/lib/supabase/server";
import { ApplicationForm, type PublicPosition } from "./application-form";
import styles from "./apply.module.css";

export const dynamic = "force-dynamic";

export default async function ApplyPage({ searchParams }: { searchParams: Promise<{ position?: string }> }) {
  const { position: requestedSlug } = await searchParams;
  const supabase = await createClient();
  const { data: campaign } = await supabase.from("campaigns").select("id, name, status, opens_at, closes_at").eq("is_published", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const { data: rows } = campaign ? await supabase.from("positions").select("id, slug, title, division, sort_order").eq("campaign_id", campaign.id).eq("is_active", true).order("sort_order") : { data: [] };
  const positions: PublicPosition[] = (rows ?? []).map((item) => ({ id: item.id, slug: item.slug, title: item.title, division: item.division }));
  const selected = positions.find((item) => item.slug === requestedSlug)?.id ?? "";
  const isOpen = Boolean(campaign?.status === "open" && campaign.opens_at && campaign.closes_at);

  return <main className={styles.shell}>
    <div className={styles.grid} aria-hidden="true" />
    <header><Link href="/"><BrandMark /></Link><Link href="/">Back to website ↗</Link></header>
    <section className={styles.hero}>
      <div><span>A.R.E.N.A recruitment / simple entry</span><h1>One form.<br /><em>Your move.</em></h1></div>
      <p>Select one position and share the details below. No sign-up, password, or account is required.</p>
    </section>
    {isOpen && positions.length ? <ApplicationForm initialPosition={selected} positions={positions} /> : <section className={styles.closed}><span>Recruitment desk</span><h2>Applications are currently closed.</h2><p>Please check A.R.E.N.A&apos;s official channels for the next update.</p><Link href="/">Return home</Link></section>}
  </main>;
}
