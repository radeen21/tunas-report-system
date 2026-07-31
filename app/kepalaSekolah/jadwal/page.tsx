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

type EnrichedSchedule = ScheduleRow & {
  student_name: string;
  student_grade: string;
  student_level: string;
  student_nipd: string;
  student_nisn: string;
  teacher_name: string;
  subject_name: string;
};

type ScheduleGroup = {
  key: string;
  schedule_date: string | null;
  day_name: string | null;
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
  session_name: string;
  material_topic: string;
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
  session_name: "Sesi 1",
  material_topic: "",
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
  return normalizeText(subject?.name).includes("math");
}

function getSubjectLabel(subject: SubjectRow) {
  const level = normalizeLevel(subject.level);
  const grade = subject.grade || "All Grade";

  return `${subject.name || "-"} — ${level} ${grade}`;
}

function formatClass(level?: string | null, grade?: string | null) {
  const cleanLevel = normalizeLevel(level);
  const cleanGrade = grade || "";

  if (cleanLevel && cleanGrade) return `${cleanLevel} ${cleanGrade}`;
  if (cleanLevel) return cleanLevel;
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

  return new Intl.DateTimeFormat("id-ID", { weekday: "long" }).format(date);
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

function calculateDurationMinutes(startTime: string, endTime: string) {
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

function formatDuration(minutes?: number | null) {
  if (!minutes) return "-";

  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;

  if (hour > 0 && minute > 0) return `${hour} jam ${minute} menit`;
  if (hour > 0) return `${hour} jam`;

  return `${minute} menit`;
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

function getScheduleGroupKey(schedule: EnrichedSchedule) {
  return [
    schedule.teacher_id || "",
    schedule.subject_id || "",
    schedule.schedule_date || "",
    schedule.start_time || "",
    schedule.end_time || "",
    schedule.session_name || "",
    normalizeText(schedule.material_topic),
    schedule.semester || "",
    normalizeText(schedule.notes),
    schedule.temporary_schedule_url || "",
    schedule.academic_year || "",
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

  const groups: ScheduleGroup[] = Array.from(map.entries()).map(([key, rows]) => {
    const first = rows[0];

    return {
      key,
      schedule_date: first.schedule_date,
      day_name: first.day_name,
      start_time: first.start_time,
      end_time: first.end_time,
      duration_minutes:
        first.duration_minutes ||
        calculateDurationMinutes(first.start_time || "", first.end_time || ""),
      teacher_id: first.teacher_id,
      teacher_name: first.teacher_name,
      subject_id: first.subject_id,
      subject_name: first.subject_name,
      session_name: first.session_name,
      material_topic: first.material_topic,
      semester: first.semester,
      notes: first.notes || null,
      temporary_schedule_url: first.temporary_schedule_url || null,
      academic_year: first.academic_year || null,
      students: rows.sort((a, b) => a.student_name.localeCompare(b.student_name)),
      total_students: rows.length,
    };
  });

  return groups.sort((a, b) => {
    const dateA = a.schedule_date || "";
    const dateB = b.schedule_date || "";

    if (dateA !== dateB) return dateB.localeCompare(dateA);

    return (a.start_time || "").localeCompare(b.start_time || "");
  });
}

export default function KepalaSekolahJadwalPage() {
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [schedules, setSchedules] = useState<EnrichedSchedule[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<ScheduleGroup | null>(null);

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
      const [teachersRes, studentsRes, subjectsRes, schedulesRes] =
        await Promise.all([
          supabase.from("teachers").select("*").order("full_name"),
          supabase.from("students").select("*").order("full_name"),
          supabase.from("subjects").select("*").order("name"),
          supabase
            .from("schedules")
            .select("*")
            .order("schedule_date", { ascending: false })
            .order("start_time", { ascending: true }),
        ]);

      if (teachersRes.error) throw new Error(teachersRes.error.message);
      if (studentsRes.error) throw new Error(studentsRes.error.message);
      if (subjectsRes.error) throw new Error(subjectsRes.error.message);
      if (schedulesRes.error) throw new Error(schedulesRes.error.message);

      const teachersData = (teachersRes.data || []) as TeacherRow[];
      const studentsData = (studentsRes.data || []) as StudentRow[];
      const subjectsData = (subjectsRes.data || []) as SubjectRow[];
      const schedulesData = (schedulesRes.data || []) as ScheduleRow[];

      const teacherMap = new Map(
        teachersData.map((teacher) => [teacher.id, teacher])
      );

      const studentMap = new Map(
        studentsData.map((student) => [student.id, student])
      );

      const subjectMap = new Map(
        subjectsData.map((subject) => [subject.id, subject])
      );

      const enriched: EnrichedSchedule[] = schedulesData.map((schedule) => {
        const teacher = schedule.teacher_id
          ? teacherMap.get(schedule.teacher_id)
          : null;

        const student = schedule.student_id
          ? studentMap.get(schedule.student_id)
          : null;

        const subject = schedule.subject_id
          ? subjectMap.get(schedule.subject_id)
          : null;

        return {
          ...schedule,
          teacher_name: teacher?.full_name || "-",
          student_name: student?.full_name || "-",
          student_grade: student?.grade || "-",
          student_level: student?.level || "-",
          student_nipd: student?.nis || "-",
          student_nisn: student?.nisn || "-",
          subject_name: subject ? getSubjectLabel(subject) : "-",
        };
      });

      setTeachers(teachersData);
      setStudents(studentsData);
      setSubjects(subjectsData);
      setSchedules(enriched);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengambil data jadwal.");
      }

      setTeachers([]);
      setStudents([]);
      setSubjects([]);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("kepala-jadwal-rombel-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "schedules" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teachers" },
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

  const selectedStudentsForForm = useMemo(() => {
    return students.filter((student) => selectedStudentIds.includes(student.id));
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

  const subjectOptionsForSchedule = useMemo(() => {
    return subjects.filter((subject) => {
      const subjectGradeNumber = getGradeNumber(subject.grade);

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
  }, [subjects, selectedStudentGradeNumbers]);

  useEffect(() => {
    if (!form.subject_id) return;

    const stillAllowed = subjectOptionsForSchedule.some(
      (subject) => subject.id === form.subject_id
    );

    if (!stillAllowed) {
      setForm((prev) => ({
        ...prev,
        subject_id: "",
        material_topic: "",
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

      const matchDay = dayFilter === ALL || group.day_name === dayFilter;

      const matchSubject =
        subjectFilter === ALL || group.subject_id === subjectFilter;

      return matchSearch && matchTeacher && matchDay && matchSubject;
    });
  }, [schedules, search, teacherFilter, dayFilter, subjectFilter]);

  const filteredStudents = useMemo(() => {
    const q = normalizeText(studentSearch);

    return students.filter((student) => {
      const matchSearch =
        !q ||
        normalizeText(student.full_name).includes(q) ||
        normalizeText(student.grade).includes(q) ||
        normalizeText(student.level).includes(q) ||
        normalizeText(student.nis).includes(q) ||
        normalizeText(student.nisn).includes(q);

      return matchSearch;
    });
  }, [students, studentSearch]);

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
    setSelectedStudentIds((prev) => {
      if (prev.includes(studentId)) {
        return prev.filter((id) => id !== studentId);
      }

      return [...prev, studentId];
    });
  }

  function selectAllFilteredStudents() {
    const ids = filteredStudents.map((student) => student.id);

    setSelectedStudentIds((prev) => {
      const merged = new Set([...prev, ...ids]);
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

    const selectedSubjectForSave =
      subjects.find((subject) => subject.id === form.subject_id) || null;

    if (selectedSubjectForSave && isMathSubject(selectedSubjectForSave)) {
      if (isAllGrade(selectedSubjectForSave.grade)) {
        alert(
          "Mapel Math tidak boleh menggunakan All Grade. Pilih Math sesuai kelas, misalnya Math — Kelas 4."
        );
        return;
      }

      const mathGradeNumber = getGradeNumber(selectedSubjectForSave.grade);

      const selectedGrades = Array.from(
        new Set(
          selectedStudentIds
            .map((studentId) => {
              const student = students.find((item) => item.id === studentId);
              return getGradeNumber(student?.grade);
            })
            .filter((grade): grade is number => Boolean(grade))
        )
      );

      if (selectedGrades.length > 1) {
        alert(
          "Untuk Math, jadwal harus dibuat per kelas. Jangan gabungkan beberapa kelas dalam satu rombel Math."
        );
        return;
      }

      if (
        mathGradeNumber &&
        selectedGrades.length === 1 &&
        selectedGrades[0] !== mathGradeNumber
      ) {
        alert(
          `Mapel Math yang dipilih untuk Kelas ${mathGradeNumber}, tapi siswa yang dipilih Kelas ${selectedGrades[0]}. Silakan sesuaikan mapel atau siswa.`
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

    if (!form.material_topic.trim()) {
      alert("Isi materi/topik pembelajaran terlebih dahulu.");
      return;
    }

    if (selectedStudentIds.length === 0) {
      alert("Pilih minimal 1 siswa untuk jadwal rombel.");
      return;
    }

    setSaving(true);

    try {
      let temporaryScheduleUrl = form.temporary_schedule_url || null;

      if (temporaryScheduleFile) {
        temporaryScheduleUrl = await uploadScheduleDocument(temporaryScheduleFile);
      }

      const payload = selectedStudentIds.map((studentId) => ({
        student_id: studentId,
        teacher_id: form.teacher_id,
        subject_id: form.subject_id,
        day_name: form.day_name,
        schedule_date: form.schedule_date,
        start_time: form.start_time,
        end_time: form.end_time,
        duration_minutes: durationMinutes,
        session_name: form.session_name.trim() || "Sesi 1",
        material_topic: form.material_topic.trim(),
        semester: form.semester,
        notes: form.notes.trim() || null,
        temporary_schedule_url: temporaryScheduleUrl,
        academic_year: ACADEMIC_YEAR,
      }));

      const { error } = await supabase.from("schedules").insert(payload);

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

    const ids = group.students.map((item) => item.id);

    const { error } = await supabase.from("schedules").delete().in("id", ids);

    if (error) {
      alert(`Gagal menghapus jadwal: ${error.message}`);
      return;
    }

    await fetchData();
  }

  return (
    <KepalaSekolahLayout
      activeMenu="Jadwal Guru"
      searchPlaceholder="Cari jadwal guru..."
    >
      <section className="space-y-7 print:space-y-4">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end print:hidden">
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#8A5A48]">
              Jadwal Pembelajaran
            </p>

            <h1 className="mt-2 text-[30px] font-extrabold tracking-[-0.02em] text-[#2B1B18]">
              Jadwal Guru / Rombel
            </h1>

            <p className="mt-2 max-w-[880px] text-[15px] leading-6 text-[#6F5549]">
              Format jadwal mengikuti template sekolah: Hari, Tanggal, Nama
              Guru, Datang, Pulang, Jam, Sesi, Kelas, Mapel, Materi, Siswa, dan
              Keterangan. Jadwal ini tidak terhubung otomatis ke Program
              Semester atau Absensi.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handlePrintSchedule}
              className="flex h-11 w-fit items-center gap-2 rounded-xl border border-[#DCC8B6] bg-white px-5 text-[14px] font-extrabold text-[#8C0F2D] shadow-sm transition hover:bg-[#FFF8EF]"
            >
              <Printer className="h-4 w-4" />
              Print Jadwal
            </button>

            <button
              type="button"
              onClick={openModal}
              className="flex h-11 w-fit items-center gap-2 rounded-xl bg-[#8C0F2D] px-5 text-[14px] font-extrabold text-white shadow-sm transition hover:bg-[#54131D]"
            >
              <Plus className="h-4 w-4" />
              Tambah Jadwal
            </button>
          </div>
        </div>

        <div className="hidden print:block">
          <h1 className="text-[22px] font-extrabold text-[#2B1B18]">
            Jadwal Guru / Rombel HSTKB
          </h1>
          <p className="mt-1 text-[13px] text-[#6F5549]">
            Academic Year {ACADEMIC_YEAR}
          </p>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-[14px] leading-6 text-red-700 print:hidden">
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p>{errorMessage}</p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 print:hidden">
          <SummaryCard
            icon={<CalendarDays className="h-5 w-5" />}
            label="Total Jadwal"
            value={summary.totalSchedules}
            info="Rows"
            tone="pink"
          />

          <SummaryCard
            icon={<UsersRound className="h-5 w-5" />}
            label="Total Rombel"
            value={summary.totalRombel}
            info="Group"
            tone="orange"
          />

          <SummaryCard
            icon={<UserRound className="h-5 w-5" />}
            label="Siswa Terjadwal"
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
                placeholder="Cari siswa, NIPD, NISN, guru, mapel, materi, atau keterangan..."
                className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] pl-11 pr-4 text-[14px] outline-none placeholder:text-[#9A7B6C] focus:border-[#9C0824]"
              />
            </div>

            <select
              value={teacherFilter}
              onChange={(event) => setTeacherFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
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
              onChange={(event) => setDayFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              <option value={ALL}>Semua Hari</option>
              {dayOptions.map((day) => (
                <option key={day}>{day}</option>
              ))}
            </select>

            <select
              value={subjectFilter}
              onChange={(event) => setSubjectFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              <option value={ALL}>Semua Mapel</option>
              {subjects
                .filter((subject) => !(isMathSubject(subject) && isAllGrade(subject.grade)))
                .map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {getSubjectLabel(subject)}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-[22px] border border-[#E1CFBE] bg-white shadow-sm print:rounded-none print:border print:shadow-none">
          <div className="border-b border-[#EADACA] px-6 py-5 print:px-3 print:py-3">
            <h2 className="text-[20px] font-extrabold text-[#2B1B18]">
              Daftar Jadwal Rombel
            </h2>

            <p className="mt-1 text-[14px] text-[#6F5549] print:hidden">
              Tampilan sudah disusun seperti template jadwal/absensi sekolah.
            </p>
          </div>

          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full min-w-[1540px] border-collapse print:min-w-0 print:text-[10px]">
              <thead>
                <tr className="border-b border-[#EADACA] bg-[#FFF8EF] text-left text-[13px] font-extrabold text-[#6F5549] print:text-[10px]">
                  <th rowSpan={2} className="border-r border-[#EADACA] px-4 py-4 print:px-2 print:py-2">
                    No
                  </th>

                  <th rowSpan={2} className="border-r border-[#EADACA] px-4 py-4 print:px-2 print:py-2">
                    Hari
                  </th>

                  <th rowSpan={2} className="border-r border-[#EADACA] px-4 py-4 print:px-2 print:py-2">
                    Tanggal
                  </th>

                  <th rowSpan={2} className="border-r border-[#EADACA] px-4 py-4 print:px-2 print:py-2">
                    Nama Guru
                  </th>

                  <th rowSpan={2} className="border-r border-[#EADACA] px-4 py-4 print:px-2 print:py-2">
                    Datang
                  </th>

                  <th rowSpan={2} className="border-r border-[#EADACA] px-4 py-4 print:px-2 print:py-2">
                    Pulang
                  </th>

                  <th rowSpan={2} className="border-r border-[#EADACA] px-4 py-4 print:px-2 print:py-2">
                    Durasi
                  </th>

                  <th colSpan={6} className="border-r border-[#EADACA] px-4 py-4 text-center print:px-2 print:py-2">
                    Jadwal Kegiatan Belajar Mengajar
                  </th>

                  <th rowSpan={2} className="border-r border-[#EADACA] px-4 py-4 print:px-2 print:py-2">
                    Keterangan
                  </th>

                  <th rowSpan={2} className="px-4 py-4 print:hidden">
                    File
                  </th>

                  <th rowSpan={2} className="px-4 py-4 print:hidden">
                    Aksi
                  </th>
                </tr>

                <tr className="border-b border-[#EADACA] bg-[#FFF8EF] text-left text-[13px] font-extrabold text-[#6F5549] print:text-[10px]">
                  <th className="border-r border-[#EADACA] px-4 py-3 print:px-2 print:py-2">
                    Jam
                  </th>
                  <th className="border-r border-[#EADACA] px-4 py-3 print:px-2 print:py-2">
                    Sesi
                  </th>
                  <th className="border-r border-[#EADACA] px-4 py-3 print:px-2 print:py-2">
                    Kls
                  </th>
                  <th className="border-r border-[#EADACA] px-4 py-3 print:px-2 print:py-2">
                    Mapel
                  </th>
                  <th className="border-r border-[#EADACA] px-4 py-3 print:px-2 print:py-2">
                    Materi
                  </th>
                  <th className="border-r border-[#EADACA] px-4 py-3 print:px-2 print:py-2">
                    Siswa
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={16}
                      className="px-6 py-12 text-center text-[#6F5549]"
                    >
                      Memuat data jadwal...
                    </td>
                  </tr>
                ) : groupedSchedules.length === 0 ? (
                  <tr>
                    <td
                      colSpan={16}
                      className="px-6 py-12 text-center text-[#6F5549]"
                    >
                      Belum ada jadwal rombel.
                    </td>
                  </tr>
                ) : (
                  groupedSchedules.map((group, index) => {
                    const classList = Array.from(
                      new Set(
                        group.students.map((student) =>
                          formatClass(student.student_level, student.student_grade)
                        )
                      )
                    ).join(", ");

                    const studentNames = group.students
                      .map((student) => student.student_name)
                      .join(", ");

                    return (
                      <tr
                        key={group.key}
                        className="border-b border-[#F0E1D4] text-[14px] text-[#2B1B18] print:text-[10px]"
                      >
                        <td className="border-r border-[#F0E1D4] px-4 py-4 font-bold print:px-2 print:py-2">
                          {index + 1}
                        </td>

                        <td className="border-r border-[#F0E1D4] px-4 py-4 font-extrabold print:px-2 print:py-2">
                          {group.day_name || "-"}
                        </td>

                        <td className="whitespace-nowrap border-r border-[#F0E1D4] px-4 py-4 print:px-2 print:py-2">
                          {formatDate(group.schedule_date)}
                        </td>

                        <td className="border-r border-[#F0E1D4] px-4 py-4 font-extrabold print:px-2 print:py-2">
                          {group.teacher_name}
                        </td>

                        <td className="whitespace-nowrap border-r border-[#F0E1D4] px-4 py-4 print:px-2 print:py-2">
                          {formatTime(group.start_time)}
                        </td>

                        <td className="whitespace-nowrap border-r border-[#F0E1D4] px-4 py-4 print:px-2 print:py-2">
                          {formatTime(group.end_time)}
                        </td>

                        <td className="whitespace-nowrap border-r border-[#F0E1D4] px-4 py-4 print:px-2 print:py-2">
                          {formatDuration(group.duration_minutes)}
                        </td>

                        <td className="whitespace-nowrap border-r border-[#F0E1D4] px-4 py-4 print:px-2 print:py-2">
                          {formatTime(group.start_time)}-
                          {formatTime(group.end_time)}
                        </td>

                        <td className="border-r border-[#F0E1D4] px-4 py-4 print:px-2 print:py-2">
                          <span className="inline-flex whitespace-nowrap rounded-full bg-[#FFF2B8] px-3 py-1 text-[12px] font-extrabold text-[#B26A00] print:bg-transparent print:px-0 print:text-[10px] print:text-[#2B1B18]">
                            {group.session_name || "-"}
                          </span>
                        </td>

                        <td className="max-w-[160px] border-r border-[#F0E1D4] px-4 py-4 print:px-2 print:py-2">
                          <p className="line-clamp-2">{classList || "-"}</p>
                        </td>

                        <td className="border-r border-[#F0E1D4] px-4 py-4 print:px-2 print:py-2">
                          {group.subject_name}
                        </td>

                        <td className="max-w-[260px] border-r border-[#F0E1D4] px-4 py-4 print:px-2 print:py-2">
                          <p className="line-clamp-2 font-bold">
                            {group.material_topic || "-"}
                          </p>
                        </td>

                        <td className="max-w-[280px] border-r border-[#F0E1D4] px-4 py-4 print:px-2 print:py-2">
                          <button
                            type="button"
                            onClick={() => setSelectedGroup(group)}
                            className="mb-2 inline-flex whitespace-nowrap rounded-full bg-[#F4E5DA] px-3 py-1 text-[12px] font-extrabold text-[#8A2332] transition hover:bg-[#EADACA] print:hidden"
                          >
                            {group.total_students} siswa
                          </button>

                          <p className="line-clamp-2 text-[13px] text-[#6F5549] print:text-[10px]">
                            {studentNames || "-"}
                          </p>
                        </td>

                        <td className="max-w-[240px] border-r border-[#F0E1D4] px-4 py-4 print:px-2 print:py-2">
                          <p className="line-clamp-2 text-[13px] text-[#6F5549] print:text-[10px]">
                            {group.notes || "-"}
                          </p>
                        </td>

                        <td className="px-4 py-4 print:hidden">
                          {group.temporary_schedule_url ? (
                            <a
                              href={group.temporary_schedule_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-[#DCC8B6] px-3 py-2 text-[12px] font-extrabold text-[#8C0F2D] transition hover:bg-[#FFF8EF]"
                            >
                              <FileText className="h-4 w-4" />
                              Lihat File
                            </a>
                          ) : (
                            <span className="text-[13px] text-[#6F5549]">
                              -
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4 print:hidden">
                          <button
                            type="button"
                            onClick={() => handleDeleteGroup(group)}
                            className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-xl border border-[#FECACA] px-3 text-[13px] font-extrabold text-[#DC2626] transition hover:bg-[#FFF1F2]"
                          >
                            <Trash2 className="h-4 w-4" />
                            Hapus
                          </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-8 print:hidden">
          <div className="max-h-[92vh] w-full max-w-[920px] overflow-y-auto rounded-[22px] bg-[#FFF8EF] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E1CFBE] bg-[#FFF8EF] px-6 py-5">
              <div>
                <h2 className="text-[22px] font-extrabold text-[#2B1B18]">
                  Tambah Jadwal Rombel
                </h2>
                <p className="mt-1 text-[13px] text-[#6F5549]">
                  Jadwal ini berdiri sendiri dan tidak otomatis membuat absensi.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-full p-2 text-[#6F5549] transition hover:bg-[#F4E5DA]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="grid gap-4 md:grid-cols-2">
                <FormGroup label="Nama Guru">
                  <select
                    value={form.teacher_id}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        teacher_id: event.target.value,
                      }))
                    }
                    className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
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
                      setForm((prev) => ({
                        ...prev,
                        subject_id: event.target.value,
                      }))
                    }
                    className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
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

                      setForm((prev) => ({
                        ...prev,
                        schedule_date: dateValue,
                        day_name: getDayName(dateValue),
                      }));
                    }}
                    className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                  />
                </FormGroup>

                <FormGroup label="Hari">
                  <select
                    value={form.day_name}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        day_name: event.target.value,
                      }))
                    }
                    className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                  >
                    {dayOptions.map((day) => (
                      <option key={day}>{day}</option>
                    ))}
                  </select>
                </FormGroup>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <FormGroup label="Datang / Jam Mulai">
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        start_time: event.target.value,
                      }))
                    }
                    className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                  />
                </FormGroup>

                <FormGroup label="Pulang / Jam Selesai">
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        end_time: event.target.value,
                      }))
                    }
                    className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                  />
                </FormGroup>

                <FormGroup label="Jam">
                  <input
                    value={
                      form.start_time && form.end_time
                        ? `${formatTime(form.start_time)}-${formatTime(
                            form.end_time
                          )}`
                        : "-"
                    }
                    readOnly
                    className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-[#FFF8EF] px-4 text-[14px] font-bold text-[#8C0F2D] outline-none"
                  />
                </FormGroup>

                <FormGroup label="Durasi Otomatis">
                  <input
                    value={formatDuration(
                      calculateDurationMinutes(form.start_time, form.end_time)
                    )}
                    readOnly
                    className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-[#FFF8EF] px-4 text-[14px] font-bold text-[#8C0F2D] outline-none"
                  />
                </FormGroup>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormGroup label="Sesi">
                  <input
                    value={form.session_name}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        session_name: event.target.value,
                      }))
                    }
                    placeholder="Contoh: Sesi 1"
                    className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                  />
                </FormGroup>

                <FormGroup label="Semester">
                  <select
                    value={form.semester}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        semester: event.target.value,
                      }))
                    }
                    className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                  >
                    {semesterOptions.map((semester) => (
                      <option key={semester}>{semester}</option>
                    ))}
                  </select>
                </FormGroup>
              </div>

              <FormGroup label="Materi">
                <input
                  value={form.material_topic}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      material_topic: event.target.value,
                    }))
                  }
                  placeholder="Contoh: Bab II - Wujud Zat"
                  className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                />
              </FormGroup>

              <FormGroup label="Keterangan">
                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      notes: event.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Contoh: Jadwal sementara, kelas pengganti, atau catatan tambahan"
                  className="w-full resize-none rounded-xl border border-[#DCC8B6] bg-white px-4 py-3 text-[14px] outline-none focus:border-[#9C0824]"
                />
              </FormGroup>

              <div className="rounded-2xl border border-[#E1CFBE] bg-white px-5 py-4">
                <h3 className="text-[16px] font-extrabold text-[#2B1B18]">
                  Upload Jadwal Sementara
                </h3>

                <p className="mt-1 text-[13px] text-[#6F5549]">
                  Opsional. Upload file Word/PDF/Excel/jadwal sementara jika ada.
                </p>

                <label className="mt-4 flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#DCC8B6] bg-[#FFF8EF] px-4 text-[14px] font-extrabold text-[#8C0F2D] transition hover:bg-[#F8E7DC]">
                  <UploadCloud className="h-4 w-4" />
                  Pilih File Jadwal
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(event) =>
                      setTemporaryScheduleFile(event.target.files?.[0] || null)
                    }
                  />
                </label>

                <p className="mt-2 truncate text-[12px] text-[#6F5549]">
                  {temporaryScheduleFile?.name || "Belum ada file dipilih"}
                </p>
              </div>

              <div className="rounded-2xl border border-[#E1CFBE] bg-white px-5 py-4">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <h3 className="text-[16px] font-extrabold text-[#2B1B18]">
                      Pilih Siswa Rombel
                    </h3>
                    <p className="mt-1 text-[13px] text-[#6F5549]">
                      Terpilih {selectedStudentIds.length} siswa.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={selectAllFilteredStudents}
                      className="rounded-xl border border-[#DCC8B6] px-3 py-2 text-[12px] font-extrabold text-[#8C0F2D] transition hover:bg-[#FFF8EF]"
                    >
                      Pilih Semua Hasil Filter
                    </button>

                    <button
                      type="button"
                      onClick={clearSelectedStudents}
                      className="rounded-xl border border-[#FECACA] px-3 py-2 text-[12px] font-extrabold text-[#DC2626] transition hover:bg-[#FFF1F2]"
                    >
                      Kosongkan
                    </button>
                  </div>
                </div>

                <div className="relative mt-4">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8E6A58]" />
                  <input
                    value={studentSearch}
                    onChange={(event) => setStudentSearch(event.target.value)}
                    placeholder="Cari nama siswa, kelas, level, NIPD, atau NISN..."
                    className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] pl-11 pr-4 text-[14px] outline-none placeholder:text-[#9A7B6C] focus:border-[#9C0824]"
                  />
                </div>

                <div className="mt-4 max-h-[280px] overflow-y-auto rounded-2xl border border-[#EADACA]">
                  {filteredStudents.length === 0 ? (
                    <div className="px-4 py-8 text-center text-[14px] text-[#6F5549]">
                      Tidak ada siswa ditemukan.
                    </div>
                  ) : (
                    filteredStudents.map((student) => {
                      const checked = selectedStudentIds.includes(student.id);

                      return (
                        <button
                          key={student.id}
                          type="button"
                          onClick={() => toggleStudent(student.id)}
                          className={`flex w-full items-center justify-between gap-4 border-b border-[#F0E1D4] px-4 py-3 text-left transition last:border-b-0 ${
                            checked ? "bg-[#FFF8EF]" : "bg-white hover:bg-[#FFF8EF]"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F8DFD0] text-[13px] font-extrabold text-[#8C0F2D]">
                              {getInitials(student.full_name)}
                            </div>

                            <div>
                              <p className="text-[14px] font-extrabold text-[#2B1B18]">
                                {student.full_name}
                              </p>
                              <p className="mt-1 text-[12px] text-[#6F5549]">
                                {formatClass(student.level, student.grade)} •
                                NIPD: {student.nis || "-"}
                                {student.nisn ? ` • NISN: ${student.nisn}` : ""}
                              </p>
                            </div>
                          </div>

                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleStudent(student.id)}
                            onClick={(event) => event.stopPropagation()}
                            className="h-5 w-5 accent-[#8C0F2D]"
                          />
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveSchedule}
                disabled={saving}
                className="h-12 w-full rounded-xl bg-[#8C0F2D] text-[15px] font-extrabold text-white shadow-sm transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Menyimpan..." : "Simpan Jadwal Rombel"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedGroup ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-8 print:hidden">
          <div className="max-h-[92vh] w-full max-w-[900px] overflow-y-auto rounded-[22px] bg-[#FFF8EF] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E1CFBE] bg-[#FFF8EF] px-6 py-5">
              <div>
                <h2 className="text-[22px] font-extrabold text-[#2B1B18]">
                  Detail Rombel
                </h2>

                <p className="mt-1 text-[14px] text-[#6F5549]">
                  {selectedGroup.teacher_name} • {selectedGroup.subject_name} •{" "}
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
              <div className="rounded-2xl border border-[#E1CFBE] bg-white px-5 py-4">
                <div className="grid gap-3 text-[13px] md:grid-cols-3">
                  <InfoItem
                    label="Hari / Tanggal"
                    value={`${selectedGroup.day_name || "-"}, ${formatDate(
                      selectedGroup.schedule_date
                    )}`}
                  />

                  <InfoItem
                    label="Datang"
                    value={formatTime(selectedGroup.start_time)}
                  />

                  <InfoItem
                    label="Pulang"
                    value={formatTime(selectedGroup.end_time)}
                  />

                  <InfoItem
                    label="Jam"
                    value={`${formatTime(selectedGroup.start_time)}-${formatTime(
                      selectedGroup.end_time
                    )}`}
                  />

                  <InfoItem
                    label="Durasi"
                    value={formatDuration(selectedGroup.duration_minutes)}
                  />

                  <InfoItem
                    label="Sesi"
                    value={selectedGroup.session_name || "-"}
                  />

                  <InfoItem
                    label="Nama Guru"
                    value={selectedGroup.teacher_name || "-"}
                  />

                  <InfoItem
                    label="Mapel"
                    value={selectedGroup.subject_name || "-"}
                  />

                  <InfoItem
                    label="Semester"
                    value={selectedGroup.semester || "-"}
                  />

                  <InfoItem
                    label="Materi"
                    value={selectedGroup.material_topic || "-"}
                  />

                  <InfoItem
                    label="Keterangan"
                    value={selectedGroup.notes || "-"}
                  />

                  <InfoItem
                    label="Jumlah Siswa"
                    value={`${selectedGroup.total_students} siswa`}
                  />
                </div>

                <div className="mt-4">
                  <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#8A5A48]">
                    File Jadwal Sementara
                  </p>

                  {selectedGroup.temporary_schedule_url ? (
                    <a
                      href={selectedGroup.temporary_schedule_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-2 font-extrabold text-[#8C0F2D] underline"
                    >
                      <FileText className="h-4 w-4" />
                      Lihat File
                    </a>
                  ) : (
                    <p className="mt-1 font-extrabold text-[#2B1B18]">-</p>
                  )}
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-[#E1CFBE] bg-white">
                <div className="border-b border-[#EADACA] px-5 py-4">
                  <h3 className="text-[16px] font-extrabold text-[#2B1B18]">
                    Siswa Dalam Rombel
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] border-collapse">
                    <thead>
                      <tr className="border-b border-[#EADACA] bg-[#FFF8EF] text-left text-[13px] font-extrabold text-[#6F5549]">
                        <th className="px-5 py-4">No</th>
                        <th className="px-5 py-4">Nama Siswa</th>
                        <th className="px-5 py-4">NIPD</th>
                        <th className="px-5 py-4">NISN</th>
                        <th className="px-5 py-4">Kelas</th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedGroup.students.map((student, index) => (
                        <tr
                          key={student.id}
                          className="border-b border-[#F0E1D4] text-[14px]"
                        >
                          <td className="px-5 py-4 font-bold">{index + 1}</td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F8DFD0] text-[13px] font-extrabold text-[#8C0F2D]">
                                {getInitials(student.student_name)}
                              </div>

                              <p className="font-extrabold text-[#2B1B18]">
                                {student.student_name}
                              </p>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-[#6F5549]">
                            {student.student_nipd || "-"}
                          </td>

                          <td className="px-5 py-4 text-[#6F5549]">
                            {student.student_nisn || "-"}
                          </td>

                          <td className="px-5 py-4 text-[#6F5549]">
                            {formatClass(
                              student.student_level,
                              student.student_grade
                            )}
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

      <p className="text-[26px] font-extrabold leading-none text-[#2B1B18]">
        {value}
      </p>

      <p className="mt-2 text-[13px] text-[#6B4A3A]">{label}</p>
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
      <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#8A5A48]">
        {label}
      </p>

      <p className="mt-1 whitespace-pre-line font-extrabold text-[#2B1B18]">
        {value}
      </p>
    </div>
  );
}