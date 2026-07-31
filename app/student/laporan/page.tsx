"use client";

import { useEffect, useMemo, useState } from "react";
import StudentLayout from "../components/StudentLayout";
import { supabase } from "@/lib/supabase";

type StudentRow = {
  id: string;
  full_name: string | null;
  email?: string | null;
  user_id?: string | null;
  parent_id?: string | null;
  grade: string | null;
  level: string | null;
  nis?: string | null;
  nisn?: string | null;
};

type ParentRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type TeacherRow = {
  id: string;
  full_name: string | null;
  email?: string | null;
};

type SubjectRow = {
  id: string;
  name: string | null;
  level?: string | null;
  grade?: string | null;
};

type AcademicReportRow = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  report_period: string | null;
  report_type: string | null;

  uh_score?: number | null;
  task_score?: number | null;
  uts_score?: number | null;
  uas_score?: number | null;
  process_score?: number | null;
  final_score?: number | null;
  description?: string | null;
  teacher_comment?: string | null;
  status?: string | null;

  uh_1?: number | null;
  uh_2?: number | null;
  uh_3?: number | null;
  uh_4?: number | null;

  task_1?: number | null;
  task_2?: number | null;
  task_3?: number | null;
  task_4?: number | null;
  task_5?: number | null;

  mid_score?: number | null;
  final_exam_score?: number | null;

  average_uh?: number | null;
  average_task?: number | null;
  final_grade?: number | null;
  predicate?: string | null;

  report_file_url?: string | null;

  approval_status?: "draft" | "pending" | "approved" | "rejected" | string | null;
  submitted_at?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  rejection_note?: string | null;
  updated_at?: string | null;
};

type EnrichedReport = AcademicReportRow & {
  student_name: string;
  student_grade: string;
  student_level: string;
  student_nipd: string;
  student_nisn: string;
  teacher_name: string;
  subject_name: string;
};

