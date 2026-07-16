"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileText,
  GraduationCap,
  Search,
  Send,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import KepalaSekolahLayout from "../components/KepalaSekolahLayout";

type TeacherRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  teacher_code?: string | null;
};

type StudentRow = {
  id: string;
  full_name: string | null;
  grade: string | null;
  level: string | null;
  nis?: string | null;
  nisn?: string | null;
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
  teacher_name: string;
  subject_name: string;
};

const statusOptions = [
  "Semua Status",
  "draft",
  "pending",
  "approved",
  "rejected",
];

function normalizeText(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatNumber(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";

  return Number(value).toFixed(2).replace(".00", "");
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

function getStatusKey(report: AcademicReportRow) {
  if (report.approval_status) return report.approval_status;

  if (report.status === "published") return "approved";
  if (report.status === "approved") return "approved";
  if (report.status === "pending") return "pending";
  if (report.status === "rejected") return "rejected";

  return "draft";
}

function getStatusLabel(status?: string | null) {
  if (status === "approved") return "Approved";
  if (status === "pending") return "Pending Approval";
  if (status === "rejected") return "Rejected";
  return "Draft";
}

function getReportTypeLabel(type?: string | null) {
  if (type === "mid_semester") return "Mid Semester";
  if (type === "semester") return "Semester";
  return "Bulanan";
}

export default function KepalaSekolahReportsPage() {
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [reports, setReports] = useState<EnrichedReport[]>([]);

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [teacherFilter, setTeacherFilter] = useState("Semua Guru");
  const [periodFilter, setPeriodFilter] = useState("Semua Periode");

  const [selectedReport, setSelectedReport] = useState<EnrichedReport | null>(
    null
  );

  const [rejectReport, setRejectReport] = useState<EnrichedReport | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");

  async function fetchData() {
    setLoading(true);

    const [teachersRes, studentsRes, subjectsRes, reportsRes] =
      await Promise.all([
        supabase.from("teachers").select("*").order("full_name"),
        supabase.from("students").select("*").order("full_name"),
        supabase.from("subjects").select("*").order("name"),
        supabase
          .from("academic_reports")
          .select("*")
          .order("report_period", { ascending: false }),
      ]);

    const teachersData = (teachersRes.data || []) as TeacherRow[];
    const studentsData = (studentsRes.data || []) as StudentRow[];
    const subjectsData = (subjectsRes.data || []) as SubjectRow[];
    const reportsData = (reportsRes.data || []) as AcademicReportRow[];

    const teacherMap = new Map(teachersData.map((teacher) => [teacher.id, teacher]));
    const studentMap = new Map(studentsData.map((student) => [student.id, student]));
    const subjectMap = new Map(subjectsData.map((subject) => [subject.id, subject]));

    const enrichedReports: EnrichedReport[] = reportsData.map((report) => {
      const teacher = report.teacher_id ? teacherMap.get(report.teacher_id) : null;
      const student = report.student_id ? studentMap.get(report.student_id) : null;
      const subject = report.subject_id ? subjectMap.get(report.subject_id) : null;

      return {
        ...report,
        teacher_name: teacher?.full_name || "-",
        student_name: student?.full_name || "-",
        student_grade: student?.grade || "-",
        student_level: student?.level || "-",
        subject_name: subject?.name || "-",
      };
    });

    setTeachers(teachersData);
    setStudents(studentsData);
    setSubjects(subjectsData);
    setReports(enrichedReports);

    setLoading(false);
  }

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("kepala-akademik-approval-realtime")
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teachers" },
        fetchData
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subjects" },
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
      const status = getStatusKey(report);

      const matchSearch =
        !q ||
        normalizeText(report.student_name).includes(q) ||
        normalizeText(report.teacher_name).includes(q) ||
        normalizeText(report.subject_name).includes(q) ||
        normalizeText(report.report_period).includes(q) ||
        normalizeText(report.teacher_comment).includes(q);

      const matchStatus =
        statusFilter === "Semua Status" || status === statusFilter;

      const matchTeacher =
        teacherFilter === "Semua Guru" || report.teacher_id === teacherFilter;

      const matchPeriod =
        periodFilter === "Semua Periode" || report.report_period === periodFilter;

      return matchSearch && matchStatus && matchTeacher && matchPeriod;
    });
  }, [reports, search, statusFilter, teacherFilter, periodFilter]);

  const summary = useMemo(() => {
    const draft = reports.filter((report) => getStatusKey(report) === "draft").length;
    const pending = reports.filter(
      (report) => getStatusKey(report) === "pending"
    ).length;
    const approved = reports.filter(
      (report) => getStatusKey(report) === "approved"
    ).length;
    const rejected = reports.filter(
      (report) => getStatusKey(report) === "rejected"
    ).length;

    return {
      total: reports.length,
      draft,
      pending,
      approved,
      rejected,
    };
  }, [reports]);

  async function handleApprove(report: EnrichedReport) {
    const confirmApprove = confirm(
      `Approve laporan ${report.student_name} - ${report.subject_name}?`
    );

    if (!confirmApprove) return;

    setProcessing(true);

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("academic_reports")
      .update({
        approval_status: "approved",
        status: "published",
        approved_at: now,
        rejected_at: null,
        rejection_note: null,
        updated_at: now,
      })
      .eq("id", report.id);

    if (error) {
      setProcessing(false);
      alert(`Gagal approve laporan: ${error.message}`);
      return;
    }

    await fetchData();

    setProcessing(false);
    setSelectedReport(null);
  }

  function openRejectModal(report: EnrichedReport) {
    setRejectReport(report);
    setRejectionNote("");
  }

  async function handleReject() {
    if (!rejectReport) return;

    if (!rejectionNote.trim()) {
      alert("Isi catatan rejection terlebih dahulu.");
      return;
    }

    const confirmReject = confirm(
      `Reject laporan ${rejectReport.student_name} - ${rejectReport.subject_name}?`
    );

    if (!confirmReject) return;

    setProcessing(true);

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("academic_reports")
      .update({
        approval_status: "rejected",
        status: "rejected",
        rejected_at: now,
        rejection_note: rejectionNote.trim(),
        updated_at: now,
      })
      .eq("id", rejectReport.id);

    if (error) {
      setProcessing(false);
      alert(`Gagal reject laporan: ${error.message}`);
      return;
    }

    await fetchData();

    setProcessing(false);
    setRejectReport(null);
    setRejectionNote("");
    setSelectedReport(null);
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
              Approval Akademik
            </p>

            <h1 className="mt-2 text-[30px] font-extrabold tracking-[-0.02em] text-[#2B1B18]">
              Laporan Akademik
            </h1>

            <p className="mt-2 max-w-[850px] text-[15px] leading-6 text-[#6F5549]">
              Review laporan akademik yang dikirim guru. Kepala sekolah dapat
              approve atau reject laporan sebelum tampil ke orang tua.
            </p>
          </div>
        </div>

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
            tone="orange"
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
            label="Rejected"
            value={summary.rejected}
            info={`${summary.draft} Draft`}
            tone="blue"
          />
        </div>

        <div className="rounded-[22px] border border-[#E1CFBE] bg-white p-5 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8E6A58]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari siswa, guru, mapel, periode, atau catatan..."
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
              Daftar Approval Laporan Akademik
            </h2>

            <p className="mt-1 text-[14px] text-[#6F5549]">
              Hanya laporan approved yang nanti bisa tampil ke orang tua.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px] border-collapse">
              <thead>
                <tr className="border-b border-[#EADACA] bg-[#FFF8EF] text-left text-[13px] font-extrabold text-[#6F5549]">
                  <th className="px-6 py-4">Siswa</th>
                  <th className="px-6 py-4">Guru</th>
                  <th className="px-6 py-4">Mapel</th>
                  <th className="px-6 py-4">Periode</th>
                  <th className="px-6 py-4">UH</th>
                  <th className="px-6 py-4">Tugas</th>
                  <th className="px-6 py-4">UTS</th>
                  <th className="px-6 py-4">UAS</th>
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
                      colSpan={12}
                      className="px-6 py-12 text-center text-[#6F5549]"
                    >
                      Memuat laporan akademik...
                    </td>
                  </tr>
                ) : filteredReports.length === 0 ? (
                  <tr>
                    <td
                      colSpan={12}
                      className="px-6 py-12 text-center text-[#6F5549]"
                    >
                      Belum ada laporan akademik.
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((report) => {
                    const status = getStatusKey(report);

                    return (
                      <tr
                        key={report.id}
                        className="border-b border-[#F0E1D4] text-[14px] text-[#2B1B18]"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F8DFD0] text-[13px] font-extrabold text-[#8C0F2D]">
                              {getInitials(report.student_name)}
                            </div>

                            <div>
                              <p className="font-extrabold">{report.student_name}</p>
                              <p className="mt-1 text-[12px] text-[#6F5549]">
                                {report.student_level} — {report.student_grade}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 font-bold">
                          {report.teacher_name}
                        </td>

                        <td className="px-6 py-4">{report.subject_name}</td>

                        <td className="px-6 py-4">
                          <p className="font-bold">{report.report_period || "-"}</p>
                          <p className="mt-1 text-[12px] text-[#6F5549]">
                            {getReportTypeLabel(report.report_type)}
                          </p>
                        </td>

                        <td className="px-6 py-4">
                          {formatNumber(report.average_uh || report.uh_score)}
                        </td>

                        <td className="px-6 py-4">
                          {formatNumber(report.average_task || report.task_score)}
                        </td>

                        <td className="px-6 py-4">
                          {formatNumber(report.mid_score || report.uts_score)}
                        </td>

                        <td className="px-6 py-4">
                          {formatNumber(
                            report.final_exam_score || report.uas_score
                          )}
                        </td>

                        <td className="px-6 py-4 font-extrabold">
                          {formatNumber(report.final_grade || report.final_score)}
                        </td>

                        <td className="px-6 py-4">
                          <PredicateBadge
                            predicate={report.predicate || report.description}
                          />
                        </td>

                        <td className="px-6 py-4">
                          <StatusBadge status={status} />
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

                            {status === "pending" ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApprove(report)}
                                  disabled={processing}
                                  className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#158A58] px-3 text-[13px] font-extrabold text-white transition hover:bg-[#0F6B44] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                  Approve
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openRejectModal(report)}
                                  disabled={processing}
                                  className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#BE123C] px-3 text-[13px] font-extrabold text-white transition hover:bg-[#9F1239] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <XCircle className="h-4 w-4" />
                                  Reject
                                </button>
                              </>
                            ) : null}
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
          processing={processing}
          onClose={() => setSelectedReport(null)}
          onApprove={handleApprove}
          onReject={openRejectModal}
        />
      ) : null}

      {rejectReport ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 px-4 py-8">
          <div className="w-full max-w-[560px] rounded-[22px] bg-[#FFF8EF] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E1CFBE] px-6 py-5">
              <div>
                <h2 className="text-[22px] font-extrabold text-[#2B1B18]">
                  Reject Laporan
                </h2>
                <p className="mt-1 text-[14px] text-[#6F5549]">
                  {rejectReport.student_name} • {rejectReport.subject_name}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setRejectReport(null)}
                className="rounded-full p-2 text-[#6F5549] transition hover:bg-[#F4E5DA]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-6">
              <label className="block">
                <p className="mb-2 text-[14px] font-extrabold text-[#2B1B18]">
                  Catatan Rejection
                </p>

                <textarea
                  value={rejectionNote}
                  onChange={(event) => setRejectionNote(event.target.value)}
                  rows={5}
                  placeholder="Contoh: Mohon lengkapi catatan guru dan cek kembali nilai UAS."
                  className="w-full resize-none rounded-xl border border-[#DCC8B6] bg-white px-4 py-3 text-[14px] outline-none focus:border-[#9C0824]"
                />
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setRejectReport(null)}
                  className="h-11 rounded-xl border border-[#DCC8B6] bg-white text-[14px] font-extrabold text-[#8C0F2D] transition hover:bg-[#FFF8EF]"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={handleReject}
                  disabled={processing}
                  className="h-11 rounded-xl bg-[#BE123C] text-[14px] font-extrabold text-white transition hover:bg-[#9F1239] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {processing ? "Memproses..." : "Reject Laporan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </KepalaSekolahLayout>
  );
}

