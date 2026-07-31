"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import StudentLayout from "./components/StudentLayout";

type StudentRow = {
  id: string;
  full_name: string | null;
  email?: string | null;
  user_id?: string | null;
  grade: string | null;
  level: string | null;
  nis?: string | null;
  nisn?: string | null;
  parent_id?: string | null;
};

type ParentRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type TeacherRow = {
  id: string;
  full_name: string | null;
};

type SubjectRow = {
  id: string;
  name: string | null;
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
  duration_minutes?: number | null;
  notes?: string | null;
  academic_year?: string | null;
};

type AttendanceRow = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  attendance_date: string | null;
  attendance_status: string | null;
  understanding_status?: string | null;
  material_topic?: string | null;
  note?: string | null;
  notes?: string | null;
};

type AcademicReportRow = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  report_period: string | null;
  report_type: string | null;
  final_grade?: number | null;
  final_score?: number | null;
  predicate?: string | null;
  description?: string | null;
  approval_status?: string | null;
  status?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

type KbmReportRow = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  report_date: string | null;
  material_topic: string | null;
  teacher_note: string | null;
  status: string | null;
};

type EnrichedSchedule = ScheduleRow & {
  teacher_name: string;
  subject_name: string;
};

type SubjectScore = {
  subject_id: string;
  subject_name: string;
  score: number;
  predicate: string;
  period: string;
};

const ACADEMIC_YEAR = "2026/2027";
const ACADEMIC_YEAR_START = "2026-07-01";
const ACADEMIC_YEAR_END = "2027-06-30";

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(date?: string | null) {
  if (!date) return "-";

  const parsedDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
}

function formatTime(time?: string | null) {
  if (!time) return "-";
  return time.slice(0, 5);
}

function formatDuration(minutes?: number | null) {
  if (!minutes) return "-";

  if (minutes < 60) return `${minutes} menit`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) return `${hours} jam`;

  return `${hours} jam ${remainingMinutes} menit`;
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

function getAttendanceStatus(status?: string | null) {
  if (status === "Tidak Hadir") return "Alpa";
  return status || "-";
}

function getScoreValue(report: AcademicReportRow) {
  const value = report.final_grade ?? report.final_score ?? null;

  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }

  return Number(value);
}

function getProgressPercentage(scores: SubjectScore[]) {
  if (scores.length === 0) return 0;

  const total = scores.reduce((sum, item) => sum + item.score, 0);

  return Math.round(total / scores.length);
}

