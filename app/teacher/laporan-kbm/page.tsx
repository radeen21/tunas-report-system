"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import TeacherLayout from "../components/TeacherLayout";

type Teacher = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  teacher_code: string | null;
  subjects: string[] | null;
};

type StudentRelation = {
  id: string;
  full_name: string;
  grade: string | null;
  level: string | null;
  nis: string | null;
  nisn: string | null;
};

type SubjectRelation = {
  id: string;
  name: string;
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
  students: StudentRelation | StudentRelation[] | null;
  subjects: SubjectRelation | SubjectRelation[] | null;
};

type KbmReport = {
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
  students: StudentRelation | null;
  subjects: SubjectRelation | null;
};

type Student = {
  id: string;
  full_name: string;
  nis: string | null;
  nisn: string | null;
  level: string | null;
  grade: string | null;
  homeroom_teacher_id: string | null;
};

type Subject = {
  id: string;
  name: string;
  level: string | null;
  grade: string | null;
};

type ScheduleOptionRow = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  schedule_date: string | null;
  start_time: string | null;
  end_time: string | null;
  day_name: string | null;
  session_name: string | null;
  material_topic: string | null;
  semester: string | null;
  curriculum_chapter_id?: string | null;
  curriculum_sub_chapter_id?: string | null;
  students: StudentRelation | StudentRelation[] | null;
  subjects: SubjectRelation | SubjectRelation[] | null;
};

type ScheduleOption = {
  id: string;
  student_id: string | null;
  subject_id: string | null;
  schedule_date: string | null;
  start_time: string | null;
  end_time: string | null;
  day_name: string | null;
  session_name: string | null;
  material_topic: string | null;
  semester: string | null;
  chapter_title: string;
  sub_chapter_title: string;
  students: StudentRelation | null;
  subjects: SubjectRelation | null;
};

type KbmForm = {
  schedule_id: string;
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
  schedule_id: "",
  student_id: "",
  subject_id: "",
  report_date: new Date().toISOString().slice(0, 10),
  class_level: "",
  semester: "Genap",
  chapter: "",
  material_topic: "",
  learning_issue: "",
  solution: "",
  teacher_note: "",
  status: "pending_review",
};

function normalizeRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function normalizeText(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function formatDate(date: string | null) {
  if (!date) return "-";

  const parsedDate = new Date(date);

  return parsedDate.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(time?: string | null) {
  if (!time) return "-";
  return time.slice(0, 5);
}

function getScheduleLabel(schedule: ScheduleOption) {
  return [
    formatDate(schedule.schedule_date),
    `${formatTime(schedule.start_time)}-${formatTime(schedule.end_time)}`,
    schedule.students?.full_name || "-",
    schedule.subjects?.name || "-",
  ].join(" • ");
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getInitials(name: string) {
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

export default function TeacherLaporanKbmPage() {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [reports, setReports] = useState<KbmReport[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schedules, setSchedules] = useState<ScheduleOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [studentFilter, setStudentFilter] = useState("Semua Siswa");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<KbmForm>(initialForm);

  async function fetchActiveTeacher() {
    const { data: authData } = await supabase.auth.getUser();

    const email =
      authData.user?.email ||
      localStorage.getItem("hstkb_demo_email") ||
      localStorage.getItem("hstkb_email") ||
      "";

    if (email) {
      const { data, error } = await supabase
        .from("teachers")
        .select("id, full_name, email, phone, teacher_code, subjects")
        .eq("email", email)
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);

      if (data) {
        setTeacher(data as Teacher);
        return data as Teacher;
      }
    }

    const teacherCode =
      localStorage.getItem("hstkb_teacher_code") ||
      localStorage.getItem("teacher_code") ||
      "";

    if (teacherCode) {
      const { data, error } = await supabase
        .from("teachers")
        .select("id, full_name, email, phone, teacher_code, subjects")
        .eq("teacher_code", teacherCode)
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);

      if (data) {
        setTeacher(data as Teacher);
        return data as Teacher;
      }
    }

    const { data, error } = await supabase
      .from("teachers")
      .select("id, full_name, email, phone, teacher_code, subjects")
      .order("teacher_code", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);

    setTeacher((data as Teacher) || null);

    return (data as Teacher) || null;
  }

  async function fetchStudents(teacherId: string) {
    const { data, error } = await supabase
      .from("students")
      .select("id, full_name, nis, nisn, level, grade, homeroom_teacher_id")
      .eq("homeroom_teacher_id", teacherId)
      .order("full_name", { ascending: true });

    if (error) throw new Error(error.message);

    setStudents(data || []);
  }

  async function fetchSubjects() {
    const { data, error } = await supabase
      .from("subjects")
      .select("id, name, level, grade")
      .order("name", { ascending: true });

    if (error) throw new Error(error.message);

    setSubjects(data || []);
  }

async function fetchSchedules(teacherId: string) {
    const { data, error } = await supabase
      .from("schedules")
      .select(
        `
        id,
        student_id,
        teacher_id,
        subject_id,
        schedule_date,
        start_time,
        end_time,
        day_name,
        session_name,
        material_topic,
        semester,
        curriculum_chapter_id,
        curriculum_sub_chapter_id,
        students (
          id,
          full_name,
          grade,
          level,
          nis,
          nisn
        ),
        subjects (
          id,
          name,
          level,
          grade
        )
      `
      )
      .eq("teacher_id", teacherId)
      .order("schedule_date", { ascending: false })
      .order("start_time", { ascending: true });

    if (error) throw new Error(error.message);

    const rows = (data || []) as ScheduleOptionRow[];

    const normalizedSchedules: ScheduleOption[] = rows.map((item) => ({
      id: item.id,
      student_id: item.student_id,
      subject_id: item.subject_id,
      schedule_date: item.schedule_date,
      start_time: item.start_time,
      end_time: item.end_time,
      day_name: item.day_name,
      session_name: item.session_name,
      material_topic: item.material_topic,
      semester: item.semester,
      chapter_title: item.curriculum_chapter_id || "",
      sub_chapter_title: item.curriculum_sub_chapter_id || "",
      students: normalizeRelation(item.students),
      subjects: normalizeRelation(item.subjects),
    }));

    setSchedules(normalizedSchedules);
  }

  async function fetchReports(teacherId: string) {
    const { data, error } = await supabase
      .from("kbm_reports")
      .select(
        `
        id,
        student_id,
        teacher_id,
        subject_id,
        report_date,
        class_level,
        semester,
        chapter,
        material_topic,
        learning_issue,
        solution,
        teacher_note,
        status,
        created_at,
        students (
          id,
          full_name,
          grade,
          level,
          nis,
          nisn
        ),
        subjects (
          id,
          name,
          level,
          grade
        )
      `
      )
      .eq("teacher_id", teacherId)
      .order("report_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const rows = (data || []) as KbmReportRow[];

    const normalizedReports: KbmReport[] = rows.map((item) => ({
      id: item.id,
      student_id: item.student_id,
      teacher_id: item.teacher_id,
      subject_id: item.subject_id,
      report_date: item.report_date,
      class_level: item.class_level,
      semester: item.semester,
      chapter: item.chapter,
      material_topic: item.material_topic,
      learning_issue: item.learning_issue,
      solution: item.solution,
      teacher_note: item.teacher_note,
      status: item.status,
      created_at: item.created_at,
      students: normalizeRelation(item.students),
      subjects: normalizeRelation(item.subjects),
    }));

    setReports(normalizedReports);
  }

  async function fetchPageData() {
    setLoading(true);
    setErrorMessage("");

    try {
      const activeTeacher = await fetchActiveTeacher();

      if (!activeTeacher) {
        setErrorMessage("Belum ada data guru di table teachers.");
        setLoading(false);
        return;
      }

      await Promise.all([
        fetchStudents(activeTeacher.id),
        fetchSubjects(),
        fetchSchedules(activeTeacher.id),
        fetchReports(activeTeacher.id),
      ]);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengambil data laporan KBM.");
      }
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const teacherSubjectNames = useMemo(() => {
    return (teacher?.subjects || [])
      .map((subject) => normalizeText(subject))
      .filter(Boolean);
  }, [teacher]);

  const reportSubjectOptions = useMemo(() => {
    if (teacherSubjectNames.length === 0) return subjects;

    const matchedSubjects = subjects.filter((subject) => {
      const subjectName = normalizeText(subject.name);

      return teacherSubjectNames.some((teacherSubject) => {
        return (
          teacherSubject.includes(subjectName) ||
          subjectName.includes(teacherSubject)
        );
      });
    });

    return matchedSubjects.length > 0 ? matchedSubjects : subjects;
  }, [subjects, teacherSubjectNames]);

  const filteredReports = useMemo(() => {
    const keyword = search.toLowerCase();

    return reports.filter((report) => {
      const matchSearch =
        !keyword ||
        report.students?.full_name?.toLowerCase().includes(keyword) ||
        report.students?.nis?.toLowerCase().includes(keyword) ||
        report.students?.nisn?.toLowerCase().includes(keyword) ||
        report.students?.grade?.toLowerCase().includes(keyword) ||
        report.subjects?.name?.toLowerCase().includes(keyword) ||
        report.chapter?.toLowerCase().includes(keyword) ||
        report.material_topic?.toLowerCase().includes(keyword) ||
        report.learning_issue?.toLowerCase().includes(keyword) ||
        report.solution?.toLowerCase().includes(keyword) ||
        report.teacher_note?.toLowerCase().includes(keyword);

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

  const publishedCount = reports.filter(
    (report) => report.status === "published"
  ).length;

  function openModal(student?: Student) {
    setErrorMessage("");

    setForm({
      ...initialForm,
      schedule_id: "",
      student_id: student?.id || "",
      class_level: student?.grade || "",
      report_date: getTodayDate(),
      status: "pending_review",
    });

    setIsModalOpen(true);
  }

  function handleScheduleChange(scheduleId: string) {
    const selectedSchedule = schedules.find((schedule) => schedule.id === scheduleId);

    if (!selectedSchedule) {
      setForm({
        ...form,
        schedule_id: "",
        student_id: "",
        subject_id: "",
        class_level: "",
        chapter: "",
        material_topic: "",
      });
      return;
    }

    setForm({
      ...form,
      schedule_id: selectedSchedule.id,
      student_id: selectedSchedule.student_id || "",
      subject_id: selectedSchedule.subject_id || "",
      report_date: selectedSchedule.schedule_date || getTodayDate(),
      class_level: selectedSchedule.students?.grade || "",
      semester: selectedSchedule.semester || form.semester || "Genap",
      chapter: selectedSchedule.session_name || "",
      material_topic: selectedSchedule.material_topic || "",
    });
  }

  function handleStudentChange(studentId: string) {
    const selectedStudent = students.find((student) => student.id === studentId);

    setForm({
      ...form,
      schedule_id: "",
      student_id: studentId,
      class_level: selectedStudent?.grade || "",
    });
  }

  async function handleSubmitReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (!teacher?.id) {
      setErrorMessage("Data guru aktif tidak ditemukan.");
      return;
    }

    if (!form.student_id) {
      setErrorMessage("Siswa wajib dipilih.");
      return;
    }

    if (!form.subject_id) {
      setErrorMessage("Mata pelajaran wajib dipilih.");
      return;
    }

    if (!form.report_date) {
      setErrorMessage("Tanggal laporan wajib diisi.");
      return;
    }

    if (!form.material_topic.trim()) {
      setErrorMessage("Materi KBM wajib diisi.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from("kbm_reports").insert({
        student_id: form.student_id,
        teacher_id: teacher.id,
        subject_id: form.subject_id,
        report_date: form.report_date,
        class_level: form.class_level.trim() || null,
        semester: form.semester,
        chapter: form.chapter.trim() || null,
        material_topic: form.material_topic.trim(),
        learning_issue: form.learning_issue.trim() || null,
        solution: form.solution.trim() || null,
        teacher_note: form.teacher_note.trim() || null,
        status: form.status,
      });

      if (error) {
        throw new Error(error.message);
      }

      setForm({
        ...initialForm,
        report_date: getTodayDate(),
        status: "pending_review",
      });
      setIsModalOpen(false);
      await fetchReports(teacher.id);
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

  function closeModal() {
    setIsModalOpen(false);
    setErrorMessage("");
    setForm({
      ...initialForm,
      report_date: getTodayDate(),
      status: "pending_review",
    });
  }

  return (
    <TeacherLayout
      activeMenu="Laporan KBM"
      searchPlaceholder="Cari laporan KBM..."
      buttonLabel="+ Buat Laporan"
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
          </div>

          <button
            type="button"
            onClick={() => openModal()}
            className="w-fit rounded-xl bg-[#7A1F2B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#54131D]"
          >
            + Buat Laporan
          </button>
        </div>

        {errorMessage && !isModalOpen && (
          <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {loading && (
          <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-8 text-center text-sm shadow-sm">
            Loading laporan KBM...
          </div>
        )}

        {!loading && (
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
                <p className="text-sm text-[#6B4A3A]">Published</p>
                <p className="mt-4 text-3xl font-bold">{publishedCount}</p>
              </div>
            </div>

            <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_240px]">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari siswa, mapel, bab, materi, masalah, solusi..."
                  className="w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                />

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                >
                  <option>Semua Status</option>
                  <option value="draft">draft</option>
                  <option value="pending_review">pending_review</option>
                  <option value="approved">approved</option>
                  <option value="revision">revision</option>
                  <option value="published">published</option>
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
                {filteredReports.length === 0 && (
                  <div className="rounded-2xl border border-[#E8D6C1] bg-white p-10 text-center text-sm text-[#6B4A3A] shadow-sm">
                    Belum ada laporan KBM untuk guru ini.
                  </div>
                )}

                {filteredReports.map((report) => (
                  <div
                    key={report.id}
                    className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FDE7D7] text-sm font-bold text-[#7A1F2B]">
                          {getInitials(report.students?.full_name || "Siswa")}
                        </div>

                        <div>
                          <h2 className="text-lg font-bold">
                            {report.students?.full_name || "-"} —{" "}
                            {report.subjects?.name || "-"}
                          </h2>

                          <p className="mt-1 text-sm text-[#6B4A3A]">
                            {report.class_level || "-"} /{" "}
                            {report.semester || "-"} •{" "}
                            {formatDate(report.report_date)} • NIPD:{" "}
                            {report.students?.nis || "-"}
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
                          Bab
                        </p>
                        <p className="mt-2 font-bold">
                          {report.chapter || "-"}
                        </p>
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
                        {teacher?.subjects?.join(", ") || "-"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold">Siswa Terhubung</h2>

                  <div className="mt-5 space-y-3">
                    {students.length === 0 && (
                      <div className="rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] p-4 text-sm text-[#6B4A3A]">
                        Belum ada siswa untuk guru ini.
                      </div>
                    )}

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
                              {student.grade || "-"} • NIPD: {student.nis || "-"}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => openModal(student)}
                          className="shrink-0 rounded-xl bg-[#7A1F2B] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#54131D]"
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
                    <div>
                      <div className="mb-2 flex justify-between text-sm">
                        <span>Draft</span>
                        <span className="font-bold">{draftCount}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#F1DFD5]">
                        <div
                          className="h-full rounded-full bg-slate-500"
                          style={{
                            width:
                              reports.length > 0
                                ? `${(draftCount / reports.length) * 100}%`
                                : "0%",
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex justify-between text-sm">
                        <span>Pending Review</span>
                        <span className="font-bold">{reviewCount}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#F1DFD5]">
                        <div
                          className="h-full rounded-full bg-yellow-500"
                          style={{
                            width:
                              reports.length > 0
                                ? `${(reviewCount / reports.length) * 100}%`
                                : "0%",
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex justify-between text-sm">
                        <span>Published</span>
                        <span className="font-bold">{publishedCount}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#F1DFD5]">
                        <div
                          className="h-full rounded-full bg-emerald-600"
                          style={{
                            width:
                              reports.length > 0
                                ? `${(publishedCount / reports.length) * 100}%`
                                : "0%",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold">Catatan</h2>
                  <p className="mt-3 text-sm leading-6 text-[#6B4A3A]">
                    Tombol{" "}
                    <span className="font-bold text-[#2B1B18]">
                      + Buat Laporan
                    </span>{" "}
                    akan menyimpan data baru ke table{" "}
                    <span className="font-bold text-[#2B1B18]">
                      kbm_reports
                    </span>
                    . Default status laporan adalah pending_review agar masuk ke
                    review Kepala Sekolah.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
          <div className="flex max-h-[92vh] w-full max-w-[500px] flex-col overflow-hidden rounded-2xl bg-[#FAF3EA] shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-[#E8D6C1] px-6 py-5">
              <h2 className="text-xl font-bold">Buat Laporan KBM</h2>

              <button
                type="button"
                onClick={closeModal}
                className="text-2xl leading-none text-[#6B4A3A] hover:text-[#7A1F2B]"
              >
                ×
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              {errorMessage && (
                <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}

              <div className="mb-4 rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] px-4 py-3 text-xs leading-5 text-[#6B4A3A]">
                Laporan dari menu ini bersifat input manual. Untuk laporan yang
                otomatis membawa jadwal, Bab, Sub Bab, dan Materi Pokok,
                gunakan menu Jadwal Mengajar atau Absensi KBM.
              </div>

              <form onSubmit={handleSubmitReport} className="space-y-4 pb-2">
                <div>
                  <label className="text-sm font-bold">Ambil dari Jadwal</label>
                  <select
                    value={form.schedule_id}
                    onChange={(event) => handleScheduleChange(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  >
                    <option value="">Input manual / pilih jadwal</option>
                    {schedules.map((schedule) => (
                      <option key={schedule.id} value={schedule.id}>
                        {getScheduleLabel(schedule)}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs leading-5 text-[#6B4A3A]">
                    Pilih jadwal agar siswa, mapel, tanggal, kelas, dan materi otomatis terisi.
                  </p>
                </div>

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
                        {student.full_name} — {student.grade || "-"} — NIPD: {student.nis || "-"}
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
                        {subject.name}
                        {subject.grade ? ` — ${subject.grade}` : ""}
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
                    placeholder="Contoh: Grade 4"
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
                    placeholder="Contoh: Siswa masih kesulitan menyamakan penyebut"
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
                    placeholder="Contoh: Latihan tambahan dengan visual pecahan"
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
                    <option value="pending_review">pending_review</option>
                    <option value="draft">draft</option>
                  </select>
                  <p className="mt-1 text-xs text-[#6B4A3A]">
                    Default pending_review agar langsung masuk ke review Kepala
                    Sekolah.
                  </p>
                </div>

                <div className="sticky bottom-0 -mx-6 mt-5 border-t border-[#E8D6C1] bg-[#FAF3EA] px-6 pb-1 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-xl bg-[#7A1F2B] py-3 text-sm font-bold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Menyimpan..." : "Simpan Laporan KBM"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </TeacherLayout>
  );
}