"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BookOpen,
  CheckCircle2,
  Eye,
  FileText,
  GraduationCap,
  Search,
  Star,
  TrendingUp,
  UserRound,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import ParentLayout from "../components/ParentLayout";

type ParentRow = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
};

type StudentRow = {
  id: string;
  parent_id: string | null;
  full_name: string | null;
  grade: string | null;
  level: string | null;
  nis?: string | null;
  nisn?: string | null;
};

type TeacherRow = {
  id: string;
  full_name: string | null;
  email?: string | null;
  teacher_code?: string | null;
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

function normalizeText(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function formatNumber(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";

  return Number(value).toFixed(2).replace(".00", "");
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

function getParentName(parent?: ParentRow | null) {
  if (!parent) return "Orang Tua";
  return parent.full_name || parent.name || "Orang Tua";
}

function getReportTypeLabel(type?: string | null) {
  if (type === "mid_semester") return "Mid Semester";
  if (type === "semester") return "Semester";
  return "Bulanan";
}

function getFinalGrade(report: AcademicReportRow) {
  return report.final_grade ?? report.final_score ?? null;
}

function getPredicate(report: AcademicReportRow) {
  return report.predicate || report.description || "-";
}

export default function ParentAcademicReportsPage() {
  const [parent, setParent] = useState<ParentRow | null>(null);
  const [children, setChildren] = useState<StudentRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [reports, setReports] = useState<EnrichedReport[]>([]);

  const [loading, setLoading] = useState(true);

  const [selectedStudentId, setSelectedStudentId] = useState("Semua Anak");
  const [periodFilter, setPeriodFilter] = useState("Semua Periode");
  const [search, setSearch] = useState("");

  const [selectedReport, setSelectedReport] = useState<EnrichedReport | null>(
    null
  );

  async function getCurrentParent() {
    const { data: authData } = await supabase.auth.getUser();

    const email =
      authData.user?.email ||
      localStorage.getItem("hstkb_demo_email") ||
      localStorage.getItem("hstkb_email") ||
      "";

    if (email) {
      const { data } = await supabase
        .from("parents")
        .select("*")
        .eq("email", email)
        .limit(1)
        .maybeSingle();

      if (data) return data as ParentRow;
    }

    const { data } = await supabase
      .from("parents")
      .select("*")
      .limit(1)
      .maybeSingle();

    return data as ParentRow | null;
  }

  async function fetchData() {
    setLoading(true);

    const currentParent = await getCurrentParent();
    setParent(currentParent);

    if (!currentParent?.id) {
      setChildren([]);
      setTeachers([]);
      setSubjects([]);
      setReports([]);
      setLoading(false);
      return;
    }

    const childrenRes = await supabase
      .from("students")
      .select("*")
      .eq("parent_id", currentParent.id)
      .order("full_name");

    const childrenData = (childrenRes.data || []) as StudentRow[];
    const childIds = childrenData.map((child) => child.id);

    if (childIds.length === 0) {
      setChildren([]);
      setTeachers([]);
      setSubjects([]);
      setReports([]);
      setLoading(false);
      return;
    }

    const [teachersRes, subjectsRes, reportsRes] = await Promise.all([
      supabase.from("teachers").select("*").order("full_name"),
      supabase.from("subjects").select("*").order("name"),
      supabase
        .from("academic_reports")
        .select("*")
        .in("student_id", childIds)
        .or("approval_status.eq.approved,status.eq.published")
        .order("report_period", { ascending: false }),
    ]);

    const teachersData = (teachersRes.data || []) as TeacherRow[];
    const subjectsData = (subjectsRes.data || []) as SubjectRow[];
    const reportsData = (reportsRes.data || []) as AcademicReportRow[];

    const studentMap = new Map(childrenData.map((student) => [student.id, student]));
    const teacherMap = new Map(teachersData.map((teacher) => [teacher.id, teacher]));
    const subjectMap = new Map(subjectsData.map((subject) => [subject.id, subject]));

    const enrichedReports: EnrichedReport[] = reportsData.map((report) => {
      const student = report.student_id ? studentMap.get(report.student_id) : null;
      const teacher = report.teacher_id ? teacherMap.get(report.teacher_id) : null;
      const subject = report.subject_id ? subjectMap.get(report.subject_id) : null;

      return {
        ...report,
        student_name: student?.full_name || "-",
        student_grade: student?.grade || "-",
        student_level: student?.level || "-",
        teacher_name: teacher?.full_name || "-",
        subject_name: subject?.name || "-",
      };
    });

    setChildren(childrenData);
    setTeachers(teachersData);
    setSubjects(subjectsData);
    setReports(enrichedReports);

    if (selectedStudentId === "Semua Anak" && childrenData.length === 1) {
      setSelectedStudentId(childrenData[0].id);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("parent-laporan-akademik-approved-realtime")
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
      const matchStudent =
        selectedStudentId === "Semua Anak" ||
        report.student_id === selectedStudentId;

      const matchPeriod =
        periodFilter === "Semua Periode" || report.report_period === periodFilter;

      const matchSearch =
        !q ||
        normalizeText(report.student_name).includes(q) ||
        normalizeText(report.teacher_name).includes(q) ||
        normalizeText(report.subject_name).includes(q) ||
        normalizeText(report.report_period).includes(q) ||
        normalizeText(report.teacher_comment).includes(q);

      return matchStudent && matchPeriod && matchSearch;
    });
  }, [reports, selectedStudentId, periodFilter, search]);

  const selectedStudent = useMemo(() => {
    if (selectedStudentId === "Semua Anak") return null;
    return children.find((child) => child.id === selectedStudentId) || null;
  }, [children, selectedStudentId]);

  const summary = useMemo(() => {
    const totalReports = filteredReports.length;

    const finalGrades = filteredReports
      .map((report) => getFinalGrade(report))
      .filter((value): value is number => value !== null && value !== undefined);

    const averageGrade =
      finalGrades.length > 0
        ? finalGrades.reduce((sum, value) => sum + value, 0) / finalGrades.length
        : null;

    const highestGrade =
      finalGrades.length > 0 ? Math.max(...finalGrades) : null;

    const totalSubjects = new Set(filteredReports.map((report) => report.subject_id))
      .size;

    const veryGood = filteredReports.filter(
      (report) => getPredicate(report) === "Sangat Baik"
    ).length;

    return {
      totalReports,
      averageGrade,
      highestGrade,
      totalSubjects,
      veryGood,
    };
  }, [filteredReports]);

  return (
    <ParentLayout
      activeMenu="Laporan Akademik"
      searchPlaceholder="Cari laporan akademik..."
    >
      <section className="space-y-7">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#8A5A48]">
              Parent Portal
            </p>

            <h1 className="mt-2 text-[30px] font-extrabold tracking-[-0.02em] text-[#2B1B18]">
              Laporan Akademik
            </h1>

            <p className="mt-2 max-w-[850px] text-[15px] leading-6 text-[#6F5549]">
              Lihat laporan akademik anak yang sudah disetujui oleh Kepala
              Sekolah. Laporan draft, pending, atau rejected tidak ditampilkan.
            </p>
          </div>

          <div className="rounded-2xl border border-[#E1CFBE] bg-white px-5 py-3 text-[14px] font-bold text-[#6F5549] shadow-sm">
            Parent:{" "}
            <span className="font-extrabold text-[#2B1B18]">
              {getParentName(parent)}
            </span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={<FileText className="h-5 w-5" />}
            label="Total Laporan Approved"
            value={summary.totalReports}
            info="Published"
            tone="pink"
          />

          <SummaryCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Rata-rata Nilai"
            value={formatNumber(summary.averageGrade)}
            info="Average"
            tone="green"
          />

          <SummaryCard
            icon={<Star className="h-5 w-5" />}
            label="Nilai Tertinggi"
            value={formatNumber(summary.highestGrade)}
            info={`${summary.veryGood} Sangat Baik`}
            tone="orange"
          />

          <SummaryCard
            icon={<BookOpen className="h-5 w-5" />}
            label="Mata Pelajaran"
            value={summary.totalSubjects}
            info="Mapel"
            tone="blue"
          />
        </div>

        <div className="rounded-[22px] border border-[#E1CFBE] bg-white p-5 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr_1fr]">
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
              value={selectedStudentId}
              onChange={(event) => setSelectedStudentId(event.target.value)}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              <option value="Semua Anak">Semua Anak</option>
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.full_name}
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
          </div>
        </div>

        {selectedStudent ? (
          <div className="rounded-[22px] border border-[#E1CFBE] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F8DFD0] text-[16px] font-extrabold text-[#8C0F2D]">
                {getInitials(selectedStudent.full_name)}
              </div>

              <div>
                <p className="text-[18px] font-extrabold text-[#2B1B18]">
                  {selectedStudent.full_name}
                </p>
                <p className="mt-1 text-[14px] text-[#6F5549]">
                  {selectedStudent.level || "-"} — {selectedStudent.grade || "-"}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-[22px] border border-[#E1CFBE] bg-white shadow-sm">
          <div className="border-b border-[#EADACA] px-6 py-5">
            <h2 className="text-[20px] font-extrabold text-[#2B1B18]">
              Daftar Laporan Akademik Approved
            </h2>

            <p className="mt-1 text-[14px] text-[#6F5549]">
              Data di bawah ini hanya laporan yang sudah disetujui Kepala
              Sekolah.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] border-collapse">
              <thead>
                <tr className="border-b border-[#EADACA] bg-[#FFF8EF] text-left text-[13px] font-extrabold text-[#6F5549]">
                  <th className="px-6 py-4">Siswa</th>
                  <th className="px-6 py-4">Mapel</th>
                  <th className="px-6 py-4">Guru</th>
                  <th className="px-6 py-4">Periode</th>
                  <th className="px-6 py-4">UH</th>
                  <th className="px-6 py-4">Tugas</th>
                  <th className="px-6 py-4">UTS</th>
                  <th className="px-6 py-4">UAS</th>
                  <th className="px-6 py-4">Nilai Akhir</th>
                  <th className="px-6 py-4">Predikat</th>
                  <th className="px-6 py-4">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-6 py-12 text-center text-[#6F5549]"
                    >
                      Memuat laporan akademik...
                    </td>
                  </tr>
                ) : filteredReports.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-6 py-12 text-center text-[#6F5549]"
                    >
                      Belum ada laporan akademik yang sudah disetujui.
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((report) => (
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

                      <td className="px-6 py-4">{report.subject_name}</td>

                      <td className="px-6 py-4">{report.teacher_name}</td>

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
                        {formatNumber(getFinalGrade(report))}
                      </td>

                      <td className="px-6 py-4">
                        <PredicateBadge predicate={getPredicate(report)} />
                      </td>

                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => setSelectedReport(report)}
                          className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#DCC8B6] px-3 text-[13px] font-extrabold text-[#8C0F2D] transition hover:bg-[#FFF8EF]"
                        >
                          <Eye className="h-4 w-4" />
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))
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
        />
      ) : null}
    </ParentLayout>
  );
}

function ReportDetailModal({
  report,
  onClose,
}: {
  report: EnrichedReport;
  onClose: () => void;
}) {
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
              icon={<GraduationCap className="h-5 w-5" />}
              label="Nilai Akhir"
              value={formatNumber(getFinalGrade(report))}
            />
            <DetailSummaryCard
              icon={<Star className="h-5 w-5" />}
              label="Predikat"
              value={getPredicate(report)}
            />
            <DetailSummaryCard
              icon={<CheckCircle2 className="h-5 w-5" />}
              label="Status"
              value="Approved"
            />
            <DetailSummaryCard
              icon={<FileText className="h-5 w-5" />}
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
                label="Approved At"
                value={formatDateTime(report.approved_at)}
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
              value={formatNumber(getFinalGrade(report))}
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

          <button
            type="button"
            onClick={onClose}
            className="h-11 w-full rounded-xl bg-[#8C0F2D] text-[14px] font-extrabold text-white transition hover:bg-[#54131D]"
          >
            Tutup Detail
          </button>
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
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border border-[#E1CFBE] bg-white px-5 py-4">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#F8DFD0] text-[#8C0F2D]">
        {icon}
      </div>
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