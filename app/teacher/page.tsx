"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import TeacherLayout from "./components/TeacherLayout";

type Teacher = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  teacher_code: string | null;
  subjects: string[] | null;
};

type Student = {
  id: string;
  full_name: string;
  nis: string | null;
  nisn: string | null;
  level: string | null;
  grade: string | null;
  academic_year: string | null;
  status: string | null;
  homeroom_teacher_id: string | null;
};

type SubjectRelation = {
  id: string;
  name: string;
};

type StudentRelation = {
  id: string;
  full_name: string;
  grade: string | null;
  level: string | null;
  nis: string | null;
  nisn: string | null;
};

type ScheduleRow = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  day_name: string | null;
  schedule_date: string | null;
  start_time: string | null;
  end_time: string | null;
  session_name: string | null;
  material_topic: string | null;
  academic_year: string | null;
  semester: string | null;
  students: StudentRelation | StudentRelation[] | null;
  subjects: SubjectRelation | SubjectRelation[] | null;
};

type Schedule = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  day_name: string | null;
  schedule_date: string | null;
  start_time: string | null;
  end_time: string | null;
  session_name: string | null;
  material_topic: string | null;
  academic_year: string | null;
  semester: string | null;
  students: StudentRelation | null;
  subjects: SubjectRelation | null;
};

type AttendanceRow = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  attendance_date: string | null;
  day_name: string | null;
  start_time: string | null;
  end_time: string | null;
  attendance_status: string | null;
  understanding_status: string | null;
  material_topic: string | null;
  notes: string | null;
  students: StudentRelation | StudentRelation[] | null;
  subjects: SubjectRelation | SubjectRelation[] | null;
};

type Attendance = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  attendance_date: string | null;
  day_name: string | null;
  start_time: string | null;
  end_time: string | null;
  attendance_status: string | null;
  understanding_status: string | null;
  material_topic: string | null;
  notes: string | null;
  students: StudentRelation | null;
  subjects: SubjectRelation | null;
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

type AcademicReportRow = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  report_period: string | null;
  report_type: string | null;
  uh_score: number | null;
  task_score: number | null;
  uts_score: number | null;
  uas_score: number | null;
  process_score: number | null;
  final_score: number | null;
  description: string | null;
  teacher_comment: string | null;
  status: string | null;
  created_at: string | null;
  students: StudentRelation | StudentRelation[] | null;
  subjects: SubjectRelation | SubjectRelation[] | null;
};

type AcademicReport = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  report_period: string | null;
  report_type: string | null;
  uh_score: number | null;
  task_score: number | null;
  uts_score: number | null;
  uas_score: number | null;
  process_score: number | null;
  final_score: number | null;
  description: string | null;
  teacher_comment: string | null;
  status: string | null;
  created_at: string | null;
  students: StudentRelation | null;
  subjects: SubjectRelation | null;
};

type AssignmentRow = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  title: string;
  description: string | null;
  deadline: string | null;
  status: string | null;
  score: number | null;
  file_url: string | null;
  created_at: string | null;
  students: StudentRelation | StudentRelation[] | null;
  subjects: SubjectRelation | SubjectRelation[] | null;
};

type Assignment = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  title: string;
  description: string | null;
  deadline: string | null;
  status: string | null;
  score: number | null;
  file_url: string | null;
  created_at: string | null;
  students: StudentRelation | null;
  subjects: SubjectRelation | null;
};

type GalleryRow = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  title: string;
  caption: string | null;
  image_url: string | null;
  activity_date: string | null;
  status: string | null;
  created_at: string | null;
  students: StudentRelation | StudentRelation[] | null;
  subjects: SubjectRelation | SubjectRelation[] | null;
};

type GalleryItem = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  title: string;
  caption: string | null;
  image_url: string | null;
  activity_date: string | null;
  status: string | null;
  created_at: string | null;
  students: StudentRelation | null;
  subjects: SubjectRelation | null;
};

function normalizeRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
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

