"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Eye,
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
};

const ACADEMIC_YEAR = "2026/2027";

const understandingOptions = ["Paham", "Cukup Paham", "Belum Paham"];

function normalizeAttendanceStatus(status?: string | null) {
  const normalized = (status || "").trim().toLowerCase();

  if (normalized === "tidak hadir") return "Alpa";
  if (normalized === "sakit") return "Izin";
  if (normalized === "izin") return "Izin";
  if (normalized === "alpa") return "Alpa";
  if (normalized === "alpha") return "Alpa";

  return "Hadir";
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

function formatSessionValue(
  minutes?: number | null,
  startTime?: string | null,
  endTime?: string | null
) {
  const duration =
    minutes || calculateDurationMinutes(startTime, endTime);

  if (!duration) return "-";

  let sessionValue: number;

  // Ketentuan HSTKB:
  // 60 menit = 0,75 sesi
  // 90 menit = 1 sesi
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

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedHistory, setSelectedHistory] =
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

      const relationsData =
        (relationsRes.data || []) as StudentTeacherRow[];


      const attendanceData =
        (attendanceRes.data || []) as AttendanceRow[];

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
        };
      })
      .sort((a, b) => {
        const dateCompare = b.attendanceDate.localeCompare(a.attendanceDate);
        if (dateCompare !== 0) return dateCompare;
        return b.startTime.localeCompare(a.startTime);
      });
  }, [attendance, students, subjects]);

  const summary = useMemo(() => {
    const todayAttendance = attendance.filter(
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
      attendanceToday: todayAttendance.length,
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

    if (
      !studentDurationMinutes ||
      studentsInSelectedClass.length === 0
    ) {
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

        return {
          ...student,

          attendanceStatus: normalizeAttendanceStatus(
            existing?.attendance_status
          ),

          understandingStatus:
            existing?.understanding_status || "Paham",

          note: getAttendanceNote(existing),
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

        return next;
      })
    );
  }

  function markAllPresent() {
    if (attendanceStudents.length === 0) {
      alert(
        "Pilih mapel, kelas, dan jam KBM terlebih dahulu."
      );
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

      const deleteQuery = supabase
        .from("attendance")
        .delete()
        .eq("teacher_id", teacher.id)
        .eq("subject_id", subjectId)
        .eq("attendance_date", dateFilter)
        .eq("start_time", studentStartTime)
        .eq("end_time", studentEndTime);

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

      await fetchData();

      setSuccessMessage(
        `Absensi ${getSubjectLabel(selectedSubject)} tanggal ${formatDate(
          dateFilter
        )} berhasil disimpan.`
      );
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
            info={`${summary.attendanceToday} data hari ini`}
            tone="orange"
          />
        </div>

        <div className="rounded-[22px] border border-[#E1CFBE] bg-white p-5 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8E6A58]" />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
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
              <option value="">Pilih Kelas</option>
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
              <option value="">Pilih Mapel</option>

              {subjectOptions.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {getSubjectLabel(subject)}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={dateFilter}
              onChange={(event) => {
                setDateFilter(event.target.value);
                resetAttendanceInput();
              }}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            />
          </div>

          <p className="mt-3 text-[12px] leading-5 text-[#6F5549]">
            Guru memilih mapel, kelas, dan tanggal secara mandiri. Daftar siswa
            mengikuti relasi guru, mata pelajaran, dan kelas yang dipilih.
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
                  Datang dan pulang hanya digunakan sebagai jam
                  kehadiran guru.
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <FormGroup label="Datang Guru">
                    <input
                      type="time"
                      value={teacherArrivalTime}
                      onChange={(event) =>
                        setTeacherArrivalTime(event.target.value)
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
                  Jam ini digunakan sebagai waktu mulai dan selesai
                  pembelajaran siswa.
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <FormGroup label="Jam Mulai Siswa">
                    <input
                      type="time"
                      value={studentStartTime}
                      onChange={(event) => {
                        setStudentStartTime(event.target.value);
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
                        setStudentEndTime(event.target.value);
                        resetAttendanceInput();
                      }}
                      className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
                    />
                  </FormGroup>

                  <FormGroup label="Jam Siswa">
                    <input
                      value={
                        studentStartTime && studentEndTime
                          ? `${formatTime(
                              studentStartTime
                            )}-${formatTime(studentEndTime)}`
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
                        setMaterialTopic(event.target.value)
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
                disabled={attendanceStudents.length === 0}
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
                    value={getDayNameFromDate(dateFilter)}
                  />

                  <InfoItem
                    label="Tanggal"
                    value={formatDate(dateFilter)}
                  />

                  <InfoItem
                    label="Datang Guru"
                    value={formatTime(teacherArrivalTime)}
                  />

                  <InfoItem
                    label="Pulang Guru"
                    value={formatTime(teacherDepartureTime)}
                  />

                  <InfoItem
                    label="Jam Siswa"
                    value={`${formatTime(
                      studentStartTime
                    )}-${formatTime(studentEndTime)}`}
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
              <table className="w-full min-w-[1320px] border-collapse">
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
                        colSpan={14}
                        className="px-5 py-12 text-center text-[#6F5549]"
                      >
                        Pilih mapel, kelas, tanggal, dan jam KBM untuk
                        menampilkan siswa.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student, index) => {
                      const attendanceStudent =
                        attendanceStudents.find(
                          (item) => item.id === student.id
                        );

                      if (!attendanceStudent) return null;

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
                              {attendanceStudent.full_name}
                            </p>

                            <p className="mt-1 text-[12px] text-[#6F5549]">
                              NIPD:{" "}
                              {attendanceStudent.nis || "-"}

                              {attendanceStudent.nisn
                                ? ` • NISN: ${attendanceStudent.nisn}`
                                : ""}
                            </p>
                          </td>

                          <td className="whitespace-nowrap border-r border-[#F0E1D4] px-5 py-4 text-[#6F5549]">
                            {formatTime(teacherArrivalTime)}
                          </td>

                          <td className="whitespace-nowrap border-r border-[#F0E1D4] px-5 py-4 text-[#6F5549]">
                            {formatTime(
                              teacherDepartureTime
                            )}
                          </td>

                          <td className="whitespace-nowrap border-r border-[#F0E1D4] px-5 py-4 text-[#6F5549]">
                            {formatTime(studentStartTime)}-
                            {formatTime(studentEndTime)}
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
                            {attendanceStudent.full_name || "-"}
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
                                      <option key={option}>
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
                                    : "Wajib isi alasan"
                                }
                                className="h-10 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-3 text-[13px] outline-none placeholder:text-[#9A7B6C] focus:border-[#9C0824]"
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-5">
              <button
                type="button"
                onClick={() => void handleSaveAttendance()}
                disabled={
                  saving ||
                  attendanceStudents.length === 0 ||
                  !teacher
                }
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#8C0F2D] text-[15px] font-extrabold text-white shadow-sm transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />

                {saving
                  ? "Menyimpan..."
                  : "Simpan Absensi KBM"}
              </button>
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
                Menampilkan absensi yang sudah disimpan oleh guru yang sedang login.
              </p>
            </div>

            <span className="inline-flex w-fit rounded-full bg-[#E8F5EE] px-3 py-1 text-[12px] font-extrabold text-[#158A58]">
              {attendanceHistory.length} sesi tersimpan
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] border-collapse">
              <thead>
                <tr className="border-b border-[#EADACA] bg-[#FFF8EF] text-left text-[13px] font-extrabold text-[#6F5549]">
                  <th className="px-5 py-4">No</th>
                  <th className="px-5 py-4">Hari / Tanggal</th>
                  <th className="px-5 py-4">Mapel / Kelas</th>
                  <th className="px-5 py-4">Jam KBM</th>
                  <th className="px-5 py-4">Sesi</th>
                  <th className="px-5 py-4">Materi</th>
                  <th className="px-5 py-4 text-center">Siswa</th>
                  <th className="px-5 py-4 text-center">Hadir</th>
                  <th className="px-5 py-4 text-center">Izin</th>
                  <th className="px-5 py-4 text-center">Alpa</th>
                  <th className="px-5 py-4">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} className="px-5 py-10 text-center text-[#6F5549]">
                      Memuat riwayat absensi...
                    </td>
                  </tr>
                ) : attendanceHistory.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-5 py-10 text-center text-[#6F5549]">
                      Belum ada absensi yang tersimpan.
                    </td>
                  </tr>
                ) : (
                  attendanceHistory.map((history, index) => (
                    <tr
                      key={history.key}
                      className="border-b border-[#F0E1D4] text-[14px]"
                    >
                      <td className="px-5 py-4 font-bold">{index + 1}</td>
                      <td className="px-5 py-4">
                        <p className="font-extrabold text-[#2B1B18]">
                          {history.dayName}
                        </p>
                        <p className="mt-1 text-[12px] text-[#6F5549]">
                          {formatDate(history.attendanceDate)}
                        </p>
                      </td>
                      <td className="px-5 py-4 font-bold text-[#2B1B18]">
                        {history.subjectName}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-[#6F5549]">
                        {formatTime(history.startTime)}-{formatTime(history.endTime)}
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
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => setSelectedHistory(history)}
                          className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-xl border border-[#DCC8B6] px-3 text-[13px] font-extrabold text-[#8C0F2D] transition hover:bg-[#FFF8EF]"
                        >
                          <Eye className="h-4 w-4" />
                          Lihat Detail
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

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
                  {selectedHistory.subjectName} • {formatDate(selectedHistory.attendanceDate)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedHistory(null)}
                className="rounded-full p-2 text-[#6F5549] transition hover:bg-[#F4E5DA]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="grid gap-4 rounded-2xl border border-[#E1CFBE] bg-white p-5 md:grid-cols-4">
                <InfoItem label="Hari" value={selectedHistory.dayName} />
                <InfoItem
                  label="Tanggal"
                  value={formatDate(selectedHistory.attendanceDate)}
                />
                <InfoItem
                  label="Datang Guru"
                  value={formatTime(selectedHistory.teacherArrivalTime)}
                />
                <InfoItem
                  label="Pulang Guru"
                  value={formatTime(selectedHistory.teacherDepartureTime)}
                />
                <InfoItem
                  label="Jam KBM"
                  value={`${formatTime(selectedHistory.startTime)}-${formatTime(
                    selectedHistory.endTime
                  )}`}
                />
                <InfoItem label="Sesi" value={selectedHistory.sessionName} />
                <InfoItem
                  label="Jumlah Siswa"
                  value={`${selectedHistory.totalStudents} siswa`}
                />
                <InfoItem label="Materi" value={selectedHistory.materialTopic} />
              </div>

              <div className="overflow-hidden rounded-2xl border border-[#E1CFBE] bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[920px] border-collapse">
                    <thead>
                      <tr className="border-b border-[#EADACA] bg-[#FFF8EF] text-left text-[13px] font-extrabold text-[#6F5549]">
                        <th className="px-5 py-4">No</th>
                        <th className="px-5 py-4">Nama Siswa</th>
                        <th className="px-5 py-4">Kelas</th>
                        <th className="px-5 py-4 text-center">Hadir</th>
                        <th className="px-5 py-4 text-center">Izin</th>
                        <th className="px-5 py-4 text-center">Alpa</th>
                        <th className="px-5 py-4">Pemahaman</th>
                        <th className="px-5 py-4">Keterangan</th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedHistory.rows.map((row, index) => {
                        const student = students.find(
                          (item) => item.id === row.student_id
                        );
                        const status = normalizeAttendanceStatus(
                          row.attendance_status
                        );

                        return (
                          <tr
                            key={row.id}
                            className="border-b border-[#F0E1D4] text-[14px]"
                          >
                            <td className="px-5 py-4 font-bold">{index + 1}</td>
                            <td className="px-5 py-4">
                              <p className="font-extrabold text-[#2B1B18]">
                                {student?.full_name || "-"}
                              </p>
                              <p className="mt-1 text-[12px] text-[#6F5549]">
                                NIPD: {student?.nis || "-"}
                              </p>
                            </td>
                            <td className="px-5 py-4 text-[#6F5549]">
                              {formatClass(student?.level, student?.grade)}
                            </td>
                            <td className="px-5 py-4 text-center">
                              <HistoryCheck checked={status === "Hadir"} />
                            </td>
                            <td className="px-5 py-4 text-center">
                              <HistoryCheck checked={status === "Izin"} />
                            </td>
                            <td className="px-5 py-4 text-center">
                              <HistoryCheck checked={status === "Alpa"} />
                            </td>
                            <td className="px-5 py-4 text-[#6F5549]">
                              {row.understanding_status || "-"}
                            </td>
                            <td className="px-5 py-4 text-[#6F5549]">
                              {getAttendanceNote(row) || "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedHistory(null)}
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

function HistoryCheck({ checked }: { checked: boolean }) {
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