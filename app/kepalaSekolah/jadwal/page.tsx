"use client";

import { useEffect, useMemo, useState, type ReactNode, type ChangeEvent } from "react";
import * as XLSX from "xlsx-js-style";
import {
  AlertCircle,
  CalendarCheck,
  Download,
  Printer,
  Eye,
  FileSpreadsheet,
  Upload,
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

  const [importingTeacherAttendance, setImportingTeacherAttendance] =
    useState(false);
  const [importReport, setImportReport] = useState<{
    success: number;
    skipped: number;
    errors: string[];
  } | null>(null);

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
    const monthNumber = Number(exportMonth);
    const yearNumber = Number(exportYear);

    if (!monthNumber || !yearNumber) {
      alert("Pilih bulan dan tahun export terlebih dahulu.");
      return;
    }

    const { start, end } = getCutoffRange(monthNumber, yearNumber);
    const periodAttendance = attendance.filter((item) =>
      isDateInRange(item.attendance_date, start, end)
    );

    if (periodAttendance.length === 0) {
      alert("Tidak ada data absensi KBM pada periode yang dipilih.");
      return;
    }

    // Kelompokkan data berdasarkan satu kegiatan/rombel KBM.
    const groups = groupAttendanceByRombel(periodAttendance).sort((a, b) => {
      const dateCompare = (a.attendance_date || "").localeCompare(b.attendance_date || "");
      if (dateCompare !== 0) return dateCompare;
      return (a.start_time || "").localeCompare(b.start_time || "");
    });

    const worksheetData: (string | number)[][] = [
      ["ABSENSI KBM GURU DAN SISWA HARIAN"],
      ["HOMESCHOOLING TUNAS KARYA BANGSA"],
      [
        "Tahun Ajaran",
        `${monthNumber >= 7 ? yearNumber : yearNumber - 1}/${monthNumber >= 7 ? yearNumber + 1 : yearNumber}`,
      ],
      [
        "Periode",
        `${formatDate(start)} s/d ${formatDate(end)}`,
      ],
      [
        "No",
        "Hari",
        "Tanggal",
        "Nama Guru",
        "Datang Guru",
        "Pulang Guru",
        "Jadwal Kegiatan Belajar Mengajar",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "Keterangan",
      ],
      [
        "",
        "",
        "",
        "",
        "",
        "",
        "Jam Siswa",
        "Sesi",
        "Kls",
        "Mapel",
        "Materi",
        "Siswa",
        "Hadir",
        "Izin",
        "Alpa",
        "",
      ],
    ];

    const merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> = [
      // Judul dan identitas sekolah
      { s: { r: 0, c: 0 }, e: { r: 0, c: 15 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 15 } },
      { s: { r: 2, c: 1 }, e: { r: 2, c: 15 } },
      { s: { r: 3, c: 1 }, e: { r: 3, c: 15 } },
      // Header bertingkat
      { s: { r: 4, c: 6 }, e: { r: 4, c: 14 } },
    ];

    // Kolom identitas dan keterangan membentang dua baris header.
    [0, 1, 2, 3, 4, 5, 15].forEach((column) => {
      merges.push({
        s: { r: 4, c: column },
        e: { r: 5, c: column },
      });
    });

    let totalSessions = 0;
    let totalHadir = 0;
    let totalIzin = 0;
    let totalAlpa = 0;
    let totalSakit = 0;

    groups.forEach((group, groupIndex) => {
      const groupStartRow = worksheetData.length;
      const studentsInGroup = group.students;
      const groupRowCount = Math.max(studentsInGroup.length, 1);

      const dateValue = group.attendance_date || "";
      const dateObject = dateValue ? new Date(`${dateValue}T00:00:00`) : null;
      const dayLabel =
        group.day_name ||
        (dateObject && !Number.isNaN(dateObject.getTime())
          ? new Intl.DateTimeFormat("id-ID", { weekday: "long" }).format(dateObject)
          : "-");

      const duration =
        group.duration_minutes ||
        calculateDurationMinutes(group.start_time, group.end_time);

      let sessionNumber = 0;
      if (duration) {
        sessionNumber = duration === 60 ? 0.75 : duration / 90;
      } else {
        const parsed = Number(String(group.session_name || "").replace(",", "."));
        sessionNumber = Number.isFinite(parsed) ? parsed : 0;
      }
      totalSessions += sessionNumber;

      const classNames = Array.from(
        new Set(
          studentsInGroup.map((student) =>
            formatClass(student.student_level, student.student_grade)
          )
        )
      ).filter((value) => value && value !== "-");

      const classLabel = classNames.length ? classNames.join(", ") : "-";
      const sessionLabel = sessionNumber
        ? new Intl.NumberFormat("id-ID", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          }).format(sessionNumber)
        : "-";

      const groupValues: (string | number)[] = [
        groupIndex + 1,
        dayLabel,
        formatDate(group.attendance_date),
        group.teacher_name || "-",
        formatTime(group.teacher_arrival_time),
        formatTime(group.teacher_departure_time),
        `${formatTime(group.start_time)}-${formatTime(group.end_time)}`,
        sessionLabel,
        classLabel,
        group.subject_name || "-",
        group.material_topic || "-",
      ];

      if (studentsInGroup.length === 0) {
        worksheetData.push([
          ...groupValues,
          "-",
          "",
          "",
          "",
          "-",
        ]);
      } else {
        studentsInGroup.forEach((student) => {
          const hadir = isHadir(student.attendance_status);
          const izin = isIzin(student.attendance_status);
          const alpa = isAlpa(student.attendance_status);
          const sakit = isSakit(student.attendance_status);

          if (hadir) totalHadir += 1;
          if (izin) totalIzin += 1;
          if (alpa) totalAlpa += 1;
          if (sakit) totalSakit += 1;

          const note = getAttendanceNote(student);
          const displayNote =
            note !== "-" ? note : sakit ? "Sakit" : "-";

          worksheetData.push([
            ...groupValues,
            student.student_name || "-",
            hadir ? "✓" : "",
            izin ? "✓" : "",
            alpa ? "✓" : "",
            displayNote,
          ]);
        });
      }

      const groupEndRow = worksheetData.length - 1;

      // Informasi kegiatan yang sama digabung vertikal; nama/status siswa tetap per baris.
      if (groupEndRow > groupStartRow) {
        for (let column = 0; column <= 10; column += 1) {
          merges.push({
            s: { r: groupStartRow, c: column },
            e: { r: groupEndRow, c: column },
          });
        }
      }
    });

    const totalRowIndex = worksheetData.length;
    worksheetData.push([
      "TOTAL SESI",
      "",
      "",
      "",
      "",
      "",
      "",
      Number(totalSessions.toFixed(2)),
      "",
      "",
      "",
      "",
      `Hadir: ${totalHadir}`,
      `Izin: ${totalIzin}`,
      `Alpa: ${totalAlpa}`,
      `Sakit: ${totalSakit}`,
    ]);
    merges.push({
      s: { r: totalRowIndex, c: 0 },
      e: { r: totalRowIndex, c: 6 },
    });

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    worksheet["!merges"] = merges;
    worksheet["!cols"] = [
      { wch: 6 },  // No
      { wch: 12 }, // Hari
      { wch: 14 }, // Tanggal
      { wch: 25 }, // Nama Guru
      { wch: 13 }, // Datang Guru
      { wch: 13 }, // Pulang Guru
      { wch: 15 }, // Jam Siswa
      { wch: 9 },  // Sesi
      { wch: 12 }, // Kls
      { wch: 20 }, // Mapel
      { wch: 28 }, // Materi
      { wch: 30 }, // Siswa
      { wch: 9 },  // Hadir
      { wch: 9 },  // Izin
      { wch: 9 },  // Alpa
      { wch: 32 }, // Keterangan
    ];
    worksheet["!rows"] = [
      { hpt: 28 },
      { hpt: 22 },
      { hpt: 18 },
      { hpt: 18 },
      { hpt: 24 },
      { hpt: 30 },
    ];
    worksheet["!freeze"] = { xSplit: 6, ySplit: 6 };
    worksheet["!autofilter"] = {
      ref: `A6:P${Math.max(6, totalRowIndex)}`,
    };
    worksheet["!pageSetup"] = {
      orientation: "landscape",
      paperSize: 9,
      fitToWidth: 1,
      fitToHeight: 0,
    };
    worksheet["!margins"] = {
      left: 0.25,
      right: 0.25,
      top: 0.5,
      bottom: 0.5,
      header: 0.2,
      footer: 0.2,
    };

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Absensi KBM Harian");

    XLSX.writeFile(
      workbook,
      `Absensi_KBM_Guru_dan_Siswa_${monthOptions[monthNumber]}_${yearNumber}_${start}_sd_${end}.xlsx`
    );
  }


  /* =========================================================
     EXPORT EXCEL ABSENSI MURID
     Format tabel mengikuti desain Excel Absensi KBM Harian.
     Berisi semua data siswa pada periode yang dipilih.
  ========================================================= */

  function handleExportStudentExcel() {
    const monthNumber = Number(exportMonth);
    const yearNumber = Number(exportYear);

    if (!monthNumber || !yearNumber) {
      alert("Pilih bulan dan tahun export terlebih dahulu.");
      return;
    }

    const { start, end } = getCutoffRange(monthNumber, yearNumber);
    // Export ini khusus data kehadiran siswa. Baris absensi guru tanpa
    // student_id tidak dimasukkan ke laporan murid.
    const periodAttendance = attendance.filter((item) =>
      isDateInRange(item.attendance_date, start, end) &&
      Boolean(item.student_id)
    );

    if (periodAttendance.length === 0) {
      alert("Tidak ada data absensi KBM pada periode yang dipilih.");
      return;
    }

    // Kelompokkan data berdasarkan satu kegiatan/rombel KBM.
    const groups = groupAttendanceByRombel(periodAttendance)
      .filter((group) => group.students.length > 0)
      .sort((a, b) => {
      const dateCompare = (a.attendance_date || "").localeCompare(b.attendance_date || "");
      if (dateCompare !== 0) return dateCompare;
      return (a.start_time || "").localeCompare(b.start_time || "");
    });

    const worksheetData: (string | number)[][] = [
      ["ABSENSI KBM GURU DAN SISWA HARIAN"],
      ["HOMESCHOOLING TUNAS KARYA BANGSA"],
      [
        "Tahun Ajaran",
        `${monthNumber >= 7 ? yearNumber : yearNumber - 1}/${monthNumber >= 7 ? yearNumber + 1 : yearNumber}`,
      ],
      [
        "Periode",
        `${formatDate(start)} s/d ${formatDate(end)}`,
      ],
      [
        "No",
        "Hari",
        "Tanggal",
        "Nama Guru",
        "Datang Guru",
        "Pulang Guru",
        "Jadwal Kegiatan Belajar Mengajar",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "Keterangan",
      ],
      [
        "",
        "",
        "",
        "",
        "",
        "",
        "Jam Siswa",
        "Sesi",
        "Kls",
        "Mapel",
        "Materi",
        "Siswa",
        "Hadir",
        "Izin",
        "Alpa",
        "",
      ],
    ];

    const merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> = [
      // Judul dan identitas sekolah
      { s: { r: 0, c: 0 }, e: { r: 0, c: 15 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 15 } },
      { s: { r: 2, c: 1 }, e: { r: 2, c: 15 } },
      { s: { r: 3, c: 1 }, e: { r: 3, c: 15 } },
      // Header bertingkat
      { s: { r: 4, c: 6 }, e: { r: 4, c: 14 } },
    ];

    // Kolom identitas dan keterangan membentang dua baris header.
    [0, 1, 2, 3, 4, 5, 15].forEach((column) => {
      merges.push({
        s: { r: 4, c: column },
        e: { r: 5, c: column },
      });
    });

    let totalSessions = 0;
    let totalHadir = 0;
    let totalIzin = 0;
    let totalAlpa = 0;
    let totalSakit = 0;

    groups.forEach((group, groupIndex) => {
      const groupStartRow = worksheetData.length;
      const studentsInGroup = group.students;
      const groupRowCount = Math.max(studentsInGroup.length, 1);

      const dateValue = group.attendance_date || "";
      const dateObject = dateValue ? new Date(`${dateValue}T00:00:00`) : null;
      const dayLabel =
        group.day_name ||
        (dateObject && !Number.isNaN(dateObject.getTime())
          ? new Intl.DateTimeFormat("id-ID", { weekday: "long" }).format(dateObject)
          : "-");

      const duration =
        group.duration_minutes ||
        calculateDurationMinutes(group.start_time, group.end_time);

      let sessionNumber = 0;
      if (duration) {
        sessionNumber = duration === 60 ? 0.75 : duration / 90;
      } else {
        const parsed = Number(String(group.session_name || "").replace(",", "."));
        sessionNumber = Number.isFinite(parsed) ? parsed : 0;
      }
      totalSessions += sessionNumber;

      const classNames = Array.from(
        new Set(
          studentsInGroup.map((student) =>
            formatClass(student.student_level, student.student_grade)
          )
        )
      ).filter((value) => value && value !== "-");

      const classLabel = classNames.length ? classNames.join(", ") : "-";
      const sessionLabel = sessionNumber
        ? new Intl.NumberFormat("id-ID", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          }).format(sessionNumber)
        : "-";

      const groupValues: (string | number)[] = [
        groupIndex + 1,
        dayLabel,
        formatDate(group.attendance_date),
        group.teacher_name || "-",
        formatTime(group.teacher_arrival_time),
        formatTime(group.teacher_departure_time),
        `${formatTime(group.start_time)}-${formatTime(group.end_time)}`,
        sessionLabel,
        classLabel,
        group.subject_name || "-",
        group.material_topic || "-",
      ];

      if (studentsInGroup.length === 0) {
        worksheetData.push([
          ...groupValues,
          "-",
          "",
          "",
          "",
          "-",
        ]);
      } else {
        studentsInGroup.forEach((student) => {
          const hadir = isHadir(student.attendance_status);
          const izin = isIzin(student.attendance_status);
          const alpa = isAlpa(student.attendance_status);
          const sakit = isSakit(student.attendance_status);

          if (hadir) totalHadir += 1;
          if (izin) totalIzin += 1;
          if (alpa) totalAlpa += 1;
          if (sakit) totalSakit += 1;

          const note = getAttendanceNote(student);
          const displayNote =
            note !== "-" ? note : sakit ? "Sakit" : "-";

          worksheetData.push([
            ...groupValues,
            student.student_name || "-",
            hadir ? "✓" : "",
            izin ? "✓" : "",
            alpa ? "✓" : "",
            displayNote,
          ]);
        });
      }

      const groupEndRow = worksheetData.length - 1;

      // Informasi kegiatan yang sama digabung vertikal; nama/status siswa tetap per baris.
      if (groupEndRow > groupStartRow) {
        for (let column = 0; column <= 10; column += 1) {
          merges.push({
            s: { r: groupStartRow, c: column },
            e: { r: groupEndRow, c: column },
          });
        }
      }
    });

    const totalRowIndex = worksheetData.length;
    worksheetData.push([
      "TOTAL SESI",
      "",
      "",
      "",
      "",
      "",
      "",
      Number(totalSessions.toFixed(2)),
      "",
      "",
      "",
      "",
      `Hadir: ${totalHadir}`,
      `Izin: ${totalIzin}`,
      `Alpa: ${totalAlpa}`,
      `Sakit: ${totalSakit}`,
    ]);
    merges.push({
      s: { r: totalRowIndex, c: 0 },
      e: { r: totalRowIndex, c: 6 },
    });

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    worksheet["!merges"] = merges;
    worksheet["!cols"] = [
      { wch: 6 },  // No
      { wch: 12 }, // Hari
      { wch: 14 }, // Tanggal
      { wch: 25 }, // Nama Guru
      { wch: 13 }, // Datang Guru
      { wch: 13 }, // Pulang Guru
      { wch: 15 }, // Jam Siswa
      { wch: 9 },  // Sesi
      { wch: 12 }, // Kls
      { wch: 20 }, // Mapel
      { wch: 28 }, // Materi
      { wch: 30 }, // Siswa
      { wch: 9 },  // Hadir
      { wch: 9 },  // Izin
      { wch: 9 },  // Alpa
      { wch: 32 }, // Keterangan
    ];
    worksheet["!rows"] = [
      { hpt: 28 },
      { hpt: 22 },
      { hpt: 18 },
      { hpt: 18 },
      { hpt: 24 },
      { hpt: 30 },
    ];
    worksheet["!freeze"] = { xSplit: 6, ySplit: 6 };
    worksheet["!autofilter"] = {
      ref: `A6:P${Math.max(6, totalRowIndex)}`,
    };
    worksheet["!pageSetup"] = {
      orientation: "landscape",
      paperSize: 9,
      fitToWidth: 1,
      fitToHeight: 0,
    };
    worksheet["!margins"] = {
      left: 0.25,
      right: 0.25,
      top: 0.5,
      bottom: 0.5,
      header: 0.2,
      footer: 0.2,
    };

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Absensi Murid");

    XLSX.writeFile(
      workbook,
      `Absensi_Murid_${monthOptions[monthNumber]}_${yearNumber}_${start}_sd_${end}.xlsx`,
      { bookType: "xlsx", cellStyles: true }
    );
  }

  /* =========================================================
     IMPORT ABSENSI GURU DARI EXCEL
     Pencocokan menggunakan Kode Guru (teachers.teacher_code)
  ========================================================= */

  function normalizeHeader(value: unknown) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, "");
  }

  function getCell(row: Record<string, unknown>, aliases: string[]) {
    const wanted = aliases.map(normalizeHeader);
    const key = Object.keys(row).find((item) =>
      wanted.includes(normalizeHeader(item))
    );
    return key ? row[key] : undefined;
  }

  function parseImportDate(value: unknown): string | null {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return toYMD(value);
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (parsed) {
        return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
      }
    }

    const raw = String(value ?? "").trim();
    if (!raw) return null;

    // Format YYYY-MM-DD
    const iso = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (iso) {
      return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
    }

    // Format DD/MM/YYYY atau DD-MM-YYYY
    const local = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (local) {
      const day = Number(local[1]);
      const month = Number(local[2]);
      const year = Number(local[3]);
      const date = new Date(year, month - 1, day);
      if (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
      ) {
        return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
    }

    return null;
  }

  function parseImportTime(value: unknown): string | null {
    if (value === null || value === undefined || value === "") return null;

    if (typeof value === "number" && Number.isFinite(value)) {
      const totalMinutes = Math.round(value * 24 * 60);
      const hours = Math.floor(totalMinutes / 60) % 24;
      const minutes = totalMinutes % 60;
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
    }

    const raw = String(value).trim();
    const match = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) return null;

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    const seconds = Number(match[3] || 0);
    if (hours > 23 || minutes > 59 || seconds > 59) return null;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function normalizeTeacherStatus(value: unknown): string {
    const status = normalizeText(String(value ?? ""));
    if (["hadir", "present", "h"].includes(status)) return "Hadir";
    if (["izin", "i"].includes(status)) return "Izin";
    if (["sakit", "s"].includes(status)) return "Sakit";
    if (["alpa", "alpha", "absent", "a", "tidak hadir"].includes(status)) return "Alpa";
    return "";
  }

  async function handleImportTeacherAttendance(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportReport(null);
    setImportingTeacherAttendance(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) throw new Error("File Excel tidak memiliki sheet.");

      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: "",
        raw: true,
      });

      if (!rows.length) throw new Error("Tidak ada data pada sheet pertama.");

      const teacherByCode = new Map(
        teachers
          .filter((teacher) => teacher.teacher_code)
          .map((teacher) => [String(teacher.teacher_code).trim().toLowerCase(), teacher])
      );

      const errors: string[] = [];
      const validRows: Array<{
        teacher_id: string;
        attendance_date: string;
        arrival_time: string | null;
        departure_time: string | null;
        status: string;
        notes: string | null;
      }> = [];

      rows.forEach((row, index) => {
        const excelRow = index + 2;
        const code = String(
          getCell(row, ["Kode Guru", "Kode", "Teacher Code", "teacher_code"]) ?? ""
        ).trim().toLowerCase();
        const date = parseImportDate(
          getCell(row, ["Tanggal", "Tanggal Absensi", "Attendance Date", "attendance_date"])
        );
        const arrivalRaw = getCell(row, ["Jam Datang", "Jam Masuk", "Waktu Datang", "Arrival Time", "arrival_time"]);
        const departureRaw = getCell(row, ["Jam Pulang", "Waktu Pulang", "Departure Time", "departure_time"]);
        const status = normalizeTeacherStatus(
          getCell(row, ["Status", "Kehadiran", "Keterangan Status"])
        );
        const notesRaw = getCell(row, ["Catatan", "Keterangan", "Notes"]);
        const teacher = teacherByCode.get(code);

        if (!code) {
          errors.push(`Baris ${excelRow}: Kode Guru kosong.`);
          return;
        }
        if (!teacher) {
          errors.push(`Baris ${excelRow}: Kode Guru "${code}" tidak ditemukan.`);
          return;
        }
        if (!date) {
          errors.push(`Baris ${excelRow}: Tanggal kosong atau format tanggal tidak valid.`);
          return;
        }
        if (!status) {
          errors.push(`Baris ${excelRow}: Status tidak valid. Gunakan Hadir, Izin, Sakit, atau Alpa.`);
          return;
        }

        const arrival = arrivalRaw === "" ? null : parseImportTime(arrivalRaw);
        const departure = departureRaw === "" ? null : parseImportTime(departureRaw);
        if (arrivalRaw !== "" && !arrival) {
          errors.push(`Baris ${excelRow}: Format Jam Datang tidak valid.`);
          return;
        }
        if (departureRaw !== "" && !departure) {
          errors.push(`Baris ${excelRow}: Format Jam Pulang tidak valid.`);
          return;
        }

        validRows.push({
          teacher_id: teacher.id,
          attendance_date: date,
          arrival_time: arrival,
          departure_time: departure,
          status,
          notes: String(notesRaw ?? "").trim() || null,
        });
      });

      // Satu file dapat berisi guru dan tanggal yang sama lebih dari sekali.
      // Baris terakhir dipakai agar satu guru hanya memiliki satu rekap per tanggal.
      const uniqueRows = new Map<string, typeof validRows[number]>();
      validRows.forEach((row) => {
        uniqueRows.set(`${row.teacher_id}__${row.attendance_date}`, row);
      });

      let success = 0;
      for (const row of uniqueRows.values()) {
        const existing = await supabase
          .from("teacher_attendance")
          .select("id")
          .eq("teacher_id", row.teacher_id)
          .eq("attendance_date", row.attendance_date)
          .maybeSingle();

        if (existing.error) {
          errors.push(`Gagal memeriksa data ${row.attendance_date}: ${existing.error.message}`);
          continue;
        }

        const result = existing.data?.id
          ? await supabase
              .from("teacher_attendance")
              .update({ ...row, updated_at: new Date().toISOString() })
              .eq("id", existing.data.id)
          : await supabase
              .from("teacher_attendance")
              .insert(row);

        if (result.error) {
          errors.push(`Gagal menyimpan Kode Guru ${teachers.find((t) => t.id === row.teacher_id)?.teacher_code || "-"} tanggal ${row.attendance_date}: ${result.error.message}`);
        } else {
          success += 1;
        }
      }

      const skipped = rows.length - success;
      setImportReport({ success, skipped, errors });
      await fetchData();
    } catch (error) {
      setImportReport({
        success: 0,
        skipped: 0,
        errors: [error instanceof Error ? error.message : "Gagal membaca file Excel."],
      });
    } finally {
      setImportingTeacherAttendance(false);
      event.target.value = "";
    }
  }

  function handleDownloadTeacherImportTemplate() {
    const template = [
      ["Kode Guru", "Tanggal", "Jam Datang", "Jam Pulang", "Status", "Keterangan"],
      ["GR001", "2026-11-16", "07:00", "15:00", "Hadir", ""],
      ["GR002", "2026-11-16", "07:15", "15:00", "Izin", "Izin keluarga"],
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(template);
    worksheet["!cols"] = [
      { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 30 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Import Absensi Guru");
    XLSX.writeFile(workbook, "Template_Import_Absensi_Guru.xlsx");
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

  /* =========================================================
     EXPORT & PRINT ABSENSI GURU
     Format mengikuti lembar "Absensi KBM Guru dan Siswa Harian".
     Export dan cetak menggunakan guru yang dipilih pada dropdown.
  ========================================================= */

  type TeacherReportGroup = {
    teacherId: string;
    teacherName: string;
    date: string;
    dayName: string;
    arrivalTime: string;
    departureTime: string;
    teacherStatus: string;
    teacherNotes: string;
    group: RombelGroup | null;
  };

  function buildTeacherReportGroups(
    start: string,
    end: string,
    selectedTeacherId?: string
  ): TeacherReportGroup[] {
    const teacherMap = new Map(teachers.map((teacher) => [teacher.id, teacher]));
    const dailyAttendance = teacherAttendance.filter((item) =>
      isDateInRange(item.attendance_date, start, end) &&
      (!selectedTeacherId || item.teacher_id === selectedTeacherId)
    );
    const kbmGroups = groupAttendanceByRombel(
      attendance.filter((item) =>
        isDateInRange(item.attendance_date, start, end) &&
        (!selectedTeacherId || item.teacher_id === selectedTeacherId)
      )
    );

    const dailyMap = new Map<string, TeacherAttendanceRow>();
    dailyAttendance.forEach((item) => {
      dailyMap.set(`${item.teacher_id}__${item.attendance_date}`, item);
    });

    const combined = new Map<string, {
      teacherId: string;
      date: string;
      groups: RombelGroup[];
    }>();

    dailyAttendance.forEach((item) => {
      const key = `${item.teacher_id}__${item.attendance_date}`;
      if (!combined.has(key)) {
        combined.set(key, {
          teacherId: item.teacher_id,
          date: item.attendance_date,
          groups: [],
        });
      }
    });

    kbmGroups.forEach((group) => {
      if (!group.teacher_id || !group.attendance_date) return;
      const key = `${group.teacher_id}__${group.attendance_date}`;
      const current = combined.get(key) || {
        teacherId: group.teacher_id,
        date: group.attendance_date,
        groups: [],
      };
      current.groups.push(group);
      combined.set(key, current);
    });

    const result: TeacherReportGroup[] = [];
    Array.from(combined.values())
      .sort((a, b) =>
        a.date.localeCompare(b.date) ||
        (teacherMap.get(a.teacherId)?.full_name || "").localeCompare(
          teacherMap.get(b.teacherId)?.full_name || ""
        )
      )
      .forEach((daily) => {
        const teacher = teacherMap.get(daily.teacherId);
        const dailyRecord = dailyMap.get(`${daily.teacherId}__${daily.date}`);
        const firstKbm = daily.groups[0];
        const arrivalTime =
          dailyRecord?.arrival_time ||
          firstKbm?.teacher_arrival_time ||
          "";
        const departureTime =
          dailyRecord?.departure_time ||
          firstKbm?.teacher_departure_time ||
          "";
        const dateObject = new Date(`${daily.date}T00:00:00`);
        const dayName =
          firstKbm?.day_name ||
          (Number.isNaN(dateObject.getTime())
            ? "-"
            : new Intl.DateTimeFormat("id-ID", { weekday: "long" }).format(dateObject));

        if (daily.groups.length === 0) {
          result.push({
            teacherId: daily.teacherId,
            teacherName: teacher?.full_name || "Guru tidak ditemukan",
            date: daily.date,
            dayName,
            arrivalTime,
            departureTime,
            teacherStatus: dailyRecord?.status || "-",
            teacherNotes: dailyRecord?.notes || "Tidak ada jadwal hari ini",
            group: null,
          });
          return;
        }

        daily.groups
          .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""))
          .forEach((group) => {
            result.push({
              teacherId: daily.teacherId,
              teacherName: teacher?.full_name || group.teacher_name || "Guru tidak ditemukan",
              date: daily.date,
              dayName: group.day_name || dayName,
              arrivalTime:
                dailyRecord?.arrival_time || group.teacher_arrival_time || "",
              departureTime:
                dailyRecord?.departure_time || group.teacher_departure_time || "",
              teacherStatus: dailyRecord?.status || "-",
              teacherNotes: dailyRecord?.notes || "",
              group,
            });
          });
      });

    return result;
  }

  function getTeacherReportCellRows(item: TeacherReportGroup): (string | number)[][] {
    const group = item.group;
    const studentsInGroup = group?.students || [];
    const sessionNumber = group
      ? Number(String(group.session_name || "0").replace(",", ".")) || 0
      : 0;
    const classNames = group
      ? Array.from(new Set(
          group.students
            .map((student) => formatClass(student.student_level, student.student_grade))
            .filter((value) => value && value !== "-")
        )).join(", ")
      : "-";

    const base = [
      item.dayName || "-",
      formatDate(item.date),
      item.teacherName,
      formatTime(item.arrivalTime),
      formatTime(item.departureTime),
      group ? `${formatTime(group.start_time)}-${formatTime(group.end_time)}` : "-",
      group ? sessionNumber : "-",
      classNames || "-",
      group?.subject_name || "-",
      group?.material_topic || "-",
    ];

    if (!studentsInGroup.length) {
      return [[
        ...base,
        "-",
        "",
        "",
        "",
        item.teacherNotes || (
          item.teacherStatus !== "-" ? item.teacherStatus : "Tidak ada jadwal hari ini"
        ),
      ]];
    }

    return studentsInGroup.map((student) => {
      const status = normalizeAttendanceStatus(student.attendance_status);
      return [
        ...base,
        student.student_name || "-",
        isHadir(status) ? "✓" : "",
        isIzin(status) ? "✓" : "",
        isAlpa(status) ? "✓" : "",
        getAttendanceNote(student) !== "-"
          ? getAttendanceNote(student)
          : isSakit(status)
            ? "Sakit"
            : item.teacherNotes || "",
      ];
    });
  }

  function handleExportTeacherExcel() {
    const period = getTeacherAttendanceForPeriod();
    if (!period) return;

    if (!printTeacherId) {
      alert("Pilih guru terlebih dahulu untuk export absensi.");
      return;
    }

    const teacher = teachers.find((item) => item.id === printTeacherId);
    if (!teacher) {
      alert("Data guru tidak ditemukan.");
      return;
    }

    const { start, end, monthNumber, yearNumber } = period;
    const reportGroups = buildTeacherReportGroups(start, end, printTeacherId);

    if (reportGroups.length === 0) {
      alert(`Tidak ada data absensi guru atau KBM untuk ${teacher.full_name || "guru ini"} pada periode yang dipilih.`);
      return;
    }

    const academicYear =
      monthNumber >= 7
        ? `${yearNumber}/${yearNumber + 1}`
        : `${yearNumber - 1}/${yearNumber}`;

    // Susunan header mengikuti contoh Excel: 3 baris identitas,
    // lalu header tabel bertingkat pada baris 4 dan 5.
    const worksheetData: (string | number)[][] = [
      ["ABSENSI KBM GURU DAN SISWA HARIAN"],
      ["HOMESCHOOLING TUNAS KARYA BANGSA"],
      [`Tahun Ajaran ${academicYear}`],
      [
        "No", "Hari", "Tanggal", "Nama Guru", "Datang Guru", "Pulang Guru",
        "Jadwal Kegiatan Belajar Mengajar", "", "", "", "", "", "", "", "", "Keterangan",
      ],
      [
        "", "", "", "", "", "",
        "Jam Siswa", "Sesi", "Kls", "Mapel", "Materi", "Siswa",
        "Hadir", "Izin", "Alpa", "",
      ],
    ];

    const merges: XLSX.Range[] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 15 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 15 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 15 } },
      { s: { r: 3, c: 6 }, e: { r: 3, c: 14 } },
    ];

    [0, 1, 2, 3, 4, 5, 15].forEach((column) => {
      merges.push({
        s: { r: 3, c: column },
        e: { r: 4, c: column },
      });
    });

    let groupNumber = 0;
    let totalHadir = 0;
    let totalIzin = 0;
    let totalAlpa = 0;
    let totalSakit = 0;

    const groupRowRanges: Array<{ startRow: number; endRow: number }> = [];

    reportGroups.forEach((item) => {
      const startRow = worksheetData.length;
      const rows = getTeacherReportCellRows(item);
      groupNumber += 1;

      rows.forEach((row) => {
        // row berisi Hari s/d Keterangan (15 kolom); nomor ditambahkan di depan.
        worksheetData.push([groupNumber, ...row]);
      });

      const endRow = worksheetData.length - 1;
      groupRowRanges.push({ startRow, endRow });

      // Identitas sesi/jadwal digabung vertikal, kolom siswa dan status tetap per siswa.
      if (endRow > startRow) {
        for (let column = 0; column <= 10; column += 1) {
          merges.push({
            s: { r: startRow, c: column },
            e: { r: endRow, c: column },
          });
        }
      }

      (item.group?.students || []).forEach((student) => {
        const status = normalizeAttendanceStatus(student.attendance_status);
        if (isHadir(status)) totalHadir += 1;
        if (isIzin(status)) totalIzin += 1;
        if (isAlpa(status)) totalAlpa += 1;
        if (isSakit(status)) totalSakit += 1;
      });
    });

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    worksheet["!merges"] = merges;

    // Lebar kolom meniru proporsi pada contoh Excel yang dikirim.
    worksheet["!cols"] = [
      { wch: 5 },   // No
      { wch: 12 },  // Hari
      { wch: 15 },  // Tanggal
      { wch: 24 },  // Nama Guru
      { wch: 10 },  // Datang Guru
      { wch: 10 },  // Pulang Guru
      { wch: 13 },  // Jam Siswa
      { wch: 7 },   // Sesi
      { wch: 8 },   // Kls
      { wch: 16 },  // Mapel
      { wch: 21 },  // Materi
      { wch: 25 },  // Siswa
      { wch: 8 },   // Hadir
      { wch: 8 },   // Izin
      { wch: 8 },   // Alpa
      { wch: 28 },  // Keterangan
    ];

    const thinBorder = {
      top: { style: "thin", color: { rgb: "333333" } },
      bottom: { style: "thin", color: { rgb: "333333" } },
      left: { style: "thin", color: { rgb: "333333" } },
      right: { style: "thin", color: { rgb: "333333" } },
    };

    const titleStyle = {
      font: { name: "Arial", sz: 15, bold: true, color: { rgb: "000000" } },
      alignment: { horizontal: "center", vertical: "center" },
    };

    const schoolStyle = {
      font: { name: "Arial", sz: 11, bold: true, color: { rgb: "000000" } },
      alignment: { horizontal: "center", vertical: "center" },
    };

    const yearStyle = {
      font: { name: "Arial", sz: 9, color: { rgb: "555555" } },
      alignment: { horizontal: "center", vertical: "center" },
    };

    const headerStyle = {
      font: { name: "Arial", sz: 10, bold: true, color: { rgb: "111111" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      fill: { patternType: "solid", fgColor: { rgb: "F2F2F2" } },
      border: thinBorder,
    };

    const dataStyle = {
      font: { name: "Arial", sz: 9, color: { rgb: "111111" } },
      alignment: { vertical: "top", wrapText: true },
      border: thinBorder,
    };

    // Style judul dan identitas sekolah.
    ["A1", "A2", "A3"].forEach((address, index) => {
      if (!worksheet[address]) return;
      worksheet[address].s =
        index === 0 ? titleStyle : index === 1 ? schoolStyle : yearStyle;
    });

    // Style dua tingkat header.
    for (let row = 3; row <= 4; row += 1) {
      for (let column = 0; column <= 15; column += 1) {
        const address = XLSX.utils.encode_cell({ r: row, c: column });
        if (!worksheet[address]) worksheet[address] = { t: "s", v: "" };
        worksheet[address].s = headerStyle;
      }
    }

    // Style data dan tanda status berwarna seperti contoh.
    groupRowRanges.forEach(({ startRow, endRow }) => {
      for (let row = startRow; row <= endRow; row += 1) {
        for (let column = 0; column <= 15; column += 1) {
          const address = XLSX.utils.encode_cell({ r: row, c: column });
          if (!worksheet[address]) worksheet[address] = { t: "s", v: "" };
          worksheet[address].s = {
            ...dataStyle,
            alignment: {
              vertical: "top",
              horizontal: [0, 2, 4, 5, 7, 8, 12, 13, 14].includes(column)
                ? "center"
                : "left",
              wrapText: true,
            },
          };
        }

        const hadirAddress = XLSX.utils.encode_cell({ r: row, c: 12 });
        const izinAddress = XLSX.utils.encode_cell({ r: row, c: 13 });
        const alpaAddress = XLSX.utils.encode_cell({ r: row, c: 14 });

        if (worksheet[hadirAddress]?.v === "✓") {
          worksheet[hadirAddress].s = {
            ...headerStyle,
            font: { name: "Arial", sz: 15, bold: true, color: { rgb: "FFFFFF" } },
            fill: { patternType: "solid", fgColor: { rgb: "20BF6B" } },
          };
        }

        if (worksheet[izinAddress]?.v === "✓") {
          worksheet[izinAddress].s = {
            ...headerStyle,
            font: { name: "Arial", sz: 15, bold: true, color: { rgb: "FFFFFF" } },
            fill: { patternType: "solid", fgColor: { rgb: "7C3AED" } },
          };
        }

        if (worksheet[alpaAddress]?.v === "✓") {
          worksheet[alpaAddress].s = {
            ...headerStyle,
            font: { name: "Arial", sz: 15, bold: true, color: { rgb: "FFFFFF" } },
            fill: { patternType: "solid", fgColor: { rgb: "DC2626" } },
          };
        }
      }
    });

    // Tinggi baris judul/header dan data mengikuti banyaknya teks.
    worksheet["!rows"] = [
      { hpt: 30 },
      { hpt: 22 },
      { hpt: 18 },
      { hpt: 28 },
      { hpt: 30 },
    ];

    groupRowRanges.forEach(({ startRow, endRow }) => {
      for (let row = startRow; row <= endRow; row += 1) {
        const studentText = String(
          worksheet[XLSX.utils.encode_cell({ r: row, c: 11 })]?.v || ""
        );
        const materialText = String(
          worksheet[XLSX.utils.encode_cell({ r: row, c: 10 })]?.v || ""
        );
        const noteText = String(
          worksheet[XLSX.utils.encode_cell({ r: row, c: 15 })]?.v || ""
        );

        const lines = Math.max(
          1,
          Math.ceil(studentText.length / 25),
          Math.ceil(materialText.length / 21),
          Math.ceil(noteText.length / 28)
        );

        worksheet["!rows"]![row] = {
          hpt: Math.min(90, Math.max(25, lines * 15)),
        };
      }
    });

    worksheet["!freeze"] = { xSplit: 6, ySplit: 5 };
    worksheet["!sheetView"] = [{ showGridLines: false }];
    worksheet["!pageSetup"] = {
      orientation: "landscape",
      paperSize: 9,
      fitToWidth: 1,
      fitToHeight: 0,
    };
    worksheet["!margins"] = {
      left: 0.25,
      right: 0.25,
      top: 0.35,
      bottom: 0.35,
      header: 0.15,
      footer: 0.15,
    };

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Absensi Guru Harian");

    const safeTeacherName = (teacher.full_name || "Guru")
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    XLSX.writeFile(
      workbook,
      `Absensi_KBM_${safeTeacherName}_${monthOptions[monthNumber]}_${yearNumber}_${start}_sd_${end}.xlsx`,
      { bookType: "xlsx", cellStyles: true }
    );
  }

  function escapePrintHtml(value: unknown) {
    return String(value ?? "-")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function handlePrintTeacherAttendance() {
    const period = getTeacherAttendanceForPeriod();
    if (!period) return;

    if (!printTeacherId) {
      alert("Pilih guru yang ingin dicetak.");
      return;
    }

    const { start, end, monthNumber, yearNumber } = period;
    const teacher = teachers.find((item) => item.id === printTeacherId);
    if (!teacher) {
      alert("Data guru tidak ditemukan.");
      return;
    }

    const reportGroups = buildTeacherReportGroups(start, end, printTeacherId);
    if (reportGroups.length === 0) {
      alert("Tidak ada data absensi guru atau KBM untuk guru ini pada periode yang dipilih.");
      return;
    }

    let rowNumber = 0;
    const bodyRows = reportGroups.map((item) => {
      const rows = getTeacherReportCellRows(item);
      const rowSpan = rows.length;
      const first = rows[0];
      const sharedCells = [
        `<td rowspan="${rowSpan}">${++rowNumber}</td>`,
        `<td rowspan="${rowSpan}">${escapePrintHtml(first[0])}</td>`,
        `<td rowspan="${rowSpan}">${escapePrintHtml(first[1])}</td>`,
        `<td rowspan="${rowSpan}"><strong>${escapePrintHtml(first[2])}</strong></td>`,
        `<td rowspan="${rowSpan}">${escapePrintHtml(first[3])}</td>`,
        `<td rowspan="${rowSpan}">${escapePrintHtml(first[4])}</td>`,
        `<td rowspan="${rowSpan}">${escapePrintHtml(first[5])}</td>`,
        `<td rowspan="${rowSpan}">${escapePrintHtml(first[6])}</td>`,
        `<td rowspan="${rowSpan}">${escapePrintHtml(first[7])}</td>`,
        `<td rowspan="${rowSpan}">${escapePrintHtml(first[8])}</td>`,
        `<td rowspan="${rowSpan}">${escapePrintHtml(first[9])}</td>`,
      ].join("");

      return rows.map((row, index) => {
        const studentCells = [
          `<td class="student">${escapePrintHtml(row[10])}</td>`,
          `<td class="status">${row[11] ? '<span class="check hadir">✓</span>' : ""}</td>`,
          `<td class="status">${row[12] ? '<span class="check izin">✓</span>' : ""}</td>`,
          `<td class="status">${row[13] ? '<span class="check alpa">✓</span>' : ""}</td>`,
          `<td class="note">${escapePrintHtml(row[14])}</td>`,
        ].join("");
        return `<tr>${index === 0 ? sharedCells : ""}${studentCells}</tr>`;
      }).join("");
    }).join("");

    const safeName = escapePrintHtml(teacher.full_name || "Guru");
    const printWindow = window.open("", "_blank", "width=1400,height=900");
    if (!printWindow) {
      alert("Pop-up diblokir browser. Izinkan pop-up untuk mencetak.");
      return;
    }

    printWindow.document.write(`<!DOCTYPE html>
      <html lang="id"><head><meta charset="UTF-8" />
      <title>Absensi KBM Guru dan Siswa - ${safeName}</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; color: #111; padding: 18px; }
        h1 { text-align: center; font-size: 20px; font-weight: 800; margin: 0 0 7px; }
        .school { text-align: center; font-size: 12px; font-weight: 700; margin: 0 0 5px; }
        .period { text-align: center; font-size: 10px; margin: 0 0 20px; }
        .teacher { font-size: 11px; margin: -8px 0 12px; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 9px; }
        th, td { border: 1px solid #555; padding: 5px 4px; vertical-align: top; overflow-wrap: anywhere; }
        th { text-align: center; font-weight: 700; vertical-align: middle; }
        .student { font-weight: 700; }
        .status { text-align: center; vertical-align: middle; }
        .check { display: inline-block; color: white; font-weight: 700; padding: 5px 9px; border-radius: 2px; }
        .hadir { background: #20bf6b; }
        .izin { background: #7c3aed; }
        .alpa { background: #e05252; }
        .note { color: #6b625d; }
        .sign { display: flex; justify-content: space-between; margin-top: 42px; text-align: center; font-size: 11px; }
        .sign div { width: 220px; }
        @page { size: A4 landscape; margin: 9mm; }
        @media print { body { padding: 0; } thead { display: table-header-group; } tr { page-break-inside: avoid; } }
      </style></head><body>
      <h1>ABSENSI KBM GURU DAN SISWA HARIAN</h1>
      <p class="school">HOMESCHOOLING TUNAS KARYA BANGSA</p>
      <p class="period">Tahun Ajaran ${monthNumber >= 7 ? yearNumber : yearNumber - 1}/${monthNumber >= 7 ? yearNumber + 1 : yearNumber} · Periode ${escapePrintHtml(formatDate(start))} s/d ${escapePrintHtml(formatDate(end))}</p>
      <p class="teacher"><strong>Nama Guru:</strong> ${safeName} &nbsp; <strong>Kode Guru:</strong> ${escapePrintHtml(teacher.teacher_code || "-")}</p>
      <table>
        <thead>
          <tr>
            <th rowspan="2" style="width:3%">No</th>
            <th rowspan="2" style="width:6%">Hari</th>
            <th rowspan="2" style="width:7%">Tanggal</th>
            <th rowspan="2" style="width:10%">Nama Guru</th>
            <th rowspan="2" style="width:5%">Datang Guru</th>
            <th rowspan="2" style="width:5%">Pulang Guru</th>
            <th colspan="9">Jadwal Kegiatan Belajar Mengajar</th>
            <th rowspan="2" style="width:12%">Keterangan</th>
          </tr>
          <tr>
            <th style="width:7%">Jam Siswa</th><th style="width:4%">Sesi</th>
            <th style="width:5%">Kls</th><th style="width:8%">Mapel</th>
            <th style="width:9%">Materi</th><th style="width:13%">Siswa</th>
            <th style="width:4%">Hadir</th><th style="width:4%">Izin</th><th style="width:4%">Alpa</th>
          </tr>
        </thead>
        <tbody>${bodyRows}</tbody>
      </table>
      <div class="sign">
        <div>Mengetahui,<br/>Kepala Sekolah<br/><br/><br/><br/>(____________________)</div>
        <div>Guru yang bersangkutan<br/><br/><br/><br/><br/>(____________________)</div>
      </div>
      <script>window.onload = () => { window.print(); };</script>
      </body></html>`);
    printWindow.document.close();
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

          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-[#DCC8B6] bg-[#FFFCF8] p-4">
            <div className="mr-auto min-w-[220px]">
              <p className="text-[14px] font-extrabold text-[#2B1B18]">Import Absensi Guru dari Spreadsheet</p>
              <p className="mt-1 text-[12px] leading-5 text-[#6F5549]">
                Cocokkan data menggunakan Kode Guru. Data guru dan tanggal yang sudah ada akan diperbarui.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTeacherImportTemplate}
              className="flex h-10 items-center gap-2 rounded-xl border border-[#DCC8B6] bg-white px-4 text-[13px] font-bold text-[#8C0F2D] hover:bg-[#FFF8EF]"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Download Template
            </button>
            <label className={`flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-[#8C0F2D] px-4 text-[13px] font-extrabold text-white transition hover:bg-[#720B24] ${importingTeacherAttendance ? "pointer-events-none opacity-60" : ""}`}>
              <Upload className="h-4 w-4" />
              {importingTeacherAttendance ? "Mengimpor..." : "Pilih File Excel"}
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                disabled={importingTeacherAttendance}
                onChange={handleImportTeacherAttendance}
              />
            </label>
          </div>

          {importReport ? (
            <div className="mb-4 rounded-xl border border-[#E1CFBE] bg-[#FFF8EF] p-4 text-[13px]">
              <p className="font-extrabold text-[#2B1B18]">
                Import selesai: {importReport.success} data berhasil disimpan, {importReport.skipped} baris dilewati.
              </p>
              {importReport.errors.length > 0 ? (
                <ul className="mt-2 max-h-40 list-disc space-y-1 overflow-y-auto pl-5 text-red-700">
                  {importReport.errors.map((message, index) => <li key={`${index}-${message}`}>{message}</li>)}
                </ul>
              ) : (
                <p className="mt-1 text-[#6F5549]">Tidak ada kesalahan pada data yang diimpor.</p>
              )}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <select
              value={printTeacherId}
              onChange={(event) => setPrintTeacherId(event.target.value)}
              className="h-11 min-w-[240px] rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              <option value="">Pilih guru untuk export / cetak</option>
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
              Export Excel Guru Terpilih
            </button>
            <button
              type="button"
              onClick={handleExportStudentExcel}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#DCC8B6] bg-white px-5 text-[14px] font-extrabold text-[#8C0F2D] transition hover:bg-[#FFF8EF]"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export Excel Absensi Murid
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
            <table className="w-full min-w-[1870px] table-fixed border-collapse">
              <thead>
                <tr className="border-b border-[#EADACA] bg-[#FFF8EF] text-left text-[13px] font-extrabold text-[#6F5549]">
                  <th className="w-[70px] px-5 py-4">
                    No
                  </th>

                  <th className="w-[250px] px-5 py-4">
                    Nama
                  </th>

                  <th className="w-[130px] px-5 py-4">
                    Tanggal
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
                        15
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
                        15
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

                        <td className="whitespace-nowrap px-5 py-4 align-middle">
                          {formatDate(group.attendance_date)}
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