export default function StudentDashboardPage() {
  const [student, setStudent] = useState<StudentRow | null>(null);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [academicReports, setAcademicReports] = useState<AcademicReportRow[]>([]);
  const [kbmReports, setKbmReports] = useState<KbmReportRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function fetchActiveStudent() {
    const { data: authData } = await supabase.auth.getUser();

    const userId = authData.user?.id || "";

    const email =
      authData.user?.email ||
      localStorage.getItem("hstkb_email") ||
      localStorage.getItem("hstkb_demo_email") ||
      "";

    if (userId) {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (data) return data as StudentRow;
    }

    if (email) {
      const normalizedEmail = email.trim().toLowerCase();

      const { data: studentByEmail, error: studentEmailError } = await supabase
        .from("students")
        .select("*")
        .eq("email", normalizedEmail)
        .limit(1)
        .maybeSingle();

      if (studentEmailError) throw new Error(studentEmailError.message);
      if (studentByEmail) return studentByEmail as StudentRow;

      const { data: parentData, error: parentError } = await supabase
        .from("parents")
        .select("id, full_name, email")
        .eq("email", normalizedEmail)
        .limit(1)
        .maybeSingle();

      if (parentError) throw new Error(parentError.message);

      const parent = parentData as ParentRow | null;

      if (parent?.id) {
        const { data: studentByParent, error: studentParentError } =
          await supabase
            .from("students")
            .select("*")
            .eq("parent_id", parent.id)
            .order("full_name", { ascending: true })
            .limit(1)
            .maybeSingle();

        if (studentParentError) throw new Error(studentParentError.message);
        if (studentByParent) return studentByParent as StudentRow;
      }
    }

    return null;
  }

  async function fetchPageData() {
    setLoading(true);
    setErrorMessage("");

    try {
      const activeStudent = await fetchActiveStudent();

      setStudent(activeStudent);

      if (!activeStudent?.id) {
        setErrorMessage(
          "Data murid belum terhubung dengan akun login ini. Silakan hubungkan user_id/email murid atau parent_id terlebih dahulu."
        );
        setTeachers([]);
        setSubjects([]);
        setSchedules([]);
        setAttendance([]);
        setAcademicReports([]);
        setKbmReports([]);
        setLoading(false);
        return;
      }

      const [
        teachersRes,
        subjectsRes,
        schedulesRes,
        attendanceRes,
        academicRes,
        kbmRes,
      ] = await Promise.all([
        supabase.from("teachers").select("id, full_name"),
        supabase.from("subjects").select("id, name"),
        supabase
          .from("schedules")
          .select(
            "id, student_id, teacher_id, subject_id, day_name, schedule_date, start_time, end_time, session_name, material_topic, duration_minutes, notes, academic_year"
          )
          .eq("student_id", activeStudent.id)
          .gte("schedule_date", ACADEMIC_YEAR_START)
          .lte("schedule_date", ACADEMIC_YEAR_END)
          .order("schedule_date", { ascending: true })
          .order("start_time", { ascending: true }),
        supabase
          .from("attendance")
          .select("*")
          .eq("student_id", activeStudent.id),
        supabase
          .from("academic_reports")
          .select("*")
          .eq("student_id", activeStudent.id)
          .or("approval_status.eq.approved,status.eq.approved,status.eq.published")
          .order("updated_at", { ascending: false }),
        supabase
          .from("kbm_reports")
          .select("*")
          .eq("student_id", activeStudent.id)
          .or("status.eq.approved,status.eq.published")
          .order("report_date", { ascending: false })
          .limit(5),
      ]);

      if (teachersRes.error) throw new Error(teachersRes.error.message);
      if (subjectsRes.error) throw new Error(subjectsRes.error.message);
      if (schedulesRes.error) throw new Error(schedulesRes.error.message);
      if (attendanceRes.error) throw new Error(attendanceRes.error.message);
      if (academicRes.error) throw new Error(academicRes.error.message);
      if (kbmRes.error) throw new Error(kbmRes.error.message);

      setTeachers((teachersRes.data || []) as TeacherRow[]);
      setSubjects((subjectsRes.data || []) as SubjectRow[]);
      setSchedules((schedulesRes.data || []) as ScheduleRow[]);
      setAttendance((attendanceRes.data || []) as AttendanceRow[]);
      setAcademicReports((academicRes.data || []) as AcademicReportRow[]);
      setKbmReports((kbmRes.data || []) as KbmReportRow[]);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengambil data dashboard murid.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPageData();

    const channel = supabase
      .channel("student-dashboard-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        fetchPageData
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "parents" },
        fetchPageData
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "schedules" },
        fetchPageData
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance" },
        fetchPageData
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "academic_reports" },
        fetchPageData
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "kbm_reports" },
        fetchPageData
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const teacherMap = useMemo(() => {
    return new Map(teachers.map((teacher) => [teacher.id, teacher]));
  }, [teachers]);

  const subjectMap = useMemo(() => {
    return new Map(subjects.map((subject) => [subject.id, subject]));
  }, [subjects]);

  const todaySchedules = useMemo<EnrichedSchedule[]>(() => {
    const today = getTodayDate();

    return schedules
      .filter((schedule) => {
        const matchDate = schedule.schedule_date === today;

        const matchAcademicYear =
          !schedule.academic_year || schedule.academic_year === ACADEMIC_YEAR;

        return matchDate && matchAcademicYear;
      })
      .map((schedule) => ({
        ...schedule,
        teacher_name: schedule.teacher_id
          ? teacherMap.get(schedule.teacher_id)?.full_name || "-"
          : "-",
        subject_name: schedule.subject_id
          ? subjectMap.get(schedule.subject_id)?.name || "-"
          : "-",
      }));
  }, [schedules, teacherMap, subjectMap]);

  const latestSubjectScores = useMemo<SubjectScore[]>(() => {
    const map = new Map<string, SubjectScore>();

    academicReports.forEach((report) => {
      if (!report.subject_id) return;
      if (map.has(report.subject_id)) return;

      const score = getScoreValue(report);
      if (score === null) return;

      map.set(report.subject_id, {
        subject_id: report.subject_id,
        subject_name: subjectMap.get(report.subject_id)?.name || "-",
        score,
        predicate: report.predicate || report.description || "-",
        period: report.report_period || "-",
      });
    });

    return Array.from(map.values()).slice(0, 6);
  }, [academicReports, subjectMap]);

  const attendanceSummary = useMemo(() => {
    const total = attendance.length;

    const hadir = attendance.filter(
      (item) => getAttendanceStatus(item.attendance_status) === "Hadir"
    ).length;

    const percentage = total > 0 ? Math.round((hadir / total) * 100) : 0;

    return {
      total,
      hadir,
      percentage,
    };
  }, [attendance]);

  const progressPercentage = getProgressPercentage(latestSubjectScores);
  const latestReportsCount = academicReports.length + kbmReports.length;

  return (
    <StudentLayout activeMenu={"Dashboard Saya" as any}>
      <div className="w-full max-w-full overflow-hidden">
        <div className="rounded-2xl bg-gradient-to-r from-[#7A1F2B] to-[#06254a] p-8 text-white shadow-sm">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
                {getInitials(student?.full_name || "Murid")}
              </div>

              <div>
                <p className="text-xs font-bold tracking-[0.2em] text-white/60">
                  HALO, SEMANGAT BELAJAR!
                </p>

                <h1 className="mt-2 text-[30px] font-bold tracking-tight">
                  {student?.full_name || "Murid"}
                </h1>

                <p className="mt-1 text-sm text-white/75">
                  {student?.level || "-"} — {student?.grade || "-"}
                </p>

                <p className="mt-1 text-xs font-semibold text-white/60">
                  NIPD: {student?.nis || "-"} • NISN: {student?.nisn || "-"}
                </p>
              </div>
            </div>

            <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-3 xl:flex-1">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-[#D96B2B]">⌁</p>
                <p className="mt-2 text-2xl font-bold">{progressPercentage}%</p>
                <p className="text-xs text-white/60">Progress Nilai</p>
              </div>

              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-[#D96B2B]">📅</p>
                <p className="mt-2 text-2xl font-bold">
                  {attendanceSummary.percentage}%
                </p>
                <p className="text-xs text-white/60">Attendance</p>
              </div>

              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-[#D96B2B]">📄</p>
                <p className="mt-2 text-2xl font-bold">{latestReportsCount}</p>
                <p className="text-xs text-white/60">Laporan</p>
              </div>
            </div>

            <a
              href="/student/progress"
              className="w-fit rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#7A1F2B]"
            >
              Lihat Progress →
            </a>
          </div>
        </div>

        {errorMessage ? (
          <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-8 text-center text-sm shadow-sm">
            Loading dashboard murid...
          </div>
        ) : !student ? (
          <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-8 text-center text-sm leading-6 text-[#6B4A3A] shadow-sm">
            Data murid belum terhubung dengan akun ini.
            <br />
            Pastikan akun login sudah dihubungkan ke tabel students melalui
            kolom <b>user_id</b> atau <b>email</b>. Untuk akun orang tua,
            hubungkan melalui <b>parent_id</b>.
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[2fr_1fr]">
            <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
              <div className="mb-7">
                <h2 className="text-lg font-bold">Nilai Subject Terbaru</h2>
                <p className="text-sm text-[#6B4A3A]">
                  Data dari Laporan Akademik yang sudah approved/published
                </p>
              </div>

              {latestSubjectScores.length === 0 ? (
                <div className="rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] p-5 text-sm leading-6 text-[#6B4A3A]">
                  Belum ada nilai akademik yang dipublish untuk murid ini.
                </div>
              ) : (
                <div className="space-y-5">
                  {latestSubjectScores.map((item) => (
                    <div key={item.subject_id}>
                      <div className="mb-2 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold">
                            {item.subject_name}
                          </p>
                          <p className="text-xs text-[#6B4A3A]">{item.period}</p>
                        </div>

                        <div className="flex items-center gap-3">
                          <p className="text-sm text-[#6B4A3A]">
                            {item.score}/100
                          </p>
                          <p className="text-xs font-bold text-emerald-600">
                            {item.predicate}
                          </p>
                        </div>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-[#E8D6C1]">
                        <div
                          className="h-full rounded-full bg-[#7A1F2B]"
                          style={{ width: `${Math.min(item.score, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <h2 className="text-lg font-bold">Jadwal Hari Ini</h2>
                  <a
                    href="/student/jadwal"
                    className="text-sm font-bold text-[#7A1F2B]"
                  >
                    Lihat semua →
                  </a>
                </div>

                {todaySchedules.length === 0 ? (
                  <div className="rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] p-4 text-sm text-[#6B4A3A]">
                    Tidak ada jadwal hari ini.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todaySchedules.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F1DFD5] text-[#7A1F2B]">
                              ◷
                            </div>

                            <div>
                              <p className="font-bold">{item.subject_name}</p>
                              <p className="text-sm text-[#6B4A3A]">
                                {item.teacher_name}
                              </p>
                            </div>
                          </div>

                          <p className="font-bold text-[#7A1F2B]">
                            {formatTime(item.start_time)}
                          </p>
                        </div>

                        <div className="mt-3 rounded-xl bg-white px-3 py-2 text-xs leading-5 text-[#6B4A3A]">
                          <p>
                            {formatTime(item.start_time)} -{" "}
                            {formatTime(item.end_time)} •{" "}
                            {formatDuration(item.duration_minutes)}
                          </p>

                          <p className="font-semibold text-[#2B1B18]">
                            Materi: {item.material_topic || "-"}
                          </p>

                          {item.notes ? <p>Keterangan: {item.notes}</p> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold">Laporan Terbaru</h2>
                <p className="mt-1 text-sm text-[#6B4A3A]">
                  Ringkasan laporan KBM dan akademik yang sudah disetujui.
                </p>

                <div className="mt-5 space-y-3">
                  {kbmReports.length === 0 && academicReports.length === 0 ? (
                    <div className="rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] p-4 text-sm text-[#6B4A3A]">
                      Belum ada laporan terbaru.
                    </div>
                  ) : null}

                  {kbmReports.slice(0, 3).map((report) => (
                    <div
                      key={report.id}
                      className="rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] p-4"
                    >
                      <p className="text-xs font-bold uppercase tracking-wide text-[#7A1F2B]">
                        Laporan KBM
                      </p>
                      <p className="mt-1 font-bold text-[#2B1B18]">
                        {report.material_topic || "-"}
                      </p>
                      <p className="mt-1 text-xs text-[#6B4A3A]">
                        {formatDate(report.report_date)}
                      </p>
                    </div>
                  ))}

                  {academicReports.slice(0, 2).map((report) => (
                    <div
                      key={report.id}
                      className="rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] p-4"
                    >
                      <p className="text-xs font-bold uppercase tracking-wide text-[#7A1F2B]">
                        Laporan Akademik
                      </p>
                      <p className="mt-1 font-bold text-[#2B1B18]">
                        {report.report_period || "-"} • Nilai{" "}
                        {getScoreValue(report) || "-"}
                      </p>
                      <p className="mt-1 text-xs text-[#6B4A3A]">
                        {report.predicate || report.description || "-"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </StudentLayout>
  );
}