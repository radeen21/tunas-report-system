"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { supabase } from "@/lib/supabase";
import TeacherLayout from "../components/TeacherLayout";

type Teacher = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  teacher_code: string | null;
  subjects?: string[] | string | null;
};

type Parent = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  relation: string | null;
};

type StudentRow = {
  id: string;
  user_id: string | null;
  parent_id: string | null;
  homeroom_teacher_id: string | null;
  nis: string | null;
  nisn: string | null;
  full_name: string;
  level: string | null;
  grade: string | null;
  academic_year: string | null;
  status: string | null;
  birth_date: string | null;
  progress: number | null;
  attendance: number | null;
  created_at: string | null;
  parents: Parent | Parent[] | null;
};

type Student = {
  id: string;
  user_id: string | null;
  parent_id: string | null;
  homeroom_teacher_id: string | null;
  nis: string | null;
  nisn: string | null;
  full_name: string;
  level: string | null;
  grade: string | null;
  academic_year: string | null;
  status: string | null;
  birth_date: string | null;
  progress: number | null;
  attendance: number | null;
  created_at: string | null;
  parents: Parent | null;
};

type StudentTeacherRow = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  academic_year: string | null;
  notes?: string | null;
};

type AcademicReportRow = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id?: string | null;
  final_score: number | null;
  final_grade?: number | null;
  status: string | null;
};

type AttendanceRow = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id?: string | null;
  attendance_status: string | null;
};

type Subject = {
  id: string;
  name: string;
  level: string | null;
  grade: string | null;
};

type KbmForm = {
  student_id: string;
  subject_id: string;
  report_date: string;
  class_level: string;
  semester: string;
  chapter: string;
  material_topic: string;
  learning_issue: string;
  solution: string;
  teacher_note: string;
  status: string;
};

const ACADEMIC_YEAR = "2026/2027";

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function createInitialKbmForm(): KbmForm {
  return {
    student_id: "",
    subject_id: "",
    report_date: getTodayDate(),
    class_level: "",
    semester: "Genap",
    chapter: "",
    material_topic: "",
    learning_issue: "",
    solution: "",
    teacher_note: "",
    status: "pending_review",
  };
}

