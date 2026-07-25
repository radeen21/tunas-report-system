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

type ScheduleRow = {
  id: string;
  teacher_id: string | null;
  student_id: string | null;
  subject_id: string | null;
  schedule_date: string | null;
  start_time: string | null;
  end_time: string | null;
  session_name: string | null;
  material_topic: string | null;
  semester?: string | null;
  curriculum_program_id?: string | null;
  curriculum_chapter_id?: string | null;
  curriculum_sub_chapter_id?: string | null;
};

type AttendanceRow = {
  id: string;
  teacher_id: string | null;
  student_id: string | null;
  subject_id: string | null;
  attendance_date: string | null;
  start_time?: string | null;
  end_time?: string | null;
  attendance_status?: string | null;
  understanding_status?: string | null;
  material_topic?: string | null;
  note?: string | null;
};

type CurriculumProgram = {
  id: string;
  teacher_id: string | null;
  program_type: string | null;
  level: string | null;
  grade: string | null;
  subject_name: string | null;
  semester: string | null;
  academic_year: string | null;
  status: string | null;
};

type CurriculumChapter = {
  id: string;
  curriculum_program_id: string | null;
  chapter_title: string | null;
  chapter_order: number | null;
};

type CurriculumSubChapter = {
  id: string;
  curriculum_chapter_id: string | null;
  sub_chapter_title: string | null;
  sub_chapter_order: number | null;
  target_month: string | null;
  planned_week: number | null;
};

type RombelSchedule = {
  key: string;
  teacher_id: string;
  subject_id: string | null;
  subject_name: string;
  schedule_date: string;
  start_time: string;
  end_time: string;
  session_name: string;
  material_topic: string;
  semester: string;
  curriculum_program_id: string | null;
  curriculum_chapter_id: string | null;
  curriculum_sub_chapter_id: string | null;
  schedules: ScheduleRow[];
  students: StudentRow[];
  alreadyAttendance: boolean;
};

type AttendanceStudent = StudentRow & {
  attendanceStatus: string;
  understandingStatus: string;
  note: string;
};

type ProgramWithChildren = CurriculumProgram & {
  chapters: Array<
    CurriculumChapter & {
      sub_chapters: CurriculumSubChapter[];
    }
  >;
};

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

