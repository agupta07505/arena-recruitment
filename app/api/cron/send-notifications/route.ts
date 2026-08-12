import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authorization !== `Bearer ${process.env.CRON_SECRET}`) return new Response("Unauthorized", { status: 401 });
  if (!process.env.BREVO_API_KEY) return Response.json({ ok: false, reason: "Brevo API is not configured" }, { status: 503 });
  const supabase = createAdminClient();
  // Unsent failures remain eligible so a transient provider outage is retried
  // on the next scheduled run instead of silently stranding the message.
  const { data: notifications, error } = await supabase.from("notifications").select("id, recipient_id, title, body").not("email_queued_at", "is", null).is("email_sent_at", null).limit(50);
  if (error) return Response.json({ ok: false, reason: error.message }, { status: 500 });
  const recipientIds = Array.from(new Set((notifications ?? []).map((notification) => notification.recipient_id)));
  const { data: profiles } = recipientIds.length ? await supabase.from("profiles").select("id, email, full_name").in("id", recipientIds) : { data: [] };
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  let sent = 0;
  for (const notification of notifications ?? []) {
    const recipient = profileById.get(notification.recipient_id);
    if (!recipient?.email) continue;
    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", headers: { "api-key": process.env.BREVO_API_KEY, "content-type": "application/json" }, body: JSON.stringify({ sender: { email: process.env.EMAIL_FROM ?? "arena@iiitbhopal.ac.in", name: "A.R.E.N.A IIIT Bhopal" }, to: [{ email: recipient.email, name: recipient.full_name ?? undefined }], subject: notification.title, htmlContent: `<div style="background:#080a08;color:#eef0e9;padding:32px;font-family:Arial,sans-serif"><h1 style="color:#d8ff3e">A.R.E.N.A</h1><h2>${escapeHtml(notification.title)}</h2><p>${escapeHtml(notification.body)}</p><p style="color:#777">Sign in to your applicant workspace for the complete update.</p></div>` }) });
      if (!response.ok) throw new Error((await response.text()).slice(0, 500));
      await supabase.from("notifications").update({ email_sent_at: new Date().toISOString(), email_error: null }).eq("id", notification.id);
      sent++;
    } catch (failure) {
      await supabase.from("notifications").update({ email_failed_at: new Date().toISOString(), email_error: failure instanceof Error ? failure.message : "Unknown delivery failure" }).eq("id", notification.id);
    }
  }
  return Response.json({ ok: true, inspected: notifications?.length ?? 0, sent });
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