function formatTime(time: string | null) {
  if (!time) return "-";

  return time.slice(0, 5);
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getStatusLabel(status: string | null) {
  if (status === "published") return "Published";
  if (status === "approved") return "Approved";
  if (status === "pending_review") return "Pending Review";
  if (status === "revision") return "Revision";
  if (status === "selesai") return "Selesai";
  if (status === "dikerjakan") return "Dikerjakan";
  if (status === "belum") return "Belum";

  return "Draft";
}

function getStatusBadge(status: string | null) {
  if (status === "published" || status === "approved" || status === "selesai") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "pending_review" || status === "dikerjakan") {
    return "bg-yellow-100 text-yellow-700";
  }

  if (status === "revision") {
    return "bg-red-100 text-red-700";
  }

  return "bg-slate-200 text-slate-700";
}

function getAttendanceBadge(status: string | null) {
  if (status === "Hadir") return "bg-emerald-100 text-emerald-700";
  if (status === "Sakit") return "bg-yellow-100 text-yellow-700";
  if (status === "Izin") return "bg-blue-100 text-blue-700";

  return "bg-red-100 text-red-700";
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

export default function TeacherDashboardPage() {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [attendanceList, setAttendanceList] = useState<Attendance[]>([]);
  const [kbmReports, setKbmReports] = useState<KbmReport[]>([]);
  const [academicReports, setAcademicReports] = useState<AcademicReport[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function fetchActiveTeacher() {
    const { data, error } = await supabase
      .from("teachers")
      .select("id, full_name, email, phone, teacher_code, subjects")
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);

    const teacherList = data || [];

    const sarahTeacher =
      teacherList.find((item) =>
        item.full_name?.toLowerCase().includes("sarah")
      ) || null;

    const selectedTeacher = sarahTeacher || teacherList[0] || null;

    setTeacher(selectedTeacher);

    return selectedTeacher;
  }

  async function fetchTeacherStudents(teacherId: string) {
    const { data, error } = await supabase
      .from("students")
      .select(
        `
        id,
        full_name,
        nis,
        nisn,
        level,
        grade,
        academic_year,
        status,
        homeroom_teacher_id
      `
      )
      .eq("homeroom_teacher_id", teacherId)
      .order("full_name", { ascending: true });

    if (error) throw new Error(error.message);

    setStudents(data || []);
  }

  async function fetchTeacherSchedules(teacherId: string) {
    const { data, error } = await supabase
      .from("schedules")
      .select(
        `
        id,
        student_id,
        teacher_id,
        subject_id,
        day_name,
        schedule_date,
        start_time,
        end_time,
        session_name,
        material_topic,
        academic_year,
        semester,
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
          name
        )
      `
      )
      .eq("teacher_id", teacherId)
      .order("schedule_date", { ascending: true });

    if (error) throw new Error(error.message);

    const rows = (data || []) as ScheduleRow[];

    const normalized: Schedule[] = rows.map((item) => ({
      id: item.id,
      student_id: item.student_id,
      teacher_id: item.teacher_id,
      subject_id: item.subject_id,
      day_name: item.day_name,
      schedule_date: item.schedule_date,
      start_time: item.start_time,
      end_time: item.end_time,
      session_name: item.session_name,
      material_topic: item.material_topic,
      academic_year: item.academic_year,
      semester: item.semester,
      students: normalizeRelation(item.students),
      subjects: normalizeRelation(item.subjects),
    }));

    setSchedules(normalized);
  }

  async function fetchTeacherAttendance(teacherId: string) {
    const { data, error } = await supabase
      .from("attendance")
      .select(
        `
        id,
        student_id,
        teacher_id,
        subject_id,
        attendance_date,
        day_name,
        start_time,
        end_time,
        attendance_status,
        understanding_status,
        material_topic,
        notes,
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
          name
        )
      `
      )
      .eq("teacher_id", teacherId)
      .order("attendance_date", { ascending: false });

    if (error) throw new Error(error.message);

    const rows = (data || []) as AttendanceRow[];

    const normalized: Attendance[] = rows.map((item) => ({
      id: item.id,
      student_id: item.student_id,
      teacher_id: item.teacher_id,
      subject_id: item.subject_id,
      attendance_date: item.attendance_date,
      day_name: item.day_name,
      start_time: item.start_time,
      end_time: item.end_time,
      attendance_status: item.attendance_status,
      understanding_status: item.understanding_status,
      material_topic: item.material_topic,
      notes: item.notes,
      students: normalizeRelation(item.students),
      subjects: normalizeRelation(item.subjects),
    }));

    setAttendanceList(normalized);
  }

  async function fetchTeacherKbmReports(teacherId: string) {
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
          name
        )
      `
      )
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const rows = (data || []) as KbmReportRow[];

    const normalized: KbmReport[] = rows.map((item) => ({
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

    setKbmReports(normalized);
  }

  async function fetchTeacherAcademicReports(teacherId: string) {
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
          name
        )
      `
      )
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const rows = (data || []) as AcademicReportRow[];

    const normalized: AcademicReport[] = rows.map((item) => ({
      id: item.id,
      student_id: item.student_id,
      teacher_id: item.teacher_id,
      subject_id: item.subject_id,
      report_period: item.report_period,
      report_type: item.report_type,
      uh_score: item.uh_score,
      task_score: item.task_score,
      uts_score: item.uts_score,
      uas_score: item.uas_score,
      process_score: item.process_score,
      final_score: item.final_score,
      description: item.description,
      teacher_comment: item.teacher_comment,
      status: item.status,
      created_at: item.created_at,
      students: normalizeRelation(item.students),
      subjects: normalizeRelation(item.subjects),
    }));

    setAcademicReports(normalized);
  }

  async function fetchTeacherAssignments(teacherId: string) {
    const { data, error } = await supabase
      .from("assignments")
      .select(
        `
        id,
        student_id,
        teacher_id,
        subject_id,
        title,
        description,
        deadline,
        status,
        score,
        file_url,
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
          name
        )
      `
      )
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const rows = (data || []) as AssignmentRow[];

    const normalized: Assignment[] = rows.map((item) => ({
      id: item.id,
      student_id: item.student_id,
      teacher_id: item.teacher_id,
      subject_id: item.subject_id,
      title: item.title,
      description: item.description,
      deadline: item.deadline,
      status: item.status,
      score: item.score,
      file_url: item.file_url,
      created_at: item.created_at,
      students: normalizeRelation(item.students),
      subjects: normalizeRelation(item.subjects),
    }));

    setAssignments(normalized);
  }

  async function fetchTeacherGallery(teacherId: string) {
    const { data, error } = await supabase
      .from("gallery")
      .select(
        `
        id,
        student_id,
        teacher_id,
        subject_id,
        title,
        caption,
        image_url,
        activity_date,
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
          name
        )
      `
      )
      .eq("teacher_id", teacherId)
      .order("activity_date", { ascending: false });

    if (error) throw new Error(error.message);

    const rows = (data || []) as GalleryRow[];

    const normalized: GalleryItem[] = rows.map((item) => ({
      id: item.id,
      student_id: item.student_id,
      teacher_id: item.teacher_id,
      subject_id: item.subject_id,
      title: item.title,
      caption: item.caption,
      image_url: item.image_url,
      activity_date: item.activity_date,
      status: item.status,
      created_at: item.created_at,
      students: normalizeRelation(item.students),
      subjects: normalizeRelation(item.subjects),
    }));

    setGallery(normalized);
  }

  async function fetchDashboardData() {
    setLoading(true);
    setErrorMessage("");

    try {
      const activeTeacher = await fetchActiveTeacher();

      if (!activeTeacher) {
        setLoading(false);
        setErrorMessage("Belum ada data guru di table teachers.");
        return;
      }

      await Promise.all([
        fetchTeacherStudents(activeTeacher.id),
        fetchTeacherSchedules(activeTeacher.id),
        fetchTeacherAttendance(activeTeacher.id),
        fetchTeacherKbmReports(activeTeacher.id),
        fetchTeacherAcademicReports(activeTeacher.id),
        fetchTeacherAssignments(activeTeacher.id),
        fetchTeacherGallery(activeTeacher.id),
      ]);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengambil data dashboard guru.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const todaySchedules = useMemo(() => {
    const today = getTodayDate();

    return schedules.filter((schedule) => {
      if (!schedule.schedule_date) return false;
      return schedule.schedule_date === today;
    });
  }, [schedules]);

  const todayAttendance = useMemo(() => {
    const today = getTodayDate();

    return attendanceList.filter((attendance) => {
      if (!attendance.attendance_date) return false;
      return attendance.attendance_date === today;
    });
  }, [attendanceList]);

  const attendancePercentage = useMemo(() => {
    if (attendanceList.length === 0) return 0;

    const present = attendanceList.filter(
      (attendance) => attendance.attendance_status === "Hadir"
    ).length;

    return Math.round((present / attendanceList.length) * 100);
  }, [attendanceList]);

  const averageScore = useMemo(() => {
    const scores = academicReports
      .map((report) => Number(report.final_score || 0))
      .filter((score) => score > 0);

    if (scores.length === 0) return 0;

    const total = scores.reduce((sum, score) => sum + score, 0);

    return Math.round(total / scores.length);
  }, [academicReports]);

  const pendingReports = useMemo(() => {
    const pendingKbm = kbmReports.filter(
      (report) => report.status === "pending_review" || report.status === "draft"
    );

    const pendingAcademic = academicReports.filter(
      (report) => report.status === "pending_review" || report.status === "draft"
    );

    return pendingKbm.length + pendingAcademic.length;
  }, [kbmReports, academicReports]);

  const latestReports = useMemo(() => {
    const kbm = kbmReports.map((report) => ({
      id: report.id,
      type: "KBM",
      title: report.material_topic || report.chapter || "Laporan KBM",
      studentName: report.students?.full_name || "-",
      subjectName: report.subjects?.name || "-",
      dateText: formatDate(report.report_date || report.created_at),
      status: report.status,
    }));

    const academic = academicReports.map((report) => ({
      id: report.id,
      type: "Akademik",
      title: report.report_period || "Laporan Akademik",
      studentName: report.students?.full_name || "-",
      subjectName: report.subjects?.name || "-",
      dateText: formatDate(report.created_at),
      status: report.status,
    }));

    return [...kbm, ...academic].slice(0, 5);
  }, [kbmReports, academicReports]);

  const subjectPerformance = useMemo(() => {
    const subjectMap = new Map<string, number[]>();

    academicReports.forEach((report) => {
      const subjectName = report.subjects?.name || "Lainnya";
      const score = Number(report.final_score || 0);

      if (score <= 0) return;

      if (!subjectMap.has(subjectName)) {
        subjectMap.set(subjectName, []);
      }

      subjectMap.get(subjectName)?.push(score);
    });

    return Array.from(subjectMap.entries())
      .map(([name, scores]) => {
        const total = scores.reduce((sum, score) => sum + score, 0);
        const average = Math.round(total / scores.length);

        return {
          name,
          value: average,
        };
      })
      .slice(0, 5);
  }, [academicReports]);

  return (
    <TeacherLayout
      activeMenu="Dashboard"
      searchPlaceholder="Cari murid, jadwal, atau laporan..."
      buttonLabel="+ Buat Laporan"
    >
      <div className="w-full max-w-full overflow-hidden">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#6B4A3A]">
              Dashboard Guru
            </p>

            <h1 className="mt-1 text-[30px] font-bold tracking-tight">
              Selamat datang, {teacher?.full_name || "Guru"} 👋
            </h1>

            <p className="mt-1 text-sm text-[#6B4A3A]">
              Ringkasan jadwal, murid, absensi, dan laporan pembelajaran.
            </p>
          </div>

          <button
            type="button"
            className="w-fit rounded-xl bg-[#7A1F2B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#54131D]"
          >
            + Buat Laporan
          </button>
        </div>

        {errorMessage && (
          <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {loading && (
          <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-8 text-center text-sm shadow-sm">
            Loading dashboard guru...
          </div>
        )}

        {!loading && (
          <>
            <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FDE7D7] text-xl">
                    👥
                  </div>

                  <span className="text-sm font-bold text-emerald-600">
                    Aktif
                  </span>
                </div>

                <p className="mt-7 text-3xl font-bold">{students.length}</p>
                <p className="mt-1 text-sm text-[#6B4A3A]">Murid Saya</p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F1DFD5] text-xl">
                    📅
                  </div>

                  <span className="text-sm font-bold text-[#D96B2B]">
                    Hari ini
                  </span>
                </div>

                <p className="mt-7 text-3xl font-bold">
                  {todaySchedules.length}
                </p>
                <p className="mt-1 text-sm text-[#6B4A3A]">Jadwal Hari Ini</p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-xl">
                    ☑️
                  </div>

                  <span className="text-sm font-bold text-emerald-600">
                    {attendancePercentage}%
                  </span>
                </div>

                <p className="mt-7 text-3xl font-bold">
                  {todayAttendance.length}
                </p>
                <p className="mt-1 text-sm text-[#6B4A3A]">Absensi Hari Ini</p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 text-xl">
                    📋
                  </div>

                  <span className="text-sm font-bold text-[#D96B2B]">
                    Draft/Review
                  </span>
                </div>

                <p className="mt-7 text-3xl font-bold">{pendingReports}</p>
                <p className="mt-1 text-sm text-[#6B4A3A]">Laporan Pending</p>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-1 gap-5 xl:grid-cols-[1.4fr_1fr]">
              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold">Jadwal Mengajar</h2>
                    <p className="mt-1 text-sm text-[#6B4A3A]">
                      Jadwal pembelajaran yang terhubung dengan guru aktif.
                    </p>
                  </div>

                  <button className="text-sm font-bold text-[#7A1F2B]">
                    Lihat semua →
                  </button>
                </div>

                <div className="mt-6 overflow-hidden rounded-2xl border border-[#E8D6C1]">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left">
                      <thead className="bg-[#FFF8EF] text-sm font-bold text-[#6B4A3A]">
                        <tr>
                          <th className="px-4 py-4">Hari</th>
                          <th className="px-4 py-4">Jam</th>
                          <th className="px-4 py-4">Siswa</th>
                          <th className="px-4 py-4">Kelas</th>
                          <th className="px-4 py-4">Mapel</th>
                          <th className="px-4 py-4">Materi</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-[#E8D6C1]">
                        {schedules.length === 0 && (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-4 py-8 text-center text-sm text-[#6B4A3A]"
                            >
                              Belum ada jadwal mengajar.
                            </td>
                          </tr>
                        )}

                        {schedules.slice(0, 5).map((schedule) => (
                          <tr key={schedule.id} className="hover:bg-[#FFF8EF]">
                            <td className="px-4 py-4 font-semibold">
                              {schedule.day_name || "-"}
                            </td>
                            <td className="px-4 py-4">
                              {formatTime(schedule.start_time)}-
                              {formatTime(schedule.end_time)}
                            </td>
                            <td className="px-4 py-4">
                              {schedule.students?.full_name || "-"}
                            </td>
                            <td className="px-4 py-4">
                              {schedule.students?.grade || "-"}
                            </td>
                            <td className="px-4 py-4">
                              {schedule.subjects?.name || "-"}
                            </td>
                            <td className="px-4 py-4">
                              {schedule.material_topic || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold">Performa Nilai</h2>
                <p className="mt-1 text-sm text-[#6B4A3A]">
                  Rata-rata nilai akademik siswa.
                </p>

                <div className="mt-6 rounded-2xl bg-[#FFF8EF] p-5">
                  <p className="text-sm text-[#6B4A3A]">Rata-rata Nilai</p>
                  <p className="mt-3 text-4xl font-bold text-[#7A1F2B]">
                    {averageScore}
                  </p>
                </div>

                <div className="mt-5 space-y-4">
                  {subjectPerformance.length === 0 && (
                    <div className="rounded-xl border border-[#E8D6C1] p-4 text-sm text-[#6B4A3A]">
                      Belum ada data nilai per mata pelajaran.
                    </div>
                  )}

                  {subjectPerformance.map((subject) => (
                    <div key={subject.name}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-semibold">{subject.name}</span>
                        <span className="font-bold text-[#7A1F2B]">
                          {subject.value}
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-[#F1DFD5]">
                        <div
                          className="h-full rounded-full bg-[#7A1F2B]"
                          style={{
                            width: `${Math.min(100, subject.value)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">Murid Saya</h2>

                  <button className="text-sm font-bold text-[#7A1F2B]">
                    Lihat semua →
                  </button>
                </div>

                <div className="mt-6 space-y-4">
                  {students.length === 0 && (
                    <div className="rounded-xl border border-[#E8D6C1] p-5 text-sm text-[#6B4A3A]">
                      Belum ada murid yang terhubung ke guru ini.
                    </div>
                  )}

                  {students.slice(0, 5).map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between rounded-2xl border border-[#E8D6C1] p-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FDE7D7] text-sm font-bold text-[#7A1F2B]">
                          {getInitials(student.full_name)}
                        </div>

                        <div>
                          <p className="font-bold">{student.full_name}</p>
                          <p className="mt-1 text-sm text-[#6B4A3A]">
                            {student.level || "-"} • {student.grade || "-"} •{" "}
                            {student.nis || "-"}
                          </p>
                        </div>
                      </div>

                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                        {student.status || "active"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">Absensi Terbaru</h2>

                  <button className="text-sm font-bold text-[#7A1F2B]">
                    Lihat semua →
                  </button>
                </div>

                <div className="mt-6 space-y-4">
                  {attendanceList.length === 0 && (
                    <div className="rounded-xl border border-[#E8D6C1] p-5 text-sm text-[#6B4A3A]">
                      Belum ada data absensi.
                    </div>
                  )}

                  {attendanceList.slice(0, 5).map((attendance) => (
                    <div
                      key={attendance.id}
                      className="flex items-center justify-between rounded-2xl border border-[#E8D6C1] p-4"
                    >
                      <div>
                        <p className="font-bold">
                          {attendance.students?.full_name || "-"}
                        </p>
                        <p className="mt-1 text-sm text-[#6B4A3A]">
                          {formatDate(attendance.attendance_date)} •{" "}
                          {attendance.subjects?.name || "-"} •{" "}
                          {attendance.material_topic || "-"}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${getAttendanceBadge(
                          attendance.attendance_status
                        )}`}
                      >
                        {attendance.attendance_status || "-"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_1fr]">
              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">Laporan Terbaru</h2>

                  <button className="text-sm font-bold text-[#7A1F2B]">
                    Lihat semua →
                  </button>
                </div>

                <div className="mt-6 divide-y divide-[#E8D6C1]">
                  {latestReports.length === 0 && (
                    <div className="py-6 text-center text-sm text-[#6B4A3A]">
                      Belum ada laporan terbaru.
                    </div>
                  )}

                  {latestReports.map((report) => (
                    <div
                      key={`${report.type}-${report.id}`}
                      className="flex items-center justify-between gap-4 py-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FDE7D7] text-sm font-bold text-[#7A1F2B]">
                          {report.type === "KBM" ? "KB" : "AK"}
                        </div>

                        <div>
                          <p className="font-bold">
                            {report.studentName} — {report.type}
                          </p>
                          <p className="mt-1 text-sm text-[#6B4A3A]">
                            {report.subjectName} • {report.title} •{" "}
                            {report.dateText}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${getStatusBadge(
                          report.status
                        )}`}
                      >
                        {getStatusLabel(report.status)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold">Tugas & Gallery</h2>
                <p className="mt-1 text-sm text-[#6B4A3A]">
                  Ringkasan assignment dan dokumentasi kegiatan.
                </p>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-[#FFF8EF] p-5">
                    <p className="text-sm text-[#6B4A3A]">Total Tugas</p>
                    <p className="mt-3 text-3xl font-bold">
                      {assignments.length}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#FFF8EF] p-5">
                    <p className="text-sm text-[#6B4A3A]">Gallery</p>
                    <p className="mt-3 text-3xl font-bold">{gallery.length}</p>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {assignments.slice(0, 3).map((assignment) => (
                    <div
                      key={assignment.id}
                      className="rounded-2xl border border-[#E8D6C1] p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-bold">{assignment.title}</p>
                          <p className="mt-1 text-sm text-[#6B4A3A]">
                            {assignment.students?.full_name || "-"} •{" "}
                            {assignment.subjects?.name || "-"} • Deadline{" "}
                            {formatDate(assignment.deadline)}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusBadge(
                            assignment.status
                          )}`}
                        >
                          {getStatusLabel(assignment.status)}
                        </span>
                      </div>
                    </div>
                  ))}

                  {assignments.length === 0 && (
                    <div className="rounded-xl border border-[#E8D6C1] p-5 text-sm text-[#6B4A3A]">
                      Belum ada tugas yang dibuat.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </TeacherLayout>
  );
}