function normalizeRelation<T>(value: T | T[] | null): T | null {
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

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(date: string | null) {
  if (!date) return "-";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "-";

  return parsedDate.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusBadge(status: string | null) {
  if (status === "active") return "bg-emerald-100 text-emerald-700";
  if (status === "inactive") return "bg-red-100 text-red-700";

  return "bg-slate-200 text-slate-700";
}

function getProgressColor(progress: number | null) {
  const value = Number(progress || 0);

  if (value >= 80) return "bg-emerald-600";
  if (value >= 60) return "bg-yellow-500";

  return "bg-red-500";
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getSubjectLabel(subject?: Subject | null) {
  if (!subject) return "-";

  const level = subject.level ? normalizeLevel(subject.level) : "";
  const grade = subject.grade || "";

  if (level && grade) return `${subject.name || "-"} — ${level} ${grade}`;
  if (grade) return `${subject.name || "-"} — ${grade}`;
  if (level) return `${subject.name || "-"} — ${level}`;

  return subject.name || "-";
}

function formatTeacherSubjects(subjects?: string[] | string | null) {
  if (!subjects) return "-";

  if (Array.isArray(subjects)) {
    return subjects.join(", ") || "-";
  }

  return subjects || "-";
}

export default function TeacherStudentsPage() {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentTeachers, setStudentTeachers] = useState<StudentTeacherRow[]>(
    []
  );
  const [academicReports, setAcademicReports] = useState<AcademicReportRow[]>(
    []
  );
  const [attendanceList, setAttendanceList] = useState<AttendanceRow[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("Semua Level");
  const [statusFilter, setStatusFilter] = useState("Semua Status");

  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentNameInput, setStudentNameInput] = useState("");
  const [savingStudentName, setSavingStudentName] = useState(false);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [savingReport, setSavingReport] = useState(false);
  const [reportForm, setReportForm] = useState<KbmForm>(
    createInitialKbmForm()
  );

  async function fetchActiveTeacher() {
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
        .select("id, full_name, email, phone, teacher_code, subjects")
        .ilike("email", email)
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);

      if (data) {
        const activeTeacher = data as Teacher;
        setTeacher(activeTeacher);
        return activeTeacher;
      }
    }

    if (teacherCode) {
      const { data, error } = await supabase
        .from("teachers")
        .select("id, full_name, email, phone, teacher_code, subjects")
        .eq("teacher_code", teacherCode)
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);

      if (data) {
        const activeTeacher = data as Teacher;
        setTeacher(activeTeacher);
        return activeTeacher;
      }
    }

    setTeacher(null);
    return null;
  }

  async function fetchStudentsByRelation(teacherId: string) {
    const { data: relationData, error: relationError } = await supabase
      .from("student_teachers")
      .select("*")
      .eq("teacher_id", teacherId)
      .eq("academic_year", ACADEMIC_YEAR);

    if (relationError) {
      throw new Error(relationError.message);
    }

    const relations = (relationData || []) as StudentTeacherRow[];

    setStudentTeachers(relations);

    const studentIds = uniqueStrings(
      relations.map((relation) => relation.student_id || "")
    );

    const subjectIds = uniqueStrings(
      relations.map((relation) => relation.subject_id || "")
    );

    if (studentIds.length === 0) {
      setStudents([]);
      setSubjects([]);
      return;
    }

    const [studentsRes, subjectsRes] = await Promise.all([
      supabase
        .from("students")
        .select(
          `
            id,
            user_id,
            parent_id,
            homeroom_teacher_id,
            nis,
            nisn,
            full_name,
            level,
            grade,
            academic_year,
            status,
            birth_date,
            progress,
            attendance,
            created_at,
            parents (
              id,
              full_name,
              email,
              phone,
              relation
            )
          `
        )
        .in("id", studentIds)
        .order("full_name", { ascending: true }),

      subjectIds.length > 0
        ? supabase
            .from("subjects")
            .select("id, name, level, grade")
            .in("id", subjectIds)
            .order("name", { ascending: true })
        : Promise.resolve({
            data: [] as Subject[],
            error: null,
          }),
    ]);

    if (studentsRes.error) {
      throw new Error(studentsRes.error.message);
    }

    if (subjectsRes.error) {
      throw new Error(subjectsRes.error.message);
    }

    const rows = (studentsRes.data || []) as StudentRow[];

    const normalizedStudents: Student[] = rows.map((item) => ({
      id: item.id,
      user_id: item.user_id,
      parent_id: item.parent_id,
      homeroom_teacher_id: item.homeroom_teacher_id,
      nis: item.nis,
      nisn: item.nisn,
      full_name: item.full_name,
      level: item.level,
      grade: item.grade,
      academic_year: item.academic_year,
      status: item.status,
      birth_date: item.birth_date,
      progress: item.progress,
      attendance: item.attendance,
      created_at: item.created_at,
      parents: normalizeRelation(item.parents),
    }));

    setStudents(normalizedStudents);
    setSubjects((subjectsRes.data || []) as Subject[]);
  }

  async function fetchAcademicReports(teacherId: string) {
    const { data, error } = await supabase
      .from("academic_reports")
      .select(
        "id, student_id, teacher_id, subject_id, final_score, final_grade, status"
      )
      .eq("teacher_id", teacherId);

    if (error) {
      throw new Error(error.message);
    }

    setAcademicReports((data || []) as AcademicReportRow[]);
  }

  async function fetchAttendance(teacherId: string) {
    const { data, error } = await supabase
      .from("attendance")
      .select(
        "id, student_id, teacher_id, subject_id, attendance_status"
      )
      .eq("teacher_id", teacherId);

    if (error) {
      throw new Error(error.message);
    }

    setAttendanceList((data || []) as AttendanceRow[]);
  }

  async function fetchPageData() {
    setLoading(true);
    setErrorMessage("");

    try {
      const activeTeacher = await fetchActiveTeacher();

      if (!activeTeacher?.id) {
        setStudents([]);
        setStudentTeachers([]);
        setAcademicReports([]);
        setAttendanceList([]);
        setSubjects([]);
        setErrorMessage(
          "Data guru belum terhubung dengan akun login ini. Hubungkan email guru di tabel teachers atau isi teacher_code."
        );
        return;
      }

      await Promise.all([
        fetchStudentsByRelation(activeTeacher.id),
        fetchAcademicReports(activeTeacher.id),
        fetchAttendance(activeTeacher.id),
      ]);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengambil data murid.");
      }

      setStudents([]);
      setStudentTeachers([]);
      setAcademicReports([]);
      setAttendanceList([]);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchPageData();

    const channel = supabase
      .channel("teacher-students-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        () => void fetchPageData()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "student_teachers",
        },
        () => void fetchPageData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teachers" },
        () => void fetchPageData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subjects" },
        () => void fetchPageData()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "academic_reports",
        },
        () => void fetchPageData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance" },
        () => void fetchPageData()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const filteredStudents = useMemo(() => {
    const keyword = normalizeText(search);

    return students.filter((student) => {
      const level = normalizeLevel(student.level);

      const matchSearch =
        !keyword ||
        normalizeText(student.full_name).includes(keyword) ||
        normalizeText(student.nis).includes(keyword) ||
        normalizeText(student.nisn).includes(keyword) ||
        normalizeText(student.parents?.full_name).includes(keyword) ||
        normalizeText(level).includes(keyword) ||
        normalizeText(student.grade).includes(keyword);

      const matchLevel =
        levelFilter === "Semua Level" || level === levelFilter;

      const matchStatus =
        statusFilter === "Semua Status" ||
        student.status === statusFilter;

      return matchSearch && matchLevel && matchStatus;
    });
  }, [students, search, levelFilter, statusFilter]);

  const subjectMap = useMemo(() => {
    return new Map(
      subjects.map((subject) => [subject.id, subject])
    );
  }, [subjects]);

  const subjectOptionsForSelectedStudent = useMemo(() => {
    if (!reportForm.student_id) return subjects;

    const subjectIds = new Set(
      studentTeachers
        .filter(
          (relation) =>
            relation.student_id === reportForm.student_id
        )
        .map((relation) => relation.subject_id)
        .filter(Boolean) as string[]
    );

    return subjects.filter((subject) =>
      subjectIds.has(subject.id)
    );
  }, [subjects, studentTeachers, reportForm.student_id]);

  const activeStudents = students.filter(
    (student) =>
      student.status === "active" || !student.status
  ).length;

  const sdStudents = students.filter(
    (student) =>
      normalizeLevel(student.level) === "SD"
  ).length;

  const smpStudents = students.filter(
    (student) =>
      normalizeLevel(student.level) === "SMP"
  ).length;

  const smaStudents = students.filter(
    (student) =>
      normalizeLevel(student.level) === "SMA"
  ).length;

  const averageScore = useMemo(() => {
    const studentIds = new Set(
      students.map((student) => student.id)
    );

    const scores = academicReports
      .filter(
        (report) =>
          report.student_id &&
          studentIds.has(report.student_id)
      )
      .map((report) =>
        Number(
          report.final_grade ??
            report.final_score ??
            0
        )
      )
      .filter((score) => score > 0);

    if (scores.length === 0) return 0;

    const total = scores.reduce(
      (sum, score) => sum + score,
      0
    );

    return Math.round(total / scores.length);
  }, [academicReports, students]);

  function getStudentAverageScore(studentId: string) {
    const scores = academicReports
      .filter(
        (report) => report.student_id === studentId
      )
      .map((report) =>
        Number(
          report.final_grade ??
            report.final_score ??
            0
        )
      )
      .filter((score) => score > 0);

    if (scores.length === 0) return 0;

    const total = scores.reduce(
      (sum, score) => sum + score,
      0
    );

    return Math.round(total / scores.length);
  }

  function getStudentAttendancePercentage(
    studentId: string
  ) {
    const records = attendanceList.filter(
      (attendance) =>
        attendance.student_id === studentId
    );

    if (records.length === 0) return 0;

    const present = records.filter(
      (attendance) =>
        normalizeText(
          attendance.attendance_status
        ) === "hadir"
    ).length;

    return Math.round(
      (present / records.length) * 100
    );
  }

  function getStudentSubjectLabels(studentId: string) {
    const relationSubjects = studentTeachers
      .filter(
        (relation) =>
          relation.student_id === studentId
      )
      .map((relation) => {
        if (!relation.subject_id) return null;

        return (
          subjectMap.get(relation.subject_id) || null
        );
      })
      .filter(Boolean) as Subject[];

    if (relationSubjects.length === 0) return "-";

    return relationSubjects
      .map((subject) => subject.name || "-")
      .join(", ");
  }

  function openEditStudentName(student: Student) {
    setErrorMessage("");
    setSuccessMessage("");
    setEditingStudent(student);
    setStudentNameInput(student.full_name);
  }

  function closeEditStudentName() {
    if (savingStudentName) return;

    setEditingStudent(null);
    setStudentNameInput("");
    setErrorMessage("");
  }

  async function handleSaveStudentName() {
    if (!teacher?.id) {
      setErrorMessage(
        "Data guru aktif tidak ditemukan."
      );
      return;
    }

    if (!editingStudent?.id) {
      setErrorMessage(
        "Data siswa tidak ditemukan."
      );
      return;
    }

    const newName = studentNameInput.trim();

    if (!newName) {
      setErrorMessage(
        "Nama siswa wajib diisi."
      );
      return;
    }

    const isConnectedToTeacher =
      studentTeachers.some(
        (relation) =>
          relation.teacher_id === teacher.id &&
          relation.student_id ===
            editingStudent.id &&
          relation.academic_year ===
            ACADEMIC_YEAR
      );

    if (!isConnectedToTeacher) {
      setErrorMessage(
        "Siswa ini tidak terhubung dengan guru aktif."
      );
      return;
    }

    setSavingStudentName(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } = await supabase
        .from("students")
        .update({
          full_name: newName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingStudent.id);

      if (error) {
        throw new Error(error.message);
      }

      setStudents((currentStudents) =>
        currentStudents
          .map((student) =>
            student.id === editingStudent.id
              ? {
                  ...student,
                  full_name: newName,
                }
              : student
          )
          .sort((a, b) =>
            a.full_name.localeCompare(b.full_name)
          )
      );

      setSuccessMessage(
        `Nama siswa berhasil diubah menjadi "${newName}".`
      );

      setEditingStudent(null);
      setStudentNameInput("");

      await fetchPageData();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          "Gagal mengubah nama siswa."
        );
      }
    } finally {
      setSavingStudentName(false);
    }
  }

  function openReportModal(student?: Student) {
    setErrorMessage("");

    const studentSubjects = student
      ? studentTeachers.filter(
          (relation) =>
            relation.student_id === student.id
        )
      : [];

    const firstSubjectId =
      studentSubjects[0]?.subject_id || "";

    setReportForm({
      ...createInitialKbmForm(),
      student_id: student?.id || "",
      subject_id: firstSubjectId,
      class_level: student
        ? formatClass(
            student.level,
            student.grade
          )
        : "",
    });

    setIsReportModalOpen(true);
  }

  function closeReportModal() {
    setIsReportModalOpen(false);
    setErrorMessage("");
    setReportForm(createInitialKbmForm());
  }

  function handleReportStudentChange(
    studentId: string
  ) {
    const selectedStudent = students.find(
      (student) => student.id === studentId
    );

    const studentSubjects = studentTeachers.filter(
      (relation) =>
        relation.student_id === studentId
    );

    const firstSubjectId =
      studentSubjects[0]?.subject_id || "";

    setReportForm((previous) => ({
      ...previous,
      student_id: studentId,
      subject_id: firstSubjectId,
      class_level: selectedStudent
        ? formatClass(
            selectedStudent.level,
            selectedStudent.grade
          )
        : "",
    }));
  }

  function validateKbmReport() {
    if (!teacher?.id) {
      setErrorMessage(
        "Data guru aktif tidak ditemukan."
      );
      return false;
    }

    if (!reportForm.student_id) {
      setErrorMessage("Murid wajib dipilih.");
      return false;
    }

    if (!reportForm.subject_id) {
      setErrorMessage(
        "Mata pelajaran wajib dipilih."
      );
      return false;
    }

    const allowedRelation =
      studentTeachers.some(
        (relation) =>
          relation.student_id ===
            reportForm.student_id &&
          relation.teacher_id === teacher.id &&
          relation.subject_id ===
            reportForm.subject_id
      );

    if (!allowedRelation) {
      setErrorMessage(
        "Murid dan mapel ini belum terhubung dengan guru aktif."
      );
      return false;
    }

    if (!reportForm.report_date) {
      setErrorMessage(
        "Tanggal laporan wajib diisi."
      );
      return false;
    }

    if (!reportForm.material_topic.trim()) {
      setErrorMessage(
        "Materi KBM wajib diisi."
      );
      return false;
    }

    return true;
  }

  async function handleSubmitKbmReport(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setErrorMessage("");

    if (!validateKbmReport()) return;
    if (!teacher?.id) return;

    setSavingReport(true);

    try {
      const now = new Date().toISOString();

      const { error } = await supabase
        .from("kbm_reports")
        .insert({
          student_id: reportForm.student_id,
          teacher_id: teacher.id,
          subject_id: reportForm.subject_id,
          report_date: reportForm.report_date,
          class_level:
            reportForm.class_level.trim() ||
            null,
          semester: reportForm.semester,
          chapter:
            reportForm.chapter.trim() || null,
          material_topic:
            reportForm.material_topic.trim(),
          learning_issue:
            reportForm.learning_issue.trim() ||
            null,
          solution:
            reportForm.solution.trim() || null,
          teacher_note:
            reportForm.teacher_note.trim() ||
            null,
          status: reportForm.status,
          created_at: now,
          updated_at: now,
        });

      if (error) {
        throw new Error(error.message);
      }

      setSuccessMessage(
        "Laporan KBM berhasil disimpan."
      );

      closeReportModal();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          "Gagal menyimpan laporan KBM."
        );
      }
    } finally {
      setSavingReport(false);
    }
  }

  return (
    <TeacherLayout
      activeMenu={"Murid Saya" as any}
      teacherName={teacher?.full_name || "Guru"}
      teacherSubject={formatTeacherSubjects(
        teacher?.subjects ?? null
      )}
      searchPlaceholder="Cari murid saya..."
    >
      <div className="w-full max-w-full overflow-hidden">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#6B4A3A]">
              Teacher Portal
            </p>

            <h1 className="mt-1 text-[30px] font-bold tracking-tight">
              Murid Saya
            </h1>

            <p className="mt-1 text-sm text-[#6B4A3A]">
              Daftar murid yang terhubung dengan{" "}
              <span className="font-bold text-[#2B1B18]">
                {teacher?.full_name ||
                  "guru aktif"}
              </span>{" "}
              melalui data siswa.
            </p>
          </div>

          <button
            type="button"
            onClick={() => openReportModal()}
            disabled={
              !teacher || students.length === 0
            }
            className="w-fit rounded-xl bg-[#7A1F2B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:bg-[#C9AAB2]"
          >
            + Buat Laporan
          </button>
        </div>

        {errorMessage &&
        !isReportModalOpen &&
        !editingStudent ? (
          <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-8 text-center text-sm shadow-sm">
            Loading data murid...
          </div>
        ) : null}

        {!loading &&
        teacher &&
        students.length === 0 ? (
          <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-6 text-sm leading-6 text-[#6B4A3A] shadow-sm">
            Belum ada murid yang terhubung ke guru
            ini. Hubungkan siswa dari menu{" "}
            <span className="font-bold text-[#2B1B18]">
              Kepala Sekolah → Siswa → Edit Siswa
              → Guru yang Mengajar / Mapel
            </span>
            .
          </div>
        ) : null}

        {!loading ? (
          <>
            <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Total Murid"
                value={students.length}
              />

              <SummaryCard
                label="Murid Aktif"
                value={activeStudents}
              />

              <SummaryCard
                label="SD / SMP / SMA"
                value={`${sdStudents}/${smpStudents}/${smaStudents}`}
              />

              <SummaryCard
                label="Rata-rata Nilai"
                value={averageScore}
              />
            </div>

            <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_220px]">
                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Cari nama murid, NIPD, NISN, orang tua..."
                  className="w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                />

                <select
                  value={levelFilter}
                  onChange={(event) =>
                    setLevelFilter(event.target.value)
                  }
                  className="rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                >
                  <option>Semua Level</option>
                  <option>SD</option>
                  <option>SMP</option>
                  <option>SMA</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value
                    )
                  }
                  className="rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                >
                  <option>Semua Status</option>
                  <option value="active">
                    active
                  </option>
                  <option value="inactive">
                    inactive
                  </option>
                </select>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
              <div className="overflow-hidden rounded-2xl border border-[#E8D6C1] bg-white shadow-sm">
                <div className="border-b border-[#E8D6C1] px-6 py-5">
                  <h2 className="text-lg font-bold">
                    Daftar Murid
                  </h2>
                  <p className="mt-1 text-sm text-[#6B4A3A]">
                    Guru dapat memperbaiki nama murid
                    yang terhubung dengannya.
                  </p>
                </div>

                <div className="divide-y divide-[#E8D6C1]">
                  {filteredStudents.length === 0 ? (
                    <div className="px-6 py-10 text-center text-sm text-[#6B4A3A]">
                      Belum ada murid yang sesuai
                      filter.
                    </div>
                  ) : null}

                  {filteredStudents.map(
                    (student) => {
                      const score =
                        getStudentAverageScore(
                          student.id
                        );

                      const attendance =
                        getStudentAttendancePercentage(
                          student.id
                        );

                      const progress = Number(
                        student.progress ||
                          score ||
                          0
                      );

                      const subjectLabels =
                        getStudentSubjectLabels(
                          student.id
                        );

                      return (
                        <div
                          key={student.id}
                          className="flex flex-col gap-4 px-6 py-5 transition hover:bg-[#FFF8EF] xl:flex-row xl:items-center xl:justify-between"
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FDE7D7] text-sm font-bold text-[#7A1F2B]">
                              {getInitials(
                                student.full_name
                              )}
                            </div>

                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-base font-bold">
                                  {
                                    student.full_name
                                  }
                                </p>

                                <button
                                  type="button"
                                  onClick={() =>
                                    openEditStudentName(
                                      student
                                    )
                                  }
                                  className="rounded-lg border border-[#DCC8B6] bg-white px-2.5 py-1 text-[11px] font-bold text-[#7A1F2B] transition hover:bg-[#FFF8EF]"
                                >
                                  Edit Nama
                                </button>

                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusBadge(
                                    student.status ||
                                      "active"
                                  )}`}
                                >
                                  {student.status ||
                                    "active"}
                                </span>
                              </div>

                              <p className="mt-1 text-sm text-[#6B4A3A]">
                                {formatClass(
                                  student.level,
                                  student.grade
                                )}{" "}
                                •{" "}
                                {student.academic_year ||
                                  "-"}
                              </p>

                              <p className="mt-1 text-sm text-[#6B4A3A]">
                                Mapel:{" "}
                                <span className="font-semibold text-[#2B1B18]">
                                  {subjectLabels}
                                </span>
                              </p>

                              <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-[#6B4A3A] md:grid-cols-2">
                                <StudentInfo
                                  label="NIPD"
                                  value={
                                    student.nis || "-"
                                  }
                                />

                                <StudentInfo
                                  label="NISN"
                                  value={
                                    student.nisn || "-"
                                  }
                                />

                                <StudentInfo
                                  label="Lahir"
                                  value={formatDate(
                                    student.birth_date
                                  )}
                                />

                                <StudentInfo
                                  label="Orang Tua"
                                  value={
                                    student.parents
                                      ?.full_name ||
                                    "-"
                                  }
                                />
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 xl:w-[260px]">
                            <MetricCard
                              label="Nilai"
                              value={score}
                            />

                            <MetricCard
                              label="Absensi"
                              value={`${attendance}%`}
                            />

                            <div className="col-span-2">
                              <div className="mb-2 flex items-center justify-between text-xs">
                                <span className="text-[#6B4A3A]">
                                  Progress
                                </span>

                                <span className="font-bold text-[#2B1B18]">
                                  {progress}%
                                </span>
                              </div>

                              <div className="h-2 overflow-hidden rounded-full bg-[#F1DFD5]">
                                <div
                                  className={`h-full rounded-full ${getProgressColor(
                                    progress
                                  )}`}
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      progress
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                openReportModal(
                                  student
                                )
                              }
                              className="col-span-2 mt-2 rounded-xl bg-[#7A1F2B] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#54131D]"
                            >
                              + Buat Laporan
                            </button>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold">
                    Guru Aktif
                  </h2>

                  <div className="mt-5 flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#7A1F2B] text-lg font-bold text-white">
                      {getInitials(
                        teacher?.full_name || "Guru"
                      )}
                    </div>

                    <div>
                      <p className="font-bold">
                        {teacher?.full_name ||
                          "Belum ada guru"}
                      </p>
                      <p className="mt-1 text-sm text-[#6B4A3A]">
                        {teacher?.teacher_code || "-"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3 text-sm text-[#6B4A3A]">
                    <SidebarInfo
                      label="Email"
                      value={teacher?.email || "-"}
                    />

                    <SidebarInfo
                      label="Telepon"
                      value={teacher?.phone || "-"}
                    />

                    <SidebarInfo
                      label="Mapel"
                      value={formatTeacherSubjects(
                        teacher?.subjects ?? null
                      )}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold">
                    Ringkasan Level
                  </h2>

                  <div className="mt-5 space-y-4">
                    <LevelProgress
                      label="SD"
                      value={sdStudents}
                      total={students.length}
                      color="bg-[#7A1F2B]"
                    />

                    <LevelProgress
                      label="SMP"
                      value={smpStudents}
                      total={students.length}
                      color="bg-[#D96B2B]"
                    />

                    <LevelProgress
                      label="SMA"
                      value={smaStudents}
                      total={students.length}
                      color="bg-[#158A58]"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold">
                    Catatan
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-[#6B4A3A]">
                    Guru hanya dapat mengubah nama siswa
                    yang terhubung melalui tabel{" "}
                    <span className="font-bold text-[#2B1B18]">
                      student_teachers
                    </span>
                    . Data NIPD, NISN, level, kelas,
                    dan orang tua tetap hanya dapat
                    dikelola Kepala Sekolah/Admin.
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {editingStudent ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
          <div className="w-full max-w-[480px] overflow-hidden rounded-2xl bg-[#FAF3EA] shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#E8D6C1] px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-[#2B1B18]">
                  Edit Nama Siswa
                </h2>

                <p className="mt-1 text-sm text-[#6B4A3A]">
                  Guru hanya dapat memperbaiki nama
                  siswa.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditStudentName}
                disabled={savingStudentName}
                className="text-2xl leading-none text-[#6B4A3A] transition hover:text-[#7A1F2B] disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <div className="space-y-5 px-6 py-6">
              {errorMessage ? (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              <div className="rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] px-4 py-3 text-sm text-[#6B4A3A]">
                <StudentInfo
                  label="NIPD"
                  value={editingStudent.nis || "-"}
                />

                <div className="mt-1">
                  <StudentInfo
                    label="Kelas"
                    value={formatClass(
                      editingStudent.level,
                      editingStudent.grade
                    )}
                  />
                </div>
              </div>

              <label className="block">
                <span className="text-sm font-bold text-[#2B1B18]">
                  Nama Siswa
                </span>

                <input
                  value={studentNameInput}
                  onChange={(event) =>
                    setStudentNameInput(
                      event.target.value
                    )
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleSaveStudentName();
                    }
                  }}
                  autoFocus
                  maxLength={150}
                  placeholder="Masukkan nama siswa"
                  className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                />
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={closeEditStudentName}
                  disabled={savingStudentName}
                  className="h-11 rounded-xl border border-[#E8D6C1] bg-white text-sm font-bold text-[#7A1F2B] transition hover:bg-[#FFF8EF] disabled:opacity-60"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void handleSaveStudentName()
                  }
                  disabled={savingStudentName}
                  className="h-11 rounded-xl bg-[#7A1F2B] text-sm font-bold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingStudentName
                    ? "Menyimpan..."
                    : "Simpan Nama"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isReportModalOpen ? (
        <ReportModal
          students={students}
          subjectOptions={
            subjectOptionsForSelectedStudent
          }
          form={reportForm}
          saving={savingReport}
          errorMessage={errorMessage}
          onChange={setReportForm}
          onStudentChange={
            handleReportStudentChange
          }
          onClose={closeReportModal}
          onSubmit={handleSubmitKbmReport}
        />
      ) : null}
    </TeacherLayout>
  );
}

function ReportModal({
  students,
  subjectOptions,
  form,
  saving,
  errorMessage,
  onChange,
  onStudentChange,
  onClose,
  onSubmit,
}: {
  students: Student[];
  subjectOptions: Subject[];
  form: KbmForm;
  saving: boolean;
  errorMessage: string;
  onChange: React.Dispatch<
    React.SetStateAction<KbmForm>
  >;
  onStudentChange: (studentId: string) => void;
  onClose: () => void;
  onSubmit: (
    event: FormEvent<HTMLFormElement>
  ) => void;
}) {
  function updateField(
    field: keyof KbmForm,
    value: string
  ) {
    onChange((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
      <div className="flex max-h-[92vh] w-full max-w-[500px] flex-col overflow-hidden rounded-2xl bg-[#FAF3EA] shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-[#E8D6C1] px-6 py-5">
          <h2 className="text-xl font-bold">
            Buat Laporan KBM
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-[#6B4A3A] hover:text-[#7A1F2B]"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {errorMessage ? (
            <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <div className="mb-4 rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] px-4 py-3 text-xs leading-5 text-[#6B4A3A]">
            Murid dan mapel yang muncul hanya yang
            sudah terhubung dengan guru aktif.
          </div>

          <form
            onSubmit={onSubmit}
            className="space-y-4 pb-2"
          >
            <FormGroup label="Murid">
              <select
                value={form.student_id}
                onChange={(event) =>
                  onStudentChange(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
              >
                <option value="">
                  Pilih murid
                </option>

                {students.map((student) => (
                  <option
                    key={student.id}
                    value={student.id}
                  >
                    {student.full_name} —{" "}
                    {formatClass(
                      student.level,
                      student.grade
                    )}
                  </option>
                ))}
              </select>
            </FormGroup>

            <FormGroup label="Mata Pelajaran">
              <select
                value={form.subject_id}
                onChange={(event) =>
                  updateField(
                    "subject_id",
                    event.target.value
                  )
                }
                disabled={!form.student_id}
                className="w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B] disabled:cursor-not-allowed disabled:bg-[#F4E5DA] disabled:opacity-70"
              >
                <option value="">
                  {form.student_id
                    ? "Pilih mata pelajaran"
                    : "Pilih murid dulu"}
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
            </FormGroup>

            <div className="grid grid-cols-2 gap-3">
              <FormGroup label="Tanggal">
                <input
                  type="date"
                  value={form.report_date}
                  onChange={(event) =>
                    updateField(
                      "report_date",
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                />
              </FormGroup>

              <FormGroup label="Semester">
                <select
                  value={form.semester}
                  onChange={(event) =>
                    updateField(
                      "semester",
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                >
                  <option>Ganjil</option>
                  <option>Genap</option>
                </select>
              </FormGroup>
            </div>

            <FormInput
              label="Kelas"
              value={form.class_level}
              placeholder="Contoh: SD 4"
              onChange={(value) =>
                updateField(
                  "class_level",
                  value
                )
              }
            />

            <FormInput
              label="Bab / Unit"
              value={form.chapter}
              placeholder="Contoh: Bab 5"
              onChange={(value) =>
                updateField("chapter", value)
              }
            />

            <FormInput
              label="Materi KBM"
              value={form.material_topic}
              placeholder="Contoh: Pecahan Senilai"
              onChange={(value) =>
                updateField(
                  "material_topic",
                  value
                )
              }
            />

            <FormTextarea
              label="Masalah Belajar"
              value={form.learning_issue}
              placeholder="Masalah atau kendala siswa"
              onChange={(value) =>
                updateField(
                  "learning_issue",
                  value
                )
              }
            />

            <FormTextarea
              label="Solusi"
              value={form.solution}
              placeholder="Solusi yang diberikan guru"
              onChange={(value) =>
                updateField("solution", value)
              }
            />

            <FormTextarea
              label="Keterangan Guru"
              value={form.teacher_note}
              placeholder="Catatan guru terkait proses KBM"
              onChange={(value) =>
                updateField(
                  "teacher_note",
                  value
                )
              }
            />

            <FormGroup label="Status">
              <select
                value={form.status}
                onChange={(event) =>
                  updateField(
                    "status",
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
              >
                <option value="pending_review">
                  pending_review
                </option>
                <option value="draft">
                  draft
                </option>
              </select>
            </FormGroup>

            <div className="sticky bottom-0 -mx-6 mt-5 border-t border-[#E8D6C1] bg-[#FAF3EA] px-6 pb-1 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-[#7A1F2B] py-3 text-sm font-bold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Menyimpan..."
                  : "Simpan Laporan KBM"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
      <p className="text-sm text-[#6B4A3A]">
        {label}
      </p>
      <p className="mt-4 text-3xl font-bold">
        {value}
      </p>
    </div>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-[#FFF8EF] p-4">
      <p className="text-xs text-[#6B4A3A]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-[#7A1F2B]">
        {value}
      </p>
    </div>
  );
}

function StudentInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <p>
      <span className="font-semibold text-[#2B1B18]">
        {label}:
      </span>{" "}
      {value}
    </p>
  );
}

function SidebarInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <p>
      <span className="font-semibold text-[#2B1B18]">
        {label}:
      </span>{" "}
      {value}
    </p>
  );
}

function FormGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold">
        {label}
      </span>
      {children}
    </label>
  );
}

function FormInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <FormGroup label={label}>
      <input
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
      />
    </FormGroup>
  );
}

function FormTextarea({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <FormGroup label={label}>
      <textarea
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        rows={3}
        placeholder={placeholder}
        className="w-full resize-none rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
      />
    </FormGroup>
  );
}

function LevelProgress({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-bold">
          {value}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-[#F1DFD5]">
        <div
          className={`h-full rounded-full ${color}`}
          style={{
            width:
              total > 0
                ? `${(value / total) * 100}%`
                : "0%",
          }}
        />
      </div>
    </div>
  );
}