function normalizeText(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function formatNumber(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";

  return Number(value).toFixed(2).replace(".00", "");
}

function getReportTypeLabel(type?: string | null) {
  if (type === "mid_semester") return "Mid Semester";
  if (type === "semester") return "Semester";

  return "Bulanan";
}

function getStatusKey(report: AcademicReportRow) {
  if (report.approval_status) return report.approval_status;

  if (report.status === "published") return "approved";
  if (report.status === "approved") return "approved";
  if (report.status === "pending") return "pending";
  if (report.status === "rejected") return "rejected";

  return "draft";
}

function getStatusLabel(status?: string | null) {
  if (status === "published") return "Published";
  if (status === "approved") return "Approved";
  if (status === "pending") return "Pending Approval";
  if (status === "rejected") return "Rejected";

  return "Draft";
}

function getPredicateClass(predicate?: string | null) {
  if (predicate === "Sangat Baik") return "bg-emerald-100 text-emerald-700";
  if (predicate === "Baik") return "bg-blue-100 text-blue-700";
  if (predicate === "Cukup") return "bg-yellow-100 text-yellow-700";
  if (predicate === "Kurang") return "bg-red-100 text-red-700";

  return "bg-slate-100 text-slate-700";
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatExportDateName() {
  const date = new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function escapeExcelCell(value: string | number | null | undefined) {
  return String(value ?? "-")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function downloadHtmlAsExcel(filename: string, html: string) {
  const blob = new Blob([html], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export default function StudentLaporanPage() {
  const [student, setStudent] = useState<StudentRow | null>(null);
  const [reports, setReports] = useState<EnrichedReport[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState("Semua Periode");

  async function getCurrentStudent() {
    const { data: authData } = await supabase.auth.getUser();

    const userId = authData.user?.id || "";
    const email =
      authData.user?.email ||
      localStorage.getItem("hstkb_email") ||
      localStorage.getItem("hstkb_demo_email") ||
      "";

    if (userId) {
      const { data } = await supabase
        .from("students")
        .select("*")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      if (data) return data as StudentRow;
    }

    if (email) {
      const { data } = await supabase
        .from("students")
        .select("*")
        .eq("email", email)
        .limit(1)
        .maybeSingle();

      if (data) return data as StudentRow;

      const { data: parentData } = await supabase
        .from("parents")
        .select("*")
        .eq("email", email)
        .limit(1)
        .maybeSingle();

      const parent = parentData as ParentRow | null;

      if (parent?.id) {
        const { data: studentByParent } = await supabase
          .from("students")
          .select("*")
          .eq("parent_id", parent.id)
          .order("full_name", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (studentByParent) return studentByParent as StudentRow;
      }
    }

    return null;
  }

  async function fetchData() {
    setLoading(true);

    const currentStudent = await getCurrentStudent();

    setStudent(currentStudent);

    if (!currentStudent?.id) {
      setReports([]);
      setLoading(false);
      return;
    }

    const { data: reportsData, error: reportsError } = await supabase
      .from("academic_reports")
      .select("*")
      .eq("student_id", currentStudent.id)
      .or("approval_status.eq.approved,status.eq.published,status.eq.approved")
      .order("report_period", { ascending: false });

    if (reportsError) {
      alert(`Gagal mengambil laporan akademik: ${reportsError.message}`);
      setReports([]);
      setLoading(false);
      return;
    }

    const rawReports = (reportsData || []) as AcademicReportRow[];

    const teacherIds = Array.from(
      new Set(rawReports.map((report) => report.teacher_id).filter(Boolean))
    ) as string[];

    const subjectIds = Array.from(
      new Set(rawReports.map((report) => report.subject_id).filter(Boolean))
    ) as string[];

    let teachersData: TeacherRow[] = [];
    let subjectsData: SubjectRow[] = [];

    if (teacherIds.length > 0) {
      const { data } = await supabase
        .from("teachers")
        .select("*")
        .in("id", teacherIds);

      teachersData = (data || []) as TeacherRow[];
    }

    if (subjectIds.length > 0) {
      const { data } = await supabase
        .from("subjects")
        .select("*")
        .in("id", subjectIds);

      subjectsData = (data || []) as SubjectRow[];
    }

    const teacherMap = new Map(
      teachersData.map((teacher) => [teacher.id, teacher])
    );

    const subjectMap = new Map(
      subjectsData.map((subject) => [subject.id, subject])
    );

    const enrichedReports: EnrichedReport[] = rawReports.map((report) => {
      const teacher = report.teacher_id ? teacherMap.get(report.teacher_id) : null;
      const subject = report.subject_id ? subjectMap.get(report.subject_id) : null;

      return {
        ...report,
        student_name: currentStudent.full_name || "-",
        student_grade: currentStudent.grade || "-",
        student_level: currentStudent.level || "-",
        student_nipd: currentStudent.nis || "-",
        student_nisn: currentStudent.nisn || "-",
        teacher_name: teacher?.full_name || "-",
        subject_name: subject?.name || "-",
      };
    });

    setReports(enrichedReports);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("student-laporan-akademik-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "academic_reports" },
        fetchData
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        fetchData
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const periodOptions = useMemo(() => {
    const uniquePeriods = Array.from(
      new Set(reports.map((report) => report.report_period).filter(Boolean))
    ) as string[];

    return ["Semua Periode", ...uniquePeriods];
  }, [reports]);

  const filteredReports = useMemo(() => {
    const q = normalizeText(search);

    return reports.filter((report) => {
      const matchSearch =
        !q ||
        normalizeText(report.subject_name).includes(q) ||
        normalizeText(report.teacher_name).includes(q) ||
        normalizeText(report.report_period).includes(q) ||
        normalizeText(report.teacher_comment).includes(q);

      const matchPeriod =
        periodFilter === "Semua Periode" || report.report_period === periodFilter;

      return matchSearch && matchPeriod;
    });
  }, [reports, search, periodFilter]);

  const summary = useMemo(() => {
    const total = reports.length;

    const averageFinal =
      reports.length === 0
        ? "-"
        : formatNumber(
            reports.reduce((sum, report) => {
              const value = report.final_grade ?? report.final_score ?? 0;
              return sum + value;
            }, 0) / reports.length
          );

    const approved = reports.filter((report) => getStatusKey(report) === "approved")
      .length;

    return {
      total,
      averageFinal,
      approved,
    };
  }, [reports]);

  function handleExportExcel() {
    if (filteredReports.length === 0) {
      alert("Tidak ada laporan akademik yang bisa diexport.");
      return;
    }

    const rows = filteredReports.map((report, index) => {
      const status = getStatusKey(report);

      return {
        No: index + 1,
        "Nama Siswa": report.student_name,
        NIPD: report.student_nipd,
        NISN: report.student_nisn,
        Level: report.student_level,
        Kelas: report.student_grade,
        Guru: report.teacher_name,
        "Mata Pelajaran": report.subject_name,
        Periode: report.report_period || "-",
        "Jenis Laporan": getReportTypeLabel(report.report_type),
        "UH 1": formatNumber(report.uh_1 ?? report.uh_score),
        "UH 2": formatNumber(report.uh_2),
        "UH 3": formatNumber(report.uh_3),
        "UH 4": formatNumber(report.uh_4),
        "Rata-rata UH": formatNumber(report.average_uh ?? report.uh_score),
        "Tugas 1": formatNumber(report.task_1 ?? report.task_score),
        "Tugas 2": formatNumber(report.task_2),
        "Tugas 3": formatNumber(report.task_3),
        "Tugas 4": formatNumber(report.task_4),
        "Tugas 5": formatNumber(report.task_5),
        "Rata-rata Tugas": formatNumber(report.average_task ?? report.task_score),
        UTS: formatNumber(report.mid_score ?? report.uts_score),
        UAS: formatNumber(report.final_exam_score ?? report.uas_score),
        "Nilai Proses": formatNumber(report.process_score),
        "Nilai Akhir": formatNumber(report.final_grade ?? report.final_score),
        Predikat: report.predicate || report.description || "-",
        "Catatan Guru": report.teacher_comment || "-",
        "File Laporan": report.report_file_url || "-",
        Status: getStatusLabel(status),
        "Approved At": formatDateTime(report.approved_at),
      };
    });

    const headers = Object.keys(rows[0]);

    const tableRows = rows
      .map((row) => {
        return `
          <tr>
            ${headers
              .map((header) => {
                const value = row[header as keyof typeof row];
                return `<td>${escapeExcelCell(value)}</td>`;
              })
              .join("")}
          </tr>
        `;
      })
      .join("");

    const html = `
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            table {
              border-collapse: collapse;
              width: 100%;
              font-family: Arial, sans-serif;
              font-size: 12px;
            }

            th {
              background: #7A1F2B;
              color: #ffffff;
              font-weight: bold;
              border: 1px solid #dddddd;
              padding: 8px;
              text-align: left;
              white-space: nowrap;
            }

            td {
              border: 1px solid #dddddd;
              padding: 8px;
              vertical-align: top;
              mso-number-format: "\\@";
            }

            .title {
              font-size: 18px;
              font-weight: bold;
              color: #2B1B18;
              margin-bottom: 6px;
            }

            .subtitle {
              font-size: 12px;
              color: #6B4A3A;
              margin-bottom: 16px;
            }
          </style>
        </head>

        <body>
          <div class="title">Rapot / Laporan Akademik Siswa</div>
          <div class="subtitle">
            Nama: ${escapeExcelCell(student?.full_name || "-")} |
            Kelas: ${escapeExcelCell(`${student?.level || "-"} ${student?.grade || "-"}`)} |
            Export tanggal ${formatDateTime(new Date().toISOString())}
          </div>

          <table>
            <thead>
              <tr>
                ${headers
                  .map((header) => `<th>${escapeExcelCell(header)}</th>`)
                  .join("")}
              </tr>
            </thead>

            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
      </html>
    `;

    downloadHtmlAsExcel(
      `rapot-${student?.full_name || "siswa"}-${formatExportDateName()}.xls`,
      html
    );
  }

  return (
    <StudentLayout activeMenu={"Laporan Saya" as any}>
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">Laporan Saya</h1>
          <p className="mt-1 text-sm text-[#6B4A3A]">
            Rekap nilai & report periodik.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportExcel}
          className="w-fit rounded-xl bg-[#7A1F2B] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#54131D]"
        >
          Export Rapot
        </button>
      </div>

      {!student && !loading ? (
        <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-8 text-center text-sm text-[#6B4A3A] shadow-sm">
          Data siswa belum terhubung dengan akun ini.
        </div>
      ) : null}

      {student ? (
        <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
            <p className="text-sm text-[#6B4A3A]">Nama Siswa</p>
            <p className="mt-3 text-xl font-bold">{student.full_name || "-"}</p>
            <p className="mt-1 text-sm text-[#6B4A3A]">
              {student.level || "-"} — {student.grade || "-"}
            </p>
          </div>

          <div className="rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
            <p className="text-sm text-[#6B4A3A]">Total Laporan</p>
            <p className="mt-3 text-3xl font-bold">{summary.total}</p>
            <p className="mt-1 text-sm text-[#6B4A3A]">
              {summary.approved} approved/published
            </p>
          </div>

          <div className="rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
            <p className="text-sm text-[#6B4A3A]">Rata-rata Nilai Akhir</p>
            <p className="mt-3 text-3xl font-bold text-[#7A1F2B]">
              {summary.averageFinal}
            </p>
            <p className="mt-1 text-sm text-[#6B4A3A]">
              Berdasarkan laporan approved
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_240px]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari mapel, guru, periode, atau catatan..."
            className="w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
          />

          <select
            value={periodFilter}
            onChange={(event) => setPeriodFilter(event.target.value)}
            className="rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
          >
            {periodOptions.map((period) => (
              <option key={period}>{period}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-7 overflow-hidden rounded-2xl border border-[#E8D6C1] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-[#FFF8EF] text-sm text-[#6B4A3A]">
              <tr>
                <th className="px-5 py-4">Mapel</th>
                <th className="px-5 py-4">Periode</th>
                <th className="px-5 py-4">Guru</th>
                <th className="px-5 py-4">UH</th>
                <th className="px-5 py-4">Tugas</th>
                <th className="px-5 py-4">UTS</th>
                <th className="px-5 py-4">UAS</th>
                <th className="px-5 py-4">Proses</th>
                <th className="px-5 py-4">Total</th>
                <th className="px-5 py-4">Ket.</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E8D6C1]">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-5 py-10 text-center text-sm">
                    Memuat laporan akademik...
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-10 text-center text-sm">
                    Belum ada laporan akademik approved/published.
                  </td>
                </tr>
              ) : (
                filteredReports.map((item) => {
                  const predicate = item.predicate || item.description || "-";

                  return (
                    <tr key={item.id} className="hover:bg-[#FFF8EF]">
                      <td className="px-5 py-4 font-semibold">
                        {item.subject_name}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold">{item.report_period || "-"}</p>
                        <p className="mt-1 text-xs text-[#6B4A3A]">
                          {getReportTypeLabel(item.report_type)}
                        </p>
                      </td>
                      <td className="px-5 py-4">{item.teacher_name}</td>
                      <td className="px-5 py-4">
                        {formatNumber(item.average_uh ?? item.uh_score)}
                      </td>
                      <td className="px-5 py-4">
                        {formatNumber(item.average_task ?? item.task_score)}
                      </td>
                      <td className="px-5 py-4">
                        {formatNumber(item.mid_score ?? item.uts_score)}
                      </td>
                      <td className="px-5 py-4">
                        {formatNumber(item.final_exam_score ?? item.uas_score)}
                      </td>
                      <td className="px-5 py-4">
                        {formatNumber(item.process_score)}
                      </td>
                      <td className="px-5 py-4 font-bold text-[#7A1F2B]">
                        {formatNumber(item.final_grade ?? item.final_score)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${getPredicateClass(
                            predicate
                          )}`}
                        >
                          {predicate}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {filteredReports.map((report) => (
          <div
            key={`card-${report.id}`}
            className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F1DFD5] text-2xl text-[#7A1F2B]">
                  📄
                </div>

                <div>
                  <h2 className="text-lg font-bold">
                    {getReportTypeLabel(report.report_type)} Report
                  </h2>
                  <p className="text-sm text-[#6B4A3A]">
                    {report.report_period || "-"} • {report.subject_name}
                  </p>
                </div>
              </div>

              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                {getStatusLabel(getStatusKey(report))}
              </span>
            </div>

            <p className="mt-6 text-sm text-[#6B4A3A]">
              Guru: {report.teacher_name}
            </p>

            <p className="mt-2 text-sm leading-6 text-[#6B4A3A]">
              {report.teacher_comment || "Belum ada catatan guru."}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {report.report_file_url ? (
                <a
                  href={report.report_file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-[#E8D6C1] px-5 py-2 text-sm font-bold"
                >
                  ⇩ File
                </a>
              ) : null}

              <button
                type="button"
                onClick={handleExportExcel}
                className="rounded-xl border border-[#E8D6C1] px-5 py-2 text-sm font-bold"
              >
                ⇩ Excel
              </button>
            </div>
          </div>
        ))}
      </div>
    </StudentLayout>
  );
}