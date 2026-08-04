"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Save,
  Search,
  Users,
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

type AttendanceStudent = StudentRow & {
  attendanceStatus: string;
  understandingStatus: string;
  note: string;
};

const ACADEMIC_YEAR = "2026/2027";

const understandingOptions = ["Paham", "Cukup Paham", "Belum Paham"];

function normalizeAttendanceStatus(status?: string | null) {
  if (status === "Tidak Hadir") return "Alpa";
  if (status === "Sakit") return "Izin";
  if (status === "Izin") return "Izin";
  if (status === "Alpa") return "Alpa";
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
  const cleanLevel = normalizeLevel(level);
  const cleanGrade = grade || "";

  if (cleanLevel && cleanGrade) return `${cleanLevel} ${cleanGrade}`;
  if (cleanLevel) return cleanLevel;
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

  if (hour > 0 && minute > 0) return `${hour} jam ${minute} menit`;
  if (hour > 0) return `${hour} jam`;

  return `${minute} menit`;
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

  if (level && grade) return `${subject.name || "-"} — ${level} ${grade}`;
  if (grade) return `${subject.name || "-"} — ${grade}`;
  if (level) return `${subject.name || "-"} — ${level}`;

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

  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState(todayYMD());
  const [classFilter, setClassFilter] = useState("");

  const [subjectId, setSubjectId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [sessionName, setSessionName] = useState("Sesi 1");
  const [materialTopic, setMaterialTopic] = useState("");
  const [attendanceNote, setAttendanceNote] = useState("");

  const [attendanceStudents, setAttendanceStudents] = useState<
    AttendanceStudent[]
  >([]);

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

      if (error) throw new Error(error.message);
      if (data) return data as TeacherRow;
    }

    if (teacherCode) {
      const { data, error } = await supabase
        .from("teachers")
        .select("*")
        .eq("teacher_code", teacherCode)
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (data) return data as TeacherRow;
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

      if (relationsRes.error) throw new Error(relationsRes.error.message);
      if (attendanceRes.error) throw new Error(attendanceRes.error.message);

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

        if (error) throw new Error(error.message);

        studentsData = (data || []) as StudentRow[];
      }

      if (subjectIds.length > 0) {
        const { data, error } = await supabase
          .from("subjects")
          .select("*")
          .in("id", subjectIds)
          .order("name");

        if (error) throw new Error(error.message);

        subjectsData = (data || []) as SubjectRow[];
      }

      setStudents(studentsData);
      setSubjects(subjectsData);
      setStudentTeachers(relationsData);
      setAttendance(attendanceData);

      if (subjectId) {
        const subjectStillAllowed = subjectIds.includes(subjectId);

        if (!subjectStillAllowed) {
          setSubjectId("");
          setAttendanceStudents([]);
        }
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
    fetchData();

    const channel = supabase
      .channel("teacher-absensi-kbm-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teachers" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "student_teachers" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subjects" },
        () => fetchData()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const subjectOptions = useMemo(() => {
    return [...subjects].sort((a, b) => {
      const nameA = getSubjectLabel(a);
      const nameB = getSubjectLabel(b);

      return nameA.localeCompare(nameB);
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

    return students.filter((student) => studentIdsBySelectedSubject.has(student.id));
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
        item.start_time === startTime &&
        item.end_time === endTime
      ) {
        map.set(item.student_id, item);
      }
    });

    return map;
  }, [attendance, teacher?.id, subjectId, dateFilter, startTime, endTime]);

  const summary = useMemo(() => {
    const todayAttendance = attendance.filter((item) => {
      return item.attendance_date === dateFilter;
    });

    const selectedClassStudents = studentsInSelectedClass.length;

    const completedStudents = attendanceStudents.filter((student) => {
      return Boolean(existingAttendanceByStudent.get(student.id));
    }).length;

    const present = attendanceStudents.filter((student) =>
      isHadir(student.attendanceStatus)
    ).length;

    const absent = attendanceStudents.filter(
      (student) =>
        isIzin(student.attendanceStatus) || isAlpa(student.attendanceStatus)
    ).length;

    return {
      totalStudents: selectedClassStudents,
      attendanceToday: todayAttendance.length,
      completedStudents,
      present,
      absent,
    };
  }, [
    attendance,
    dateFilter,
    studentsInSelectedClass.length,
    attendanceStudents,
    existingAttendanceByStudent,
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
      !startTime ||
      !endTime
    ) {
      setAttendanceStudents([]);
      return;
    }

    const duration = calculateDurationMinutes(startTime, endTime);

    if (!duration || studentsInSelectedClass.length === 0) {
      setAttendanceStudents([]);
      return;
    }

    const nextStudents: AttendanceStudent[] = studentsInSelectedClass.map(
      (student) => {
        const existing = existingAttendanceByStudent.get(student.id);

        return {
          ...student,
          attendanceStatus: normalizeAttendanceStatus(
            existing?.attendance_status
          ),
          understandingStatus: existing?.understanding_status || "Paham",
          note: getAttendanceNote(existing),
        };
      }
    );

    setAttendanceStudents(nextStudents);
  }, [
    teacher?.id,
    subjectId,
    classFilter,
    dateFilter,
    startTime,
    endTime,
    studentsInSelectedClass,
    existingAttendanceByStudent,
  ]);

  function updateStudentAttendance(
    studentId: string,
    field: "attendanceStatus" | "understandingStatus" | "note",
    value: string
  ) {
    setAttendanceStudents((prev) =>
      prev.map((student) => {
        if (student.id !== studentId) return student;

        const next = {
          ...student,
          [field]: value,
        };

        if (field === "attendanceStatus" && value === "Hadir") {
          next.note = "";
          next.understandingStatus = "Paham";
        }

        if (field === "attendanceStatus" && value !== "Hadir") {
          next.understandingStatus = "-";
        }

        return next;
      })
    );
  }

  function markAllPresent() {
    if (attendanceStudents.length === 0) {
      alert("Klik tombol Tampilkan Siswa terlebih dahulu.");
      return;
    }

    setAttendanceStudents((prev) =>
      prev.map((student) => ({
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

    if (!startTime || !endTime) {
      alert("Isi jam datang dan pulang terlebih dahulu.");
      return false;
    }

    const duration = calculateDurationMinutes(startTime, endTime);

    if (!duration) {
      alert("Jam pulang harus lebih besar dari jam datang.");
      return false;
    }

    if (!materialTopic.trim()) {
      alert("Isi materi pembelajaran terlebih dahulu.");
      return false;
    }

    if (attendanceStudents.length === 0) {
      alert("Pilih kelas yang memiliki siswa terlebih dahulu.");
      return false;
    }

    const missingNote = attendanceStudents.find((student) => {
      return student.attendanceStatus !== "Hadir" && !student.note.trim();
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

    if (!teacher?.id) return;

    setSaving(true);

    try {
      const now = new Date().toISOString();
      const dayName = getDayNameFromDate(dateFilter);
      const durationMinutes = calculateDurationMinutes(startTime, endTime);

      const { error: deleteAttendanceError } = await supabase
        .from("attendance")
        .delete()
        .eq("teacher_id", teacher.id)
        .eq("subject_id", subjectId)
        .eq("attendance_date", dateFilter)
        .eq("start_time", startTime)
        .eq("end_time", endTime);

      if (deleteAttendanceError) {
        throw new Error(deleteAttendanceError.message);
      }

      const attendancePayload = attendanceStudents.map((student) => ({
        teacher_id: teacher.id,
        student_id: student.id,
        subject_id: subjectId,
        attendance_date: dateFilter,
        day_name: dayName,
        start_time: startTime,
        end_time: endTime,
        duration_minutes: durationMinutes,
        session_name: sessionName.trim() || null,
        attendance_status: student.attendanceStatus,
        understanding_status:
          student.attendanceStatus === "Hadir"
            ? student.understandingStatus
            : "-",
        material_topic: materialTopic.trim(),
        note: student.note.trim() || attendanceNote.trim() || null,
        notes: student.note.trim() || attendanceNote.trim() || null,
        created_at: now,
        updated_at: now,
      }));

      const { error: insertAttendanceError } = await supabase
        .from("attendance")
        .insert(attendancePayload);

      if (insertAttendanceError) {
        throw new Error(insertAttendanceError.message);
      }

      await fetchData();

      alert("Absensi KBM berhasil disimpan.");
      setAttendanceStudents([]);
    } catch (error) {
      alert(
        `Gagal simpan absensi: ${
          error instanceof Error ? error.message : "Terjadi kesalahan"
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
            Absensi KBM
          </h1>

          <p className="mt-2 max-w-[900px] text-[15px] leading-6 text-[#6F5549]">
            Guru dapat input absensi secara mandiri tanpa integrasi Program
            Semester, Bab/Sub Bab, atau Jadwal Guru. Pilih mapel lalu ketik atau
            pilih kelas; seluruh siswa pada kelas tersebut akan langsung muncul,
            selama sudah terhubung dengan guru dan mapel.
          </p>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-[14px] leading-6 text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {!loading && teacher && students.length === 0 ? (
          <div className="rounded-2xl border border-[#E8D6C1] bg-white px-5 py-4 text-[14px] leading-6 text-[#6F5549]">
            Belum ada siswa yang terhubung ke guru ini. Hubungkan siswa dengan
            guru dan mapel dari menu Kepala Sekolah → Siswa.
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
                onChange={(event) => {
                  setSearch(event.target.value);
                }}
                placeholder="Cari nama siswa, NIPD, NISN, kelas, atau level..."
                className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] pl-11 pr-4 text-[14px] outline-none placeholder:text-[#9A7B6C] focus:border-[#9C0824]"
              />
            </div>

            <div>
              <input
                list="teacher-attendance-class-options"
                value={classFilter}
                onChange={(event) => {
                  setClassFilter(event.target.value);
                  resetAttendanceInput();
                }}
                placeholder="Ketik atau pilih kelas, contoh SMP 8"
                className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none placeholder:text-[#9A7B6C] focus:border-[#9C0824]"
              />

              <datalist id="teacher-attendance-class-options">
                {classOptions.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>

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
        </div>

        <div className="space-y-5">
          <div className="rounded-[22px] border border-[#E1CFBE] bg-white shadow-sm">
            <div className="border-b border-[#EADACA] px-5 py-4">
              <h2 className="text-[18px] font-extrabold text-[#2B1B18]">
                Pengaturan Absensi
              </h2>

              <p className="mt-1 text-[13px] text-[#6F5549]">
                Pilih mapel lalu ketik atau pilih kelas. Semua siswa pada
                kelas tersebut langsung muncul otomatis untuk diabsen.
              </p>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <FormGroup label="Datang">
                  <input
                    type="time"
                    value={startTime}
                    onChange={(event) => {
                      setStartTime(event.target.value);
                      resetAttendanceInput();
                    }}
                    className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
                  />
                </FormGroup>

                <FormGroup label="Pulang">
                  <input
                    type="time"
                    value={endTime}
                    onChange={(event) => {
                      setEndTime(event.target.value);
                      resetAttendanceInput();
                    }}
                    className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
                  />
                </FormGroup>

                <FormGroup label="Jam">
                  <input
                    value={
                      startTime && endTime
                        ? `${formatTime(startTime)}-${formatTime(endTime)}`
                        : "-"
                    }
                    readOnly
                    className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-[#FFF8EF] px-4 text-[14px] font-bold text-[#8C0F2D] outline-none"
                  />
                </FormGroup>

                <FormGroup label="Durasi">
                  <input
                    value={formatDuration(null, startTime, endTime)}
                    readOnly
                    className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-[#FFF8EF] px-4 text-[14px] font-bold text-[#8C0F2D] outline-none"
                  />
                </FormGroup>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormGroup label="Sesi">
                  <input
                    value={sessionName}
                    onChange={(event) => setSessionName(event.target.value)}
                    placeholder="Contoh: Sesi 1"
                    className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
                  />
                </FormGroup>

                <FormGroup label="Materi">
                  <input
                    value={materialTopic}
                    onChange={(event) => setMaterialTopic(event.target.value)}
                    placeholder="Contoh: Pecahan Senilai"
                    className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
                  />
                </FormGroup>

              </div>

              <FormGroup label="Keterangan Umum">
                <textarea
                  value={attendanceNote}
                  onChange={(event) => setAttendanceNote(event.target.value)}
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
                  Absensi ini berdiri sendiri. Tidak otomatis mengubah Program
                  Semester, tidak mengambil Bab/Sub Bab, dan tidak wajib
                  terhubung ke Jadwal Guru.
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
                    ? `${getSubjectLabel(selectedSubject)} • ${formatDate(
                        dateFilter
                      )}`
: "Pilih mapel lalu ketik atau pilih kelas. Siswa akan muncul otomatis."}
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
                  <InfoItem label="Hari" value={getDayNameFromDate(dateFilter)} />
                  <InfoItem label="Tanggal" value={formatDate(dateFilter)} />
                  <InfoItem label="Datang" value={formatTime(startTime)} />
                  <InfoItem label="Pulang" value={formatTime(endTime)} />
                  <InfoItem
                    label="Jam"
                    value={`${formatTime(startTime)}-${formatTime(endTime)}`}
                  />
                  <InfoItem
                    label="Durasi"
                    value={formatDuration(null, startTime, endTime)}
                  />
                  <InfoItem label="Sesi" value={sessionName || "-"} />
                  <InfoItem label="Keterangan" value={attendanceNote || "-"} />
                </div>
              </div>
            ) : null}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1280px] border-collapse">
                <thead>
                  <tr className="border-b border-[#EADACA] bg-[#FFF8EF] text-left text-[13px] font-extrabold text-[#6F5549]">
                    <th rowSpan={2} className="border-r border-[#EADACA] px-5 py-4">
                      No
                    </th>
                    <th rowSpan={2} className="border-r border-[#EADACA] px-5 py-4">
                      Nama
                    </th>
                    <th rowSpan={2} className="border-r border-[#EADACA] px-5 py-4">
                      Datang
                    </th>
                    <th rowSpan={2} className="border-r border-[#EADACA] px-5 py-4">
                      Pulang
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
                    <th rowSpan={2} className="px-5 py-4">
                      Keterangan
                    </th>
                  </tr>

                  <tr className="border-b border-[#EADACA] bg-[#FFF8EF] text-left text-[13px] font-extrabold text-[#6F5549]">
                    <th className="border-r border-[#EADACA] px-5 py-3">Jam</th>
                    <th className="border-r border-[#EADACA] px-5 py-3">Sesi</th>
                    <th className="border-r border-[#EADACA] px-5 py-3">Kls</th>
                    <th className="border-r border-[#EADACA] px-5 py-3">Mapel</th>
                    <th className="border-r border-[#EADACA] px-5 py-3">Materi</th>
                    <th className="border-r border-[#EADACA] px-5 py-3">Siswa</th>
                  </tr>
                </thead>

                <tbody>
                  {attendanceStudents.length === 0 ? (
                    <tr>
                      <td
                        colSpan={14}
                        className="px-5 py-12 text-center text-[#6F5549]"
                      >
                        Pilih mapel dan ketik/pilih kelas untuk menampilkan semua siswa.
                      </td>
                    </tr>
                  ) : (
                    attendanceStudents.map((student, index) => (
                      <tr
                        key={student.id}
                        className="border-b border-[#F0E1D4] text-[14px]"
                      >
                        <td className="border-r border-[#F0E1D4] px-5 py-4 font-bold">
                          {index + 1}
                        </td>

                        <td className="border-r border-[#F0E1D4] px-5 py-4">
                          <p className="font-extrabold text-[#2B1B18]">
                            {student.full_name}
                          </p>

                          <p className="mt-1 text-[12px] text-[#6F5549]">
                            NIPD: {student.nis || "-"}
                            {student.nisn ? ` • NISN: ${student.nisn}` : ""}
                          </p>
                        </td>

                        <td className="whitespace-nowrap border-r border-[#F0E1D4] px-5 py-4 text-[#6F5549]">
                          {formatTime(startTime)}
                        </td>

                        <td className="whitespace-nowrap border-r border-[#F0E1D4] px-5 py-4 text-[#6F5549]">
                          {formatTime(endTime)}
                        </td>

                        <td className="whitespace-nowrap border-r border-[#F0E1D4] px-5 py-4 text-[#6F5549]">
                          {formatTime(startTime)}-{formatTime(endTime)}
                        </td>

                        <td className="border-r border-[#F0E1D4] px-5 py-4 text-[#6F5549]">
                          {sessionName || "-"}
                        </td>

                        <td className="border-r border-[#F0E1D4] px-5 py-4 text-[#6F5549]">
                          {formatClass(student.level, student.grade)}
                        </td>

                        <td className="border-r border-[#F0E1D4] px-5 py-4 text-[#6F5549]">
                          {getSubjectLabel(selectedSubject)}
                        </td>

                        <td className="min-w-[220px] border-r border-[#F0E1D4] px-5 py-4 font-bold text-[#2B1B18]">
                          {materialTopic || "-"}
                        </td>

                        <td className="border-r border-[#F0E1D4] px-5 py-4 text-[#6F5549]">
                          {student.full_name || "-"}
                        </td>

                        <td className="border-r border-[#F0E1D4] px-5 py-4 text-center">
                          <ChecklistButton
                            checked={isHadir(student.attendanceStatus)}
                            onClick={() =>
                              updateStudentAttendance(
                                student.id,
                                "attendanceStatus",
                                "Hadir"
                              )
                            }
                          />
                        </td>

                        <td className="border-r border-[#F0E1D4] px-5 py-4 text-center">
                          <ChecklistButton
                            checked={isIzin(student.attendanceStatus)}
                            onClick={() =>
                              updateStudentAttendance(
                                student.id,
                                "attendanceStatus",
                                "Izin"
                              )
                            }
                          />
                        </td>

                        <td className="border-r border-[#F0E1D4] px-5 py-4 text-center">
                          <ChecklistButton
                            checked={isAlpa(student.attendanceStatus)}
                            onClick={() =>
                              updateStudentAttendance(
                                student.id,
                                "attendanceStatus",
                                "Alpa"
                              )
                            }
                          />
                        </td>

                        <td className="min-w-[260px] px-5 py-4">
                          <div className="space-y-2">
                            <select
                              value={student.understandingStatus}
                              onChange={(event) =>
                                updateStudentAttendance(
                                  student.id,
                                  "understandingStatus",
                                  event.target.value
                                )
                              }
                              disabled={student.attendanceStatus !== "Hadir"}
                              className="h-10 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-3 text-[13px] outline-none focus:border-[#9C0824] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {student.attendanceStatus !== "Hadir" ? (
                                <option>-</option>
                              ) : (
                                understandingOptions.map((option) => (
                                  <option key={option}>{option}</option>
                                ))
                              )}
                            </select>

                            <input
                              value={student.note}
                              onChange={(event) =>
                                updateStudentAttendance(
                                  student.id,
                                  "note",
                                  event.target.value
                                )
                              }
                              placeholder={
                                student.attendanceStatus === "Hadir"
                                  ? "Keterangan opsional"
                                  : "Wajib isi alasan"
                              }
                              className="h-10 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-3 text-[13px] outline-none placeholder:text-[#9A7B6C] focus:border-[#9C0824]"
                            />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-5">
              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={saving || attendanceStudents.length === 0 || !teacher}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#8C0F2D] text-[15px] font-extrabold text-white shadow-sm transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? "Menyimpan..." : "Simpan Absensi KBM"}
              </button>
            </div>
          </div>
        </div>
      </section>
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

      <p className="mt-2 text-[13px] text-[#6B4A3A]">{label}</p>
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

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#8A5A48]">
        {label}
      </p>
      <p className="mt-1 font-extrabold text-[#2B1B18]">{value}</p>
    </div>
  );
}