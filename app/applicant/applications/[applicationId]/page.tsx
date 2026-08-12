import { notFound, redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { ApplicationForm, type ApplicationQuestion } from "./application-form";

export const dynamic = "force-dynamic";

export default async function ApplicationPage({ params }: { params: Promise<{ applicationId: string }> }) {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");
  const { applicationId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: application } = await supabase.from("applications").select("id, status, submitted_at, withdrawn_at, applicant_id, position:positions(id, title, division, summary, eligible_years)").eq("id", applicationId).eq("applicant_id", user.id).maybeSingle();
  if (!application) notFound();
  const position = Array.isArray(application.position) ? application.position[0] : application.position;
  if (!position) notFound();

  const [{ data: questionRows }, { data: answerRows }, { data: bookingRow }] = await Promise.all([
    supabase.from("position_questions").select("id, prompt, help_text, kind, is_required, sort_order").eq("position_id", position.id).order("sort_order"),
    supabase.from("application_answers").select("question_id, answer_text").eq("application_id", application.id),
    supabase.from("interview_bookings").select("status, slot:interview_slots(starts_at, ends_at, venue, meeting_url)").eq("application_id", application.id).in("status", ["pending", "confirmed"]).maybeSingle(),
  ]);
  const answers = new Map((answerRows ?? []).map((answer) => [answer.question_id, answer.answer_text ?? ""]));
  const questions: ApplicationQuestion[] = (questionRows ?? []).map((question) => ({
    id: question.id,
    prompt: question.prompt,
    helpText: question.help_text,
    kind: question.kind,
    required: question.is_required,
    answer: answers.get(question.id) ?? "",
  }));

  const slot = bookingRow?.slot ? (Array.isArray(bookingRow.slot) ? bookingRow.slot[0] : bookingRow.slot) : null;
  const booking = bookingRow && slot ? { status: bookingRow.status, startsAt: slot.starts_at, endsAt: slot.ends_at, venue: slot.venue, meetingUrl: slot.meeting_url } : null;
  return <ApplicationForm applicationId={application.id} position={{ title: position.title, division: position.division, summary: position.summary, eligibleYears: position.eligible_years }} questions={questions} status={application.status} submittedAt={application.submitted_at} withdrawnAt={application.withdrawn_at} booking={booking} />;
}
