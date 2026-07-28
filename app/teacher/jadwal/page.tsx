"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import TeacherLayout from "../components/TeacherLayout";

type Teacher = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  teacher_code: string | null;
  subjects: string[] | null;
};

type StudentRelation = {
  id: string;
  full_name: string;
  grade: string | null;
  level: string | null;
  nis: string | null;
  nisn: string | null;
};

type SubjectRelation = {
  id: string;
  name: string;
  level: string | null;
  grade: string | null;
};

type CurriculumProgramRow = {
  id: string;
  teacher_id: string | null;
  subject_name: string | null;
  level: string | null;
  grade: string | null;
  semester: string | null;
  academic_year: string | null;
  status: string | null;
};

type CurriculumChapterRow = {
  id: string;
  curriculum_program_id: string | null;
  chapter_title: string | null;
  chapter_order: number | null;
};

type CurriculumSubChapterRow = {
  id: string;
  curriculum_chapter_id: string | null;
  sub_chapter_title: string | null;
  sub_chapter_order: number | null;
  target_month: string | null;
  planned_week: number | null;
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
  duration_minutes: number | null;
  session_name: string | null;
  material_topic: string | null;
  notes: string | null;
  temporary_schedule_url: string | null;
  academic_year: string | null;
  semester: string | null;
  curriculum_program_id?: string | null;
  curriculum_chapter_id?: string | null;
  curriculum_sub_chapter_id?: string | null;
  created_at: string | null;
  students: StudentRelation | StudentRelation[] | null;
  subjects: SubjectRelation | SubjectRelation[] | null;
};

type Schedule = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
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
  curriculum_program_id: string | null;
  curriculum_chapter_id: string | null;
  curriculum_sub_chapter_id: string | null;
  curriculum_program_title: string;
  curriculum_chapter_title: string;
  curriculum_sub_chapter_title: string;
  created_at: string | null;
  students: StudentRelation | null;
  subjects: SubjectRelation | null;
};

