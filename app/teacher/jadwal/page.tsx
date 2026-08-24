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

/* =========================================================
   TYPES
========================================================= */

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

  class_id?: string | null;
  rombel_id?: string | null;
};

type SubjectRow = {
  id: string;
  name: string | null;
  level?: string | null;
  grade?: string | null;
};

type ClassRow = {
  id: string;
  name: string;
  grade_level: number;
  academic_year: string;
  is_active: boolean;
};

type RombelRow = {
  id: string;
  class_id: string;
  name: string;
  academic_year: string;
  is_active: boolean;
};

type ScheduleRow = {
  id: string;

  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;

  /*
   * BARU
   */
  class_id?: string | null;
  rombel_id?: string | null;

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

  /*
   * KELAS UTAMA
   */
  effective_class_id: string;
  class_name: string;
  grade_level: number;

  /*
   * ROMBEL
   */
  effective_rombel_id: string;
  rombel_name: string;

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

  class_id: string;
  class_name: string;
  grade_level: number;

  rombel_id: string;
  rombel_name: string;

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

/* =========================================================
   HELPERS
========================================================= */

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

function getGradeNumber(value?: string | null) {
  const match = (value || "").match(/\d+/);

  return match ? Number(match[0]) : 999;
}

function getLevelFromGradeLevel(gradeLevel: number) {
  if (gradeLevel >= 1 && gradeLevel <= 6) {
    return "SD";
  }

  if (gradeLevel >= 7 && gradeLevel <= 9) {
    return "SMP";
  }

  if (gradeLevel >= 10 && gradeLevel <= 12) {
    return "SMA";
  }

  return "-";
}

function formatClass(
  level?: string | null,
  grade?: string | null,
  gradeLevel?: number | null
) {
  const cleanLevel = normalizeLevel(level);

  const detectedGrade =
    gradeLevel && gradeLevel > 0 && gradeLevel < 99
      ? gradeLevel
      : getGradeNumber(grade);

  if (detectedGrade >= 1 && detectedGrade <= 6) {
    return `SD ${detectedGrade}`;
  }

  if (detectedGrade >= 7 && detectedGrade <= 9) {
    return `SMP ${detectedGrade}`;
  }

  if (detectedGrade >= 10 && detectedGrade <= 12) {
    return `SMA ${detectedGrade}`;
  }

  if (cleanLevel !== "-" && grade) {
    return `${cleanLevel} ${grade}`;
  }

  if (cleanLevel !== "-") return cleanLevel;

  if (grade) return grade;

  return "-";
}

function formatClassWithRombel(
  level: string,
  grade: string,
  gradeLevel: number,
  rombelName: string
) {
  const className = formatClass(level, grade, gradeLevel);

  if (!rombelName) {
    return className;
  }

  return `${className} • ${rombelName}`;
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

/*
 * PENTING:
 *
 * class_id sekarang masuk group key.
 *
 * Jadi jadwal kelas 8 dan kelas 9
 * tidak lagi berpotensi dianggap satu rombel.
 *
 * rombel_id juga masuk group key.
 */
function getScheduleGroupKey(schedule: EnrichedSchedule) {
  return [
    schedule.teacher_id || "",
    schedule.subject_id || "",

    schedule.effective_class_id || "",
    schedule.effective_rombel_id || "",

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
    const sortedRows = [...rows].sort((a, b) =>
      a.student_name.localeCompare(b.student_name)
    );

    const first = sortedRows[0];

    const attendanceMaterial =
      sortedRows.find((row) => row.attendance_material)
        ?.attendance_material || "";

    const scheduleMaterial =
      sortedRows.find((row) => row.material_topic)?.material_topic || "";

    return {
      key,

      teacher_id: first.teacher_id || "",
      teacher_name: teacherName,

      subject_id: first.subject_id || "",
      subject_name: first.subject_name,

      class_id: first.effective_class_id,
      class_name: first.class_name,

      grade_level: first.grade_level,

      rombel_id: first.effective_rombel_id,
      rombel_name: first.rombel_name,

      schedule_date: first.schedule_date || "",
      day_name: first.day_name || "-",

      start_time: first.start_time || "",
      end_time: first.end_time || "",

      duration_minutes:
        first.duration_minutes ||
        calculateDurationMinutes(
          first.start_time,
          first.end_time
        ),

      session_name: first.session_name || "-",

      semester: first.semester || "-",

      academic_year:
        first.academic_year || ACADEMIC_YEAR,

      schedule_material: scheduleMaterial,

      attendance_material: attendanceMaterial,

      display_material:
        attendanceMaterial || scheduleMaterial,

      notes: first.notes || "",

      temporary_schedule_url:
        first.temporary_schedule_url || "",

      rows: sortedRows,

      total_students: sortedRows.length,
    };
  });

  return groups.sort((a, b) => {
    const dateCompare =
      a.schedule_date.localeCompare(b.schedule_date);

    if (dateCompare !== 0) {
      return dateCompare;
    }

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

/* =========================================================
   PAGE
========================================================= */

export default function TeacherJadwalPage() {
  const [teacher, setTeacher] =
    useState<TeacherRow | null>(null);

  const [schedules, setSchedules] =
    useState<EnrichedSchedule[]>([]);

  /*
   * BARU
   */
  const [classes, setClasses] =
    useState<ClassRow[]>([]);

  const [rombels, setRombels] =
    useState<RombelRow[]>([]);

  const [loading, setLoading] = useState(true);

  const [savingMaterial, setSavingMaterial] =
    useState(false);

  /*
   * BARU
   */
  const [savingRombel, setSavingRombel] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [search, setSearch] = useState("");

  const [classFilter, setClassFilter] =
    useState("Semua Kelas");

  const [dayFilter, setDayFilter] =
    useState("Semua Hari");

  const [subjectFilter, setSubjectFilter] =
    useState("Semua Mapel");

  const [selectedGroup, setSelectedGroup] =
    useState<ScheduleGroup | null>(null);

  const [editingGroup, setEditingGroup] =
    useState<ScheduleGroup | null>(null);

  const [materialInput, setMaterialInput] =
    useState("");

  /*
   * ROMBEL MODAL
   */
  const [editingRombelGroup, setEditingRombelGroup] =
    useState<ScheduleGroup | null>(null);

  const [selectedRombelId, setSelectedRombelId] =
    useState("");

  /* =======================================================
     GET TEACHER
  ======================================================= */

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

  /* =======================================================
     FETCH DATA
  ======================================================= */

  async function fetchData() {
    setLoading(true);

    setErrorMessage("");

    try {
      const currentTeacher =
        await getCurrentTeacher();

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
        classesResponse,
        rombelsResponse,
        schedulesResponse,
        attendanceResponse,
      ] = await Promise.all([
        supabase
          .from("students")
          .select("*")
          .order("full_name"),

        supabase
          .from("subjects")
          .select("*")
          .order("name"),

        /*
         * BARU
         */
        supabase
          .from("classes")
          .select("*")
          .eq("is_active", true)
          .order("grade_level", {
            ascending: true,
          }),

        /*
         * BARU
         */
        supabase
          .from("rombels")
          .select("*")
          .eq("is_active", true)
          .eq("academic_year", ACADEMIC_YEAR)
          .order("name", {
            ascending: true,
          }),

        supabase
          .from("schedules")
          .select("*")
          .eq("teacher_id", currentTeacher.id)
          .gte(
            "schedule_date",
            ACADEMIC_YEAR_START
          )
          .lte(
            "schedule_date",
            ACADEMIC_YEAR_END
          )
          .order("schedule_date", {
            ascending: true,
          })
          .order("start_time", {
            ascending: true,
          }),

        supabase
          .from("attendance")
          .select("*")
          .eq("teacher_id", currentTeacher.id)
          .gte(
            "attendance_date",
            ACADEMIC_YEAR_START
          )
          .lte(
            "attendance_date",
            ACADEMIC_YEAR_END
          ),
      ]);

      if (studentsResponse.error) {
        throw new Error(
          studentsResponse.error.message
        );
      }

      if (subjectsResponse.error) {
        throw new Error(
          subjectsResponse.error.message
        );
      }

      if (classesResponse.error) {
        throw new Error(
          classesResponse.error.message
        );
      }

      if (rombelsResponse.error) {
        throw new Error(
          rombelsResponse.error.message
        );
      }

      if (schedulesResponse.error) {
        throw new Error(
          schedulesResponse.error.message
        );
      }

      if (attendanceResponse.error) {
        throw new Error(
          attendanceResponse.error.message
        );
      }

      const studentsData =
        (studentsResponse.data || []) as StudentRow[];

      const subjectsData =
        (subjectsResponse.data || []) as SubjectRow[];

      const classesData =
        (classesResponse.data || []) as ClassRow[];

      const rombelsData =
        (rombelsResponse.data || []) as RombelRow[];

      const schedulesData =
        (schedulesResponse.data || []) as ScheduleRow[];

      const attendanceData =
        (attendanceResponse.data ||
          []) as AttendanceRow[];

      setClasses(classesData);

      setRombels(rombelsData);

      const studentMap = new Map(
        studentsData.map((student) => [
          student.id,
          student,
        ])
      );

      const subjectMap = new Map(
        subjectsData.map((subject) => [
          subject.id,
          subject,
        ])
      );

      const classMap = new Map(
        classesData.map((classItem) => [
          classItem.id,
          classItem,
        ])
      );

      const rombelMap = new Map(
        rombelsData.map((rombel) => [
          rombel.id,
          rombel,
        ])
      );

      const attendanceMap =
        new Map<string, AttendanceRow>();

      attendanceData.forEach(
        (attendance) => {
          const key = getAttendanceKey({
            teacherId:
              attendance.teacher_id,

            studentId:
              attendance.student_id,

            subjectId:
              attendance.subject_id,

            date:
              attendance.attendance_date,

            startTime:
              attendance.start_time,

            endTime:
              attendance.end_time,
          });

          attendanceMap.set(
            key,
            attendance
          );
        }
      );

      const enrichedSchedules:
        EnrichedSchedule[] =
        schedulesData
          .filter((schedule) => {
            if (!schedule.schedule_date) {
              return false;
            }

            const correctDate =
              schedule.schedule_date >=
                ACADEMIC_YEAR_START &&
              schedule.schedule_date <=
                ACADEMIC_YEAR_END;

            const correctAcademicYear =
              !schedule.academic_year ||
              schedule.academic_year ===
                ACADEMIC_YEAR;

            return (
              correctDate &&
              correctAcademicYear
            );
          })
          .map((schedule) => {
            const student =
              schedule.student_id
                ? studentMap.get(
                    schedule.student_id
                  )
                : null;

            const subject =
              schedule.subject_id
                ? subjectMap.get(
                    schedule.subject_id
                  )
                : null;

            /*
             * CLASS:
             *
             * Prioritas:
             * schedule.class_id
             * lalu student.class_id
             */
            const effectiveClassId =
              schedule.class_id ||
              student?.class_id ||
              "";

            const classData =
              effectiveClassId
                ? classMap.get(
                    effectiveClassId
                  )
                : null;

            /*
             * ROMBEL:
             *
             * Prioritas schedule.rombel_id.
             *
             * Kalau schedule belum punya,
             * fallback student.rombel_id.
             */
            const effectiveRombelId =
              schedule.rombel_id ||
              student?.rombel_id ||
              "";

            const rombelData =
              effectiveRombelId
                ? rombelMap.get(
                    effectiveRombelId
                  )
                : null;

            const attendanceKey =
              getAttendanceKey({
                teacherId:
                  schedule.teacher_id,

                studentId:
                  schedule.student_id,

                subjectId:
                  schedule.subject_id,

                date:
                  schedule.schedule_date,

                startTime:
                  schedule.start_time,

                endTime:
                  schedule.end_time,
              });

            const attendance =
              attendanceMap.get(
                attendanceKey
              );

            const detectedGrade =
              classData?.grade_level ||
              getGradeNumber(
                student?.grade
              );

            return {
              ...schedule,

              student_name:
                student?.full_name || "-",

              student_grade:
                student?.grade || "-",

              student_level:
                student?.level || "-",

              student_nipd:
                student?.nis || "-",

              student_nisn:
                student?.nisn || "-",

              effective_class_id:
                effectiveClassId,

              class_name:
                classData?.name ||
                String(detectedGrade),

              grade_level:
                detectedGrade,

              effective_rombel_id:
                effectiveRombelId,

              rombel_name:
                rombelData?.name || "",

              subject_name:
                subject?.name || "-",

              subject_level:
                subject?.level || "-",

              subject_grade:
                subject?.grade || "-",

              attendance_status:
                normalizeAttendanceStatus(
                  attendance?.attendance_status
                ),

              attendance_note:
                getAttendanceNote(
                  attendance
                ),

              understanding_status:
                attendance?.understanding_status ||
                "-",

              attendance_material:
                attendance?.material_topic ||
                "",
            };
          });

      setSchedules(
        enrichedSchedules
      );
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(
          error.message
        );
      } else {
        setErrorMessage(
          "Gagal mengambil data jadwal mengajar."
        );
      }

      setTeacher(null);

      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     REALTIME
  ======================================================= */

  useEffect(() => {
    void fetchData();

    const channel = supabase
      .channel(
        "teacher-jadwal-rombel-realtime"
      )

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

      /*
       * BARU
       */
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "classes",
        },
        () => void fetchData()
      )

      /*
       * BARU
       */
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rombels",
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
      void supabase.removeChannel(
        channel
      );
    };
  }, []);

  /* =======================================================
     GROUP DATA
  ======================================================= */

  const groupedSchedules =
    useMemo(() => {
      return groupSchedules(
        schedules,
        teacher?.full_name || "Guru"
      );
    }, [
      schedules,
      teacher?.full_name,
    ]);

  /* =======================================================
     CLASS FILTER
  ======================================================= */

  const classOptions =
    useMemo(() => {
      return Array.from(
        new Set(
          schedules
            .map((schedule) =>
              formatClass(
                schedule.student_level,
                schedule.student_grade,
                schedule.grade_level
              )
            )
            .filter(
              (item) =>
                item && item !== "-"
            )
        )
      ).sort((a, b) => {
        return (
          getGradeNumber(a) -
          getGradeNumber(b)
        );
      });
    }, [schedules]);

  const subjectOptions =
    useMemo(() => {
      return Array.from(
        new Set(
          schedules
            .map(
              (schedule) =>
                schedule.subject_name
            )
            .filter(
              (subject) =>
                subject &&
                subject !== "-"
            )
        )
      ).sort((a, b) =>
        a.localeCompare(b)
      );
    }, [schedules]);

  /* =======================================================
     FILTER
  ======================================================= */

  const filteredGroups =
    useMemo(() => {
      const keyword =
        normalizeText(search);

      return groupedSchedules.filter(
        (group) => {
          const groupClass =
            formatClass(
              getLevelFromGradeLevel(
                group.grade_level
              ),
              group.class_name,
              group.grade_level
            );

          const matchSearch =
            !keyword ||
            normalizeText(
              group.teacher_name
            ).includes(keyword) ||
            normalizeText(
              group.subject_name
            ).includes(keyword) ||
            normalizeText(
              group.rombel_name
            ).includes(keyword) ||
            normalizeText(
              group.display_material
            ).includes(keyword) ||
            normalizeText(
              group.notes
            ).includes(keyword) ||
            normalizeText(
              group.session_name
            ).includes(keyword) ||
            normalizeText(
              group.day_name
            ).includes(keyword) ||
            group.rows.some(
              (row) =>
                normalizeText(
                  row.student_name
                ).includes(keyword) ||
                normalizeText(
                  row.student_nipd
                ).includes(keyword) ||
                normalizeText(
                  row.student_nisn
                ).includes(keyword) ||
                normalizeText(
                  row.attendance_status
                ).includes(keyword) ||
                normalizeText(
                  row.attendance_note
                ).includes(keyword)
            );

          const matchClass =
            classFilter ===
              "Semua Kelas" ||
            groupClass ===
              classFilter;

          const matchDay =
            dayFilter ===
              "Semua Hari" ||
            group.day_name ===
              dayFilter;

          const matchSubject =
            subjectFilter ===
              "Semua Mapel" ||
            group.subject_name ===
              subjectFilter;

          return (
            matchSearch &&
            matchClass &&
            matchDay &&
            matchSubject
          );
        }
      );
    }, [
      groupedSchedules,
      search,
      classFilter,
      dayFilter,
      subjectFilter,
    ]);

  const todayGroups =
    useMemo(() => {
      return groupedSchedules.filter(
        (group) =>
          group.schedule_date ===
          todayYMD()
      );
    }, [groupedSchedules]);

  const totalStudents =
    useMemo(() => {
      return new Set(
        schedules
          .map(
            (schedule) =>
              schedule.student_id
          )
          .filter(Boolean)
      ).size;
    }, [schedules]);

  const completedAttendance =
    useMemo(() => {
      return schedules.filter(
        (schedule) =>
          Boolean(
            schedule.attendance_status
          )
      ).length;
    }, [schedules]);

  /* =======================================================
     ROMBEL OPTIONS
  ======================================================= */

  const availableRombelsForEditing =
    useMemo(() => {
      if (
        !editingRombelGroup?.class_id
      ) {
        return [];
      }

      return rombels.filter(
        (rombel) =>
          rombel.class_id ===
            editingRombelGroup.class_id &&
          rombel.academic_year ===
            ACADEMIC_YEAR &&
          rombel.is_active
      );
    }, [
      rombels,
      editingRombelGroup,
    ]);

  /* =======================================================
     MATERIAL
  ======================================================= */

  function openMaterialModal(
    group: ScheduleGroup
  ) {
    setEditingGroup(group);

    setMaterialInput(
      group.display_material || ""
    );

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
      setErrorMessage(
        "Data guru aktif tidak ditemukan."
      );

      return;
    }

    if (!editingGroup) {
      setErrorMessage(
        "Data jadwal tidak ditemukan."
      );

      return;
    }

    if (!materialInput.trim()) {
      setErrorMessage(
        "Materi pembelajaran wajib diisi."
      );

      return;
    }

    setSavingMaterial(true);

    setErrorMessage("");

    setSuccessMessage("");

    try {
      const scheduleIds =
        editingGroup.rows.map(
          (row) => row.id
        );

      const now =
        new Date().toISOString();

      const { error: scheduleError } =
        await supabase
          .from("schedules")
          .update({
            material_topic:
              materialInput.trim(),

            updated_at: now,
          })
          .in("id", scheduleIds)
          .eq(
            "teacher_id",
            teacher.id
          );

      if (scheduleError) {
        throw new Error(
          scheduleError.message
        );
      }

      const {
        error: attendanceError,
      } = await supabase
        .from("attendance")
        .update({
          material_topic:
            materialInput.trim(),

          updated_at: now,
        })
        .eq(
          "teacher_id",
          teacher.id
        )
        .eq(
          "subject_id",
          editingGroup.subject_id
        )
        .eq(
          "attendance_date",
          editingGroup.schedule_date
        )
        .eq(
          "start_time",
          editingGroup.start_time
        )
        .eq(
          "end_time",
          editingGroup.end_time
        );

      if (attendanceError) {
        throw new Error(
          attendanceError.message
        );
      }

      setSuccessMessage(
        `Materi "${materialInput.trim()}" berhasil disimpan untuk ${editingGroup.total_students} siswa.`
      );

      setEditingGroup(null);

      setMaterialInput("");

      await fetchData();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(
          error.message
        );
      } else {
        setErrorMessage(
          "Gagal menyimpan materi pembelajaran."
        );
      }
    } finally {
      setSavingMaterial(false);
    }
  }

  /* =======================================================
     EDIT ROMBEL
  ======================================================= */

  function openRombelModal(
    group: ScheduleGroup
  ) {
    setEditingRombelGroup(group);

    setSelectedRombelId(
      group.rombel_id || ""
    );

    setErrorMessage("");

    setSuccessMessage("");
  }

  function closeRombelModal() {
    if (savingRombel) return;

    setEditingRombelGroup(null);

    setSelectedRombelId("");
  }

  async function handleSaveRombel() {
    if (!teacher?.id) {
      setErrorMessage(
        "Data guru aktif tidak ditemukan."
      );

      return;
    }

    if (!editingRombelGroup) {
      setErrorMessage(
        "Data jadwal tidak ditemukan."
      );

      return;
    }

    /*
     * Kalau kelas tersebut punya rombel,
     * wajib pilih salah satu.
     */
    if (
      availableRombelsForEditing.length >
        0 &&
      !selectedRombelId
    ) {
      setErrorMessage(
        "Silakan pilih rombel terlebih dahulu."
      );

      return;
    }

    setSavingRombel(true);

    setErrorMessage("");

    setSuccessMessage("");

    try {
      const scheduleIds =
        editingRombelGroup.rows.map(
          (row) => row.id
        );

      const selectedRombel =
        rombels.find(
          (rombel) =>
            rombel.id ===
            selectedRombelId
        );

      const now =
        new Date().toISOString();

      /*
       * Update SEMUA schedule dalam
       * kelompok jadwal ini.
       *
       * Kelas utama tetap sama.
       *
       * Yang berubah hanya rombel_id.
       */
      const { error } = await supabase
        .from("schedules")
        .update({
          class_id:
            editingRombelGroup.class_id ||
            null,

          rombel_id:
            selectedRombelId || null,

          updated_at: now,
        })
        .in("id", scheduleIds)
        .eq(
          "teacher_id",
          teacher.id
        );

      if (error) {
        throw new Error(
          error.message
        );
      }

      setSuccessMessage(
        selectedRombel
          ? `Jadwal ${formatClass(
              getLevelFromGradeLevel(
                editingRombelGroup.grade_level
              ),
              editingRombelGroup.class_name,
              editingRombelGroup.grade_level
            )} berhasil diubah ke rombel ${selectedRombel.name}.`
          : "Rombel jadwal berhasil diperbarui."
      );

      setEditingRombelGroup(null);

      setSelectedRombelId("");

      await fetchData();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(
          error.message
        );
      } else {
        setErrorMessage(
          "Gagal menyimpan perubahan rombel."
        );
      }
    } finally {
      setSavingRombel(false);
    }
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <TeacherLayout
      activeMenu={
        "Jadwal Mengajar" as any
      }
      teacherName={
        teacher?.full_name ||
        "Guru"
      }
      teacherSubject={formatTeacherSubject(
        teacher?.subjects
      )}
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
            Jadwal dasar dibuat oleh
            Admin/Kepala Sekolah. Guru
            dapat menentukan rombel,
            mengisi materi, dan melihat
            status absensi siswa.
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

        {/* SUMMARY */}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={
              <CalendarDays className="h-5 w-5" />
            }
            label="Total Jadwal"
            value={
              groupedSchedules.length
            }
            info={ACADEMIC_YEAR}
            tone="pink"
          />

          <SummaryCard
            icon={
              <Clock className="h-5 w-5" />
            }
            label="Jadwal Hari Ini"
            value={todayGroups.length}
            info={formatDate(
              todayYMD()
            )}
            tone="orange"
          />

          <SummaryCard
            icon={
              <UsersRound className="h-5 w-5" />
            }
            label="Total Murid"
            value={totalStudents}
            info="Murid terjadwal"
            tone="blue"
          />

          <SummaryCard
            icon={
              <CheckCircle2 className="h-5 w-5" />
            }
            label="Sudah Diabsen"
            value={
              completedAttendance
            }
            info={`${schedules.length} data jadwal`}
            tone="green"
          />
        </div>

        {/* FILTER */}

        <div className="rounded-[22px] border border-[#E1CFBE] bg-white p-5 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8E6A58]" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Cari siswa, NIPD, NISN, kelas, rombel, mapel atau materi..."
                className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] pl-11 pr-4 text-[14px] outline-none placeholder:text-[#9A7B6C] focus:border-[#9C0824]"
              />
            </div>

            <select
              value={classFilter}
              onChange={(event) =>
                setClassFilter(
                  event.target.value
                )
              }
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              <option>
                Semua Kelas
              </option>

              {classOptions.map(
                (className) => (
                  <option
                    key={className}
                  >
                    {className}
                  </option>
                )
              )}
            </select>

            <select
              value={dayFilter}
              onChange={(event) =>
                setDayFilter(
                  event.target.value
                )
              }
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              <option>
                Semua Hari
              </option>

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
              onChange={(event) =>
                setSubjectFilter(
                  event.target.value
                )
              }
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              <option>
                Semua Mapel
              </option>

              {subjectOptions.map(
                (subject) => (
                  <option
                    key={subject}
                  >
                    {subject}
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        {/* TABLE */}

        <div className="overflow-hidden rounded-[22px] border border-[#E1CFBE] bg-white shadow-sm">
          <div className="border-b border-[#EADACA] px-6 py-5">
            <h2 className="text-[20px] font-extrabold text-[#2B1B18]">
              Jadwal dan Absensi Guru &
              Siswa
            </h2>

            <p className="mt-1 text-[14px] text-[#6F5549]">
              Guru dapat mengatur rombel
              untuk kelas yang memiliki
              lebih dari satu kelompok
              belajar.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1750px] border-collapse">
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
                    colSpan={7}
                    className="border-r border-[#EADACA] px-4 py-4 text-center"
                  >
                    Jadwal Kegiatan
                    Belajar Mengajar
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
                    Rombel
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
                      colSpan={19}
                      className="px-6 py-12 text-center text-[#6F5549]"
                    >
                      Memuat jadwal
                      mengajar...
                    </td>
                  </tr>
                ) : filteredGroups.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={19}
                      className="px-6 py-12 text-center text-[#6F5549]"
                    >
                      Belum ada jadwal
                      mengajar yang sesuai
                      filter.
                    </td>
                  </tr>
                ) : (
                  filteredGroups.flatMap(
                    (
                      group,
                      groupIndex
                    ) =>
                      group.rows.map(
                        (
                          row,
                          rowIndex
                        ) => {
                          const firstRow =
                            rowIndex === 0;

                          const rowSpan =
                            group.rows
                              .length;

                          return (
                            <tr
                              key={
                                row.id
                              }
                              className="border-b border-[#F0E1D4] text-[14px] text-[#2B1B18] hover:bg-[#FFFDFC]"
                            >
                              {firstRow ? (
                                <>
                                  <td
                                    rowSpan={
                                      rowSpan
                                    }
                                    className="border-r border-[#F0E1D4] px-4 py-4 align-top font-bold"
                                  >
                                    {groupIndex +
                                      1}
                                  </td>

                                  <td
                                    rowSpan={
                                      rowSpan
                                    }
                                    className="border-r border-[#F0E1D4] px-4 py-4 align-top font-extrabold"
                                  >
                                    {
                                      group.day_name
                                    }
                                  </td>

                                  <td
                                    rowSpan={
                                      rowSpan
                                    }
                                    className="whitespace-nowrap border-r border-[#F0E1D4] px-4 py-4 align-top"
                                  >
                                    {formatDate(
                                      group.schedule_date
                                    )}
                                  </td>

                                  <td
                                    rowSpan={
                                      rowSpan
                                    }
                                    className="border-r border-[#F0E1D4] px-4 py-4 align-top"
                                  >
                                    <p className="font-extrabold">
                                      {
                                        group.teacher_name
                                      }
                                    </p>

                                    <p className="mt-1 text-[12px] text-[#6F5549]">
                                      {teacher?.teacher_code ||
                                        "-"}
                                    </p>
                                  </td>

                                  <td
                                    rowSpan={
                                      rowSpan
                                    }
                                    className="whitespace-nowrap border-r border-[#F0E1D4] px-4 py-4 align-top"
                                  >
                                    {formatTime(
                                      group.start_time
                                    )}
                                  </td>

                                  <td
                                    rowSpan={
                                      rowSpan
                                    }
                                    className="whitespace-nowrap border-r border-[#F0E1D4] px-4 py-4 align-top"
                                  >
                                    {formatTime(
                                      group.end_time
                                    )}
                                  </td>

                                  <td
                                    rowSpan={
                                      rowSpan
                                    }
                                    className="whitespace-nowrap border-r border-[#F0E1D4] px-4 py-4 align-top"
                                  >
                                    {formatTime(
                                      group.start_time
                                    )}
                                    -
                                    {formatTime(
                                      group.end_time
                                    )}
                                  </td>

                                  <td
                                    rowSpan={
                                      rowSpan
                                    }
                                    className="border-r border-[#F0E1D4] px-4 py-4 align-top"
                                  >
                                    {
                                      group.session_name
                                    }
                                  </td>
                                </>
                              ) : null}

                              <td className="border-r border-[#F0E1D4] px-4 py-4">
                                {formatClass(
                                  row.student_level,
                                  row.student_grade,
                                  row.grade_level
                                )}
                              </td>

                              <td className="border-r border-[#F0E1D4] px-4 py-4">
                                {row.rombel_name ? (
                                  <span className="inline-flex rounded-full bg-[#F8E1E8] px-3 py-1 text-[11px] font-extrabold text-[#8C0F2D]">
                                    {
                                      row.rombel_name
                                    }
                                  </span>
                                ) : (
                                  <span className="text-[12px] text-[#8A6A5A]">
                                    Belum
                                    ditentukan
                                  </span>
                                )}
                              </td>

                              {firstRow ? (
                                <>
                                  <td
                                    rowSpan={
                                      rowSpan
                                    }
                                    className="border-r border-[#F0E1D4] px-4 py-4 align-top font-bold"
                                  >
                                    {
                                      group.subject_name
                                    }
                                  </td>

                                  <td
                                    rowSpan={
                                      rowSpan
                                    }
                                    className="min-w-[240px] border-r border-[#F0E1D4] px-4 py-4 align-top"
                                  >
                                    {group.display_material ? (
                                      <p className="whitespace-pre-line font-bold leading-6">
                                        {
                                          group.display_material
                                        }
                                      </p>
                                    ) : (
                                      <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-[11px] font-extrabold text-amber-700">
                                        Belum
                                        diisi
                                        guru
                                      </span>
                                    )}
                                  </td>
                                </>
                              ) : null}

                              <td className="min-w-[220px] border-r border-[#F0E1D4] px-4 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F8DFD0] text-[12px] font-extrabold text-[#8C0F2D]">
                                    {getInitials(
                                      row.student_name
                                    )}
                                  </div>

                                  <div>
                                    <p className="font-extrabold">
                                      {
                                        row.student_name
                                      }
                                    </p>

                                    <p className="mt-1 text-[11px] text-[#6F5549]">
                                      NIPD:{" "}
                                      {
                                        row.student_nipd
                                      }
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="border-r border-[#F0E1D4] px-4 py-4 text-center">
                                <AttendanceMark
                                  active={
                                    row.attendance_status ===
                                    "Hadir"
                                  }
                                  label="✓"
                                  tone="present"
                                />
                              </td>

                              <td className="border-r border-[#F0E1D4] px-4 py-4 text-center">
                                <AttendanceMark
                                  active={
                                    row.attendance_status ===
                                    "Izin"
                                  }
                                  label="✓"
                                  tone="permission"
                                />
                              </td>

                              <td className="border-r border-[#F0E1D4] px-4 py-4 text-center">
                                <AttendanceMark
                                  active={
                                    row.attendance_status ===
                                    "Alpa"
                                  }
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
                                      {
                                        row.attendance_status
                                      }
                                    </span>

                                    <p className="mt-2 whitespace-pre-line text-[12px] leading-5 text-[#6F5549]">
                                      {row.attendance_note ||
                                        row.understanding_status ||
                                        "-"}
                                    </p>
                                  </>
                                ) : (
                                  <span className="text-[12px] text-[#8A6A5A]">
                                    Belum
                                    diabsen
                                  </span>
                                )}
                              </td>

                              {firstRow ? (
                                <td
                                  rowSpan={
                                    rowSpan
                                  }
                                  className="px-4 py-4 align-top"
                                >
                                  <div className="flex min-w-[150px] flex-col gap-2">
                                    {/* ROMBEL */}

                                    <button
                                      type="button"
                                      onClick={() =>
                                        openRombelModal(
                                          group
                                        )
                                      }
                                      className="inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#8C0F2D] bg-white px-3 text-[12px] font-extrabold text-[#8C0F2D] transition hover:bg-[#FFF3F5]"
                                    >
                                      <Edit3 className="h-3.5 w-3.5" />

                                      {group.rombel_name
                                        ? "Edit Rombel"
                                        : "Pilih Rombel"}
                                    </button>

                                    {/* MATERIAL */}

                                    <button
                                      type="button"
                                      onClick={() =>
                                        openMaterialModal(
                                          group
                                        )
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
                                      onClick={() =>
                                        setSelectedGroup(
                                          group
                                        )
                                      }
                                      className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-xl border border-[#DCC8B6] px-3 text-[12px] font-extrabold text-[#8C0F2D] transition hover:bg-[#FFF8EF]"
                                    >
                                      Detail
                                      Rombel
                                    </button>

                                    {group.temporary_schedule_url ? (
                                      <a
                                        href={
                                          group.temporary_schedule_url
                                        }
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
                        }
                      )
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ===================================================
          MODAL EDIT ROMBEL
      =================================================== */}

      {editingRombelGroup ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
          <div className="w-full max-w-[560px] overflow-hidden rounded-[22px] bg-[#FAF3EA] shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#E8D6C1] px-6 py-5">
              <div>
                <h2 className="text-[22px] font-extrabold text-[#2B1B18]">
                  Pilih / Edit Rombel
                </h2>

                <p className="mt-1 text-[14px] text-[#6B4A3A]">
                  {formatClass(
                    getLevelFromGradeLevel(
                      editingRombelGroup.grade_level
                    ),
                    editingRombelGroup.class_name,
                    editingRombelGroup.grade_level
                  )}{" "}
                  •{" "}
                  {
                    editingRombelGroup.subject_name
                  }
                </p>
              </div>

              <button
                type="button"
                disabled={
                  savingRombel
                }
                onClick={
                  closeRombelModal
                }
                className="rounded-full p-2 text-[#6F5549] transition hover:bg-[#F4E5DA] disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="grid gap-4 rounded-2xl border border-[#E8D6C1] bg-white p-5 md:grid-cols-2">
                <InfoItem
                  label="Guru"
                  value={
                    editingRombelGroup.teacher_name
                  }
                />

                <InfoItem
                  label="Mapel"
                  value={
                    editingRombelGroup.subject_name
                  }
                />

                <InfoItem
                  label="Kelas"
                  value={formatClass(
                    getLevelFromGradeLevel(
                      editingRombelGroup.grade_level
                    ),
                    editingRombelGroup.class_name,
                    editingRombelGroup.grade_level
                  )}
                />

                <InfoItem
                  label="Rombel Saat Ini"
                  value={
                    editingRombelGroup.rombel_name ||
                    "Belum ditentukan"
                  }
                />

                <InfoItem
                  label="Tanggal"
                  value={formatDate(
                    editingRombelGroup.schedule_date
                  )}
                />

                <InfoItem
                  label="Jam"
                  value={`${formatTime(
                    editingRombelGroup.start_time
                  )}-${formatTime(
                    editingRombelGroup.end_time
                  )}`}
                />
              </div>

              <div>
                <label className="text-[14px] font-extrabold text-[#2B1B18]">
                  Pilih Rombel
                </label>

                {availableRombelsForEditing.length >
                0 ? (
                  <>
                    <select
                      value={
                        selectedRombelId
                      }
                      onChange={(
                        event
                      ) =>
                        setSelectedRombelId(
                          event.target
                            .value
                        )
                      }
                      className="mt-2 h-12 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 text-[14px] outline-none focus:border-[#8C0F2D]"
                    >
                      <option value="">
                        Pilih rombel
                      </option>

                      {availableRombelsForEditing.map(
                        (rombel) => (
                          <option
                            key={
                              rombel.id
                            }
                            value={
                              rombel.id
                            }
                          >
                            {
                              rombel.name
                            }
                          </option>
                        )
                      )}
                    </select>

                    <p className="mt-2 text-[12px] leading-5 text-[#6B4A3A]">
                      Pilihan diambil
                      otomatis dari tabel{" "}
                      <strong>
                        rombels
                      </strong>
                      . Jika sekolah
                      menambahkan 9.3,
                      maka 9.3 otomatis
                      muncul di sini.
                    </p>
                  </>
                ) : (
                  <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-[13px] leading-6 text-amber-700">
                    Kelas ini belum
                    memiliki data rombel.
                    Guru tetap bisa
                    menggunakan kelas
                    utama tanpa rombel.
                  </div>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  disabled={
                    savingRombel
                  }
                  onClick={
                    closeRombelModal
                  }
                  className="h-11 rounded-xl border border-[#E8D6C1] bg-white text-[14px] font-extrabold text-[#7A1F2B] transition hover:bg-[#FFF8EF] disabled:opacity-60"
                >
                  Batal
                </button>

                <button
                  type="button"
                  disabled={
                    savingRombel ||
                    availableRombelsForEditing.length ===
                      0
                  }
                  onClick={() =>
                    void handleSaveRombel()
                  }
                  className="h-11 rounded-xl bg-[#7A1F2B] text-[14px] font-extrabold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingRombel
                    ? "Menyimpan..."
                    : "Simpan Rombel"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ===================================================
          MATERIAL MODAL
      =================================================== */}

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
                  {
                    editingGroup.subject_name
                  }{" "}
                  •{" "}
                  {formatDate(
                    editingGroup.schedule_date
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeMaterialModal
                }
                disabled={
                  savingMaterial
                }
                className="rounded-full p-2 text-[#6F5549] transition hover:bg-[#F4E5DA] disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="grid gap-4 rounded-2xl border border-[#E8D6C1] bg-white p-5 md:grid-cols-2">
                <InfoItem
                  label="Guru"
                  value={
                    editingGroup.teacher_name
                  }
                />

                <InfoItem
                  label="Mapel"
                  value={
                    editingGroup.subject_name
                  }
                />

                <InfoItem
                  label="Kelas"
                  value={formatClassWithRombel(
                    getLevelFromGradeLevel(
                      editingGroup.grade_level
                    ),
                    editingGroup.class_name,
                    editingGroup.grade_level,
                    editingGroup.rombel_name
                  )}
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
                  )}-${formatTime(
                    editingGroup.end_time
                  )}`}
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
                  value={
                    materialInput
                  }
                  onChange={(event) =>
                    setMaterialInput(
                      event.target.value
                    )
                  }
                  rows={6}
                  autoFocus
                  placeholder="Contoh: BAB I Tentang Tubuh Manusia"
                  className="mt-2 w-full resize-none rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-[14px] leading-6 outline-none focus:border-[#7A1F2B]"
                />
              </label>

              <div className="rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] px-4 py-3 text-[13px] leading-6 text-[#6B4A3A]">
                Materi akan
                diterapkan ke seluruh{" "}
                <strong>
                  {
                    editingGroup.total_students
                  }{" "}
                  siswa
                </strong>{" "}
                dalam jadwal ini.
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={
                    closeMaterialModal
                  }
                  disabled={
                    savingMaterial
                  }
                  className="h-11 rounded-xl border border-[#E8D6C1] bg-white text-[14px] font-extrabold text-[#7A1F2B] transition hover:bg-[#FFF8EF] disabled:opacity-60"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void handleSaveMaterial()
                  }
                  disabled={
                    savingMaterial
                  }
                  className="h-11 rounded-xl bg-[#7A1F2B] text-[14px] font-extrabold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingMaterial
                    ? "Menyimpan..."
                    : "Simpan Materi"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ===================================================
          DETAIL
      =================================================== */}

      {selectedGroup ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-[900px] overflow-y-auto rounded-[22px] bg-[#FAF3EA] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[#E8D6C1] bg-[#FAF3EA] px-6 py-5">
              <div>
                <h2 className="text-[22px] font-extrabold text-[#2B1B18]">
                  Detail Rombel
                </h2>

                <p className="mt-1 text-[14px] text-[#6B4A3A]">
                  {
                    selectedGroup.subject_name
                  }{" "}
                  •{" "}
                  {formatDate(
                    selectedGroup.schedule_date
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedGroup(null)
                }
                className="rounded-full p-2 text-[#6F5549] transition hover:bg-[#F4E5DA]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="grid gap-4 rounded-2xl border border-[#E8D6C1] bg-white p-5 md:grid-cols-3">
                <InfoItem
                  label="Guru"
                  value={
                    selectedGroup.teacher_name
                  }
                />

                <InfoItem
                  label="Mapel"
                  value={
                    selectedGroup.subject_name
                  }
                />

                <InfoItem
                  label="Kelas"
                  value={formatClass(
                    getLevelFromGradeLevel(
                      selectedGroup.grade_level
                    ),
                    selectedGroup.class_name,
                    selectedGroup.grade_level
                  )}
                />

                <InfoItem
                  label="Rombel"
                  value={
                    selectedGroup.rombel_name ||
                    "Belum ditentukan"
                  }
                />

                <InfoItem
                  label="Hari"
                  value={
                    selectedGroup.day_name
                  }
                />

                <InfoItem
                  label="Tanggal"
                  value={formatDate(
                    selectedGroup.schedule_date
                  )}
                />

                <InfoItem
                  label="Jam"
                  value={`${formatTime(
                    selectedGroup.start_time
                  )}-${formatTime(
                    selectedGroup.end_time
                  )}`}
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
                  value={
                    selectedGroup.session_name
                  }
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
                        <th className="px-5 py-4">
                          No
                        </th>

                        <th className="px-5 py-4">
                          Nama Siswa
                        </th>

                        <th className="px-5 py-4">
                          Kelas
                        </th>

                        <th className="px-5 py-4">
                          Rombel
                        </th>

                        <th className="px-5 py-4">
                          NIPD
                        </th>

                        <th className="px-5 py-4">
                          Status
                        </th>

                        <th className="px-5 py-4">
                          Keterangan
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#E8D6C1]">
                      {selectedGroup.rows.map(
                        (
                          row,
                          index
                        ) => (
                          <tr
                            key={
                              row.id
                            }
                          >
                            <td className="px-5 py-4 font-bold">
                              {index +
                                1}
                            </td>

                            <td className="px-5 py-4">
                              <p className="font-extrabold">
                                {
                                  row.student_name
                                }
                              </p>

                              <p className="mt-1 text-[12px] text-[#6B4A3A]">
                                NISN:{" "}
                                {
                                  row.student_nisn
                                }
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              {formatClass(
                                row.student_level,
                                row.student_grade,
                                row.grade_level
                              )}
                            </td>

                            <td className="px-5 py-4">
                              {row.rombel_name ||
                                "-"}
                            </td>

                            <td className="px-5 py-4">
                              {
                                row.student_nipd
                              }
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
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedGroup(null)
                }
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

/* =========================================================
   ATTENDANCE MARK
========================================================= */

function AttendanceMark({
  active,
  label,
  tone,
}: {
  active: boolean;
  label: string;
  tone:
    | "present"
    | "permission"
    | "absent";
}) {
  const activeClass = {
    present:
      "border-[#2F66C9] bg-[#3F73C8] text-white",

    permission:
      "border-[#7C5CC4] bg-[#8B6CC7] text-white",

    absent:
      "border-[#B93849] bg-[#C74758] text-white",
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

/* =========================================================
   SUMMARY CARD
========================================================= */

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
  tone:
    | "pink"
    | "orange"
    | "blue"
    | "green";
}) {
  const toneClass = {
    pink:
      "bg-[#F8E1E8] text-[#8C0F2D]",

    orange:
      "bg-[#F4DFD5] text-[#B85C38]",

    blue:
      "bg-[#D7ECFA] text-[#1779B8]",

    green:
      "bg-[#C7F0DA] text-[#158A58]",
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

/* =========================================================
   INFO
========================================================= */

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