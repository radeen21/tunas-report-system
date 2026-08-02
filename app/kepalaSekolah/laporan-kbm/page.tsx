"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import KepalaSekolahLayout from "../components/KepalaSekolahLayout";

type StudentOption = {
  id: string;
  full_name: string | null;
  level: string | null;
  grade: string | null;
  nis: string | null;
  nisn: string | null;
};

type TeacherOption = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type SubjectOption = {
  id: string;
  name: string | null;
  level: string | null;
  grade: string | null;
};

type KbmReportRow = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  report_date: string | null;
  class_level: string | null;
  semester: string | null;
  chapter: string | null;
  material_topic: string | null;
  learning_issue: string | null;
  solution: string | null;
  teacher_note: string | null;
  status: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type EnrichedKbmReport = KbmReportRow & {
  student_name: string;
  student_level: string;
  student_grade: string;
  student_nis: string;
  student_nisn: string;
  teacher_name: string;
  teacher_email: string;
  subject_name: string;
  subject_label: string;
};

const statusOptions = [
  { value: "Semua Status", label: "Semua Status" },
  { value: "draft", label: "Draft" },
  { value: "pending_review", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "revision", label: "Revision" },
  { value: "published", label: "Published" },
];

function normalizeText(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function normalizeLevel(level?: string | null) {
  const safe = normalizeText(level);

  if (safe.includes("primary") || safe === "sd") return "SD";
  if (safe.includes("secondary") || safe === "smp") return "SMP";
  if (safe.includes("high") || safe === "sma") return "SMA";
  if (safe.includes("early")) return "Bimbel/Kursus";

  return level || "-";
}

function formatClass(level?: string | null, grade?: string | null) {
  const cleanLevel = normalizeLevel(level);
  const cleanGrade = grade || "";

  if (cleanLevel && cleanGrade) return `${cleanLevel} ${cleanGrade}`;
  if (cleanLevel) return cleanLevel;
  if (cleanGrade) return cleanGrade;

  return "-";
}

function getSubjectLabel(subject?: SubjectOption | null) {
  if (!subject) return "-";

  const level = subject.level ? normalizeLevel(subject.level) : "";
  const grade = subject.grade || "";

  if (level && grade) return `${subject.name || "-"} — ${level} ${grade}`;
  if (grade) return `${subject.name || "-"} — ${grade}`;
  if (level) return `${subject.name || "-"} — ${level}`;

  return subject.name || "-";
}

function formatDate(date: string | null) {
  if (!date) return "-";

  const parsedDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) return "-";

  return parsedDate.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

function getStatusBadge(status: string | null) {
  if (status === "published") return "bg-emerald-100 text-emerald-700";
  if (status === "approved") return "bg-blue-100 text-blue-700";
  if (status === "pending_review") return "bg-yellow-100 text-yellow-700";
  if (status === "revision") return "bg-red-100 text-red-700";

  return "bg-slate-200 text-slate-700";
}

function getStatusLabel(status: string | null) {
  if (status === "published") return "Published";
  if (status === "approved") return "Approved";
  if (status === "pending_review") return "Pending Review";
  if (status === "revision") return "Revision";

  return "Draft";
}

function canReview(status: string | null) {
  return status === "pending_review";
}

function canPublish(status: string | null) {
  return status === "approved";
}

function escapeExcelCell(value: string | number | null | undefined) {
  return String(value ?? "-")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatExportDateName() {
  const date = new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
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

export default function KepalaSekolahLaporanKBMPage() {
  const [reports, setReports] = useState<EnrichedKbmReport[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [reviewSaving, setReviewSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [teacherFilter, setTeacherFilter] = useState("Semua Guru");

  const [selectedReport, setSelectedReport] =
    useState<EnrichedKbmReport | null>(null);

  const [reviewReport, setReviewReport] =
    useState<EnrichedKbmReport | null>(null);

  const [reviewNote, setReviewNote] = useState("");

  async function fetchReports() {
    setLoading(true);
    setErrorMessage("");

    try {
      const [studentsRes, teachersRes, subjectsRes, reportsRes] =
        await Promise.all([
          supabase
            .from("students")
            .select("id, full_name, level, grade, nis, nisn"),

          supabase
            .from("teachers")
            .select("id, full_name, email")
            .order("full_name"),

          supabase
            .from("subjects")
            .select("id, name, level, grade")
            .order("name"),

          supabase
            .from("kbm_reports")
            .select("*")
            .order("report_date", { ascending: false })
            .order("created_at", { ascending: false }),
        ]);

      if (studentsRes.error) throw new Error(studentsRes.error.message);
      if (teachersRes.error) throw new Error(teachersRes.error.message);
      if (subjectsRes.error) throw new Error(subjectsRes.error.message);
      if (reportsRes.error) throw new Error(reportsRes.error.message);

      const studentsData = (studentsRes.data || []) as StudentOption[];
      const teachersData = (teachersRes.data || []) as TeacherOption[];
      const subjectsData = (subjectsRes.data || []) as SubjectOption[];
      const reportsData = (reportsRes.data || []) as KbmReportRow[];

      const studentMap = new Map(
        studentsData.map((student) => [student.id, student])
      );

      const teacherMap = new Map(
        teachersData.map((teacher) => [teacher.id, teacher])
      );

      const subjectMap = new Map(
        subjectsData.map((subject) => [subject.id, subject])
      );

      const enrichedReports: EnrichedKbmReport[] = reportsData.map((report) => {
        const student = report.student_id
          ? studentMap.get(report.student_id)
          : null;

        const teacher = report.teacher_id
          ? teacherMap.get(report.teacher_id)
          : null;

        const subject = report.subject_id
          ? subjectMap.get(report.subject_id)
          : null;

        return {
          ...report,
          student_name: student?.full_name || "-",
          student_level: student?.level || "-",
          student_grade: student?.grade || "-",
          student_nis: student?.nis || "-",
          student_nisn: student?.nisn || "-",
          teacher_name: teacher?.full_name || "-",
          teacher_email: teacher?.email || "-",
          subject_name: subject?.name || "-",
          subject_label: getSubjectLabel(subject),
        };
      });

      setTeachers(teachersData);
      setReports(enrichedReports);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengambil data laporan KBM.");
      }

      setTeachers([]);
      setReports([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReports();

    const channel = supabase
      .channel("kepala-laporan-kbm-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "kbm_reports" },
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
        () => fetchReports()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subjects" },
        () => fetchReports()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "student_teachers" },
        () => fetchReports()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const filteredReports = useMemo(() => {
    const keyword = normalizeText(search);

    return reports.filter((report) => {
      const matchSearch =
        !keyword ||
        normalizeText(report.student_name).includes(keyword) ||
        normalizeText(report.student_nis).includes(keyword) ||
        normalizeText(report.student_nisn).includes(keyword) ||
        normalizeText(report.teacher_name).includes(keyword) ||
        normalizeText(report.teacher_email).includes(keyword) ||
        normalizeText(report.subject_name).includes(keyword) ||
        normalizeText(report.subject_label).includes(keyword) ||
        normalizeText(report.class_level).includes(keyword) ||
        normalizeText(report.material_topic).includes(keyword) ||
        normalizeText(report.chapter).includes(keyword) ||
        normalizeText(report.teacher_note).includes(keyword) ||
        normalizeText(report.learning_issue).includes(keyword) ||
        normalizeText(report.solution).includes(keyword);

      const matchStatus =
        statusFilter === "Semua Status" || report.status === statusFilter;

      const matchTeacher =
        teacherFilter === "Semua Guru" || report.teacher_id === teacherFilter;

      return matchSearch && matchStatus && matchTeacher;
    });
  }, [reports, search, statusFilter, teacherFilter]);

  const summary = useMemo(() => {
    const totalDraft = reports.filter((report) => report.status === "draft").length;

    const totalPending = reports.filter(
      (report) => report.status === "pending_review"
    ).length;

    const totalRevision = reports.filter(
      (report) => report.status === "revision"
    ).length;

    const totalApproved = reports.filter(
      (report) => report.status === "approved"
    ).length;

    const totalPublished = reports.filter(
      (report) => report.status === "published"
    ).length;

    return {
      total: reports.length,
      totalDraft,
      totalPending,
      totalRevision,
      totalApproved,
      totalPublished,
      approvedPublished: totalApproved + totalPublished,
    };
  }, [reports]);

  async function handleApproveReport(report: EnrichedKbmReport) {
    if (!canReview(report.status)) {
      setErrorMessage("Hanya laporan dengan status pending_review yang bisa di-approve.");
      return;
    }

    const confirmApprove = window.confirm(
      `Approve Laporan KBM ${report.student_name || "-"}?`
    );

    if (!confirmApprove) return;

    setReviewSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } = await supabase
        .from("kbm_reports")
        .update({
          status: "approved",
          updated_at: new Date().toISOString(),
        })
        .eq("id", report.id);

      if (error) throw new Error(error.message);

      setSuccessMessage("Laporan KBM berhasil di-approve.");
      setReviewReport(null);
      setSelectedReport(null);
      setReviewNote("");

      await fetchReports();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal approve laporan KBM.");
      }
    } finally {
      setReviewSaving(false);
    }
  }

  async function handlePublishReport(report: EnrichedKbmReport) {
    if (!canPublish(report.status)) {
      setErrorMessage("Hanya laporan approved yang bisa dipublish.");
      return;
    }

    const confirmPublish = window.confirm(
      `Publish Laporan KBM ${report.student_name || "-"}?`
    );

    if (!confirmPublish) return;

    setReviewSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } = await supabase
        .from("kbm_reports")
        .update({
          status: "published",
          updated_at: new Date().toISOString(),
        })
        .eq("id", report.id);

      if (error) throw new Error(error.message);

      setSuccessMessage("Laporan KBM berhasil dipublish.");
      setReviewReport(null);
      setSelectedReport(null);
      setReviewNote("");

      await fetchReports();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal publish laporan KBM.");
      }
    } finally {
      setReviewSaving(false);
    }
  }

  async function handleRevisionReport() {
    if (!reviewReport) return;

    if (!canReview(reviewReport.status)) {
      setErrorMessage("Hanya laporan dengan status pending_review yang bisa direvisi.");
      return;
    }

    if (!reviewNote.trim()) {
      alert("Isi catatan revisi terlebih dahulu.");
      return;
    }

    setReviewSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const previousNote = reviewReport.teacher_note || "";
      const revisionNote = `Catatan Revisi Kepala Sekolah: ${reviewNote.trim()}`;
      const nextTeacherNote = previousNote
        ? `${previousNote}\n\n${revisionNote}`
        : revisionNote;

      const { error } = await supabase
        .from("kbm_reports")
        .update({
          status: "revision",
          teacher_note: nextTeacherNote,
          updated_at: new Date().toISOString(),
        })
        .eq("id", reviewReport.id);

      if (error) throw new Error(error.message);

      setSuccessMessage("Laporan KBM berhasil dikembalikan untuk revisi.");
      setReviewReport(null);
      setSelectedReport(null);
      setReviewNote("");

      await fetchReports();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengirim revisi laporan KBM.");
      }
    } finally {
      setReviewSaving(false);
    }
  }

  function openReview(report: EnrichedKbmReport) {
    setReviewReport(report);
    setReviewNote("");
    setErrorMessage("");
    setSuccessMessage("");
  }

  function handleExportExcel() {
    if (filteredReports.length === 0) {
      alert("Tidak ada data laporan KBM yang bisa diexport.");
      return;
    }

    const rows = filteredReports.map((report, index) => ({
      No: index + 1,
      "Tanggal Laporan": formatDate(report.report_date),
      "Nama Siswa": report.student_name || "-",
      NIPD: report.student_nis || "-",
      NISN: report.student_nisn || "-",
      Guru: report.teacher_name || "-",
      "Email Guru": report.teacher_email || "-",
      "Mata Pelajaran": report.subject_label || report.subject_name || "-",
      Kelas:
        report.class_level ||
        formatClass(report.student_level, report.student_grade),
      Semester: report.semester || "-",
      BAB: report.chapter || "-",
      "Materi Pokok": report.material_topic || "-",
      "Masalah / Kendala": report.learning_issue || "-",
      Solusi: report.solution || "-",
      "Catatan Guru / Revisi": report.teacher_note || "-",
      Status: getStatusLabel(report.status),
      "Created At": formatDateTime(report.created_at),
      "Updated At": formatDateTime(report.updated_at),
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
          <div class="title">Laporan KBM</div>
          <div class="subtitle">
            Export tanggal ${formatDateTime(new Date().toISOString())} |
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

    downloadHtmlAsExcel(`laporan-kbm-${formatExportDateName()}.xls`, html);
  }

  return (
    <KepalaSekolahLayout
      activeMenu="Laporan KBM"
      searchPlaceholder="Cari laporan KBM..."
    >
      <section className="space-y-7">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#8A5A48]">
              Monitoring KBM
            </p>

            <h1 className="mt-2 text-[30px] font-bold tracking-tight text-[#2B1B18]">
              Laporan KBM
            </h1>

            <p className="mt-2 max-w-[850px] text-sm leading-6 text-[#6B4A3A]">
              Monitoring laporan kegiatan belajar mengajar dari guru.
              Admin/Kepala Sekolah hanya melakukan review, approve, publish,
              revisi, dan export data.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            className="w-fit rounded-xl border border-[#E8D6C1] bg-white px-5 py-3 text-sm font-semibold text-[#2B1B18] shadow-sm transition hover:bg-[#FFF8EF]"
          >
            Export Excel
          </button>
        </div>

        {errorMessage ? (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Total Laporan" value={summary.total} />
          <SummaryCard label="Draft" value={summary.totalDraft} />
          <SummaryCard label="Pending Review" value={summary.totalPending} />
          <SummaryCard
            label="Approved / Published"
            value={summary.approvedPublished}
          />
        </div>

        <div className="rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-[1fr_210px_220px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari siswa, NIPD, NISN, guru, mapel, bab, materi, masalah, solusi..."
              className="w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
            >
              {statusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>

            <select
              value={teacherFilter}
              onChange={(event) => setTeacherFilter(event.target.value)}
              className="rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
            >
              <option value="Semua Guru">Semua Guru</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.full_name || "-"}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          {loading ? (
            <div className="col-span-full rounded-2xl border border-[#E8D6C1] bg-white p-8 text-center text-sm shadow-sm">
              Loading laporan KBM...
            </div>
          ) : null}

          {!loading && filteredReports.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-[#E8D6C1] bg-white p-8 text-center text-sm shadow-sm">
              Belum ada laporan KBM.
            </div>
          ) : null}

          {!loading
            ? filteredReports.map((report) => (
                <div
                  key={report.id}
                  className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-[#2B1B18]">
                        {report.student_name || "-"}
                      </h2>

                      <p className="mt-1 text-sm text-[#6B4A3A]">
                        {report.class_level ||
                          formatClass(report.student_level, report.student_grade)}{" "}
                        • {report.subject_label || "-"} •{" "}
                        {formatDate(report.report_date)} • NIPD:{" "}
                        {report.student_nis || "-"}
                      </p>

                      <p className="mt-1 text-sm text-[#6B4A3A]">
                        Guru:{" "}
                        <span className="font-bold text-[#2B1B18]">
                          {report.teacher_name || "-"}
                        </span>
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusBadge(
                        report.status
                      )}`}
                    >
                      {getStatusLabel(report.status)}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <InfoPreview label="Semester" value={report.semester || "-"} />
                    <InfoPreview label="BAB" value={report.chapter || "-"} />
                    <InfoPreview
                      label="Materi"
                      value={report.material_topic || "-"}
                    />
                    <InfoPreview
                      label="Status"
                      value={getStatusLabel(report.status)}
                    />
                  </div>

                  <div className="mt-5 space-y-4 text-sm">
                    <InfoSection
                      label="Masalah / Kendala"
                      value={report.learning_issue || "-"}
                    />

                    <InfoSection label="Solusi" value={report.solution || "-"} />

                    <InfoSection
                      label="Catatan Guru / Revisi"
                      value={report.teacher_note || "-"}
                    />
                  </div>

                  <div className="mt-5 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedReport(report)}
                      className="rounded-lg border border-[#E8D6C1] px-4 py-2 text-xs font-bold transition hover:bg-[#FFF8EF]"
                    >
                      View
                    </button>

                    <button
                      type="button"
                      onClick={() => openReview(report)}
                      disabled={!canReview(report.status)}
                      className="rounded-lg bg-[#7A1F2B] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:bg-[#C9AAB2]"
                    >
                      Review
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePublishReport(report)}
                      disabled={!canPublish(report.status) || reviewSaving}
                      className="rounded-lg bg-[#158A58] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#116C46] disabled:cursor-not-allowed disabled:bg-[#A7CDBB]"
                    >
                      Publish
                    </button>
                  </div>

                  {!canReview(report.status) && !canPublish(report.status) ? (
                    <p className="mt-3 text-right text-[12px] font-semibold text-[#8A5A48]">
                      Review hanya untuk pending_review. Publish hanya untuk
                      approved.
                    </p>
                  ) : null}
                </div>
              ))
            : null}
        </div>
      </section>

      {selectedReport ? (
        <ReportDetailModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onReview={() => openReview(selectedReport)}
          onPublish={() => handlePublishReport(selectedReport)}
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
          onRevision={handleRevisionReport}
        />
      ) : null}
    </KepalaSekolahLayout>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
      <p className="text-sm text-[#6B4A3A]">{label}</p>
      <p className="mt-4 text-3xl font-bold text-[#2B1B18]">{value}</p>
    </div>
  );
}

function InfoPreview({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#FFF8EF] p-3">
      <p className="text-[#6B4A3A]">{label}</p>
      <p className="mt-1 font-bold text-[#2B1B18]">{value}</p>
    </div>
  );
}

function InfoSection({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-bold text-[#2B1B18]">{label}</p>
      <p className="mt-1 whitespace-pre-line leading-6 text-[#6B4A3A]">
        {value}
      </p>
    </div>
  );
}

function ReportDetailModal({
  report,
  onClose,
  onReview,
  onPublish,
}: {
  report: EnrichedKbmReport;
  onClose: () => void;
  onReview: () => void;
  onPublish: () => void;
}) {
  return (
    <ModalShell
      title="Detail Laporan KBM"
      subtitle={`${report.student_name || "-"} • ${report.subject_label || "-"}`}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusBadge(
              report.status
            )}`}
          >
            {getStatusLabel(report.status)}
          </span>

          <span className="rounded-full bg-[#FFF8EF] px-3 py-1 text-xs font-bold text-[#7A1F2B]">
            {formatDate(report.report_date)}
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <InfoBox label="Nama Siswa" value={report.student_name || "-"} />
          <InfoBox label="NIPD" value={report.student_nis || "-"} />
          <InfoBox label="NISN" value={report.student_nisn || "-"} />
          <InfoBox label="Guru" value={report.teacher_name || "-"} />
          <InfoBox label="Email Guru" value={report.teacher_email || "-"} />
          <InfoBox label="Mata Pelajaran" value={report.subject_label || "-"} />
          <InfoBox
            label="Kelas"
            value={
              report.class_level ||
              formatClass(report.student_level, report.student_grade)
            }
          />
          <InfoBox label="Semester" value={report.semester || "-"} />
          <InfoBox label="BAB" value={report.chapter || "-"} />
        </div>

        <InfoBox label="Materi Pokok" value={report.material_topic || "-"} />
        <InfoBox label="Masalah / Kendala" value={report.learning_issue || "-"} />
        <InfoBox label="Solusi" value={report.solution || "-"} />
        <InfoBox
          label="Catatan Guru / Revisi"
          value={report.teacher_note || "-"}
        />

        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={onReview}
            disabled={!canReview(report.status)}
            className="h-11 w-full rounded-xl bg-[#7A1F2B] text-sm font-bold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:bg-[#C9AAB2]"
          >
            Review Laporan KBM
          </button>

          <button
            type="button"
            onClick={onPublish}
            disabled={!canPublish(report.status)}
            className="h-11 w-full rounded-xl bg-[#158A58] text-sm font-bold text-white transition hover:bg-[#116C46] disabled:cursor-not-allowed disabled:bg-[#A7CDBB]"
          >
            Publish
          </button>
        </div>
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
  onRevision,
}: {
  report: EnrichedKbmReport;
  note: string;
  saving: boolean;
  onChange: (value: string) => void;
  onClose: () => void;
  onApprove: () => void;
  onRevision: () => void;
}) {
  return (
    <ModalShell
      title="Review Laporan KBM"
      subtitle={`${report.student_name || "-"} • ${report.subject_label || "-"}`}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-[#E8D6C1] bg-white p-4">
          <p className="text-sm font-bold text-[#2B1B18]">Ringkasan Laporan</p>
          <p className="mt-2 text-sm leading-6 text-[#6B4A3A]">
            {report.teacher_name || "-"} melaporkan KBM tanggal{" "}
            {formatDate(report.report_date)} untuk materi{" "}
            <b>{report.material_topic || "-"}</b>.
          </p>
        </div>

        <div>
          <label className="text-sm font-bold">Catatan Revisi</label>
          <textarea
            value={note}
            onChange={(event) => onChange(event.target.value)}
            rows={5}
            placeholder="Isi jika laporan perlu revisi. Contoh: Mohon lengkapi solusi dan catatan perkembangan siswa."
            className="mt-2 w-full resize-none rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
          />
          <p className="mt-2 text-xs leading-5 text-[#6B4A3A]">
            Catatan revisi akan ditambahkan ke bagian Catatan Guru agar guru bisa
            melihat arahan dari Kepala Sekolah.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={onRevision}
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
      <div className="flex max-h-[88vh] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl bg-[#FAF3EA] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#E8D6C1] px-6 py-5">
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

        <div className="overflow-y-auto px-6 py-5">{children}</div>
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