type KbmForm = {
  schedule_id: string;
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
const ACADEMIC_YEAR_START = "2026-07-01";
const ACADEMIC_YEAR_END = "2027-06-30";

const initialKbmForm: KbmForm = {
  schedule_id: "",
  student_id: "",
  subject_id: "",
  report_date: new Date().toISOString().slice(0, 10),
  class_level: "",
  semester: "Genap",
  chapter: "",
  material_topic: "",
  learning_issue: "",
  solution: "",
  teacher_note: "",
  status: "draft",
};

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

function formatDate(date: string | null) {
  if (!date) return "-";

  const parsedDate = new Date(`${date}T00:00:00`);

  return parsedDate.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(time: string | null) {
  if (!time) return "-";
  return time.slice(0, 5);
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getDayOrder(dayName: string | null) {
  const days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
  const index = days.findIndex((day) => day === dayName);

  return index === -1 ? 99 : index;
}

function getSessionBadge(session: string | null) {
  if (session === "Sesi 1") return "bg-emerald-100 text-emerald-700";
  if (session === "Sesi 2") return "bg-blue-100 text-blue-700";
  if (session === "Sesi 3") return "bg-purple-100 text-purple-700";

  return "bg-slate-200 text-slate-700";
}

function getProgramTitle(program?: CurriculumProgramRow | null) {
  if (!program) return "-";

  return [
    program.subject_name || "-",
    program.level || "-",
    program.grade || "-",
    `Semester ${program.semester || "-"}`,
  ].join(" • ");
}

function getChapterDisplay(
  chapterTitle?: string | null,
  subChapterTitle?: string | null
) {
  const chapter = chapterTitle && chapterTitle !== "-" ? chapterTitle : "";
  const subChapter =
    subChapterTitle && subChapterTitle !== "-" ? subChapterTitle : "";

  if (chapter && subChapter) return `${chapter} - ${subChapter}`;
  if (chapter) return chapter;
  if (subChapter) return subChapter;

  return "-";
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
  const diff = endTotal - startTotal;

  return diff > 0 ? diff : null;
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

export default function TeacherJadwalPage() {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  const [loading, setLoading] = useState(true);
  const [savingReport, setSavingReport] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [search, setSearch] = useState("");
  const [dayFilter, setDayFilter] = useState("Semua Hari");
  const [subjectFilter, setSubjectFilter] = useState("Semua Mapel");

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportForm, setReportForm] = useState<KbmForm>(initialKbmForm);

  async function fetchActiveTeacher() {
    const { data: authData } = await supabase.auth.getUser();

    const email =
      authData.user?.email ||
      localStorage.getItem("hstkb_demo_email") ||
      localStorage.getItem("hstkb_email") ||
      "";

    if (email) {
      const { data, error } = await supabase
        .from("teachers")
        .select("id, full_name, email, phone, teacher_code, subjects")
        .eq("email", email)
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);

      if (data) {
        setTeacher(data as Teacher);
        return data as Teacher;
      }
    }

    const { data, error } = await supabase
      .from("teachers")
      .select("id, full_name, email, phone, teacher_code, subjects")
      .order("teacher_code", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);

    setTeacher((data as Teacher) || null);

    return (data as Teacher) || null;
  }

  async function fetchSchedules(teacherId: string) {
    const [schedulesRes, programsRes, chaptersRes, subChaptersRes] =
      await Promise.all([
        supabase
          .from("schedules")
          .select(
            `
            id,
            student_id,
            teacher_id,
            subject_id,
            day_name,
            schedule_date,
            start_time,
            end_time,
            duration_minutes,
            session_name,
            material_topic,
            notes,
            temporary_schedule_url,
            academic_year,
            semester,
            curriculum_program_id,
            curriculum_chapter_id,
            curriculum_sub_chapter_id,
            created_at,
            students (
              id,
              full_name,
              grade,
              level,
              nis,
              nisn
            ),
            subjects (
              id,
              name,
              level,
              grade
            )
          `
          )
          .eq("teacher_id", teacherId)
          .gte("schedule_date", ACADEMIC_YEAR_START)
          .lte("schedule_date", ACADEMIC_YEAR_END)
          .order("schedule_date", { ascending: true })
          .order("start_time", { ascending: true }),

        supabase.from("curriculum_programs").select("*"),
        supabase.from("curriculum_chapters").select("*"),
        supabase.from("curriculum_sub_chapters").select("*"),
      ]);

    if (schedulesRes.error) throw new Error(schedulesRes.error.message);
    if (programsRes.error) throw new Error(programsRes.error.message);
    if (chaptersRes.error) throw new Error(chaptersRes.error.message);
    if (subChaptersRes.error) throw new Error(subChaptersRes.error.message);

    const rows = (schedulesRes.data || []) as ScheduleRow[];
    const programs = (programsRes.data || []) as CurriculumProgramRow[];
    const chapters = (chaptersRes.data || []) as CurriculumChapterRow[];
    const subChapters = (subChaptersRes.data || []) as CurriculumSubChapterRow[];

    const programMap = new Map(programs.map((program) => [program.id, program]));
    const chapterMap = new Map(chapters.map((chapter) => [chapter.id, chapter]));
    const subChapterMap = new Map(
      subChapters.map((subChapter) => [subChapter.id, subChapter])
    );

    const normalizedSchedules: Schedule[] = rows
      .filter((item) => {
        if (!item.schedule_date) return false;

        const isAcademicYearDate =
          item.schedule_date >= ACADEMIC_YEAR_START &&
          item.schedule_date <= ACADEMIC_YEAR_END;

        const isAcademicYearMatch =
          !item.academic_year || item.academic_year === ACADEMIC_YEAR;

        return isAcademicYearDate && isAcademicYearMatch;
      })
      .map((item) => {
        const program = item.curriculum_program_id
          ? programMap.get(item.curriculum_program_id)
          : null;

        const chapter = item.curriculum_chapter_id
          ? chapterMap.get(item.curriculum_chapter_id)
          : null;

        const subChapter = item.curriculum_sub_chapter_id
          ? subChapterMap.get(item.curriculum_sub_chapter_id)
          : null;

        return {
          id: item.id,
          student_id: item.student_id,
          teacher_id: item.teacher_id,
          subject_id: item.subject_id,
          day_name: item.day_name,
          schedule_date: item.schedule_date,
          start_time: item.start_time,
          end_time: item.end_time,
          duration_minutes: item.duration_minutes,
          session_name: item.session_name,
          material_topic: item.material_topic,
          notes: item.notes,
          temporary_schedule_url: item.temporary_schedule_url,
          academic_year: item.academic_year,
          semester: item.semester,
          curriculum_program_id: item.curriculum_program_id || null,
          curriculum_chapter_id: item.curriculum_chapter_id || null,
          curriculum_sub_chapter_id: item.curriculum_sub_chapter_id || null,
          curriculum_program_title: program ? getProgramTitle(program) : "-",
          curriculum_chapter_title: chapter?.chapter_title || "-",
          curriculum_sub_chapter_title: subChapter?.sub_chapter_title || "-",
          created_at: item.created_at,
          students: normalizeRelation(item.students),
          subjects: normalizeRelation(item.subjects),
        };
      });

    setSchedules(normalizedSchedules);
  }

  async function fetchPageData() {
    setLoading(true);
    setErrorMessage("");

    try {
      const activeTeacher = await fetchActiveTeacher();

      if (!activeTeacher) {
        setErrorMessage("Belum ada data guru di table teachers.");
        setLoading(false);
        return;
      }

      await fetchSchedules(activeTeacher.id);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengambil data jadwal mengajar.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPageData();
  }, []);

  const subjectOptions = useMemo(() => {
    const subjects = schedules
      .map((schedule) => schedule.subjects?.name)
      .filter(Boolean) as string[];

    return Array.from(new Set(subjects));
  }, [schedules]);

  const filteredSchedules = useMemo(() => {
    const keyword = normalizeText(search);

    return schedules.filter((schedule) => {
      const matchSearch =
        !keyword ||
        normalizeText(schedule.students?.full_name).includes(keyword) ||
        normalizeText(schedule.students?.grade).includes(keyword) ||
        normalizeText(schedule.students?.level).includes(keyword) ||
        normalizeText(schedule.students?.nis).includes(keyword) ||
        normalizeText(schedule.students?.nisn).includes(keyword) ||
        normalizeText(schedule.subjects?.name).includes(keyword) ||
        normalizeText(schedule.material_topic).includes(keyword) ||
        normalizeText(schedule.notes).includes(keyword) ||
        normalizeText(schedule.session_name).includes(keyword) ||
        normalizeText(schedule.day_name).includes(keyword) ||
        normalizeText(schedule.curriculum_program_title).includes(keyword) ||
        normalizeText(schedule.curriculum_chapter_title).includes(keyword) ||
        normalizeText(schedule.curriculum_sub_chapter_title).includes(keyword);

      const matchDay =
        dayFilter === "Semua Hari" || schedule.day_name === dayFilter;

      const matchSubject =
        subjectFilter === "Semua Mapel" ||
        schedule.subjects?.name === subjectFilter;

      return matchSearch && matchDay && matchSubject;
    });
  }, [schedules, search, dayFilter, subjectFilter]);

  const sortedSchedules = useMemo(() => {
    return [...filteredSchedules].sort((a, b) => {
      const dateCompare = (a.schedule_date || "").localeCompare(
        b.schedule_date || ""
      );

      if (dateCompare !== 0) return dateCompare;

      const dayDiff = getDayOrder(a.day_name) - getDayOrder(b.day_name);

      if (dayDiff !== 0) return dayDiff;

      return formatTime(a.start_time).localeCompare(formatTime(b.start_time));
    });
  }, [filteredSchedules]);

  const todaySchedules = useMemo(() => {
    const today = getTodayDate();

    return schedules.filter((schedule) => schedule.schedule_date === today);
  }, [schedules]);

  const totalStudents = useMemo(() => {
    const studentIds = schedules
      .map((schedule) => schedule.student_id)
      .filter(Boolean) as string[];

    return new Set(studentIds).size;
  }, [schedules]);

  const totalTemporaryFiles = useMemo(() => {
    return schedules.filter((schedule) => schedule.temporary_schedule_url).length;
  }, [schedules]);

  const totalSessions = schedules.length;

  function getReportChapterFromSchedule(schedule: Schedule) {
    const curriculumChapter = getChapterDisplay(
      schedule.curriculum_chapter_title,
      schedule.curriculum_sub_chapter_title
    );

    if (curriculumChapter !== "-") return curriculumChapter;

    return schedule.session_name || "";
  }

  function openReportModal(schedule?: Schedule) {
    setErrorMessage("");

    if (!schedule && schedules.length === 0) {
      setErrorMessage(
        "Belum ada jadwal untuk guru ini. Silakan buat jadwal terlebih dahulu dari menu Kepala Sekolah → Jadwal Guru."
      );
      return;
    }

    if (schedule) {
      setReportForm({
        ...initialKbmForm,
        schedule_id: schedule.id,
        student_id: schedule.student_id || "",
        subject_id: schedule.subject_id || "",
        report_date:
          schedule.schedule_date || new Date().toISOString().slice(0, 10),
        class_level: schedule.students?.grade || "",
        semester: schedule.semester || "Genap",
        chapter: getReportChapterFromSchedule(schedule),
        material_topic:
          schedule.curriculum_sub_chapter_title !== "-"
            ? schedule.curriculum_sub_chapter_title
            : schedule.material_topic || "",
      });
    } else {
      setReportForm({
        ...initialKbmForm,
        report_date: new Date().toISOString().slice(0, 10),
      });
    }

    setIsReportModalOpen(true);
  }

  function closeReportModal() {
    setIsReportModalOpen(false);
    setErrorMessage("");

    setReportForm({
      ...initialKbmForm,
      report_date: new Date().toISOString().slice(0, 10),
    });
  }

  function handleReportScheduleChange(scheduleId: string) {
    const selectedSchedule = schedules.find(
      (schedule) => schedule.id === scheduleId
    );

    if (!selectedSchedule) {
      setReportForm({
        ...reportForm,
        schedule_id: "",
        student_id: "",
        subject_id: "",
        class_level: "",
        chapter: "",
        material_topic: "",
      });
      return;
    }

    setReportForm({
      ...reportForm,
      schedule_id: selectedSchedule.id,
      student_id: selectedSchedule.student_id || "",
      subject_id: selectedSchedule.subject_id || "",
      report_date:
        selectedSchedule.schedule_date ||
        reportForm.report_date ||
        new Date().toISOString().slice(0, 10),
      class_level: selectedSchedule.students?.grade || "",
      semester: selectedSchedule.semester || reportForm.semester || "Genap",
      chapter: getReportChapterFromSchedule(selectedSchedule),
      material_topic:
        selectedSchedule.curriculum_sub_chapter_title !== "-"
          ? selectedSchedule.curriculum_sub_chapter_title
          : selectedSchedule.material_topic || "",
    });
  }

  async function handleSubmitKbmReport(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setErrorMessage("");

    if (!teacher?.id) {
      setErrorMessage("Data guru aktif tidak ditemukan.");
      return;
    }

    if (!reportForm.schedule_id) {
      setErrorMessage("Jadwal wajib dipilih.");
      return;
    }

    if (!reportForm.student_id) {
      setErrorMessage("Murid wajib dipilih.");
      return;
    }

    if (!reportForm.subject_id) {
      setErrorMessage("Mata pelajaran wajib dipilih.");
      return;
    }

    if (!reportForm.report_date) {
      setErrorMessage("Tanggal laporan wajib diisi.");
      return;
    }

    if (!reportForm.material_topic.trim()) {
      setErrorMessage("Materi KBM wajib diisi.");
      return;
    }

    setSavingReport(true);

    try {
      const { error } = await supabase.from("kbm_reports").insert({
        student_id: reportForm.student_id,
        teacher_id: teacher.id,
        subject_id: reportForm.subject_id,
        report_date: reportForm.report_date,
        class_level: reportForm.class_level.trim() || null,
        semester: reportForm.semester,
        chapter: reportForm.chapter.trim() || null,
        material_topic: reportForm.material_topic.trim(),
        learning_issue: reportForm.learning_issue.trim() || null,
        solution: reportForm.solution.trim() || null,
        teacher_note: reportForm.teacher_note.trim() || null,
        status: reportForm.status,
      });

      if (error) {
        throw new Error(error.message);
      }

      closeReportModal();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal menyimpan laporan KBM.");
      }
    } finally {
      setSavingReport(false);
    }
  }

  return (
    <TeacherLayout
      activeMenu="Jadwal Mengajar"
      searchPlaceholder="Cari jadwal mengajar..."
      buttonLabel="+ Buat Laporan"
    >
      <div className="w-full max-w-full overflow-hidden">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#6B4A3A]">
              Teacher Portal
            </p>

            <h1 className="mt-1 text-[30px] font-bold tracking-tight">
              Jadwal Mengajar
            </h1>

            <p className="mt-1 text-sm text-[#6B4A3A]">
              Jadwal pembelajaran yang terhubung dengan{" "}
              <span className="font-bold text-[#2B1B18]">
                {teacher?.full_name || "guru aktif"}
              </span>
              .
            </p>

            <p className="mt-1 text-xs font-semibold text-[#8A5A48]">
              Academic Year {ACADEMIC_YEAR}
            </p>
          </div>

          <button
            type="button"
            onClick={() => openReportModal()}
            disabled={schedules.length === 0}
            className="w-fit rounded-xl bg-[#7A1F2B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Buat Laporan
          </button>
        </div>

        {errorMessage && !isReportModalOpen && (
          <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {loading && (
          <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-8 text-center text-sm shadow-sm">
            Loading jadwal mengajar...
          </div>
        )}

        {!loading && schedules.length === 0 && (
          <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
            <p className="text-[15px] font-bold text-[#2B1B18]">
              Belum ada jadwal untuk guru ini.
            </p>
            <p className="mt-2 text-sm leading-6 text-[#6B4A3A]">
              Silakan buat jadwal terlebih dahulu dari menu Kepala Sekolah →
              Jadwal Guru. Pastikan guru yang dipilih adalah{" "}
              <span className="font-bold text-[#2B1B18]">
                {teacher?.full_name || "guru aktif"}
              </span>{" "}
              dan tanggal masuk ke Academic Year {ACADEMIC_YEAR}.
            </p>
          </div>
        )}

        {!loading && (
          <>
            <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6B4A3A]">Total Jadwal</p>
                <p className="mt-4 text-3xl font-bold">{totalSessions}</p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6B4A3A]">Jadwal Hari Ini</p>
                <p className="mt-4 text-3xl font-bold">
                  {todaySchedules.length}
                </p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6B4A3A]">Total Murid</p>
                <p className="mt-4 text-3xl font-bold">{totalStudents}</p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6B4A3A]">File Jadwal</p>
                <p className="mt-4 text-3xl font-bold">{totalTemporaryFiles}</p>
              </div>
            </div>

            <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_200px_220px]">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari siswa, NIPD, NISN, kelas, mapel, materi, keterangan..."
                  className="w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                />

                <select
                  value={dayFilter}
                  onChange={(event) => setDayFilter(event.target.value)}
                  className="rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                >
                  <option>Semua Hari</option>
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
                  onChange={(event) => setSubjectFilter(event.target.value)}
                  className="rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                >
                  <option>Semua Mapel</option>
                  {subjectOptions.map((subject) => (
                    <option key={subject}>{subject}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
              <div className="overflow-hidden rounded-2xl border border-[#E8D6C1] bg-white shadow-sm">
                <div className="border-b border-[#E8D6C1] px-6 py-5">
                  <h2 className="text-lg font-bold">Daftar Jadwal</h2>
                  <p className="mt-1 text-sm text-[#6B4A3A]">
                    Format mengikuti template jadwal sekolah: hari, tanggal,
                    datang, pulang, jam, sesi, kelas, mapel, materi, siswa, dan
                    keterangan.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1680px] text-left">
                    <thead className="bg-[#FFF8EF] text-sm font-bold text-[#6B4A3A]">
                      <tr>
                        <th className="px-4 py-4">No</th>
                        <th className="px-4 py-4">Hari</th>
                        <th className="px-4 py-4">Tanggal</th>
                        <th className="px-4 py-4">Nama Guru</th>
                        <th className="px-4 py-4">Datang</th>
                        <th className="px-4 py-4">Pulang</th>
                        <th className="px-4 py-4">Durasi</th>
                        <th className="px-4 py-4">Jam</th>
                        <th className="px-4 py-4">Sesi</th>
                        <th className="px-4 py-4">Kls</th>
                        <th className="px-4 py-4">Mapel</th>
                        <th className="px-4 py-4">Materi</th>
                        <th className="px-4 py-4">Siswa</th>
                        <th className="px-4 py-4">NIPD</th>
                        <th className="px-4 py-4">Keterangan</th>
                        <th className="px-4 py-4">File</th>
                        <th className="px-4 py-4">Aksi</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#E8D6C1]">
                      {sortedSchedules.length === 0 && (
                        <tr>
                          <td
                            colSpan={17}
                            className="px-4 py-10 text-center text-sm text-[#6B4A3A]"
                          >
                            Belum ada jadwal mengajar untuk guru ini pada
                            Academic Year {ACADEMIC_YEAR}.
                          </td>
                        </tr>
                      )}

                      {sortedSchedules.map((schedule, index) => (
                        <tr key={schedule.id} className="hover:bg-[#FFF8EF]">
                          <td className="px-4 py-4 font-bold">{index + 1}</td>

                          <td className="px-4 py-4 font-semibold">
                            {schedule.day_name || "-"}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4">
                            {formatDate(schedule.schedule_date)}
                          </td>

                          <td className="px-4 py-4 font-semibold">
                            {teacher?.full_name || "-"}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4">
                            {formatTime(schedule.start_time)}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4">
                            {formatTime(schedule.end_time)}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4">
                            {formatDuration(
                              schedule.duration_minutes,
                              schedule.start_time,
                              schedule.end_time
                            )}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4">
                            {formatTime(schedule.start_time)}-
                            {formatTime(schedule.end_time)}
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${getSessionBadge(
                                schedule.session_name
                              )}`}
                            >
                              {schedule.session_name || "-"}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            {formatClass(
                              schedule.students?.level,
                              schedule.students?.grade
                            )}
                          </td>

                          <td className="px-4 py-4">
                            {schedule.subjects?.name || "-"}
                          </td>

                          <td className="max-w-[260px] px-4 py-4">
                            <p className="line-clamp-2 font-semibold text-[#2B1B18]">
                              {schedule.material_topic || "-"}
                            </p>

                            {schedule.curriculum_sub_chapter_title !== "-" ? (
                              <p className="mt-1 text-xs text-[#6B4A3A]">
                                {schedule.curriculum_chapter_title} •{" "}
                                {schedule.curriculum_sub_chapter_title}
                              </p>
                            ) : null}
                          </td>

                          <td className="px-4 py-4 font-semibold">
                            {schedule.students?.full_name || "-"}
                          </td>

                          <td className="px-4 py-4">
                            {schedule.students?.nis || "-"}
                          </td>

                          <td className="max-w-[240px] px-4 py-4">
                            <p className="line-clamp-2 text-sm text-[#6B4A3A]">
                              {schedule.notes || "-"}
                            </p>
                          </td>

                          <td className="px-4 py-4">
                            {schedule.temporary_schedule_url ? (
                              <a
                                href={schedule.temporary_schedule_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex whitespace-nowrap rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700 underline"
                              >
                                Lihat File
                              </a>
                            ) : (
                              <span className="text-sm text-[#6B4A3A]">-</span>
                            )}
                          </td>

                          <td className="px-4 py-4">
                            <button
                              type="button"
                              onClick={() => openReportModal(schedule)}
                              className="whitespace-nowrap rounded-xl bg-[#7A1F2B] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#54131D]"
                            >
                              + Laporan
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold">Guru Aktif</h2>

                  <div className="mt-5 rounded-2xl bg-[#FFF8EF] p-5">
                    <p className="text-sm text-[#6B4A3A]">Nama Guru</p>
                    <p className="mt-2 text-xl font-bold">
                      {teacher?.full_name || "-"}
                    </p>

                    <div className="mt-4 space-y-2 text-sm text-[#6B4A3A]">
                      <p>
                        <span className="font-semibold text-[#2B1B18]">
                          Kode:
                        </span>{" "}
                        {teacher?.teacher_code || "-"}
                      </p>

                      <p>
                        <span className="font-semibold text-[#2B1B18]">
                          Email:
                        </span>{" "}
                        {teacher?.email || "-"}
                      </p>

                      <p>
                        <span className="font-semibold text-[#2B1B18]">
                          Mapel:
                        </span>{" "}
                        {teacher?.subjects?.join(", ") || "-"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold">Jadwal Hari Ini</h2>

                  <div className="mt-5 space-y-3">
                    {todaySchedules.length === 0 && (
                      <div className="rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] p-4 text-sm text-[#6B4A3A]">
                        Tidak ada jadwal hari ini.
                      </div>
                    )}

                    {todaySchedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        className="rounded-xl border border-[#E8D6C1] p-4"
                      >
                        <p className="font-bold">
                          {schedule.students?.full_name || "-"}
                        </p>

                        <p className="mt-1 text-sm text-[#6B4A3A]">
                          {formatTime(schedule.start_time)} -{" "}
                          {formatTime(schedule.end_time)} •{" "}
                          {formatDuration(
                            schedule.duration_minutes,
                            schedule.start_time,
                            schedule.end_time
                          )}
                        </p>

                        <p className="mt-1 text-sm text-[#6B4A3A]">
                          {schedule.subjects?.name || "-"} •{" "}
                          {schedule.material_topic || "-"}
                        </p>

                        {schedule.notes ? (
                          <p className="mt-2 rounded-xl bg-[#FFF8EF] px-3 py-2 text-xs text-[#6B4A3A]">
                            {schedule.notes}
                          </p>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => openReportModal(schedule)}
                          className="mt-3 w-full rounded-xl bg-[#7A1F2B] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#54131D]"
                        >
                          + Buat Laporan
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold">Catatan</h2>
                  <p className="mt-3 text-sm leading-6 text-[#6B4A3A]">
                    Jadwal guru hanya bersifat lihat data. Untuk membuat atau
                    mengubah jadwal, gunakan menu Kepala Sekolah → Jadwal Guru.
                    Tombol + Laporan dipakai guru untuk membuat Laporan KBM dari
                    jadwal yang sudah ada.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
          <div className="flex max-h-[92vh] w-full max-w-[500px] flex-col overflow-hidden rounded-2xl bg-[#FAF3EA] shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-[#E8D6C1] px-6 py-5">
              <h2 className="text-xl font-bold">Buat Laporan KBM</h2>

              <button
                type="button"
                onClick={closeReportModal}
                className="text-2xl leading-none text-[#6B4A3A] hover:text-[#7A1F2B]"
              >
                ×
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              {errorMessage && (
                <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}

              {schedules.length === 0 ? (
                <div className="rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] px-4 py-4 text-sm leading-6 text-[#6B4A3A]">
                  Belum ada jadwal untuk guru ini. Silakan buat jadwal terlebih
                  dahulu dari menu Kepala Sekolah → Jadwal Guru.
                </div>
              ) : null}

              <form onSubmit={handleSubmitKbmReport} className="space-y-4">
                <div>
                  <label className="text-sm font-bold">Pilih Jadwal</label>
                  <select
                    value={reportForm.schedule_id}
                    onChange={(event) =>
                      handleReportScheduleChange(event.target.value)
                    }
                    disabled={schedules.length === 0}
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B] disabled:cursor-not-allowed disabled:bg-[#FFF8EF] disabled:opacity-70"
                  >
                    <option value="">
                      {schedules.length === 0
                        ? "Belum ada jadwal"
                        : "Pilih jadwal"}
                    </option>
                    {schedules.map((schedule) => (
                      <option key={schedule.id} value={schedule.id}>
                        {schedule.students?.full_name || "-"} —{" "}
                        {schedule.subjects?.name || "-"} —{" "}
                        {schedule.day_name || "-"}{" "}
                        {formatTime(schedule.start_time)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-bold">Murid</label>
                  <input
                    value={
                      schedules.find(
                        (schedule) => schedule.id === reportForm.schedule_id
                      )?.students?.full_name || ""
                    }
                    readOnly
                    placeholder="Otomatis dari jadwal"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] px-4 py-3 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Mata Pelajaran</label>
                  <input
                    value={
                      schedules.find(
                        (schedule) => schedule.id === reportForm.schedule_id
                      )?.subjects?.name || ""
                    }
                    readOnly
                    placeholder="Otomatis dari jadwal"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] px-4 py-3 text-sm outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-bold">Tanggal</label>
                    <input
                      type="date"
                      value={reportForm.report_date}
                      onChange={(event) =>
                        setReportForm({
                          ...reportForm,
                          report_date: event.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold">Semester</label>
                    <select
                      value={reportForm.semester}
                      onChange={(event) =>
                        setReportForm({
                          ...reportForm,
                          semester: event.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    >
                      <option>Ganjil</option>
                      <option>Genap</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold">Kelas</label>
                  <input
                    value={reportForm.class_level}
                    onChange={(event) =>
                      setReportForm({
                        ...reportForm,
                        class_level: event.target.value,
                      })
                    }
                    placeholder="Contoh: Grade 4"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Bab / Unit</label>
                  <input
                    value={reportForm.chapter}
                    onChange={(event) =>
                      setReportForm({
                        ...reportForm,
                        chapter: event.target.value,
                      })
                    }
                    placeholder="Contoh: Bab 5 / Sesi 1"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Materi KBM</label>
                  <input
                    value={reportForm.material_topic}
                    onChange={(event) =>
                      setReportForm({
                        ...reportForm,
                        material_topic: event.target.value,
                      })
                    }
                    placeholder="Contoh: Pecahan Senilai"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Masalah Belajar</label>
                  <textarea
                    value={reportForm.learning_issue}
                    onChange={(event) =>
                      setReportForm({
                        ...reportForm,
                        learning_issue: event.target.value,
                      })
                    }
                    rows={3}
                    placeholder="Contoh: Siswa masih kesulitan menyamakan penyebut"
                    className="mt-2 w-full resize-none rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Solusi</label>
                  <textarea
                    value={reportForm.solution}
                    onChange={(event) =>
                      setReportForm({
                        ...reportForm,
                        solution: event.target.value,
                      })
                    }
                    rows={3}
                    placeholder="Contoh: Latihan tambahan dengan visual pecahan"
                    className="mt-2 w-full resize-none rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Keterangan Guru</label>
                  <textarea
                    value={reportForm.teacher_note}
                    onChange={(event) =>
                      setReportForm({
                        ...reportForm,
                        teacher_note: event.target.value,
                      })
                    }
                    rows={3}
                    placeholder="Catatan guru terkait proses KBM"
                    className="mt-2 w-full resize-none rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Status</label>
                  <select
                    value={reportForm.status}
                    onChange={(event) =>
                      setReportForm({
                        ...reportForm,
                        status: event.target.value,
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  >
                    <option value="draft">draft</option>
                    <option value="pending_review">pending_review</option>
                    <option value="published">published</option>
                  </select>
                </div>

                <div className="sticky bottom-0 -mx-6 mt-5 border-t border-[#E8D6C1] bg-[#FAF3EA] px-6 pb-1 pt-4">
                  <button
                    type="submit"
                    disabled={savingReport || schedules.length === 0}
                    className="w-full rounded-xl bg-[#7A1F2B] py-3 text-sm font-bold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingReport ? "Menyimpan..." : "Simpan Laporan KBM"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </TeacherLayout>
  );
}