"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Download,
  Edit3,
  FileText,
  GraduationCap,
  Search,
  Send,
  UploadCloud,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import TeacherLayout from "../components/TeacherLayout";

const ACADEMIC_REPORT_BUCKET = "academic-report-documents";

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
  report_file_url: string;
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
    report_file_url: "",
  };
}

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

function normalizeSubjects(subjects: TeacherRow["subjects"]) {
  if (!subjects) return [];

  if (Array.isArray(subjects)) {
    return subjects.map((subject) => normalizeText(subject)).filter(Boolean);
  }

  return subjects
    .split(",")
    .map((subject) => normalizeText(subject))
    .filter(Boolean);
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

function getGradeNumber(value?: string | null) {
  const match = (value || "").match(/\d+/);
  return match ? Number(match[0]) : null;
}

function isAllGrade(value?: string | null) {
  const safe = normalizeText(value);

  return (
    !safe ||
    safe === "all" ||
    safe === "all grade" ||
    safe === "semua" ||
    safe === "semua kelas"
  );
}

function isMathSubject(subject?: SubjectRow | null) {
  return normalizeText(subject?.name).includes("math");
}

function getSubjectLabel(subject: SubjectRow) {
  const level = subject.level ? normalizeLevel(subject.level) : "";
  const grade = subject.grade || "All Grade";

  if (subject.grade || subject.level) {
    return `${subject.name || "-"} — ${level || "-"} ${grade}`;
  }

  return subject.name || "-";
}

function getReportTypeLabel(type?: string | null) {
  if (type === "mid_semester") return "Mid Semester";
  if (type === "semester") return "Semester";

  return "Bulanan";
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
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function canEditReport(status?: string | null) {
  const safe = status || "draft";
  return safe === "draft" || safe === "rejected";
}

function cleanFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");
}

function isAllowedReportFile(file: File) {
  const allowedExtensions = [
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".jpg",
    ".jpeg",
    ".png",
  ];
  const lowerName = file.name.toLowerCase();

  return allowedExtensions.some((extension) => lowerName.endsWith(extension));
}

async function uploadAcademicReportFile(file: File, teacherId: string) {
  const safeFileName = cleanFileName(file.name);
  const filePath = `${teacherId}/${Date.now()}-${safeFileName}`;

  const { error } = await supabase.storage
    .from(ACADEMIC_REPORT_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage
    .from(ACADEMIC_REPORT_BUCKET)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

export default function TeacherAcademicReportsPage() {
  const [teacher, setTeacher] = useState<TeacherRow | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [reports, setReports] = useState<EnrichedReport[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<ReportForm>(emptyForm());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [periodFilter, setPeriodFilter] = useState("Semua Periode");

  async function getCurrentTeacher() {
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError) {
      throw new Error(authError.message);
    }

    const email = (
      authData.user?.email ||
      localStorage.getItem("hstkb_demo_email") ||
      localStorage.getItem("hstkb_email") ||
      ""
    )
      .trim()
      .toLowerCase();

    const teacherCode =
      localStorage.getItem("hstkb_teacher_code") ||
      localStorage.getItem("teacher_code") ||
      "";

    if (email) {
      const { data, error } = await supabase
        .from("teachers")
        .select("*")
        .ilike("email", email)
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (data) return data as TeacherRow;
    }

    if (teacherCode) {
      const { data, error } = await supabase
        .from("teachers")
        .select("*")
        .eq("teacher_code", teacherCode)
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (data) return data as TeacherRow;
    }

    return null;
  }

  async function fetchData() {
    setLoading(true);
    setErrorMessage("");

    try {
      const currentTeacher = await getCurrentTeacher();

      setTeacher(currentTeacher);

      if (!currentTeacher?.id) {
        setStudents([]);
        setSubjects([]);
        setReports([]);
        setErrorMessage(
          "Data guru belum terhubung dengan akun login ini. Hubungkan email guru di tabel teachers atau isi teacher_code."
        );
        return;
      }

      const [studentsRes, subjectsRes, reportsRes] = await Promise.all([
        supabase.from("students").select("*").order("full_name"),
        supabase.from("subjects").select("*").order("name"),
        supabase
          .from("academic_reports")
          .select("*")
          .eq("teacher_id", currentTeacher.id)
          .order("updated_at", { ascending: false }),
      ]);

      if (studentsRes.error) throw new Error(studentsRes.error.message);
      if (subjectsRes.error) throw new Error(subjectsRes.error.message);
      if (reportsRes.error) throw new Error(reportsRes.error.message);

      const studentsData = (studentsRes.data || []) as StudentRow[];
      const subjectsData = (subjectsRes.data || []) as SubjectRow[];
      const reportsData = (reportsRes.data || []) as AcademicReportRow[];

      const studentMap = new Map(
        studentsData.map((student) => [student.id, student])
      );

      const subjectMap = new Map(
        subjectsData.map((subject) => [subject.id, subject])
      );

      const enrichedReports: EnrichedReport[] = reportsData.map((report) => {
        const student = report.student_id ? studentMap.get(report.student_id) : null;
        const subject = report.subject_id ? subjectMap.get(report.subject_id) : null;

        return {
          ...report,
          student_name: student?.full_name || "-",
          student_grade: student?.grade || "-",
          student_level: student?.level || "-",
          student_nipd: student?.nis || "-",
          student_nisn: student?.nisn || "-",
          subject_name: subject ? getSubjectLabel(subject) : "-",
        };
      });

      setStudents(studentsData);
      setSubjects(subjectsData);
      setReports(enrichedReports);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengambil data laporan akademik.");
      }

      setTeacher(null);
      setStudents([]);
      setSubjects([]);
      setReports([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("teacher-academic-reports-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "academic_reports" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teachers" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subjects" },
        () => fetchData()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const calculated = useMemo(() => calculateFromForm(form), [form]);

  const periodOptions = useMemo(() => {
    const uniquePeriods = Array.from(
      new Set(reports.map((report) => report.report_period).filter(Boolean))
    ) as string[];

    return ["Semua Periode", ...uniquePeriods];
  }, [reports]);

  const selectedStudent = useMemo(() => {
    return students.find((student) => student.id === form.student_id) || null;
  }, [students, form.student_id]);

  const teacherSubjectNames = useMemo(() => {
    return normalizeSubjects(teacher?.subjects);
  }, [teacher]);

  const subjectOptionsForForm = useMemo(() => {
    return subjects.filter((subject) => {
      const subjectName = normalizeText(subject.name);

      if (isMathSubject(subject) && isAllGrade(subject.grade)) {
        return false;
      }

      const matchTeacherSubject =
        teacherSubjectNames.length === 0 ||
        teacherSubjectNames.some((teacherSubject) => {
          return (
            teacherSubject === subjectName ||
            teacherSubject.includes(subjectName) ||
            subjectName.includes(teacherSubject)
          );
        });

      if (!matchTeacherSubject) return false;

      const selectedGradeNumber = getGradeNumber(selectedStudent?.grade);
      const subjectGradeNumber = getGradeNumber(subject.grade);

      if (!selectedGradeNumber) return true;
      if (!subjectGradeNumber) return true;

      return selectedGradeNumber === subjectGradeNumber;
    });
  }, [subjects, teacherSubjectNames, selectedStudent]);

  useEffect(() => {
    if (!form.subject_id) return;

    const stillAllowed = subjectOptionsForForm.some(
      (subject) => subject.id === form.subject_id
    );

    if (!stillAllowed) {
      setForm((prev) => ({
        ...prev,
        subject_id: "",
      }));
    }
  }, [form.subject_id, subjectOptionsForForm]);

  const filteredReports = useMemo(() => {
    const q = normalizeText(search);

    return reports.filter((report) => {
      const approvalStatus = report.approval_status || report.status || "draft";

      const matchSearch =
        !q ||
        normalizeText(report.student_name).includes(q) ||
        normalizeText(report.student_nipd).includes(q) ||
        normalizeText(report.student_nisn).includes(q) ||
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
    setSelectedFile(null);
    setErrorMessage("");
    setShowModal(true);
  }

  function openEditModal(report: EnrichedReport) {
    const approvalStatus = report.approval_status || report.status || "draft";

    if (!canEditReport(approvalStatus)) {
      alert("Laporan yang sudah pending/approved tidak bisa diedit oleh guru.");
      return;
    }

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
      report_file_url: report.report_file_url || "",
    });

    setSelectedFile(null);
    setErrorMessage("");
    setShowModal(true);
  }

  function updateForm(field: keyof ReportForm, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function hasUploadedFile() {
    return Boolean(selectedFile || form.report_file_url);
  }

  function validateForm() {
    setErrorMessage("");

    if (!teacher?.id) {
      setErrorMessage("Data guru tidak ditemukan.");
      return false;
    }

    if (!form.student_id) {
      setErrorMessage("Pilih siswa terlebih dahulu.");
      return false;
    }

    if (!form.subject_id) {
      setErrorMessage("Pilih mata pelajaran terlebih dahulu.");
      return false;
    }

    if (!form.report_period.trim()) {
      setErrorMessage("Isi periode laporan terlebih dahulu.");
      return false;
    }

    if (!calculated.finalGrade && !hasUploadedFile()) {
      setErrorMessage(
        "Isi minimal salah satu nilai atau upload file laporan akademik/raport."
      );
      return false;
    }

    if (selectedFile && !isAllowedReportFile(selectedFile)) {
      setErrorMessage("File harus PDF, Word, Excel, JPG, JPEG, atau PNG.");
      return false;
    }

    if (selectedFile && selectedFile.size > 10 * 1024 * 1024) {
      setErrorMessage("Ukuran file maksimal 10MB.");
      return false;
    }

    return true;
  }

  async function buildPayload(nextStatus: "draft" | "pending") {
    const now = new Date().toISOString();

    let reportFileUrl = form.report_file_url || null;

    if (selectedFile && teacher?.id) {
      reportFileUrl = await uploadAcademicReportFile(selectedFile, teacher.id);
    }

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
      predicate: calculated.predicate === "-" ? null : calculated.predicate,

      teacher_comment: form.teacher_comment.trim() || null,
      report_file_url: reportFileUrl,

      approval_status: nextStatus,
      submitted_at: nextStatus === "pending" ? now : null,
      rejected_at: null,
      rejection_note: null,
      updated_at: now,

      uh_score: calculated.averageUh,
      task_score: calculated.averageTask,
      uts_score: calculated.midScore,
      uas_score: calculated.finalExamScore,
      final_score: calculated.finalGrade,
      description: calculated.predicate === "-" ? null : calculated.predicate,
      status: nextStatus,
    };
  }

  async function saveReport(nextStatus: "draft" | "pending") {
    if (!validateForm()) return;

    if (nextStatus === "pending") {
      const confirmSubmit = confirm(
        "Submit laporan ini ke Kepala Sekolah untuk approval?"
      );

      if (!confirmSubmit) return;
    }

    setSaving(true);

    try {
      const payload = await buildPayload(nextStatus);

      if (form.id) {
        const existingReport = reports.find((report) => report.id === form.id);
        const approvalStatus =
          existingReport?.approval_status || existingReport?.status || "draft";

        if (!canEditReport(approvalStatus)) {
          throw new Error(
            "Laporan yang sudah pending/approved tidak bisa diedit oleh guru."
          );
        }

        const { error } = await supabase
          .from("academic_reports")
          .update(payload)
          .eq("id", form.id)
          .eq("teacher_id", teacher?.id);

        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("academic_reports").insert(payload);

        if (error) throw new Error(error.message);
      }

      await fetchData();

      setShowModal(false);
      setForm(emptyForm());
      setSelectedFile(null);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal menyimpan laporan akademik.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function quickSubmitReport(report: EnrichedReport) {
    const approvalStatus = report.approval_status || report.status || "draft";

    if (!canEditReport(approvalStatus)) {
      alert("Laporan ini sudah masuk approval.");
      return;
    }

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
      .eq("id", report.id)
      .eq("teacher_id", teacher?.id);

    if (error) {
      alert(`Gagal submit laporan: ${error.message}`);
      return;
    }

    await fetchData();
  }

  function handleExportExcel() {
    if (filteredReports.length === 0) {
      alert("Tidak ada data laporan akademik yang bisa diexport.");
      return;
    }

    const rows = filteredReports.map((report, index) => {
      const approvalStatus = report.approval_status || report.status || "draft";

      return {
        No: index + 1,
        "Nama Siswa": report.student_name,
        NIPD: report.student_nipd,
        NISN: report.student_nisn,
        Level: report.student_level,
        Kelas: report.student_grade,
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
        Status: getStatusLabel(approvalStatus),
        "Submitted At": formatDateTime(report.submitted_at),
        "Approved At": formatDateTime(report.approved_at),
        "Rejected At": formatDateTime(report.rejected_at),
        "Catatan Rejection": report.rejection_note || "-",
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
          <div class="title">Laporan Akademik Guru</div>
          <div class="subtitle">
            Guru: ${escapeExcelCell(teacher?.full_name || "-")} |
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

    downloadHtmlAsExcel(
      `laporan-akademik-guru-${formatExportDateName()}.xls`,
      html
    );
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
              Laporan akademik bisa diisi langsung di web atau upload file
              raport/laporan akademik jika sekolah sudah memiliki format sendiri.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex h-11 w-fit items-center gap-2 rounded-xl border border-[#DCC8B6] bg-white px-5 text-[14px] font-extrabold text-[#8C0F2D] shadow-sm transition hover:bg-[#FFF8EF]"
            >
              <Download className="h-4 w-4" />
              Export Excel
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              disabled={!teacher || saving}
              className="flex h-11 w-fit items-center gap-2 rounded-xl bg-[#8C0F2D] px-5 text-[14px] font-extrabold text-white shadow-sm transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:bg-[#C9AAB2]"
            >
              + Input / Upload Laporan
            </button>
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-[14px] leading-6 text-red-700">
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
                placeholder="Cari siswa, NIPD, NISN, mapel, periode, atau catatan..."
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
              Draft/rejected bisa diedit. Pending dan approved hanya bisa dilihat.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1380px] border-collapse">
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
                  <th className="px-6 py-4">File</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={13}
                      className="px-6 py-12 text-center text-[#6F5549]"
                    >
                      Memuat laporan akademik...
                    </td>
                  </tr>
                ) : filteredReports.length === 0 ? (
                  <tr>
                    <td
                      colSpan={13}
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
                              <p className="font-extrabold">
                                {report.student_name}
                              </p>
                              <p className="mt-1 text-[12px] text-[#6F5549]">
                                {report.student_level} — {report.student_grade}
                              </p>
                              <p className="mt-1 text-[12px] text-[#6F5549]">
                                NIPD: {report.student_nipd || "-"}
                                {report.student_nisn
                                  ? ` • NISN: ${report.student_nisn}`
                                  : ""}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">{report.subject_name}</td>

                        <td className="px-6 py-4">
                          <p className="font-bold">
                            {report.report_period || "-"}
                          </p>
                          <p className="mt-1 text-[12px] text-[#6F5549]">
                            {getReportTypeLabel(report.report_type)}
                          </p>
                        </td>

                        <td className="px-6 py-4">
                          {formatNumber(report.average_uh ?? report.uh_score)}
                        </td>

                        <td className="px-6 py-4">
                          {formatNumber(
                            report.average_task ?? report.task_score
                          )}
                        </td>

                        <td className="px-6 py-4">
                          {formatNumber(report.mid_score ?? report.uts_score)}
                        </td>

                        <td className="px-6 py-4">
                          {formatNumber(
                            report.final_exam_score ?? report.uas_score
                          )}
                        </td>

                        <td className="px-6 py-4">
                          {formatNumber(report.process_score)}
                        </td>

                        <td className="px-6 py-4">
                          <span className="font-extrabold">
                            {formatNumber(
                              report.final_grade ?? report.final_score
                            )}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <PredicateBadge
                            predicate={report.predicate || report.description}
                          />
                        </td>

                        <td className="px-6 py-4">
                          {report.report_file_url ? (
                            <a
                              href={report.report_file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#DCC8B6] px-3 text-[13px] font-extrabold text-[#8C0F2D] transition hover:bg-[#FFF8EF]"
                            >
                              <FileText className="h-4 w-4" />
                              File
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <StatusBadge status={approvalStatus} />
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            {canEditReport(approvalStatus) ? (
                              <button
                                type="button"
                                onClick={() => openEditModal(report)}
                                className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#DCC8B6] px-3 text-[13px] font-extrabold text-[#8C0F2D] transition hover:bg-[#FFF8EF]"
                              >
                                <Edit3 className="h-4 w-4" />
                                Edit
                              </button>
                            ) : null}

                            {canEditReport(approvalStatus) ? (
                              <button
                                type="button"
                                onClick={() => quickSubmitReport(report)}
                                className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#8C0F2D] px-3 text-[13px] font-extrabold text-white transition hover:bg-[#54131D]"
                              >
                                <Send className="h-4 w-4" />
                                Submit
                              </button>
                            ) : null}

                            {!canEditReport(approvalStatus) ? (
                              <span className="text-[12px] font-semibold text-[#8A5A48]">
                                Sudah dikirim/review
                              </span>
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
                  {form.id
                    ? "Edit Laporan Akademik"
                    : "Input / Upload Laporan Akademik"}
                </h2>

                <p className="mt-1 text-[14px] text-[#6F5549]">
                  Guru bisa input nilai di web atau upload file laporan akademik.
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
              {errorMessage ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-[14px] leading-6 text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              <div className="rounded-2xl border border-[#E1CFBE] bg-white px-5 py-4">
                <p className="text-[14px] font-extrabold text-[#2B1B18]">
                  Pilihan Pengisian
                </p>
                <p className="mt-2 text-[13px] leading-6 text-[#6F5549]">
                  Jika nilai ingin dikelola di web, isi kolom nilai di bawah.
                  Jika sekolah sudah punya file raport/laporan, upload file saja
                  juga bisa.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormGroup label="Siswa">
                  <select
                    value={form.student_id}
                    onChange={(event) => {
                      updateForm("student_id", event.target.value);
                      updateForm("subject_id", "");
                    }}
                    className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                  >
                    <option value="">Pilih siswa</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.full_name} — {student.level} {student.grade} —
                        NIPD: {student.nis || "-"}
                      </option>
                    ))}
                  </select>
                </FormGroup>

                <FormGroup label="Mata Pelajaran">
                  <select
                    value={form.subject_id}
                    onChange={(event) =>
                      updateForm("subject_id", event.target.value)
                    }
                    className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                  >
                    <option value="">Pilih mata pelajaran</option>
                    {subjectOptionsForForm.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {getSubjectLabel(subject)}
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
                    onChange={(event) =>
                      updateForm("report_type", event.target.value)
                    }
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

              <div className="rounded-2xl border border-dashed border-[#DCC8B6] bg-white px-5 py-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="flex items-center gap-2 text-[14px] font-extrabold text-[#2B1B18]">
                      <UploadCloud className="h-5 w-5 text-[#8C0F2D]" />
                      Upload File Laporan / Raport
                    </p>

                    <p className="mt-1 text-[13px] text-[#6F5549]">
                      Format PDF, Word, Excel, JPG, JPEG, atau PNG. Maksimal
                      10MB.
                    </p>

                    {form.report_file_url ? (
                      <a
                        href={form.report_file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-[13px] font-extrabold text-[#0369A1] underline"
                      >
                        Lihat file yang sudah ada
                      </a>
                    ) : null}

                    {selectedFile ? (
                      <p className="mt-2 text-[13px] font-bold text-[#158A58]">
                        File dipilih: {selectedFile.name}
                      </p>
                    ) : null}
                  </div>

                  <label className="flex h-11 cursor-pointer items-center justify-center rounded-xl bg-[#8C0F2D] px-5 text-[14px] font-extrabold text-white transition hover:bg-[#54131D]">
                    Pilih File
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0] || null;
                        setSelectedFile(file);
                      }}
                    />
                  </label>
                </div>
              </div>

              <ScoreSection title="Nilai UH" icon={<BookOpen className="h-5 w-5" />}>
                <ScoreInput
                  label="UH 1"
                  value={form.uh_1}
                  onChange={(value) => updateForm("uh_1", value)}
                />
                <ScoreInput
                  label="UH 2"
                  value={form.uh_2}
                  onChange={(value) => updateForm("uh_2", value)}
                />
                <ScoreInput
                  label="UH 3"
                  value={form.uh_3}
                  onChange={(value) => updateForm("uh_3", value)}
                />
                <ScoreInput
                  label="UH 4"
                  value={form.uh_4}
                  onChange={(value) => updateForm("uh_4", value)}
                />
              </ScoreSection>

              <ScoreSection
                title="Nilai Tugas"
                icon={<ClipboardList className="h-5 w-5" />}
              >
                <ScoreInput
                  label="Tugas 1"
                  value={form.task_1}
                  onChange={(value) => updateForm("task_1", value)}
                />
                <ScoreInput
                  label="Tugas 2"
                  value={form.task_2}
                  onChange={(value) => updateForm("task_2", value)}
                />
                <ScoreInput
                  label="Tugas 3"
                  value={form.task_3}
                  onChange={(value) => updateForm("task_3", value)}
                />
                <ScoreInput
                  label="Tugas 4"
                  value={form.task_4}
                  onChange={(value) => updateForm("task_4", value)}
                />
                <ScoreInput
                  label="Tugas 5"
                  value={form.task_5}
                  onChange={(value) => updateForm("task_5", value)}
                />
              </ScoreSection>

              <ScoreSection
                title="Nilai Ujian dan Proses KBM"
                icon={<GraduationCap className="h-5 w-5" />}
              >
                <ScoreInput
                  label="UTS"
                  value={form.mid_score}
                  onChange={(value) => updateForm("mid_score", value)}
                />
                <ScoreInput
                  label="UAS"
                  value={form.final_exam_score}
                  onChange={(value) => updateForm("final_exam_score", value)}
                />
                <ScoreInput
                  label="Proses KBM"
                  value={form.process_score}
                  onChange={(value) => updateForm("process_score", value)}
                />
              </ScoreSection>

              <div className="grid gap-4 md:grid-cols-4">
                <ResultCard
                  label="Rata-rata UH"
                  value={formatNumber(calculated.averageUh)}
                />
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
                  onClick={() => saveReport("draft")}
                  disabled={saving}
                  className="h-12 rounded-xl border border-[#DCC8B6] bg-white text-[15px] font-extrabold text-[#8C0F2D] transition hover:bg-[#FFF8EF] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Menyimpan..." : "Simpan Draft"}
                </button>

                <button
                  type="button"
                  onClick={() => saveReport("pending")}
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