import { createCsv } from "@/lib/csv";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { data: roles } = await supabase.from("staff_roles").select("role").eq("user_id", user.id).in("role", ["admin", "observer"]);
  if (!roles?.length) return new Response("Forbidden", { status: 403 });
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const position = url.searchParams.get("position");
  const query = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  let requestQuery = supabase.from("applications").select("id, status, submitted_at, applicant:profiles(full_name, scholar_id, email, phone, academic_year, branch, gender), position:positions(id, title)").neq("status", "draft").order("submitted_at", { ascending: false }).limit(10_000);
  if (status && status !== "all") requestQuery = requestQuery.eq("status", status);
  if (position && position !== "all") requestQuery = requestQuery.eq("position_id", position);
  const { data, error } = await requestQuery;
  if (error) return new Response("Export failed", { status: 500 });
  const rows = (data ?? []).filter((application) => {
    const applicant = Array.isArray(application.applicant) ? application.applicant[0] : application.applicant;
    const role = Array.isArray(application.position) ? application.position[0] : application.position;
    return !query || `${applicant?.full_name} ${applicant?.scholar_id} ${applicant?.email} ${applicant?.phone} ${role?.title}`.toLowerCase().includes(query);
  }).map((application) => {
    const applicant = Array.isArray(application.applicant) ? application.applicant[0] : application.applicant;
    const role = Array.isArray(application.position) ? application.position[0] : application.position;
    return [application.id, applicant?.full_name, applicant?.scholar_id, applicant?.email, applicant?.phone, applicant?.academic_year, applicant?.branch, applicant?.gender, role?.title, application.status, application.submitted_at];
  });
  const csv = createCsv(["Application ID", "Name", "Scholar ID", "Email", "Phone", "Year", "Branch", "Gender", "Position", "Status", "Submitted at"], rows);
  return new Response(`\uFEFF${csv}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="arena-applications-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" } });
}
