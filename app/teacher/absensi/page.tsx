"use client";

import { useEffect, useMemo, useState, type ReactNode, type ChangeEvent } from "react";
import * as XLSX from "xlsx";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileSpreadsheet,
  Pencil,
  Printer,
  Save,
  Search,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import TeacherLayout from "../components/TeacherLayout";

type TeacherRow = {
  id: string;
  full_name: string | null;
  email?: string | null;
  teacher_code?: string | null;
  subjects?: string[] | string | null;
};

type StudentRow = {
  id: string;
  full_name: string | null;
  level: string | null;
  grade: string | null;
  nis?: string | null;
  nisn?: string | null;
};

type SubjectRow = {
  id: string;
  name: string | null;
  level?: string | null;
  grade?: string | null;
};

type StudentTeacherRow = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  academic_year: string | null;
  notes?: string | null;
};

type AttendanceRow = {
  id: string;
  teacher_id: string | null;
  student_id: string | null;
  subject_id: string | null;

  attendance_date: string | null;
  day_name?: string | null;

  teacher_arrival_time?: string | null;
  teacher_departure_time?: string | null;

  start_time?: string | null;
  end_time?: string | null;

  duration_minutes?: number | null;
  session_name?: string | null;

  attendance_status?: string | null;
  understanding_status?: string | null;
  material_topic?: string | null;
  attendance_score?: number | null;
  is_online?: boolean | null;
  is_offline?: boolean | null;
  problem?: string | null;
  consequence?: string | null;
  solution?: string | null;

  note?: string | null;
  notes?: string | null;

  created_at?: string | null;
  updated_at?: string | null;
};

type AttendanceStudent = StudentRow & {
  attendanceStatus: string;
  understandingStatus: string;
  note: string;
};

type AttendanceHistoryGroup = {
  key: string;
  attendanceDate: string;
  dayName: string;
  subjectId: string;
  subjectName: string;
  startTime: string;
  endTime: string;
  sessionName: string;
  materialTopic: string;
  teacherArrivalTime: string;
  teacherDepartureTime: string;
  rows: AttendanceRow[];
  totalStudents: number;
  hadir: number;
  izin: number;
  alpa: number;
  tidakAdaJadwal: number;
};

const ACADEMIC_YEAR = "2026/2027";

const understandingOptions = ["Paham", "Cukup Paham", "Belum Paham"];

function normalizeAttendanceStatus(
  status?: string | null
): "Hadir" | "Izin" | "Alpa" | "Tidak Ada Jadwal" {
  const normalized = (status || "").trim().toLowerCase();

  if (normalized === "hadir") return "Hadir";
  if (normalized === "tidak hadir") return "Alpa";
  if (normalized === "sakit") return "Izin";
  if (normalized === "izin") return "Izin";
  if (normalized === "alpa") return "Alpa";
  if (normalized === "alpha") return "Alpa";

  if (
    normalized === "tidak ada jadwal" ||
    normalized === "tidak dijadwalkan" ||
    normalized === "no schedule"
  ) {
    return "Tidak Ada Jadwal";
  }

  return "Tidak Ada Jadwal";
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

  const cleanLevel = normalizeLevel(level);
  const cleanGrade = grade || "";

  if (cleanLevel !== "-" && cleanGrade) {
    return `${cleanLevel} ${cleanGrade}`;
  }

  if (cleanLevel !== "-") return cleanLevel;
  if (cleanGrade) return cleanGrade;

  return "-";
}

function formatTeacherSubject(subjects: TeacherRow["subjects"]) {
  if (!subjects) return "Guru";

  if (Array.isArray(subjects)) {
    return `Guru Mapel — ${subjects.slice(0, 4).join(", ")}`;
  }

  return `Guru Mapel — ${subjects}`;
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

function normalizeDatabaseTime(value?: string | null) {
  if (!value) return "";

  return value.slice(0, 5);
}

function getDayNameFromDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
  }).format(date);
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
  const duration = minutes || calculateDurationMinutes(startTime, endTime);

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

function formatSessionValue(
  minutes?: number | null,
  startTime?: string | null,
  endTime?: string | null
) {
  const duration = minutes || calculateDurationMinutes(startTime, endTime);

  if (!duration) return "-";

  let sessionValue: number;

  if (duration === 60) {
    sessionValue = 0.75;
  } else if (duration === 90) {
    sessionValue = 1;
  } else {
    sessionValue = duration / 90;
  }

  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(sessionValue);
}

function getGradeNumber(value?: string | null) {
  const match = (value || "").match(/\d+/);

  return match ? Number(match[0]) : 999;
}

function getAttendanceNote(row?: AttendanceRow | null) {
  return row?.note || row?.notes || "";
}

function isHadir(status: string) {
  return status === "Hadir";
}

function isIzin(status: string) {
  return status === "Izin";
}

function isAlpa(status: string) {
  return status === "Alpa";
}

function isTidakAdaJadwal(status: string) {
  return status === "Tidak Ada Jadwal";
}

function getSubjectLabel(subject?: SubjectRow | null) {
  if (!subject) return "-";

  const level = subject.level ? normalizeLevel(subject.level) : "";
  const grade = subject.grade || "";

  if (level && grade) {
    return `${subject.name || "-"} — ${level} ${grade}`;
  }

  if (grade) {
    return `${subject.name || "-"} — ${grade}`;
  }

  if (level) {
    return `${subject.name || "-"} — ${level}`;
  }

  return subject.name || "-";
}

function getValidLevelByGrade(grade?: string | null) {
  const gradeNumber = getGradeNumber(grade);

  if (gradeNumber >= 1 && gradeNumber <= 6) return "SD";
  if (gradeNumber >= 7 && gradeNumber <= 9) return "SMP";
  if (gradeNumber >= 10 && gradeNumber <= 12) return "SMA";

  return "";
}

function getClassKey(student: StudentRow) {
  const gradeNumber = getGradeNumber(student.grade);
  const validLevel = getValidLevelByGrade(student.grade);

  if (!validLevel || gradeNumber === 999) return "";

  return `${validLevel} ${gradeNumber}`;
}