function formatTeacherSubject(subjects: TeacherRow["subjects"]) {
  if (!subjects) return "Guru";

  if (Array.isArray(subjects)) {
    return `Guru — ${subjects.slice(0, 4).join(", ")}`;
  }

  return `Guru — ${subjects}`;
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

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatTime(value?: string | null) {
  if (!value) return "-";
  return value.slice(0, 5);
}

function createRombelKey(schedule: ScheduleRow) {
  return [
    schedule.teacher_id || "",
    schedule.subject_id || "",
    schedule.schedule_date || "",
    schedule.start_time || "",
    schedule.end_time || "",
    schedule.session_name || "",
    schedule.material_topic || "",
    schedule.semester || "",
    schedule.curriculum_program_id || "",
    schedule.curriculum_chapter_id || "",
    schedule.curriculum_sub_chapter_id || "",
  ].join("|");
}

function sameSubject(programSubject?: string | null, subjectName?: string | null) {
  if (!programSubject || !subjectName) return false;

  return normalizeText(programSubject) === normalizeText(subjectName);
}

export default function TeacherAbsensiPage() {
  const [teacher, setTeacher] = useState<TeacherRow | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [programs, setPrograms] = useState<ProgramWithChildren[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState(todayYMD());

  const [selectedRombelKey, setSelectedRombelKey] = useState("");
  const [rombelStudents, setRombelStudents] = useState<AttendanceStudent[]>([]);

  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [selectedChapterId, setSelectedChapterId] = useState("");
  const [selectedSubChapterId, setSelectedSubChapterId] = useState("");

  async function getCurrentTeacher() {
    const { data: authData } = await supabase.auth.getUser();

    const email =
      authData.user?.email ||
      localStorage.getItem("hstkb_demo_email") ||
      localStorage.getItem("hstkb_email") ||
      "";

    if (email) {
      const { data } = await supabase
        .from("teachers")
        .select("*")
        .eq("email", email)
        .limit(1)
        .maybeSingle();

      if (data) return data as TeacherRow;
    }

    const { data } = await supabase
      .from("teachers")
      .select("*")
      .order("full_name")
      .limit(1)
      .maybeSingle();

    return data as TeacherRow | null;
  }

  async function fetchData() {
    setLoading(true);

    const currentTeacher = await getCurrentTeacher();
    setTeacher(currentTeacher);

    if (!currentTeacher?.id) {
      setStudents([]);
      setSubjects([]);
      setSchedules([]);
      setAttendance([]);
      setPrograms([]);
      setLoading(false);
      return;
    }

    const [
      studentsRes,
      subjectsRes,
      schedulesRes,
      attendanceRes,
      programsRes,
      chaptersRes,
      subChaptersRes,
    ] = await Promise.all([
      supabase.from("students").select("*").order("full_name"),
      supabase.from("subjects").select("*").order("name"),
      supabase
        .from("schedules")
        .select("*")
        .eq("teacher_id", currentTeacher.id)
        .order("schedule_date", { ascending: false }),
      supabase
        .from("attendance")
        .select("*")
        .eq("teacher_id", currentTeacher.id),
      supabase
        .from("curriculum_programs")
        .select("*")
        .eq("teacher_id", currentTeacher.id)
        .order("updated_at", { ascending: false }),
      supabase
        .from("curriculum_chapters")
        .select("*")
        .order("chapter_order", { ascending: true }),
      supabase
        .from("curriculum_sub_chapters")
        .select("*")
        .order("sub_chapter_order", { ascending: true }),
    ]);

    const studentsData = (studentsRes.data || []) as StudentRow[];
    const subjectsData = (subjectsRes.data || []) as SubjectRow[];
    const schedulesData = (schedulesRes.data || []) as ScheduleRow[];
    const attendanceData = (attendanceRes.data || []) as AttendanceRow[];
    const programsData = (programsRes.data || []) as CurriculumProgram[];
    const chaptersData = (chaptersRes.data || []) as CurriculumChapter[];
    const subChaptersData = (subChaptersRes.data || []) as CurriculumSubChapter[];

    const subChaptersByChapter = new Map<string, CurriculumSubChapter[]>();

    subChaptersData.forEach((subChapter) => {
      if (!subChapter.curriculum_chapter_id) return;

      const current = subChaptersByChapter.get(subChapter.curriculum_chapter_id) || [];
      current.push(subChapter);
      subChaptersByChapter.set(subChapter.curriculum_chapter_id, current);
    });

    const chaptersByProgram = new Map<
      string,
      Array<CurriculumChapter & { sub_chapters: CurriculumSubChapter[] }>
    >();

    chaptersData.forEach((chapter) => {
      if (!chapter.curriculum_program_id) return;

      const current = chaptersByProgram.get(chapter.curriculum_program_id) || [];

      current.push({
        ...chapter,
        sub_chapters: subChaptersByChapter.get(chapter.id) || [],
      });

      chaptersByProgram.set(chapter.curriculum_program_id, current);
    });

    const programsWithChildren: ProgramWithChildren[] = programsData.map(
      (program) => ({
        ...program,
        chapters: chaptersByProgram.get(program.id) || [],
      })
    );

    setStudents(studentsData);
    setSubjects(subjectsData);
    setSchedules(schedulesData);
    setAttendance(attendanceData);
    setPrograms(programsWithChildren);

    setLoading(false);
  }

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("teacher-absensi-kbm-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "schedules" },
        fetchData
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance" },
        fetchData
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "curriculum_programs" },
        fetchData
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "curriculum_chapters" },
        fetchData
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "curriculum_sub_chapters" },
        fetchData
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const subjectMap = useMemo(() => {
    return new Map(subjects.map((subject) => [subject.id, subject]));
  }, [subjects]);

  const studentMap = useMemo(() => {
    return new Map(students.map((student) => [student.id, student]));
  }, [students]);

  const rombelSchedules = useMemo(() => {
    const grouped = new Map<string, RombelSchedule>();

    schedules
      .filter((schedule) => {
        if (!dateFilter) return true;
        return schedule.schedule_date === dateFilter;
      })
      .forEach((schedule) => {
        const key = createRombelKey(schedule);

        const subject = schedule.subject_id
          ? subjectMap.get(schedule.subject_id)
          : null;

        const student = schedule.student_id
          ? studentMap.get(schedule.student_id)
          : null;

        const current = grouped.get(key);

        const hasAttendance = attendance.some((item) => {
          return (
            item.teacher_id === schedule.teacher_id &&
            item.subject_id === schedule.subject_id &&
            item.attendance_date === schedule.schedule_date &&
            item.start_time === schedule.start_time &&
            item.end_time === schedule.end_time &&
            item.student_id === schedule.student_id
          );
        });

        if (!current) {
          grouped.set(key, {
            key,
            teacher_id: schedule.teacher_id || "",
            subject_id: schedule.subject_id,
            subject_name: subject?.name || "-",
            schedule_date: schedule.schedule_date || "",
            start_time: schedule.start_time || "",
            end_time: schedule.end_time || "",
            session_name: schedule.session_name || "-",
            material_topic: schedule.material_topic || "-",
            semester: schedule.semester || "-",
            curriculum_program_id: schedule.curriculum_program_id || null,
            curriculum_chapter_id: schedule.curriculum_chapter_id || null,
            curriculum_sub_chapter_id: schedule.curriculum_sub_chapter_id || null,
            schedules: [schedule],
            students: student ? [student] : [],
            alreadyAttendance: hasAttendance,
          });

          return;
        }

        current.schedules.push(schedule);

        if (student && !current.students.some((item) => item.id === student.id)) {
          current.students.push(student);
        }

        current.alreadyAttendance = current.alreadyAttendance || hasAttendance;
      });

    return Array.from(grouped.values()).sort((a, b) => {
      return `${a.schedule_date} ${a.start_time}`.localeCompare(
        `${b.schedule_date} ${b.start_time}`
      );
    });
  }, [schedules, attendance, dateFilter, subjectMap, studentMap]);

  const filteredRombelSchedules = useMemo(() => {
    const q = normalizeText(search);

    return rombelSchedules.filter((rombel) => {
      if (!q) return true;

      return (
        normalizeText(rombel.subject_name).includes(q) ||
        normalizeText(rombel.session_name).includes(q) ||
        normalizeText(rombel.material_topic).includes(q) ||
        rombel.students.some((student) =>
          normalizeText(student.full_name).includes(q) ||
          normalizeText(student.nis).includes(q) ||
          normalizeText(student.nisn).includes(q)
        )
      );
    });
  }, [rombelSchedules, search]);

  const selectedRombel = useMemo(() => {
    return rombelSchedules.find((rombel) => rombel.key === selectedRombelKey) || null;
  }, [rombelSchedules, selectedRombelKey]);

  const availablePrograms = useMemo(() => {
    if (!selectedRombel) return programs;

    return programs.filter((program) => {
      if (program.id === selectedRombel.curriculum_program_id) return true;

      const matchSubject = sameSubject(
        program.subject_name,
        selectedRombel.subject_name
      );

      const matchLevel = selectedRombel.students.some(
        (student) => student.level === program.level
      );

      const matchGrade = selectedRombel.students.some(
        (student) => student.grade === program.grade
      );

      const matchSemester =
        !selectedRombel.semester ||
        selectedRombel.semester === "-" ||
        program.semester === selectedRombel.semester;

      return (matchSubject || (matchLevel && matchGrade)) && matchSemester;
    });
  }, [programs, selectedRombel]);

  const selectedProgram = useMemo(() => {
    return programs.find((program) => program.id === selectedProgramId) || null;
  }, [programs, selectedProgramId]);

  const selectedChapter = useMemo(() => {
    return (
      selectedProgram?.chapters.find(
        (chapter) => chapter.id === selectedChapterId
      ) || null
    );
  }, [selectedProgram, selectedChapterId]);

  const selectedSubChapter = useMemo(() => {
    return (
      selectedChapter?.sub_chapters.find(
        (subChapter) => subChapter.id === selectedSubChapterId
      ) || null
    );
  }, [selectedChapter, selectedSubChapterId]);

  const summary = useMemo(() => {
    const totalRombel = rombelSchedules.length;

    const totalStudents = rombelSchedules.reduce((sum, rombel) => {
      return sum + rombel.students.length;
    }, 0);

    const completed = rombelSchedules.filter(
      (rombel) => rombel.alreadyAttendance
    ).length;

    const pending = totalRombel - completed;

    return {
      totalRombel,
      totalStudents,
      completed,
      pending,
    };
  }, [rombelSchedules]);

  function handleSelectRombel(rombelKey: string) {
    setSelectedRombelKey(rombelKey);

    const rombel = rombelSchedules.find((item) => item.key === rombelKey);

    if (!rombel) {
      setRombelStudents([]);
      setSelectedProgramId("");
      setSelectedChapterId("");
      setSelectedSubChapterId("");
      return;
    }

    const existingAttendanceByStudent = new Map<string, AttendanceRow>();

    attendance.forEach((item) => {
      if (
        item.teacher_id === rombel.teacher_id &&
        item.subject_id === rombel.subject_id &&
        item.attendance_date === rombel.schedule_date &&
        item.start_time === rombel.start_time &&
        item.end_time === rombel.end_time &&
        item.student_id
      ) {
        existingAttendanceByStudent.set(item.student_id, item);
      }
    });

    const nextStudents: AttendanceStudent[] = rombel.students.map((student) => {
      const existing = existingAttendanceByStudent.get(student.id);

      return {
        ...student,
        attendanceStatus: normalizeAttendanceStatus(existing?.attendance_status),
        understandingStatus: existing?.understanding_status || "Paham",
        note: existing?.note || "",
      };
    });

    setRombelStudents(nextStudents);

    setSelectedProgramId(rombel.curriculum_program_id || "");
    setSelectedChapterId(rombel.curriculum_chapter_id || "");
    setSelectedSubChapterId(rombel.curriculum_sub_chapter_id || "");
  }

  function updateStudentAttendance(
    studentId: string,
    field: "attendanceStatus" | "understandingStatus" | "note",
    value: string
  ) {
    setRombelStudents((prev) =>
      prev.map((student) => {
        if (student.id !== studentId) return student;

        const next = {
          ...student,
          [field]: value,
        };

        if (field === "attendanceStatus" && value === "Hadir") {
          next.note = "";
        }

        if (field === "attendanceStatus" && value !== "Hadir") {
          next.understandingStatus = "-";
        }

        return next;
      })
    );
  }

  function markAllPresent() {
    if (rombelStudents.length === 0) {
      alert("Pilih jadwal/rombel terlebih dahulu.");
      return;
    }

    setRombelStudents((prev) =>
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

    if (!selectedRombel) {
      alert("Pilih jadwal/rombel terlebih dahulu.");
      return false;
    }

    if (rombelStudents.length === 0) {
      alert("Tidak ada siswa di rombel ini.");
      return false;
    }

    const missingNote = rombelStudents.find((student) => {
      return student.attendanceStatus !== "Hadir" && !student.note.trim();
    });

    if (missingNote) {
      alert(
        `Keterangan wajib diisi untuk siswa yang tidak hadir: ${missingNote.full_name}`
      );
      return false;
    }

    if (!selectedProgramId) {
      alert("Pilih Program Semester terlebih dahulu.");
      return false;
    }

    if (!selectedChapterId) {
      alert("Pilih Bab terlebih dahulu.");
      return false;
    }

    if (!selectedSubChapterId) {
      alert("Pilih Sub Bab terlebih dahulu.");
      return false;
    }

    return true;
  }

  async function handleSaveAttendance() {
    if (!validateBeforeSave()) return;
    if (
      !teacher?.id ||
      !selectedRombel ||
      !selectedProgram ||
      !selectedChapter ||
      !selectedSubChapter
    ) {
      return;
    }

    setSaving(true);

    const now = new Date().toISOString();

    const { error: deleteAttendanceError } = await supabase
      .from("attendance")
      .delete()
      .eq("teacher_id", teacher.id)
      .eq("subject_id", selectedRombel.subject_id)
      .eq("attendance_date", selectedRombel.schedule_date)
      .eq("start_time", selectedRombel.start_time)
      .eq("end_time", selectedRombel.end_time);

    if (deleteAttendanceError) {
      setSaving(false);
      alert(`Gagal reset absensi lama: ${deleteAttendanceError.message}`);
      return;
    }

    const attendancePayload = rombelStudents.map((student) => ({
      teacher_id: teacher.id,
      student_id: student.id,
      subject_id: selectedRombel.subject_id,
      attendance_date: selectedRombel.schedule_date,
      start_time: selectedRombel.start_time,
      end_time: selectedRombel.end_time,
      attendance_status: student.attendanceStatus,
      understanding_status:
        student.attendanceStatus === "Hadir" ? student.understandingStatus : "-",
      material_topic: selectedRombel.material_topic,
      note: student.note.trim() || null,
      created_at: now,
      updated_at: now,
    }));

    const { error: insertAttendanceError } = await supabase
      .from("attendance")
      .insert(attendancePayload);

    if (insertAttendanceError) {
      setSaving(false);
      alert(`Gagal simpan absensi: ${insertAttendanceError.message}`);
      return;
    }

    await supabase
      .from("curriculum_progress")
      .delete()
      .eq("teacher_id", teacher.id)
      .eq("curriculum_program_id", selectedProgram.id)
      .eq("curriculum_chapter_id", selectedChapter.id)
      .eq("curriculum_sub_chapter_id", selectedSubChapter.id)
      .eq("teaching_date", selectedRombel.schedule_date);

    const presentStudents = rombelStudents.filter(
      (student) => student.attendanceStatus === "Hadir"
    );

    if (presentStudents.length > 0) {
      const progressPayload = presentStudents.map((student) => ({
        curriculum_program_id: selectedProgram.id,
        curriculum_chapter_id: selectedChapter.id,
        curriculum_sub_chapter_id: selectedSubChapter.id,
        teacher_id: teacher.id,
        student_id: student.id,
        teaching_date: selectedRombel.schedule_date,
        status: "completed",
        created_at: now,
        updated_at: now,
      }));

      const { error: progressError } = await supabase
        .from("curriculum_progress")
        .insert(progressPayload);

      if (progressError) {
        setSaving(false);
        alert(
          `Absensi tersimpan, tapi checklist Program Semester gagal: ${progressError.message}`
        );
        return;
      }
    }

    await fetchData();

    setSaving(false);
    alert("Absensi KBM berhasil disimpan dan Program Semester sudah ter-update.");

    setSelectedRombelKey("");
    setRombelStudents([]);
    setSelectedProgramId("");
    setSelectedChapterId("");
    setSelectedSubChapterId("");
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
            Pilih jadwal/rombel. Jika jadwal sudah terhubung dengan Program
            Semester, Bab, dan Sub Bab, data tersebut otomatis terpilih di
            halaman ini.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={<CalendarDays className="h-5 w-5" />}
            label="Rombel Hari Ini"
            value={summary.totalRombel}
            info={formatDate(dateFilter)}
            tone="pink"
          />

          <SummaryCard
            icon={<Users className="h-5 w-5" />}
            label="Total Siswa"
            value={summary.totalStudents}
            info="Rombel"
            tone="blue"
          />

          <SummaryCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Sudah Diabsen"
            value={summary.completed}
            info="Done"
            tone="green"
          />

          <SummaryCard
            icon={<ClipboardCheck className="h-5 w-5" />}
            label="Belum Diabsen"
            value={summary.pending}
            info="Pending"
            tone="orange"
          />
        </div>

        <div className="rounded-[22px] border border-[#E1CFBE] bg-white p-5 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8E6A58]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari mapel, sesi, materi, nama siswa, NIPD, atau NISN..."
                className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] pl-11 pr-4 text-[14px] outline-none placeholder:text-[#9A7B6C] focus:border-[#9C0824]"
              />
            </div>

            <input
              type="date"
              value={dateFilter}
              onChange={(event) => {
                setDateFilter(event.target.value);
                setSelectedRombelKey("");
                setRombelStudents([]);
                setSelectedProgramId("");
                setSelectedChapterId("");
                setSelectedSubChapterId("");
              }}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            />
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.4fr]">
          <div className="rounded-[22px] border border-[#E1CFBE] bg-white shadow-sm">
            <div className="border-b border-[#EADACA] px-5 py-4">
              <h2 className="text-[18px] font-extrabold text-[#2B1B18]">
                Pilih Jadwal / Rombel
              </h2>
              <p className="mt-1 text-[13px] text-[#6F5549]">
                Data diambil dari Jadwal Mengajar.
              </p>
            </div>

            <div className="max-h-[620px] space-y-3 overflow-y-auto p-5">
              {loading ? (
                <p className="py-10 text-center text-[14px] text-[#6F5549]">
                  Memuat jadwal...
                </p>
              ) : filteredRombelSchedules.length === 0 ? (
                <p className="py-10 text-center text-[14px] text-[#6F5549]">
                  Tidak ada jadwal pada tanggal ini.
                </p>
              ) : (
                filteredRombelSchedules.map((rombel) => (
                  <button
                    key={rombel.key}
                    type="button"
                    onClick={() => handleSelectRombel(rombel.key)}
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                      selectedRombelKey === rombel.key
                        ? "border-[#8C0F2D] bg-[#FFF2F5]"
                        : "border-[#EADACA] bg-[#FFFCF8] hover:bg-[#FFF8EF]"
                    }`}
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[15px] font-extrabold text-[#2B1B18]">
                          {rombel.subject_name}
                        </p>
                        <p className="mt-1 text-[13px] text-[#6F5549]">
                          {formatTime(rombel.start_time)} -{" "}
                          {formatTime(rombel.end_time)} • {rombel.session_name}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-extrabold ${
                          rombel.alreadyAttendance
                            ? "bg-[#C7F0DA] text-[#158A58]"
                            : "bg-[#FFF2B8] text-[#B26A00]"
                        }`}
                      >
                        {rombel.alreadyAttendance ? "Sudah" : "Belum"}
                      </span>
                    </div>

                    <p className="text-[13px] text-[#6F5549]">
                      Materi: {rombel.material_topic}
                    </p>

                    {rombel.curriculum_sub_chapter_id ? (
                      <p className="mt-2 rounded-xl bg-[#F4E5DA] px-3 py-2 text-[12px] font-bold text-[#8A2332]">
                        Terhubung Program Semester
                      </p>
                    ) : (
                      <p className="mt-2 rounded-xl bg-[#F1F5F9] px-3 py-2 text-[12px] font-bold text-[#64748B]">
                        Belum terhubung Program Semester
                      </p>
                    )}

                    <p className="mt-2 text-[12px] font-bold text-[#8A5A48]">
                      {rombel.students.length} siswa
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[22px] border border-[#E1CFBE] bg-white p-5 shadow-sm">
              <h2 className="text-[18px] font-extrabold text-[#2B1B18]">
                Program Semester
              </h2>

              <p className="mt-1 text-[13px] text-[#6F5549]">
                Jika jadwal sudah dibuat dari Program Semester, pilihan di bawah
                akan otomatis terisi.
              </p>

              {selectedRombel ? (
                <div className="mt-4 rounded-2xl border border-[#EADACA] bg-[#FFF8EF] px-4 py-3">
                  <p className="text-[13px] font-bold text-[#6F5549]">
                    Materi dari Jadwal
                  </p>
                  <p className="mt-1 text-[14px] font-extrabold text-[#2B1B18]">
                    {selectedRombel.material_topic || "-"}
                  </p>
                </div>
              ) : null}

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <FormGroup label="Program">
                  <select
                    value={selectedProgramId}
                    onChange={(event) => {
                      setSelectedProgramId(event.target.value);
                      setSelectedChapterId("");
                      setSelectedSubChapterId("");
                    }}
                    disabled={!selectedRombel}
                    className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">Pilih Program</option>
                    {availablePrograms.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.subject_name} — {program.level} {program.grade}
                      </option>
                    ))}
                  </select>
                </FormGroup>

                <FormGroup label="Bab">
                  <select
                    value={selectedChapterId}
                    onChange={(event) => {
                      setSelectedChapterId(event.target.value);
                      setSelectedSubChapterId("");
                    }}
                    disabled={!selectedProgram}
                    className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">Pilih Bab</option>
                    {selectedProgram?.chapters.map((chapter) => (
                      <option key={chapter.id} value={chapter.id}>
                        Bab {chapter.chapter_order}. {chapter.chapter_title}
                      </option>
                    ))}
                  </select>
                </FormGroup>

                <FormGroup label="Sub Bab">
                  <select
                    value={selectedSubChapterId}
                    onChange={(event) =>
                      setSelectedSubChapterId(event.target.value)
                    }
                    disabled={!selectedChapter}
                    className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">Pilih Sub Bab</option>
                    {selectedChapter?.sub_chapters.map((subChapter) => (
                      <option key={subChapter.id} value={subChapter.id}>
                        {subChapter.sub_chapter_order}.{" "}
                        {subChapter.sub_chapter_title}
                      </option>
                    ))}
                  </select>
                </FormGroup>
              </div>

              {selectedSubChapter ? (
                <div className="mt-4 rounded-2xl border border-[#EADACA] bg-[#FFF8EF] px-4 py-3 text-[13px] text-[#6F5549]">
                  Sub Bab dipilih:{" "}
                  <span className="font-extrabold text-[#2B1B18]">
                    {selectedSubChapter.sub_chapter_title}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="rounded-[22px] border border-[#E1CFBE] bg-white shadow-sm">
              <div className="flex flex-col justify-between gap-3 border-b border-[#EADACA] px-5 py-4 md:flex-row md:items-center">
                <div>
                  <h2 className="text-[18px] font-extrabold text-[#2B1B18]">
                    Input Absensi Siswa
                  </h2>

                  <p className="mt-1 text-[13px] text-[#6F5549]">
                    {selectedRombel
                      ? `${selectedRombel.subject_name} • ${formatDate(
                          selectedRombel.schedule_date
                        )}`
                      : "Pilih jadwal/rombel terlebih dahulu."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={markAllPresent}
                  disabled={rombelStudents.length === 0}
                  className="h-10 rounded-xl border border-[#DCC8B6] px-4 text-[13px] font-extrabold text-[#8C0F2D] transition hover:bg-[#FFF8EF] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Tandai Semua Hadir
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1080px] border-collapse">
                  <thead>
                    <tr className="border-b border-[#EADACA] bg-[#FFF8EF] text-left text-[13px] font-extrabold text-[#6F5549]">
                      <th className="px-5 py-4">Nama</th>
                      <th className="px-5 py-4">Kelas</th>
                      <th className="px-5 py-4 text-center">Hadir</th>
                      <th className="px-5 py-4 text-center">Izin</th>
                      <th className="px-5 py-4 text-center">Alpa</th>
                      <th className="px-5 py-4">Pemahaman</th>
                      <th className="px-5 py-4">Keterangan</th>
                    </tr>
                  </thead>

                  <tbody>
                    {rombelStudents.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-5 py-12 text-center text-[#6F5549]"
                        >
                          Belum ada rombel dipilih.
                        </td>
                      </tr>
                    ) : (
                      rombelStudents.map((student) => (
                        <tr
                          key={student.id}
                          className="border-b border-[#F0E1D4] text-[14px]"
                        >
                          <td className="px-5 py-4">
                            <p className="font-extrabold text-[#2B1B18]">
                              {student.full_name}
                            </p>
                            <p className="mt-1 text-[12px] text-[#6F5549]">
                              NIPD: {student.nis || "-"}
                              {student.nisn ? ` • NISN: ${student.nisn}` : ""}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-[#6F5549]">
                            {student.level} — {student.grade}
                          </td>

                          <td className="px-5 py-4 text-center">
                            <ChecklistButton
                              checked={student.attendanceStatus === "Hadir"}
                              onClick={() =>
                                updateStudentAttendance(
                                  student.id,
                                  "attendanceStatus",
                                  "Hadir"
                                )
                              }
                            />
                          </td>

                          <td className="px-5 py-4 text-center">
                            <ChecklistButton
                              checked={student.attendanceStatus === "Izin"}
                              onClick={() =>
                                updateStudentAttendance(
                                  student.id,
                                  "attendanceStatus",
                                  "Izin"
                                )
                              }
                            />
                          </td>

                          <td className="px-5 py-4 text-center">
                            <ChecklistButton
                              checked={student.attendanceStatus === "Alpa"}
                              onClick={() =>
                                updateStudentAttendance(
                                  student.id,
                                  "attendanceStatus",
                                  "Alpa"
                                )
                              }
                            />
                          </td>

                          <td className="px-5 py-4">
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
                          </td>

                          <td className="px-5 py-4">
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
                                  ? "Opsional"
                                  : "Wajib isi alasan"
                              }
                              className="h-10 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-3 text-[13px] outline-none placeholder:text-[#9A7B6C] focus:border-[#9C0824]"
                            />
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
                  disabled={saving || rombelStudents.length === 0}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#8C0F2D] text-[15px] font-extrabold text-white shadow-sm transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Menyimpan..." : "Simpan Absensi KBM"}
                </button>
              </div>
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