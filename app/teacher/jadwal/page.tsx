"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Edit3,
  FileText,
  Search,
  UsersRound,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import TeacherLayout from "../components/TeacherLayout";

const ACADEMIC_YEAR = "2026/2027";
const ACADEMIC_YEAR_START = "2026-07-01";
const ACADEMIC_YEAR_END = "2027-06-30";

type TeacherRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone?: string | null;
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

type ScheduleRow = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  day_name: string | null;
  schedule_date: string | null;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
  session_name: string | null;
  material_topic: string | null;
  notes: string | null;
  temporary_schedule_url: string | null;
  academic_year: string | null;
  semester: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type AttendanceRow = {
  id: string;
  teacher_id: string | null;
  student_id: string | null;
  subject_id: string | null;
  attendance_date: string | null;
  day_name?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  duration_minutes?: number | null;
  session_name?: string | null;
  attendance_status?: string | null;
  understanding_status?: string | null;
  material_topic?: string | null;
  note?: string | null;
  notes?: string | null;
};

type EnrichedSchedule = ScheduleRow & {
  student_name: string;
  student_grade: string;
  student_level: string;
  student_nipd: string;
  student_nisn: string;
  subject_name: string;
  subject_level: string;
  subject_grade: string;

  attendance_status: string;
  attendance_note: string;
  understanding_status: string;
  attendance_material: string;
};

type ScheduleGroup = {
  key: string;

  teacher_id: string;
  teacher_name: string;

  subject_id: string;
  subject_name: string;

  schedule_date: string;
  day_name: string;

  start_time: string;
  end_time: string;
  duration_minutes: number | null;

  session_name: string;
  semester: string;
  academic_year: string;

  schedule_material: string;
  attendance_material: string;
  display_material: string;

  notes: string;
  temporary_schedule_url: string;

  rows: EnrichedSchedule[];
  total_students: number;
};

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
  const gradeNumber = getGradeNumber(grade);

  if (gradeNumber >= 1 && gradeNumber <= 6) {
    return `SD ${gradeNumber}`;
  }

  if (gradeNumber >= 7 && gradeNumber <= 9) {
    return `SMP ${gradeNumber}`;
  }

  if (gradeNumber >= 10 && gradeNumber <= 12) {
    return `SMA ${gradeNumber}`;
  }

  if (cleanLevel !== "-" && grade) {
    return `${cleanLevel} ${grade}`;
  }

  if (cleanLevel !== "-") return cleanLevel;
  if (grade) return grade;

  return "-";
}

