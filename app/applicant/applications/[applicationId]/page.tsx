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

  const { data: application } = await supabase.from("applications").select("id, status, applicant_id, position:positions(id, title, division, summary, eligible_years)").eq("id", applicationId).eq("applicant_id", user.id).maybeSingle();
  if (!application) notFound();
  const position = Array.isArray(application.position) ? application.position[0] : application.position;
  if (!position) notFound();

  const [{ data: questionRows }, { data: answerRows }] = await Promise.all([
    supabase.from("position_questions").select("id, prompt, help_text, kind, is_required, sort_order").eq("position_id", position.id).order("sort_order"),
    supabase.from("application_answers").select("question_id, answer_text").eq("application_id", application.id),
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

  return <ApplicationForm applicationId={application.id} position={{ title: position.title, division: position.division, summary: position.summary, eligibleYears: position.eligible_years }} questions={questions} status={application.status} />;
}
