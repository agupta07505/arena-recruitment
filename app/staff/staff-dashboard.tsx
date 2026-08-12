"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { formatApplicationStatus } from "@/lib/recruitment-validation";
import { grantStaffRoleAction, updateCampaignAction } from "./actions";
import styles from "./staff.module.css";

export type QueueApplication = {
  id: string;
  applicantName: string;
  scholarId: string;
  email: string;
  year: number | null;
  branch: string;
  gender: "Man" | "Woman" | null;
  positionId: string;
  position: string;
  positionCapacity: number;
  division: string;
  status: string;
  submittedAt: string | null;
  reviewCount: number;
  averageScore: number | null;
};

type StaffDashboardProps = {
  applications: QueueApplication[];
  roles: string[];
  staffCount: number;
  campaign: { id: string; name: string; status: string; opens_at: string | null; closes_at: string | null; is_published: boolean } | null;
  readiness: { turnstile: boolean; email: boolean };
  audits: { id: string; action: string; entity: string; createdAt: string }[];
};

export function StaffDashboard({ applications, audits, campaign, readiness, roles, staffCount }: StaffDashboardProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [position, setPosition] = useState("all");
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isAdmin = roles.includes("admin");
  const positionOptions = Array.from(new Set(applications.map((application) => application.position)));
  const visible = useMemo(() => applications.filter((application) => {
    const haystack = `${application.applicantName} ${application.scholarId} ${application.email} ${application.position}`.toLowerCase();
    return haystack.includes(query.toLowerCase()) && (status === "all" || application.status === status) && (position === "all" || application.position === position);
  }), [applications, position, query, status]);
  const reviewed = applications.filter((application) => application.reviewCount > 0).length;
  const uniqueApplicants = new Set(applications.map((application) => application.email)).size;
  const funnel = ["submitted", "under_review", "shortlisted", "interview_scheduled", "interviewed", "selected"].map((stage) => ({ stage, count: applications.filter((application) => application.status === stage).length }));
  const positionDemand = positionOptions.map((name) => { const items = applications.filter((application) => application.position === name); return { name, count: items.length, capacity: items[0]?.positionCapacity ?? 0 }; });

  function grantAccess(formData: FormData) {
    startTransition(async () => {
      const result = await grantStaffRoleAction({ email: String(formData.get("email") ?? ""), role: String(formData.get("role") ?? "reviewer") as "admin" | "reviewer" | "interviewer" | "observer" });
      setNotice(result.message);
    });
  }

  return <>
    <section className={styles.commandStrip}>
      <div><span>Campaign</span><strong>{campaign?.name ?? "Configuration mode"}</strong></div>
      <div><span>Visible queue</span><strong>{applications.length.toString().padStart(2, "0")}</strong></div>
      <div><span>Reviews started</span><strong>{reviewed.toString().padStart(2, "0")}</strong></div>
      <div><span>Authorized staff</span><strong>{staffCount.toString().padStart(2, "0")}</strong></div>
    </section>

    <section className={styles.queueSection}>
      <div className={styles.sectionLead}><div><span>01 / Recruitment control</span><h2>Application<br /><em>queue.</em></h2></div><p>Search the full applicant signal, narrow the pipeline, then open a record for assignment, scoring, and decision control.</p></div>
      <div className={styles.filters}>
        <label><span>Search</span><input onChange={(event) => setQuery(event.target.value)} placeholder="Name, scholar ID, email, position…" value={query} /></label>
        <label><span>Status</span><select onChange={(event) => setStatus(event.target.value)} value={status}><option value="all">All statuses</option>{["submitted", "under_review", "shortlisted", "interview_scheduled", "interviewed", "selected", "waitlisted", "rejected", "withdrawn"].map((value) => <option key={value} value={value}>{formatApplicationStatus(value)}</option>)}</select></label>
        <label><span>Position</span><select onChange={(event) => setPosition(event.target.value)} value={position}><option value="all">All positions</option>{positionOptions.map((value) => <option key={value}>{value}</option>)}</select></label>
        <div className={styles.resultCount}><strong>{visible.length.toString().padStart(2, "0")}</strong><span>results</span></div>
      </div>
      {(roles.includes("admin") || roles.includes("observer")) && <a className={styles.exportLink} href={`/api/staff/export?q=${encodeURIComponent(query)}&status=${encodeURIComponent(status)}&position=${encodeURIComponent(position === "all" ? "all" : applications.find((item) => item.position === position)?.positionId ?? "all")}`}>Export current result / CSV ↗</a>}
      <div className={styles.queueTable} role="table">
        <div className={styles.tableHead} role="row"><span>Applicant</span><span>Position</span><span>Stage</span><span>Review signal</span><span /></div>
        {visible.map((application) => <article key={application.id} role="row">
          <div><strong>{application.applicantName || "Unnamed applicant"}</strong><small>{application.scholarId || application.email} · Year {application.year ?? "—"}</small></div>
          <div><strong>{application.position}</strong><small>{application.division}</small></div>
          <div><i data-status={application.status} /> <span>{formatApplicationStatus(application.status)}</span><small>{application.submittedAt ? new Date(application.submittedAt).toLocaleDateString() : "Draft record"}</small></div>
          <div><strong>{application.averageScore ? `${application.averageScore.toFixed(1)} / 5` : "Awaiting"}</strong><small>{application.reviewCount} completed review{application.reviewCount === 1 ? "" : "s"}</small></div>
          <Link href={`/staff/applications/${application.id}`}>Open record ↗</Link>
        </article>)}
        {!visible.length && <div className={styles.emptyQueue}><span>00 / no match</span><strong>No applications meet this filter.</strong></div>}
      </div>
    </section>

    <section className={styles.analyticsSection}><div className={styles.sectionLead}><div><span>02 / Internal intelligence</span><h2>Recruitment<br /><em>signal.</em></h2></div><p>Internal operational reporting only. Gender and applicant-level information never appears on the public website.</p></div><div className={styles.analyticsGrid}><article><span>Unique applicants</span><strong>{uniqueApplicants}</strong><small>{applications.length} total applications</small></article><article><span>Woman applicants</span><strong>{new Set(applications.filter((item) => item.gender === "Woman").map((item) => item.email)).size}</strong><small>unique registered candidates</small></article><article><span>Man applicants</span><strong>{new Set(applications.filter((item) => item.gender === "Man").map((item) => item.email)).size}</strong><small>unique registered candidates</small></article><article><span>Reviews complete</span><strong>{reviewed}</strong><small>applications with reviewer signal</small></article></div><div className={styles.chartGrid}><div><h3>Pipeline / exact state</h3>{funnel.map((item) => <div className={styles.barRow} key={item.stage}><span>{formatApplicationStatus(item.stage)}</span><i style={{ width: `${applications.length ? Math.max(2, item.count / applications.length * 100) : 2}%` }} /><b>{item.count}</b></div>)}</div><div><h3>Demand / available seats</h3>{positionDemand.length ? positionDemand.map((item) => <div className={styles.barRow} key={item.name}><span>{item.name}</span><i style={{ width: `${Math.min(100, Math.max(2, item.count / Math.max(item.capacity, 1) * 35))}%` }} /><b>{item.count}/{item.capacity}</b></div>) : <p>No application demand yet.</p>}</div></div></section>

    {isAdmin && <section className={styles.launchSection}><div><span>03 / Launch control</span><h2>Campaign<br />interlock.</h2><p>Publishing is blocked until anti-bot protection and transactional email are configured.</p><div className={styles.readinessList}><b data-ready={readiness.turnstile}>Turnstile {readiness.turnstile ? "ready" : "missing"}</b><b data-ready={readiness.email}>Email worker {readiness.email ? "ready" : "missing"}</b><b data-ready={Boolean(campaign?.opens_at && campaign?.closes_at)}>Dates {campaign?.opens_at && campaign?.closes_at ? "ready" : "missing"}</b></div></div><CampaignControl campaign={campaign} readiness={readiness} /></section>}

    {isAdmin && <section className={styles.accessSection}>
      <div><span>04 / Access control</span><h2>Build the<br />review panel.</h2><p>Accounts must exist before access is granted. Database policies enforce every role after this point.</p></div>
      <form action={grantAccess}>
        <label><span>Account email</span><input name="email" placeholder="reviewer@iiitbhopal.ac.in" required type="email" /></label>
        <label><span>Staff role</span><select defaultValue="reviewer" name="role"><option value="reviewer">Reviewer</option><option value="interviewer">Interviewer</option><option value="observer">Observer / club in-charge</option><option value="admin">Administrator</option></select></label>
        <button disabled={isPending} type="submit">{isPending ? "Granting…" : "Grant access"}</button>
        {notice && <p>{notice}</p>}
      </form>
    </section>}
    {(roles.includes("admin") || roles.includes("observer")) && <section className={styles.auditSection}><div><span>05 / Immutable activity</span><h2>Recent audit trail.</h2></div><div>{audits.length ? audits.map((audit) => <article key={audit.id}><span>{new Date(audit.createdAt).toLocaleString()}</span><strong>{audit.action.replaceAll(".", " / ")}</strong><small>{audit.entity}</small></article>) : <p>No status-changing activity recorded yet.</p>}</div></section>}
  </>;
}

