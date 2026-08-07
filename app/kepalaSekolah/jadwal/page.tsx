"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  CalendarDays,
  Clock,
  FileText,
  Plus,
  Printer,
  Search,
  Trash2,
  UploadCloud,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import KepalaSekolahLayout from "../components/KepalaSekolahLayout";

const SCHEDULE_DOCUMENT_BUCKET = "schedule-documents";
const ACADEMIC_YEAR = "2026/2027";
const ALL = "Semua";

type TeacherRow = {
  id: string;
  full_name: string | null;
  email: string | null;
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

type StudentTeacherRow = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  academic_year: string | null;
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
  duration_minutes?: number | null;
  session_name: string | null;
  material_topic: string | null;
  semester: string | null;
  notes?: string | null;
  temporary_schedule_url?: string | null;
  academic_year?: string | null;
};

type AttendanceRow = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
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
  material_topic?: string | null;
  note?: string | null;
  notes?: string | null;
};

type EnrichedSchedule = ScheduleRow & {
  data_source: "schedule" | "attendance";
  source_attendance_id?: string | null;
  student_name: string;
  student_grade: string;
  student_level: string;
  student_nipd: string;
  student_nisn: string;
  teacher_name: string;
  subject_name: string;
  teacher_arrival_time: string | null;
  teacher_departure_time: string | null;
  attendance_status: string | null;
  attendance_note: string | null;
  attendance_material: string | null;
};

type ScheduleGroup = {
  key: string;
  schedule_date: string | null;
  day_name: string | null;
  teacher_arrival_time: string | null;
  teacher_departure_time: string | null;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
  teacher_id: string | null;
  teacher_name: string;
  subject_id: string | null;
  subject_name: string;
  session_name: string | null;
  material_topic: string | null;
  semester: string | null;
  notes: string | null;
  temporary_schedule_url: string | null;
  academic_year: string | null;
  students: EnrichedSchedule[];
  total_students: number;
};

type ScheduleForm = {
  teacher_id: string;
  subject_id: string;
  schedule_date: string;
  day_name: string;
  start_time: string;
  end_time: string;
  semester: string;
  notes: string;
  temporary_schedule_url: string;
};

const dayOptions = [
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
  "Minggu",
];

const semesterOptions = ["Ganjil", "Genap"];

