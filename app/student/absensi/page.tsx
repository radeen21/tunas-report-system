"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Search,
  UserRound,
  XCircle,
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

type AttendanceRow = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  attendance_date: string | null;
  day_name?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  attendance_status?: string | null;
  understanding_status?: string | null;
  material_topic?: string | null;
  note?: string | null;
  notes?: string | null;
  created_at?: string | null;
  teachers?: TeacherRelation | TeacherRelation[] | null;
  subjects?: SubjectRelation | SubjectRelation[] | null;
};

type AttendanceItem = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  attendance_date: string | null;
  day_name: string | null;
  start_time: string | null;
  end_time: string | null;
  attendance_status: string;
  understanding_status: string | null;
  material_topic: string | null;
  note: string | null;
  teacher_name: string;
  subject_name: string;
};

type DayAttendanceGroup = {
  day: string;
  isToday: boolean;
  attendances: AttendanceItem[];
};

const ACADEMIC_YEAR = "2026/2027";
const ACADEMIC_YEAR_START = "2026-07-01";
const ACADEMIC_YEAR_END = "2027-06-30";

const dayOrder = [
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
  "Minggu",
];

const statusOptions = ["Semua Status", "Hadir", "Izin", "Alpa", "Sakit"];

function normalizeRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
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

function formatClass(level?: string | null, grade?: string | null) {
  const cleanLevel = normalizeLevel(level);
  const cleanGrade = grade || "";

  if (cleanLevel && cleanGrade) return `${cleanLevel} ${cleanGrade}`;
  if (cleanLevel) return cleanLevel;
  if (cleanGrade) return cleanGrade;

  return "-";
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

function getDayIndex(dayName?: string | null) {
  const index = dayOrder.findIndex((day) => day === dayName);
  return index === -1 ? 99 : index;
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

function normalizeAttendanceStatus(status?: string | null) {
  const safe = normalizeText(status);

  if (safe === "hadir" || safe === "present") return "Hadir";
  if (safe === "izin") return "Izin";
  if (safe === "sakit") return "Sakit";
  if (
    safe === "alpa" ||
    safe === "alpha" ||
    safe === "tidak hadir" ||
    safe === "absent"
  ) {
    return "Alpa";
  }

  return status || "-";
}

function getAttendanceNote(item: AttendanceRow | AttendanceItem) {
  if ("notes" in item) {
    return item.note || item.notes || "-";
  }

  return item.note || "-";
}

function isHadir(status?: string | null) {
  return normalizeAttendanceStatus(status) === "Hadir";
}

function isIzin(status?: string | null) {
  return normalizeAttendanceStatus(status) === "Izin";
}

function isAlpa(status?: string | null) {
  return normalizeAttendanceStatus(status) === "Alpa";
}

function isSakit(status?: string | null) {
  return normalizeAttendanceStatus(status) === "Sakit";
}

function getStatusBadgeClass(status?: string | null) {
  const normalized = normalizeAttendanceStatus(status);

  if (normalized === "Hadir") return "bg-[#C7F0DA] text-[#158A58]";
  if (normalized === "Izin") return "bg-[#FFF2B8] text-[#B26A00]";
  if (normalized === "Sakit") return "bg-[#E0F2FE] text-[#0369A1]";
  if (normalized === "Alpa") return "bg-[#FFE4E6] text-[#BE123C]";

  return "bg-[#F1F5F9] text-[#64748B]";
}

function getUnderstandingBadgeClass(status?: string | null) {
  if (status === "Paham") return "bg-[#C7F0DA] text-[#158A58]";
  if (status === "Cukup Paham") return "bg-[#FFF2B8] text-[#B26A00]";
  if (status === "Belum Paham") return "bg-[#FFE4E6] text-[#BE123C]";

  return "bg-[#F1F5F9] text-[#64748B]";
}

function getAttendanceSearchText(attendance: AttendanceItem) {
  return [
    attendance.day_name,
    attendance.attendance_date,
    attendance.start_time,
    attendance.end_time,
    attendance.attendance_status,
    attendance.understanding_status,
    attendance.material_topic,
    attendance.note,
    attendance.teacher_name,
    attendance.subject_name,
  ]
    .filter(Boolean)
    .join(" ");
}

export default function StudentAbsensiPage() {
  const [student, setStudent] = useState<StudentRow | null>(null);
  const [attendances, setAttendances] = useState<AttendanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [search, setSearch] = useState("");
  const [dayFilter, setDayFilter] = useState("Semua Hari");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [subjectFilter, setSubjectFilter] = useState("Semua Mapel");
  const [dateFilter, setDateFilter] = useState("");

  async function findStudentByLoggedInUser() {
    const { data: authData } = await supabase.auth.getUser();

    const authUserId = authData.user?.id || "";
    const authEmail = (
      authData.user?.email ||
      localStorage.getItem("hstkb_demo_email") ||
      localStorage.getItem("hstkb_email") ||
      ""
    )
      .trim()
      .toLowerCase();

    if (!authEmail && !authUserId) return null;

    if (authUserId) {
      const { data } = await supabase
        .from("students")
        .select("id, full_name, level, grade, nis, nisn, email, user_id, parent_id")
        .eq("user_id", authUserId)
        .limit(1)
        .maybeSingle();

      if (data) return data as StudentRow;
    }

    if (authEmail) {
      const { data } = await supabase
        .from("students")
        .select("id, full_name, level, grade, nis, nisn, email, user_id, parent_id")
        .ilike("email", authEmail)
        .limit(1)
        .maybeSingle();

      if (data) return data as StudentRow;
    }

    if (authEmail) {
      const { data: parentData } = await supabase
        .from("parents")
        .select("id, email")
        .ilike("email", authEmail)
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

  async function fetchAttendances(studentId: string) {
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
        note,
        notes,
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
      .gte("attendance_date", ACADEMIC_YEAR_START)
      .lte("attendance_date", ACADEMIC_YEAR_END)
      .order("attendance_date", { ascending: false })
      .order("start_time", { ascending: true });

    if (error) throw new Error(error.message);

    const rows = (data || []) as AttendanceRow[];

    const normalized: AttendanceItem[] = rows.map((item) => {
      const teacher = normalizeRelation(item.teachers);
      const subject = normalizeRelation(item.subjects);

      return {
        id: item.id,
        student_id: item.student_id,
        teacher_id: item.teacher_id,
        subject_id: item.subject_id,
        attendance_date: item.attendance_date,
        day_name: item.day_name || getDayNameFromDate(item.attendance_date),
        start_time: item.start_time || null,
        end_time: item.end_time || null,
        attendance_status: normalizeAttendanceStatus(item.attendance_status),
        understanding_status: item.understanding_status || null,
        material_topic: item.material_topic || null,
        note: getAttendanceNote(item),
        teacher_name: teacher?.full_name || "-",
        subject_name: subject?.name || "-",
      };
    });

    setAttendances(normalized);
  }

  async function fetchPageData() {
    setLoading(true);
    setErrorMessage("");

    try {
      const activeStudent = await findStudentByLoggedInUser();

      if (!activeStudent) {
        setStudent(null);
        setAttendances([]);
        setErrorMessage(
          "Data murid belum terhubung dengan akun login ini. Hubungkan email/user_id murid atau parent_id orang tua di Supabase."
        );
        return;
      }

      setStudent(activeStudent);
      await fetchAttendances(activeStudent.id);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengambil data absensi murid.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPageData();

    const channel = supabase
      .channel("student-attendance-realtime")
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
        { event: "*", schema: "public", table: "attendance" },
        () => fetchPageData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const subjectOptions = useMemo(() => {
    const subjects = attendances
      .map((attendance) => attendance.subject_name)
      .filter(Boolean);

    return Array.from(new Set(subjects)).sort();
  }, [attendances]);

  const filteredAttendances = useMemo(() => {
    const q = normalizeText(search);

    return attendances.filter((attendance) => {
      const matchSearch =
        !q || normalizeText(getAttendanceSearchText(attendance)).includes(q);

      const matchDay =
        dayFilter === "Semua Hari" || attendance.day_name === dayFilter;

      const matchStatus =
        statusFilter === "Semua Status" ||
        attendance.attendance_status === statusFilter;

      const matchSubject =
        subjectFilter === "Semua Mapel" ||
        attendance.subject_name === subjectFilter;

      const matchDate =
        !dateFilter || attendance.attendance_date === dateFilter;

      return matchSearch && matchDay && matchStatus && matchSubject && matchDate;
    });
  }, [attendances, search, dayFilter, statusFilter, subjectFilter, dateFilter]);

  const groupedAttendances = useMemo(() => {
    const map = new Map<string, AttendanceItem[]>();

    filteredAttendances.forEach((attendance) => {
      const day = attendance.day_name || "-";
      const current = map.get(day) || [];

      current.push(attendance);
      map.set(day, current);
    });

    const today = todayYMD();

    const groups: DayAttendanceGroup[] = Array.from(map.entries()).map(
      ([day, items]) => ({
        day,
        isToday: items.some((item) => item.attendance_date === today),
        attendances: items.sort((a, b) => {
          const dateDiff = (b.attendance_date || "").localeCompare(
            a.attendance_date || ""
          );

          if (dateDiff !== 0) return dateDiff;

          return (a.start_time || "").localeCompare(b.start_time || "");
        }),
      })
    );

    return groups.sort((a, b) => getDayIndex(a.day) - getDayIndex(b.day));
  }, [filteredAttendances]);

  const todayAttendances = useMemo(() => {
    const today = todayYMD();
    return attendances.filter((attendance) => attendance.attendance_date === today);
  }, [attendances]);

  const summary = useMemo(() => {
    const total = attendances.length;
    const hadir = attendances.filter((attendance) =>
      isHadir(attendance.attendance_status)
    ).length;

    const izin = attendances.filter((attendance) =>
      isIzin(attendance.attendance_status)
    ).length;

    const alpa = attendances.filter((attendance) =>
      isAlpa(attendance.attendance_status)
    ).length;

    const sakit = attendances.filter((attendance) =>
      isSakit(attendance.attendance_status)
    ).length;

    const percentage = total > 0 ? Math.round((hadir / total) * 100) : 0;

    return {
      total,
      hadir,
      izin,
      alpa,
      sakit,
      today: todayAttendances.length,
      percentage,
    };
  }, [attendances, todayAttendances]);

  return (
    <StudentLayout activeMenu="Absensi">
      <section className="space-y-7">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#8A5A48]">
              Portal Murid / Orang Tua
            </p>

            <h1 className="mt-2 text-[30px] font-extrabold tracking-[-0.02em] text-[#2B1B18]">
              Absensi
            </h1>

            <p className="mt-2 text-[15px] leading-6 text-[#6F5549]">
              {student ? (
                <>
                  Rekap absensi untuk{" "}
                  <span className="font-extrabold text-[#2B1B18]">
                    {student.full_name || "-"}
                  </span>{" "}
                  • {formatClass(student.level, student.grade)} • NIPD:{" "}
                  {student.nis || "-"} • NISN: {student.nisn || "-"}
                </>
              ) : (
                "Rekap absensi murid."
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
            icon={<CalendarCheck className="h-5 w-5" />}
            label="Total Absensi"
            value={summary.total}
            info="Data"
            tone="pink"
          />

          <SummaryCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Hadir"
            value={summary.hadir}
            info={`${summary.percentage}%`}
            tone="green"
          />

          <SummaryCard
            icon={<Clock className="h-5 w-5" />}
            label="Hari Ini"
            value={summary.today}
            info={formatDate(todayYMD())}
            tone="orange"
          />

          <SummaryCard
            icon={<XCircle className="h-5 w-5" />}
            label="Izin / Alpa / Sakit"
            value={summary.izin + summary.alpa + summary.sakit}
            info="Tidak hadir"
            tone="blue"
          />
        </div>

        <div className="rounded-[22px] border border-[#E1CFBE] bg-white p-5 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-[1.4fr_180px_180px_220px_180px]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8E6A58]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari absensi, guru, mapel, materi, atau keterangan..."
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
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              {statusOptions.map((status) => (
                <option key={status}>{status}</option>
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
                Memuat data absensi...
              </div>
            ) : groupedAttendances.length === 0 ? (
              <div className="rounded-[22px] border border-[#E1CFBE] bg-white px-6 py-12 text-center text-[#6F5549] shadow-sm">
                Belum ada data absensi untuk murid ini.
              </div>
            ) : (
              groupedAttendances.map((group) => (
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
                        {group.attendances.length} data absensi
                      </p>
                    </div>

                    {group.isToday ? (
                      <span className="rounded-full bg-[#8C0F2D] px-3 py-1 text-[12px] font-extrabold text-white">
                        HARI INI
                      </span>
                    ) : null}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1280px] border-collapse">
                      <thead>
                        <tr className="border-b border-[#EADACA] bg-white text-left text-[13px] font-extrabold text-[#6F5549]">
                          <th className="px-5 py-4">No</th>
                          <th className="px-5 py-4">Hari</th>
                          <th className="px-5 py-4">Tanggal</th>
                          <th className="px-5 py-4">Jam</th>
                          <th className="px-5 py-4">Guru Mapel</th>
                          <th className="px-5 py-4">Mapel</th>
                          <th className="px-5 py-4">Materi</th>
                          <th className="px-5 py-4 text-center">Hadir</th>
                          <th className="px-5 py-4 text-center">Izin</th>
                          <th className="px-5 py-4 text-center">Alpa</th>
                          <th className="px-5 py-4">Pemahaman</th>
                          <th className="px-5 py-4">Keterangan</th>
                        </tr>
                      </thead>

                      <tbody>
                        {group.attendances.map((attendance, index) => (
                          <tr
                            key={attendance.id}
                            className="border-b border-[#F0E1D4] text-[14px] text-[#2B1B18]"
                          >
                            <td className="px-5 py-4 font-bold">{index + 1}</td>

                            <td className="px-5 py-4 font-extrabold">
                              {attendance.day_name || "-"}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4">
                              {formatDate(attendance.attendance_date)}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 font-bold text-[#8C0F2D]">
                              {formatTime(attendance.start_time)}-
                              {formatTime(attendance.end_time)}
                            </td>

                            <td className="px-5 py-4 font-extrabold">
                              {attendance.teacher_name}
                            </td>

                            <td className="px-5 py-4">
                              {attendance.subject_name}
                            </td>

                            <td className="max-w-[240px] px-5 py-4">
                              <p className="line-clamp-2 font-bold">
                                {attendance.material_topic || "-"}
                              </p>
                            </td>

                            <td className="px-5 py-4 text-center">
                              <ChecklistBox
                                checked={isHadir(attendance.attendance_status)}
                              />
                            </td>

                            <td className="px-5 py-4 text-center">
                              <ChecklistBox
                                checked={isIzin(attendance.attendance_status)}
                              />
                            </td>

                            <td className="px-5 py-4 text-center">
                              <ChecklistBox
                                checked={isAlpa(attendance.attendance_status)}
                              />
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-[12px] font-extrabold ${getUnderstandingBadgeClass(
                                  attendance.understanding_status
                                )}`}
                              >
                                {attendance.understanding_status || "-"}
                              </span>
                            </td>

                            <td className="max-w-[260px] px-5 py-4 text-[#6F5549]">
                              <p className="line-clamp-2">
                                {attendance.note || "-"}
                              </p>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                      {formatClass(student?.level, student?.grade)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-[13px] text-[#6F5549]">
                  <p>
                    <span className="font-extrabold text-[#2B1B18]">
                      NIPD:
                    </span>{" "}
                    {student?.nis || "-"}
                  </p>

                  <p>
                    <span className="font-extrabold text-[#2B1B18]">
                      NISN:
                    </span>{" "}
                    {student?.nisn || "-"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[22px] border border-[#E1CFBE] bg-white p-5 shadow-sm">
              <h2 className="text-[18px] font-extrabold text-[#2B1B18]">
                Absensi Hari Ini
              </h2>

              <div className="mt-5 space-y-3">
                {todayAttendances.length === 0 ? (
                  <div className="rounded-xl border border-[#E1CFBE] bg-[#FFF8EF] px-4 py-4 text-[13px] text-[#6F5549]">
                    Belum ada absensi hari ini.
                  </div>
                ) : (
                  todayAttendances.map((attendance) => (
                    <div
                      key={attendance.id}
                      className="rounded-xl border border-[#E1CFBE] bg-[#FFFCF8] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-extrabold text-[#2B1B18]">
                            {attendance.subject_name}
                          </p>

                          <p className="mt-1 text-[13px] text-[#6F5549]">
                            {formatTime(attendance.start_time)}-
                            {formatTime(attendance.end_time)}
                          </p>
                        </div>

                        <span
                          className={`whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-extrabold ${getStatusBadgeClass(
                            attendance.attendance_status
                          )}`}
                        >
                          {attendance.attendance_status}
                        </span>
                      </div>

                      <p className="mt-2 text-[13px] text-[#6F5549]">
                        Guru Mapel: {attendance.teacher_name}
                      </p>

                      <p className="mt-1 text-[13px] text-[#6F5549]">
                        Materi: {attendance.material_topic || "-"}
                      </p>

                      {attendance.note && attendance.note !== "-" ? (
                        <p className="mt-2 rounded-xl bg-[#FFF8EF] px-3 py-2 text-[12px] text-[#6F5549]">
                          {attendance.note}
                        </p>
                      ) : null}
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
                Data absensi ini berasal dari input guru di menu Absensi KBM.
                Murid/orang tua hanya dapat melihat hasil absensi dan tidak dapat
                mengubah checklist.
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

function ChecklistBox({ checked }: { checked: boolean }) {
  return (
    <span
      className={`mx-auto flex h-6 w-12 items-center justify-center rounded-[5px] border text-[13px] font-extrabold ${
        checked
          ? "border-[#2F66C9] bg-[#3F73C8] text-white"
          : "border-[#C9D3E6] bg-white text-transparent"
      }`}
    >
      ✓
    </span>
  );
}