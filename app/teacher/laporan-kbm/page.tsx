"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import TeacherLayout from "../components/TeacherLayout";

type Teacher = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone?: string | null;
  teacher_code?: string | null;
  subjects?: string[] | string | null;
};

type Student = {
  id: string;
  full_name: string | null;
  nis: string | null;
  nisn: string | null;
  level: string | null;
  grade: string | null;
  homeroom_teacher_id?: string | null;
};

type Subject = {
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
  created_at: string | null;
};

type EnrichedKbmReport = KbmReportRow & {
  student_name: string;
  student_nis: string;
  student_nisn: string;
  student_level: string;
  student_grade: string;
  subject_name: string;
};

type KbmForm = {
  id: string;
  student_id: string;
  subject_id: string;
  report_date: string;
  class_level: string;
  semester: string;
  chapter: string;
  material_topic: string;
  learning_issue: string;
  solution: string;
  teacher_note: string;
  status: string;
};

const initialForm: KbmForm = {
  id: "",
  student_id: "",
  subject_id: "",
  report_date: new Date().toISOString().slice(0, 10),
  class_level: "",
  semester: "Ganjil",
  chapter: "",
  material_topic: "",
  learning_issue: "",
  solution: "",
  teacher_note: "",
  status: "draft",
};

const statusOptions = [
  "Semua Status",
  "draft",
  "pending_review",
  "approved",
  "revision",
  "published",
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

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
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

function getStatusLabel(status: string | null) {
  if (status === "published") return "Published";
  if (status === "approved") return "Approved";
  if (status === "pending_review") return "Pending Review";
  if (status === "revision") return "Revision";

  return "Draft";
}

function getStatusBadge(status: string | null) {
  if (status === "published") return "bg-emerald-100 text-emerald-700";
  if (status === "approved") return "bg-blue-100 text-blue-700";
  if (status === "pending_review") return "bg-yellow-100 text-yellow-700";
  if (status === "revision") return "bg-red-100 text-red-700";

  return "bg-slate-200 text-slate-700";
}

function canEditReport(status: string | null) {
  return !status || status === "draft" || status === "revision";
}

function formatTeacherSubject(subjects: Teacher["subjects"]) {
  if (!subjects) return "Guru";

  if (Array.isArray(subjects)) {
    return `Guru Mapel — ${subjects.slice(0, 4).join(", ")}`;
  }

  return `Guru Mapel — ${subjects}`;
}

function normalizeSubjects(subjects: Teacher["subjects"]) {
  if (!subjects) return [];

  if (Array.isArray(subjects)) {
    return subjects.map((subject) => normalizeText(subject)).filter(Boolean);
  }

  return subjects
    .split(",")
    .map((subject) => normalizeText(subject))
    .filter(Boolean);
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

function isMathSubject(subject?: Subject | null) {
  return normalizeText(subject?.name).includes("math");
}

function getSubjectLabel(subject: Subject) {
  const grade = subject.grade || "All Grade";
  const level = normalizeLevel(subject.level);

  if (subject.level || subject.grade) {
    return `${subject.name || "-"} — ${level} ${grade}`;
  }

  return subject.name || "-";
}

export default function TeacherLaporanKbmPage() {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [reports, setReports] = useState<EnrichedKbmReport[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [studentFilter, setStudentFilter] = useState("Semua Siswa");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<KbmForm>(initialForm);

  async function fetchActiveTeacher() {
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
        .select("id, full_name, email, phone, teacher_code, subjects")
        .ilike("email", email)
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (data) return data as Teacher;
    }

    if (teacherCode) {
      const { data, error } = await supabase
        .from("teachers")
        .select("id, full_name, email, phone, teacher_code, subjects")
        .eq("teacher_code", teacherCode)
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (data) return data as Teacher;
    }

    return null;
  }

  async function fetchPageData() {
    setLoading(true);
    setErrorMessage("");

    try {
      const activeTeacher = await fetchActiveTeacher();

      setTeacher(activeTeacher);

      if (!activeTeacher?.id) {
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
          .from("kbm_reports")
          .select("*")
          .eq("teacher_id", activeTeacher.id)
          .order("report_date", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);

      if (studentsRes.error) throw new Error(studentsRes.error.message);
      if (subjectsRes.error) throw new Error(subjectsRes.error.message);
      if (reportsRes.error) throw new Error(reportsRes.error.message);

      const studentsData = (studentsRes.data || []) as Student[];
      const subjectsData = (subjectsRes.data || []) as Subject[];
      const reportsData = (reportsRes.data || []) as KbmReportRow[];

      const studentMap = new Map(
        studentsData.map((student) => [student.id, student])
      );

      const subjectMap = new Map(
        subjectsData.map((subject) => [subject.id, subject])
      );

      const enrichedReports: EnrichedKbmReport[] = reportsData.map((report) => {
        const student = report.student_id
          ? studentMap.get(report.student_id)
          : null;

        const subject = report.subject_id
          ? subjectMap.get(report.subject_id)
          : null;

        return {
          ...report,
          student_name: student?.full_name || "-",
          student_nis: student?.nis || "-",
          student_nisn: student?.nisn || "-",
          student_level: student?.level || "-",
          student_grade: student?.grade || "-",
          subject_name: subject?.name || "-",
        };
      });

      setStudents(studentsData);
      setSubjects(subjectsData);
      setReports(enrichedReports);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengambil data laporan KBM.");
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
    fetchPageData();

    const channel = supabase
      .channel("teacher-laporan-kbm-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "kbm_reports" },
        () => fetchPageData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teachers" },
        () => fetchPageData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        () => fetchPageData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subjects" },
        () => fetchPageData()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const teacherSubjectNames = useMemo(() => {
    return normalizeSubjects(teacher?.subjects);
  }, [teacher]);

  const selectedStudent = useMemo(() => {
    return students.find((student) => student.id === form.student_id) || null;
  }, [students, form.student_id]);

  const reportSubjectOptions = useMemo(() => {
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

    const stillAllowed = reportSubjectOptions.some(
      (subject) => subject.id === form.subject_id
    );

    if (!stillAllowed) {
      setForm((prev) => ({
        ...prev,
        subject_id: "",
      }));
    }
  }, [form.subject_id, reportSubjectOptions]);

  const filteredReports = useMemo(() => {
    const keyword = normalizeText(search);

    return reports.filter((report) => {
      const matchSearch =
        !keyword ||
        normalizeText(report.student_name).includes(keyword) ||
        normalizeText(report.student_nis).includes(keyword) ||
        normalizeText(report.student_nisn).includes(keyword) ||
        normalizeText(report.student_grade).includes(keyword) ||
        normalizeText(report.subject_name).includes(keyword) ||
        normalizeText(report.chapter).includes(keyword) ||
        normalizeText(report.material_topic).includes(keyword) ||
        normalizeText(report.learning_issue).includes(keyword) ||
        normalizeText(report.solution).includes(keyword) ||
        normalizeText(report.teacher_note).includes(keyword);

      const matchStatus =
        statusFilter === "Semua Status" || report.status === statusFilter;

      const matchStudent =
        studentFilter === "Semua Siswa" || report.student_id === studentFilter;

      return matchSearch && matchStatus && matchStudent;
    });
  }, [reports, search, statusFilter, studentFilter]);

  const draftCount = reports.filter((report) => report.status === "draft").length;

  const reviewCount = reports.filter(
    (report) => report.status === "pending_review"
  ).length;

  const revisionCount = reports.filter(
    (report) => report.status === "revision"
  ).length;

  const publishedCount = reports.filter(
    (report) => report.status === "published" || report.status === "approved"
  ).length;

  function openCreateModal(student?: Student) {
    setErrorMessage("");

    setForm({
      ...initialForm,
      id: "",
      student_id: student?.id || "",
      class_level: student
        ? formatClass(student.level, student.grade)
        : "",
      report_date: getTodayDate(),
      status: "draft",
    });

    setIsModalOpen(true);
  }

  function openEditModal(report: EnrichedKbmReport) {
    if (!canEditReport(report.status)) {
      alert("Laporan ini sudah dikirim/review, jadi tidak bisa diedit.");
      return;
    }

    setErrorMessage("");

    setForm({
      id: report.id,
      student_id: report.student_id || "",
      subject_id: report.subject_id || "",
      report_date: report.report_date || getTodayDate(),
      class_level:
        report.class_level ||
        formatClass(report.student_level, report.student_grade),
      semester: report.semester || "Ganjil",
      chapter: report.chapter || "",
      material_topic: report.material_topic || "",
      learning_issue: report.learning_issue || "",
      solution: report.solution || "",
      teacher_note: report.teacher_note || "",
      status: report.status || "draft",
    });

    setIsModalOpen(true);
  }

  function handleStudentChange(studentId: string) {
    const selected = students.find((student) => student.id === studentId);

    setForm((prev) => ({
      ...prev,
      student_id: studentId,
      subject_id: "",
      class_level: selected
        ? formatClass(selected.level, selected.grade)
        : "",
    }));
  }

  function validateForm() {
    if (!teacher?.id) {
      setErrorMessage("Data guru aktif tidak ditemukan.");
      return false;
    }

    if (!form.student_id) {
      setErrorMessage("Siswa wajib dipilih.");
      return false;
    }

    if (!form.subject_id) {
      setErrorMessage("Mata pelajaran wajib dipilih.");
      return false;
    }

    if (!form.report_date) {
      setErrorMessage("Tanggal laporan wajib diisi.");
      return false;
    }

    if (!form.class_level.trim()) {
      setErrorMessage("Kelas wajib diisi.");
      return false;
    }

    if (!form.material_topic.trim()) {
      setErrorMessage("Materi KBM wajib diisi.");
      return false;
    }

    return true;
  }

  async function handleSubmitReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (!validateForm()) return;

    if (!teacher?.id) return;

    setSaving(true);

    try {
      const payload = {
        student_id: form.student_id,
        teacher_id: teacher.id,
        subject_id: form.subject_id,
        report_date: form.report_date,
        class_level: form.class_level.trim(),
        semester: form.semester,
        chapter: form.chapter.trim() || null,
        material_topic: form.material_topic.trim(),
        learning_issue: form.learning_issue.trim() || null,
        solution: form.solution.trim() || null,
        teacher_note: form.teacher_note.trim() || null,
        status: form.status,
      };

      if (form.id) {
        const existingReport = reports.find((report) => report.id === form.id);

        if (existingReport && !canEditReport(existingReport.status)) {
          throw new Error("Laporan ini sudah dikirim/review, jadi tidak bisa diedit.");
        }

        const { error } = await supabase
          .from("kbm_reports")
          .update(payload)
          .eq("id", form.id)
          .eq("teacher_id", teacher.id);

        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("kbm_reports").insert(payload);

        if (error) throw new Error(error.message);
      }

      setForm({
        ...initialForm,
        id: "",
        report_date: getTodayDate(),
        status: "draft",
      });

      setIsModalOpen(false);
      await fetchPageData();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal menyimpan laporan KBM.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitDraft(report: EnrichedKbmReport) {
    if (!teacher?.id) return;

    if (!canEditReport(report.status)) {
      alert("Laporan ini sudah dikirim/review.");
      return;
    }

    const confirmed = confirm(
      `Kirim laporan "${report.student_name || "-"} — ${
        report.subject_name || "-"
      }" ke Kepala Sekolah?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("kbm_reports")
      .update({ status: "pending_review" })
      .eq("id", report.id)
      .eq("teacher_id", teacher.id);

    if (error) {
      alert(error.message);
      return;
    }

    await fetchPageData();
  }

  function closeModal() {
    setIsModalOpen(false);
    setErrorMessage("");
    setForm({
      ...initialForm,
      id: "",
      report_date: getTodayDate(),
      status: "draft",
    });
  }

  return (
    <TeacherLayout
      activeMenu="Laporan KBM"
      teacherName={teacher?.full_name || "Guru"}
      teacherSubject={formatTeacherSubject(teacher?.subjects)}
      searchPlaceholder="Cari laporan KBM..."
    >
      <div className="w-full max-w-full overflow-hidden">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#6B4A3A]">
              Teacher Portal
            </p>

            <h1 className="mt-1 text-[30px] font-bold tracking-tight">
              Laporan KBM
            </h1>

            <p className="mt-1 text-sm text-[#6B4A3A]">
              Buat dan pantau laporan kegiatan belajar mengajar oleh{" "}
              <span className="font-bold text-[#2B1B18]">
                {teacher?.full_name || "guru aktif"}
              </span>
              .
            </p>

            <p className="mt-2 max-w-[860px] text-sm leading-6 text-[#6B4A3A]">
              Laporan KBM ini berdiri sendiri. Tidak wajib terhubung ke Jadwal,
              Absensi, Program Semester, Bab/Sub Bab, atau RPP.
            </p>
          </div>

          <button
            type="button"
            onClick={() => openCreateModal()}
            disabled={!teacher || saving}
            className="w-fit rounded-xl bg-[#7A1F2B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:bg-[#C9AAB2]"
          >
            + Buat Laporan
          </button>
        </div>

        {errorMessage && !isModalOpen ? (
          <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-8 text-center text-sm shadow-sm">
            Loading laporan KBM...
          </div>
        ) : null}

        {!loading ? (
          <>
            <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6B4A3A]">Total Laporan</p>
                <p className="mt-4 text-3xl font-bold">{reports.length}</p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6B4A3A]">Draft</p>
                <p className="mt-4 text-3xl font-bold">{draftCount}</p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6B4A3A]">Pending Review</p>
                <p className="mt-4 text-3xl font-bold">{reviewCount}</p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6B4A3A]">Approved / Published</p>
                <p className="mt-4 text-3xl font-bold">{publishedCount}</p>
              </div>
            </div>

            <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_240px]">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari siswa, NIPD, NISN, mapel, bab, materi, masalah, solusi..."
                  className="w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                />

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                >
                  {statusOptions.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>

                <select
                  value={studentFilter}
                  onChange={(event) => setStudentFilter(event.target.value)}
                  className="rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                >
                  <option>Semua Siswa</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
              <div className="space-y-5">
                {filteredReports.length === 0 ? (
                  <div className="rounded-2xl border border-[#E8D6C1] bg-white p-10 text-center text-sm text-[#6B4A3A] shadow-sm">
                    Belum ada laporan KBM untuk guru ini.
                  </div>
                ) : null}

                {filteredReports.map((report) => (
                  <div
                    key={report.id}
                    className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FDE7D7] text-sm font-bold text-[#7A1F2B]">
                          {getInitials(report.student_name)}
                        </div>

                        <div>
                          <h2 className="text-lg font-bold">
                            {report.student_name || "-"} —{" "}
                            {report.subject_name || "-"}
                          </h2>

                          <p className="mt-1 text-sm text-[#6B4A3A]">
                            {report.class_level ||
                              formatClass(
                                report.student_level,
                                report.student_grade
                              )}{" "}
                            / {report.semester || "-"} •{" "}
                            {formatDate(report.report_date)} • NIPD:{" "}
                            {report.student_nis || "-"}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${getStatusBadge(
                          report.status
                        )}`}
                      >
                        {getStatusLabel(report.status)}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                      <div className="rounded-2xl bg-[#FFF8EF] p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-[#6B4A3A]">
                          Bab / Unit
                        </p>
                        <p className="mt-2 font-bold">{report.chapter || "-"}</p>
                      </div>

                      <div className="rounded-2xl bg-[#FFF8EF] p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-[#6B4A3A]">
                          Materi
                        </p>
                        <p className="mt-2 font-bold">
                          {report.material_topic || "-"}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-[#FFF8EF] p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-[#6B4A3A]">
                          Status
                        </p>
                        <p className="mt-2 font-bold">
                          {getStatusLabel(report.status)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 space-y-3">
                      <div className="grid grid-cols-1 gap-2 border-b border-dashed border-[#E8D6C1] pb-3 md:grid-cols-[160px_1fr]">
                        <p className="text-sm font-bold text-[#6B4A3A]">
                          Masalah
                        </p>
                        <p className="text-sm text-[#2B1B18]">
                          {report.learning_issue || "-"}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-2 border-b border-dashed border-[#E8D6C1] pb-3 md:grid-cols-[160px_1fr]">
                        <p className="text-sm font-bold text-[#6B4A3A]">
                          Solusi
                        </p>
                        <p className="text-sm text-[#2B1B18]">
                          {report.solution || "-"}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-[#FFF8EF] p-4">
                        <p className="text-sm font-bold">Keterangan Guru</p>
                        <p className="mt-2 text-sm leading-6 text-[#6B4A3A]">
                          {report.teacher_note || "-"}
                        </p>
                      </div>
                    </div>

                    {canEditReport(report.status) ? (
                      <div className="mt-5 flex flex-wrap gap-3 border-t border-[#E8D6C1] pt-4">
                        <button
                          type="button"
                          onClick={() => openEditModal(report)}
                          className="rounded-xl border border-[#DCC8B6] bg-white px-4 py-2 text-sm font-bold text-[#7A1F2B] transition hover:bg-[#FFF8EF]"
                        >
                          Edit Draft
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSubmitDraft(report)}
                          className="rounded-xl bg-[#7A1F2B] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#54131D]"
                        >
                          Kirim Review
                        </button>
                      </div>
                    ) : (
                      <p className="mt-4 text-xs font-semibold text-[#8A5A48]">
                        Laporan yang sudah dikirim/review tidak bisa diedit dari
                        halaman guru.
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-5">
                <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold">Guru Aktif</h2>

                  <div className="mt-5 rounded-2xl bg-[#FFF8EF] p-5">
                    <p className="text-sm text-[#6B4A3A]">Nama Guru</p>
                    <p className="mt-2 text-xl font-bold">
                      {teacher?.full_name || "-"}
                    </p>

                    <div className="mt-4 space-y-2 text-sm text-[#6B4A3A]">
                      <p>
                        <span className="font-semibold text-[#2B1B18]">
                          Kode:
                        </span>{" "}
                        {teacher?.teacher_code || "-"}
                      </p>

                      <p>
                        <span className="font-semibold text-[#2B1B18]">
                          Email:
                        </span>{" "}
                        {teacher?.email || "-"}
                      </p>

                      <p>
                        <span className="font-semibold text-[#2B1B18]">
                          Mapel:
                        </span>{" "}
                        {Array.isArray(teacher?.subjects)
                          ? teacher?.subjects.join(", ")
                          : teacher?.subjects || "-"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold">Siswa</h2>

                  <div className="mt-5 space-y-3">
                    {students.length === 0 ? (
                      <div className="rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] p-4 text-sm text-[#6B4A3A]">
                        Belum ada data siswa.
                      </div>
                    ) : null}

                    {students.slice(0, 5).map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-[#E8D6C1] p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FDE7D7] text-xs font-bold text-[#7A1F2B]">
                            {getInitials(student.full_name)}
                          </div>

                          <div>
                            <p className="font-bold">{student.full_name}</p>
                            <p className="text-sm text-[#6B4A3A]">
                              {formatClass(student.level, student.grade)} •
                              NIPD: {student.nis || "-"}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => openCreateModal(student)}
                          disabled={!teacher}
                          className="shrink-0 rounded-xl bg-[#7A1F2B] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:bg-[#C9AAB2]"
                        >
                          + Laporan
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold">Status Laporan</h2>

                  <div className="mt-5 space-y-4">
                    <ProgressItem
                      label="Draft"
                      value={draftCount}
                      total={reports.length}
                      color="bg-slate-500"
                    />

                    <ProgressItem
                      label="Pending Review"
                      value={reviewCount}
                      total={reports.length}
                      color="bg-yellow-500"
                    />

                    <ProgressItem
                      label="Revision"
                      value={revisionCount}
                      total={reports.length}
                      color="bg-red-500"
                    />

                    <ProgressItem
                      label="Approved / Published"
                      value={publishedCount}
                      total={reports.length}
                      color="bg-emerald-600"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold">Catatan</h2>
                  <p className="mt-3 text-sm leading-6 text-[#6B4A3A]">
                    Laporan status draft/revision bisa diedit oleh guru. Jika
                    sudah pending_review, approved, atau published, laporan tidak
                    bisa diedit dari halaman guru.
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
          <div className="flex max-h-[92vh] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl bg-[#FAF3EA] shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-[#E8D6C1] px-6 py-5">
              <div>
                <h2 className="text-xl font-bold">
                  {form.id ? "Edit Laporan KBM" : "Buat Laporan KBM"}
                </h2>

                <p className="mt-1 text-xs text-[#6B4A3A]">
                  Input manual. Tidak wajib mengambil dari jadwal/absensi.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="text-2xl leading-none text-[#6B4A3A] hover:text-[#7A1F2B]"
              >
                ×
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              {errorMessage ? (
                <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              <div className="mb-4 rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] px-4 py-3 text-xs leading-5 text-[#6B4A3A]">
                Simpan sebagai draft jika belum selesai. Pilih pending_review
                jika siap dikirim ke Kepala Sekolah.
              </div>

              <form onSubmit={handleSubmitReport} className="space-y-4 pb-2">
                <div>
                  <label className="text-sm font-bold">Siswa</label>
                  <select
                    value={form.student_id}
                    onChange={(event) => handleStudentChange(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  >
                    <option value="">Pilih siswa</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.full_name} —{" "}
                        {formatClass(student.level, student.grade)} — NIPD:{" "}
                        {student.nis || "-"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-bold">Mata Pelajaran</label>
                  <select
                    value={form.subject_id}
                    onChange={(event) =>
                      setForm({ ...form, subject_id: event.target.value })
                    }
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  >
                    <option value="">Pilih mata pelajaran</option>
                    {reportSubjectOptions.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {getSubjectLabel(subject)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-bold">Tanggal</label>
                    <input
                      type="date"
                      value={form.report_date}
                      onChange={(event) =>
                        setForm({ ...form, report_date: event.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold">Semester</label>
                    <select
                      value={form.semester}
                      onChange={(event) =>
                        setForm({ ...form, semester: event.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    >
                      <option>Ganjil</option>
                      <option>Genap</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold">Kelas</label>
                  <input
                    value={form.class_level}
                    onChange={(event) =>
                      setForm({ ...form, class_level: event.target.value })
                    }
                    placeholder="Contoh: SD Grade 4"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Bab / Unit</label>
                  <input
                    value={form.chapter}
                    onChange={(event) =>
                      setForm({ ...form, chapter: event.target.value })
                    }
                    placeholder="Contoh: Bab 5 / Unit 8"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Materi KBM</label>
                  <input
                    value={form.material_topic}
                    onChange={(event) =>
                      setForm({ ...form, material_topic: event.target.value })
                    }
                    placeholder="Contoh: Pecahan Senilai"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Masalah Belajar</label>
                  <textarea
                    value={form.learning_issue}
                    onChange={(event) =>
                      setForm({ ...form, learning_issue: event.target.value })
                    }
                    rows={3}
                    placeholder="Contoh: Siswa masih kesulitan memahami materi tertentu"
                    className="mt-2 w-full resize-none rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Solusi</label>
                  <textarea
                    value={form.solution}
                    onChange={(event) =>
                      setForm({ ...form, solution: event.target.value })
                    }
                    rows={3}
                    placeholder="Contoh: Latihan tambahan atau pendekatan visual"
                    className="mt-2 w-full resize-none rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Keterangan Guru</label>
                  <textarea
                    value={form.teacher_note}
                    onChange={(event) =>
                      setForm({ ...form, teacher_note: event.target.value })
                    }
                    rows={3}
                    placeholder="Catatan guru terkait proses KBM"
                    className="mt-2 w-full resize-none rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Status</label>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm({ ...form, status: event.target.value })
                    }
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  >
                    <option value="draft">draft</option>
                    <option value="pending_review">pending_review</option>
                  </select>
                  <p className="mt-1 text-xs text-[#6B4A3A]">
                    Pilih draft jika belum selesai. Pilih pending_review jika
                    siap dikirim ke Kepala Sekolah.
                  </p>
                </div>

                <div className="sticky bottom-0 -mx-6 mt-5 border-t border-[#E8D6C1] bg-[#FAF3EA] px-6 pb-1 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-xl bg-[#7A1F2B] py-3 text-sm font-bold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving
                      ? "Menyimpan..."
                      : form.id
                        ? "Simpan Perubahan"
                        : "Simpan Laporan KBM"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </TeacherLayout>
  );
}

function ProgressItem({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-bold">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#F1DFD5]">
        <div
          className={`h-full rounded-full ${color}`}
          style={{
            width: total > 0 ? `${(value / total) * 100}%` : "0%",
          }}
        />
      </div>
    </div>
  );
}