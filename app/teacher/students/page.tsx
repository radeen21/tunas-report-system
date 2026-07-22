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

type Parent = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  relation: string | null;
};

type StudentRow = {
  id: string;
  user_id: string | null;
  parent_id: string | null;
  homeroom_teacher_id: string | null;
  nis: string | null;
  nisn: string | null;
  full_name: string;
  level: string | null;
  grade: string | null;
  academic_year: string | null;
  status: string | null;
  birth_date: string | null;
  progress: number | null;
  attendance: number | null;
  created_at: string | null;
  parents: Parent | Parent[] | null;
};

type Student = {
  id: string;
  user_id: string | null;
  parent_id: string | null;
  homeroom_teacher_id: string | null;
  nis: string | null;
  nisn: string | null;
  full_name: string;
  level: string | null;
  grade: string | null;
  academic_year: string | null;
  status: string | null;
  birth_date: string | null;
  progress: number | null;
  attendance: number | null;
  created_at: string | null;
  parents: Parent | null;
};

type AcademicReportRow = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  final_score: number | null;
  status: string | null;
};

type AttendanceRow = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  attendance_status: string | null;
};

type Subject = {
  id: string;
  name: string;
  level: string | null;
  grade: string | null;
};

type KbmForm = {
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

const initialKbmForm: KbmForm = {
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

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
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

function getStatusBadge(status: string | null) {
  if (status === "active") return "bg-emerald-100 text-emerald-700";
  if (status === "inactive") return "bg-red-100 text-red-700";

  return "bg-slate-200 text-slate-700";
}

function getProgressColor(progress: number | null) {
  const value = Number(progress || 0);

  if (value >= 80) return "bg-emerald-600";
  if (value >= 60) return "bg-yellow-500";

  return "bg-red-500";
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function TeacherStudentsPage() {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [academicReports, setAcademicReports] = useState<AcademicReportRow[]>(
    []
  );
  const [attendanceList, setAttendanceList] = useState<AttendanceRow[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("Semua Level");
  const [statusFilter, setStatusFilter] = useState("Semua Status");

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [savingReport, setSavingReport] = useState(false);
  const [reportForm, setReportForm] = useState<KbmForm>(initialKbmForm);

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
      .select(
        `
        id,
        user_id,
        parent_id,
        homeroom_teacher_id,
        nis,
        nisn,
        full_name,
        level,
        grade,
        academic_year,
        status,
        birth_date,
        progress,
        attendance,
        created_at,
        parents (
          id,
          full_name,
          email,
          phone,
          relation
        )
      `
      )
      .eq("homeroom_teacher_id", teacherId)
      .order("full_name", { ascending: true });

    if (error) throw new Error(error.message);

    const rows = (data || []) as StudentRow[];

    const normalizedStudents: Student[] = rows.map((item) => ({
      id: item.id,
      user_id: item.user_id,
      parent_id: item.parent_id,
      homeroom_teacher_id: item.homeroom_teacher_id,
      nis: item.nis,
      nisn: item.nisn,
      full_name: item.full_name,
      level: item.level,
      grade: item.grade,
      academic_year: item.academic_year,
      status: item.status,
      birth_date: item.birth_date,
      progress: item.progress,
      attendance: item.attendance,
      created_at: item.created_at,
      parents: normalizeRelation(item.parents),
    }));

    setStudents(normalizedStudents);
  }

  async function fetchAcademicReports(teacherId: string) {
    const { data, error } = await supabase
      .from("academic_reports")
      .select("id, student_id, teacher_id, final_score, status")
      .eq("teacher_id", teacherId);

    if (error) throw new Error(error.message);

    setAcademicReports(data || []);
  }

  async function fetchAttendance(teacherId: string) {
    const { data, error } = await supabase
      .from("attendance")
      .select("id, student_id, teacher_id, attendance_status")
      .eq("teacher_id", teacherId);

    if (error) throw new Error(error.message);

    setAttendanceList(data || []);
  }

  async function fetchSubjects() {
    const { data, error } = await supabase
      .from("subjects")
      .select("id, name, level, grade")
      .order("name", { ascending: true });

    if (error) throw new Error(error.message);

    setSubjects(data || []);
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
        fetchAcademicReports(activeTeacher.id),
        fetchAttendance(activeTeacher.id),
        fetchSubjects(),
      ]);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengambil data murid.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPageData();

    const channel = supabase
      .channel("teacher-students-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        () => fetchPageData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teachers" },
        () => fetchPageData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "academic_reports" },
        () => fetchPageData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance" },
        () => fetchPageData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredStudents = useMemo(() => {
    const keyword = search.toLowerCase();

    return students.filter((student) => {
      const matchSearch =
        student.full_name.toLowerCase().includes(keyword) ||
        student.nis?.toLowerCase().includes(keyword) ||
        student.nisn?.toLowerCase().includes(keyword) ||
        student.parents?.full_name?.toLowerCase().includes(keyword);

      const matchLevel =
        levelFilter === "Semua Level" || student.level === levelFilter;

      const matchStatus =
        statusFilter === "Semua Status" || student.status === statusFilter;

      return matchSearch && matchLevel && matchStatus;
    });
  }, [students, search, levelFilter, statusFilter]);

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

  const activeStudents = students.filter(
    (student) => student.status === "active" || !student.status
  ).length;

  const primaryStudents = students.filter(
    (student) => student.level === "Primary Level"
  ).length;

  const secondaryStudents = students.filter(
    (student) => student.level === "Secondary Level"
  ).length;

  const averageScore = useMemo(() => {
    const scores = academicReports
      .map((report) => Number(report.final_score || 0))
      .filter((score) => score > 0);

    if (scores.length === 0) return 0;

    const total = scores.reduce((sum, score) => sum + score, 0);

    return Math.round(total / scores.length);
  }, [academicReports]);

  function getStudentAverageScore(studentId: string) {
    const reports = academicReports.filter(
      (report) => report.student_id === studentId
    );

    const scores = reports
      .map((report) => Number(report.final_score || 0))
      .filter((score) => score > 0);

    if (scores.length === 0) return 0;

    const total = scores.reduce((sum, score) => sum + score, 0);

    return Math.round(total / scores.length);
  }

  function getStudentAttendancePercentage(studentId: string) {
    const records = attendanceList.filter(
      (attendance) => attendance.student_id === studentId
    );

    if (records.length === 0) return 0;

    const present = records.filter(
      (attendance) => attendance.attendance_status === "Hadir"
    ).length;

    return Math.round((present / records.length) * 100);
  }

  function openReportModal(student?: Student) {
    setErrorMessage("");

    setReportForm({
      ...initialKbmForm,
      student_id: student?.id || "",
      class_level: student?.grade || "",
      report_date: getTodayDate(),
      status: "pending_review",
    });

    setIsReportModalOpen(true);
  }

  function closeReportModal() {
    setIsReportModalOpen(false);
    setErrorMessage("");

    setReportForm({
      ...initialKbmForm,
      report_date: getTodayDate(),
      status: "pending_review",
    });
  }

  function handleReportStudentChange(studentId: string) {
    const selectedStudent = students.find((student) => student.id === studentId);

    setReportForm({
      ...reportForm,
      student_id: studentId,
      class_level: selectedStudent?.grade || "",
    });
  }

  async function handleSubmitKbmReport(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setErrorMessage("");

    if (!teacher?.id) {
      setErrorMessage("Data guru aktif tidak ditemukan.");
      return;
    }

    if (!reportForm.student_id) {
      setErrorMessage("Murid wajib dipilih.");
      return;
    }

    if (!reportForm.subject_id) {
      setErrorMessage("Mata pelajaran wajib dipilih.");
      return;
    }

    if (!reportForm.report_date) {
      setErrorMessage("Tanggal laporan wajib diisi.");
      return;
    }

    if (!reportForm.material_topic.trim()) {
      setErrorMessage("Materi KBM wajib diisi.");
      return;
    }

    setSavingReport(true);

    try {
      const { error } = await supabase.from("kbm_reports").insert({
        student_id: reportForm.student_id,
        teacher_id: teacher.id,
        subject_id: reportForm.subject_id,
        report_date: reportForm.report_date,
        class_level: reportForm.class_level.trim() || null,
        semester: reportForm.semester,
        chapter: reportForm.chapter.trim() || null,
        material_topic: reportForm.material_topic.trim(),
        learning_issue: reportForm.learning_issue.trim() || null,
        solution: reportForm.solution.trim() || null,
        teacher_note: reportForm.teacher_note.trim() || null,
        status: reportForm.status,
      });

      if (error) {
        throw new Error(error.message);
      }

      closeReportModal();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal menyimpan laporan KBM.");
      }
    } finally {
      setSavingReport(false);
    }
  }

  return (
    <TeacherLayout
      activeMenu="Murid Saya"
      searchPlaceholder="Cari murid saya..."
      buttonLabel="+ Buat Laporan"
    >
      <div className="w-full max-w-full overflow-hidden">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#6B4A3A]">
              Teacher Portal
            </p>

            <h1 className="mt-1 text-[30px] font-bold tracking-tight">
              Murid Saya
            </h1>

            <p className="mt-1 text-sm text-[#6B4A3A]">
              Daftar murid yang terhubung dengan{" "}
              <span className="font-bold text-[#2B1B18]">
                {teacher?.full_name || "guru aktif"}
              </span>
              .
            </p>
          </div>

          <button
            type="button"
            onClick={() => openReportModal()}
            className="w-fit rounded-xl bg-[#7A1F2B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#54131D]"
          >
            + Buat Laporan
          </button>
        </div>

        {errorMessage && !isReportModalOpen && (
          <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {loading && (
          <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-8 text-center text-sm shadow-sm">
            Loading data murid...
          </div>
        )}

        {!loading && (
          <>
            <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6B4A3A]">Total Murid</p>
                <p className="mt-4 text-3xl font-bold">{students.length}</p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6B4A3A]">Murid Aktif</p>
                <p className="mt-4 text-3xl font-bold">{activeStudents}</p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6B4A3A]">Primary Level</p>
                <p className="mt-4 text-3xl font-bold">{primaryStudents}</p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6B4A3A]">Rata-rata Nilai</p>
                <p className="mt-4 text-3xl font-bold">{averageScore}</p>
              </div>
            </div>

            <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_220px]">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari nama murid, NIS, NISN, orang tua..."
                  className="w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                />

                <select
                  value={levelFilter}
                  onChange={(event) => setLevelFilter(event.target.value)}
                  className="rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                >
                  <option>Semua Level</option>
                  <option>Early Learning</option>
                  <option>Primary Level</option>
                  <option>Secondary Level</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                >
                  <option>Semua Status</option>
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
              <div className="overflow-hidden rounded-2xl border border-[#E8D6C1] bg-white shadow-sm">
                <div className="border-b border-[#E8D6C1] px-6 py-5">
                  <h2 className="text-lg font-bold">Daftar Murid</h2>
                  <p className="mt-1 text-sm text-[#6B4A3A]">
                    Murid aktif yang menjadi tanggung jawab guru.
                  </p>
                </div>

                <div className="divide-y divide-[#E8D6C1]">
                  {filteredStudents.length === 0 && (
                    <div className="px-6 py-10 text-center text-sm text-[#6B4A3A]">
                      Belum ada murid yang terhubung ke guru ini.
                    </div>
                  )}

                  {filteredStudents.map((student) => {
                    const score = getStudentAverageScore(student.id);
                    const attendance = getStudentAttendancePercentage(
                      student.id
                    );
                    const progress = Number(student.progress || score || 0);

                    return (
                      <div
                        key={student.id}
                        className="flex flex-col gap-4 px-6 py-5 transition hover:bg-[#FFF8EF] xl:flex-row xl:items-center xl:justify-between"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FDE7D7] text-sm font-bold text-[#7A1F2B]">
                            {getInitials(student.full_name)}
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-base font-bold">
                                {student.full_name}
                              </p>

                              <span
                                className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusBadge(
                                  student.status || "active"
                                )}`}
                              >
                                {student.status || "active"}
                              </span>
                            </div>

                            <p className="mt-1 text-sm text-[#6B4A3A]">
                              {student.level || "-"} • {student.grade || "-"} •{" "}
                              {student.academic_year || "-"}
                            </p>

                            <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-[#6B4A3A] md:grid-cols-2">
                              <p>
                                <span className="font-semibold text-[#2B1B18]">
                                  NIS:
                                </span>{" "}
                                {student.nis || "-"}
                              </p>

                              <p>
                                <span className="font-semibold text-[#2B1B18]">
                                  NISN:
                                </span>{" "}
                                {student.nisn || "-"}
                              </p>

                              <p>
                                <span className="font-semibold text-[#2B1B18]">
                                  Lahir:
                                </span>{" "}
                                {formatDate(student.birth_date)}
                              </p>

                              <p>
                                <span className="font-semibold text-[#2B1B18]">
                                  Orang Tua:
                                </span>{" "}
                                {student.parents?.full_name || "-"}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 xl:w-[260px]">
                          <div className="rounded-2xl bg-[#FFF8EF] p-4">
                            <p className="text-xs text-[#6B4A3A]">Nilai</p>
                            <p className="mt-2 text-2xl font-bold text-[#7A1F2B]">
                              {score}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-[#FFF8EF] p-4">
                            <p className="text-xs text-[#6B4A3A]">Absensi</p>
                            <p className="mt-2 text-2xl font-bold text-[#7A1F2B]">
                              {attendance}%
                            </p>
                          </div>

                          <div className="col-span-2">
                            <div className="mb-2 flex items-center justify-between text-xs">
                              <span className="text-[#6B4A3A]">Progress</span>
                              <span className="font-bold text-[#2B1B18]">
                                {progress}%
                              </span>
                            </div>

                            <div className="h-2 overflow-hidden rounded-full bg-[#F1DFD5]">
                              <div
                                className={`h-full rounded-full ${getProgressColor(
                                  progress
                                )}`}
                                style={{
                                  width: `${Math.min(100, progress)}%`,
                                }}
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => openReportModal(student)}
                            className="col-span-2 mt-2 rounded-xl bg-[#7A1F2B] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#54131D]"
                          >
                            + Buat Laporan
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold">Guru Aktif</h2>

                  <div className="mt-5 flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#7A1F2B] text-lg font-bold text-white">
                      {getInitials(teacher?.full_name || "Guru")}
                    </div>

                    <div>
                      <p className="font-bold">
                        {teacher?.full_name || "Belum ada guru"}
                      </p>
                      <p className="mt-1 text-sm text-[#6B4A3A]">
                        {teacher?.teacher_code || "-"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3 text-sm text-[#6B4A3A]">
                    <p>
                      <span className="font-semibold text-[#2B1B18]">
                        Email:
                      </span>{" "}
                      {teacher?.email || "-"}
                    </p>

                    <p>
                      <span className="font-semibold text-[#2B1B18]">
                        Telepon:
                      </span>{" "}
                      {teacher?.phone || "-"}
                    </p>

                    <p>
                      <span className="font-semibold text-[#2B1B18]">
                        Mapel:
                      </span>{" "}
                      {teacher?.subjects?.join(", ") || "-"}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold">Ringkasan Level</h2>

                  <div className="mt-5 space-y-4">
                    <div>
                      <div className="mb-2 flex justify-between text-sm">
                        <span>Primary Level</span>
                        <span className="font-bold">{primaryStudents}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#F1DFD5]">
                        <div
                          className="h-full rounded-full bg-[#7A1F2B]"
                          style={{
                            width:
                              students.length > 0
                                ? `${(primaryStudents / students.length) * 100}%`
                                : "0%",
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex justify-between text-sm">
                        <span>Secondary Level</span>
                        <span className="font-bold">{secondaryStudents}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#F1DFD5]">
                        <div
                          className="h-full rounded-full bg-[#D96B2B]"
                          style={{
                            width:
                              students.length > 0
                                ? `${
                                    (secondaryStudents / students.length) * 100
                                  }%`
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
                    akan menyimpan data ke table{" "}
                    <span className="font-bold text-[#2B1B18]">
                      kbm_reports
                    </span>
                    . Setelah disimpan, laporan akan muncul di menu Laporan KBM
                    dan menunggu review Kepala Sekolah.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
          <div className="flex max-h-[92vh] w-full max-w-[500px] flex-col overflow-hidden rounded-2xl bg-[#FAF3EA] shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-[#E8D6C1] px-6 py-5">
              <h2 className="text-xl font-bold">Buat Laporan KBM</h2>

              <button
                type="button"
                onClick={closeReportModal}
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

              <form onSubmit={handleSubmitKbmReport} className="space-y-4 pb-2">
                <div>
                  <label className="text-sm font-bold">Murid</label>
                  <select
                    value={reportForm.student_id}
                    onChange={(event) =>
                      handleReportStudentChange(event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  >
                    <option value="">Pilih murid</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.full_name} — {student.grade || "-"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-bold">Mata Pelajaran</label>
                  <select
                    value={reportForm.subject_id}
                    onChange={(event) =>
                      setReportForm({
                        ...reportForm,
                        subject_id: event.target.value,
                      })
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
                      value={reportForm.report_date}
                      onChange={(event) =>
                        setReportForm({
                          ...reportForm,
                          report_date: event.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold">Semester</label>
                    <select
                      value={reportForm.semester}
                      onChange={(event) =>
                        setReportForm({
                          ...reportForm,
                          semester: event.target.value,
                        })
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
                    value={reportForm.class_level}
                    onChange={(event) =>
                      setReportForm({
                        ...reportForm,
                        class_level: event.target.value,
                      })
                    }
                    placeholder="Contoh: Grade 4"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Bab / Unit</label>
                  <input
                    value={reportForm.chapter}
                    onChange={(event) =>
                      setReportForm({
                        ...reportForm,
                        chapter: event.target.value,
                      })
                    }
                    placeholder="Contoh: Bab 5 / Unit 8"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Materi KBM</label>
                  <input
                    value={reportForm.material_topic}
                    onChange={(event) =>
                      setReportForm({
                        ...reportForm,
                        material_topic: event.target.value,
                      })
                    }
                    placeholder="Contoh: Pecahan Senilai"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Masalah Belajar</label>
                  <textarea
                    value={reportForm.learning_issue}
                    onChange={(event) =>
                      setReportForm({
                        ...reportForm,
                        learning_issue: event.target.value,
                      })
                    }
                    rows={3}
                    placeholder="Contoh: Siswa masih kesulitan menyamakan penyebut"
                    className="mt-2 w-full resize-none rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Solusi</label>
                  <textarea
                    value={reportForm.solution}
                    onChange={(event) =>
                      setReportForm({
                        ...reportForm,
                        solution: event.target.value,
                      })
                    }
                    rows={3}
                    placeholder="Contoh: Latihan tambahan dengan visual pecahan"
                    className="mt-2 w-full resize-none rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Keterangan Guru</label>
                  <textarea
                    value={reportForm.teacher_note}
                    onChange={(event) =>
                      setReportForm({
                        ...reportForm,
                        teacher_note: event.target.value,
                      })
                    }
                    rows={3}
                    placeholder="Catatan guru terkait proses KBM"
                    className="mt-2 w-full resize-none rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Status</label>
                  <select
                    value={reportForm.status}
                    onChange={(event) =>
                      setReportForm({
                        ...reportForm,
                        status: event.target.value,
                      })
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
                    disabled={savingReport}
                    className="w-full rounded-xl bg-[#7A1F2B] py-3 text-sm font-bold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingReport ? "Menyimpan..." : "Simpan Laporan KBM"}
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