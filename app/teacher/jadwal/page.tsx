"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import TeacherLayout from "../components/TeacherLayout";

type Teacher = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone?: string | null;
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
  duration_minutes: number | null;
  session_name: string | null;
  material_topic: string | null;
  notes: string | null;
  temporary_schedule_url: string | null;
  academic_year: string | null;
  semester: string | null;
  created_at: string | null;
};

type EnrichedSchedule = ScheduleRow & {
  student_name: string;
  student_grade: string;
  student_level: string;
  student_nipd: string;
  student_nisn: string;
  subject_name: string;
  subject_level: string;
  subject_grade: string;
};

const ACADEMIC_YEAR = "2026/2027";
const ACADEMIC_YEAR_START = "2026-07-01";
const ACADEMIC_YEAR_END = "2027-06-30";

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

function formatTeacherSubject(subjects: Teacher["subjects"]) {
  if (!subjects) return "Guru";

  if (Array.isArray(subjects)) {
    return `Guru Mapel — ${subjects.slice(0, 4).join(", ")}`;
  }

  return `Guru Mapel — ${subjects}`;
}

function formatDate(date: string | null) {
  if (!date) return "-";

  const parsedDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) return "-";

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

function getGradeNumber(value?: string | null) {
  const match = (value || "").match(/\d+/);
  return match ? Number(match[0]) : 999;
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
  const [schedules, setSchedules] = useState<EnrichedSchedule[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("Semua Kelas");
  const [dayFilter, setDayFilter] = useState("Semua Hari");
  const [subjectFilter, setSubjectFilter] = useState("Semua Mapel");

  const [editingSchedule, setEditingSchedule] =
    useState<EnrichedSchedule | null>(null);
  const [materialInput, setMaterialInput] = useState("");
  const [savingMaterial, setSavingMaterial] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  async function fetchActiveTeacher() {
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
        .select("id, full_name, email, phone, teacher_code, subjects")
        .ilike("email", email)
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (data) return data as Teacher;
    }

    if (teacherCode) {
      const { data, error } = await supabase
        .from("teachers")
        .select("id, full_name, email, phone, teacher_code, subjects")
        .eq("teacher_code", teacherCode)
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (data) return data as Teacher;
    }

    return null;
  }

  async function fetchPageData() {
    setLoading(true);
    setErrorMessage("");

    try {
      const activeTeacher = await fetchActiveTeacher();

      setTeacher(activeTeacher);

      if (!activeTeacher?.id) {
        setSchedules([]);
        setErrorMessage(
          "Data guru belum terhubung dengan akun login ini. Hubungkan email guru di tabel teachers atau isi teacher_code."
        );
        return;
      }

      const [studentsRes, subjectsRes, schedulesRes] = await Promise.all([
        supabase.from("students").select("*").order("full_name"),
        supabase.from("subjects").select("*").order("name"),
        supabase
          .from("schedules")
          .select("*")
          .eq("teacher_id", activeTeacher.id)
          .gte("schedule_date", ACADEMIC_YEAR_START)
          .lte("schedule_date", ACADEMIC_YEAR_END)
          .order("schedule_date", { ascending: true })
          .order("start_time", { ascending: true }),
      ]);

      if (studentsRes.error) throw new Error(studentsRes.error.message);
      if (subjectsRes.error) throw new Error(subjectsRes.error.message);
      if (schedulesRes.error) throw new Error(schedulesRes.error.message);

      const studentsData = (studentsRes.data || []) as StudentRow[];
      const subjectsData = (subjectsRes.data || []) as SubjectRow[];
      const schedulesData = (schedulesRes.data || []) as ScheduleRow[];

      const studentMap = new Map(
        studentsData.map((student) => [student.id, student])
      );

      const subjectMap = new Map(
        subjectsData.map((subject) => [subject.id, subject])
      );

      const enriched = schedulesData
        .filter((item) => {
          if (!item.schedule_date) return false;

          const isAcademicYearDate =
            item.schedule_date >= ACADEMIC_YEAR_START &&
            item.schedule_date <= ACADEMIC_YEAR_END;

          const isAcademicYearMatch =
            !item.academic_year || item.academic_year === ACADEMIC_YEAR;

          return isAcademicYearDate && isAcademicYearMatch;
        })
        .map((schedule) => {
          const student = schedule.student_id
            ? studentMap.get(schedule.student_id)
            : null;

          const subject = schedule.subject_id
            ? subjectMap.get(schedule.subject_id)
            : null;

          return {
            ...schedule,
            student_name: student?.full_name || "-",
            student_grade: student?.grade || "-",
            student_level: student?.level || "-",
            student_nipd: student?.nis || "-",
            student_nisn: student?.nisn || "-",
            subject_name: subject?.name || "-",
            subject_level: subject?.level || "-",
            subject_grade: subject?.grade || "-",
          };
        });

      setSchedules(enriched);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengambil data jadwal mengajar.");
      }

      setTeacher(null);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPageData();

    const channel = supabase
      .channel("teacher-jadwal-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teachers" },
        () => fetchPageData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "schedules" },
        () => fetchPageData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        () => fetchPageData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subjects" },
        () => fetchPageData()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const classOptions = useMemo(() => {
    return Array.from(
      new Set(
        schedules
          .map((schedule) =>
            formatClass(schedule.student_level, schedule.student_grade)
          )
          .filter((value) => value && value !== "-")
      )
    ).sort((a, b) => {
      const gradeA = getGradeNumber(a);
      const gradeB = getGradeNumber(b);

      if (gradeA !== gradeB) return gradeA - gradeB;
      return a.localeCompare(b);
    });
  }, [schedules]);

  const studentsInSelectedClass = useMemo(() => {
    if (classFilter === "Semua Kelas") return [];

    return Array.from(
      new Set(
        schedules
          .filter(
            (schedule) =>
              formatClass(schedule.student_level, schedule.student_grade) ===
              classFilter
          )
          .map((schedule) => schedule.student_name)
          .filter((name) => name && name !== "-")
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [schedules, classFilter]);

  const subjectOptions = useMemo(() => {
    const names = schedules
      .map((schedule) => schedule.subject_name)
      .filter((name) => name && name !== "-");

    return Array.from(new Set(names));
  }, [schedules]);

  const filteredSchedules = useMemo(() => {
    const keyword = normalizeText(search);

    return schedules.filter((schedule) => {
      const matchSearch =
        !keyword ||
        normalizeText(schedule.student_name).includes(keyword) ||
        normalizeText(schedule.student_grade).includes(keyword) ||
        normalizeText(schedule.student_level).includes(keyword) ||
        normalizeText(schedule.student_nipd).includes(keyword) ||
        normalizeText(schedule.student_nisn).includes(keyword) ||
        normalizeText(schedule.subject_name).includes(keyword) ||
        normalizeText(schedule.material_topic).includes(keyword) ||
        normalizeText(schedule.notes).includes(keyword) ||
        normalizeText(schedule.session_name).includes(keyword) ||
        normalizeText(schedule.day_name).includes(keyword);

      const matchClass =
        classFilter === "Semua Kelas" ||
        formatClass(schedule.student_level, schedule.student_grade) ===
          classFilter;

      const matchDay =
        dayFilter === "Semua Hari" || schedule.day_name === dayFilter;

      const matchSubject =
        subjectFilter === "Semua Mapel" ||
        schedule.subject_name === subjectFilter;

      return matchSearch && matchClass && matchDay && matchSubject;
    });
  }, [schedules, search, classFilter, dayFilter, subjectFilter]);

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

  function openMaterialModal(schedule: EnrichedSchedule) {
    setEditingSchedule(schedule);
    setMaterialInput(schedule.material_topic || "");
    setErrorMessage("");
    setSuccessMessage("");
  }

  function closeMaterialModal() {
    if (savingMaterial) return;

    setEditingSchedule(null);
    setMaterialInput("");
  }

  async function handleSaveMaterial() {
    if (!teacher?.id) {
      setErrorMessage("Data guru aktif tidak ditemukan.");
      return;
    }

    if (!editingSchedule?.id) {
      setErrorMessage("Data jadwal tidak ditemukan.");
      return;
    }

    if (editingSchedule.teacher_id !== teacher.id) {
      setErrorMessage("Jadwal ini bukan milik guru aktif.");
      return;
    }

    if (!materialInput.trim()) {
      setErrorMessage("Materi pembelajaran wajib diisi.");
      return;
    }

    setSavingMaterial(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } = await supabase
        .from("schedules")
        .update({
          material_topic: materialInput.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingSchedule.id)
        .eq("teacher_id", teacher.id);

      if (error) throw new Error(error.message);

      setSuccessMessage("Materi pembelajaran berhasil disimpan.");
      setEditingSchedule(null);
      setMaterialInput("");
      await fetchPageData();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal menyimpan materi pembelajaran.");
      }
    } finally {
      setSavingMaterial(false);
    }
  }

  return (
    <TeacherLayout
      activeMenu="Jadwal Mengajar"
      teacherName={teacher?.full_name || "Guru"}
      teacherSubject={formatTeacherSubject(teacher?.subjects)}
      searchPlaceholder="Cari jadwal mengajar..."
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
              Jadwal pembelajaran untuk{" "}
              <span className="font-bold text-[#2B1B18]">
                {teacher?.full_name || "guru aktif"}
              </span>
              . Materi pembelajaran diisi oleh guru pada jadwal masing-masing.
            </p>

            <p className="mt-1 text-xs font-semibold text-[#8A5A48]">
              Academic Year {ACADEMIC_YEAR}
            </p>
          </div>
        </div>

        {errorMessage ? (
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
            Loading jadwal mengajar...
          </div>
        ) : null}

        {!loading && schedules.length === 0 ? (
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
        ) : null}

        {!loading ? (
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
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_220px_200px_220px]">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari siswa, NIPD, NISN, kelas, mapel, materi, keterangan..."
                  className="w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                />

                <div>
                  <input
                    list="teacher-jadwal-class-options"
                    value={classFilter}
                    onChange={(event) => setClassFilter(event.target.value)}
                    placeholder="Ketik atau pilih kelas"
                    className="w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none placeholder:text-[#9A7B6C] focus:border-[#7A1F2B]"
                  />
                  <datalist id="teacher-jadwal-class-options">
                    <option value="Semua Kelas" />
                    {classOptions.map((className) => (
                      <option key={className} value={className} />
                    ))}
                  </datalist>
                </div>

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

            {classFilter !== "Semua Kelas" ? (
              <div className="mt-5 rounded-2xl border border-[#E8D6C1] bg-[#FFF8EF] px-5 py-4">
                <p className="text-sm font-bold text-[#2B1B18]">
                  Siswa {classFilter}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#6B4A3A]">
                  {studentsInSelectedClass.length > 0
                    ? studentsInSelectedClass.join(", ")
                    : "Tidak ada siswa pada kelas ini di jadwal guru."}
                </p>
              </div>
            ) : null}

            <div className="mt-7 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
              <div className="overflow-hidden rounded-2xl border border-[#E8D6C1] bg-white shadow-sm">
                <div className="border-b border-[#E8D6C1] px-6 py-5">
                  <h2 className="text-lg font-bold">Daftar Jadwal</h2>
                  <p className="mt-1 text-sm text-[#6B4A3A]">
                    Admin mengatur jadwal dasar. Guru mengisi atau memperbarui
                    materi pembelajaran pada jadwal masing-masing.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1580px] text-left">
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
                      {sortedSchedules.length === 0 ? (
                        <tr>
                          <td
                            colSpan={17}
                            className="px-4 py-10 text-center text-sm text-[#6B4A3A]"
                          >
                            Belum ada jadwal mengajar untuk guru ini pada
                            Academic Year {ACADEMIC_YEAR}.
                          </td>
                        </tr>
                      ) : null}

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
                              schedule.student_level,
                              schedule.student_grade
                            )}
                          </td>

                          <td className="px-4 py-4">
                            {schedule.subject_name || "-"}
                          </td>

                          <td className="max-w-[260px] px-4 py-4">
                            {schedule.material_topic ? (
                              <p className="line-clamp-2 font-semibold text-[#2B1B18]">
                                {schedule.material_topic}
                              </p>
                            ) : (
                              <span className="inline-flex whitespace-nowrap rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                                Belum diisi
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-4 font-semibold">
                            {schedule.student_name || "-"}
                          </td>

                          <td className="px-4 py-4">
                            {schedule.student_nipd || "-"}
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
                              onClick={() => openMaterialModal(schedule)}
                              className="inline-flex whitespace-nowrap rounded-xl bg-[#7A1F2B] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#54131D]"
                            >
                              {schedule.material_topic
                                ? "Edit Materi"
                                : "Isi Materi"}
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
                        {Array.isArray(teacher?.subjects)
                          ? teacher?.subjects.join(", ")
                          : teacher?.subjects || "-"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold">Jadwal Hari Ini</h2>

                  <div className="mt-5 space-y-3">
                    {todaySchedules.length === 0 ? (
                      <div className="rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] p-4 text-sm text-[#6B4A3A]">
                        Tidak ada jadwal hari ini.
                      </div>
                    ) : null}

                    {todaySchedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        className="rounded-xl border border-[#E8D6C1] p-4"
                      >
                        <p className="font-bold">{schedule.student_name || "-"}</p>

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
                          {schedule.subject_name || "-"} •{" "}
                          {schedule.material_topic || "Materi belum diisi"}
                        </p>

                        <button
                          type="button"
                          onClick={() => openMaterialModal(schedule)}
                          className="mt-3 w-full rounded-xl bg-[#7A1F2B] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#54131D]"
                        >
                          {schedule.material_topic ? "Edit Materi" : "Isi Materi"}
                        </button>

                        {schedule.notes ? (
                          <p className="mt-2 rounded-xl bg-[#FFF8EF] px-3 py-2 text-xs text-[#6B4A3A]">
                            {schedule.notes}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold">Catatan</h2>
                  <p className="mt-3 text-sm leading-6 text-[#6B4A3A]">
                    Jadwal dasar dibuat oleh Kepala Sekolah/Admin. Guru tidak
                    dapat mengubah tanggal, jam, siswa, atau mapel, tetapi guru
                    dapat mengisi dan memperbarui materi pembelajaran pada jadwal
                    miliknya sendiri. Jadwal ini tidak terhubung langsung dengan
                    Program Semester, Bab/Sub Bab, Absensi, atau Laporan KBM.
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {editingSchedule ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
          <div className="w-full max-w-[520px] overflow-hidden rounded-2xl bg-[#FAF3EA] shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#E8D6C1] px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-[#2B1B18]">
                  {editingSchedule.material_topic
                    ? "Edit Materi Pembelajaran"
                    : "Isi Materi Pembelajaran"}
                </h2>
                <p className="mt-1 text-sm text-[#6B4A3A]">
                  {editingSchedule.subject_name} •{" "}
                  {formatDate(editingSchedule.schedule_date)}
                </p>
              </div>

              <button
                type="button"
                onClick={closeMaterialModal}
                disabled={savingMaterial}
                className="text-2xl leading-none text-[#6B4A3A] transition hover:text-[#7A1F2B] disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="grid gap-3 rounded-2xl border border-[#E8D6C1] bg-white p-4 text-sm md:grid-cols-2">
                <div>
                  <p className="text-xs font-bold text-[#6B4A3A]">Siswa</p>
                  <p className="mt-1 font-bold text-[#2B1B18]">
                    {editingSchedule.student_name}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold text-[#6B4A3A]">Kelas</p>
                  <p className="mt-1 font-bold text-[#2B1B18]">
                    {formatClass(
                      editingSchedule.student_level,
                      editingSchedule.student_grade
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold text-[#6B4A3A]">Jam</p>
                  <p className="mt-1 font-bold text-[#2B1B18]">
                    {formatTime(editingSchedule.start_time)} -{" "}
                    {formatTime(editingSchedule.end_time)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold text-[#6B4A3A]">Mapel</p>
                  <p className="mt-1 font-bold text-[#2B1B18]">
                    {editingSchedule.subject_name}
                  </p>
                </div>
              </div>

              {errorMessage ? (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              <label className="block">
                <span className="text-sm font-bold text-[#2B1B18]">
                  Materi Pembelajaran
                </span>
                <textarea
                  value={materialInput}
                  onChange={(event) => setMaterialInput(event.target.value)}
                  rows={5}
                  autoFocus
                  placeholder="Contoh: Bab II - Wujud Zat dan Perubahannya"
                  className="mt-2 w-full resize-none rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-[#7A1F2B]"
                />
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={closeMaterialModal}
                  disabled={savingMaterial}
                  className="h-11 rounded-xl border border-[#E8D6C1] bg-white text-sm font-bold text-[#7A1F2B] transition hover:bg-[#FFF8EF] disabled:opacity-60"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={handleSaveMaterial}
                  disabled={savingMaterial}
                  className="h-11 rounded-xl bg-[#7A1F2B] text-sm font-bold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingMaterial ? "Menyimpan..." : "Simpan Materi"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </TeacherLayout>
  );
}