const initialForm: ScheduleForm = {
  teacher_id: "",
  subject_id: "",
  schedule_date: "",
  day_name: "Senin",
  start_time: "",
  end_time: "",
  semester: "Ganjil",
  notes: "",
  temporary_schedule_url: "",
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

function getGradeNumber(value?: string | null) {
  const match = (value || "").match(/\d+/);

  return match ? Number(match[0]) : null;
}

function isAllGrade(value?: string | null) {
  const safe = normalizeText(value);

  return (
    !safe ||
    safe === "all" ||
    safe === "all grade" ||
    safe === "semua" ||
    safe === "semua kelas"
  );
}

function isMathSubject(subject?: SubjectRow | null) {
  const name = normalizeText(subject?.name);

  return name.includes("math") || name.includes("matematika");
}

function getSubjectLabel(subject: SubjectRow) {
  const level = normalizeLevel(subject.level);
  const grade = subject.grade || "All Grade";

  return `${subject.name || "-"} — ${level} ${grade}`;
}

function formatClass(level?: string | null, grade?: string | null) {
  const gradeNumber = getGradeNumber(grade);

  if (gradeNumber && gradeNumber >= 1 && gradeNumber <= 6) {
    return `SD ${gradeNumber}`;
  }

  if (gradeNumber && gradeNumber >= 7 && gradeNumber <= 9) {
    return `SMP ${gradeNumber}`;
  }

  if (gradeNumber && gradeNumber >= 10 && gradeNumber <= 12) {
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

function getDayName(dateString: string) {
  if (!dateString) return "Senin";

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "Senin";

  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
  }).format(date);
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

function formatSessionValue(
  minutes?: number | null,
  startTime?: string | null,
  endTime?: string | null
) {
  const duration =
    minutes || calculateDurationMinutes(startTime, endTime);

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

function cleanFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");
}

async function uploadScheduleDocument(file: File) {
  const safeFileName = cleanFileName(file.name);
  const filePath = `temporary-schedules/${Date.now()}-${safeFileName}`;

  const { error } = await supabase.storage
    .from(SCHEDULE_DOCUMENT_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage
    .from(SCHEDULE_DOCUMENT_BUCKET)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

function normalizeAttendanceStatus(status?: string | null) {
  const safe = normalizeText(status);

  if (safe === "hadir" || safe === "present") return "Hadir";
  if (safe === "izin") return "Izin";
  if (safe === "sakit") return "Izin";

  if (
    safe === "alpa" ||
    safe === "alpha" ||
    safe === "tidak hadir" ||
    safe === "absent"
  ) {
    return "Alpa";
  }

  return "";
}

function getAttendanceKey(item: {
  student_id?: string | null;
  teacher_id?: string | null;
  subject_id?: string | null;
  attendance_date?: string | null;
  schedule_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
}) {
  return [
    item.student_id || "",
    item.teacher_id || "",
    item.subject_id || "",
    item.attendance_date || item.schedule_date || "",
    formatTime(item.start_time),
    formatTime(item.end_time),
  ].join("__");
}

function getScheduleGroupKey(schedule: EnrichedSchedule) {
  return [
    schedule.teacher_id || "",
    schedule.subject_id || "",
    schedule.schedule_date || "",
    formatTime(schedule.start_time),
    formatTime(schedule.end_time),
  ].join("__");
}

function groupSchedules(schedules: EnrichedSchedule[]) {
  const map = new Map<string, EnrichedSchedule[]>();

  schedules.forEach((schedule) => {
    const key = getScheduleGroupKey(schedule);
    const current = map.get(key) || [];

    current.push(schedule);
    map.set(key, current);
  });

  const groups: ScheduleGroup[] = Array.from(map.entries()).map(
    ([key, rows]) => {
      const first = rows[0];

      const sortedStudents = [...rows].sort((a, b) => {
        const gradeA = getGradeNumber(a.student_grade) || 999;
        const gradeB = getGradeNumber(b.student_grade) || 999;

        if (gradeA !== gradeB) return gradeA - gradeB;

        return a.student_name.localeCompare(b.student_name);
      });

      const durationMinutes =
        first.duration_minutes ||
        calculateDurationMinutes(first.start_time, first.end_time);

      return {
        key,
        schedule_date: first.schedule_date,
        day_name: first.day_name,
        teacher_arrival_time:
          rows.find((row) => row.teacher_arrival_time)
            ?.teacher_arrival_time || null,
        teacher_departure_time:
          rows.find((row) => row.teacher_departure_time)
            ?.teacher_departure_time || null,
        start_time: first.start_time,
        end_time: first.end_time,
        duration_minutes: durationMinutes,
        teacher_id: first.teacher_id,
        teacher_name: first.teacher_name,
        subject_id: first.subject_id,
        subject_name: first.subject_name,
        session_name: formatSessionValue(
          durationMinutes,
          first.start_time,
          first.end_time
        ),
        material_topic:
          rows.find((row) => row.attendance_material)?.attendance_material ||
          first.material_topic,
        semester: first.semester,
        notes: first.notes || null,
        temporary_schedule_url: first.temporary_schedule_url || null,
        academic_year: first.academic_year || null,
        students: sortedStudents,
        total_students: sortedStudents.length,
      };
    }
  );

  return groups.sort((a, b) => {
    const dateA = a.schedule_date || "";
    const dateB = b.schedule_date || "";

    if (dateA !== dateB) {
      return dateB.localeCompare(dateA);
    }

    return (a.start_time || "").localeCompare(b.start_time || "");
  });
}

export default function KepalaSekolahJadwalPage() {
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [studentTeachers, setStudentTeachers] = useState<StudentTeacherRow[]>(
    []
  );
  const [schedules, setSchedules] = useState<EnrichedSchedule[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [selectedGroup, setSelectedGroup] =
    useState<ScheduleGroup | null>(null);

  const [search, setSearch] = useState("");
  const [teacherFilter, setTeacherFilter] = useState(ALL);
  const [dayFilter, setDayFilter] = useState(ALL);
  const [subjectFilter, setSubjectFilter] = useState(ALL);

  const [form, setForm] = useState<ScheduleForm>(initialForm);
  const [temporaryScheduleFile, setTemporaryScheduleFile] =
    useState<File | null>(null);

  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState("");

  async function fetchData() {
    setLoading(true);
    setErrorMessage("");

    try {
      const [
        teachersRes,
        studentsRes,
        subjectsRes,
        studentTeachersRes,
        schedulesRes,
        attendanceRes,
      ] = await Promise.all([
        supabase.from("teachers").select("*").order("full_name"),
        supabase.from("students").select("*").order("full_name"),
        supabase.from("subjects").select("*").order("name"),
        supabase
          .from("student_teachers")
          .select(
            "id, student_id, teacher_id, subject_id, academic_year"
          )
          .eq("academic_year", ACADEMIC_YEAR),
        supabase
          .from("schedules")
          .select("*")
          .order("schedule_date", { ascending: false })
          .order("start_time", { ascending: true }),
        supabase
          .from("attendance")
          .select("*")
          .order("attendance_date", { ascending: false }),
      ]);

      if (teachersRes.error) {
        throw new Error(teachersRes.error.message);
      }

      if (studentsRes.error) {
        throw new Error(studentsRes.error.message);
      }

      if (subjectsRes.error) {
        throw new Error(subjectsRes.error.message);
      }

      if (studentTeachersRes.error) {
        throw new Error(studentTeachersRes.error.message);
      }

      if (schedulesRes.error) {
        throw new Error(schedulesRes.error.message);
      }

      if (attendanceRes.error) {
        throw new Error(attendanceRes.error.message);
      }

      const teachersData = (teachersRes.data || []) as TeacherRow[];
      const studentsData = (studentsRes.data || []) as StudentRow[];
      const subjectsData = (subjectsRes.data || []) as SubjectRow[];
      const studentTeachersData = (studentTeachersRes.data ||
        []) as StudentTeacherRow[];
      const schedulesData = (schedulesRes.data || []) as ScheduleRow[];
      const attendanceData = (attendanceRes.data || []) as AttendanceRow[];

      const teacherMap = new Map(
        teachersData.map((teacher) => [teacher.id, teacher])
      );

      const studentMap = new Map(
        studentsData.map((student) => [student.id, student])
      );

      const subjectMap = new Map(
        subjectsData.map((subject) => [subject.id, subject])
      );

      const attendanceMap = new Map(
        attendanceData.map((attendance) => [
          getAttendanceKey(attendance),
          attendance,
        ])
      );

      const matchedAttendanceKeys = new Set<string>();

      const enrichedFromSchedules: EnrichedSchedule[] = schedulesData.map(
        (schedule) => {
          const teacher = schedule.teacher_id
            ? teacherMap.get(schedule.teacher_id)
            : null;

          const student = schedule.student_id
            ? studentMap.get(schedule.student_id)
            : null;

          const subject = schedule.subject_id
            ? subjectMap.get(schedule.subject_id)
            : null;

          const attendanceKey = getAttendanceKey({
            student_id: schedule.student_id,
            teacher_id: schedule.teacher_id,
            subject_id: schedule.subject_id,
            schedule_date: schedule.schedule_date,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
          });

          const attendance = attendanceMap.get(attendanceKey);

          if (attendance) {
            matchedAttendanceKeys.add(attendanceKey);
          }

          return {
            ...schedule,
            data_source: "schedule",
            source_attendance_id: attendance?.id || null,
            teacher_name: teacher?.full_name || "-",
            student_name: student?.full_name || "-",
            student_grade: student?.grade || "-",
            student_level: student?.level || "-",
            student_nipd: student?.nis || "-",
            student_nisn: student?.nisn || "-",
            subject_name: subject ? getSubjectLabel(subject) : "-",
            teacher_arrival_time:
              attendance?.teacher_arrival_time || null,
            teacher_departure_time:
              attendance?.teacher_departure_time || null,
            attendance_status:
              normalizeAttendanceStatus(attendance?.attendance_status) || null,
            attendance_note:
              attendance?.note || attendance?.notes || null,
            attendance_material: attendance?.material_topic || null,
          };
        }
      );

      const enrichedFromUnmatchedAttendance: EnrichedSchedule[] =
        attendanceData
          .filter((attendance) => {
            const key = getAttendanceKey(attendance);
            return !matchedAttendanceKeys.has(key);
          })
          .map((attendance) => {
            const teacher = attendance.teacher_id
              ? teacherMap.get(attendance.teacher_id)
              : null;

            const student = attendance.student_id
              ? studentMap.get(attendance.student_id)
              : null;

            const subject = attendance.subject_id
              ? subjectMap.get(attendance.subject_id)
              : null;

            const durationMinutes =
              attendance.duration_minutes ||
              calculateDurationMinutes(
                attendance.start_time,
                attendance.end_time
              );

            return {
              id: `attendance-${attendance.id}`,
              data_source: "attendance",
              source_attendance_id: attendance.id,
              student_id: attendance.student_id,
              teacher_id: attendance.teacher_id,
              subject_id: attendance.subject_id,
              day_name:
                attendance.day_name ||
                getDayName(attendance.attendance_date || ""),
              schedule_date: attendance.attendance_date,
              start_time: attendance.start_time || null,
              end_time: attendance.end_time || null,
              duration_minutes: durationMinutes,
              session_name:
                attendance.session_name ||
                formatSessionValue(
                  durationMinutes,
                  attendance.start_time,
                  attendance.end_time
                ),
              material_topic: attendance.material_topic || null,
              semester: null,
              notes: attendance.note || attendance.notes || null,
              temporary_schedule_url: null,
              academic_year: ACADEMIC_YEAR,
              teacher_name: teacher?.full_name || "-",
              student_name: student?.full_name || "-",
              student_grade: student?.grade || "-",
              student_level: student?.level || "-",
              student_nipd: student?.nis || "-",
              student_nisn: student?.nisn || "-",
              subject_name: subject ? getSubjectLabel(subject) : "-",
              teacher_arrival_time:
                attendance.teacher_arrival_time || null,
              teacher_departure_time:
                attendance.teacher_departure_time || null,
              attendance_status:
                normalizeAttendanceStatus(attendance.attendance_status) || null,
              attendance_note:
                attendance.note || attendance.notes || null,
              attendance_material: attendance.material_topic || null,
            };
          });

      const merged = [
        ...enrichedFromSchedules,
        ...enrichedFromUnmatchedAttendance,
      ];

      setTeachers(teachersData);
      setStudents(studentsData);
      setSubjects(subjectsData);
      setStudentTeachers(studentTeachersData);
      setSchedules(merged);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengambil data jadwal.");
      }

      setTeachers([]);
      setStudents([]);
      setSubjects([]);
      setStudentTeachers([]);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchData();

    const channel = supabase
      .channel("kepala-jadwal-rombel-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "schedules" },
        () => void fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        () => void fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teachers" },
        () => void fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subjects" },
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
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const selectedTeacherRelations = useMemo(() => {
    if (!form.teacher_id) return [];

    return studentTeachers.filter(
      (relation) =>
        relation.teacher_id === form.teacher_id &&
        (!relation.academic_year ||
          relation.academic_year === ACADEMIC_YEAR)
    );
  }, [studentTeachers, form.teacher_id]);

  const allowedStudentIdsForTeacher = useMemo(() => {
    return new Set(
      selectedTeacherRelations
        .map((relation) => relation.student_id)
        .filter(Boolean) as string[]
    );
  }, [selectedTeacherRelations]);

  const selectedStudentsForForm = useMemo(() => {
    return students.filter((student) =>
      selectedStudentIds.includes(student.id)
    );
  }, [students, selectedStudentIds]);

  const selectedStudentGradeNumbers = useMemo(() => {
    return Array.from(
      new Set(
        selectedStudentsForForm
          .map((student) => getGradeNumber(student.grade))
          .filter((grade): grade is number => Boolean(grade))
      )
    );
  }, [selectedStudentsForForm]);

  const teacherSubjectIds = useMemo(() => {
    return new Set(
      selectedTeacherRelations
        .map((relation) => relation.subject_id)
        .filter(Boolean) as string[]
    );
  }, [selectedTeacherRelations]);

  const selectedStudentSubjectIds = useMemo(() => {
    if (selectedStudentIds.length === 0) {
      return teacherSubjectIds;
    }

    return new Set(
      selectedTeacherRelations
        .filter(
          (relation) =>
            relation.student_id &&
            selectedStudentIds.includes(relation.student_id)
        )
        .map((relation) => relation.subject_id)
        .filter(Boolean) as string[]
    );
  }, [
    selectedTeacherRelations,
    selectedStudentIds,
    teacherSubjectIds,
  ]);

  const subjectOptionsForSchedule = useMemo(() => {
    if (!form.teacher_id) return [];

    return subjects.filter((subject) => {
      const subjectGradeNumber = getGradeNumber(subject.grade);
      const isConnectedToTeacher =
        selectedStudentSubjectIds.has(subject.id);

      if (!isConnectedToTeacher) return false;

      if (isMathSubject(subject) && isAllGrade(subject.grade)) {
        return false;
      }

      if (selectedStudentGradeNumbers.length === 0) {
        return true;
      }

      if (!subjectGradeNumber) {
        return true;
      }

      return selectedStudentGradeNumbers.includes(subjectGradeNumber);
    });
  }, [
    subjects,
    form.teacher_id,
    selectedStudentSubjectIds,
    selectedStudentGradeNumbers,
  ]);

  useEffect(() => {
    if (!form.subject_id) return;

    const stillAllowed = subjectOptionsForSchedule.some(
      (subject) => subject.id === form.subject_id
    );

    if (!stillAllowed) {
      setForm((previous) => ({
        ...previous,
        subject_id: "",
      }));
    }
  }, [form.subject_id, subjectOptionsForSchedule]);

  const groupedSchedules = useMemo(() => {
    const q = normalizeText(search);
    const groups = groupSchedules(schedules);

    return groups.filter((group) => {
      const matchSearch =
        !q ||
        normalizeText(group.teacher_name).includes(q) ||
        normalizeText(group.subject_name).includes(q) ||
        normalizeText(group.material_topic).includes(q) ||
        normalizeText(group.session_name).includes(q) ||
        normalizeText(group.notes).includes(q) ||
        group.students.some((student) => {
          return (
            normalizeText(student.student_name).includes(q) ||
            normalizeText(student.student_grade).includes(q) ||
            normalizeText(student.student_level).includes(q) ||
            normalizeText(student.student_nipd).includes(q) ||
            normalizeText(student.student_nisn).includes(q)
          );
        });

      const matchTeacher =
        teacherFilter === ALL || group.teacher_id === teacherFilter;

      const matchDay =
        dayFilter === ALL || group.day_name === dayFilter;

      const matchSubject =
        subjectFilter === ALL || group.subject_id === subjectFilter;

      return matchSearch && matchTeacher && matchDay && matchSubject;
    });
  }, [
    schedules,
    search,
    teacherFilter,
    dayFilter,
    subjectFilter,
  ]);

  const filteredStudents = useMemo(() => {
    const q = normalizeText(studentSearch);

    return students.filter((student) => {
      const matchTeacher =
        !form.teacher_id ||
        allowedStudentIdsForTeacher.has(student.id);

      const matchSearch =
        !q ||
        normalizeText(student.full_name).includes(q) ||
        normalizeText(student.grade).includes(q) ||
        normalizeText(student.level).includes(q) ||
        normalizeText(student.nis).includes(q) ||
        normalizeText(student.nisn).includes(q);

      return matchTeacher && matchSearch;
    });
  }, [
    students,
    studentSearch,
    form.teacher_id,
    allowedStudentIdsForTeacher,
  ]);

  const summary = useMemo(() => {
    const groups = groupSchedules(schedules);

    const activeTeachers = new Set(
      schedules.map((item) => item.teacher_id).filter(Boolean)
    ).size;

    const uniqueStudents = new Set(
      schedules.map((item) => item.student_id).filter(Boolean)
    ).size;

    return {
      totalSchedules: schedules.length,
      totalRombel: groups.length,
      totalStudentsScheduled: uniqueStudents,
      activeTeachers,
    };
  }, [schedules]);

  function resetForm() {
    setForm(initialForm);
    setTemporaryScheduleFile(null);
    setSelectedStudentIds([]);
    setStudentSearch("");
  }

  function openModal() {
    resetForm();
    setShowModal(true);
  }

  function toggleStudent(studentId: string) {
    setSelectedStudentIds((previous) => {
      if (previous.includes(studentId)) {
        return previous.filter((id) => id !== studentId);
      }

      return [...previous, studentId];
    });
  }

  function selectAllFilteredStudents() {
    const ids = filteredStudents.map((student) => student.id);

    setSelectedStudentIds((previous) => {
      const merged = new Set([...previous, ...ids]);

      return Array.from(merged);
    });
  }

  function clearSelectedStudents() {
    setSelectedStudentIds([]);
  }

  function handlePrintSchedule() {
    window.print();
  }

  async function handleSaveSchedule() {
    if (!form.teacher_id) {
      alert("Pilih guru terlebih dahulu.");
      return;
    }

    if (!form.subject_id) {
      alert("Pilih mata pelajaran terlebih dahulu.");
      return;
    }

    const subjectConnectedToTeacher =
      selectedTeacherRelations.some(
        (relation) =>
          relation.subject_id === form.subject_id &&
          relation.teacher_id === form.teacher_id
      );

    if (!subjectConnectedToTeacher) {
      alert(
        "Mapel yang dipilih belum terhubung dengan guru ini. Hubungkan melalui menu Guru → Assign."
      );
      return;
    }

    const studentsNotConnectedToSubject =
      selectedStudentIds.filter(
        (studentId) =>
          !selectedTeacherRelations.some(
            (relation) =>
              relation.student_id === studentId &&
              relation.subject_id === form.subject_id
          )
      );

    if (studentsNotConnectedToSubject.length > 0) {
      alert(
        "Ada siswa yang belum terhubung dengan guru dan mapel yang dipilih."
      );
      return;
    }

    const selectedSubjectForSave =
      subjects.find(
        (subject) => subject.id === form.subject_id
      ) || null;

    if (
      selectedSubjectForSave &&
      isMathSubject(selectedSubjectForSave)
    ) {
      if (isAllGrade(selectedSubjectForSave.grade)) {
        alert(
          "Mapel Matematika tidak boleh menggunakan All Grade."
        );
        return;
      }

      const mathGradeNumber = getGradeNumber(
        selectedSubjectForSave.grade
      );

      const selectedGrades = Array.from(
        new Set(
          selectedStudentIds
            .map((studentId) => {
              const student = students.find(
                (item) => item.id === studentId
              );

              return getGradeNumber(student?.grade);
            })
            .filter((grade): grade is number => Boolean(grade))
        )
      );

      if (selectedGrades.length > 1) {
        alert(
          "Untuk Matematika, jadwal harus dibuat per kelas."
        );
        return;
      }

      if (
        mathGradeNumber &&
        selectedGrades.length === 1 &&
        selectedGrades[0] !== mathGradeNumber
      ) {
        alert(
          `Mapel Matematika yang dipilih untuk Kelas ${mathGradeNumber}, tetapi siswa yang dipilih Kelas ${selectedGrades[0]}.`
        );
        return;
      }
    }

    if (!form.schedule_date) {
      alert("Pilih tanggal jadwal terlebih dahulu.");
      return;
    }

    if (!form.start_time || !form.end_time) {
      alert("Isi jam mulai dan jam selesai terlebih dahulu.");
      return;
    }

    const durationMinutes = calculateDurationMinutes(
      form.start_time,
      form.end_time
    );

    if (!durationMinutes) {
      alert("Jam selesai harus lebih besar dari jam mulai.");
      return;
    }

    if (selectedStudentIds.length === 0) {
      alert("Pilih minimal 1 siswa untuk jadwal rombel.");
      return;
    }

    setSaving(true);

    try {
      let temporaryScheduleUrl =
        form.temporary_schedule_url || null;

      if (temporaryScheduleFile) {
        temporaryScheduleUrl =
          await uploadScheduleDocument(temporaryScheduleFile);
      }

      const sessionValue = formatSessionValue(durationMinutes);

      const payload = selectedStudentIds.map((studentId) => ({
        student_id: studentId,
        teacher_id: form.teacher_id,
        subject_id: form.subject_id,
        day_name: form.day_name,
        schedule_date: form.schedule_date,
        start_time: form.start_time,
        end_time: form.end_time,
        duration_minutes: durationMinutes,
        session_name: sessionValue,
        material_topic: null,
        semester: form.semester,
        notes: form.notes.trim() || null,
        temporary_schedule_url: temporaryScheduleUrl,
        academic_year: ACADEMIC_YEAR,
      }));

      const { error } = await supabase
        .from("schedules")
        .insert(payload);

      if (error) {
        throw new Error(error.message);
      }

      await fetchData();

      setShowModal(false);
      resetForm();
    } catch (error) {
      if (error instanceof Error) {
        alert(`Gagal menyimpan jadwal: ${error.message}`);
      } else {
        alert("Gagal menyimpan jadwal.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteGroup(group: ScheduleGroup) {
    const confirmDelete = window.confirm(
      `Hapus jadwal ${group.subject_name} - ${group.teacher_name} untuk ${group.total_students} siswa?`
    );

    if (!confirmDelete) return;

    const ids = group.students
      .filter((item) => item.data_source === "schedule")
      .map((item) => item.id);

    if (ids.length === 0) {
      alert(
        "Data ini berasal dari input absensi guru dan tidak memiliki jadwal admin yang dapat dihapus."
      );
      return;
    }

    const { error } = await supabase
      .from("schedules")
      .delete()
      .in("id", ids);

    if (error) {
      alert(`Gagal menghapus jadwal: ${error.message}`);
      return;
    }

    await fetchData();
  }

  return (
    <KepalaSekolahLayout
      activeMenu="ABSENSI KBM SISWA DAN GURU HARIAN"
      searchPlaceholder="Cari absensi KBM siswa dan guru..."
    >
      <style jsx global>{`
        .print-only {
          display: none;
        }

        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm;
          }

          html,
          body {
            background: #ffffff !important;
          }

          body * {
            visibility: hidden !important;
          }

          .print-root,
          .print-root * {
            visibility: visible !important;
          }

          .print-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            overflow: visible !important;
            background: #ffffff !important;
          }

          .print-only {
            display: block !important;
          }

          .print-hidden {
            display: none !important;
          }

          .print-root > div {
            overflow: visible !important;
          }

          .print-root table {
            width: 100% !important;
            min-width: 0 !important;
            border-collapse: collapse !important;
            table-layout: auto !important;
            font-size: 8px !important;
          }

          .print-root thead {
            display: table-header-group !important;
          }

          .print-root tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .print-root th,
          .print-root td {
            border: 1px solid #4b4b4b !important;
            padding: 4px !important;
            color: #111111 !important;
            background: #ffffff !important;
            vertical-align: top !important;
          }

          .print-root th {
            font-weight: 800 !important;
            text-align: center !important;
          }

          .print-root button {
            appearance: none !important;
            border: 0 !important;
            background: transparent !important;
            color: #111111 !important;
            padding: 0 !important;
            min-height: auto !important;
            cursor: default !important;
          }

          .print-root .divide-y > :not([hidden]) ~ :not([hidden]) {
            border-top: 1px solid #777777 !important;
          }

          .print-root .line-clamp-3 {
            display: block !important;
            overflow: visible !important;
            -webkit-line-clamp: unset !important;
          }

          .print-root .rounded-md,
          .print-root .rounded-xl,
          .print-root .rounded-full {
            border-radius: 2px !important;
          }

          .print-root .bg-\\[\\#22C55E\\],
          .print-root .bg-\\[\\#7C3AED\\],
          .print-root .bg-\\[\\#DC2626\\] {
            background: transparent !important;
            color: #111111 !important;
            border: 0 !important;
          }
        }
      `}</style>

      <section className="space-y-7">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end print:hidden">
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#8A5A48]">
              Jadwal Pembelajaran
            </p>

            <h1 className="mt-2 text-[30px] font-extrabold tracking-[-0.02em] text-[#2B1B18]">
              ABSENSI KBM GURU DAN SISWA HARIAN
            </h1>

            <p className="mt-2 max-w-[880px] text-[15px] leading-6 text-[#6F5549]">
              Admin/Kepala Sekolah mengatur jadwal dasar dan jam KBM
              siswa. Jam datang/pulang guru serta materi pembelajaran
              diisi oleh masing-masing guru.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handlePrintSchedule}
              className="flex h-11 items-center gap-2 rounded-xl border border-[#DCC8B6] bg-white px-5 text-[14px] font-extrabold text-[#8C0F2D]"
            >
              <Printer className="h-4 w-4" />
              Print Absensi
            </button>

            <button
              type="button"
              onClick={openModal}
              className="flex h-11 items-center gap-2 rounded-xl bg-[#8C0F2D] px-5 text-[14px] font-extrabold text-white"
            >
              <Plus className="h-4 w-4" />
              Tambah Jadwal
            </button>
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700 print:hidden">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>{errorMessage}</p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 print:hidden">
          <SummaryCard
            icon={<CalendarDays className="h-5 w-5" />}
            label="Total Data KBM"
            value={summary.totalSchedules}
            info="Data"
            tone="pink"
          />

          <SummaryCard
            icon={<UsersRound className="h-5 w-5" />}
            label="Total Rombel"
            value={summary.totalRombel}
            info="Rombel"
            tone="orange"
          />

          <SummaryCard
            icon={<UserRound className="h-5 w-5" />}
            label="Siswa KBM"
            value={summary.totalStudentsScheduled}
            info="Siswa"
            tone="green"
          />

          <SummaryCard
            icon={<Clock className="h-5 w-5" />}
            label="Guru Aktif"
            value={summary.activeTeachers}
            info="Guru"
            tone="blue"
          />
        </div>

        <div className="rounded-[22px] border border-[#E1CFBE] bg-white p-5 shadow-sm print:hidden">
          <div className="grid gap-3 xl:grid-cols-[1.7fr_1fr_1fr_1fr]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8E6A58]" />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari jadwal..."
                className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] pl-11 pr-4 text-[14px] outline-none"
              />
            </div>

            <select
              value={teacherFilter}
              onChange={(event) =>
                setTeacherFilter(event.target.value)
              }
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px]"
            >
              <option value={ALL}>Semua Guru</option>

              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.full_name}
                </option>
              ))}
            </select>

            <select
              value={dayFilter}
              onChange={(event) =>
                setDayFilter(event.target.value)
              }
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px]"
            >
              <option value={ALL}>Semua Hari</option>

              {dayOptions.map((day) => (
                <option key={day}>{day}</option>
              ))}
            </select>

            <select
              value={subjectFilter}
              onChange={(event) =>
                setSubjectFilter(event.target.value)
              }
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px]"
            >
              <option value={ALL}>Semua Mapel</option>

              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {getSubjectLabel(subject)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="print-root overflow-hidden rounded-[22px] border border-[#E1CFBE] bg-white shadow-sm">
          <div className="print-only px-4 pb-5 pt-2 text-center">
            <h1 className="text-[20px] font-extrabold uppercase text-black">
              ABSENSI KBM GURU DAN SISWA HARIAN
            </h1>
            <p className="mt-1 text-[12px] font-bold text-black">
              HOMESCHOOLING TUNAS KARYA BANGSA
            </p>
            <p className="mt-1 text-[10px] text-black">
              Tahun Ajaran {ACADEMIC_YEAR}
            </p>
          </div>

          <div className="border-b border-[#EADACA] px-6 py-5 print:hidden">
            <h2 className="text-[20px] font-extrabold">
              Daftar Jadwal Rombel
            </h2>

            <p className="mt-1 text-[14px] text-[#6F5549]">
              Menampilkan gabungan jadwal admin dan input absensi guru,
              sehingga seluruh guru yang sudah mengisi KBM tetap muncul.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1480px] border-collapse">
              <thead>
                <tr className="border-b border-[#EADACA] bg-[#FFF8EF] text-left text-[13px] font-extrabold text-[#6F5549]">
                  <th rowSpan={2} className="border-r px-4 py-4">
                    No
                  </th>
                  <th rowSpan={2} className="border-r px-4 py-4">
                    Hari
                  </th>
                  <th rowSpan={2} className="border-r px-4 py-4">
                    Tanggal
                  </th>
                  <th rowSpan={2} className="border-r px-4 py-4">
                    Nama Guru
                  </th>
                  <th rowSpan={2} className="border-r px-4 py-4">
                    Datang Guru
                  </th>
                  <th rowSpan={2} className="border-r px-4 py-4">
                    Pulang Guru
                  </th>

                  <th colSpan={9} className="border-r px-4 py-4 text-center">
                    Jadwal Kegiatan Belajar Mengajar
                  </th>

                  <th rowSpan={2} className="border-r px-4 py-4">
                    Keterangan
                  </th>
                  <th rowSpan={2} className="print-hidden px-4 py-4">
                    File
                  </th>
                  <th rowSpan={2} className="print-hidden px-4 py-4">
                    Aksi
                  </th>
                </tr>

                <tr className="border-b border-[#EADACA] bg-[#FFF8EF] text-[13px] font-extrabold text-[#6F5549]">
                  <th className="border-r px-4 py-3">Jam Siswa</th>
                  <th className="border-r px-4 py-3">Sesi</th>
                  <th className="border-r px-4 py-3">Kls</th>
                  <th className="border-r px-4 py-3">Mapel</th>
                  <th className="border-r px-4 py-3">Materi</th>
                  <th className="border-r px-4 py-3">Siswa</th>
                  <th className="border-r bg-[#D1FAE5] px-4 py-3 text-center text-[#047857]">
                    Hadir
                  </th>
                  <th className="border-r bg-[#EDE9FE] px-4 py-3 text-center text-[#6D28D9]">
                    Izin
                  </th>
                  <th className="border-r bg-[#FEE2E2] px-4 py-3 text-center text-[#B91C1C]">
                    Alpa
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={18} className="px-6 py-12 text-center">
                      Memuat data jadwal...
                    </td>
                  </tr>
                ) : groupedSchedules.length === 0 ? (
                  <tr>
                    <td colSpan={18} className="px-6 py-12 text-center">
                      Belum ada jadwal rombel.
                    </td>
                  </tr>
                ) : (
                  groupedSchedules.map((group, index) => {
                    const classList = Array.from(
                      new Set(
                        group.students.map((student) =>
                          formatClass(
                            student.student_level,
                            student.student_grade
                          )
                        )
                      )
                    ).join(", ");

                    return (
                      <tr
                        key={group.key}
                        className="border-b border-[#F0E1D4] text-[14px]"
                      >
                        <td className="border-r px-4 py-4 font-bold">
                          {index + 1}
                        </td>

                        <td className="border-r px-4 py-4 font-extrabold">
                          {group.day_name || "-"}
                        </td>

                        <td className="whitespace-nowrap border-r px-4 py-4">
                          {formatDate(group.schedule_date)}
                        </td>

                        <td className="border-r px-4 py-4 font-extrabold">
                          {group.teacher_name}
                        </td>

                        <td className="border-r px-4 py-4">
                          {formatTime(group.teacher_arrival_time)}
                        </td>

                        <td className="border-r px-4 py-4">
                          {formatTime(group.teacher_departure_time)}
                        </td>

                        <td className="border-r px-4 py-4">
                          {formatTime(group.start_time)}-
                          {formatTime(group.end_time)}
                        </td>

                        <td className="border-r px-4 py-4 text-center font-extrabold">
                          {formatSessionValue(
                            group.duration_minutes,
                            group.start_time,
                            group.end_time
                          )}
                        </td>

                        <td className="border-r px-4 py-4">
                          {classList || "-"}
                        </td>

                        <td className="border-r px-4 py-4">
                          {group.subject_name}
                        </td>

                        <td className="max-w-[260px] border-r px-4 py-4">
                          {group.material_topic ? (
                            <p className="line-clamp-3 font-bold">
                              {group.material_topic}
                            </p>
                          ) : (
                            <span className="text-[12px] text-[#64748B]">
                              Belum diisi guru
                            </span>
                          )}
                        </td>

                        {/* SISWA */}
                        <td className="min-w-[230px] border-r p-0 align-top">
                          <div className="divide-y divide-[#F0E1D4]">
                            {group.students.map((student) => (
                              <button
                                key={`${group.key}-${student.id}-name`}
                                type="button"
                                onClick={() => setSelectedGroup(group)}
                                className="flex min-h-12 w-full items-center px-4 py-2 text-left text-[13px] font-bold transition hover:bg-[#FFF8EF]"
                              >
                                {student.student_name}
                              </button>
                            ))}
                          </div>
                        </td>

                        {/* HADIR */}
                        <td className="w-[76px] border-r p-0 align-top">
                          <div className="divide-y divide-[#F0E1D4]">
                            {group.students.map((student) => (
                              <div
                                key={`${group.key}-${student.id}-hadir`}
                                className="flex min-h-12 items-center justify-center px-2 py-2"
                              >
                                {student.attendance_status === "Hadir" ? (
                                  <span className="inline-flex h-7 w-10 items-center justify-center rounded-md bg-[#22C55E] font-extrabold text-white">
                                    ✓
                                  </span>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* IZIN */}
                        <td className="w-[76px] border-r p-0 align-top">
                          <div className="divide-y divide-[#F0E1D4]">
                            {group.students.map((student) => (
                              <div
                                key={`${group.key}-${student.id}-izin`}
                                className="flex min-h-12 items-center justify-center px-2 py-2"
                              >
                                {student.attendance_status === "Izin" ? (
                                  <span className="inline-flex h-7 w-10 items-center justify-center rounded-md bg-[#7C3AED] font-extrabold text-white">
                                    ✓
                                  </span>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* ALPA */}
                        <td className="w-[76px] border-r p-0 align-top">
                          <div className="divide-y divide-[#F0E1D4]">
                            {group.students.map((student) => (
                              <div
                                key={`${group.key}-${student.id}-alpa`}
                                className="flex min-h-12 items-center justify-center px-2 py-2"
                              >
                                {student.attendance_status === "Alpa" ? (
                                  <span className="inline-flex h-7 w-10 items-center justify-center rounded-md bg-[#DC2626] font-extrabold text-white">
                                    ✓
                                  </span>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* KETERANGAN */}
                        <td className="min-w-[230px] border-r p-0 align-top">
                          <div className="divide-y divide-[#F0E1D4]">
                            {group.students.map((student) => (
                              <div
                                key={`${group.key}-${student.id}-note`}
                                className="flex min-h-12 items-center px-4 py-2 text-[13px] text-[#6F5549]"
                              >
                                {student.attendance_note ||
                                  group.notes ||
                                  "-"}
                              </div>
                            ))}
                          </div>
                        </td>

                        <td className="print-hidden px-4 py-4">
                          {group.temporary_schedule_url ? (
                            <a
                              href={group.temporary_schedule_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[12px] font-extrabold text-[#8C0F2D]"
                            >
                              <FileText className="h-4 w-4" />
                              Lihat File
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>

                        <td className="print-hidden px-4 py-4">
                          {group.students.some(
                            (item) => item.data_source === "schedule"
                          ) ? (
                            <button
                              type="button"
                              onClick={() => void handleDeleteGroup(group)}
                              className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#FECACA] px-3 text-[13px] font-extrabold text-[#DC2626]"
                            >
                              <Trash2 className="h-4 w-4" />
                              Hapus
                            </button>
                          ) : (
                            <span className="inline-flex rounded-full bg-[#E8F5EE] px-3 py-1 text-[11px] font-extrabold text-[#158A58]">
                              Input Guru
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-8">
          <div className="max-h-[92vh] w-full max-w-[920px] overflow-y-auto rounded-[22px] bg-[#FFF8EF] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E1CFBE] bg-[#FFF8EF] px-6 py-5">
              <div>
                <h2 className="text-[22px] font-extrabold">
                  Tambah Jadwal Rombel
                </h2>

                <p className="mt-1 text-[13px] text-[#6F5549]">
                  Admin hanya mengatur jam KBM siswa. Jam datang/pulang
                  guru dan materi pembelajaran diisi oleh guru.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-full p-2"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="grid gap-4 md:grid-cols-2">
                <FormGroup label="Nama Guru">
                  <select
                    value={form.teacher_id}
                    onChange={(event) => {
                      const teacherId = event.target.value;

                      setForm((previous) => ({
                        ...previous,
                        teacher_id: teacherId,
                        subject_id: "",
                      }));

                      setSelectedStudentIds([]);
                    }}
                    className="h-12 w-full rounded-xl border px-4"
                  >
                    <option value="">Pilih guru</option>

                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.full_name}
                      </option>
                    ))}
                  </select>
                </FormGroup>

                <FormGroup label="Mapel">
                  <select
                    value={form.subject_id}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        subject_id: event.target.value,
                      }))
                    }
                    className="h-12 w-full rounded-xl border px-4"
                  >
                    <option value="">Pilih mata pelajaran</option>

                    {subjectOptionsForSchedule.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {getSubjectLabel(subject)}
                      </option>
                    ))}
                  </select>
                </FormGroup>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormGroup label="Tanggal">
                  <input
                    type="date"
                    value={form.schedule_date}
                    onChange={(event) => {
                      const dateValue = event.target.value;

                      setForm((previous) => ({
                        ...previous,
                        schedule_date: dateValue,
                        day_name: getDayName(dateValue),
                      }));
                    }}
                    className="h-12 w-full rounded-xl border px-4"
                  />
                </FormGroup>

                <FormGroup label="Hari">
                  <select
                    value={form.day_name}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        day_name: event.target.value,
                      }))
                    }
                    className="h-12 w-full rounded-xl border px-4"
                  >
                    {dayOptions.map((day) => (
                      <option key={day}>{day}</option>
                    ))}
                  </select>
                </FormGroup>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <FormGroup label="Jam Mulai KBM Siswa">
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        start_time: event.target.value,
                      }))
                    }
                    className="h-12 w-full rounded-xl border px-4"
                  />
                </FormGroup>

                <FormGroup label="Jam Selesai KBM Siswa">
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        end_time: event.target.value,
                      }))
                    }
                    className="h-12 w-full rounded-xl border px-4"
                  />
                </FormGroup>

                <FormGroup label="Jam Siswa">
                  <input
                    value={
                      form.start_time && form.end_time
                        ? `${formatTime(form.start_time)}-${formatTime(
                          form.end_time
                        )}`
                        : "-"
                    }
                    readOnly
                    className="h-12 w-full rounded-xl border bg-[#FFF8EF] px-4"
                  />
                </FormGroup>

                <FormGroup label="Sesi">
                  <input
                    value={formatSessionValue(
                      calculateDurationMinutes(
                        form.start_time,
                        form.end_time
                      )
                    )}
                    readOnly
                    className="h-12 w-full rounded-xl border bg-[#FFF8EF] px-4"
                  />
                </FormGroup>
              </div>

              <FormGroup label="Semester">
                <select
                  value={form.semester}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      semester: event.target.value,
                    }))
                  }
                  className="h-12 w-full rounded-xl border px-4"
                >
                  {semesterOptions.map((semester) => (
                    <option key={semester}>{semester}</option>
                  ))}
                </select>
              </FormGroup>

              <FormGroup label="Keterangan">
                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      notes: event.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full rounded-xl border px-4 py-3"
                />
              </FormGroup>

              <div className="rounded-2xl border bg-white p-5">
                <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border bg-[#FFF8EF]">
                  <UploadCloud className="h-4 w-4" />
                  Pilih File Jadwal

                  <input
                    type="file"
                    className="hidden"
                    onChange={(event) =>
                      setTemporaryScheduleFile(
                        event.target.files?.[0] || null
                      )
                    }
                  />
                </label>
              </div>

              <div className="rounded-2xl border bg-white p-5">
                <div className="flex items-center justify-between">
                  <p className="font-extrabold">
                    Pilih Siswa Rombel ({selectedStudentIds.length})
                  </p>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllFilteredStudents}
                      className="rounded-xl border px-3 py-2 text-xs"
                    >
                      Pilih Semua
                    </button>

                    <button
                      type="button"
                      onClick={clearSelectedStudents}
                      className="rounded-xl border px-3 py-2 text-xs"
                    >
                      Kosongkan
                    </button>
                  </div>
                </div>

                <input
                  value={studentSearch}
                  onChange={(event) =>
                    setStudentSearch(event.target.value)
                  }
                  placeholder="Cari siswa..."
                  className="mt-4 h-11 w-full rounded-xl border px-4"
                />

                <div className="mt-4 max-h-[280px] overflow-y-auto rounded-xl border">
                  {filteredStudents.map((student) => {
                    const checked =
                      selectedStudentIds.includes(student.id);

                    return (
                      <label
                        key={student.id}
                        className="flex cursor-pointer items-center justify-between border-b px-4 py-3"
                      >
                        <div>
                          <p className="font-bold">
                            {student.full_name}
                          </p>

                          <p className="text-xs text-[#6F5549]">
                            {formatClass(
                              student.level,
                              student.grade
                            )}
                          </p>
                        </div>

                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleStudent(student.id)}
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleSaveSchedule()}
                disabled={saving}
                className="h-12 w-full rounded-xl bg-[#8C0F2D] font-extrabold text-white disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Simpan Jadwal Rombel"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedGroup ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-8">
          <div className="max-h-[90vh] w-full max-w-[800px] overflow-y-auto rounded-[22px] bg-[#FFF8EF] p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold">
                  Detail Rombel
                </h2>

                <p className="text-sm text-[#6F5549]">
                  {selectedGroup.teacher_name} •{" "}
                  {selectedGroup.subject_name}
                </p>

                <p className="mt-1 text-xs text-[#8A6A5A]">
                  Datang Guru:{" "}
                  {formatTime(selectedGroup.teacher_arrival_time)} •
                  Pulang Guru:{" "}
                  {formatTime(selectedGroup.teacher_departure_time)} •
                  Jam Siswa: {formatTime(selectedGroup.start_time)}-
                  {formatTime(selectedGroup.end_time)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedGroup(null)}
              >
                <X />
              </button>
            </div>

            <div className="mt-5 overflow-hidden rounded-xl border bg-white">
              {selectedGroup.students.map((student, index) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between border-b px-5 py-4 last:border-b-0"
                >
                  <div>
                    <p className="font-extrabold">
                      {index + 1}. {student.student_name}
                    </p>

                    <p className="mt-1 text-xs text-[#6F5549]">
                      {formatClass(
                        student.student_level,
                        student.student_grade
                      )}
                    </p>
                  </div>

                  <span className="rounded-full bg-[#FFF8EF] px-3 py-1 text-xs font-bold">
                    {student.attendance_status || "Belum diabsen"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </KepalaSekolahLayout>
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

      <p className="text-[26px] font-extrabold leading-none">
        {value}
      </p>

      <p className="mt-2 text-[13px] text-[#6B4A3A]">
        {label}
      </p>
    </div>
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
      <p className="mb-2 text-[13px] font-extrabold">
        {label}
      </p>

      {children}
    </label>
  );
}