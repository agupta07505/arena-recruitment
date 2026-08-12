"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { formatApplicationStatus } from "@/lib/recruitment-validation";
import { grantStaffRoleAction } from "./actions";
import styles from "./staff.module.css";

export type QueueApplication = {
  id: string;
  applicantName: string;
  scholarId: string;
  email: string;
  year: number | null;
  branch: string;
  position: string;
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
  campaignName: string | null;
};

export function StaffDashboard({ applications, campaignName, roles, staffCount }: StaffDashboardProps) {
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

  function grantAccess(formData: FormData) {
    startTransition(async () => {
      const result = await grantStaffRoleAction({ email: String(formData.get("email") ?? ""), role: String(formData.get("role") ?? "reviewer") as "admin" | "reviewer" | "interviewer" | "observer" });
      setNotice(result.message);
    });
  }

  return <>
    <section className={styles.commandStrip}>
      <div><span>Campaign</span><strong>{campaignName ?? "Configuration mode"}</strong></div>
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

    {isAdmin && <section className={styles.accessSection}>
      <div><span>02 / Access control</span><h2>Build the<br />review panel.</h2><p>Accounts must exist before access is granted. Database policies enforce every role after this point.</p></div>
      <form action={grantAccess}>
        <label><span>Account email</span><input name="email" placeholder="reviewer@iiitbhopal.ac.in" required type="email" /></label>
        <label><span>Staff role</span><select defaultValue="reviewer" name="role"><option value="reviewer">Reviewer</option><option value="interviewer">Interviewer</option><option value="observer">Observer / club in-charge</option><option value="admin">Administrator</option></select></label>
        <button disabled={isPending} type="submit">{isPending ? "Granting…" : "Grant access"}</button>
        {notice && <p>{notice}</p>}
      </form>
    </section>}
  </>;
}