function ReportDetailModal({
  report,
  processing,
  onClose,
  onApprove,
  onReject,
}: {
  report: EnrichedReport;
  processing: boolean;
  onClose: () => void;
  onApprove: (report: EnrichedReport) => void;
  onReject: (report: EnrichedReport) => void;
}) {
  const status = getStatusKey(report);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-8">
      <div className="max-h-[92vh] w-full max-w-[980px] overflow-y-auto rounded-[22px] bg-[#FFF8EF] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E1CFBE] bg-[#FFF8EF] px-6 py-5">
          <div>
            <h2 className="text-[22px] font-extrabold text-[#2B1B18]">
              Detail Laporan Akademik
            </h2>

            <p className="mt-1 text-[14px] text-[#6F5549]">
              {report.student_name} • {report.subject_name} •{" "}
              {report.report_period}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#6F5549] transition hover:bg-[#F4E5DA]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div className="grid gap-4 md:grid-cols-4">
            <DetailSummaryCard
              label="Nilai Akhir"
              value={formatNumber(report.final_grade || report.final_score)}
            />
            <DetailSummaryCard
              label="Predikat"
              value={report.predicate || report.description || "-"}
            />
            <DetailSummaryCard
              label="Status"
              value={getStatusLabel(status)}
            />
            <DetailSummaryCard
              label="Jenis"
              value={getReportTypeLabel(report.report_type)}
            />
          </div>

          <div className="rounded-2xl border border-[#E1CFBE] bg-white px-5 py-4">
            <div className="grid gap-4 md:grid-cols-3">
              <InfoItem label="Siswa" value={report.student_name} />
              <InfoItem
                label="Kelas"
                value={`${report.student_level} — ${report.student_grade}`}
              />
              <InfoItem label="Guru" value={report.teacher_name} />
              <InfoItem label="Mata Pelajaran" value={report.subject_name} />
              <InfoItem label="Periode" value={report.report_period || "-"} />
              <InfoItem
                label="Submitted At"
                value={formatDateTime(report.submitted_at)}
              />
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <ScoreBox title="Nilai UH">
              <ScoreRow label="UH 1" value={formatNumber(report.uh_1 || report.uh_score)} />
              <ScoreRow label="UH 2" value={formatNumber(report.uh_2)} />
              <ScoreRow label="UH 3" value={formatNumber(report.uh_3)} />
              <ScoreRow label="UH 4" value={formatNumber(report.uh_4)} />
              <ScoreRow
                label="Rata-rata UH"
                value={formatNumber(report.average_uh || report.uh_score)}
                bold
              />
            </ScoreBox>

            <ScoreBox title="Nilai Tugas">
              <ScoreRow label="Tugas 1" value={formatNumber(report.task_1 || report.task_score)} />
              <ScoreRow label="Tugas 2" value={formatNumber(report.task_2)} />
              <ScoreRow label="Tugas 3" value={formatNumber(report.task_3)} />
              <ScoreRow label="Tugas 4" value={formatNumber(report.task_4)} />
              <ScoreRow label="Tugas 5" value={formatNumber(report.task_5)} />
              <ScoreRow
                label="Rata-rata Tugas"
                value={formatNumber(report.average_task || report.task_score)}
                bold
              />
            </ScoreBox>
          </div>

          <ScoreBox title="Nilai Ujian dan Proses">
            <ScoreRow
              label="UTS"
              value={formatNumber(report.mid_score || report.uts_score)}
            />
            <ScoreRow
              label="UAS"
              value={formatNumber(report.final_exam_score || report.uas_score)}
            />
            <ScoreRow
              label="Proses KBM"
              value={formatNumber(report.process_score)}
            />
            <ScoreRow
              label="Nilai Akhir"
              value={formatNumber(report.final_grade || report.final_score)}
              bold
            />
          </ScoreBox>

          <div className="rounded-2xl border border-[#E1CFBE] bg-white px-5 py-4">
            <p className="text-[14px] font-extrabold text-[#2B1B18]">
              Catatan Guru
            </p>

            <p className="mt-2 whitespace-pre-line text-[14px] leading-6 text-[#6F5549]">
              {report.teacher_comment || "-"}
            </p>
          </div>

          {report.rejection_note ? (
            <div className="rounded-2xl border border-[#FECACA] bg-[#FFF1F2] px-5 py-4">
              <p className="text-[14px] font-extrabold text-[#BE123C]">
                Catatan Rejection
              </p>

              <p className="mt-2 whitespace-pre-line text-[14px] leading-6 text-[#7F1D1D]">
                {report.rejection_note}
              </p>
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-3">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-white text-[14px] font-extrabold text-[#8C0F2D] transition hover:bg-[#FFF8EF]"
            >
              Tutup Detail
            </button>

            {status === "pending" ? (
              <>
                <button
                  type="button"
                  onClick={() => onApprove(report)}
                  disabled={processing}
                  className="h-11 rounded-xl bg-[#158A58] text-[14px] font-extrabold text-white transition hover:bg-[#0F6B44] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Approve
                </button>

                <button
                  type="button"
                  onClick={() => onReject(report)}
                  disabled={processing}
                  className="h-11 rounded-xl bg-[#BE123C] text-[14px] font-extrabold text-white transition hover:bg-[#9F1239] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Reject
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
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

function DetailSummaryCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border border-[#E1CFBE] bg-white px-5 py-4">
      <p className="text-[13px] text-[#6F5549]">{label}</p>
      <p className="mt-2 text-[22px] font-extrabold text-[#2B1B18]">
        {value}
      </p>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#8A5A48]">
        {label}
      </p>
      <p className="mt-1 font-extrabold text-[#2B1B18]">{value}</p>
    </div>
  );
}

function ScoreBox({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#E1CFBE] bg-white px-5 py-4">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F8DFD0] text-[#8C0F2D]">
          <GraduationCap className="h-5 w-5" />
        </div>

        <h3 className="text-[16px] font-extrabold text-[#2B1B18]">
          {title}
        </h3>
      </div>

      <div className="space-y-3">{children}</div>
    </div>
  );
}

function ScoreRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[#F0E1D4] pb-2 last:border-b-0 last:pb-0">
      <p className="text-[14px] text-[#6F5549]">{label}</p>
      <p
        className={`text-[14px] ${
          bold ? "font-extrabold text-[#2B1B18]" : "font-bold text-[#2B1B18]"
        }`}
      >
        {value}
      </p>
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
      className={`rounded-full px-3 py-1 text-[12px] font-extrabold ${className}`}
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
      className={`rounded-full px-3 py-1 text-[12px] font-extrabold ${className}`}
    >
      {safe}
    </span>
  );
}