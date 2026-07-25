"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  Clock,
  FileText,
  GraduationCap,
  Search,
  UserRound,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import StudentLayout from "../components/StudentLayout";

type StudentRow = {
  id: string;
  full_name: string | null;
  level: string | null;
  grade: string | null;
  nis: string | null;
  nisn: string | null;
  email?: string | null;
  user_id?: string | null;
  parent_id?: string | null;
};

type TeacherRelation = {
  id: string;
  full_name: string | null;
  email?: string | null;
  teacher_code?: string | null;
};

type SubjectRelation = {
  id: string;
  name: string | null;
  level?: string | null;
  grade?: string | null;
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
  temporary_schedule_url?: string | null;
  academic_year?: string | null;
  semester?: string | null;
  created_at?: string | null;
  teachers?: TeacherRelation | TeacherRelation[] | null;
  subjects?: SubjectRelation | SubjectRelation[] | null;
};

type ScheduleItem = {
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
  duration_minutes: number | null;
  notes: string | null;
  temporary_schedule_url: string | null;
  academic_year: string | null;
  semester: string | null;
  teacher_name: string;
  subject_name: string;
};

type DayScheduleGroup = {
  day: string;
  isToday: boolean;
  schedules: ScheduleItem[];
};

const ACADEMIC_YEAR = "2026/2027";
const ACADEMIC_YEAR_START = "2026-07-01";
const ACADEMIC_YEAR_END = "2027-06-30";

const dayOrder = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

function normalizeRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function normalizeText(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function toYMD(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function todayYMD() {
  return toYMD(new Date());
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatTime(value?: string | null) {
  if (!value) return "-";
  return value.slice(0, 5);
}

function getDayNameFromDate(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
  }).format(new Date(`${value}T00:00:00`));
}

function getInitials(name?: string | null) {
  if (!name) return "M";

  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDuration(minutes?: number | null) {
  if (!minutes) return "-";

  if (minutes < 60) return `${minutes} menit`;

  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;

  if (minute === 0) return `${hour} jam`;

  return `${hour} jam ${minute} menit`;
}

function getDayIndex(dayName?: string | null) {
  const index = dayOrder.findIndex((day) => day === dayName);
  return index === -1 ? 99 : index;
}

function getSessionBadge(session?: string | null) {
  if (session === "Sesi 1") return "bg-emerald-100 text-emerald-700";
  if (session === "Sesi 2") return "bg-blue-100 text-blue-700";
  if (session === "Sesi 3") return "bg-purple-100 text-purple-700";

  return "bg-slate-100 text-slate-700";
}

function isAcademicYearSchedule(schedule: ScheduleRow) {
  if (!schedule.schedule_date) return false;

  const matchDate =
    schedule.schedule_date >= ACADEMIC_YEAR_START &&
    schedule.schedule_date <= ACADEMIC_YEAR_END;

  const matchYear =
    !schedule.academic_year || schedule.academic_year === ACADEMIC_YEAR;

  return matchDate && matchYear;
}

function getScheduleSearchText(schedule: ScheduleItem) {
  return [
    schedule.day_name,
    schedule.schedule_date,
    schedule.start_time,
    schedule.end_time,
    schedule.session_name,
    schedule.material_topic,
    schedule.teacher_name,
    schedule.subject_name,
    schedule.notes,
    schedule.semester,
  ]
    .filter(Boolean)
    .join(" ");
}

export default function StudentSchedulePage() {
  const [student, setStudent] = useState<StudentRow | null>(null);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [search, setSearch] = useState("");
  const [dayFilter, setDayFilter] = useState("Semua Hari");
  const [subjectFilter, setSubjectFilter] = useState("Semua Mapel");
  const [dateFilter, setDateFilter] = useState("");

  async function findStudentByLoggedInUser() {
    const { data: authData } = await supabase.auth.getUser();

    const authUserId = authData.user?.id || "";
    const authEmail =
      authData.user?.email ||
      localStorage.getItem("hstkb_demo_email") ||
      localStorage.getItem("hstkb_email") ||
      "";

    if (!authEmail && !authUserId) return null;

    if (authUserId && authEmail) {
      const { data } = await supabase
        .from("students")
        .select("id, full_name, level, grade, nis, nisn, email, user_id, parent_id")
        .or(`user_id.eq.${authUserId},email.eq.${authEmail}`)
        .limit(1)
        .maybeSingle();

      if (data) return data as StudentRow;
    }

    if (authEmail) {
      const { data: parentData } = await supabase
        .from("parents")
        .select("id, email")
        .eq("email", authEmail)
        .limit(1)
        .maybeSingle();

      if (parentData?.id) {
        const { data: childData } = await supabase
          .from("students")
          .select("id, full_name, level, grade, nis, nisn, email, user_id, parent_id")
          .eq("parent_id", parentData.id)
          .order("full_name", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (childData) return childData as StudentRow;
      }
    }

    return null;
  }

  async function fetchSchedules(studentId: string) {
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
        duration_minutes,
        notes,
        temporary_schedule_url,
        academic_year,
        semester,
        created_at,
        teachers (
          id,
          full_name,
          email,
          teacher_code
        ),
        subjects (
          id,
          name,
          level,
          grade
        )
      `
      )
      .eq("student_id", studentId)
      .gte("schedule_date", ACADEMIC_YEAR_START)
      .lte("schedule_date", ACADEMIC_YEAR_END)
      .order("schedule_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) throw new Error(error.message);

    const rows = (data || []) as ScheduleRow[];

    const normalized = rows.filter(isAcademicYearSchedule).map((item) => {
      const teacher = normalizeRelation(item.teachers);
      const subject = normalizeRelation(item.subjects);

      return {
        id: item.id,
        student_id: item.student_id,
        teacher_id: item.teacher_id,
        subject_id: item.subject_id,
        day_name: item.day_name || getDayNameFromDate(item.schedule_date),
        schedule_date: item.schedule_date,
        start_time: item.start_time,
        end_time: item.end_time,
        session_name: item.session_name,
        material_topic: item.material_topic,
        duration_minutes: item.duration_minutes || null,
        notes: item.notes || null,
        temporary_schedule_url: item.temporary_schedule_url || null,
        academic_year: item.academic_year || null,
        semester: item.semester || null,
        teacher_name: teacher?.full_name || "-",
        subject_name: subject?.name || "-",
      };
    });

    setSchedules(normalized);
  }

  async function fetchPageData() {
    setLoading(true);
    setErrorMessage("");

    try {
      const activeStudent = await findStudentByLoggedInUser();

      if (!activeStudent) {
        setStudent(null);
        setSchedules([]);
        setErrorMessage(
          "Data murid belum terhubung dengan akun login ini. Hubungkan email/user_id murid atau parent_id orang tua di Supabase."
        );
        return;
      }

      setStudent(activeStudent);
      await fetchSchedules(activeStudent.id);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengambil jadwal belajar murid.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPageData();

    const channel = supabase
      .channel("student-schedule-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        () => fetchPageData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "parents" },
        () => fetchPageData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "schedules" },
        () => fetchPageData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const subjectOptions = useMemo(() => {
    const subjects = schedules.map((schedule) => schedule.subject_name).filter(Boolean);
    return Array.from(new Set(subjects)).sort();
  }, [schedules]);

  const filteredSchedules = useMemo(() => {
    const q = normalizeText(search);

    return schedules.filter((schedule) => {
      const matchSearch = !q || normalizeText(getScheduleSearchText(schedule)).includes(q);

      const matchDay =
        dayFilter === "Semua Hari" || schedule.day_name === dayFilter;

      const matchSubject =
        subjectFilter === "Semua Mapel" || schedule.subject_name === subjectFilter;

      const matchDate = !dateFilter || schedule.schedule_date === dateFilter;

      return matchSearch && matchDay && matchSubject && matchDate;
    });
  }, [schedules, search, dayFilter, subjectFilter, dateFilter]);

  const groupedSchedules = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();

    filteredSchedules.forEach((schedule) => {
      const day = schedule.day_name || "-";
      const current = map.get(day) || [];

      current.push(schedule);
      map.set(day, current);
    });

    const today = todayYMD();

    const groups: DayScheduleGroup[] = Array.from(map.entries()).map(
      ([day, items]) => ({
        day,
        isToday: items.some((item) => item.schedule_date === today),
        schedules: items.sort((a, b) => {
          const dateDiff = (a.schedule_date || "").localeCompare(b.schedule_date || "");
          if (dateDiff !== 0) return dateDiff;
          return (a.start_time || "").localeCompare(b.start_time || "");
        }),
      })
    );

    return groups.sort((a, b) => getDayIndex(a.day) - getDayIndex(b.day));
  }, [filteredSchedules]);

  const todaySchedules = useMemo(() => {
    const today = todayYMD();
    return schedules.filter((schedule) => schedule.schedule_date === today);
  }, [schedules]);

  const summary = useMemo(() => {
    const teachers = new Set(schedules.map((schedule) => schedule.teacher_id).filter(Boolean));
    const subjects = new Set(schedules.map((schedule) => schedule.subject_id).filter(Boolean));

    return {
      totalSchedules: schedules.length,
      today: todaySchedules.length,
      teachers: teachers.size,
      subjects: subjects.size,
    };
  }, [schedules, todaySchedules]);

  return (
    <StudentLayout activeMenu="Jadwal Belajar">
      <section className="space-y-7">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#8A5A48]">
              Student Portal
            </p>

            <h1 className="mt-2 text-[30px] font-extrabold tracking-[-0.02em] text-[#2B1B18]">
              Jadwal Belajar
            </h1>

            <p className="mt-2 text-[15px] leading-6 text-[#6F5549]">
              {student ? (
                <>
                  Jadwal pembelajaran untuk{" "}
                  <span className="font-extrabold text-[#2B1B18]">
                    {student.full_name || "-"}
                  </span>{" "}
                  • {student.level || "-"} — {student.grade || "-"} • NIPD:{" "}
                  {student.nis || "-"} • NISN: {student.nisn || "-"}
                </>
              ) : (
                "Jadwal pembelajaran murid."
              )}
            </p>

            <p className="mt-1 text-[13px] font-bold text-[#8A5A48]">
              Academic Year {ACADEMIC_YEAR}
            </p>
          </div>

          <a
            href="/student"
            className="flex h-11 w-fit items-center rounded-xl border border-[#DCC8B6] bg-white px-5 text-[14px] font-extrabold text-[#8C0F2D] shadow-sm transition hover:bg-[#FFF8EF]"
          >
            ← Kembali Dashboard
          </a>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-[14px] leading-6 text-red-700">
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p>{errorMessage}</p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={<CalendarDays className="h-5 w-5" />}
            label="Total Jadwal"
            value={summary.totalSchedules}
            info="Sesi"
            tone="pink"
          />
          <SummaryCard
            icon={<Clock className="h-5 w-5" />}
            label="Jadwal Hari Ini"
            value={summary.today}
            info={formatDate(todayYMD())}
            tone="orange"
          />
          <SummaryCard
            icon={<BookOpen className="h-5 w-5" />}
            label="Mata Pelajaran"
            value={summary.subjects}
            info="Mapel"
            tone="blue"
          />
          <SummaryCard
            icon={<UserRound className="h-5 w-5" />}
            label="Guru Pengajar"
            value={summary.teachers}
            info="Guru"
            tone="green"
          />
        </div>

        <div className="rounded-[22px] border border-[#E1CFBE] bg-white p-5 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-[1.4fr_190px_220px_180px]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8E6A58]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari jadwal, mapel, guru, materi, atau keterangan..."
                className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] pl-11 pr-4 text-[14px] outline-none placeholder:text-[#9A7B6C] focus:border-[#9C0824]"
              />
            </div>

            <select
              value={dayFilter}
              onChange={(event) => setDayFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              <option>Semua Hari</option>
              {dayOrder.map((day) => (
                <option key={day}>{day}</option>
              ))}
            </select>

            <select
              value={subjectFilter}
              onChange={(event) => setSubjectFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              <option>Semua Mapel</option>
              {subjectOptions.map((subject) => (
                <option key={subject}>{subject}</option>
              ))}
            </select>

            <input
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            />
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
          <div className="space-y-5">
            {loading ? (
              <div className="rounded-[22px] border border-[#E1CFBE] bg-white px-6 py-12 text-center text-[#6F5549] shadow-sm">
                Memuat jadwal belajar...
              </div>
            ) : groupedSchedules.length === 0 ? (
              <div className="rounded-[22px] border border-[#E1CFBE] bg-white px-6 py-12 text-center text-[#6F5549] shadow-sm">
                Belum ada jadwal belajar untuk murid ini.
              </div>
            ) : (
              groupedSchedules.map((group) => (
                <div
                  key={group.day}
                  className="overflow-hidden rounded-[22px] border border-[#E1CFBE] bg-white shadow-sm"
                >
                  <div className="flex items-center justify-between border-b border-[#EADACA] bg-[#FFF8EF] px-6 py-5">
                    <div>
                      <h2 className="text-[20px] font-extrabold text-[#2B1B18]">
                        {group.day}
                      </h2>
                      <p className="mt-1 text-[13px] text-[#6F5549]">
                        {group.schedules.length} jadwal
                      </p>
                    </div>

                    {group.isToday ? (
                      <span className="rounded-full bg-[#8C0F2D] px-3 py-1 text-[12px] font-extrabold text-white">
                        HARI INI
                      </span>
                    ) : null}
                  </div>

                  <div className="divide-y divide-[#F0E1D4]">
                    {group.schedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        className="grid gap-4 px-6 py-5 md:grid-cols-[160px_1fr_180px]"
                      >
                        <div>
                          <p className="text-[13px] font-bold text-[#8A5A48]">
                            {formatDate(schedule.schedule_date)}
                          </p>
                          <p className="mt-1 text-[18px] font-extrabold text-[#8C0F2D]">
                            {formatTime(schedule.start_time)} -{" "}
                            {formatTime(schedule.end_time)}
                          </p>
                          <p className="mt-1 text-[12px] text-[#6F5549]">
                            Durasi: {formatDuration(schedule.duration_minutes)}
                          </p>
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-[18px] font-extrabold text-[#2B1B18]">
                              {schedule.subject_name}
                            </h3>

                            <span
                              className={`rounded-full px-3 py-1 text-[11px] font-extrabold ${getSessionBadge(
                                schedule.session_name
                              )}`}
                            >
                              {schedule.session_name || "-"}
                            </span>
                          </div>

                          <p className="mt-2 text-[14px] leading-6 text-[#6F5549]">
                            Guru:{" "}
                            <span className="font-bold text-[#2B1B18]">
                              {schedule.teacher_name}
                            </span>
                          </p>

                          <p className="mt-1 text-[14px] leading-6 text-[#6F5549]">
                            Materi:{" "}
                            <span className="font-bold text-[#2B1B18]">
                              {schedule.material_topic || "-"}
                            </span>
                          </p>

                          {schedule.notes ? (
                            <p className="mt-3 rounded-xl bg-[#FFF8EF] px-4 py-3 text-[13px] leading-5 text-[#6F5549]">
                              <span className="font-extrabold text-[#2B1B18]">
                                Keterangan:
                              </span>{" "}
                              {schedule.notes}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex flex-col gap-2">
                          <InfoPill label="Semester" value={schedule.semester || "-"} />
                          <InfoPill
                            label="Academic Year"
                            value={schedule.academic_year || ACADEMIC_YEAR}
                          />

                          {schedule.temporary_schedule_url ? (
                            <a
                              href={schedule.temporary_schedule_url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#DCC8B6] bg-white px-3 text-[13px] font-extrabold text-[#8C0F2D] transition hover:bg-[#FFF8EF]"
                            >
                              <FileText className="h-4 w-4" />
                              File Jadwal
                            </a>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <aside className="space-y-5">
            <div className="rounded-[22px] border border-[#E1CFBE] bg-white p-5 shadow-sm">
              <h2 className="text-[18px] font-extrabold text-[#2B1B18]">
                Murid Aktif
              </h2>

              <div className="mt-5 rounded-2xl bg-[#FFF8EF] p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#8C0F2D] text-[14px] font-extrabold text-white">
                    {getInitials(student?.full_name)}
                  </div>

                  <div>
                    <p className="text-[18px] font-extrabold text-[#2B1B18]">
                      {student?.full_name || "-"}
                    </p>
                    <p className="mt-1 text-[13px] text-[#6F5549]">
                      {student?.level || "-"} — {student?.grade || "-"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-[13px] text-[#6F5549]">
                  <p>
                    <span className="font-extrabold text-[#2B1B18]">NIPD:</span>{" "}
                    {student?.nis || "-"}
                  </p>
                  <p>
                    <span className="font-extrabold text-[#2B1B18]">NISN:</span>{" "}
                    {student?.nisn || "-"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[22px] border border-[#E1CFBE] bg-white p-5 shadow-sm">
              <h2 className="text-[18px] font-extrabold text-[#2B1B18]">
                Jadwal Hari Ini
              </h2>

              <div className="mt-5 space-y-3">
                {todaySchedules.length === 0 ? (
                  <div className="rounded-xl border border-[#E1CFBE] bg-[#FFF8EF] px-4 py-4 text-[13px] text-[#6F5549]">
                    Tidak ada jadwal hari ini.
                  </div>
                ) : (
                  todaySchedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="rounded-xl border border-[#E1CFBE] bg-[#FFFCF8] p-4"
                    >
                      <p className="font-extrabold text-[#2B1B18]">
                        {schedule.subject_name}
                      </p>
                      <p className="mt-1 text-[13px] text-[#6F5549]">
                        {formatTime(schedule.start_time)} -{" "}
                        {formatTime(schedule.end_time)}
                      </p>
                      <p className="mt-1 text-[13px] text-[#6F5549]">
                        {schedule.teacher_name}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[22px] border border-[#E1CFBE] bg-white p-5 shadow-sm">
              <h2 className="text-[18px] font-extrabold text-[#2B1B18]">
                Catatan
              </h2>

              <p className="mt-3 text-[14px] leading-6 text-[#6F5549]">
                Jadwal ini diambil dari menu Jadwal Guru di dashboard Kepala
                Sekolah. Jika data belum tampil, pastikan akun murid/orang tua
                sudah terhubung ke data siswa yang benar.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </StudentLayout>
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

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#FFF8EF] px-4 py-3">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#8A5A48]">
        {label}
      </p>
      <p className="mt-1 text-[13px] font-extrabold text-[#2B1B18]">{value}</p>
    </div>
  );
}