function formatTeacherSubject(subjects: TeacherRow["subjects"]) {
  if (!subjects) return "Guru";

  if (Array.isArray(subjects)) {
    return `Guru Mapel — ${subjects.slice(0, 4).join(", ")}`;
  }

  return `Guru Mapel — ${subjects}`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatTime(value?: string | null) {
  if (!value) return "-";

  return value.slice(0, 5);
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

function getGradeNumber(value?: string | null) {
  const match = (value || "").match(/\d+/);

  return match ? Number(match[0]) : 999;
}

function calculateDurationMinutes(
  startTime?: string | null,
  endTime?: string | null
) {
  if (!startTime || !endTime) return null;

  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);

  if (
    Number.isNaN(startHour) ||
    Number.isNaN(startMinute) ||
    Number.isNaN(endHour) ||
    Number.isNaN(endMinute)
  ) {
    return null;
  }

  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;
  const duration = endTotal - startTotal;

  return duration > 0 ? duration : null;
}

function formatDuration(
  minutes?: number | null,
  startTime?: string | null,
  endTime?: string | null
) {
  const duration =
    minutes || calculateDurationMinutes(startTime, endTime);

  if (!duration) return "-";

  const hour = Math.floor(duration / 60);
  const minute = duration % 60;

  if (hour > 0 && minute > 0) {
    return `${hour} jam ${minute} menit`;
  }

  if (hour > 0) {
    return `${hour} jam`;
  }

  return `${minute} menit`;
}

function normalizeAttendanceStatus(status?: string | null) {
  const safe = normalizeText(status);

  if (safe === "hadir") return "Hadir";
  if (safe === "izin") return "Izin";
  if (safe === "sakit") return "Izin";
  if (safe === "alpa") return "Alpa";
  if (safe === "alpha") return "Alpa";
  if (safe === "tidak hadir") return "Alpa";

  return "";
}

function getAttendanceNote(attendance?: AttendanceRow | null) {
  return attendance?.note || attendance?.notes || "";
}

function getAttendanceKey({
  teacherId,
  studentId,
  subjectId,
  date,
  startTime,
  endTime,
}: {
  teacherId?: string | null;
  studentId?: string | null;
  subjectId?: string | null;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}) {
  return [
    teacherId || "",
    studentId || "",
    subjectId || "",
    date || "",
    formatTime(startTime),
    formatTime(endTime),
  ].join("__");
}

function getScheduleGroupKey(schedule: EnrichedSchedule) {
  return [
    schedule.teacher_id || "",
    schedule.subject_id || "",
    schedule.schedule_date || "",
    formatTime(schedule.start_time),
    formatTime(schedule.end_time),
    schedule.session_name || "",
    schedule.semester || "",
    schedule.academic_year || "",
  ].join("__");
}

function groupSchedules(
  schedules: EnrichedSchedule[],
  teacherName: string
) {
  const groupedMap = new Map<string, EnrichedSchedule[]>();

  schedules.forEach((schedule) => {
    const key = getScheduleGroupKey(schedule);
    const current = groupedMap.get(key) || [];

    current.push(schedule);
    groupedMap.set(key, current);
  });

  const groups: ScheduleGroup[] = Array.from(
    groupedMap.entries()
  ).map(([key, rows]) => {
    const sortedRows = [...rows].sort((a, b) => {
      const classA = getGradeNumber(a.student_grade);
      const classB = getGradeNumber(b.student_grade);

      if (classA !== classB) return classA - classB;

      return a.student_name.localeCompare(b.student_name);
    });

    const first = sortedRows[0];

    const attendanceMaterial =
      sortedRows.find((row) => row.attendance_material)?.attendance_material ||
      "";

    const scheduleMaterial =
      sortedRows.find((row) => row.material_topic)?.material_topic || "";

    return {
      key,

      teacher_id: first.teacher_id || "",
      teacher_name: teacherName,

      subject_id: first.subject_id || "",
      subject_name: first.subject_name,

      schedule_date: first.schedule_date || "",
      day_name: first.day_name || "-",

      start_time: first.start_time || "",
      end_time: first.end_time || "",
      duration_minutes:
        first.duration_minutes ||
        calculateDurationMinutes(first.start_time, first.end_time),

      session_name: first.session_name || "-",
      semester: first.semester || "-",
      academic_year: first.academic_year || ACADEMIC_YEAR,

      schedule_material: scheduleMaterial,
      attendance_material: attendanceMaterial,
      display_material: attendanceMaterial || scheduleMaterial,

      notes: first.notes || "",
      temporary_schedule_url: first.temporary_schedule_url || "",

      rows: sortedRows,
      total_students: sortedRows.length,
    };
  });

  return groups.sort((a, b) => {
    const dateCompare = a.schedule_date.localeCompare(b.schedule_date);

    if (dateCompare !== 0) return dateCompare;

    return a.start_time.localeCompare(b.start_time);
  });
}

function getStatusBadgeClass(status: string) {
  if (status === "Hadir") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "Izin") {
    return "bg-amber-100 text-amber-700";
  }

  if (status === "Alpa") {
    return "bg-red-100 text-red-700";
  }

  return "bg-slate-100 text-slate-600";
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

export default function TeacherJadwalPage() {
  const [teacher, setTeacher] = useState<TeacherRow | null>(null);
  const [schedules, setSchedules] = useState<EnrichedSchedule[]>([]);

  const [loading, setLoading] = useState(true);
  const [savingMaterial, setSavingMaterial] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("Semua Kelas");
  const [dayFilter, setDayFilter] = useState("Semua Hari");
  const [subjectFilter, setSubjectFilter] = useState("Semua Mapel");

  const [selectedGroup, setSelectedGroup] =
    useState<ScheduleGroup | null>(null);

  const [editingGroup, setEditingGroup] =
    useState<ScheduleGroup | null>(null);

  const [materialInput, setMaterialInput] = useState("");

  async function getCurrentTeacher() {
    const { data: authData, error: authError } =
      await supabase.auth.getUser();

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
        .select(
          "id, full_name, email, phone, teacher_code, subjects"
        )
        .ilike("email", email)
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      if (data) {
        return data as TeacherRow;
      }
    }

    if (teacherCode) {
      const { data, error } = await supabase
        .from("teachers")
        .select(
          "id, full_name, email, phone, teacher_code, subjects"
        )
        .eq("teacher_code", teacherCode)
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      if (data) {
        return data as TeacherRow;
      }
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
        setSchedules([]);
        setErrorMessage(
          "Data guru belum terhubung dengan akun login ini. Hubungkan email guru di tabel teachers atau isi teacher_code."
        );
        return;
      }

      const [
        studentsResponse,
        subjectsResponse,
        schedulesResponse,
        attendanceResponse,
      ] = await Promise.all([
        supabase.from("students").select("*").order("full_name"),

        supabase.from("subjects").select("*").order("name"),

        supabase
          .from("schedules")
          .select("*")
          .eq("teacher_id", currentTeacher.id)
          .gte("schedule_date", ACADEMIC_YEAR_START)
          .lte("schedule_date", ACADEMIC_YEAR_END)
          .order("schedule_date", { ascending: true })
          .order("start_time", { ascending: true }),

        supabase
          .from("attendance")
          .select("*")
          .eq("teacher_id", currentTeacher.id)
          .gte("attendance_date", ACADEMIC_YEAR_START)
          .lte("attendance_date", ACADEMIC_YEAR_END),
      ]);

      if (studentsResponse.error) {
        throw new Error(studentsResponse.error.message);
      }

      if (subjectsResponse.error) {
        throw new Error(subjectsResponse.error.message);
      }

      if (schedulesResponse.error) {
        throw new Error(schedulesResponse.error.message);
      }

      if (attendanceResponse.error) {
        throw new Error(attendanceResponse.error.message);
      }

      const studentsData =
        (studentsResponse.data || []) as StudentRow[];

      const subjectsData =
        (subjectsResponse.data || []) as SubjectRow[];

      const schedulesData =
        (schedulesResponse.data || []) as ScheduleRow[];

      const attendanceData =
        (attendanceResponse.data || []) as AttendanceRow[];

      const studentMap = new Map(
        studentsData.map((student) => [student.id, student])
      );

      const subjectMap = new Map(
        subjectsData.map((subject) => [subject.id, subject])
      );

      const attendanceMap = new Map<string, AttendanceRow>();

      attendanceData.forEach((attendance) => {
        const key = getAttendanceKey({
          teacherId: attendance.teacher_id,
          studentId: attendance.student_id,
          subjectId: attendance.subject_id,
          date: attendance.attendance_date,
          startTime: attendance.start_time,
          endTime: attendance.end_time,
        });

        attendanceMap.set(key, attendance);
      });

      const enrichedSchedules: EnrichedSchedule[] = schedulesData
        .filter((schedule) => {
          if (!schedule.schedule_date) return false;

          const correctDate =
            schedule.schedule_date >= ACADEMIC_YEAR_START &&
            schedule.schedule_date <= ACADEMIC_YEAR_END;

          const correctAcademicYear =
            !schedule.academic_year ||
            schedule.academic_year === ACADEMIC_YEAR;

          return correctDate && correctAcademicYear;
        })
        .map((schedule) => {
          const student = schedule.student_id
            ? studentMap.get(schedule.student_id)
            : null;

          const subject = schedule.subject_id
            ? subjectMap.get(schedule.subject_id)
            : null;

          const attendanceKey = getAttendanceKey({
            teacherId: schedule.teacher_id,
            studentId: schedule.student_id,
            subjectId: schedule.subject_id,
            date: schedule.schedule_date,
            startTime: schedule.start_time,
            endTime: schedule.end_time,
          });

          const attendance = attendanceMap.get(attendanceKey);

          return {
            ...schedule,

            student_name: student?.full_name || "-",
            student_grade: student?.grade || "-",
            student_level: student?.level || "-",
            student_nipd: student?.nis || "-",
            student_nisn: student?.nisn || "-",

            subject_name: subject?.name || "-",
            subject_level: subject?.level || "-",
            subject_grade: subject?.grade || "-",

            attendance_status: normalizeAttendanceStatus(
              attendance?.attendance_status
            ),
            attendance_note: getAttendanceNote(attendance),
            understanding_status:
              attendance?.understanding_status || "-",
            attendance_material:
              attendance?.material_topic || "",
          };
        });

      setSchedules(enrichedSchedules);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengambil data jadwal mengajar.");
      }

      setTeacher(null);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchData();

    const channel = supabase
      .channel("teacher-jadwal-excel-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "teachers",
        },
        () => void fetchData()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "students",
        },
        () => void fetchData()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subjects",
        },
        () => void fetchData()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "schedules",
        },
        () => void fetchData()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance",
        },
        () => void fetchData()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const groupedSchedules = useMemo(() => {
    return groupSchedules(
      schedules,
      teacher?.full_name || "Guru"
    );
  }, [schedules, teacher?.full_name]);

  const classOptions = useMemo(() => {
    const allowedClasses = [
      "SD 1",
      "SD 2",
      "SD 3",
      "SD 4",
      "SD 5",
      "SD 6",
      "SMP 7",
      "SMP 8",
      "SMP 9",
      "SMA 10",
      "SMA 11",
      "SMA 12",
    ];

    const availableClasses = new Set(
      schedules
        .map((schedule) =>
          formatClass(
            schedule.student_level,
            schedule.student_grade
          )
        )
        .filter(Boolean)
    );

    return allowedClasses.filter((className) =>
      availableClasses.has(className)
    );
  }, [schedules]);

  const subjectOptions = useMemo(() => {
    return Array.from(
      new Set(
        schedules
          .map((schedule) => schedule.subject_name)
          .filter((subject) => subject && subject !== "-")
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [schedules]);

  const filteredGroups = useMemo(() => {
    const keyword = normalizeText(search);

    return groupedSchedules.filter((group) => {
      const groupClasses = group.rows.map((row) =>
        formatClass(row.student_level, row.student_grade)
      );

      const matchSearch =
        !keyword ||
        normalizeText(group.teacher_name).includes(keyword) ||
        normalizeText(group.subject_name).includes(keyword) ||
        normalizeText(group.display_material).includes(keyword) ||
        normalizeText(group.notes).includes(keyword) ||
        normalizeText(group.session_name).includes(keyword) ||
        normalizeText(group.day_name).includes(keyword) ||
        group.rows.some((row) => {
          return (
            normalizeText(row.student_name).includes(keyword) ||
            normalizeText(row.student_nipd).includes(keyword) ||
            normalizeText(row.student_nisn).includes(keyword) ||
            normalizeText(row.attendance_status).includes(keyword) ||
            normalizeText(row.attendance_note).includes(keyword)
          );
        });

      const matchClass =
        classFilter === "Semua Kelas" ||
        groupClasses.includes(classFilter);

      const matchDay =
        dayFilter === "Semua Hari" ||
        group.day_name === dayFilter;

      const matchSubject =
        subjectFilter === "Semua Mapel" ||
        group.subject_name === subjectFilter;

      return (
        matchSearch &&
        matchClass &&
        matchDay &&
        matchSubject
      );
    });
  }, [
    groupedSchedules,
    search,
    classFilter,
    dayFilter,
    subjectFilter,
  ]);

  const todayGroups = useMemo(() => {
    return groupedSchedules.filter(
      (group) => group.schedule_date === todayYMD()
    );
  }, [groupedSchedules]);

  const totalStudents = useMemo(() => {
    return new Set(
      schedules
        .map((schedule) => schedule.student_id)
        .filter(Boolean)
    ).size;
  }, [schedules]);

  const completedAttendance = useMemo(() => {
    return schedules.filter(
      (schedule) => Boolean(schedule.attendance_status)
    ).length;
  }, [schedules]);

  function openMaterialModal(group: ScheduleGroup) {
    setEditingGroup(group);
    setMaterialInput(group.display_material || "");
    setErrorMessage("");
    setSuccessMessage("");
  }

  function closeMaterialModal() {
    if (savingMaterial) return;

    setEditingGroup(null);
    setMaterialInput("");
  }

  async function handleSaveMaterial() {
    if (!teacher?.id) {
      setErrorMessage("Data guru aktif tidak ditemukan.");
      return;
    }

    if (!editingGroup) {
      setErrorMessage("Data rombel tidak ditemukan.");
      return;
    }

    if (!materialInput.trim()) {
      setErrorMessage("Materi pembelajaran wajib diisi.");
      return;
    }

    setSavingMaterial(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const scheduleIds = editingGroup.rows.map((row) => row.id);
      const now = new Date().toISOString();

      const { error: scheduleError } = await supabase
        .from("schedules")
        .update({
          material_topic: materialInput.trim(),
          updated_at: now,
        })
        .in("id", scheduleIds)
        .eq("teacher_id", teacher.id);

      if (scheduleError) {
        throw new Error(scheduleError.message);
      }

      /*
       * Jika absensi rombel ini sudah pernah dibuat, materi pada attendance
       * ikut diperbarui agar tampilan Jadwal Admin dan Absensi konsisten.
       */
      const { error: attendanceError } = await supabase
        .from("attendance")
        .update({
          material_topic: materialInput.trim(),
          updated_at: now,
        })
        .eq("teacher_id", teacher.id)
        .eq("subject_id", editingGroup.subject_id)
        .eq("attendance_date", editingGroup.schedule_date)
        .eq("start_time", editingGroup.start_time)
        .eq("end_time", editingGroup.end_time);

      if (attendanceError) {
        throw new Error(attendanceError.message);
      }

      setSuccessMessage(
        `Materi "${materialInput.trim()}" berhasil disimpan untuk ${editingGroup.total_students} siswa dalam rombel.`
      );

      setEditingGroup(null);
      setMaterialInput("");

      await fetchData();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal menyimpan materi pembelajaran.");
      }
    } finally {
      setSavingMaterial(false);
    }
  }

  return (
    <TeacherLayout
      activeMenu={"Jadwal Mengajar" as any}
      teacherName={teacher?.full_name || "Guru"}
      teacherSubject={formatTeacherSubject(teacher?.subjects)}
      searchPlaceholder="Cari jadwal mengajar..."
    >
      <section className="space-y-7">
        <div>
          <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#8A5A48]">
            Teacher Portal
          </p>

          <h1 className="mt-2 text-[30px] font-extrabold tracking-[-0.02em] text-[#2B1B18]">
            Jadwal Mengajar
          </h1>

          <p className="mt-2 max-w-[900px] text-[15px] leading-6 text-[#6F5549]">
            Jadwal dasar dibuat oleh Admin/Kepala Sekolah. Guru dapat
            mengisi materi untuk seluruh siswa dalam rombel yang sama.
            Status Hadir, Izin, dan Alpa akan muncul setelah Absensi KBM
            disimpan.
          </p>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-[14px] leading-6 text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-[14px] leading-6 text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={<CalendarDays className="h-5 w-5" />}
            label="Total Rombel"
            value={groupedSchedules.length}
            info={ACADEMIC_YEAR}
            tone="pink"
          />

          <SummaryCard
            icon={<Clock className="h-5 w-5" />}
            label="Jadwal Hari Ini"
            value={todayGroups.length}
            info={formatDate(todayYMD())}
            tone="orange"
          />

          <SummaryCard
            icon={<UsersRound className="h-5 w-5" />}
            label="Total Murid"
            value={totalStudents}
            info="Murid terjadwal"
            tone="blue"
          />

          <SummaryCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Sudah Diabsen"
            value={completedAttendance}
            info={`${schedules.length} data jadwal`}
            tone="green"
          />
        </div>

        <div className="rounded-[22px] border border-[#E1CFBE] bg-white p-5 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8E6A58]" />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari siswa, NIPD, NISN, mapel, materi, atau keterangan..."
                className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] pl-11 pr-4 text-[14px] outline-none placeholder:text-[#9A7B6C] focus:border-[#9C0824]"
              />
            </div>

            <select
              value={classFilter}
              onChange={(event) => setClassFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              <option>Semua Kelas</option>

              {classOptions.map((className) => (
                <option key={className}>{className}</option>
              ))}
            </select>

            <select
              value={dayFilter}
              onChange={(event) => setDayFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              <option>Semua Hari</option>
              <option>Senin</option>
              <option>Selasa</option>
              <option>Rabu</option>
              <option>Kamis</option>
              <option>Jumat</option>
              <option>Sabtu</option>
              <option>Minggu</option>
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
          </div>
        </div>

        <div className="overflow-hidden rounded-[22px] border border-[#E1CFBE] bg-white shadow-sm">
          <div className="border-b border-[#EADACA] px-6 py-5">
            <h2 className="text-[20px] font-extrabold text-[#2B1B18]">
              Jadwal dan Absensi Guru & Siswa
            </h2>

            <p className="mt-1 text-[14px] text-[#6F5549]">
              Tampilan mengikuti format Excel sekolah. Satu rombel dapat
              berisi beberapa siswa.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1680px] border-collapse">
              <thead>
                <tr className="border-b border-[#EADACA] bg-[#FFF8EF] text-left text-[13px] font-extrabold text-[#6F5549]">
                  <th
                    rowSpan={2}
                    className="border-r border-[#EADACA] px-4 py-4"
                  >
                    No
                  </th>

                  <th
                    rowSpan={2}
                    className="border-r border-[#EADACA] px-4 py-4"
                  >
                    Hari
                  </th>

                  <th
                    rowSpan={2}
                    className="border-r border-[#EADACA] px-4 py-4"
                  >
                    Tanggal
                  </th>

                  <th
                    rowSpan={2}
                    className="border-r border-[#EADACA] px-4 py-4"
                  >
                    Nama Guru
                  </th>

                  <th
                    rowSpan={2}
                    className="border-r border-[#EADACA] px-4 py-4"
                  >
                    Datang
                  </th>

                  <th
                    rowSpan={2}
                    className="border-r border-[#EADACA] px-4 py-4"
                  >
                    Pulang
                  </th>

                  <th
                    colSpan={6}
                    className="border-r border-[#EADACA] px-4 py-4 text-center"
                  >
                    Jadwal Kegiatan Belajar Mengajar
                  </th>

                  <th
                    rowSpan={2}
                    className="border-r border-[#EADACA] px-4 py-4 text-center"
                  >
                    Hadir
                  </th>

                  <th
                    rowSpan={2}
                    className="border-r border-[#EADACA] px-4 py-4 text-center"
                  >
                    Izin
                  </th>

                  <th
                    rowSpan={2}
                    className="border-r border-[#EADACA] px-4 py-4 text-center"
                  >
                    Alpa
                  </th>

                  <th
                    rowSpan={2}
                    className="border-r border-[#EADACA] px-4 py-4"
                  >
                    Keterangan
                  </th>

                  <th
                    rowSpan={2}
                    className="px-4 py-4"
                  >
                    Aksi
                  </th>
                </tr>

                <tr className="border-b border-[#EADACA] bg-[#FFF8EF] text-left text-[13px] font-extrabold text-[#6F5549]">
                  <th className="border-r border-[#EADACA] px-4 py-3">
                    Jam
                  </th>

                  <th className="border-r border-[#EADACA] px-4 py-3">
                    Sesi
                  </th>

                  <th className="border-r border-[#EADACA] px-4 py-3">
                    Kls
                  </th>

                  <th className="border-r border-[#EADACA] px-4 py-3">
                    Mapel
                  </th>

                  <th className="border-r border-[#EADACA] px-4 py-3">
                    Materi
                  </th>

                  <th className="border-r border-[#EADACA] px-4 py-3">
                    Siswa
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={18}
                      className="px-6 py-12 text-center text-[#6F5549]"
                    >
                      Memuat jadwal mengajar...
                    </td>
                  </tr>
                ) : filteredGroups.length === 0 ? (
                  <tr>
                    <td
                      colSpan={18}
                      className="px-6 py-12 text-center text-[#6F5549]"
                    >
                      Belum ada jadwal mengajar yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  filteredGroups.flatMap((group, groupIndex) => {
                    return group.rows.map((row, rowIndex) => {
                      const firstRow = rowIndex === 0;
                      const rowSpan = group.rows.length;

                      return (
                        <tr
                          key={row.id}
                          className="border-b border-[#F0E1D4] text-[14px] text-[#2B1B18] hover:bg-[#FFFDFC]"
                        >
                          {firstRow ? (
                            <>
                              <td
                                rowSpan={rowSpan}
                                className="border-r border-[#F0E1D4] px-4 py-4 align-top font-bold"
                              >
                                {groupIndex + 1}
                              </td>

                              <td
                                rowSpan={rowSpan}
                                className="border-r border-[#F0E1D4] px-4 py-4 align-top font-extrabold"
                              >
                                {group.day_name}
                              </td>

                              <td
                                rowSpan={rowSpan}
                                className="whitespace-nowrap border-r border-[#F0E1D4] px-4 py-4 align-top"
                              >
                                {formatDate(group.schedule_date)}
                              </td>

                              <td
                                rowSpan={rowSpan}
                                className="border-r border-[#F0E1D4] px-4 py-4 align-top"
                              >
                                <p className="font-extrabold">
                                  {group.teacher_name}
                                </p>

                                <p className="mt-1 text-[12px] text-[#6F5549]">
                                  {teacher?.teacher_code || "-"}
                                </p>
                              </td>

                              <td
                                rowSpan={rowSpan}
                                className="whitespace-nowrap border-r border-[#F0E1D4] px-4 py-4 align-top"
                              >
                                {formatTime(group.start_time)}
                              </td>

                              <td
                                rowSpan={rowSpan}
                                className="whitespace-nowrap border-r border-[#F0E1D4] px-4 py-4 align-top"
                              >
                                {formatTime(group.end_time)}
                              </td>

                              <td
                                rowSpan={rowSpan}
                                className="whitespace-nowrap border-r border-[#F0E1D4] px-4 py-4 align-top"
                              >
                                {formatTime(group.start_time)}-
                                {formatTime(group.end_time)}
                              </td>

                              <td
                                rowSpan={rowSpan}
                                className="border-r border-[#F0E1D4] px-4 py-4 align-top"
                              >
                                {group.session_name}
                              </td>
                            </>
                          ) : null}

                          <td className="border-r border-[#F0E1D4] px-4 py-4">
                            {formatClass(
                              row.student_level,
                              row.student_grade
                            )}
                          </td>

                          {firstRow ? (
                            <>
                              <td
                                rowSpan={rowSpan}
                                className="border-r border-[#F0E1D4] px-4 py-4 align-top font-bold"
                              >
                                {group.subject_name}
                              </td>

                              <td
                                rowSpan={rowSpan}
                                className="min-w-[240px] border-r border-[#F0E1D4] px-4 py-4 align-top"
                              >
                                {group.display_material ? (
                                  <p className="whitespace-pre-line font-bold leading-6">
                                    {group.display_material}
                                  </p>
                                ) : (
                                  <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-[11px] font-extrabold text-amber-700">
                                    Belum diisi guru
                                  </span>
                                )}
                              </td>
                            </>
                          ) : null}

                          <td className="min-w-[220px] border-r border-[#F0E1D4] px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F8DFD0] text-[12px] font-extrabold text-[#8C0F2D]">
                                {getInitials(row.student_name)}
                              </div>

                              <div>
                                <p className="font-extrabold">
                                  {row.student_name}
                                </p>

                                <p className="mt-1 text-[11px] text-[#6F5549]">
                                  NIPD: {row.student_nipd}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="border-r border-[#F0E1D4] px-4 py-4 text-center">
                            <AttendanceMark
                              active={row.attendance_status === "Hadir"}
                              label="✓"
                              tone="present"
                            />
                          </td>

                          <td className="border-r border-[#F0E1D4] px-4 py-4 text-center">
                            <AttendanceMark
                              active={row.attendance_status === "Izin"}
                              label="✓"
                              tone="permission"
                            />
                          </td>

                          <td className="border-r border-[#F0E1D4] px-4 py-4 text-center">
                            <AttendanceMark
                              active={row.attendance_status === "Alpa"}
                              label="✓"
                              tone="absent"
                            />
                          </td>

                          <td className="min-w-[230px] border-r border-[#F0E1D4] px-4 py-4">
                            {row.attendance_status ? (
                              <>
                                <span
                                  className={`inline-flex rounded-full px-3 py-1 text-[11px] font-extrabold ${getStatusBadgeClass(
                                    row.attendance_status
                                  )}`}
                                >
                                  {row.attendance_status}
                                </span>

                                <p className="mt-2 whitespace-pre-line text-[12px] leading-5 text-[#6F5549]">
                                  {row.attendance_note ||
                                    row.understanding_status ||
                                    "-"}
                                </p>
                              </>
                            ) : (
                              <span className="text-[12px] text-[#8A6A5A]">
                                Belum diabsen
                              </span>
                            )}
                          </td>

                          {firstRow ? (
                            <td
                              rowSpan={rowSpan}
                              className="px-4 py-4 align-top"
                            >
                              <div className="flex min-w-[130px] flex-col gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openMaterialModal(group)
                                  }
                                  className="inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#8C0F2D] px-3 text-[12px] font-extrabold text-white transition hover:bg-[#54131D]"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                  {group.display_material
                                    ? "Edit Materi"
                                    : "Isi Materi"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setSelectedGroup(group)}
                                  className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-xl border border-[#DCC8B6] px-3 text-[12px] font-extrabold text-[#8C0F2D] transition hover:bg-[#FFF8EF]"
                                >
                                  Detail Rombel
                                </button>

                                {group.temporary_schedule_url ? (
                                  <a
                                    href={group.temporary_schedule_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#BAE6FD] px-3 text-[12px] font-extrabold text-[#0369A1]"
                                  >
                                    <FileText className="h-3.5 w-3.5" />
                                    File
                                  </a>
                                ) : null}
                              </div>
                            </td>
                          ) : null}
                        </tr>
                      );
                    });
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {editingGroup ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
          <div className="w-full max-w-[620px] overflow-hidden rounded-[22px] bg-[#FAF3EA] shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#E8D6C1] px-6 py-5">
              <div>
                <h2 className="text-[22px] font-extrabold text-[#2B1B18]">
                  {editingGroup.display_material
                    ? "Edit Materi Rombel"
                    : "Isi Materi Rombel"}
                </h2>

                <p className="mt-1 text-[14px] text-[#6B4A3A]">
                  {editingGroup.subject_name} •{" "}
                  {formatDate(editingGroup.schedule_date)}
                </p>
              </div>

              <button
                type="button"
                onClick={closeMaterialModal}
                disabled={savingMaterial}
                className="rounded-full p-2 text-[#6F5549] transition hover:bg-[#F4E5DA] disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="grid gap-4 rounded-2xl border border-[#E8D6C1] bg-white p-5 md:grid-cols-2">
                <InfoItem
                  label="Guru"
                  value={editingGroup.teacher_name}
                />

                <InfoItem
                  label="Mapel"
                  value={editingGroup.subject_name}
                />

                <InfoItem
                  label="Hari / Tanggal"
                  value={`${editingGroup.day_name}, ${formatDate(
                    editingGroup.schedule_date
                  )}`}
                />

                <InfoItem
                  label="Jam"
                  value={`${formatTime(
                    editingGroup.start_time
                  )}-${formatTime(editingGroup.end_time)}`}
                />

                <InfoItem
                  label="Sesi"
                  value={editingGroup.session_name}
                />

                <InfoItem
                  label="Jumlah Siswa"
                  value={`${editingGroup.total_students} siswa`}
                />
              </div>

              <label className="block">
                <span className="text-[14px] font-extrabold text-[#2B1B18]">
                  Materi Pembelajaran
                </span>

                <textarea
                  value={materialInput}
                  onChange={(event) =>
                    setMaterialInput(event.target.value)
                  }
                  rows={6}
                  autoFocus
                  placeholder="Contoh: BAB I Tentang Tubuh Manusia"
                  className="mt-2 w-full resize-none rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-[14px] leading-6 outline-none focus:border-[#7A1F2B]"
                />
              </label>

              <div className="rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] px-4 py-3 text-[13px] leading-6 text-[#6B4A3A]">
                Materi akan diterapkan ke seluruh{" "}
                <strong>{editingGroup.total_students} siswa</strong> dalam
                rombel ini.
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={closeMaterialModal}
                  disabled={savingMaterial}
                  className="h-11 rounded-xl border border-[#E8D6C1] bg-white text-[14px] font-extrabold text-[#7A1F2B] transition hover:bg-[#FFF8EF] disabled:opacity-60"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={() => void handleSaveMaterial()}
                  disabled={savingMaterial}
                  className="h-11 rounded-xl bg-[#7A1F2B] text-[14px] font-extrabold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingMaterial
                    ? "Menyimpan..."
                    : "Simpan Materi Rombel"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {selectedGroup ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-[900px] overflow-y-auto rounded-[22px] bg-[#FAF3EA] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[#E8D6C1] bg-[#FAF3EA] px-6 py-5">
              <div>
                <h2 className="text-[22px] font-extrabold text-[#2B1B18]">
                  Detail Rombel
                </h2>

                <p className="mt-1 text-[14px] text-[#6B4A3A]">
                  {selectedGroup.subject_name} •{" "}
                  {formatDate(selectedGroup.schedule_date)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedGroup(null)}
                className="rounded-full p-2 text-[#6F5549] transition hover:bg-[#F4E5DA]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="grid gap-4 rounded-2xl border border-[#E8D6C1] bg-white p-5 md:grid-cols-3">
                <InfoItem
                  label="Guru"
                  value={selectedGroup.teacher_name}
                />

                <InfoItem
                  label="Mapel"
                  value={selectedGroup.subject_name}
                />

                <InfoItem
                  label="Hari"
                  value={selectedGroup.day_name}
                />

                <InfoItem
                  label="Tanggal"
                  value={formatDate(selectedGroup.schedule_date)}
                />

                <InfoItem
                  label="Jam"
                  value={`${formatTime(
                    selectedGroup.start_time
                  )}-${formatTime(selectedGroup.end_time)}`}
                />

                <InfoItem
                  label="Durasi"
                  value={formatDuration(
                    selectedGroup.duration_minutes,
                    selectedGroup.start_time,
                    selectedGroup.end_time
                  )}
                />

                <InfoItem
                  label="Sesi"
                  value={selectedGroup.session_name}
                />

                <InfoItem
                  label="Semester"
                  value={selectedGroup.semester}
                />

                <InfoItem
                  label="Materi"
                  value={
                    selectedGroup.display_material ||
                    "Belum diisi guru"
                  }
                />
              </div>

              <div className="overflow-hidden rounded-2xl border border-[#E8D6C1] bg-white">
                <div className="border-b border-[#E8D6C1] px-5 py-4">
                  <h3 className="text-[17px] font-extrabold text-[#2B1B18]">
                    Daftar Siswa
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[780px]">
                    <thead className="bg-[#FFF8EF] text-left text-[13px] font-extrabold text-[#6B4A3A]">
                      <tr>
                        <th className="px-5 py-4">No</th>
                        <th className="px-5 py-4">Nama Siswa</th>
                        <th className="px-5 py-4">Kelas</th>
                        <th className="px-5 py-4">NIPD</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4">Keterangan</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#E8D6C1]">
                      {selectedGroup.rows.map((row, index) => (
                        <tr key={row.id}>
                          <td className="px-5 py-4 font-bold">
                            {index + 1}
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-extrabold">
                              {row.student_name}
                            </p>

                            <p className="mt-1 text-[12px] text-[#6B4A3A]">
                              NISN: {row.student_nisn}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            {formatClass(
                              row.student_level,
                              row.student_grade
                            )}
                          </td>

                          <td className="px-5 py-4">
                            {row.student_nipd}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-[11px] font-extrabold ${getStatusBadgeClass(
                                row.attendance_status
                              )}`}
                            >
                              {row.attendance_status ||
                                "Belum diabsen"}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-[#6B4A3A]">
                            {row.attendance_note ||
                              row.understanding_status ||
                              "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedGroup(null)}
                className="h-11 w-full rounded-xl bg-[#8C0F2D] text-[14px] font-extrabold text-white transition hover:bg-[#54131D]"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </TeacherLayout>
  );
}

function AttendanceMark({
  active,
  label,
  tone,
}: {
  active: boolean;
  label: string;
  tone: "present" | "permission" | "absent";
}) {
  const activeClass = {
    present: "border-[#2F66C9] bg-[#3F73C8] text-white",
    permission: "border-[#7C5CC4] bg-[#8B6CC7] text-white",
    absent: "border-[#B93849] bg-[#C74758] text-white",
  }[tone];

  return (
    <span
      className={`mx-auto flex h-7 w-11 items-center justify-center rounded-[5px] border text-[14px] font-extrabold ${
        active
          ? activeClass
          : "border-[#D5DDE9] bg-white text-transparent"
      }`}
    >
      {label}
    </span>
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

      <p className="mt-2 text-[13px] text-[#6B4A3A]">
        {label}
      </p>
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#8A5A48]">
        {label}
      </p>

      <p className="mt-1 whitespace-pre-line font-extrabold leading-6 text-[#2B1B18]">
        {value}
      </p>
    </div>
  );
}