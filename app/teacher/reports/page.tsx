"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Edit3,
  FileText,
  GraduationCap,
  Search,
  Send,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import TeacherLayout from "../components/TeacherLayout";

type TeacherRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  teacher_code?: string | null;
  subjects?: string[] | string | null;
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
  subject_name: string;
};

type ReportForm = {
  id: string;
  student_id: string;
  subject_id: string;
  report_period: string;
  report_type: string;

  uh_1: string;
  uh_2: string;
  uh_3: string;
  uh_4: string;

  task_1: string;
  task_2: string;
  task_3: string;
  task_4: string;
  task_5: string;

  mid_score: string;
  final_exam_score: string;
  process_score: string;

  teacher_comment: string;
};

const reportTypeOptions = [
  { value: "monthly", label: "Bulanan" },
  { value: "mid_semester", label: "Mid Semester" },
  { value: "semester", label: "Semester" },
];

const statusOptions = ["Semua Status", "draft", "pending", "approved", "rejected"];

function currentPeriod() {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function emptyForm(): ReportForm {
  return {
    id: "",
    student_id: "",
    subject_id: "",
    report_period: currentPeriod(),
    report_type: "monthly",

    uh_1: "",
    uh_2: "",
    uh_3: "",
    uh_4: "",

    task_1: "",
    task_2: "",
    task_3: "",
    task_4: "",
    task_5: "",

    mid_score: "",
    final_exam_score: "",
    process_score: "",

    teacher_comment: "",
  };
}

function normalizeText(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function formatTeacherSubject(subjects: TeacherRow["subjects"]) {
  if (!subjects) return "Guru";

  if (Array.isArray(subjects)) {
    return `Guru — ${subjects.slice(0, 4).join(", ")}`;
  }

  return `Guru — ${subjects}`;
}

function formatNumber(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";

  return Number(value).toFixed(2).replace(".00", "");
}

function toNumber(value: string) {
  if (value === "" || value === null || value === undefined) return null;

  const numeric = Number(value);

  if (Number.isNaN(numeric)) return null;

  return numeric;
}

function average(values: Array<number | null>) {
  const validValues = values.filter(
    (value): value is number => value !== null && value !== undefined
  );

  if (validValues.length === 0) return null;

  const total = validValues.reduce((sum, value) => sum + value, 0);

  return Number((total / validValues.length).toFixed(2));
}

function getPredicate(finalGrade: number | null) {
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

function calculateFromForm(form: ReportForm) {
  const uh1 = toNumber(form.uh_1);
  const uh2 = toNumber(form.uh_2);
  const uh3 = toNumber(form.uh_3);
  const uh4 = toNumber(form.uh_4);

  const task1 = toNumber(form.task_1);
  const task2 = toNumber(form.task_2);
  const task3 = toNumber(form.task_3);
  const task4 = toNumber(form.task_4);
  const task5 = toNumber(form.task_5);

  const midScore = toNumber(form.mid_score);
  const finalExamScore = toNumber(form.final_exam_score);
  const processScore = toNumber(form.process_score);

  const averageUh = average([uh1, uh2, uh3, uh4]);
  const averageTask = average([task1, task2, task3, task4, task5]);

  const finalGrade = average([
    averageUh,
    averageTask,
    midScore,
    finalExamScore,
    processScore,
  ]);

  const predicate = getPredicate(finalGrade);

  return {
    uh1,
    uh2,
    uh3,
    uh4,
    task1,
    task2,
    task3,
    task4,
    task5,
    midScore,
    finalExamScore,
    processScore,
    averageUh,
    averageTask,
    finalGrade,
    predicate,
  };
}

function getStatusLabel(status?: string | null) {
  if (status === "approved") return "Approved";
  if (status === "pending") return "Pending Approval";
  if (status === "rejected") return "Rejected";
  return "Draft";
}

export default function TeacherAcademicReportsPage() {
  const [teacher, setTeacher] = useState<TeacherRow | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [reports, setReports] = useState<EnrichedReport[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<ReportForm>(emptyForm());

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [periodFilter, setPeriodFilter] = useState("Semua Periode");

  async function getCurrentTeacher() {
    const { data: authData } = await supabase.auth.getUser();

    const email =
      authData.user?.email ||
      localStorage.getItem("hstkb_demo_email") ||
      localStorage.getItem("hstkb_email") ||
      "";

    if (email) {
      const { data } = await supabase
        .from("teachers")
        .select("*")
        .eq("email", email)
        .limit(1)
        .maybeSingle();

      if (data) return data as TeacherRow;
    }

    const { data } = await supabase
      .from("teachers")
      .select("*")
      .order("teacher_code", { ascending: true })
      .limit(1)
      .maybeSingle();

    return data as TeacherRow | null;
  }

  async function fetchData() {
    setLoading(true);

    const currentTeacher = await getCurrentTeacher();
    setTeacher(currentTeacher);

    if (!currentTeacher?.id) {
      setStudents([]);
      setSubjects([]);
      setReports([]);
      setLoading(false);
      return;
    }

    const [studentsRes, subjectsRes, reportsRes] = await Promise.all([
      supabase.from("students").select("*").order("full_name"),
      supabase.from("subjects").select("*").order("name"),
      supabase
        .from("academic_reports")
        .select("*")
        .eq("teacher_id", currentTeacher.id)
        .order("report_period", { ascending: false }),
    ]);

    const studentsData = (studentsRes.data || []) as StudentRow[];
    const subjectsData = (subjectsRes.data || []) as SubjectRow[];
    const reportsData = (reportsRes.data || []) as AcademicReportRow[];

    const studentMap = new Map(studentsData.map((student) => [student.id, student]));
    const subjectMap = new Map(subjectsData.map((subject) => [subject.id, subject]));

    const enrichedReports: EnrichedReport[] = reportsData.map((report) => {
      const student = report.student_id ? studentMap.get(report.student_id) : null;
      const subject = report.subject_id ? subjectMap.get(report.subject_id) : null;

      return {
        ...report,
        student_name: student?.full_name || "-",
        student_grade: student?.grade || "-",
        student_level: student?.level || "-",
        subject_name: subject?.name || "-",
      };
    });

    setStudents(studentsData);
    setSubjects(subjectsData);
    setReports(enrichedReports);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("teacher-academic-reports-realtime")
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
        { event: "*", schema: "public", table: "subjects" },
        fetchData
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const calculated = useMemo(() => calculateFromForm(form), [form]);

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
        normalizeText(report.student_name).includes(q) ||
        normalizeText(report.subject_name).includes(q) ||
        normalizeText(report.report_period).includes(q) ||
        normalizeText(report.teacher_comment).includes(q);

      const matchStatus =
        statusFilter === "Semua Status" || approvalStatus === statusFilter;

      const matchPeriod =
        periodFilter === "Semua Periode" || report.report_period === periodFilter;

      return matchSearch && matchStatus && matchPeriod;
    });
  }, [reports, search, statusFilter, periodFilter]);

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

  function openCreateModal() {
    setForm(emptyForm());
    setShowModal(true);
  }

  function openEditModal(report: EnrichedReport) {
    setForm({
      id: report.id,
      student_id: report.student_id || "",
      subject_id: report.subject_id || "",
      report_period: report.report_period || currentPeriod(),
      report_type: report.report_type || "monthly",

      uh_1: report.uh_1?.toString() || report.uh_score?.toString() || "",
      uh_2: report.uh_2?.toString() || "",
      uh_3: report.uh_3?.toString() || "",
      uh_4: report.uh_4?.toString() || "",

      task_1: report.task_1?.toString() || report.task_score?.toString() || "",
      task_2: report.task_2?.toString() || "",
      task_3: report.task_3?.toString() || "",
      task_4: report.task_4?.toString() || "",
      task_5: report.task_5?.toString() || "",

      mid_score: report.mid_score?.toString() || report.uts_score?.toString() || "",
      final_exam_score:
        report.final_exam_score?.toString() || report.uas_score?.toString() || "",
      process_score: report.process_score?.toString() || "",

      teacher_comment: report.teacher_comment || "",
    });

    setShowModal(true);
  }

  function updateForm(field: keyof ReportForm, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function validateForm() {
    if (!teacher?.id) {
      alert("Data guru tidak ditemukan.");
      return false;
    }

    if (!form.student_id) {
      alert("Pilih siswa terlebih dahulu.");
      return false;
    }

    if (!form.subject_id) {
      alert("Pilih mata pelajaran terlebih dahulu.");
      return false;
    }

    if (!form.report_period.trim()) {
      alert("Isi periode laporan terlebih dahulu.");
      return false;
    }

    if (!calculated.finalGrade) {
      alert("Isi minimal salah satu nilai agar nilai akhir bisa dihitung.");
      return false;
    }

    return true;
  }

  function buildPayload(nextStatus: "draft" | "pending") {
    const now = new Date().toISOString();

    return {
      student_id: form.student_id,
      teacher_id: teacher?.id,
      subject_id: form.subject_id,
      report_period: form.report_period.trim(),
      report_type: form.report_type,

      uh_1: calculated.uh1,
      uh_2: calculated.uh2,
      uh_3: calculated.uh3,
      uh_4: calculated.uh4,

      task_1: calculated.task1,
      task_2: calculated.task2,
      task_3: calculated.task3,
      task_4: calculated.task4,
      task_5: calculated.task5,

      mid_score: calculated.midScore,
      final_exam_score: calculated.finalExamScore,

      average_uh: calculated.averageUh,
      average_task: calculated.averageTask,
      process_score: calculated.processScore,
      final_grade: calculated.finalGrade,
      predicate: calculated.predicate,

      teacher_comment: form.teacher_comment.trim() || null,

      approval_status: nextStatus,
      submitted_at: nextStatus === "pending" ? now : null,
      updated_at: now,

      // Kolom lama tetap diisi supaya halaman lama tidak rusak
      uh_score: calculated.averageUh,
      task_score: calculated.averageTask,
      uts_score: calculated.midScore,
      uas_score: calculated.finalExamScore,
      final_score: calculated.finalGrade,
      description: calculated.predicate,
      status: nextStatus,
    };
  }

  async function handleSaveDraft() {
    if (!validateForm()) return;

    setSaving(true);

    const payload = buildPayload("draft");

    if (form.id) {
      const { error } = await supabase
        .from("academic_reports")
        .update(payload)
        .eq("id", form.id);

      if (error) {
        setSaving(false);
        alert(`Gagal update draft: ${error.message}`);
        return;
      }
    } else {
      const { error } = await supabase.from("academic_reports").insert(payload);

      if (error) {
        setSaving(false);
        alert(`Gagal menyimpan draft: ${error.message}`);
        return;
      }
    }

    await fetchData();

    setSaving(false);
    setShowModal(false);
    setForm(emptyForm());
  }

  async function handleSubmitApproval() {
    if (!validateForm()) return;

    const confirmSubmit = confirm(
      "Submit laporan ini ke Kepala Sekolah untuk approval?"
    );

    if (!confirmSubmit) return;

    setSaving(true);

    const payload = buildPayload("pending");

    if (form.id) {
      const { error } = await supabase
        .from("academic_reports")
        .update(payload)
        .eq("id", form.id);

      if (error) {
        setSaving(false);
        alert(`Gagal submit approval: ${error.message}`);
        return;
      }
    } else {
      const { error } = await supabase.from("academic_reports").insert(payload);

      if (error) {
        setSaving(false);
        alert(`Gagal submit approval: ${error.message}`);
        return;
      }
    }

    await fetchData();

    setSaving(false);
    setShowModal(false);
    setForm(emptyForm());
  }

  async function quickSubmitReport(report: EnrichedReport) {
    const confirmSubmit = confirm(
      `Submit laporan ${report.student_name} - ${report.subject_name} ke approval?`
    );

    if (!confirmSubmit) return;

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("academic_reports")
      .update({
        approval_status: "pending",
        status: "pending",
        submitted_at: now,
        updated_at: now,
      })
      .eq("id", report.id);

    if (error) {
      alert(`Gagal submit laporan: ${error.message}`);
      return;
    }

    await fetchData();
  }

  return (
    <TeacherLayout
      activeMenu="Laporan Akademik"
      teacherName={teacher?.full_name || "Guru"}
      teacherSubject={formatTeacherSubject(teacher?.subjects)}
      searchPlaceholder="Cari laporan akademik..."
    >
      <section className="space-y-7">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#8A5A48]">
              Teacher Portal
            </p>

            <h1 className="mt-2 text-[30px] font-extrabold tracking-[-0.02em] text-[#2B1B18]">
              Laporan Akademik
            </h1>

            <p className="mt-2 max-w-[850px] text-[15px] leading-6 text-[#6F5549]">
              Input nilai siswa berdasarkan UH, tugas, UTS, UAS, dan proses KBM.
              Nilai akhir dan predikat akan dihitung otomatis.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex h-11 w-fit items-center gap-2 rounded-xl bg-[#8C0F2D] px-5 text-[14px] font-extrabold text-white shadow-sm transition hover:bg-[#54131D]"
          >
            + Input Nilai
          </button>
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
            icon={<ClipboardList className="h-5 w-5" />}
            label="Draft"
            value={summary.draft}
            info="Belum submit"
            tone="orange"
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
        </div>

        <div className="rounded-[22px] border border-[#E1CFBE] bg-white p-5 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-[1.7fr_1fr_1fr]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8E6A58]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari siswa, mapel, periode, atau catatan..."
                className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] pl-11 pr-4 text-[14px] outline-none placeholder:text-[#9A7B6C] focus:border-[#9C0824]"
              />
            </div>

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
              Draft bisa diedit. Setelah submit, laporan masuk ke approval Kepala
              Sekolah.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px] border-collapse">
              <thead>
                <tr className="border-b border-[#EADACA] bg-[#FFF8EF] text-left text-[13px] font-extrabold text-[#6F5549]">
                  <th className="px-6 py-4">Siswa</th>
                  <th className="px-6 py-4">Mapel</th>
                  <th className="px-6 py-4">Periode</th>
                  <th className="px-6 py-4">UH</th>
                  <th className="px-6 py-4">Tugas</th>
                  <th className="px-6 py-4">UTS</th>
                  <th className="px-6 py-4">UAS</th>
                  <th className="px-6 py-4">Proses</th>
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

                        <td className="px-6 py-4">
                          <p className="font-bold">{report.report_period || "-"}</p>
                          <p className="mt-1 text-[12px] text-[#6F5549]">
                            {report.report_type || "monthly"}
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

                        <td className="px-6 py-4">
                          {formatNumber(report.process_score)}
                        </td>

                        <td className="px-6 py-4">
                          <span className="font-extrabold">
                            {formatNumber(report.final_grade || report.final_score)}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <PredicateBadge
                            predicate={report.predicate || report.description}
                          />
                        </td>

                        <td className="px-6 py-4">
                          <StatusBadge status={approvalStatus} />
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(report)}
                              disabled={approvalStatus === "approved"}
                              className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#DCC8B6] px-3 text-[13px] font-extrabold text-[#8C0F2D] transition hover:bg-[#FFF8EF] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Edit3 className="h-4 w-4" />
                              Edit
                            </button>

                            {approvalStatus === "draft" ? (
                              <button
                                type="button"
                                onClick={() => quickSubmitReport(report)}
                                className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#8C0F2D] px-3 text-[13px] font-extrabold text-white transition hover:bg-[#54131D]"
                              >
                                <Send className="h-4 w-4" />
                                Submit
                              </button>
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

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-8">
          <div className="max-h-[92vh] w-full max-w-[980px] overflow-y-auto rounded-[22px] bg-[#FFF8EF] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E1CFBE] bg-[#FFF8EF] px-6 py-5">
              <div>
                <h2 className="text-[22px] font-extrabold text-[#2B1B18]">
                  {form.id ? "Edit Laporan Akademik" : "Input Laporan Akademik"}
                </h2>

                <p className="mt-1 text-[14px] text-[#6F5549]">
                  Nilai akhir dan predikat dihitung otomatis.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-full p-2 text-[#6F5549] transition hover:bg-[#F4E5DA]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="grid gap-4 md:grid-cols-2">
                <FormGroup label="Siswa">
                  <select
                    value={form.student_id}
                    onChange={(event) => updateForm("student_id", event.target.value)}
                    className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                  >
                    <option value="">Pilih siswa</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.full_name} — {student.level} {student.grade}
                      </option>
                    ))}
                  </select>
                </FormGroup>

                <FormGroup label="Mata Pelajaran">
                  <select
                    value={form.subject_id}
                    onChange={(event) => updateForm("subject_id", event.target.value)}
                    className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                  >
                    <option value="">Pilih mata pelajaran</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name} {subject.grade ? `— ${subject.grade}` : ""}
                      </option>
                    ))}
                  </select>
                </FormGroup>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormGroup label="Periode Laporan">
                  <input
                    value={form.report_period}
                    onChange={(event) =>
                      updateForm("report_period", event.target.value)
                    }
                    placeholder="Contoh: Juli 2026"
                    className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                  />
                </FormGroup>

                <FormGroup label="Jenis Laporan">
                  <select
                    value={form.report_type}
                    onChange={(event) => updateForm("report_type", event.target.value)}
                    className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                  >
                    {reportTypeOptions.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </FormGroup>
              </div>

              <ScoreSection title="Nilai UH" icon={<BookOpen className="h-5 w-5" />}>
                <ScoreInput label="UH 1" value={form.uh_1} onChange={(value) => updateForm("uh_1", value)} />
                <ScoreInput label="UH 2" value={form.uh_2} onChange={(value) => updateForm("uh_2", value)} />
                <ScoreInput label="UH 3" value={form.uh_3} onChange={(value) => updateForm("uh_3", value)} />
                <ScoreInput label="UH 4" value={form.uh_4} onChange={(value) => updateForm("uh_4", value)} />
              </ScoreSection>

              <ScoreSection
                title="Nilai Tugas"
                icon={<ClipboardList className="h-5 w-5" />}
              >
                <ScoreInput label="Tugas 1" value={form.task_1} onChange={(value) => updateForm("task_1", value)} />
                <ScoreInput label="Tugas 2" value={form.task_2} onChange={(value) => updateForm("task_2", value)} />
                <ScoreInput label="Tugas 3" value={form.task_3} onChange={(value) => updateForm("task_3", value)} />
                <ScoreInput label="Tugas 4" value={form.task_4} onChange={(value) => updateForm("task_4", value)} />
                <ScoreInput label="Tugas 5" value={form.task_5} onChange={(value) => updateForm("task_5", value)} />
              </ScoreSection>

              <ScoreSection
                title="Nilai Ujian dan Proses KBM"
                icon={<GraduationCap className="h-5 w-5" />}
              >
                <ScoreInput label="UTS" value={form.mid_score} onChange={(value) => updateForm("mid_score", value)} />
                <ScoreInput label="UAS" value={form.final_exam_score} onChange={(value) => updateForm("final_exam_score", value)} />
                <ScoreInput label="Proses KBM" value={form.process_score} onChange={(value) => updateForm("process_score", value)} />
              </ScoreSection>

              <div className="grid gap-4 md:grid-cols-4">
                <ResultCard label="Rata-rata UH" value={formatNumber(calculated.averageUh)} />
                <ResultCard
                  label="Rata-rata Tugas"
                  value={formatNumber(calculated.averageTask)}
                />
                <ResultCard
                  label="Nilai Akhir"
                  value={formatNumber(calculated.finalGrade)}
                />
                <ResultCard label="Predikat" value={calculated.predicate} />
              </div>

              <FormGroup label="Catatan Guru">
                <textarea
                  value={form.teacher_comment}
                  onChange={(event) =>
                    updateForm("teacher_comment", event.target.value)
                  }
                  rows={4}
                  placeholder="Contoh: Siswa menunjukkan peningkatan dalam pemahaman materi."
                  className="w-full resize-none rounded-xl border border-[#DCC8B6] bg-white px-4 py-3 text-[14px] outline-none focus:border-[#9C0824]"
                />
              </FormGroup>

              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="h-12 rounded-xl border border-[#DCC8B6] bg-white text-[15px] font-extrabold text-[#8C0F2D] transition hover:bg-[#FFF8EF] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Menyimpan..." : "Simpan Draft"}
                </button>

                <button
                  type="button"
                  onClick={handleSubmitApproval}
                  disabled={saving}
                  className="h-12 rounded-xl bg-[#8C0F2D] text-[15px] font-extrabold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Mengirim..." : "Submit Approval"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </TeacherLayout>
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

        <span className="text-[13px] font-extrabold text-[#009B68]">{info}</span>
      </div>

      <p className="text-[26px] font-extrabold leading-none text-[#2B1B18]">
        {value}
      </p>
      <p className="mt-2 text-[13px] text-[#6B4A3A]">{label}</p>
    </div>
  );
}

function FormGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <p className="mb-2 text-[14px] font-extrabold text-[#2B1B18]">{label}</p>
      {children}
    </label>
  );
}

function ScoreSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#E1CFBE] bg-white p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F8DFD0] text-[#8C0F2D]">
          {icon}
        </div>

        <h3 className="text-[16px] font-extrabold text-[#2B1B18]">{title}</h3>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">{children}</div>
    </div>
  );
}

function ScoreInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <p className="mb-2 text-[13px] font-bold text-[#6F5549]">{label}</p>
      <input
        type="number"
        min="0"
        max="100"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] font-bold text-[#2B1B18] outline-none focus:border-[#9C0824]"
      />
    </label>
  );
}

function ResultCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#E1CFBE] bg-white px-5 py-4">
      <p className="text-[13px] text-[#6F5549]">{label}</p>
      <p className="mt-2 text-[22px] font-extrabold text-[#2B1B18]">{value}</p>
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
    <span className={`rounded-full px-3 py-1 text-[12px] font-extrabold ${className}`}>
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
    <span className={`rounded-full px-3 py-1 text-[12px] font-extrabold ${className}`}>
      {safe}
    </span>
  );
}