function CampaignControl({ campaign, readiness }: { campaign: StaffDashboardProps["campaign"]; readiness: StaffDashboardProps["readiness"] }) {
  const [message, setMessage] = useState<string | null>(null); const [pending, startTransition] = useTransition();
  if (!campaign) return <p>Campaign configuration not found.</p>;
  return <form className={styles.campaignForm} onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const action = String((event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") ?? "save") as "save" | "publish" | "close"; startTransition(async () => setMessage((await updateCampaignAction({ campaignId: campaign.id, opensAt: localIndiaTimeToIso(String(data.get("opensAt"))), closesAt: localIndiaTimeToIso(String(data.get("closesAt"))), action })).message)); }}><label><span>Opens / IST</span><input defaultValue={campaign.opens_at ? formatIndiaDateTimeLocal(campaign.opens_at) : ""} name="opensAt" required type="datetime-local" /></label><label><span>Closes / IST</span><input defaultValue={campaign.closes_at ? formatIndiaDateTimeLocal(campaign.closes_at) : ""} name="closesAt" required type="datetime-local" /></label><div><button disabled={pending} type="submit" value="save">Save draft</button>{campaign.status === "open" ? <button disabled={pending} type="submit" value="close">Close campaign</button> : <button disabled={pending || !readiness.turnstile || !readiness.email} type="submit" value="publish">Publish campaign</button>}</div>{message && <p>{message}</p>}</form>;
}

function formatIndiaDateTimeLocal(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

function localIndiaTimeToIso(value: string) {
  return new Date(`${value}:00+05:30`).toISOString();
}