function normalizeClassInput(value?: string | null) {
  return normalizeText(value)
    .replace(/\bkelas\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesClassInput(student: StudentRow, classInput: string) {
  const input = normalizeClassInput(classInput);

  if (!input) return false;

  const studentGradeNumber = getGradeNumber(student.grade);
  const validClass = normalizeClassInput(getClassKey(student));

  if (studentGradeNumber === 999 || !validClass) return false;

  if (/^\d+$/.test(input)) {
    return studentGradeNumber === Number(input);
  }

  return validClass === input;
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export default function TeacherAbsensiPage() {
  const [teacher, setTeacher] = useState<TeacherRow | null>(null);

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [studentTeachers, setStudentTeachers] = useState<StudentTeacherRow[]>(
    []
  );
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [selectedHistory, setSelectedHistory] =
    useState<AttendanceHistoryGroup | null>(null);

  const [editingHistory, setEditingHistory] =
    useState<AttendanceHistoryGroup | null>(null);

  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState(todayYMD());
  const [classFilter, setClassFilter] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const [teacherArrivalTime, setTeacherArrivalTime] = useState("");
  const [teacherDepartureTime, setTeacherDepartureTime] = useState("");

  const [studentStartTime, setStudentStartTime] = useState("");
  const [studentEndTime, setStudentEndTime] = useState("");

  const [materialTopic, setMaterialTopic] = useState("");
  const [attendanceNote, setAttendanceNote] = useState("");

  const [attendanceStudents, setAttendanceStudents] = useState<
    AttendanceStudent[]
  >([]);

  const studentDurationMinutes = useMemo(() => {
    return calculateDurationMinutes(studentStartTime, studentEndTime);
  }, [studentStartTime, studentEndTime]);

  const sessionValue = useMemo(() => {
    return formatSessionValue(
      studentDurationMinutes,
      studentStartTime,
      studentEndTime
    );
  }, [studentDurationMinutes, studentStartTime, studentEndTime]);

  async function getCurrentTeacher() {
    const { data: authData, error: authError } = await supabase.auth.getUser();

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
        .select("*")
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
        .select("*")
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
        setStudents([]);
        setSubjects([]);
        setStudentTeachers([]);
        setAttendance([]);
        setAttendanceStudents([]);

        setErrorMessage(
          "Data guru belum terhubung dengan akun login ini. Hubungkan email guru di tabel teachers atau isi teacher_code."
        );

        return;
      }

      const [relationsRes, attendanceRes] = await Promise.all([
        supabase
          .from("student_teachers")
          .select("*")
          .eq("teacher_id", currentTeacher.id)
          .eq("academic_year", ACADEMIC_YEAR),

        supabase
          .from("attendance")
          .select("*")
          .eq("teacher_id", currentTeacher.id),
      ]);

      if (relationsRes.error) {
        throw new Error(relationsRes.error.message);
      }

      if (attendanceRes.error) {
        throw new Error(attendanceRes.error.message);
      }

      const relationsData = (relationsRes.data || []) as StudentTeacherRow[];

      const attendanceData = (attendanceRes.data || []) as AttendanceRow[];

      const studentIds = uniqueStrings(
        relationsData
          .map((relation) => relation.student_id || "")
          .filter(Boolean)
      );

      const subjectIds = uniqueStrings(
        relationsData
          .map((relation) => relation.subject_id || "")
          .filter(Boolean)
      );

      let studentsData: StudentRow[] = [];
      let subjectsData: SubjectRow[] = [];

      if (studentIds.length > 0) {
        const { data, error } = await supabase
          .from("students")
          .select("*")
          .in("id", studentIds)
          .order("full_name");

        if (error) {
          throw new Error(error.message);
        }

        studentsData = (data || []) as StudentRow[];
      }

      if (subjectIds.length > 0) {
        const { data, error } = await supabase
          .from("subjects")
          .select("*")
          .in("id", subjectIds)
          .order("name");

        if (error) {
          throw new Error(error.message);
        }

        subjectsData = (data || []) as SubjectRow[];
      }

      setStudents(studentsData);
      setSubjects(subjectsData);
      setStudentTeachers(relationsData);
      setAttendance(attendanceData);

      if (subjectId && !subjectIds.includes(subjectId)) {
        setSubjectId("");
        setAttendanceStudents([]);
      }
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengambil data absensi.");
      }

      setTeacher(null);
      setStudents([]);
      setSubjects([]);
      setStudentTeachers([]);
      setAttendance([]);
      setAttendanceStudents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchData();

    const channel = supabase
      .channel("teacher-absensi-kbm-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teachers" },
        () => void fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "student_teachers" },
        () => void fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance" },
        () => void fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        () => void fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subjects" },
        () => void fetchData()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const subjectOptions = useMemo(() => {
    return [...subjects].sort((a, b) => {
      return getSubjectLabel(a).localeCompare(getSubjectLabel(b));
    });
  }, [subjects]);

  const selectedSubject = useMemo(() => {
    return subjects.find((subject) => subject.id === subjectId) || null;
  }, [subjects, subjectId]);

  const studentIdsBySelectedSubject = useMemo(() => {
    if (!subjectId) return null;

    return new Set(
      studentTeachers
        .filter((relation) => relation.subject_id === subjectId)
        .map((relation) => relation.student_id)
        .filter(Boolean) as string[]
    );
  }, [studentTeachers, subjectId]);

  const studentsAllowedBySubject = useMemo(() => {
    if (!studentIdsBySelectedSubject) return students;

    return students.filter((student) =>
      studentIdsBySelectedSubject.has(student.id)
    );
  }, [students, studentIdsBySelectedSubject]);

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
      studentsAllowedBySubject
        .map((student) => getClassKey(student))
        .filter(Boolean)
    );

    return allowedClasses.filter((className) =>
      availableClasses.has(className)
    );
  }, [studentsAllowedBySubject]);

  useEffect(() => {
    if (!classFilter.trim()) return;

    const hasMatchingClass = studentsAllowedBySubject.some((student) =>
      matchesClassInput(student, classFilter)
    );

    if (!hasMatchingClass) {
      setAttendanceStudents([]);
    }
  }, [classFilter, studentsAllowedBySubject]);

  const studentsInSelectedClass = useMemo(() => {
    if (!classFilter.trim()) return [];

    return studentsAllowedBySubject
      .filter((student) => matchesClassInput(student, classFilter))
      .sort((a, b) => {
        const gradeA = getGradeNumber(a.grade);
        const gradeB = getGradeNumber(b.grade);

        if (gradeA !== gradeB) return gradeA - gradeB;

        return (a.full_name || "").localeCompare(b.full_name || "");
      });
  }, [studentsAllowedBySubject, classFilter]);

  const filteredStudents = useMemo(() => {
    const q = normalizeText(search);

    return studentsInSelectedClass.filter((student) => {
      return (
        !q ||
        normalizeText(student.full_name).includes(q) ||
        normalizeText(student.nis).includes(q) ||
        normalizeText(student.nisn).includes(q) ||
        normalizeText(student.grade).includes(q) ||
        normalizeText(student.level).includes(q)
      );
    });
  }, [studentsInSelectedClass, search]);

  const existingAttendanceByStudent = useMemo(() => {
    const map = new Map<string, AttendanceRow>();

    attendance.forEach((item) => {
      if (
        item.student_id &&
        item.teacher_id === teacher?.id &&
        item.subject_id === subjectId &&
        item.attendance_date === dateFilter &&
        normalizeDatabaseTime(item.start_time) === studentStartTime &&
        normalizeDatabaseTime(item.end_time) === studentEndTime
      ) {
        map.set(item.student_id, item);
      }
    });

    return map;
  }, [
    attendance,
    teacher?.id,
    subjectId,
    dateFilter,
    studentStartTime,
    studentEndTime,
  ]);

  const attendanceHistory = useMemo<AttendanceHistoryGroup[]>(() => {
    const studentMap = new Map(
      students.map((student) => [student.id, student])
    );

    const subjectMap = new Map(
      subjects.map((subject) => [subject.id, subject])
    );

    const groupMap = new Map<string, AttendanceRow[]>();

    attendance.forEach((item) => {
      const key = [
        item.attendance_date || "",
        item.subject_id || "",
        normalizeDatabaseTime(item.start_time),
        normalizeDatabaseTime(item.end_time),
        item.material_topic || "",
      ].join("__");

      const current = groupMap.get(key) || [];
      current.push(item);
      groupMap.set(key, current);
    });

    return Array.from(groupMap.entries())
      .map(([key, rows]) => {
        const first = rows[0];
        const subject = first.subject_id
          ? subjectMap.get(first.subject_id)
          : null;

        const hadir = rows.filter(
          (item) => normalizeAttendanceStatus(item.attendance_status) === "Hadir"
        ).length;

        const izin = rows.filter(
          (item) => normalizeAttendanceStatus(item.attendance_status) === "Izin"
        ).length;

        const alpa = rows.filter(
          (item) => normalizeAttendanceStatus(item.attendance_status) === "Alpa"
        ).length;

        const tidakAdaJadwal = rows.filter(
          (item) =>
            normalizeAttendanceStatus(item.attendance_status) ===
            "Tidak Ada Jadwal"
        ).length;

        const classNames = Array.from(
          new Set(
            rows.map((item) => {
              const student = item.student_id
                ? studentMap.get(item.student_id)
                : null;

              return student
                ? formatClass(student.level, student.grade)
                : "-";
            })
          )
        ).filter(Boolean);

        return {
          key,
          attendanceDate: first.attendance_date || "",
          dayName:
            first.day_name || getDayNameFromDate(first.attendance_date),
          subjectId: first.subject_id || "",
          subjectName: `${getSubjectLabel(subject)}${
            classNames.length > 0 ? ` • ${classNames.join(", ")}` : ""
          }`,
          startTime: normalizeDatabaseTime(first.start_time),
          endTime: normalizeDatabaseTime(first.end_time),
          sessionName:
            first.session_name ||
            formatSessionValue(
              first.duration_minutes,
              first.start_time,
              first.end_time
            ),
          materialTopic: first.material_topic || "-",
          teacherArrivalTime: normalizeDatabaseTime(
            first.teacher_arrival_time
          ),
          teacherDepartureTime: normalizeDatabaseTime(
            first.teacher_departure_time
          ),
          rows: [...rows].sort((a, b) => {
            const studentA = a.student_id
              ? studentMap.get(a.student_id)?.full_name || ""
              : "";

            const studentB = b.student_id
              ? studentMap.get(b.student_id)?.full_name || ""
              : "";

            return studentA.localeCompare(studentB);
          }),
          totalStudents: rows.length,
          hadir,
          izin,
          alpa,
          tidakAdaJadwal,
        };
      })
      .sort((a, b) => {
        const dateCompare = b.attendanceDate.localeCompare(a.attendanceDate);

        if (dateCompare !== 0) return dateCompare;

        return b.startTime.localeCompare(a.startTime);
      });
  }, [attendance, students, subjects]);

  const summary = useMemo(() => {
    const selectedDateAttendance = attendance.filter(
      (item) => item.attendance_date === dateFilter
    );

    const present = attendanceStudents.filter((student) =>
      isHadir(student.attendanceStatus)
    ).length;

    const absent = attendanceStudents.filter(
      (student) =>
        isIzin(student.attendanceStatus) ||
        isAlpa(student.attendanceStatus)
    ).length;

    return {
      totalStudents: studentsInSelectedClass.length,
      attendanceToday: selectedDateAttendance.length,
      present,
      absent,
    };
  }, [
    attendance,
    dateFilter,
    attendanceStudents,
    studentsInSelectedClass.length,
  ]);

  function resetAttendanceInput() {
    setAttendanceStudents([]);
  }

  useEffect(() => {
    if (
      !teacher?.id ||
      !subjectId ||
      !classFilter.trim() ||
      !dateFilter ||
      !studentStartTime ||
      !studentEndTime
    ) {
      setAttendanceStudents([]);
      return;
    }

    if (!studentDurationMinutes || studentsInSelectedClass.length === 0) {
      setAttendanceStudents([]);
      return;
    }

    const firstExistingAttendance =
      existingAttendanceByStudent.values().next().value as
        | AttendanceRow
        | undefined;

    if (firstExistingAttendance) {
      if (firstExistingAttendance.teacher_arrival_time) {
        setTeacherArrivalTime(
          normalizeDatabaseTime(
            firstExistingAttendance.teacher_arrival_time
          )
        );
      }

      if (firstExistingAttendance.teacher_departure_time) {
        setTeacherDepartureTime(
          normalizeDatabaseTime(
            firstExistingAttendance.teacher_departure_time
          )
        );
      }

      if (firstExistingAttendance.material_topic) {
        setMaterialTopic(firstExistingAttendance.material_topic);
      }

      if (
        firstExistingAttendance.note ||
        firstExistingAttendance.notes
      ) {
        setAttendanceNote(
          firstExistingAttendance.note ||
            firstExistingAttendance.notes ||
            ""
        );
      }
    }

    const nextStudents: AttendanceStudent[] =
      studentsInSelectedClass.map((student) => {
        const existing =
          existingAttendanceByStudent.get(student.id);

        const existingStatus = existing
          ? normalizeAttendanceStatus(existing.attendance_status)
          : "Tidak Ada Jadwal";

        return {
          ...student,

          attendanceStatus: existingStatus,

          understandingStatus:
            existingStatus === "Hadir"
              ? existing?.understanding_status || "Paham"
              : "-",

          note: existing
            ? getAttendanceNote(existing)
            : "Tidak ada jadwal hari ini",
        };
      });

    setAttendanceStudents(nextStudents);
  }, [
    teacher?.id,
    subjectId,
    classFilter,
    dateFilter,
    studentStartTime,
    studentEndTime,
    studentDurationMinutes,
    studentsInSelectedClass,
    existingAttendanceByStudent,
  ]);

  function updateStudentAttendance(
    studentId: string,
    field:
      | "attendanceStatus"
      | "understandingStatus"
      | "note",
    value: string
  ) {
    setAttendanceStudents((previous) =>
      previous.map((student) => {
        if (student.id !== studentId) return student;

        const next = {
          ...student,
          [field]: value,
        };

        if (
          field === "attendanceStatus" &&
          value === "Hadir"
        ) {
          next.note = "";
          next.understandingStatus = "Paham";
        }

        if (
          field === "attendanceStatus" &&
          value !== "Hadir"
        ) {
          next.understandingStatus = "-";
        }

        if (
          field === "attendanceStatus" &&
          value === "Tidak Ada Jadwal" &&
          !next.note.trim()
        ) {
          next.note = "Tidak ada jadwal hari ini";
        }

        return next;
      })
    );
  }

  function markAllPresent() {
    if (attendanceStudents.length === 0) {
      alert("Pilih mapel, kelas, dan jam KBM terlebih dahulu.");
      return;
    }

    setAttendanceStudents((previous) =>
      previous.map((student) => ({
        ...student,
        attendanceStatus: "Hadir",
        understandingStatus: "Paham",
        note: "",
      }))
    );
  }

  function handleEditAttendance(history: AttendanceHistoryGroup) {
    const firstStudent = history.rows
      .map((row) =>
        students.find((student) => student.id === row.student_id)
      )
      .find(Boolean);

    const className = firstStudent
      ? formatClass(firstStudent.level, firstStudent.grade)
      : "";

    setEditingHistory(history);
    setSelectedHistory(null);
    setSuccessMessage("");

    setDateFilter(history.attendanceDate);
    setSubjectId(history.subjectId);
    setClassFilter(className === "-" ? "" : className);

    setTeacherArrivalTime(history.teacherArrivalTime);
    setTeacherDepartureTime(history.teacherDepartureTime);
    setStudentStartTime(history.startTime);
    setStudentEndTime(history.endTime);
    setMaterialTopic(
      history.materialTopic === "-" ? "" : history.materialTopic
    );
    setAttendanceNote("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelEditAttendance() {
    setEditingHistory(null);
    setSuccessMessage("");
    setAttendanceStudents([]);
  }

  function validateBeforeSave() {
    if (!teacher?.id) {
      alert("Data guru tidak ditemukan.");
      return false;
    }

    if (!subjectId) {
      alert("Pilih mata pelajaran terlebih dahulu.");
      return false;
    }

    if (!dateFilter) {
      alert("Pilih tanggal absensi terlebih dahulu.");
      return false;
    }

    if (dateFilter > todayYMD()) {
      alert("Tanggal absensi tidak boleh melebihi hari ini.");
      return false;
    }

    if (!teacherArrivalTime) {
      alert("Isi jam datang guru terlebih dahulu.");
      return false;
    }

    if (!teacherDepartureTime) {
      alert("Isi jam pulang guru terlebih dahulu.");
      return false;
    }

    const teacherDuration = calculateDurationMinutes(
      teacherArrivalTime,
      teacherDepartureTime
    );

    if (!teacherDuration) {
      alert(
        "Jam pulang guru harus lebih besar dari jam datang guru."
      );
      return false;
    }

    if (!studentStartTime || !studentEndTime) {
      alert(
        "Isi jam mulai dan jam selesai KBM siswa terlebih dahulu."
      );
      return false;
    }

    if (!studentDurationMinutes) {
      alert(
        "Jam selesai KBM siswa harus lebih besar dari jam mulai."
      );
      return false;
    }

    if (!materialTopic.trim()) {
      alert("Isi materi pembelajaran terlebih dahulu.");
      return false;
    }

    if (attendanceStudents.length === 0) {
      alert(
        "Pilih kelas yang memiliki siswa terlebih dahulu."
      );
      return false;
    }

    const missingNote = attendanceStudents.find((student) => {
      return (
        student.attendanceStatus !== "Hadir" &&
        !student.note.trim()
      );
    });

    if (missingNote) {
      alert(
        `Keterangan wajib diisi untuk siswa yang tidak hadir: ${missingNote.full_name}`
      );

      return false;
    }

    return true;
  }

  async function handleSaveAttendance() {
    if (!validateBeforeSave()) return;

    setSuccessMessage("");

    if (!teacher?.id) return;

    setSaving(true);

    try {
      const now = new Date().toISOString();
      const dayName = getDayNameFromDate(dateFilter);

      const deleteSubjectId =
        editingHistory?.subjectId || subjectId;

      const deleteDate =
        editingHistory?.attendanceDate || dateFilter;

      const deleteStartTime =
        editingHistory?.startTime || studentStartTime;

      const deleteEndTime =
        editingHistory?.endTime || studentEndTime;

      const deleteQuery = supabase
        .from("attendance")
        .delete()
        .eq("teacher_id", teacher.id)
        .eq("subject_id", deleteSubjectId)
        .eq("attendance_date", deleteDate)
        .eq("start_time", deleteStartTime)
        .eq("end_time", deleteEndTime);

      const { error: deleteAttendanceError } =
        await deleteQuery;

      if (deleteAttendanceError) {
        throw new Error(deleteAttendanceError.message);
      }

      const attendancePayload = attendanceStudents.map(
        (student) => ({
          teacher_id: teacher.id,
          student_id: student.id,
          subject_id: subjectId,

          attendance_date: dateFilter,
          day_name: dayName,

          teacher_arrival_time: teacherArrivalTime,
          teacher_departure_time: teacherDepartureTime,

          start_time: studentStartTime,
          end_time: studentEndTime,

          duration_minutes: studentDurationMinutes,
          session_name:
            sessionValue === "-" ? null : sessionValue,

          attendance_status: student.attendanceStatus,

          understanding_status:
            student.attendanceStatus === "Hadir"
              ? student.understandingStatus
              : "-",

          material_topic: materialTopic.trim(),

          note:
            student.note.trim() ||
            attendanceNote.trim() ||
            null,

          notes:
            student.note.trim() ||
            attendanceNote.trim() ||
            null,

          created_at: now,
          updated_at: now,
        })
      );

      const { error: insertAttendanceError } =
        await supabase
          .from("attendance")
          .insert(attendancePayload);

      if (insertAttendanceError) {
        throw new Error(insertAttendanceError.message);
      }

      // Simpan satu rekap kehadiran guru per tanggal.
      // Data jam datang/pulang tetap diambil dari form absensi KBM yang sudah digunakan guru.
      const { data: existingTeacherAttendance, error: findTeacherAttendanceError } =
        await supabase
          .from("teacher_attendance")
          .select("id")
          .eq("teacher_id", teacher.id)
          .eq("attendance_date", dateFilter)
          .maybeSingle();

      if (findTeacherAttendanceError) {
        throw new Error(
          `Absensi KBM siswa tersimpan, tetapi gagal memeriksa absensi guru: ${findTeacherAttendanceError.message}`
        );
      }

      const teacherAttendancePayload = {
        teacher_id: teacher.id,
        attendance_date: dateFilter,
        arrival_time: teacherArrivalTime,
        departure_time: teacherDepartureTime,
        status: "Hadir",
        notes: attendanceNote.trim() || null,
        updated_at: now,
      };

      if (existingTeacherAttendance?.id) {
        const { error: updateTeacherAttendanceError } = await supabase
          .from("teacher_attendance")
          .update(teacherAttendancePayload)
          .eq("id", existingTeacherAttendance.id);

        if (updateTeacherAttendanceError) {
          throw new Error(
            `Absensi KBM siswa tersimpan, tetapi gagal memperbarui absensi guru: ${updateTeacherAttendanceError.message}`
          );
        }
      } else {
        const { error: insertTeacherAttendanceError } = await supabase
          .from("teacher_attendance")
          .insert({
            ...teacherAttendancePayload,
            created_at: now,
          });

        if (insertTeacherAttendanceError) {
          throw new Error(
            `Absensi KBM siswa tersimpan, tetapi gagal menyimpan absensi guru: ${insertTeacherAttendanceError.message}`
          );
        }
      }

      await fetchData();

      const wasEditing = Boolean(editingHistory);

      setSuccessMessage(
        `Absensi ${getSubjectLabel(
          selectedSubject
        )} tanggal ${formatDate(
          dateFilter
        )} berhasil ${
          wasEditing ? "diperbarui" : "disimpan"
        }.`
      );

      setEditingHistory(null);
    } catch (error) {
      alert(
        `Gagal simpan absensi: ${
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan"
        }`
      );
    } finally {
      setSaving(false);
    }
  }

  function excelDateToYMD(value: unknown): string {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, "0");
      const day = String(value.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (parsed) {
        return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
      }
    }

    const raw = String(value ?? "").trim();
    if (!raw) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

    const match = raw.match(/^(?:.*?,\s*)?(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
    if (match) {
      // Format tanggal Indonesia: DD/MM/YYYY.
      const year = match[3].length === 2 ? `20${match[3]}` : match[3];
      return `${year}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
    }

    const parsedDate = new Date(raw);
    if (!Number.isNaN(parsedDate.getTime())) {
      return `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, "0")}-${String(parsedDate.getDate()).padStart(2, "0")}`;
    }
    return "";
  }

  function normalizeImportTime(value: unknown): string | null {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "number" && Number.isFinite(value)) {
      const totalMinutes = Math.round(value * 24 * 60);
      const hours = Math.floor(totalMinutes / 60) % 24;
      const minutes = totalMinutes % 60;
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
    }
    const raw = String(value).trim();
    const match = raw.match(/^(\d{1,2})[:.](\d{2})(?::(\d{2}))?$/);
    if (!match) return null;
    return `${match[1].padStart(2, "0")}:${match[2]}:${match[3] || "00"}`;
  }

  function normalizeImportHeader(value: unknown) {
    return String(value ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function findImportColumn(headers: string[], aliases: string[]) {
    return headers.findIndex((header) =>
      aliases.some((alias) => header === alias || header.includes(alias))
    );
  }

  function isMarked(value: unknown) {
    const text = String(value ?? "").trim().toLowerCase();
    return ["v", "✓", "✔", "1", "ya", "yes", "online", "offline"].includes(text);
  }

  function parseImportScore(value: unknown): number | null {
    if (value === null || value === undefined || String(value).trim() === "") return null;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const parsed = Number(String(value).replace(",", ".").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }

  async function handleImportTeacherAttendance(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!teacher?.id) {
      alert("Data guru pada akun yang sedang login tidak ditemukan.");
      return;
    }

    setImporting(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) throw new Error("File Excel tidak memiliki sheet.");

      const sheet = workbook.Sheets[firstSheetName];
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: "",
        raw: true,
        blankrows: false,
      });
      if (matrix.length < 2) throw new Error("Sheet belum berisi header dan data KBM.");

      // Template memiliki header bertingkat: Jadwal > masuk/selesai dan Sesi > Hadir/Tidak hadir/Online/Offline.
      const headerIndex = matrix.findIndex((row) => {
        const joined = row.map(normalizeImportHeader).join(" ");
        return joined.includes("hari tanggal") && joined.includes("nama siswa");
      });
      if (headerIndex < 0) {
        throw new Error('Header tidak dikenali. Pastikan terdapat kolom "Hari/Tanggal" dan "Nama Siswa" seperti template KBM.');
      }

      const headerRow1 = matrix[headerIndex] || [];
      const headerRow2 = matrix[headerIndex + 1] || [];
      const columnCount = Math.max(headerRow1.length, headerRow2.length);
      const headers = Array.from({ length: columnCount }, (_, index) =>
        `${normalizeImportHeader(headerRow1[index])} ${normalizeImportHeader(headerRow2[index])}`.trim()
      );

      const columns = {
        date: findImportColumn(headers, ["hari tanggal", "tanggal"]),
        className: findImportColumn(headers, ["kelas"]),
        student: findImportColumn(headers, ["nama siswa"]),
        start: findImportColumn(headers, ["jadwal masuk", "jam masuk", "masuk"]),
        end: findImportColumn(headers, ["jadwal selesai", "jam selesai", "selesai"]),
        subject: findImportColumn(headers, ["mapel", "mata pelajaran"]),
        material: findImportColumn(headers, ["materi yang diajarkan", "materi"]),
        present: findImportColumn(headers, ["sesi hadir", "hadir"]),
        absent: findImportColumn(headers, ["sesi tidak hadir", "tidak hadir"]),
        online: findImportColumn(headers, ["sesi online", "online"]),
        offline: findImportColumn(headers, ["sesi offline", "offline"]),
        problem: findImportColumn(headers, ["permasalahan", "masalah"]),
        consequence: findImportColumn(headers, ["akibat"]),
        solution: findImportColumn(headers, ["solusi"]),
      };

      const required = ["date", "className", "student", "start", "end", "subject", "material"] as const;
      const missing = required.filter((key) => columns[key] < 0);
      if (missing.length) {
        throw new Error(`Kolom wajib belum ditemukan: ${missing.join(", ")}. Periksa kembali format header Excel.`);
      }

      const studentByName = new Map<string, StudentRow[]>();
      students.forEach((student) => {
        const key = normalizeText(student.full_name);
        if (!key) return;
        studentByName.set(key, [...(studentByName.get(key) || []), student]);
      });
      const subjectByName = new Map<string, SubjectRow[]>();
      subjects.forEach((subject) => {
        const key = normalizeText(subject.name);
        if (!key) return;
        subjectByName.set(key, [...(subjectByName.get(key) || []), subject]);
      });

      const errors: string[] = [];
      const payloadByKey = new Map<string, Record<string, unknown>>();
      const dataStartIndex = headerIndex + 2;
      let lastAttendanceDate = "";

      for (let index = dataStartIndex; index < matrix.length; index++) {
        const row = matrix[index] || [];
        if (row.every((cell) => String(cell ?? "").trim() === "")) continue;
        const rowNumber = index + 1;
        const cell = (column: number) => column >= 0 ? row[column] : "";

        const parsedAttendanceDate = excelDateToYMD(cell(columns.date));
        if (parsedAttendanceDate) lastAttendanceDate = parsedAttendanceDate;
        const attendanceDate = parsedAttendanceDate || lastAttendanceDate;
        const classInput = String(cell(columns.className) ?? "").trim();
        const studentName = String(cell(columns.student) ?? "").trim();
        const startTime = normalizeImportTime(cell(columns.start));
        const endTime = normalizeImportTime(cell(columns.end));
        const subjectName = String(cell(columns.subject) ?? "").trim();
        const material = String(cell(columns.material) ?? "").trim();

        if (!attendanceDate && !studentName && !subjectName) continue;
        if (!attendanceDate || !studentName || !classInput || !startTime || !endTime || !subjectName || !material) {
          errors.push(`Baris ${rowNumber}: tanggal, kelas, nama siswa, jadwal, mapel, atau materi belum lengkap.`);
          continue;
        }

        const matchedStudents = studentByName.get(normalizeText(studentName)) || [];
        const matchedStudent = matchedStudents.find((student) => matchesClassInput(student, classInput));
        if (!matchedStudent) {
          errors.push(`Baris ${rowNumber}: siswa "${studentName}" kelas "${classInput}" tidak ditemukan pada daftar siswa yang terhubung ke akun guru ini.`);
          continue;
        }

        const matchedSubjects = subjectByName.get(normalizeText(subjectName)) || [];
        const matchedSubject = matchedSubjects.find((subject) =>
          studentTeachers.some((relation) => relation.student_id === matchedStudent.id && relation.subject_id === subject.id && relation.teacher_id === teacher.id)
        );
        if (!matchedSubject) {
          errors.push(`Baris ${rowNumber}: mapel "${subjectName}" tidak ditemukan/ tidak terhubung dengan siswa ${studentName}.`);
          continue;
        }

        const presentRaw = cell(columns.present);
        const absentRaw = cell(columns.absent);
        const score = parseImportScore(presentRaw);
        const absentText = String(absentRaw ?? "").trim();
        const presentMarked = score !== null ? score > 0 : isMarked(presentRaw);
        const attendanceStatus = presentMarked ? "Hadir" : absentText ? "Alpa" : "Tidak Ada Jadwal";
        const durationMinutes = calculateDurationMinutes(startTime, endTime);
        const online = isMarked(cell(columns.online));
        const offline = isMarked(cell(columns.offline));
        const problem = String(cell(columns.problem) ?? "").trim() || null;
        const consequence = String(cell(columns.consequence) ?? "").trim() || null;
        const solution = String(cell(columns.solution) ?? "").trim() || null;
        const dayName = getDayNameFromDate(attendanceDate);

        const key = [attendanceDate, matchedStudent.id, matchedSubject.id, startTime, endTime, material].join("__");
        payloadByKey.set(key, {
          teacher_id: teacher.id,
          student_id: matchedStudent.id,
          subject_id: matchedSubject.id,
          attendance_date: attendanceDate,
          day_name: dayName,
          start_time: startTime,
          end_time: endTime,
          duration_minutes: durationMinutes,
          session_name: durationMinutes ? formatSessionValue(durationMinutes, startTime, endTime) : null,
          attendance_status: attendanceStatus,
          understanding_status: presentMarked ? "Paham" : "-",
          material_topic: material,
          attendance_score: score,
          is_online: online,
          is_offline: offline,
          problem,
          consequence,
          solution,
          note: [problem, consequence, solution].filter(Boolean).join(" | ") || null,
          notes: [problem, consequence, solution].filter(Boolean).join(" | ") || null,
          updated_at: new Date().toISOString(),
        });
      }

      const importRows = Array.from(payloadByKey.values());
      if (!importRows.length) {
        throw new Error(errors.length ? errors.slice(0, 10).join("\n") : "Tidak ada baris valid untuk diimpor.");
      }

      let inserted = 0;
      let updated = 0;
      for (const payload of importRows) {
        let query = supabase.from("attendance").select("id")
          .eq("teacher_id", teacher.id)
          .eq("student_id", String(payload.student_id))
          .eq("subject_id", String(payload.subject_id))
          .eq("attendance_date", String(payload.attendance_date))
          .eq("start_time", String(payload.start_time))
          .eq("end_time", String(payload.end_time));
        const { data: existing, error: findError } = await query.maybeSingle();
        if (findError) throw new Error(`Gagal memeriksa data tanggal ${payload.attendance_date}: ${findError.message}`);

        if (existing?.id) {
          const { error } = await supabase.from("attendance").update(payload).eq("id", existing.id);
          if (error) throw new Error(`Gagal memperbarui data KBM: ${error.message}`);
          updated++;
        } else {
          const { error } = await supabase.from("attendance").insert({ ...payload, created_at: new Date().toISOString() });
          if (error) throw new Error(`Gagal menyimpan data KBM: ${error.message}`);
          inserted++;
        }
      }

      await fetchData();
      setSuccessMessage(`Import KBM selesai: ${inserted} data baru dan ${updated} data diperbarui. Data yang diproses milik akun ${teacher.full_name || "guru"}.`);
      if (errors.length) alert(`Sebagian baris dilewati:\n${errors.slice(0, 12).join("\n")}${errors.length > 12 ? `\n...dan ${errors.length - 12} baris lainnya.` : ""}`);
    } catch (error) {
      alert(`Import KBM gagal: ${error instanceof Error ? error.message : "Terjadi kesalahan saat membaca file."}`);
    } finally {
      setImporting(false);
    }
  }

  function downloadTeacherAttendanceTemplate() {
    const rows = [
      ["Hari/Tanggal", "Kelas", "Nama Siswa", "Jadwal Masuk", "Jadwal Selesai", "MAPEL", "Materi yang diajarkan", "Hadir", "Tidak hadir", "Online", "Offline", "Permasalahan", "Akibat", "Solusi"],
      ["Senin, 13/11/2026", "4", "Nama Siswa", "07:30", "09:00", "IPAS", "Materi pembelajaran", "1", "", "", "V", "", "", ""],
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet["!cols"] = [
      { wch: 22 }, { wch: 12 }, { wch: 24 }, { wch: 15 }, { wch: 15 },
      { wch: 18 }, { wch: 30 }, { wch: 12 }, { wch: 14 }, { wch: 10 },
      { wch: 10 }, { wch: 28 }, { wch: 24 }, { wch: 24 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan KBM Siswa");
    XLSX.writeFile(workbook, "Template_Import_Laporan_KBM.xlsx");
  }

  function exportAttendanceToExcel() {
    if (attendanceHistory.length === 0) {
      alert("Belum ada riwayat absensi yang dapat diekspor.");
      return;
    }

    const studentMap = new Map(
      students.map((student) => [student.id, student])
    );
    const subjectMap = new Map(
      subjects.map((subject) => [subject.id, subject])
    );

    // Mata pelajaran dan kelas dibuat terpisah agar mudah difilter di Excel.
    const headers = [
      "No",
      "Nama Guru",
      "Hari",
      "Tanggal",
      "Mata Pelajaran",
      "Kelas",
      "Jam Datang Guru",
      "Jam Pulang Guru",
      "Jam Mulai KBM",
      "Jam Selesai KBM",
      "Sesi",
      "Materi",
      "Nama Siswa",
      "Status Kehadiran",
      "Pemahaman",
      "Catatan",
    ];

    const escapeCell = (value: unknown) => {
      const text = String(value ?? "").replace(/\r?\n/g, " ");
      return `"${text.replace(/"/g, '""')}"`;
    };

    const rows: string[][] = [];
    let number = 1;

    attendanceHistory.forEach((group) => {
      group.rows.forEach((row) => {
        const student = row.student_id
          ? studentMap.get(row.student_id)
          : null;

        const subject = group.subjectId
          ? subjectMap.get(group.subjectId)
          : null;

        rows.push([
          String(number++),
          teacher?.full_name || "Guru",
          group.dayName,
          group.attendanceDate,
          subject?.name || group.subjectName || "-",
          student ? formatClass(student.level, student.grade) : "-",
          group.teacherArrivalTime || "-",
          group.teacherDepartureTime || "-",
          group.startTime || "-",
          group.endTime || "-",
          group.sessionName || "-",
          group.materialTopic || "-",
          student?.full_name || "Nama siswa tidak ditemukan",
          normalizeAttendanceStatus(row.attendance_status),
          row.understanding_status || "-",
          row.note || row.notes || "-",
        ]);
      });
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map(escapeCell).join(";"))
      .join("\r\n");
    const blob = new Blob(["\uFEFF", csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeTeacherName = (teacher?.full_name || "guru")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    link.href = url;
    link.download = `absensi-${safeTeacherName || "guru"}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <TeacherLayout
      activeMenu="Absensi KBM"
      teacherName={teacher?.full_name || "Guru"}
      teacherSubject={formatTeacherSubject(teacher?.subjects)}
      searchPlaceholder="Cari absensi..."
    >
      <section className="space-y-7">
        <div>
          <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#8A5A48]">
            Teacher Portal
          </p>

          <h1 className="mt-2 text-[30px] font-extrabold tracking-[-0.02em] text-[#2B1B18]">
            ABSENSI KBM GURU DAN SISWA HARIAN
          </h1>

          <p className="mt-2 max-w-[950px] text-[15px] leading-6 text-[#6F5549]">
            Datang dan pulang digunakan untuk kehadiran guru.
            Jam mulai dan selesai KBM digunakan untuk waktu
            pembelajaran siswa.
          </p>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-[14px] leading-6 text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-[14px] font-bold leading-6 text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        {editingHistory ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-[14px] text-amber-900 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-extrabold">
                Mode Edit Absensi
              </p>

              <p className="mt-1 leading-6">
                Kamu sedang mengedit absensi{" "}
                {editingHistory.subjectName} tanggal{" "}
                {formatDate(editingHistory.attendanceDate)}.
                Setelah selesai, klik Simpan Perubahan.
              </p>
            </div>

            <button
              type="button"
              onClick={cancelEditAttendance}
              className="h-10 rounded-xl border border-amber-300 bg-white px-4 text-[13px] font-extrabold text-amber-900"
            >
              Batal Edit
            </button>
          </div>
        ) : null}

        {!loading && teacher && students.length === 0 ? (
          <div className="rounded-2xl border border-[#E8D6C1] bg-white px-5 py-4 text-[14px] leading-6 text-[#6F5549]">
            Belum ada siswa yang terhubung ke guru ini.
            Hubungkan siswa dengan guru dan mapel melalui menu
            Kepala Sekolah → Siswa.
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={<CalendarDays className="h-5 w-5" />}
            label="Tanggal Absensi"
            value={formatDate(dateFilter)}
            info={getDayNameFromDate(dateFilter)}
            tone="pink"
          />

          <SummaryCard
            icon={<Users className="h-5 w-5" />}
            label="Siswa di Filter"
            value={summary.totalStudents}
            info={classFilter || "Pilih Kelas"}
            tone="blue"
          />

          <SummaryCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Hadir"
            value={summary.present}
            info="Input"
            tone="green"
          />

          <SummaryCard
            icon={<ClipboardCheck className="h-5 w-5" />}
            label="Izin / Alpa"
            value={summary.absent}
            info={`${summary.attendanceToday} data tersimpan`}
            tone="orange"
          />
        </div>

        <div className="rounded-[22px] border border-[#E1CFBE] bg-white p-5 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8E6A58]" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Cari nama siswa, NIPD, NISN, kelas, atau level..."
                className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] pl-11 pr-4 text-[14px] outline-none placeholder:text-[#9A7B6C] focus:border-[#9C0824]"
              />
            </div>

            <select
              value={classFilter}
              onChange={(event) => {
                setClassFilter(event.target.value);
                resetAttendanceInput();
              }}
              disabled={!subjectId}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">
                Pilih Kelas
              </option>

              {classOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              value={subjectId}
              onChange={(event) => {
                setSubjectId(event.target.value);
                setClassFilter("");
                resetAttendanceInput();
              }}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              <option value="">
                Pilih Mapel
              </option>

              {subjectOptions.map((subject) => (
                <option
                  key={subject.id}
                  value={subject.id}
                >
                  {getSubjectLabel(subject)}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={dateFilter}
              max={todayYMD()}
              onChange={(event) => {
                const selectedDate = event.target.value;

                setDateFilter(selectedDate);
                setSuccessMessage("");
                setEditingHistory(null);
                resetAttendanceInput();
              }}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            />
          </div>

          <p className="mt-3 text-[12px] leading-5 text-[#6F5549]">
            Guru memilih mapel, kelas, dan tanggal secara
            mandiri. Tanggal sebelumnya dapat dipilih untuk
            melengkapi absensi yang belum sempat diinput.
            Daftar siswa mengikuti relasi guru, mata
            pelajaran, dan kelas yang dipilih.
          </p>
        </div>

        <div className="space-y-5">
          <div className="rounded-[22px] border border-[#E1CFBE] bg-white shadow-sm">
            <div className="border-b border-[#EADACA] px-5 py-4">
              <h2 className="text-[18px] font-extrabold text-[#2B1B18]">
                Pengaturan Absensi
              </h2>

              <p className="mt-1 text-[13px] text-[#6F5549]">
                Isi kehadiran guru dan waktu kegiatan belajar
                siswa secara terpisah.
              </p>
            </div>

            <div className="space-y-6 p-5">
              <div className="rounded-2xl border border-[#EADACA] bg-[#FFF8EF] p-5">
                <h3 className="text-[16px] font-extrabold text-[#2B1B18]">
                  Kehadiran Guru
                </h3>

                <p className="mt-1 text-[13px] text-[#6F5549]">
                  Datang dan pulang hanya digunakan sebagai
                  jam kehadiran guru.
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <FormGroup label="Datang Guru">
                    <input
                      type="time"
                      value={teacherArrivalTime}
                      onChange={(event) =>
                        setTeacherArrivalTime(
                          event.target.value
                        )
                      }
                      className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                    />
                  </FormGroup>

                  <FormGroup label="Pulang Guru">
                    <input
                      type="time"
                      value={teacherDepartureTime}
                      onChange={(event) =>
                        setTeacherDepartureTime(
                          event.target.value
                        )
                      }
                      className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                    />
                  </FormGroup>
                </div>
              </div>

              <div className="rounded-2xl border border-[#EADACA] bg-white p-5">
                <h3 className="text-[16px] font-extrabold text-[#2B1B18]">
                  Waktu KBM Siswa
                </h3>

                <p className="mt-1 text-[13px] text-[#6F5549]">
                  Jam ini digunakan sebagai waktu mulai dan
                  selesai pembelajaran siswa.
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <FormGroup label="Jam Mulai Siswa">
                    <input
                      type="time"
                      value={studentStartTime}
                      onChange={(event) => {
                        setStudentStartTime(
                          event.target.value
                        );
                        resetAttendanceInput();
                      }}
                      className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
                    />
                  </FormGroup>

                  <FormGroup label="Jam Selesai Siswa">
                    <input
                      type="time"
                      value={studentEndTime}
                      onChange={(event) => {
                        setStudentEndTime(
                          event.target.value
                        );
                        resetAttendanceInput();
                      }}
                      className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
                    />
                  </FormGroup>

                  <FormGroup label="Jam Siswa">
                    <input
                      value={
                        studentStartTime &&
                        studentEndTime
                          ? `${formatTime(
                              studentStartTime
                            )}-${formatTime(
                              studentEndTime
                            )}`
                          : "-"
                      }
                      readOnly
                      className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-[#FFF8EF] px-4 text-[14px] font-bold text-[#8C0F2D] outline-none"
                    />
                  </FormGroup>

                  <FormGroup label="Sesi">
                    <input
                      value={sessionValue}
                      readOnly
                      className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-[#FFF8EF] px-4 text-[14px] font-bold text-[#8C0F2D] outline-none"
                    />
                  </FormGroup>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <FormGroup label="Durasi KBM Siswa">
                    <input
                      value={formatDuration(
                        studentDurationMinutes,
                        studentStartTime,
                        studentEndTime
                      )}
                      readOnly
                      className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-[#FFF8EF] px-4 text-[14px] font-bold text-[#8C0F2D] outline-none"
                    />
                  </FormGroup>

                  <FormGroup label="Materi">
                    <input
                      value={materialTopic}
                      onChange={(event) =>
                        setMaterialTopic(
                          event.target.value
                        )
                      }
                      placeholder="Contoh: Pecahan Senilai"
                      className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none placeholder:text-[#9A7B6C] focus:border-[#9C0824]"
                    />
                  </FormGroup>
                </div>
              </div>

              <FormGroup label="Keterangan Umum">
                <textarea
                  value={attendanceNote}
                  onChange={(event) =>
                    setAttendanceNote(event.target.value)
                  }
                  rows={3}
                  placeholder="Contoh: Absensi kelas pengganti / catatan KBM"
                  className="w-full resize-none rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 py-3 text-[14px] outline-none placeholder:text-[#9A7B6C] focus:border-[#9C0824]"
                />
              </FormGroup>

              <div className="rounded-2xl border border-[#EADACA] bg-[#FFF8EF] px-4 py-3">
                <p className="text-[13px] font-bold text-[#6F5549]">
                  Catatan
                </p>

                <p className="mt-1 text-[13px] leading-6 text-[#6F5549]">
                  Datang dan pulang adalah kehadiran guru.
                  Sedangkan jam dan sesi merupakan waktu KBM
                  siswa.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[22px] border border-[#E1CFBE] bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-[#EADACA] px-5 py-4 md:flex-row md:items-center">
              <div>
                <h2 className="text-[18px] font-extrabold text-[#2B1B18]">
                  Input Absensi Siswa
                </h2>

                <p className="mt-1 text-[13px] text-[#6F5549]">
                  {attendanceStudents.length > 0
                    ? `${getSubjectLabel(
                        selectedSubject
                      )} • ${formatDate(dateFilter)}`
                    : "Pilih mapel, kelas, dan jam KBM siswa."}
                </p>
              </div>

              <button
                type="button"
                onClick={markAllPresent}
                disabled={
                  attendanceStudents.length === 0
                }
                className="h-10 rounded-xl border border-[#DCC8B6] px-4 text-[13px] font-extrabold text-[#8C0F2D] transition hover:bg-[#FFF8EF] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Tandai Semua Hadir
              </button>
            </div>

            {attendanceStudents.length > 0 ? (
              <div className="border-b border-[#EADACA] bg-[#FFF8EF] px-5 py-4">
                <div className="grid gap-3 text-[13px] md:grid-cols-4">
                  <InfoItem
                    label="Hari"
                    value={getDayNameFromDate(
                      dateFilter
                    )}
                  />

                  <InfoItem
                    label="Tanggal"
                    value={formatDate(dateFilter)}
                  />

                  <InfoItem
                    label="Datang Guru"
                    value={formatTime(
                      teacherArrivalTime
                    )}
                  />

                  <InfoItem
                    label="Pulang Guru"
                    value={formatTime(
                      teacherDepartureTime
                    )}
                  />

                  <InfoItem
                    label="Jam Siswa"
                    value={`${formatTime(
                      studentStartTime
                    )}-${formatTime(
                      studentEndTime
                    )}`}
                  />

                  <InfoItem
                    label="Sesi"
                    value={sessionValue}
                  />

                  <InfoItem
                    label="Materi"
                    value={materialTopic || "-"}
                  />

                  <InfoItem
                    label="Keterangan"
                    value={attendanceNote || "-"}
                  />
                </div>
              </div>
            ) : null}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1450px] border-collapse">
                <thead>
                  <tr className="border-b border-[#EADACA] bg-[#FFF8EF] text-left text-[13px] font-extrabold text-[#6F5549]">
                    <th
                      rowSpan={2}
                      className="border-r border-[#EADACA] px-5 py-4"
                    >
                      No
                    </th>

                    <th
                      rowSpan={2}
                      className="border-r border-[#EADACA] px-5 py-4"
                    >
                      Nama
                    </th>

                    <th
                      rowSpan={2}
                      className="border-r border-[#EADACA] px-5 py-4"
                    >
                      Datang Guru
                    </th>

                    <th
                      rowSpan={2}
                      className="border-r border-[#EADACA] px-5 py-4"
                    >
                      Pulang Guru
                    </th>

                    <th
                      colSpan={6}
                      className="border-r border-[#EADACA] px-5 py-4 text-center"
                    >
                      Jadwal Kegiatan Belajar Mengajar
                    </th>

                    <th
                      rowSpan={2}
                      className="border-r border-[#EADACA] px-5 py-4 text-center"
                    >
                      Hadir
                    </th>

                    <th
                      rowSpan={2}
                      className="border-r border-[#EADACA] px-5 py-4 text-center"
                    >
                      Izin
                    </th>

                    <th
                      rowSpan={2}
                      className="border-r border-[#EADACA] px-5 py-4 text-center"
                    >
                      Alpa
                    </th>

                    <th
                      rowSpan={2}
                      className="border-r border-[#EADACA] px-5 py-4 text-center"
                    >
                      Tidak Ada Jadwal
                    </th>

                    <th
                      rowSpan={2}
                      className="px-5 py-4"
                    >
                      Keterangan
                    </th>
                  </tr>

                  <tr className="border-b border-[#EADACA] bg-[#FFF8EF] text-left text-[13px] font-extrabold text-[#6F5549]">
                    <th className="border-r border-[#EADACA] px-5 py-3">
                      Jam Siswa
                    </th>

                    <th className="border-r border-[#EADACA] px-5 py-3">
                      Sesi
                    </th>

                    <th className="border-r border-[#EADACA] px-5 py-3">
                      Kls
                    </th>

                    <th className="border-r border-[#EADACA] px-5 py-3">
                      Mapel
                    </th>

                    <th className="border-r border-[#EADACA] px-5 py-3">
                      Materi
                    </th>

                    <th className="border-r border-[#EADACA] px-5 py-3">
                      Siswa
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {attendanceStudents.length === 0 ? (
                    <tr>
                      <td
                        colSpan={15}
                        className="px-5 py-12 text-center text-[#6F5549]"
                      >
                        Pilih mapel, kelas, tanggal,
                        dan jam KBM untuk menampilkan
                        siswa.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map(
                      (student, index) => {
                        const attendanceStudent =
                          attendanceStudents.find(
                            (item) =>
                              item.id === student.id
                          );

                        if (!attendanceStudent)
                          return null;

                        return (
                          <tr
                            key={attendanceStudent.id}
                            className="border-b border-[#F0E1D4] text-[14px]"
                          >
                            <td className="border-r border-[#F0E1D4] px-5 py-4 font-bold">
                              {index + 1}
                            </td>

                            <td className="border-r border-[#F0E1D4] px-5 py-4">
                              <p className="font-extrabold text-[#2B1B18]">
                                {
                                  attendanceStudent.full_name
                                }
                              </p>

                              <p className="mt-1 text-[12px] text-[#6F5549]">
                                NIPD:{" "}
                                {attendanceStudent.nis ||
                                  "-"}

                                {attendanceStudent.nisn
                                  ? ` • NISN: ${attendanceStudent.nisn}`
                                  : ""}
                              </p>
                            </td>

                            <td className="whitespace-nowrap border-r border-[#F0E1D4] px-5 py-4 text-[#6F5549]">
                              {formatTime(
                                teacherArrivalTime
                              )}
                            </td>

                            <td className="whitespace-nowrap border-r border-[#F0E1D4] px-5 py-4 text-[#6F5549]">
                              {formatTime(
                                teacherDepartureTime
                              )}
                            </td>

                            <td className="whitespace-nowrap border-r border-[#F0E1D4] px-5 py-4 text-[#6F5549]">
                              {formatTime(
                                studentStartTime
                              )}
                              -
                              {formatTime(
                                studentEndTime
                              )}
                            </td>

                            <td className="border-r border-[#F0E1D4] px-5 py-4 font-bold text-[#6F5549]">
                              {sessionValue}
                            </td>

                            <td className="border-r border-[#F0E1D4] px-5 py-4 text-[#6F5549]">
                              {formatClass(
                                attendanceStudent.level,
                                attendanceStudent.grade
                              )}
                            </td>

                            <td className="border-r border-[#F0E1D4] px-5 py-4 text-[#6F5549]">
                              {getSubjectLabel(
                                selectedSubject
                              )}
                            </td>

                            <td className="min-w-[220px] border-r border-[#F0E1D4] px-5 py-4 font-bold text-[#2B1B18]">
                              {materialTopic || "-"}
                            </td>

                            <td className="border-r border-[#F0E1D4] px-5 py-4 text-[#6F5549]">
                              {attendanceStudent.full_name ||
                                "-"}
                            </td>

                            <td className="border-r border-[#F0E1D4] px-5 py-4 text-center">
                              <ChecklistButton
                                checked={isHadir(
                                  attendanceStudent.attendanceStatus
                                )}
                                onClick={() =>
                                  updateStudentAttendance(
                                    attendanceStudent.id,
                                    "attendanceStatus",
                                    "Hadir"
                                  )
                                }
                              />
                            </td>

                            <td className="border-r border-[#F0E1D4] px-5 py-4 text-center">
                              <ChecklistButton
                                checked={isIzin(
                                  attendanceStudent.attendanceStatus
                                )}
                                onClick={() =>
                                  updateStudentAttendance(
                                    attendanceStudent.id,
                                    "attendanceStatus",
                                    "Izin"
                                  )
                                }
                              />
                            </td>

                            <td className="border-r border-[#F0E1D4] px-5 py-4 text-center">
                              <ChecklistButton
                                checked={isAlpa(
                                  attendanceStudent.attendanceStatus
                                )}
                                onClick={() =>
                                  updateStudentAttendance(
                                    attendanceStudent.id,
                                    "attendanceStatus",
                                    "Alpa"
                                  )
                                }
                              />
                            </td>

                            <td className="border-r border-[#F0E1D4] px-5 py-4 text-center">
                              <ChecklistButton
                                checked={isTidakAdaJadwal(
                                  attendanceStudent.attendanceStatus
                                )}
                                onClick={() =>
                                  updateStudentAttendance(
                                    attendanceStudent.id,
                                    "attendanceStatus",
                                    "Tidak Ada Jadwal"
                                  )
                                }
                              />
                            </td>

                            <td className="min-w-[260px] px-5 py-4">
                              <div className="space-y-2">
                                <select
                                  value={
                                    attendanceStudent.understandingStatus
                                  }
                                  onChange={(event) =>
                                    updateStudentAttendance(
                                      attendanceStudent.id,
                                      "understandingStatus",
                                      event.target.value
                                    )
                                  }
                                  disabled={
                                    attendanceStudent.attendanceStatus !==
                                    "Hadir"
                                  }
                                  className="h-10 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-3 text-[13px] outline-none focus:border-[#9C0824] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {attendanceStudent.attendanceStatus !==
                                  "Hadir" ? (
                                    <option>-</option>
                                  ) : (
                                    understandingOptions.map(
                                      (option) => (
                                        <option
                                          key={option}
                                        >
                                          {option}
                                        </option>
                                      )
                                    )
                                  )}
                                </select>

                                <input
                                  value={
                                    attendanceStudent.note
                                  }
                                  onChange={(event) =>
                                    updateStudentAttendance(
                                      attendanceStudent.id,
                                      "note",
                                      event.target.value
                                    )
                                  }
                                  placeholder={
                                    attendanceStudent.attendanceStatus ===
                                    "Hadir"
                                      ? "Keterangan opsional"
                                      : attendanceStudent.attendanceStatus ===
                                          "Tidak Ada Jadwal"
                                        ? "Contoh: Jadwal hari Selasa / belajar individu"
                                        : "Wajib isi alasan"
                                  }
                                  className="h-10 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-3 text-[13px] outline-none placeholder:text-[#9A7B6C] focus:border-[#9C0824]"
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      }
                    )
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-5">
              <div className="flex flex-col gap-3 md:flex-row">
                {editingHistory ? (
                  <button
                    type="button"
                    onClick={
                      cancelEditAttendance
                    }
                    disabled={saving}
                    className="h-12 rounded-xl border border-[#DCC8B6] bg-white px-5 text-[14px] font-extrabold text-[#8C0F2D] transition hover:bg-[#FFF8EF] disabled:opacity-60"
                  >
                    Batal
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() =>
                    void handleSaveAttendance()
                  }
                  disabled={
                    saving ||
                    attendanceStudents.length ===
                      0 ||
                    !teacher
                  }
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#8C0F2D] text-[15px] font-extrabold text-white shadow-sm transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />

                  {saving
                    ? "Menyimpan..."
                    : editingHistory
                      ? "Simpan Perubahan"
                      : "Simpan Absensi KBM"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[22px] border border-[#E1CFBE] bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-[#EADACA] px-5 py-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-[18px] font-extrabold text-[#2B1B18]">
                Riwayat Absensi Saya
              </h2>

              <p className="mt-1 text-[13px] text-[#6F5549]">
                Menampilkan absensi yang sudah
                disimpan oleh guru yang sedang login.
              </p>
              {teacher?.id ? (
                <p className="mt-1 text-[12px] font-bold text-[#8C0F2D]">
                  Import KBM akan otomatis dikaitkan dengan akun guru yang sedang login.
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex w-fit rounded-full bg-[#E8F5EE] px-3 py-1 text-[12px] font-extrabold text-[#158A58]">
                {attendanceHistory.length} sesi tersimpan
              </span>

              <button
                type="button"
                onClick={downloadTeacherAttendanceTemplate}
                disabled={!teacher?.id}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#DCC8B6] bg-white px-4 text-[13px] font-extrabold text-[#6F5549] transition hover:bg-[#FFF8EF] disabled:opacity-50"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Template Import
              </button>

              <label className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#8C0F2D] px-4 text-[13px] font-extrabold text-white transition hover:bg-[#54131D] ${importing || !teacher?.id ? "pointer-events-none opacity-50" : ""}`}>
                <FileSpreadsheet className="h-4 w-4" />
                {importing ? "Mengimpor..." : "Import Excel"}
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  disabled={importing || !teacher?.id}
                  onChange={(event) => void handleImportTeacherAttendance(event)}
                />
              </label>

              <button
                type="button"
                onClick={exportAttendanceToExcel}
                disabled={loading || attendanceHistory.length === 0}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#158A58] bg-white px-4 text-[13px] font-extrabold text-[#158A58] transition hover:bg-[#E8F5EE] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Export Excel
              </button>

              <button
                type="button"
                onClick={() => {
                  if (attendanceHistory.length === 0) {
                    alert("Belum ada riwayat absensi yang dapat dicetak.");
                    return;
                  }
                  window.print();
                }}
                disabled={loading || attendanceHistory.length === 0}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#8C0F2D] px-4 text-[13px] font-extrabold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Printer className="h-4 w-4" />
                Cetak Absensi Saya
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] border-collapse">
              <thead>
                <tr className="border-b border-[#EADACA] bg-[#FFF8EF] text-left text-[13px] font-extrabold text-[#6F5549]">
                  <th className="px-5 py-4">No</th>
                  <th className="px-5 py-4">
                    Hari / Tanggal
                  </th>
                  <th className="px-5 py-4">
                    Mapel / Kelas
                  </th>
                  <th className="px-5 py-4">
                    Jam KBM
                  </th>
                  <th className="px-5 py-4">
                    Sesi
                  </th>
                  <th className="px-5 py-4">
                    Materi
                  </th>
                  <th className="px-5 py-4 text-center">
                    Siswa
                  </th>
                  <th className="px-5 py-4 text-center">
                    Hadir
                  </th>
                  <th className="px-5 py-4 text-center">
                    Izin
                  </th>
                  <th className="px-5 py-4 text-center">
                    Alpa
                  </th>
                  <th className="px-5 py-4 text-center">
                    Tidak Ada Jadwal
                  </th>
                  <th className="px-5 py-4">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={12}
                      className="px-5 py-10 text-center text-[#6F5549]"
                    >
                      Memuat riwayat absensi...
                    </td>
                  </tr>
                ) : attendanceHistory.length === 0 ? (
                  <tr>
                    <td
                      colSpan={12}
                      className="px-5 py-10 text-center text-[#6F5549]"
                    >
                      Belum ada absensi yang tersimpan.
                    </td>
                  </tr>
                ) : (
                  attendanceHistory.map(
                    (history, index) => (
                      <tr
                        key={history.key}
                        className="border-b border-[#F0E1D4] text-[14px]"
                      >
                        <td className="px-5 py-4 font-bold">
                          {index + 1}
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-extrabold text-[#2B1B18]">
                            {history.dayName}
                          </p>

                          <p className="mt-1 text-[12px] text-[#6F5549]">
                            {formatDate(
                              history.attendanceDate
                            )}
                          </p>
                        </td>

                        <td className="px-5 py-4 font-bold text-[#2B1B18]">
                          {history.subjectName}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-[#6F5549]">
                          {formatTime(
                            history.startTime
                          )}
                          -
                          {formatTime(
                            history.endTime
                          )}
                        </td>

                        <td className="px-5 py-4 font-extrabold text-[#8C0F2D]">
                          {history.sessionName}
                        </td>

                        <td className="max-w-[260px] px-5 py-4">
                          <p className="line-clamp-2 font-bold">
                            {history.materialTopic}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-center font-extrabold">
                          {history.totalStudents}
                        </td>

                        <td className="px-5 py-4 text-center font-extrabold text-emerald-700">
                          {history.hadir}
                        </td>

                        <td className="px-5 py-4 text-center font-extrabold text-amber-700">
                          {history.izin}
                        </td>

                        <td className="px-5 py-4 text-center font-extrabold text-red-700">
                          {history.alpa}
                        </td>

                        <td className="px-5 py-4 text-center font-extrabold text-slate-600">
                          {
                            history.tidakAdaJadwal
                          }
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedHistory(
                                  history
                                )
                              }
                              className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-xl border border-[#DCC8B6] px-3 text-[13px] font-extrabold text-[#8C0F2D] transition hover:bg-[#FFF8EF]"
                            >
                              <Eye className="h-4 w-4" />
                              Lihat Detail
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleEditAttendance(
                                  history
                                )
                              }
                              className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-xl bg-[#8C0F2D] px-3 text-[13px] font-extrabold text-white transition hover:bg-[#54131D]"
                            >
                              <Pencil className="h-4 w-4" />
                              Edit Absensi
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Area khusus cetak: hanya menampilkan riwayat milik guru yang sedang login. */}
        <div id="teacher-attendance-print" className="hidden print:block">
          <div className="mb-6 border-b-2 border-black pb-4 text-center">
            <h1 className="text-xl font-bold uppercase">
              LAPORAN ABSENSI GURU
            </h1>
            <p className="mt-1 text-sm">Homeschooling Tunas Karya Bangsa</p>
            <p className="mt-3 text-left text-sm">
              <strong>Nama Guru:</strong> {teacher?.full_name || "-"}
            </p>
            <p className="text-left text-sm">
              <strong>Periode:</strong> Seluruh riwayat absensi tersimpan
            </p>
            <p className="text-left text-sm">
              <strong>Tanggal Cetak:</strong> {formatDate(todayYMD())}
            </p>
          </div>

          {attendanceHistory.length === 0 ? (
            <p className="text-sm">Belum ada data absensi.</p>
          ) : (
            attendanceHistory.map((history, historyIndex) => (
              <div
                key={`print-${history.key}`}
                className="mb-6 break-inside-avoid"
              >
                <div className="mb-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <p><strong>{historyIndex + 1}. Hari/Tanggal:</strong> {history.dayName}, {formatDate(history.attendanceDate)}</p>
                  <p><strong>Mapel/Kelas:</strong> {history.subjectName}</p>
                  <p><strong>Datang:</strong> {formatTime(history.teacherArrivalTime)}</p>
                  <p><strong>Pulang:</strong> {formatTime(history.teacherDepartureTime)}</p>
                  <p><strong>Jam KBM:</strong> {formatTime(history.startTime)} - {formatTime(history.endTime)}</p>
                  <p><strong>Sesi:</strong> {history.sessionName}</p>
                  <p className="col-span-2"><strong>Materi:</strong> {history.materialTopic}</p>
                </div>

                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="border border-black p-2">No</th>
                      <th className="border border-black p-2 text-left">Nama Siswa</th>
                      <th className="border border-black p-2">Kelas</th>
                      <th className="border border-black p-2">Status</th>
                      <th className="border border-black p-2">Pemahaman</th>
                      <th className="border border-black p-2 text-left">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.rows.map((row, rowIndex) => {
                      const student = students.find(
                        (item) => item.id === row.student_id
                      );
                      return (
                        <tr key={`print-${row.id}`}>
                          <td className="border border-black p-2 text-center">{rowIndex + 1}</td>
                          <td className="border border-black p-2">{student?.full_name || "-"}</td>
                          <td className="border border-black p-2 text-center">
                            {formatClass(student?.level, student?.grade)}
                          </td>
                          <td className="border border-black p-2 text-center">
                            {normalizeAttendanceStatus(row.attendance_status)}
                          </td>
                          <td className="border border-black p-2 text-center">
                            {row.understanding_status || "-"}
                          </td>
                          <td className="border border-black p-2">
                            {getAttendanceNote(row) || "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <p className="mt-2 text-right text-xs">
                  Total: {history.totalStudents} siswa | Hadir: {history.hadir} | Izin: {history.izin} | Alpa: {history.alpa} | Tidak ada jadwal: {history.tidakAdaJadwal}
                </p>
              </div>
            ))
          )}

          <div className="mt-12 grid grid-cols-2 gap-10 text-center text-sm">
            <div>
              <p>Mengetahui,</p>
              <p className="mt-20 border-t border-black pt-2">Kepala Sekolah</p>
            </div>
            <div>
              <p>Guru yang bersangkutan,</p>
              <p className="mt-20 border-t border-black pt-2">{teacher?.full_name || "Guru"}</p>
            </div>
          </div>
        </div>

        <style jsx global>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 12mm;
            }

            body * {
              visibility: hidden !important;
            }

            #teacher-attendance-print,
            #teacher-attendance-print * {
              visibility: visible !important;
            }

            #teacher-attendance-print {
              display: block !important;
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              color: #000 !important;
              background: #fff !important;
              font-family: Arial, sans-serif !important;
            }

            #teacher-attendance-print table {
              page-break-inside: auto;
            }

            #teacher-attendance-print tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }

            #teacher-attendance-print th {
              background: #f1f1f1 !important;
              font-weight: 700 !important;
            }
          }
        `}</style>
      </section>

      {selectedHistory ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-8">
          <div className="max-h-[92vh] w-full max-w-[980px] overflow-y-auto rounded-[22px] bg-[#FFF8EF] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[#E1CFBE] bg-[#FFF8EF] px-6 py-5">
              <div>
                <h2 className="text-[22px] font-extrabold text-[#2B1B18]">
                  Detail Riwayat Absensi
                </h2>

                <p className="mt-1 text-[14px] text-[#6F5549]">
                  {selectedHistory.subjectName} •{" "}
                  {formatDate(
                    selectedHistory.attendanceDate
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedHistory(null)
                }
                className="rounded-full p-2 text-[#6F5549] transition hover:bg-[#F4E5DA]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="grid gap-4 rounded-2xl border border-[#E1CFBE] bg-white p-5 md:grid-cols-4">
                <InfoItem
                  label="Hari"
                  value={selectedHistory.dayName}
                />

                <InfoItem
                  label="Tanggal"
                  value={formatDate(
                    selectedHistory.attendanceDate
                  )}
                />

                <InfoItem
                  label="Datang Guru"
                  value={formatTime(
                    selectedHistory.teacherArrivalTime
                  )}
                />

                <InfoItem
                  label="Pulang Guru"
                  value={formatTime(
                    selectedHistory.teacherDepartureTime
                  )}
                />

                <InfoItem
                  label="Jam KBM"
                  value={`${formatTime(
                    selectedHistory.startTime
                  )}-${formatTime(
                    selectedHistory.endTime
                  )}`}
                />

                <InfoItem
                  label="Sesi"
                  value={selectedHistory.sessionName}
                />

                <InfoItem
                  label="Jumlah Siswa"
                  value={`${selectedHistory.totalStudents} siswa`}
                />

                <InfoItem
                  label="Materi"
                  value={
                    selectedHistory.materialTopic
                  }
                />
              </div>

              <div className="overflow-hidden rounded-2xl border border-[#E1CFBE] bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[920px] border-collapse">
                    <thead>
                      <tr className="border-b border-[#EADACA] bg-[#FFF8EF] text-left text-[13px] font-extrabold text-[#6F5549]">
                        <th className="px-5 py-4">
                          No
                        </th>
                        <th className="px-5 py-4">
                          Nama Siswa
                        </th>
                        <th className="px-5 py-4">
                          Kelas
                        </th>
                        <th className="px-5 py-4 text-center">
                          Hadir
                        </th>
                        <th className="px-5 py-4 text-center">
                          Izin
                        </th>
                        <th className="px-5 py-4 text-center">
                          Alpa
                        </th>
                        <th className="px-5 py-4 text-center">
                          Tidak Ada Jadwal
                        </th>
                        <th className="px-5 py-4">
                          Pemahaman
                        </th>
                        <th className="px-5 py-4">
                          Keterangan
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedHistory.rows.map(
                        (row, index) => {
                          const student =
                            students.find(
                              (item) =>
                                item.id ===
                                row.student_id
                            );

                          const status =
                            normalizeAttendanceStatus(
                              row.attendance_status
                            );

                          return (
                            <tr
                              key={row.id}
                              className="border-b border-[#F0E1D4] text-[14px]"
                            >
                              <td className="px-5 py-4 font-bold">
                                {index + 1}
                              </td>

                              <td className="px-5 py-4">
                                <p className="font-extrabold text-[#2B1B18]">
                                  {student?.full_name ||
                                    "-"}
                                </p>

                                <p className="mt-1 text-[12px] text-[#6F5549]">
                                  NIPD:{" "}
                                  {student?.nis ||
                                    "-"}
                                </p>
                              </td>

                              <td className="px-5 py-4 text-[#6F5549]">
                                {formatClass(
                                  student?.level,
                                  student?.grade
                                )}
                              </td>

                              <td className="px-5 py-4 text-center">
                                <HistoryCheck
                                  checked={
                                    status ===
                                    "Hadir"
                                  }
                                />
                              </td>

                              <td className="px-5 py-4 text-center">
                                <HistoryCheck
                                  checked={
                                    status ===
                                    "Izin"
                                  }
                                />
                              </td>

                              <td className="px-5 py-4 text-center">
                                <HistoryCheck
                                  checked={
                                    status ===
                                    "Alpa"
                                  }
                                />
                              </td>

                              <td className="px-5 py-4 text-center">
                                <HistoryCheck
                                  checked={
                                    status ===
                                    "Tidak Ada Jadwal"
                                  }
                                />
                              </td>

                              <td className="px-5 py-4 text-[#6F5549]">
                                {row.understanding_status ||
                                  "-"}
                              </td>

                              <td className="px-5 py-4 text-[#6F5549]">
                                {getAttendanceNote(
                                  row
                                ) || "-"}
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedHistory(null)
                  }
                  className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-white text-[14px] font-extrabold text-[#8C0F2D] transition hover:bg-[#FFF8EF]"
                >
                  Tutup Detail
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleEditAttendance(
                      selectedHistory
                    )
                  }
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#8C0F2D] text-[14px] font-extrabold text-white transition hover:bg-[#54131D]"
                >
                  <Pencil className="h-4 w-4" />
                  Edit Absensi
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </TeacherLayout>
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

function ChecklistButton({
  checked,
  onClick,
}: {
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mx-auto flex h-7 w-12 items-center justify-center rounded-[5px] border text-[14px] font-extrabold transition ${
        checked
          ? "border-[#2F66C9] bg-[#3F73C8] text-white"
          : "border-[#C9D3E6] bg-white text-transparent hover:border-[#3F73C8]"
      }`}
      aria-pressed={checked}
    >
      ✓
    </button>
  );
}

function HistoryCheck({
  checked,
}: {
  checked: boolean;
}) {
  return (
    <span
      className={`mx-auto flex h-7 w-11 items-center justify-center rounded-[5px] border text-[14px] font-extrabold ${
        checked
          ? "border-[#2F66C9] bg-[#3F73C8] text-white"
          : "border-[#D5DDE9] bg-white text-transparent"
      }`}
    >
      ✓
    </span>
  );
}

function FormGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <p className="mb-2 text-[13px] font-extrabold text-[#2B1B18]">
        {label}
      </p>

      {children}
    </label>
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

      <p className="mt-1 font-extrabold text-[#2B1B18]">
        {value}
      </p>
    </div>
  );
}