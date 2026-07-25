"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Search,
  Send,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import KepalaSekolahLayout from "../components/KepalaSekolahLayout";

type StudentOption = {
  id: string;
  full_name: string | null;
  level: string | null;
  grade: string | null;
  nis?: string | null;
  nisn?: string | null;
};

type TeacherOption = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type SubjectOption = {
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

  approval_status?: "draft" | "pending" | "approved" | "rejected" | string | null;
  submitted_at?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  rejection_note?: string | null;
  created_at?: string | null;
  updated_at?: string | null;

  students?: StudentOption | StudentOption[] | null;
  teachers?: TeacherOption | TeacherOption[] | null;
  subjects?: SubjectOption | SubjectOption[] | null;
};

type AcademicReport = AcademicReportRow & {
  students: StudentOption | null;
  teachers: TeacherOption | null;
  subjects: SubjectOption | null;
};

const statusOptions = ["Semua Status", "draft", "pending", "approved", "rejected"];

const reportTypeOptions = [
  { value: "monthly", label: "Bulanan" },
  { value: "mid_semester", label: "Mid Semester" },
  { value: "semester", label: "Semester" },
];

function normalizeRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function normalizeText(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatNumber(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";

  return Number(value).toFixed(2).replace(".00", "");
}

function getStatusLabel(status?: string | null) {
  if (status === "approved") return "Approved";
  if (status === "pending") return "Pending Approval";
  if (status === "rejected") return "Rejected";
  return "Draft";
}

function getReportTypeLabel(type?: string | null) {
  return reportTypeOptions.find((item) => item.value === type)?.label || type || "-";
}

function getPredicate(finalGrade?: number | null) {
  if (finalGrade === null || finalGrade === undefined) return "-";

  if (finalGrade >= 86) return "Sangat Baik";
  if (finalGrade >= 73) return "Baik";
  if (finalGrade >= 60) return "Cukup";

  return "Kurang";
}

function getInitials(name?: string | null) {
  if (!name) return "-";

  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function escapeExcelCell(value: string | number | null | undefined) {
  const text = String(value ?? "-");

  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatExportDateName() {
  const date = new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getFinalGrade(report: AcademicReport) {
  return report.final_grade ?? report.final_score ?? null;
}

function getAverageUh(report: AcademicReport) {
  return report.average_uh ?? report.uh_score ?? null;
}

function getAverageTask(report: AcademicReport) {
  return report.average_task ?? report.task_score ?? null;
}

function getMidScore(report: AcademicReport) {
  return report.mid_score ?? report.uts_score ?? null;
}

function getFinalExamScore(report: AcademicReport) {
  return report.final_exam_score ?? report.uas_score ?? null;
}

function getReportPredicate(report: AcademicReport) {
  return report.predicate || report.description || getPredicate(getFinalGrade(report));
}

export default function KepalaSekolahReportsPage() {
  const [reports, setReports] = useState<AcademicReport[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [teacherFilter, setTeacherFilter] = useState("Semua Guru");
  const [periodFilter, setPeriodFilter] = useState("Semua Periode");

  const [selectedReport, setSelectedReport] = useState<AcademicReport | null>(null);
  const [reviewReport, setReviewReport] = useState<AcademicReport | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  async function fetchTeachers() {
    const { data, error } = await supabase
      .from("teachers")
      .select("id, full_name, email")
      .order("full_name", { ascending: true });

    if (error) throw new Error(error.message);

    setTeachers((data || []) as TeacherOption[]);
  }

  async function fetchReports() {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data, error } = await supabase
        .from("academic_reports")
        .select(
          `
          id,
          student_id,
          teacher_id,
          subject_id,
          report_period,
          report_type,
          uh_score,
          task_score,
          uts_score,
          uas_score,
          process_score,
          final_score,
          description,
          teacher_comment,
          status,
          uh_1,
          uh_2,
          uh_3,
          uh_4,
          task_1,
          task_2,
          task_3,
          task_4,
          task_5,
          mid_score,
          final_exam_score,
          average_uh,
          average_task,
          final_grade,
          predicate,
          approval_status,
          submitted_at,
          approved_at,
          rejected_at,
          rejection_note,
          created_at,
          updated_at,
          students (
            id,
            full_name,
            level,
            grade,
            nis,
            nisn
          ),
          teachers (
            id,
            full_name,
            email
          ),
          subjects (
            id,
            name,
            level,
            grade
          )
        `
        )
        .order("updated_at", { ascending: false });

      if (error) throw new Error(error.message);

      const rows = (data || []) as AcademicReportRow[];

      const normalizedReports: AcademicReport[] = rows.map((item) => ({
        ...item,
        students: normalizeRelation(item.students),
        teachers: normalizeRelation(item.teachers),
        subjects: normalizeRelation(item.subjects),
      }));

      setReports(normalizedReports);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengambil data laporan akademik.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function fetchAllData() {
    try {
      await Promise.all([fetchTeachers(), fetchReports()]);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengambil data halaman.");
      }

      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAllData();

    const channel = supabase
      .channel("kepala-academic-reports-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "academic_reports" },
        () => fetchReports()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        () => fetchReports()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teachers" },
        () => fetchAllData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subjects" },
        () => fetchReports()
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
      const approvalStatus = report.approval_status || report.status || "draft";

      const matchSearch =
        !q ||
        normalizeText(report.students?.full_name).includes(q) ||
        normalizeText(report.students?.nis).includes(q) ||
        normalizeText(report.students?.nisn).includes(q) ||
        normalizeText(report.students?.grade).includes(q) ||
        normalizeText(report.students?.level).includes(q) ||
        normalizeText(report.teachers?.full_name).includes(q) ||
        normalizeText(report.subjects?.name).includes(q) ||
        normalizeText(report.report_period).includes(q) ||
        normalizeText(report.teacher_comment).includes(q) ||
        normalizeText(report.rejection_note).includes(q);

      const matchStatus =
        statusFilter === "Semua Status" || approvalStatus === statusFilter;

      const matchTeacher =
        teacherFilter === "Semua Guru" || report.teacher_id === teacherFilter;

      const matchPeriod =
        periodFilter === "Semua Periode" || report.report_period === periodFilter;

      return matchSearch && matchStatus && matchTeacher && matchPeriod;
    });
  }, [reports, search, statusFilter, teacherFilter, periodFilter]);

  const summary = useMemo(() => {
    const draft = reports.filter(
      (report) => (report.approval_status || report.status || "draft") === "draft"
    ).length;

    const pending = reports.filter(
      (report) => (report.approval_status || report.status) === "pending"
    ).length;

    const approved = reports.filter(
      (report) =>
        (report.approval_status || report.status) === "approved" ||
        report.status === "published"
    ).length;

    const rejected = reports.filter(
      (report) => (report.approval_status || report.status) === "rejected"
    ).length;

    return {
      total: reports.length,
      draft,
      pending,
      approved,
      rejected,
    };
  }, [reports]);

  async function handleApproveReport(report: AcademicReport) {
    const confirmApprove = confirm(
      `Approve laporan akademik ${report.students?.full_name || "-"}?`
    );

    if (!confirmApprove) return;

    setReviewSaving(true);

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("academic_reports")
      .update({
        approval_status: "approved",
        status: "approved",
        approved_at: now,
        rejected_at: null,
        rejection_note: null,
        updated_at: now,
      })
      .eq("id", report.id);

    if (error) {
      setReviewSaving(false);
      alert(`Gagal approve laporan: ${error.message}`);
      return;
    }

    await fetchReports();

    setReviewSaving(false);
    setSelectedReport(null);
    setReviewReport(null);
    setReviewNote("");
  }

  async function handleRejectReport() {
    if (!reviewReport) return;

    if (!reviewNote.trim()) {
      alert("Isi catatan revisi terlebih dahulu.");
      return;
    }

    setReviewSaving(true);

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("academic_reports")
      .update({
        approval_status: "rejected",
        status: "rejected",
        rejected_at: now,
        rejection_note: reviewNote.trim(),
        updated_at: now,
      })
      .eq("id", reviewReport.id);

    if (error) {
      setReviewSaving(false);
      alert(`Gagal mengirim revisi: ${error.message}`);
      return;
    }

    await fetchReports();

    setReviewSaving(false);
    setSelectedReport(null);
    setReviewReport(null);
    setReviewNote("");
  }

  function openReview(report: AcademicReport) {
    setReviewReport(report);
    setReviewNote(report.rejection_note || "");
  }

  function handleExportExcel() {
    if (filteredReports.length === 0) {
      alert("Tidak ada data laporan akademik yang bisa diexport.");
      return;
    }

    const rows = filteredReports.map((report, index) => ({
      No: index + 1,
      Periode: report.report_period || "-",
      "Jenis Laporan": getReportTypeLabel(report.report_type),
      "Nama Siswa": report.students?.full_name || "-",
      NIPD: report.students?.nis || "-",
      NISN: report.students?.nisn || "-",
      Level: report.students?.level || "-",
      Kelas: report.students?.grade || "-",
      Guru: report.teachers?.full_name || "-",
      "Email Guru": report.teachers?.email || "-",
      "Mata Pelajaran": report.subjects?.name || "-",
      "UH 1": report.uh_1 ?? "-",
      "UH 2": report.uh_2 ?? "-",
      "UH 3": report.uh_3 ?? "-",
      "UH 4": report.uh_4 ?? "-",
      "Rata-rata UH": formatNumber(getAverageUh(report)),
      "Tugas 1": report.task_1 ?? "-",
      "Tugas 2": report.task_2 ?? "-",
      "Tugas 3": report.task_3 ?? "-",
      "Tugas 4": report.task_4 ?? "-",
      "Tugas 5": report.task_5 ?? "-",
      "Rata-rata Tugas": formatNumber(getAverageTask(report)),
      UTS: formatNumber(getMidScore(report)),
      UAS: formatNumber(getFinalExamScore(report)),
      "Proses KBM": formatNumber(report.process_score),
      "Nilai Akhir": formatNumber(getFinalGrade(report)),
      Predikat: getReportPredicate(report),
      "Catatan Guru": report.teacher_comment || "-",
      "Catatan Revisi": report.rejection_note || "-",
      Status: getStatusLabel(report.approval_status || report.status),
    }));

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
          <div class="title">Laporan Akademik HSTKB</div>
          <div class="subtitle">
            Export tanggal ${formatDate(new Date().toISOString())} |
            Total data: ${filteredReports.length}
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

    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `laporan-akademik-${formatExportDateName()}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  return (
    <KepalaSekolahLayout
      activeMenu="Laporan Akademik"
      searchPlaceholder="Cari laporan akademik..."
    >
      <section className="space-y-7">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#8A5A48]">
              Academic Monitoring
            </p>

            <h1 className="mt-2 text-[30px] font-extrabold tracking-[-0.02em] text-[#2B1B18]">
              Laporan Akademik
            </h1>

            <p className="mt-2 max-w-[850px] text-[15px] leading-6 text-[#6F5549]">
              Review, approve, revisi, dan export laporan perkembangan akademik
              siswa yang dikirim oleh guru.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            className="flex h-11 w-fit items-center gap-2 rounded-xl border border-[#DCC8B6] bg-white px-5 text-[14px] font-extrabold text-[#8C0F2D] shadow-sm transition hover:bg-[#FFF8EF]"
          >
            <Download className="h-4 w-4" />
            Export Excel
          </button>
        </div>

        {errorMessage ? (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={<FileText className="h-5 w-5" />}
            label="Total Laporan"
            value={summary.total}
            info="Data"
            tone="pink"
          />

          <SummaryCard
            icon={<Send className="h-5 w-5" />}
            label="Pending Approval"
            value={summary.pending}
            info="Menunggu"
            tone="blue"
          />

          <SummaryCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Approved"
            value={summary.approved}
            info="Disetujui"
            tone="green"
          />

          <SummaryCard
            icon={<XCircle className="h-5 w-5" />}
            label="Rejected / Revisi"
            value={summary.rejected}
            info={`Draft ${summary.draft}`}
            tone="orange"
          />
        </div>

        <div className="rounded-[22px] border border-[#E1CFBE] bg-white p-5 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr_1fr_1fr]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8E6A58]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari siswa, NIPD, NISN, guru, mapel, periode, atau catatan..."
                className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] pl-11 pr-4 text-[14px] outline-none placeholder:text-[#9A7B6C] focus:border-[#9C0824]"
              />
            </div>

            <select
              value={teacherFilter}
              onChange={(event) => setTeacherFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              <option value="Semua Guru">Semua Guru</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.full_name}
                </option>
              ))}
            </select>

            <select
              value={periodFilter}
              onChange={(event) => setPeriodFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              {periodOptions.map((period) => (
                <option key={period}>{period}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              {statusOptions.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-[22px] border border-[#E1CFBE] bg-white shadow-sm">
          <div className="border-b border-[#EADACA] px-6 py-5">
            <h2 className="text-[20px] font-extrabold text-[#2B1B18]">
              Daftar Laporan Akademik
            </h2>

            <p className="mt-1 text-[14px] text-[#6F5549]">
              Data laporan akademik dari guru. Klik detail untuk melihat nilai
              lengkap dan proses review.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1320px] border-collapse">
              <thead>
                <tr className="border-b border-[#EADACA] bg-[#FFF8EF] text-left text-[13px] font-extrabold text-[#6F5549]">
                  <th className="px-6 py-4">Siswa</th>
                  <th className="px-6 py-4">NIPD</th>
                  <th className="px-6 py-4">Guru</th>
                  <th className="px-6 py-4">Mapel</th>
                  <th className="px-6 py-4">Periode</th>
                  <th className="px-6 py-4">Nilai Akhir</th>
                  <th className="px-6 py-4">Predikat</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-6 py-12 text-center text-[#6F5549]"
                    >
                      Memuat laporan akademik...
                    </td>
                  </tr>
                ) : filteredReports.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-6 py-12 text-center text-[#6F5549]"
                    >
                      Belum ada laporan akademik.
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((report) => {
                    const approvalStatus =
                      report.approval_status || report.status || "draft";

                    return (
                      <tr
                        key={report.id}
                        className="border-b border-[#F0E1D4] text-[14px] text-[#2B1B18]"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F8DFD0] text-[13px] font-extrabold text-[#8C0F2D]">
                              {getInitials(report.students?.full_name)}
                            </div>

                            <div>
                              <p className="font-extrabold">
                                {report.students?.full_name || "-"}
                              </p>
                              <p className="mt-1 text-[12px] text-[#6F5549]">
                                {report.students?.level || "-"} —{" "}
                                {report.students?.grade || "-"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <p className="font-bold">{report.students?.nis || "-"}</p>
                          <p className="mt-1 text-[12px] text-[#6F5549]">
                            NISN: {report.students?.nisn || "-"}
                          </p>
                        </td>

                        <td className="px-6 py-4">
                          {report.teachers?.full_name || "-"}
                        </td>

                        <td className="px-6 py-4">
                          {report.subjects?.name || "-"}
                        </td>

                        <td className="px-6 py-4">
                          <p className="font-bold">{report.report_period || "-"}</p>
                          <p className="mt-1 text-[12px] text-[#6F5549]">
                            {getReportTypeLabel(report.report_type)}
                          </p>
                        </td>

                        <td className="px-6 py-4">
                          <span className="text-[17px] font-extrabold">
                            {formatNumber(getFinalGrade(report))}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <PredicateBadge predicate={getReportPredicate(report)} />
                        </td>

                        <td className="px-6 py-4">
                          <StatusBadge status={approvalStatus} />
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedReport(report)}
                              className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#DCC8B6] px-3 text-[13px] font-extrabold text-[#8C0F2D] transition hover:bg-[#FFF8EF]"
                            >
                              <Eye className="h-4 w-4" />
                              Detail
                            </button>

                            <button
                              type="button"
                              onClick={() => openReview(report)}
                              disabled={approvalStatus === "approved"}
                              className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#8C0F2D] px-3 text-[13px] font-extrabold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <UserCheck className="h-4 w-4" />
                              Review
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {selectedReport ? (
        <ReportDetailModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onReview={() => openReview(selectedReport)}
        />
      ) : null}

      {reviewReport ? (
        <ReviewModal
          report={reviewReport}
          note={reviewNote}
          saving={reviewSaving}
          onChange={setReviewNote}
          onClose={() => {
            setReviewReport(null);
            setReviewNote("");
          }}
          onApprove={() => handleApproveReport(reviewReport)}
          onReject={handleRejectReport}
        />
      ) : null}
    </KepalaSekolahLayout>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  info,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  info: string;
  tone: "pink" | "orange" | "blue" | "green";
}) {
  const toneClass = {
    pink: "bg-[#F8E1E8] text-[#8C0F2D]",
    orange: "bg-[#F4DFD5] text-[#B85C38]",
    blue: "bg-[#D7ECFA] text-[#1779B8]",
    green: "bg-[#C7F0DA] text-[#158A58]",
  }[tone];

  return (
    <div className="rounded-[18px] border border-[#E8D6C1] bg-white px-5 py-5 shadow-sm">
      <div className="mb-7 flex items-start justify-between">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-full ${toneClass}`}
        >
          {icon}
        </div>

        <span className="text-[13px] font-extrabold text-[#009B68]">
          {info}
        </span>
      </div>

      <p className="text-[26px] font-extrabold leading-none text-[#2B1B18]">
        {value}
      </p>

      <p className="mt-2 text-[13px] text-[#6B4A3A]">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  const safe = status || "draft";

  const className =
    safe === "approved"
      ? "bg-[#C7F0DA] text-[#158A58]"
      : safe === "pending"
      ? "bg-[#FFF2B8] text-[#B26A00]"
      : safe === "rejected"
      ? "bg-[#FFE4E6] text-[#BE123C]"
      : "bg-[#F1F5F9] text-[#64748B]";

  return (
    <span
      className={`inline-flex min-w-[96px] items-center justify-center whitespace-nowrap rounded-full px-3 py-1 text-[12px] font-extrabold ${className}`}
    >
      {getStatusLabel(safe)}
    </span>
  );
}

function PredicateBadge({ predicate }: { predicate?: string | null }) {
  const safe = predicate || "-";

  const className =
    safe === "Sangat Baik"
      ? "bg-[#C7F0DA] text-[#158A58]"
      : safe === "Baik"
      ? "bg-[#D7ECFA] text-[#1779B8]"
      : safe === "Cukup"
      ? "bg-[#FFF2B8] text-[#B26A00]"
      : safe === "Kurang"
      ? "bg-[#FFE4E6] text-[#BE123C]"
      : "bg-[#F1F5F9] text-[#64748B]";

  return (
    <span
      className={`inline-flex min-w-[92px] items-center justify-center whitespace-nowrap rounded-full px-3 py-1 text-[12px] font-extrabold ${className}`}
    >
      {safe}
    </span>
  );
}

function ReportDetailModal({
  report,
  onClose,
  onReview,
}: {
  report: AcademicReport;
  onClose: () => void;
  onReview: () => void;
}) {
  const approvalStatus = report.approval_status || report.status || "draft";

  return (
    <ModalShell
      title="Detail Laporan Akademik"
      subtitle={`${report.students?.full_name || "-"} • ${
        report.subjects?.name || "-"
      }`}
      onClose={onClose}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={approvalStatus} />
          <PredicateBadge predicate={getReportPredicate(report)} />

          <span className="rounded-full bg-[#FFF8EF] px-3 py-1 text-xs font-bold text-[#7A1F2B]">
            {report.report_period || "-"}
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <InfoBox label="Nama Siswa" value={report.students?.full_name || "-"} />
          <InfoBox label="NIPD" value={report.students?.nis || "-"} />
          <InfoBox label="NISN" value={report.students?.nisn || "-"} />
          <InfoBox
            label="Level / Kelas"
            value={`${report.students?.level || "-"} — ${report.students?.grade || "-"}`}
          />
          <InfoBox label="Guru" value={report.teachers?.full_name || "-"} />
          <InfoBox label="Email Guru" value={report.teachers?.email || "-"} />
          <InfoBox label="Mata Pelajaran" value={report.subjects?.name || "-"} />
          <InfoBox label="Jenis Laporan" value={getReportTypeLabel(report.report_type)} />
        </div>

        <div className="grid gap-3 md:grid-cols-5">
          <InfoBox label="Rata-rata UH" value={formatNumber(getAverageUh(report))} />
          <InfoBox
            label="Rata-rata Tugas"
            value={formatNumber(getAverageTask(report))}
          />
          <InfoBox label="UTS" value={formatNumber(getMidScore(report))} />
          <InfoBox label="UAS" value={formatNumber(getFinalExamScore(report))} />
          <InfoBox label="Proses KBM" value={formatNumber(report.process_score)} />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <InfoBox label="Nilai Akhir" value={formatNumber(getFinalGrade(report))} />
          <InfoBox label="Predikat" value={getReportPredicate(report)} />
        </div>

        <div className="rounded-2xl border border-[#E1CFBE] bg-white p-4">
          <p className="text-sm font-bold text-[#6B4A3A]">Rincian Nilai UH</p>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <MiniScore label="UH 1" value={report.uh_1} />
            <MiniScore label="UH 2" value={report.uh_2} />
            <MiniScore label="UH 3" value={report.uh_3} />
            <MiniScore label="UH 4" value={report.uh_4} />
          </div>
        </div>

        <div className="rounded-2xl border border-[#E1CFBE] bg-white p-4">
          <p className="text-sm font-bold text-[#6B4A3A]">Rincian Nilai Tugas</p>
          <div className="mt-3 grid gap-3 md:grid-cols-5">
            <MiniScore label="Tugas 1" value={report.task_1} />
            <MiniScore label="Tugas 2" value={report.task_2} />
            <MiniScore label="Tugas 3" value={report.task_3} />
            <MiniScore label="Tugas 4" value={report.task_4} />
            <MiniScore label="Tugas 5" value={report.task_5} />
          </div>
        </div>

        <InfoBox label="Catatan Guru" value={report.teacher_comment || "-"} />

        {report.rejection_note ? (
          <InfoBox label="Catatan Revisi Kepala Sekolah" value={report.rejection_note} />
        ) : null}

        <button
          type="button"
          onClick={onReview}
          disabled={approvalStatus === "approved"}
          className="h-11 w-full rounded-xl bg-[#7A1F2B] text-sm font-bold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Review Laporan Akademik
        </button>
      </div>
    </ModalShell>
  );
}

function ReviewModal({
  report,
  note,
  saving,
  onChange,
  onClose,
  onApprove,
  onReject,
}: {
  report: AcademicReport;
  note: string;
  saving: boolean;
  onChange: (value: string) => void;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <ModalShell
      title="Review Laporan Akademik"
      subtitle={`${report.students?.full_name || "-"} • ${
        report.subjects?.name || "-"
      }`}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-[#E8D6C1] bg-white p-4">
          <p className="text-sm font-bold text-[#2B1B18]">Ringkasan Laporan</p>
          <p className="mt-2 text-sm leading-6 text-[#6B4A3A]">
            {report.teachers?.full_name || "-"} mengirim laporan akademik{" "}
            <b>{report.report_period || "-"}</b> untuk{" "}
            <b>{report.students?.full_name || "-"}</b> dengan nilai akhir{" "}
            <b>{formatNumber(getFinalGrade(report))}</b> dan predikat{" "}
            <b>{getReportPredicate(report)}</b>.
          </p>
        </div>

        <div>
          <label className="text-sm font-bold">Catatan Revisi</label>
          <textarea
            value={note}
            onChange={(event) => onChange(event.target.value)}
            rows={5}
            placeholder="Isi jika laporan perlu revisi. Contoh: Mohon lengkapi catatan guru atau cek kembali nilai tugas."
            className="mt-2 w-full resize-none rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
          />

          <p className="mt-2 text-xs leading-5 text-[#6B4A3A]">
            Catatan ini akan tersimpan di kolom catatan revisi agar guru bisa
            memperbaiki laporan.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={onReject}
            disabled={saving}
            className="h-11 rounded-xl border border-red-200 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Memproses..." : "Kirim Revisi"}
          </button>

          <button
            type="button"
            onClick={onApprove}
            disabled={saving}
            className="h-11 rounded-xl bg-[#158A58] text-sm font-bold text-white transition hover:bg-[#116C46] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Memproses..." : "Approve"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function ModalShell({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
      <div className="flex max-h-[92vh] w-full max-w-[900px] flex-col overflow-hidden rounded-2xl bg-[#FAF3EA] shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-[#E8D6C1] px-6 py-5">
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="mt-1 text-sm text-[#6B4A3A]">{subtitle}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-[#6B4A3A] hover:text-[#7A1F2B]"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-4 text-sm">
      <p className="font-bold text-[#6B4A3A]">{label}</p>
      <p className="mt-2 whitespace-pre-line leading-6 text-[#2B1B18]">
        {value}
      </p>
    </div>
  );
}

function MiniScore({ label, value }: { label: string; value?: number | null }) {
  return (
    <div className="rounded-xl bg-[#FFF8EF] px-4 py-3 text-center">
      <p className="text-[12px] font-bold text-[#6B4A3A]">{label}</p>
      <p className="mt-1 text-[20px] font-extrabold text-[#2B1B18]">
        {formatNumber(value)}
      </p>
    </div>
  );
}
