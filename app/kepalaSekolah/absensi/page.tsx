"use client";

import { useEffect, useMemo, useState, type ReactNode, type ChangeEvent } from "react";
import * as XLSX from "xlsx";
import {
  AlertCircle,
  CalendarCheck,
  FileSpreadsheet,
  Upload,
  Download,
  Printer,
  Eye,
  Search,
  UserCheck,
  UserX,
  UsersRound,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import KepalaSekolahLayout from "../components/KepalaSekolahLayout";

/* =========================================================
   TYPES
========================================================= */

type TeacherRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  teacher_code?: string | null;
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

type AttendanceRow = {
  id: string;

  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;

  attendance_date: string | null;
  day_name: string | null;

  teacher_arrival_time?: string | null;
  teacher_departure_time?: string | null;

  start_time: string | null;
  end_time: string | null;

  duration_minutes?: number | null;
  session_name?: string | null;

  attendance_status: string | null;
  understanding_status: string | null;

  material_topic: string | null;

  note?: string | null;
  notes?: string | null;
};

type TeacherAttendanceRow = {
  id: string;
  teacher_id: string;
  attendance_date: string;
  arrival_time: string | null;
  departure_time: string | null;
  status: string;
  notes: string | null;
  created_at?: string;
};

type TeacherImportRow = {
  rowNumber: number;
  teacherCode: string;
  teacherId: string | null;
  teacherName: string;
  attendanceDate: string;
  arrivalTime: string | null;
  departureTime: string | null;
  status: string;
  notes: string | null;
  error: string | null;
};

type EnrichedAttendance = AttendanceRow & {
  student_name: string;
  student_grade: string;
  student_level: string;
  student_nis: string;
  student_nisn: string;

  teacher_name: string;
  subject_name: string;
};

type RombelGroup = {
  key: string;

  attendance_date: string | null;
  day_name: string | null;

  teacher_arrival_time: string | null;
  teacher_departure_time: string | null;

  start_time: string | null;
  end_time: string | null;

  duration_minutes: number | null;
  session_name: string | null;

  teacher_id: string | null;
  teacher_name: string;

  subject_id: string | null;
  subject_name: string;

  material_topic: string | null;

  students: EnrichedAttendance[];

  total: number;
  hadir: number;
  izin: number;
  alpa: number;
  sakit: number;

  paham: number;
  cukupPaham: number;
  belumPaham: number;
};

/* =========================================================
   OPTIONS
========================================================= */

const statusOptions = [
  "Semua Status",
  "Hadir",
  "Izin",
  "Alpa",
  "Sakit",
];

const monthOptions = [
  "Semua Bulan",
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

/* =========================================================
   HELPERS
========================================================= */

function normalizeText(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function normalizeLevel(level?: string | null) {
  const safe = normalizeText(level);

  if (safe.includes("primary") || safe === "sd") {
    return "SD";
  }

  if (safe.includes("secondary") || safe === "smp") {
    return "SMP";
  }

  if (safe.includes("high") || safe === "sma") {
    return "SMA";
  }

  if (safe.includes("early")) {
    return "Bimbel/Kursus";
  }

  return level || "-";
}

function formatClass(
  level?: string | null,
  grade?: string | null
) {
  const cleanLevel = normalizeLevel(level);
  const cleanGrade = grade || "";

  if (cleanLevel && cleanGrade) {
    return `${cleanLevel} ${cleanGrade}`;
  }

  if (cleanLevel) return cleanLevel;
  if (cleanGrade) return cleanGrade;

  return "-";
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatExcelDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function formatTime(value?: string | null) {
  if (!value) return "-";

  return value.slice(0, 5);
}

function calculateDurationMinutes(
  startTime?: string | null,
  endTime?: string | null
) {
  if (!startTime || !endTime) {
    return null;
  }

  const [startHour, startMinute] = startTime
    .split(":")
    .map(Number);

  const [endHour, endMinute] = endTime
    .split(":")
    .map(Number);

  if (
    Number.isNaN(startHour) ||
    Number.isNaN(startMinute) ||
    Number.isNaN(endHour) ||
    Number.isNaN(endMinute)
  ) {
    return null;
  }

  const startTotal =
    startHour * 60 + startMinute;

  const endTotal =
    endHour * 60 + endMinute;

  const duration =
    endTotal - startTotal;

  return duration > 0
    ? duration
    : null;
}

function formatSessionValue(
  sessionName?: string | null,
  durationMinutes?: number | null,
  startTime?: string | null,
  endTime?: string | null
) {
  const duration =
    durationMinutes ||
    calculateDurationMinutes(
      startTime,
      endTime
    );

  let sessionValue:
    | number
    | null = null;

  if (duration) {
    if (duration === 60) {
      sessionValue = 0.75;
    } else if (duration === 90) {
      sessionValue = 1;
    } else {
      sessionValue =
        duration / 90;
    }
  } else {
    const savedSession = (
      sessionName || ""
    )
      .trim()
      .replace(",", ".");

    const parsedSession =
      Number(savedSession);

    if (!Number.isNaN(parsedSession)) {
      sessionValue =
        parsedSession;
    }
  }

  if (sessionValue === null) {
    return "-";
  }

  return new Intl.NumberFormat(
    "id-ID",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  ).format(sessionValue);
}

function getInitials(
  name?: string | null
) {
  if (!name) return "-";

  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getMonthName(
  dateString?: string | null
) {
  if (!dateString) return "";

  const date = new Date(
    `${dateString}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "id-ID",
    {
      month: "long",
    }
  ).format(date);
}

function getAttendanceNote(
  item: AttendanceRow
) {
  return (
    item.note ||
    item.notes ||
    "-"
  );
}

function normalizeAttendanceStatus(
  status?: string | null
) {
  const safeStatus =
    normalizeText(status);

  if (
    safeStatus === "hadir" ||
    safeStatus === "present"
  ) {
    return "Hadir";
  }

  if (safeStatus === "izin") {
    return "Izin";
  }

  if (safeStatus === "sakit") {
    return "Sakit";
  }

  if (
    safeStatus === "alpa" ||
    safeStatus === "alpha" ||
    safeStatus === "tidak hadir" ||
    safeStatus === "absent"
  ) {
    return "Alpa";
  }

  return status || "-";
}

function getAttendanceCode(
  status?: string | null
) {
  const normalized =
    normalizeAttendanceStatus(
      status
    );

  if (normalized === "Hadir") {
    return "H";
  }

  if (normalized === "Izin") {
    return "I";
  }

  if (normalized === "Alpa") {
    return "A";
  }

  if (normalized === "Sakit") {
    return "S";
  }

  return "";
}

function isHadir(
  status?: string | null
) {
  return (
    normalizeAttendanceStatus(
      status
    ) === "Hadir"
  );
}

function isIzin(
  status?: string | null
) {
  return (
    normalizeAttendanceStatus(
      status
    ) === "Izin"
  );
}

function isAlpa(
  status?: string | null
) {
  return (
    normalizeAttendanceStatus(
      status
    ) === "Alpa"
  );
}

function isSakit(
  status?: string | null
) {
  return (
    normalizeAttendanceStatus(
      status
    ) === "Sakit"
  );
}

function getRombelKey(
  item: EnrichedAttendance
) {
  return [
    item.teacher_id || "",
    item.subject_id || "",
    item.attendance_date || "",
    item.start_time || "",
    item.end_time || "",
    normalizeText(
      item.material_topic
    ),
  ].join("__");
}

function groupAttendanceByRombel(
  attendance:
    EnrichedAttendance[]
) {
  const map = new Map<
    string,
    EnrichedAttendance[]
  >();

  attendance.forEach((item) => {
    const key =
      getRombelKey(item);

    const current =
      map.get(key) || [];

    current.push(item);

    map.set(
      key,
      current
    );
  });

  const groups:
    RombelGroup[] =
    Array.from(
      map.entries()
    ).map(([key, rows]) => {
      const first =
        rows[0];

      const hadir =
        rows.filter((item) =>
          isHadir(
            item.attendance_status
          )
        ).length;

      const izin =
        rows.filter((item) =>
          isIzin(
            item.attendance_status
          )
        ).length;

      const alpa =
        rows.filter((item) =>
          isAlpa(
            item.attendance_status
          )
        ).length;

      const sakit =
        rows.filter((item) =>
          isSakit(
            item.attendance_status
          )
        ).length;

      const paham =
        rows.filter(
          (item) =>
            item.understanding_status ===
            "Paham"
        ).length;

      const cukupPaham =
        rows.filter(
          (item) =>
            item.understanding_status ===
            "Cukup Paham"
        ).length;

      const belumPaham =
        rows.filter(
          (item) =>
            item.understanding_status ===
            "Belum Paham"
        ).length;

      return {
        key,

        attendance_date:
          first.attendance_date,

        day_name:
          first.day_name,

        teacher_arrival_time:
          first.teacher_arrival_time ||
          null,

        teacher_departure_time:
          first.teacher_departure_time ||
          null,

        start_time:
          first.start_time,

        end_time:
          first.end_time,

        duration_minutes:
          first.duration_minutes ||
          calculateDurationMinutes(
            first.start_time,
            first.end_time
          ),

        session_name:
          formatSessionValue(
            first.session_name,
            first.duration_minutes,
            first.start_time,
            first.end_time
          ),

        teacher_id:
          first.teacher_id,

        teacher_name:
          first.teacher_name,

        subject_id:
          first.subject_id,

        subject_name:
          first.subject_name,

        material_topic:
          first.material_topic,

        students: [...rows].sort(
          (a, b) =>
            a.student_name.localeCompare(
              b.student_name
            )
        ),

        total:
          rows.length,

        hadir,
        izin,
        alpa,
        sakit,

        paham,
        cukupPaham,
        belumPaham,
      };
    });

  return groups.sort(
    (a, b) => {
      const dateA =
        a.attendance_date || "";

      const dateB =
        b.attendance_date || "";

      if (dateA !== dateB) {
        return dateB.localeCompare(
          dateA
        );
      }

      return (
        a.start_time || ""
      ).localeCompare(
        b.start_time || ""
      );
    }
  );
}

function toYMD(date: Date) {
  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getCutoffRange(
  month: number,
  year: number
) {
  /*
    Contoh:
    pilih Agustus 2026

    start = 21 Juli 2026
    end   = 20 Agustus 2026
  */

  const startDate =
    new Date(
      year,
      month - 2,
      21
    );

  const endDate =
    new Date(
      year,
      month - 1,
      20
    );

  return {
    start:
      toYMD(startDate),

    end:
      toYMD(endDate),
  };
}

function isDateInRange(
  dateValue: string | null,
  start: string,
  end: string
) {
  if (!dateValue) {
    return false;
  }

  return (
    dateValue >= start &&
    dateValue <= end
  );
}

function getDatesBetween(
  start: string,
  end: string
) {
  const dates:
    string[] = [];

  const current =
    new Date(
      `${start}T00:00:00`
    );

  const finish =
    new Date(
      `${end}T00:00:00`
    );

  while (current <= finish) {
    dates.push(
      toYMD(current)
    );

    current.setDate(
      current.getDate() + 1
    );
  }

  return dates;
}

function normalizeHeader(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/[\s_\-]+/g, "");
}

function parseImportDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return toYMD(value);
  if (typeof value === "number" && value > 0) {
    const parts = XLSX.SSF.parse_date_code(value);
    if (parts) return `${parts.y}-${String(parts.m).padStart(2, "0")}-${String(parts.d).padStart(2, "0")}`;
  }
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  let match = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (match) return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  match = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (match) return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  return null;
}

function parseImportTime(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && value >= 0 && value < 1) {
    const minutes = Math.round(value * 24 * 60);
    return `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00`;
  }
  const raw = String(value).trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  return `${match[1].padStart(2, "0")}:${match[2]}:${(match[3] || "00")}`;
}

function normalizeImportStatus(value: unknown): string | null {
  const status = normalizeText(String(value ?? ""));
  if (["h", "hadir", "present"].includes(status)) return "Hadir";
  if (["i", "izin", "ijin", "permission"].includes(status)) return "Izin";
  if (["s", "sakit", "sick"].includes(status)) return "Sakit";
  if (["a", "alpa", "alpha", "absent", "tidak hadir"].includes(status)) return "Alpa";
  return null;
}

/* =========================================================
   PAGE
========================================================= */

export default function KepalaSekolahAbsensiPage() {
  const [teachers, setTeachers] =
    useState<TeacherRow[]>([]);

  const [students, setStudents] =
    useState<StudentRow[]>([]);

  const [teacherAttendance, setTeacherAttendance] =
    useState<TeacherAttendanceRow[]>([]);

  const [teacherImportRows, setTeacherImportRows] = useState<TeacherImportRow[]>([]);
  const [teacherImportFileName, setTeacherImportFileName] = useState("");
  const [teacherImportMessage, setTeacherImportMessage] = useState("");
  const [teacherImporting, setTeacherImporting] = useState(false);

  const [printTeacherId, setPrintTeacherId] =
    useState("");

  const [attendance, setAttendance] =
    useState<
      EnrichedAttendance[]
    >([]);

  const [loading, setLoading] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [search, setSearch] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState(
    "Semua Status"
  );

  const [
    monthFilter,
    setMonthFilter,
  ] = useState(
    "Semua Bulan"
  );

  const [
    teacherFilter,
    setTeacherFilter,
  ] = useState(
    "Semua Guru"
  );

  const [
    dateFilter,
    setDateFilter,
  ] = useState("");

  const currentDate =
    new Date();

  const [
    exportMonth,
    setExportMonth,
  ] = useState(
    String(
      currentDate.getMonth() + 1
    )
  );

  const [
    exportYear,
    setExportYear,
  ] = useState(
    String(
      currentDate.getFullYear()
    )
  );

  const [
    selectedRombel,
    setSelectedRombel,
  ] =
    useState<RombelGroup | null>(
      null
    );

  /* =========================================================
     FETCH
  ========================================================= */

  async function fetchData() {
    setLoading(true);
    setErrorMessage("");

    try {
      const [
        teachersRes,
        studentsRes,
        subjectsRes,
        attendanceRes,
        teacherAttendanceRes,
      ] =
        await Promise.all([
          supabase
            .from("teachers")
            .select("*")
            .order("full_name"),

          supabase
            .from("students")
            .select("*")
            .order("full_name"),

          supabase
            .from("subjects")
            .select("*")
            .order("name"),

          supabase
            .from("attendance")
            .select("*")
            .order(
              "attendance_date",
              {
                ascending:
                  false,
              }
            )
            .order(
              "start_time",
              {
                ascending:
                  true,
              }
            ),
          supabase
            .from("teacher_attendance")
            .select("*")
            .order("attendance_date", { ascending: false }),
        ]);

      if (
        teachersRes.error
      ) {
        throw new Error(
          teachersRes.error.message
        );
      }

      if (
        studentsRes.error
      ) {
        throw new Error(
          studentsRes.error.message
        );
      }

      if (
        subjectsRes.error
      ) {
        throw new Error(
          subjectsRes.error.message
        );
      }

      if (
        attendanceRes.error
      ) {
        throw new Error(
          attendanceRes.error.message
        );
      }

      if (teacherAttendanceRes.error) {
        throw new Error(
          `Gagal mengambil absensi guru: ${teacherAttendanceRes.error.message}`
        );
      }

      const teachersData =
        (
          teachersRes.data ||
          []
        ) as TeacherRow[];

      const studentsData =
        (
          studentsRes.data ||
          []
        ) as StudentRow[];

      const subjectsData =
        (
          subjectsRes.data ||
          []
        ) as SubjectRow[];

      const attendanceData =
        (
          attendanceRes.data ||
          []
        ) as AttendanceRow[];

      const teacherAttendanceData =
        (teacherAttendanceRes.data || []) as TeacherAttendanceRow[];

      setTeacherAttendance(teacherAttendanceData);

      setTeachers(
        teachersData
      );

      setStudents(
        studentsData
      );

      const teacherMap =
        new Map(
          teachersData.map(
            (teacher) => [
              teacher.id,
              teacher,
            ]
          )
        );

      const studentMap =
        new Map(
          studentsData.map(
            (student) => [
              student.id,
              student,
            ]
          )
        );

      const subjectMap =
        new Map(
          subjectsData.map(
            (subject) => [
              subject.id,
              subject,
            ]
          )
        );

      const enriched:
        EnrichedAttendance[] =
        attendanceData.map(
          (item) => {
            const teacher =
              item.teacher_id
                ? teacherMap.get(
                    item.teacher_id
                  )
                : null;

            const student =
              item.student_id
                ? studentMap.get(
                    item.student_id
                  )
                : null;

            const subject =
              item.subject_id
                ? subjectMap.get(
                    item.subject_id
                  )
                : null;

            return {
              ...item,

              teacher_name:
                teacher?.full_name ||
                "-",

              student_name:
                student?.full_name ||
                "-",

              student_grade:
                student?.grade ||
                "-",

              student_level:
                student?.level ||
                "-",

              student_nis:
                student?.nis ||
                "-",

              student_nisn:
                student?.nisn ||
                "-",

              subject_name:
                subject?.name ||
                "-",
            };
          }
        );

      setAttendance(
        enriched
      );
    } catch (error) {
      if (
        error instanceof Error
      ) {
        setErrorMessage(
          error.message
        );
      } else {
        setErrorMessage(
          "Gagal mengambil data absensi."
        );
      }

      setTeachers([]);
      setStudents([]);
      setAttendance([]);
      setTeacherAttendance([]);
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     REALTIME
  ========================================================= */

  useEffect(() => {
    void fetchData();

    const channel =
      supabase
        .channel(
          "kepala-absensi-rombel-realtime"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "attendance",
          },
          () => {
            void fetchData();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "students",
          },
          () => {
            void fetchData();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "teachers",
          },
          () => {
            void fetchData();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "subjects",
          },
          () => {
            void fetchData();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "teacher_attendance",
          },
          () => {
            void fetchData();
          }
        )
        .subscribe();

    return () => {
      void supabase.removeChannel(
        channel
      );
    };
  }, []);

  /* =========================================================
     FILTER
  ========================================================= */

  const rombelGroups =
    useMemo(() => {
      const q =
        normalizeText(
          search
        );

      const grouped =
        groupAttendanceByRombel(
          attendance
        );

      return grouped.filter(
        (group) => {
          const matchSearch =
            !q ||
            normalizeText(
              group.teacher_name
            ).includes(q) ||
            normalizeText(
              group.subject_name
            ).includes(q) ||
            normalizeText(
              group.material_topic
            ).includes(q) ||
            group.students.some(
              (student) =>
                normalizeText(
                  student.student_name
                ).includes(q) ||
                normalizeText(
                  student.student_grade
                ).includes(q) ||
                normalizeText(
                  student.student_level
                ).includes(q) ||
                normalizeText(
                  student.student_nis
                ).includes(q) ||
                normalizeText(
                  student.student_nisn
                ).includes(q) ||
                normalizeText(
                  getAttendanceNote(
                    student
                  )
                ).includes(q)
            );

          const matchStatus =
            statusFilter ===
              "Semua Status" ||
            group.students.some(
              (student) =>
                normalizeAttendanceStatus(
                  student.attendance_status
                ) ===
                statusFilter
            );

          const matchMonth =
            monthFilter ===
              "Semua Bulan" ||
            getMonthName(
              group.attendance_date
            ) ===
              monthFilter;

          const matchTeacher =
            teacherFilter ===
              "Semua Guru" ||
            group.teacher_id ===
              teacherFilter;

          const matchDate =
            !dateFilter ||
            group.attendance_date ===
              dateFilter;

          return (
            matchSearch &&
            matchStatus &&
            matchMonth &&
            matchTeacher &&
            matchDate
          );
        }
      );
    }, [
      attendance,
      search,
      statusFilter,
      monthFilter,
      teacherFilter,
      dateFilter,
    ]);

  const visibleAttendanceRows =
    useMemo(() => {
      return rombelGroups.flatMap(
        (group) =>
          group.students.map(
            (
              student,
              index
            ) => ({
              group,
              student,
              isFirstInGroup:
                index === 0,
            })
          )
      );
    }, [rombelGroups]);

  const filteredAttendance =
    useMemo(() => {
      return rombelGroups.flatMap(
        (group) =>
          group.students
      );
    }, [rombelGroups]);

  /* =========================================================
     SUMMARY
  ========================================================= */

  const summary =
    useMemo(() => {
      const totalRombel =
        rombelGroups.length;

      const totalAttendanceRows =
        filteredAttendance.length;

      const totalHadir =
        filteredAttendance.filter(
          (item) =>
            isHadir(
              item.attendance_status
            )
        ).length;

      const totalIzin =
        filteredAttendance.filter(
          (item) =>
            isIzin(
              item.attendance_status
            )
        ).length;

      const totalAlpa =
        filteredAttendance.filter(
          (item) =>
            isAlpa(
              item.attendance_status
            )
        ).length;

      const totalSakit =
        filteredAttendance.filter(
          (item) =>
            isSakit(
              item.attendance_status
            )
        ).length;

      const activeTeachers =
        new Set(
          filteredAttendance
            .map(
              (item) =>
                item.teacher_id
            )
            .filter(Boolean)
        ).size;

      const percentage =
        totalAttendanceRows > 0
          ? Math.round(
              (totalHadir /
                totalAttendanceRows) *
                100
            )
          : 0;

      return {
        totalRombel,
        totalAttendanceRows,
        totalHadir,
        totalIzin,
        totalAlpa,
        totalSakit,

        totalTidakHadir:
          totalIzin +
          totalAlpa +
          totalSakit,

        activeTeachers,
        percentage,
      };
    }, [
      rombelGroups,
      filteredAttendance,
    ]);

  /* =========================================================
     EXPORT EXCEL
  ========================================================= */

  function handleExportExcel() {
    const monthNumber =
      Number(exportMonth);

    const yearNumber =
      Number(exportYear);

    if (
      !monthNumber ||
      !yearNumber
    ) {
      alert(
        "Pilih bulan dan tahun export terlebih dahulu."
      );

      return;
    }

    const { start, end } =
      getCutoffRange(
        monthNumber,
        yearNumber
      );

    const selectedMonthName =
      monthOptions[
        monthNumber
      ] ||
      `Bulan ${monthNumber}`;

    const periodAttendance =
      attendance.filter(
        (item) =>
          isDateInRange(
            item.attendance_date,
            start,
            end
          )
      );

    /*
      IMPORTANT:
      Kita tetap pakai seluruh siswa,
      bukan hanya siswa yang sudah punya
      attendance pada periode tersebut.
    */

    if (
      students.length === 0
    ) {
      alert(
        "Belum ada data siswa yang dapat diexport."
      );

      return;
    }

    const periodDates =
      getDatesBetween(
        start,
        end
      );

    /*
      Map attendance:
      student_id -> tanggal -> attendance[]
    */

    const attendanceMap =
      new Map<
        string,
        Map<
          string,
          EnrichedAttendance[]
        >
      >();

    periodAttendance.forEach(
      (item) => {
        if (
          !item.student_id ||
          !item.attendance_date
        ) {
          return;
        }

        if (
          !attendanceMap.has(
            item.student_id
          )
        ) {
          attendanceMap.set(
            item.student_id,
            new Map()
          );
        }

        const studentAttendance =
          attendanceMap.get(
            item.student_id
          );

        if (!studentAttendance) {
          return;
        }

        const current =
          studentAttendance.get(
            item.attendance_date
          ) || [];

        current.push(item);

        studentAttendance.set(
          item.attendance_date,
          current
        );
      }
    );

    /*
      HEADER
    */

    const headers = [
      "No",
      "Nama Siswa",
      "Kelas",
      "NIPD",
      "NISN",

      ...periodDates.map(
        (date) =>
          formatExcelDate(date)
      ),

      "Total H",
      "Total I",
      "Total A",
      "Total S",
      "Persentase Kehadiran",
    ];

    /*
      DATA
    */

    const exportRows =
      students
        .slice()
        .sort((a, b) =>
          (
            a.full_name || ""
          ).localeCompare(
            b.full_name || ""
          )
        )
        .map(
          (
            student,
            index
          ) => {
            const row:
              (string | number)[] =
              [
                index + 1,

                student.full_name ||
                  "-",

                formatClass(
                  student.level,
                  student.grade
                ),

                student.nis ||
                  "-",

                student.nisn ||
                  "-",
              ];

            let totalHadir = 0;
            let totalIzin = 0;
            let totalAlpa = 0;
            let totalSakit = 0;

            periodDates.forEach(
              (date) => {
                const studentAttendance =
                  attendanceMap.get(
                    student.id
                  );

                const dateRows =
                  studentAttendance?.get(
                    date
                  ) || [];

                /*
                  Bisa saja 1 siswa punya lebih dari
                  1 sesi pada tanggal sama.
                */

                const codes =
                  dateRows
                    .map(
                      (item) =>
                        getAttendanceCode(
                          item.attendance_status
                        )
                    )
                    .filter(Boolean);

                const uniqueCodes =
                  Array.from(
                    new Set(codes)
                  );

                row.push(
                  uniqueCodes.join(
                    "/"
                  )
                );

                dateRows.forEach(
                  (item) => {
                    if (
                      isHadir(
                        item.attendance_status
                      )
                    ) {
                      totalHadir++;
                    }

                    if (
                      isIzin(
                        item.attendance_status
                      )
                    ) {
                      totalIzin++;
                    }

                    if (
                      isAlpa(
                        item.attendance_status
                      )
                    ) {
                      totalAlpa++;
                    }

                    if (
                      isSakit(
                        item.attendance_status
                      )
                    ) {
                      totalSakit++;
                    }
                  }
                );
              }
            );

            const totalRecorded =
              totalHadir +
              totalIzin +
              totalAlpa +
              totalSakit;

            const percentage =
              totalRecorded > 0
                ? Math.round(
                    (totalHadir /
                      totalRecorded) *
                      100
                  )
                : 0;

            row.push(
              totalHadir,
              totalIzin,
              totalAlpa,
              totalSakit,
              `${percentage}%`
            );

            return row;
          }
        );

    /*
      INFORMASI FILE
    */

    const worksheetData = [
      [
        "REKAP ABSENSI SISWA",
      ],

      [
        "Periode",
        `${formatDate(
          start
        )} s/d ${formatDate(
          end
        )}`,
      ],

      [
        "Bulan Rekap",
        `${selectedMonthName} ${yearNumber}`,
      ],

      [],

      headers,

      ...exportRows,
    ];

    const worksheet =
      XLSX.utils.aoa_to_sheet(
        worksheetData
      );

    /*
      Merge title
    */

    worksheet["!merges"] = [
      {
        s: {
          r: 0,
          c: 0,
        },

        e: {
          r: 0,
          c:
            headers.length - 1,
        },
      },
    ];

    /*
      Column widths
    */

    worksheet["!cols"] = [
      {
        wch: 6,
      },

      {
        wch: 30,
      },

      {
        wch: 16,
      },

      {
        wch: 16,
      },

      {
        wch: 18,
      },

      ...periodDates.map(
        () => ({
          wch: 9,
        })
      ),

      {
        wch: 10,
      },

      {
        wch: 10,
      },

      {
        wch: 10,
      },

      {
        wch: 10,
      },

      {
        wch: 22,
      },
    ];

    /*
      Workbook
    */

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Rekap Absensi"
    );

    /*
      Sheet legenda
    */

    const legendData = [
      [
        "Kode",
        "Keterangan",
      ],

      [
        "H",
        "Hadir",
      ],

      [
        "I",
        "Izin",
      ],

      [
        "A",
        "Alpa",
      ],

      [
        "S",
        "Sakit",
      ],

      [
        "",
        "Kosong = belum ada data absensi pada tanggal tersebut",
      ],
    ];

    const legendSheet =
      XLSX.utils.aoa_to_sheet(
        legendData
      );

    legendSheet["!cols"] = [
      {
        wch: 12,
      },

      {
        wch: 60,
      },
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      legendSheet,
      "Keterangan"
    );

    /*
      Download .xlsx
    */

    XLSX.writeFile(
      workbook,
      `Rekap_Absensi_${selectedMonthName}_${yearNumber}_${start}_sd_${end}.xlsx`
    );
  }

  /* =========================================================
     EXPORT & PRINT ABSENSI GURU
  ========================================================= */

  function getTeacherAttendanceForPeriod() {
    const monthNumber = Number(exportMonth);
    const yearNumber = Number(exportYear);

    if (!monthNumber || !yearNumber) {
      alert("Pilih bulan dan tahun terlebih dahulu.");
      return null;
    }

    const { start, end } = getCutoffRange(monthNumber, yearNumber);
    const rows = teacherAttendance.filter((item) =>
      isDateInRange(item.attendance_date, start, end)
    );

    return { start, end, rows, monthNumber, yearNumber };
  }

  function handleExportTeacherExcel() {
    const period = getTeacherAttendanceForPeriod();
    if (!period) return;

    const { start, end, rows, monthNumber, yearNumber } = period;
    const teacherMap = new Map(teachers.map((teacher) => [teacher.id, teacher]));
    const sortedRows = [...rows].sort((a, b) => {
      const nameA = teacherMap.get(a.teacher_id)?.full_name || "";
      const nameB = teacherMap.get(b.teacher_id)?.full_name || "";
      return nameA.localeCompare(nameB) ||
        a.attendance_date.localeCompare(b.attendance_date);
    });

    const data = sortedRows.map((item, index) => ({
      No: index + 1,
      "Nama Guru": teacherMap.get(item.teacher_id)?.full_name || "Guru tidak ditemukan",
      "Kode Guru": teacherMap.get(item.teacher_id)?.teacher_code || "-",
      Tanggal: item.attendance_date,
      "Jam Datang": item.arrival_time || "-",
      "Jam Pulang": item.departure_time || "-",
      Status: item.status || "-",
      Keterangan: item.notes || "-",
    }));

    const summaryRows = teachers.map((teacher) => {
      const teacherRows = rows.filter((item) => item.teacher_id === teacher.id);
      const count = (status: string) =>
        teacherRows.filter((item) => (item.status || "").toLowerCase() === status.toLowerCase()).length;

      return {
        "Nama Guru": teacher.full_name || "-",
        "Total Hadir": count("Hadir"),
        "Total Izin": count("Izin"),
        "Total Sakit": count("Sakit"),
        "Total Alpa": count("Alpa"),
        "Total Tercatat": teacherRows.length,
      };
    });

    const detailSheet = XLSX.utils.json_to_sheet(data);
    detailSheet["!cols"] = [
      { wch: 6 }, { wch: 28 }, { wch: 15 }, { wch: 14 },
      { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 35 },
    ];

    const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
    summarySheet["!cols"] = [
      { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
      { wch: 14 }, { wch: 18 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, detailSheet, "Detail Absensi");
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Rekap Per Guru");

    XLSX.writeFile(
      workbook,
      `Rekap_Absensi_Guru_${monthOptions[monthNumber]}_${yearNumber}_${start}_sd_${end}.xlsx`
    );
  }

  function handlePrintTeacherAttendance() {
    const period = getTeacherAttendanceForPeriod();
    if (!period) return;

    if (!printTeacherId) {
      alert("Pilih guru yang ingin dicetak.");
      return;
    }

    const { start, end, rows, monthNumber, yearNumber } = period;
    const teacher = teachers.find((item) => item.id === printTeacherId);
    if (!teacher) {
      alert("Data guru tidak ditemukan.");
      return;
    }

    const dates = getDatesBetween(start, end);
    const teacherRows = rows
      .filter((item) => item.teacher_id === printTeacherId)
      .sort((a, b) => a.attendance_date.localeCompare(b.attendance_date));

    const rowByDate = new Map(teacherRows.map((item) => [item.attendance_date, item]));
    const count = (status: string) =>
      teacherRows.filter((item) => (item.status || "").toLowerCase() === status.toLowerCase()).length;

    const tableRows = dates.map((date, index) => {
      const item = rowByDate.get(date);
      const displayDate = new Date(`${date}T00:00:00`).toLocaleDateString("id-ID", {
        weekday: "long", day: "2-digit", month: "long", year: "numeric",
      });
      return `<tr>
        <td>${index + 1}</td>
        <td>${displayDate}</td>
        <td>${item?.arrival_time || "-"}</td>
        <td>${item?.departure_time || "-"}</td>
        <td>${item?.status || "-"}</td>
        <td>${item?.notes || "-"}</td>
      </tr>`;
    }).join("");

    const safeName = (teacher.full_name || "Guru").replace(/[<>&"]/g, "");
    const printWindow = window.open("", "_blank", "width=1100,height=800");
    if (!printWindow) {
      alert("Pop-up diblokir browser. Izinkan pop-up untuk mencetak.");
      return;
    }

    printWindow.document.write(`<!DOCTYPE html>
      <html lang="id"><head><meta charset="UTF-8" />
      <title>Absensi Guru - ${safeName}</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; color: #222; padding: 24px; }
        h1 { text-align: center; font-size: 20px; margin: 0 0 6px; }
        .subtitle { text-align: center; margin: 0 0 22px; font-size: 12px; }
        .identity { margin-bottom: 14px; font-size: 13px; line-height: 1.8; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th, td { border: 1px solid #555; padding: 7px; text-align: left; }
        th { background: #f1f1f1; }
        .summary { margin: 14px 0; display: flex; gap: 18px; font-size: 12px; }
        .sign { display: flex; justify-content: space-between; margin-top: 48px; text-align: center; font-size: 12px; }
        .sign div { width: 220px; }
        @page { size: A4 landscape; margin: 12mm; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <h1>REKAP ABSENSI GURU</h1>
      <p class="subtitle">Periode ${start} s/d ${end} | ${monthOptions[monthNumber]} ${yearNumber}</p>
      <div class="identity">
        <strong>Nama Guru:</strong> ${safeName}<br/>
        <strong>Kode Guru:</strong> ${teacher.teacher_code || "-"}
      </div>
      <div class="summary">
        <span>Hadir: <strong>${count("Hadir")}</strong></span>
        <span>Izin: <strong>${count("Izin")}</strong></span>
        <span>Sakit: <strong>${count("Sakit")}</strong></span>
        <span>Alpa: <strong>${count("Alpa")}</strong></span>
      </div>
      <table><thead><tr><th>No</th><th>Tanggal</th><th>Jam Datang</th><th>Jam Pulang</th><th>Status</th><th>Keterangan</th></tr></thead>
      <tbody>${tableRows}</tbody></table>
      <div class="sign">
        <div>Mengetahui,<br/>Kepala Sekolah<br/><br/><br/><br/>(____________________)</div>
        <div>Guru yang bersangkutan<br/><br/><br/><br/><br/>(____________________)</div>
      </div>
      <script>window.onload = () => { window.print(); };</script>
      </body></html>`);
    printWindow.document.close();
  }

  /* =========================================================
     IMPORT ABSENSI GURU DARI SPREADSHEET
  ========================================================= */

  async function handleTeacherImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setTeacherImportMessage("");
    setTeacherImportRows([]);
    setTeacherImportFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) throw new Error("Sheet pertama tidak ditemukan.");
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      if (!rawRows.length) throw new Error("Spreadsheet belum berisi data.");
      const teacherByCode = new Map<string, TeacherRow>();
      teachers.forEach((teacher) => {
        const code = normalizeText(teacher.teacher_code);
        if (code) teacherByCode.set(code, teacher);
      });
      const parsed: TeacherImportRow[] = rawRows.map((raw, index) => {
        const values = new Map(Object.entries(raw).map(([key, value]) => [normalizeHeader(key), value]));
        const get = (...keys: string[]) => {
          for (const key of keys) {
            const value = values.get(key);
            if (value !== undefined && String(value).trim() !== "") return value;
          }
          return "";
        };
        const teacherCode = String(get("kodeguru", "teacher_code", "kodepengajar")).trim();
        const teacher = teacherByCode.get(normalizeText(teacherCode));
        const attendanceDate = parseImportDate(get("tanggal", "tanggalabsensi", "attendance_date", "date")) || "";
        const arrivalTime = parseImportTime(get("jamdatang", "jammasuk", "arrival_time", "checkin"));
        const departureTime = parseImportTime(get("jampulang", "jamkeluar", "departure_time", "checkout"));
        const rawStatus = get("status", "kehadiran", "statuskehadiran");
        const status = normalizeImportStatus(rawStatus) || "";
        const notes = String(get("keterangan", "catatan", "notes", "note") || "").trim() || null;
        const errors: string[] = [];
        if (!teacherCode) errors.push("Kode Guru kosong");
        else if (!teacher) errors.push(`Kode Guru ${teacherCode} tidak ditemukan`);
        if (!attendanceDate) errors.push("Tanggal tidak valid/kosong");
        if (!status) errors.push(`Status '${String(rawStatus || "kosong")}' tidak dikenali`);
        if (!arrivalTime && !departureTime && !status) errors.push("Data kehadiran tidak lengkap");
        return {
          rowNumber: index + 2, teacherCode, teacherId: teacher?.id || null,
          teacherName: teacher?.full_name || "Guru tidak ditemukan", attendanceDate,
          arrivalTime, departureTime, status, notes, error: errors.length ? errors.join("; ") : null,
        };
      }).filter((row) => row.teacherCode || row.attendanceDate || row.status || row.arrivalTime || row.departureTime);
      if (!parsed.length) throw new Error("Tidak ada baris data yang dapat dibaca.");
      setTeacherImportRows(parsed);
      setTeacherImportMessage(`Berhasil membaca ${parsed.length} baris. Periksa data sebelum menyimpan.`);
    } catch (error) {
      setTeacherImportMessage(error instanceof Error ? error.message : "Gagal membaca file Excel.");
    }
  }

  async function handleSaveTeacherImport() {
    const validRows = teacherImportRows.filter((row) => !row.error && row.teacherId);
    if (!validRows.length) {
      setTeacherImportMessage("Tidak ada baris valid untuk disimpan. Periksa Kode Guru, tanggal, dan status.");
      return;
    }
    setTeacherImporting(true);
    setTeacherImportMessage("");
    try {
      const uniqueRows = new Map<string, TeacherImportRow>();
      validRows.forEach((row) => uniqueRows.set(`${row.teacherId}|${row.attendanceDate}`, row));
      const rowsToSave = [...uniqueRows.values()];
      const teacherIds = [...new Set(rowsToSave.map((row) => row.teacherId as string))];
      const dates = [...new Set(rowsToSave.map((row) => row.attendanceDate))];
      const { data: existing, error: existingError } = await supabase
        .from("teacher_attendance").select("*").in("teacher_id", teacherIds).in("attendance_date", dates);
      if (existingError) throw existingError;
      const existingMap = new Map((existing || []).map((item) => [`${item.teacher_id}|${item.attendance_date}`, item]));
      let inserted = 0;
      let updated = 0;
      for (const row of rowsToSave) {
        const key = `${row.teacherId}|${row.attendanceDate}`;
        const payload = {
          teacher_id: row.teacherId,
          attendance_date: row.attendanceDate,
          arrival_time: row.arrivalTime,
          departure_time: row.departureTime,
          status: row.status,
          notes: row.notes,
          updated_at: new Date().toISOString(),
        };
        const old = existingMap.get(key);
        const result = old
          ? await supabase.from("teacher_attendance").update(payload).eq("id", old.id)
          : await supabase.from("teacher_attendance").insert(payload);
        if (result.error) throw result.error;
        if (old) updated++; else inserted++;
      }
      setTeacherImportMessage(`Import selesai. ${inserted} data baru ditambahkan dan ${updated} data diperbarui. Baris tidak valid dilewati.`);
      setTeacherImportRows([]);
      setTeacherImportFileName("");
      await fetchData();
    } catch (error) {
      setTeacherImportMessage(error instanceof Error ? `Gagal menyimpan import: ${error.message}` : "Gagal menyimpan data import.");
    } finally {
      setTeacherImporting(false);
    }
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <KepalaSekolahLayout
      activeMenu="ABSENSI KBM SISWA DAN GURU HARIAN"
      searchPlaceholder="Cari absensi, guru, siswa, atau materi..."
    >
      <section className="space-y-7">
        {/* HEADER */}

        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#8A5A48]">
              Monitoring KBM
            </p>

            <h1 className="mt-2 text-[30px] font-extrabold tracking-[-0.02em] text-[#2B1B18]">
              Absensi KBM Bulanan
            </h1>

            <p className="mt-2 max-w-[850px] text-[15px] leading-6 text-[#6F5549]">
              Pantau absensi yang diinput guru. Halaman ini hanya untuk
              monitoring dan export, bukan untuk input absensi.
            </p>
          </div>

          {/* EXPORT */}

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={exportMonth}
              onChange={(event) =>
                setExportMonth(
                  event.target.value
                )
              }
              className="h-11 rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] font-bold text-[#2B1B18] outline-none focus:border-[#9C0824]"
            >
              {monthOptions
                .slice(1)
                .map(
                  (
                    month,
                    index
                  ) => (
                    <option
                      key={
                        month
                      }
                      value={String(
                        index + 1
                      )}
                    >
                      {month}
                    </option>
                  )
                )}
            </select>

            <input
              type="number"
              value={exportYear}
              onChange={(event) =>
                setExportYear(
                  event.target.value
                )
              }
              className="h-11 w-[105px] rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] font-bold text-[#2B1B18] outline-none focus:border-[#9C0824]"
            />

            <button
              type="button"
              onClick={
                handleExportExcel
              }
              className="flex h-11 w-fit items-center gap-2 rounded-xl border border-[#DCC8B6] bg-white px-5 text-[14px] font-extrabold text-[#8C0F2D] shadow-sm transition hover:bg-[#FFF8EF]"
            >
              <Download className="h-4 w-4" />

              Export Excel
            </button>
          </div>
        </div>

        {/* EXPORT DAN CETAK ABSENSI GURU */}
        <div className="rounded-[22px] border border-[#E1CFBE] bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-[18px] font-extrabold text-[#2B1B18]">
              Absensi Kehadiran Guru
            </h2>
            <p className="mt-1 text-[13px] text-[#6F5549]">
              Rekap diambil dari tabel teacher_attendance, terpisah dari absensi siswa.
              Periode mengikuti tanggal 21 bulan sebelumnya sampai tanggal 20 bulan pilihan.
            </p>
          </div>
          <div className="mb-4 rounded-2xl border border-dashed border-[#C9AA98] bg-[#FFFCF8] p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-extrabold text-[#2B1B18]">Import Absensi Guru dari Excel</p>
                <p className="mt-1 text-[12px] leading-5 text-[#6F5549]">Gunakan kolom Kode Guru, Tanggal, Jam Datang, Jam Pulang, Status, dan Keterangan. Nama guru dicocokkan melalui Kode Guru ke tabel teachers.</p>
              </div>
              <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#DCC8B6] bg-white px-5 text-[14px] font-extrabold text-[#8C0F2D] hover:bg-[#FFF8EF]">
                <Upload className="h-4 w-4" /> Pilih File Excel
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleTeacherImportFile} />
              </label>
            </div>
            {teacherImportFileName ? <p className="mt-3 text-[12px] font-bold text-[#6F5549]">File: {teacherImportFileName}</p> : null}
            {teacherImportMessage ? <p className="mt-3 rounded-xl bg-[#FFF1E8] px-3 py-2 text-[13px] text-[#75412F]">{teacherImportMessage}</p> : null}
            {teacherImportRows.length > 0 ? <>
              <div className="mt-3 max-h-[300px] overflow-auto rounded-xl border border-[#E1CFBE] bg-white">
                <table className="w-full min-w-[850px] text-left text-[12px]"><thead className="sticky top-0 bg-[#FFF8EF] text-[#6F5549]"><tr>{["Baris", "Kode Guru", "Nama Guru", "Tanggal", "Datang", "Pulang", "Status", "Validasi"].map((label) => <th key={label} className="px-3 py-2">{label}</th>)}</tr></thead>
                  <tbody>{teacherImportRows.map((row) => <tr key={row.rowNumber} className="border-t border-[#F0E1D4]"><td className="px-3 py-2">{row.rowNumber}</td><td className="px-3 py-2 font-bold">{row.teacherCode || "-"}</td><td className="px-3 py-2">{row.teacherName}</td><td className="px-3 py-2">{row.attendanceDate || "-"}</td><td className="px-3 py-2">{row.arrivalTime || "-"}</td><td className="px-3 py-2">{row.departureTime || "-"}</td><td className="px-3 py-2">{row.status || "-"}</td><td className={`px-3 py-2 ${row.error ? "font-bold text-red-600" : "text-green-700"}`}>{row.error || "Valid"}</td></tr>)}</tbody>
                </table>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[12px] text-[#6F5549]">{teacherImportRows.filter((row) => !row.error).length} valid • {teacherImportRows.filter((row) => row.error).length} perlu diperbaiki</p>
                <div className="flex gap-2"><button type="button" onClick={() => { setTeacherImportRows([]); setTeacherImportFileName(""); setTeacherImportMessage(""); }} className="h-10 rounded-xl border border-[#DCC8B6] px-4 text-[13px] font-bold text-[#6F5549]">Batal</button><button type="button" disabled={teacherImporting || !teacherImportRows.some((row) => !row.error)} onClick={handleSaveTeacherImport} className="h-10 rounded-xl bg-[#8C0F2D] px-5 text-[13px] font-extrabold text-white disabled:opacity-50">{teacherImporting ? "Menyimpan..." : "Simpan Data Import"}</button></div>
              </div>
            </> : null}
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <select
              value={printTeacherId}
              onChange={(event) => setPrintTeacherId(event.target.value)}
              className="h-11 min-w-[240px] rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              <option value="">Pilih guru untuk dicetak</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.full_name || "Tanpa nama"}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleExportTeacherExcel}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#8C0F2D] px-5 text-[14px] font-extrabold text-white transition hover:bg-[#720B24]"
            >
              <Download className="h-4 w-4" />
              Export Absensi Guru
            </button>
            <button
              type="button"
              onClick={handlePrintTeacherAttendance}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#DCC8B6] bg-white px-5 text-[14px] font-extrabold text-[#8C0F2D] transition hover:bg-[#FFF8EF]"
            >
              <Printer className="h-4 w-4" />
              Cetak Absensi Per Guru
            </button>
            <span className="text-[12px] text-[#8A5A48]">
              {teacherAttendance.length} data absensi guru tersimpan
            </span>
          </div>
        </div>

        {/* ERROR */}

        {errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-[14px] leading-6 text-red-700">
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

              <p>
                {
                  errorMessage
                }
              </p>
            </div>
          </div>
        ) : null}

        {/* SUMMARY */}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={
              <UsersRound className="h-5 w-5" />
            }
            label="Total Rombel Diabsen"
            value={
              summary.totalRombel
            }
            info="Rombel"
            tone="pink"
          />

          <SummaryCard
            icon={
              <CalendarCheck className="h-5 w-5" />
            }
            label="Total Data Absensi"
            value={
              summary.totalAttendanceRows
            }
            info="Rows"
            tone="orange"
          />

          <SummaryCard
            icon={
              <UserCheck className="h-5 w-5" />
            }
            label="Total Hadir"
            value={
              summary.totalHadir
            }
            info={`${summary.percentage}%`}
            tone="green"
          />

          <SummaryCard
            icon={
              <UserX className="h-5 w-5" />
            }
            label="Izin / Alpa / Sakit"
            value={
              summary.totalTidakHadir
            }
            info={`${summary.activeTeachers} Guru`}
            tone="blue"
          />
        </div>

        {/* FILTER */}

        <div className="rounded-[22px] border border-[#E1CFBE] bg-white p-5 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8E6A58]" />

              <input
                value={
                  search
                }
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target
                      .value
                  )
                }
                placeholder="Cari guru, siswa, NIPD, NISN, mapel, materi, atau keterangan..."
                className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] pl-11 pr-4 text-[14px] outline-none placeholder:text-[#9A7B6C] focus:border-[#9C0824]"
              />
            </div>

            <select
              value={
                teacherFilter
              }
              onChange={(
                event
              ) =>
                setTeacherFilter(
                  event.target
                    .value
                )
              }
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              <option value="Semua Guru">
                Semua Guru
              </option>

              {teachers.map(
                (teacher) => (
                  <option
                    key={
                      teacher.id
                    }
                    value={
                      teacher.id
                    }
                  >
                    {
                      teacher.full_name
                    }
                  </option>
                )
              )}
            </select>

            <select
              value={
                statusFilter
              }
              onChange={(
                event
              ) =>
                setStatusFilter(
                  event.target
                    .value
                )
              }
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              {statusOptions.map(
                (status) => (
                  <option
                    key={
                      status
                    }
                  >
                    {status}
                  </option>
                )
              )}
            </select>

            <select
              value={
                monthFilter
              }
              onChange={(
                event
              ) =>
                setMonthFilter(
                  event.target
                    .value
                )
              }
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              {monthOptions.map(
                (month) => (
                  <option
                    key={
                      month
                    }
                  >
                    {month}
                  </option>
                )
              )}
            </select>

            <input
              type="date"
              value={
                dateFilter
              }
              onChange={(
                event
              ) =>
                setDateFilter(
                  event.target
                    .value
                )
              }
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            />
          </div>
        </div>

        {/* TABLE */}

        <div className="overflow-hidden rounded-[22px] border border-[#E1CFBE] bg-white shadow-sm">
          <div className="border-b border-[#EADACA] px-6 py-5">
            <h2 className="text-[20px] font-extrabold text-[#2B1B18]">
              Rekap Absensi KBM
            </h2>

            <p className="mt-1 text-[14px] text-[#6F5549]">
              Datang dan pulang merupakan jam kehadiran guru. Jam Siswa dan
              Sesi merupakan waktu kegiatan belajar siswa.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1750px] table-fixed border-collapse">
              <thead>
                <tr className="border-b border-[#EADACA] bg-[#FFF8EF] text-left text-[13px] font-extrabold text-[#6F5549]">
                  <th className="w-[70px] px-5 py-4">
                    No
                  </th>

                  <th className="w-[250px] px-5 py-4">
                    Nama
                  </th>

                  <th className="w-[130px] px-5 py-4">
                    Kelas
                  </th>

                  <th className="w-[125px] px-5 py-4">
                    Datang Guru
                  </th>

                  <th className="w-[125px] px-5 py-4">
                    Pulang Guru
                  </th>

                  <th className="w-[145px] px-5 py-4">
                    Jam Siswa
                  </th>

                  <th className="w-[80px] px-5 py-4">
                    Sesi
                  </th>

                  <th className="w-[180px] px-5 py-4">
                    Guru
                  </th>

                  <th className="w-[150px] px-5 py-4">
                    Mapel
                  </th>

                  <th className="w-[85px] px-5 py-4 text-center">
                    Hadir
                  </th>

                  <th className="w-[85px] px-5 py-4 text-center">
                    Izin
                  </th>

                  <th className="w-[85px] px-5 py-4 text-center">
                    Alpa
                  </th>

                  <th className="w-[300px] px-5 py-4">
                    Keterangan
                  </th>

                  <th className="w-[115px] px-5 py-4">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={
                        14
                      }
                      className="px-6 py-12 text-center text-[#6F5549]"
                    >
                      Memuat data absensi...
                    </td>
                  </tr>
                ) : visibleAttendanceRows.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={
                        14
                      }
                      className="px-6 py-12 text-center text-[#6F5549]"
                    >
                      Belum ada data absensi.
                    </td>
                  </tr>
                ) : (
                  visibleAttendanceRows.map(
                    (
                      {
                        group,
                        student,
                        isFirstInGroup,
                      },
                      index
                    ) => (
                      <tr
                        key={`${group.key}-${student.id}`}
                        className="min-h-[92px] border-b border-[#F0E1D4] text-[14px] text-[#2B1B18] transition hover:bg-[#FFFCF8]"
                      >
                        <td className="whitespace-nowrap px-5 py-4 align-middle font-bold">
                          {index +
                            1}
                        </td>

                        <td className="px-5 py-4 align-middle">
                          <div className="min-w-0">
                            <p className="break-words font-extrabold leading-5">
                              {
                                student.student_name
                              }
                            </p>

                            <p className="mt-1 break-words text-[12px] leading-5 text-[#6F5549]">
                              NIPD:{" "}
                              {student.student_nis ||
                                "-"}

                              {student.student_nisn
                                ? ` • NISN: ${student.student_nisn}`
                                : ""}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4 align-middle">
                          <span className="break-words leading-5">
                            {formatClass(
                              student.student_level,
                              student.student_grade
                            )}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 align-middle">
                          {formatTime(
                            group.teacher_arrival_time
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 align-middle">
                          {formatTime(
                            group.teacher_departure_time
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 align-middle">
                          {formatTime(
                            group.start_time
                          )}
                          -
                          {formatTime(
                            group.end_time
                          )}
                        </td>

                        <td className="px-5 py-4 align-middle font-extrabold">
                          {formatSessionValue(
                            group.session_name,
                            group.duration_minutes,
                            group.start_time,
                            group.end_time
                          )}
                        </td>

                        <td className="px-5 py-4 align-middle">
                          <p className="break-words font-extrabold leading-5">
                            {
                              group.teacher_name
                            }
                          </p>
                        </td>

                        <td className="px-5 py-4 align-middle">
                          <p className="break-words leading-5">
                            {
                              group.subject_name
                            }
                          </p>
                        </td>

                        <td className="px-5 py-4 align-middle text-center">
                          <ChecklistBox
                            checked={isHadir(
                              student.attendance_status
                            )}
                          />
                        </td>

                        <td className="px-5 py-4 align-middle text-center">
                          <ChecklistBox
                            checked={isIzin(
                              student.attendance_status
                            )}
                          />
                        </td>

                        <td className="px-5 py-4 align-middle text-center">
                          <ChecklistBox
                            checked={isAlpa(
                              student.attendance_status
                            )}
                          />
                        </td>

                        <td className="px-5 py-4 align-middle text-[#6F5549]">
                          <div className="max-h-[64px] overflow-hidden">
                            <p className="break-words leading-5">
                              {getAttendanceNote(
                                student
                              )}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4 align-middle">
                          {isFirstInGroup ? (
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedRombel(
                                  group
                                )
                              }
                              className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-xl border border-[#DCC8B6] px-3 text-[13px] font-extrabold text-[#8C0F2D] transition hover:bg-[#FFF8EF]"
                            >
                              <Eye className="h-4 w-4" />
                              Detail
                            </button>
                          ) : (
                            <span className="text-[12px] text-[#A58A7A]">
                              -
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* DETAIL MODAL */}

      {selectedRombel ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-8">
          <div className="max-h-[92vh] w-full max-w-[980px] overflow-y-auto rounded-[22px] bg-[#FFF8EF] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E1CFBE] bg-[#FFF8EF] px-6 py-5">
              <div>
                <h2 className="text-[22px] font-extrabold text-[#2B1B18]">
                  Detail Absensi Rombel
                </h2>

                <p className="mt-1 text-[14px] text-[#6F5549]">
                  {selectedRombel.teacher_name} •{" "}
                  {selectedRombel.subject_name} •{" "}
                  {formatDate(
                    selectedRombel.attendance_date
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedRombel(
                    null
                  )
                }
                className="rounded-full p-2 text-[#6F5549] transition hover:bg-[#F4E5DA]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="grid gap-4 md:grid-cols-4">
                <DetailSummaryCard
                  label="Total Siswa"
                  value={
                    selectedRombel.total
                  }
                />

                <DetailSummaryCard
                  label="Hadir"
                  value={
                    selectedRombel.hadir
                  }
                />

                <DetailSummaryCard
                  label="Izin"
                  value={
                    selectedRombel.izin
                  }
                />

                <DetailSummaryCard
                  label="Alpa"
                  value={
                    selectedRombel.alpa
                  }
                />
              </div>

              <div className="rounded-2xl border border-[#E1CFBE] bg-white px-5 py-4">
                <div className="grid gap-3 text-[13px] md:grid-cols-4">
                  <InfoItem
                    label="Hari"
                    value={
                      selectedRombel.day_name ||
                      "-"
                    }
                  />

                  <InfoItem
                    label="Tanggal"
                    value={formatDate(
                      selectedRombel.attendance_date
                    )}
                  />

                  <InfoItem
                    label="Datang Guru"
                    value={formatTime(
                      selectedRombel.teacher_arrival_time
                    )}
                  />

                  <InfoItem
                    label="Pulang Guru"
                    value={formatTime(
                      selectedRombel.teacher_departure_time
                    )}
                  />

                  <InfoItem
                    label="Jam Siswa"
                    value={`${formatTime(
                      selectedRombel.start_time
                    )}-${formatTime(
                      selectedRombel.end_time
                    )}`}
                  />

                  <InfoItem
                    label="Sesi"
                    value={formatSessionValue(
                      selectedRombel.session_name,
                      selectedRombel.duration_minutes,
                      selectedRombel.start_time,
                      selectedRombel.end_time
                    )}
                  />

                  <InfoItem
                    label="Mapel"
                    value={
                      selectedRombel.subject_name
                    }
                  />

                  <InfoItem
                    label="Guru"
                    value={
                      selectedRombel.teacher_name
                    }
                  />

                  <InfoItem
                    label="Materi"
                    value={
                      selectedRombel.material_topic ||
                      "-"
                    }
                  />
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-[#E1CFBE] bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1120px] table-fixed border-collapse">
                    <thead>
                      <tr className="border-b border-[#EADACA] bg-[#FFF8EF] text-left text-[13px] font-extrabold text-[#6F5549]">
                        <th className="w-[60px] px-5 py-4">
                          No
                        </th>

                        <th className="w-[230px] px-5 py-4">
                          Siswa
                        </th>

                        <th className="w-[130px] px-5 py-4">
                          NIPD
                        </th>

                        <th className="w-[120px] px-5 py-4">
                          Kelas
                        </th>

                        <th className="w-[80px] px-5 py-4 text-center">
                          Hadir
                        </th>

                        <th className="w-[80px] px-5 py-4 text-center">
                          Izin
                        </th>

                        <th className="w-[80px] px-5 py-4 text-center">
                          Alpa
                        </th>

                        <th className="w-[160px] px-5 py-4">
                          Pemahaman
                        </th>

                        <th className="w-[250px] px-5 py-4">
                          Keterangan
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedRombel.students.map(
                        (
                          student,
                          index
                        ) => (
                          <tr
                            key={
                              student.id
                            }
                            className="min-h-[82px] border-b border-[#F0E1D4] text-[14px]"
                          >
                            <td className="px-5 py-4 align-middle font-bold">
                              {index +
                                1}
                            </td>

                            <td className="px-5 py-4 align-middle">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F8DFD0] text-[13px] font-extrabold text-[#8C0F2D]">
                                  {getInitials(
                                    student.student_name
                                  )}
                                </div>

                                <p className="break-words font-extrabold leading-5 text-[#2B1B18]">
                                  {
                                    student.student_name
                                  }
                                </p>
                              </div>
                            </td>

                            <td className="px-5 py-4 align-middle text-[#6F5549]">
                              {student.student_nis ||
                                "-"}
                            </td>

                            <td className="px-5 py-4 align-middle text-[#6F5549]">
                              {formatClass(
                                student.student_level,
                                student.student_grade
                              )}
                            </td>

                            <td className="px-5 py-4 align-middle text-center">
                              <ChecklistBox
                                checked={isHadir(
                                  student.attendance_status
                                )}
                              />
                            </td>

                            <td className="px-5 py-4 align-middle text-center">
                              <ChecklistBox
                                checked={isIzin(
                                  student.attendance_status
                                )}
                              />
                            </td>

                            <td className="px-5 py-4 align-middle text-center">
                              <ChecklistBox
                                checked={isAlpa(
                                  student.attendance_status
                                )}
                              />
                            </td>

                            <td className="px-5 py-4 align-middle">
                              <UnderstandingBadge
                                status={
                                  student.understanding_status
                                }
                              />
                            </td>

                            <td className="px-5 py-4 align-middle text-[#6F5549]">
                              <p className="break-words leading-5">
                                {getAttendanceNote(
                                  student
                                )}
                              </p>
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
                  setSelectedRombel(
                    null
                  )
                }
                className="h-11 w-full rounded-xl bg-[#8C0F2D] text-[14px] font-extrabold text-white transition hover:bg-[#54131D]"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </KepalaSekolahLayout>
  );
}

/* =========================================================
   COMPONENTS
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

function DetailSummaryCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border border-[#E1CFBE] bg-white px-5 py-4">
      <p className="text-[13px] text-[#6F5549]">
        {label}
      </p>

      <p className="mt-2 text-[24px] font-extrabold text-[#2B1B18]">
        {value}
      </p>
    </div>
  );
}

function ChecklistBox({
  checked,
}: {
  checked: boolean;
}) {
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

function UnderstandingBadge({
  status,
}: {
  status?: string | null;
}) {
  const safe =
    status || "-";

  const className =
    safe === "Paham"
      ? "bg-[#C7F0DA] text-[#158A58]"
      : safe ===
          "Cukup Paham"
        ? "bg-[#FFF2B8] text-[#B26A00]"
        : safe === "-"
          ? "bg-[#F1F5F9] text-[#64748B]"
          : "bg-[#FFE4E6] text-[#BE123C]";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-[12px] font-extrabold ${className}`}
    >
      {safe}
    </span>
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
      <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#8A5A48]">
        {label}
      </p>

      <p className="mt-1 break-words font-extrabold text-[#2B1B18]">
        {value}
      </p>
    </div>
  );
}