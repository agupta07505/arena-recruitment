import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";

type ExportRow = {
  applicationId: string;
  name: string;
  scholarNo: string;
  degree: string;
  branch: string;
  year: string;
  gender: string;
  contactNo: string;
  email: string;
  position: string;
  status: string;
  relevantExperience: string;
  workLinks: string;
  submittedAt: string;
};

const columns: Array<{ header: string; key: keyof ExportRow; width: number }> = [
  { header: "Application ID", key: "applicationId", width: 38 },
  { header: "Name", key: "name", width: 24 },
  { header: "Scholar No.", key: "scholarNo", width: 16 },
  { header: "Applied Position", key: "position", width: 32 },
  { header: "Degree", key: "degree", width: 12 },
  { header: "Branch", key: "branch", width: 18 },
  { header: "Year", key: "year", width: 12 },
  { header: "Gender", key: "gender", width: 15 },
  { header: "Contact No.", key: "contactNo", width: 18 },
  { header: "Email", key: "email", width: 30 },
  { header: "Relevant Experience", key: "relevantExperience", width: 55 },
  { header: "Work Links", key: "workLinks", width: 55 },
  { header: "Status", key: "status", width: 18 },
  { header: "Submitted At (IST)", key: "submittedAt", width: 24 },
];

function addApplicantSheet(workbook: ExcelJS.Workbook, name: string, rows: ExportRow[]) {
  const sheet = workbook.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = columns;
  sheet.addRows(rows);
  sheet.autoFilter = { from: "A1", to: "N1" };
  sheet.getRow(1).height = 28;
  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FF0A0D0B" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD8FF3E" } };
    cell.alignment = { vertical: "middle" };
  });
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1 && rowNumber % 2 === 0) row.eachCell((cell) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F4EE" } }; });
    row.eachCell((cell) => { cell.alignment = { vertical: "top", wrapText: true }; });
  });
  sheet.properties.defaultRowHeight = 30;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { data: roles } = await supabase.from("staff_roles").select("role").eq("user_id", user.id).in("role", ["admin", "observer"]);
  if (!roles?.length) return new Response("Forbidden", { status: 403 });

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const position = url.searchParams.get("position");
  const degree = url.searchParams.get("degree");
  const year = url.searchParams.get("year");
  const search = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  let query = supabase.from("applications").select("id, status, submitted_at, applicant_name, applicant_scholar_id, applicant_degree, applicant_branch, applicant_year, applicant_gender, applicant_phone, applicant_email, relevant_experience, work_links, applicant:profiles(full_name, scholar_id, email, phone, academic_year, branch, gender, experience, work_links), position:positions(id, title)").neq("status", "draft").order("submitted_at", { ascending: false }).limit(10_000);
  if (status && status !== "all") query = query.eq("status", status);
  if (position && position !== "all") query = query.eq("position_id", position);
  if (degree && degree !== "all") query = query.eq("applicant_degree", degree);
  if (year && year !== "all") query = query.eq("applicant_year", year);
  const { data, error } = await query;
  if (error) return new Response("Export failed", { status: 500 });

  const rows: ExportRow[] = (data ?? []).map((application) => {
    const legacy = Array.isArray(application.applicant) ? application.applicant[0] : application.applicant;
    const role = Array.isArray(application.position) ? application.position[0] : application.position;
    const links = application.work_links?.length ? application.work_links : legacy?.work_links ?? [];
    return {
      applicationId: application.id,
      name: application.applicant_name ?? legacy?.full_name ?? "",
      scholarNo: application.applicant_scholar_id ?? legacy?.scholar_id ?? "",
      degree: application.applicant_degree ?? "B.Tech",
      branch: application.applicant_branch ?? legacy?.branch ?? "",
      year: application.applicant_year ?? (legacy?.academic_year ? String(legacy.academic_year) : ""),
      gender: application.applicant_gender ?? (legacy?.gender === "Man" ? "Male" : legacy?.gender === "Woman" ? "Female" : ""),
      contactNo: application.applicant_phone ?? legacy?.phone ?? "",
      email: application.applicant_email ?? legacy?.email ?? "",
      position: role?.title ?? "Unknown position",
      status: application.status.replaceAll("_", " "),
      relevantExperience: application.relevant_experience ?? legacy?.experience ?? "",
      workLinks: (links as unknown[]).filter((link): link is string => typeof link === "string").join("\n"),
      submittedAt: application.submitted_at ? new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }).format(new Date(application.submitted_at)) : "",
    };
  }).filter((row) => !search || `${row.name} ${row.scholarNo} ${row.email} ${row.position} ${row.degree} ${row.year}`.toLowerCase().includes(search));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "A.R.E.N.A Recruitment";
  workbook.created = new Date();
  addApplicantSheet(workbook, "All Applicants", rows);
  addApplicantSheet(workbook, "By Position", [...rows].sort((a, b) => a.position.localeCompare(b.position) || a.name.localeCompare(b.name)));
  addApplicantSheet(workbook, "By Degree", [...rows].sort((a, b) => a.degree.localeCompare(b.degree) || a.name.localeCompare(b.name)));
  addApplicantSheet(workbook, "By Year", [...rows].sort((a, b) => a.year.localeCompare(b.year, undefined, { numeric: true }) || a.name.localeCompare(b.name)));
  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer as ArrayBuffer, { headers: {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="arena-applicants-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    "Cache-Control": "no-store",
  } });
}
