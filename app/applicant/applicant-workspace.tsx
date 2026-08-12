"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createDraftApplicationAction,
  markNotificationReadAction,
  saveProfileAction,
} from "./actions";
import {
  academicYears,
  branchOptions,
  getProfileReadiness,
  type ProfileDraft,
  formatApplicationStatus,
} from "@/lib/recruitment-validation";
import styles from "./applicant.module.css";

export type WorkspacePosition = {
  id: string;
  slug: string;
  title: string;
  division: string;
  summary: string;
  capacity: number;
  eligibleYears: number[];
  applicationId: string | null;
  applicationStatus: string | null;
};

type ApplicantWorkspaceProps = {
  email: string;
  initialProfile: ProfileDraft;
  positions: WorkspacePosition[];
  campaignName: string | null;
  campaignOpen: boolean;
  notifications: WorkspaceNotification[];
};

export type WorkspaceNotification = { id: string; title: string; body: string; createdAt: string; readAt: string | null; applicationId: string | null };

function timeLabel(value: Date | null) {
  if (!value) return "Not saved yet";
  return `Saved ${value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export function ApplicantWorkspace({ email, initialProfile, positions, campaignName, campaignOpen, notifications: initialNotifications }: ApplicantWorkspaceProps) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [activePanel, setActivePanel] = useState<"profile" | "positions" | "notifications">("profile");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("Your changes save automatically");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [applicationError, setApplicationError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [isSaving, startSaving] = useTransition();
  const [isOpening, startOpening] = useTransition();
  const initialProfileHash = useRef(JSON.stringify(initialProfile));

  const readiness = useMemo(() => getProfileReadiness(profile), [profile]);

  async function persistProfile(nextProfile = profile) {
    setSaveState("saving");
    setSaveMessage("Saving encrypted draft…");
    const result = await saveProfileAction(nextProfile);
    if (result.ok) {
      setSaveState("saved");
      setSaveMessage(result.message);
      setSavedAt(result.savedAt ? new Date(result.savedAt) : new Date());
    } else {
      setSaveState("error");
      setSaveMessage(result.message);
    }
  }

  useEffect(() => {
    if (JSON.stringify(profile) === initialProfileHash.current) return;
    const timer = window.setTimeout(() => startSaving(async () => {
      setSaveState("saving");
      setSaveMessage("Saving encrypted draft…");
      const result = await saveProfileAction(profile);
      if (result.ok) {
        setSaveState("saved");
        setSaveMessage(result.message);
        setSavedAt(result.savedAt ? new Date(result.savedAt) : new Date());
      } else {
        setSaveState("error");
        setSaveMessage(result.message);
      }
    }), 900);
    return () => window.clearTimeout(timer);
  }, [profile]);

  function updateProfile<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
    setSaveState("idle");
    setSaveMessage("Unsaved changes");
  }

  function openApplication(positionId: string) {
    setApplicationError(null);
    startOpening(async () => {
      await persistProfile();
      const result = await createDraftApplicationAction(positionId);
      if (result.ok && result.applicationId) {
        router.push(`/applicant/applications/${result.applicationId}`);
        return;
      }
      setApplicationError(result.message);
    });
  }

  const eligibleCount = positions.filter((position) => profile.academicYear && position.eligibleYears.includes(profile.academicYear)).length;
  const draftCount = positions.filter((position) => position.applicationId).length;

  return (
    <>
      <section className={styles.commandBar} aria-label="Application progress">
        <div className={styles.readinessDial} style={{ "--readiness": `${readiness.percentage * 3.6}deg` } as React.CSSProperties}>
          <span>{readiness.percentage}</span><small>%</small>
        </div>
        <div>
          <span className={styles.overline}>Profile readiness</span>
          <strong>{readiness.completed} of {readiness.total} checks complete</strong>
          <p>One profile powers every role application.</p>
        </div>
        <div className={styles.commandStats}>
          <span><b>{eligibleCount.toString().padStart(2, "0")}</b> eligible roles</span>
          <span><b>{draftCount.toString().padStart(2, "0")}</b> active drafts</span>
        </div>
      </section>

      <nav className={styles.workspaceNav} aria-label="Applicant workspace sections">
        <button className={activePanel === "profile" ? styles.activeTab : ""} onClick={() => setActivePanel("profile")} type="button">
          <span>01</span> Profile
        </button>
        <button className={activePanel === "positions" ? styles.activeTab : ""} onClick={() => setActivePanel("positions")} type="button">
          <span>02</span> Positions <i>{positions.length}</i>
        </button>
        <button className={activePanel === "notifications" ? styles.activeTab : ""} onClick={() => setActivePanel("notifications")} type="button">
          <span>03</span> Updates <i>{notifications.filter((notification) => !notification.readAt).length}</i>
        </button>
        <div className={`${styles.saveSignal} ${styles[saveState]}`} aria-live="polite">
          <i /> {isSaving ? "Saving…" : saveMessage} <small>{timeLabel(savedAt)}</small>
        </div>
      </nav>

      {activePanel === "profile" ? (
        <section className={styles.profileLayout}>
          <aside className={styles.profileGuide}>
            <span className={styles.overline}>Reusable applicant record</span>
            <h2>Build your<br />player card.</h2>
            <p>Keep this information accurate. It is shared with the authorized recruitment panel for every role you apply to.</p>
            <ol>
              <li className={profile.fullName && profile.scholarId ? styles.done : ""}><b>01</b><span>Identity</span></li>
              <li className={profile.academicYear && profile.branch ? styles.done : ""}><b>02</b><span>Academic signal</span></li>
              <li className={profile.availability ? styles.done : ""}><b>03</b><span>Working profile</span></li>
              <li className={profile.recruitmentConsent && profile.reportingConsent && profile.staffAccessConsent ? styles.done : ""}><b>04</b><span>Consent</span></li>
            </ol>
          </aside>

          <form className={styles.profileForm} onSubmit={(event) => { event.preventDefault(); startSaving(() => persistProfile()); }}>
            <fieldset>
              <legend><span>01</span> Identity & contact</legend>
              <div className={styles.fieldGrid}>
                <label className={styles.wideField}>Full name<input autoComplete="name" value={profile.fullName} onChange={(event) => updateProfile("fullName", event.target.value)} placeholder="Your official name" /></label>
                <label>Scholar ID<input autoCapitalize="characters" value={profile.scholarId} onChange={(event) => updateProfile("scholarId", event.target.value.toUpperCase())} placeholder="22BCY000" /></label>
                <label>Phone / WhatsApp<input autoComplete="tel" inputMode="tel" value={profile.phone} onChange={(event) => updateProfile("phone", event.target.value)} placeholder="+91 98765 43210" /></label>
                <label className={styles.wideField}>Account email<input disabled value={email} /><small>Managed by your verified sign-in account</small></label>
              </div>
            </fieldset>

            <fieldset>
              <legend><span>02</span> Academic signal</legend>
              <div className={styles.fieldGrid}>
                <label>Branch<select value={profile.branch} onChange={(event) => updateProfile("branch", event.target.value)}><option value="">Select branch</option>{branchOptions.map((branch) => <option key={branch} value={branch}>{branch}</option>)}</select></label>
                <label>Current academic year<select value={profile.academicYear ?? ""} onChange={(event) => updateProfile("academicYear", event.target.value ? Number(event.target.value) : null)}><option value="">Select year</option>{academicYears.map((year) => <option key={year} value={year}>{year}{year === 1 ? "st" : year === 2 ? "nd" : year === 3 ? "rd" : "th"} year</option>)}</select></label>
                <div className={styles.wideField}>
                  <span className={styles.inputLabel}>Gender</span>
                  <div className={styles.segmented}>{(["Man", "Woman"] as const).map((gender) => <button className={profile.gender === gender ? styles.selectedSegment : ""} key={gender} onClick={() => updateProfile("gender", gender)} type="button">{gender}</button>)}</div>
                  <small>Collected for authorized internal recruitment reporting.</small>
                </div>
              </div>
            </fieldset>

            <fieldset>
              <legend><span>03</span> Working profile</legend>
              <div className={styles.fieldGrid}>
                <label className={styles.wideField}>Weekly availability<textarea rows={4} value={profile.availability} onChange={(event) => updateProfile("availability", event.target.value)} placeholder="Classes, recurring commitments, preferred working hours…" /></label>
                <label className={styles.wideField}>Relevant experience <em>Optional</em><textarea rows={4} value={profile.experience} onChange={(event) => updateProfile("experience", event.target.value)} placeholder="Teams, events, projects, creative work, volunteering…" /></label>
                <label className={styles.wideField}>Why A.R.E.N.A? <em>Optional</em><textarea rows={4} value={profile.motivation} onChange={(event) => updateProfile("motivation", event.target.value)} placeholder="What do you want to help build?" /></label>
                <label className={styles.wideField}>Work links <em>One per line</em><textarea rows={3} value={profile.workLinks.join("\n")} onChange={(event) => updateProfile("workLinks", event.target.value.split("\n"))} placeholder="https://github.com/…&#10;https://drive.google.com/…" /></label>
              </div>
            </fieldset>

            <fieldset>
              <legend><span>04</span> Consent checkpoint</legend>
              <div className={styles.consentStack}>
                <label><input checked={profile.recruitmentConsent} onChange={(event) => updateProfile("recruitmentConsent", event.target.checked)} type="checkbox" /><span><b>Recruitment processing</b>I consent to A.R.E.N.A processing this information for recruitment.</span></label>
                <label><input checked={profile.reportingConsent} onChange={(event) => updateProfile("reportingConsent", event.target.checked)} type="checkbox" /><span><b>Internal reporting</b>I consent to aggregate internal reporting about the recruitment process.</span></label>
                <label><input checked={profile.staffAccessConsent} onChange={(event) => updateProfile("staffAccessConsent", event.target.checked)} type="checkbox" /><span><b>Authorized staff access</b>I understand authorized reviewers and club leadership can access my application.</span></label>
              </div>
            </fieldset>

            <div className={styles.formFooter}>
              <div><span>{readiness.ready ? "Profile cleared" : `${readiness.total - readiness.completed} checks remaining`}</span><p>{readiness.ready ? "You can start any eligible role application." : "Drafts save even while your profile is incomplete."}</p></div>
              <button disabled={isSaving} type="submit">{isSaving ? "Saving…" : "Save now"}</button>
            </div>
          </form>
        </section>
      ) : activePanel === "positions" ? (
        <section className={styles.positionsPanel}>
          <div className={styles.positionsHeading}>
            <div><span className={styles.overline}>Campaign / {campaignOpen ? "live" : "standby"}</span><h2>Choose your<br />arena.</h2></div>
            <p>{campaignName ?? "The next recruitment campaign"}<br /><span>{campaignOpen ? "Applications are open. You may create separate drafts for every eligible role." : "Applications will unlock here when recruitment dates are confirmed."}</span></p>
          </div>
          {applicationError && <p className={styles.applicationError} role="alert">{applicationError}</p>}
          <div className={styles.positionList}>
            {positions.length ? positions.map((position, index) => {
              const eligible = Boolean(profile.academicYear && position.eligibleYears.includes(profile.academicYear));
              const canOpen = readiness.ready && eligible && campaignOpen;
              return (
                <article key={position.id} className={!eligible && profile.academicYear ? styles.ineligibleCard : ""}>
                  <span className={styles.positionIndex}>{String(index + 1).padStart(2, "0")}</span>
                  <div className={styles.positionCopy}><small>{position.division} / {position.capacity.toString().padStart(2, "0")} opening{position.capacity === 1 ? "" : "s"}</small><h3>{position.title}</h3><p>{position.summary}</p></div>
                  <div className={styles.eligibility}><span>Eligible year</span><b>{position.eligibleYears.map((year) => `${year}${year === 1 ? "st" : year === 2 ? "nd" : "rd"}`).join(" / ")}</b><i className={eligible ? styles.eligible : ""}>{eligible ? "Eligible" : profile.academicYear ? "Not eligible" : "Add your year"}</i></div>
                  <button disabled={!position.applicationId && (!canOpen || isOpening)} onClick={() => position.applicationId ? router.push(`/applicant/applications/${position.applicationId}`) : openApplication(position.id)} type="button">{position.applicationId ? (position.applicationStatus === "draft" ? "Continue draft" : `View ${formatApplicationStatus(position.applicationStatus ?? "")}`) : "Start application"}<span>↗</span></button>
                </article>
              );
            }) : <div className={styles.standbyCard}><span>Transmission paused</span><h3>Recruitment is not open yet.</h3><p>Your completed profile will stay ready. Confirmed roles and application forms will appear here when the campaign is published.</p></div>}
          </div>
        </section>
      ) : (
        <section className={styles.notificationsPanel}>
          <div className={styles.positionsHeading}><div><span className={styles.overline}>Applicant signals</span><h2>Status<br />updates.</h2></div><p>Only your public recruitment status appears here.<br /><span>Reviewer scores and private comments remain staff-only.</span></p></div>
          <div className={styles.notificationList}>{notifications.length ? notifications.map((notification) => <article className={notification.readAt ? styles.readNotification : ""} key={notification.id}><i /><div><span>{new Date(notification.createdAt).toLocaleString()}</span><h3>{notification.title}</h3><p>{notification.body}</p></div><div>{notification.applicationId && <button onClick={() => router.push(`/applicant/applications/${notification.applicationId}`)} type="button">Open application ↗</button>}{!notification.readAt && <button onClick={() => startOpening(async () => { const result = await markNotificationReadAction(notification.id); if (result.ok) setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item)); })} type="button">Mark read</button>}</div></article>) : <div className={styles.standbyCard}><span>All quiet</span><h3>No updates yet.</h3><p>Submission receipts and public status changes will appear here.</p></div>}</div>
        </section>
      )}
    </>
  );
}
