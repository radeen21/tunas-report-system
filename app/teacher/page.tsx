"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Layers3,
  NotebookText,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import TeacherLayout from "./components/TeacherLayout";

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
};

type SubjectRow = {
  id: string;
  name: string | null;
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
};

type RppRow = {
  id: string;
  title?: string | null;
  rpp_title?: string | null;
  subject_name?: string | null;
  level?: string | null;
  grade?: string | null;
  status?: string | null;
  updated_at?: string | null;
};

type MaterialFrameworkRow = {
  id: string;
  teacher_id: string | null;
  subject_id: string | null;
  level: string | null;
  grade: string | null;
  semester: string | null;
  academic_year: string | null;
  framework_title: string | null;
  status: string | null;
  updated_at?: string | null;
};

type TimeAllocationRow = {
  id: string;
  material_framework_id: string | null;
  total_meetings: number | null;
  total_minutes: number | null;
};

type CurriculumProgram = {
  id: string;
  teacher_id: string | null;
  subject_name: string | null;
  level: string | null;
  grade: string | null;
  semester: string | null;
  academic_year: string | null;
  status: string | null;
};

type CurriculumChapter = {
  id: string;
  curriculum_program_id: string | null;
};

type CurriculumSubChapter = {
  id: string;
  curriculum_chapter_id: string | null;
};

type CurriculumProgress = {
  id: string;
  curriculum_program_id: string | null;
  curriculum_sub_chapter_id: string | null;
  teacher_id: string | null;
  teaching_date: string | null;
};

type RombelToday = {
  key: string;
  subject_name: string;
  schedule_date: string;
  start_time: string;
  end_time: string;
  session_name: string;
  material_topic: string;
  students: StudentRow[];
  alreadyAttendance: boolean;
};

type ProgramProgress = CurriculumProgram & {
  total_sub_chapters: number;
  completed_sub_chapters: number;
  progress_percent: number;
};

type FrameworkSummary = MaterialFrameworkRow & {
  subject_name: string;
  allocation: TimeAllocationRow | null;
};

function todayYMD() {
  const date = new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatTime(value?: string | null) {
  if (!value) return "-";
  return value.slice(0, 5);
}

function formatTeacherSubject(subjects: TeacherRow["subjects"]) {
  if (!subjects) return "Guru";
  if (Array.isArray(subjects)) return `Guru — ${subjects.slice(0, 4).join(", ")}`;
  return `Guru — ${subjects}`;
}

function getRppTitle(rpp: RppRow) {
  return rpp.rpp_title || rpp.title || "-";
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
  ].join("|");
}

function getStatusClass(status?: string | null) {
  if (status === "approved" || status === "published") {
    return "bg-[#C7F0DA] text-[#158A58]";
  }

  if (status === "submitted" || status === "pending") {
    return "bg-[#FFF2B8] text-[#B26A00]";
  }

  if (status === "rejected") {
    return "bg-[#FFE4E6] text-[#BE123C]";
  }

  return "bg-[#F1F5F9] text-[#64748B]";
}

function getStatusLabel(status?: string | null) {
  if (status === "submitted") return "Submitted";
  if (status === "approved") return "Approved";
  if (status === "published") return "Published";
  if (status === "pending") return "Pending";
  if (status === "rejected") return "Rejected";
  return "Draft";
}

export default function TeacherDashboardPage() {
  const [teacher, setTeacher] = useState<TeacherRow | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [rpps, setRpps] = useState<RppRow[]>([]);
  const [frameworks, setFrameworks] = useState<FrameworkSummary[]>([]);
  const [programProgress, setProgramProgress] = useState<ProgramProgress[]>([]);

  const [loading, setLoading] = useState(true);

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
      setRpps([]);
      setFrameworks([]);
      setProgramProgress([]);
      setLoading(false);
      return;
    }

    const [
      studentsRes,
      subjectsRes,
      schedulesRes,
      attendanceRes,
      rppRes,
      frameworksRes,
      allocationsRes,
      programsRes,
      chaptersRes,
      subChaptersRes,
      progressRes,
    ] = await Promise.all([
      supabase.from("students").select("*").order("full_name"),
      supabase.from("subjects").select("*").order("name"),
      supabase
        .from("schedules")
        .select("*")
        .eq("teacher_id", currentTeacher.id),
      supabase
        .from("attendance")
        .select("*")
        .eq("teacher_id", currentTeacher.id),
      supabase
        .from("rpp")
        .select("*")
        .eq("teacher_id", currentTeacher.id)
        .order("updated_at", { ascending: false }),
      supabase
        .from("material_frameworks")
        .select("*")
        .eq("teacher_id", currentTeacher.id)
        .order("updated_at", { ascending: false }),
      supabase
        .from("time_allocations")
        .select("*")
        .eq("teacher_id", currentTeacher.id),
      supabase
        .from("curriculum_programs")
        .select("*")
        .eq("teacher_id", currentTeacher.id),
      supabase.from("curriculum_chapters").select("*"),
      supabase.from("curriculum_sub_chapters").select("*"),
      supabase
        .from("curriculum_progress")
        .select("*")
        .eq("teacher_id", currentTeacher.id),
    ]);

    const studentsData = (studentsRes.data || []) as StudentRow[];
    const subjectsData = (subjectsRes.data || []) as SubjectRow[];
    const schedulesData = (schedulesRes.data || []) as ScheduleRow[];
    const attendanceData = (attendanceRes.data || []) as AttendanceRow[];
    const rppData = (rppRes.data || []) as RppRow[];
    const frameworksData = (frameworksRes.data || []) as MaterialFrameworkRow[];
    const allocationsData = (allocationsRes.data || []) as TimeAllocationRow[];
    const programsData = (programsRes.data || []) as CurriculumProgram[];
    const chaptersData = (chaptersRes.data || []) as CurriculumChapter[];
    const subChaptersData = (subChaptersRes.data || []) as CurriculumSubChapter[];
    const progressData = (progressRes.data || []) as CurriculumProgress[];

    const subjectMap = new Map(subjectsData.map((subject) => [subject.id, subject]));
    const allocationMap = new Map(
      allocationsData
        .filter((allocation) => allocation.material_framework_id)
        .map((allocation) => [allocation.material_framework_id as string, allocation])
    );

    const enrichedFrameworks = frameworksData.map((framework) => {
      const subject = framework.subject_id
        ? subjectMap.get(framework.subject_id)
        : null;

      return {
        ...framework,
        subject_name: subject?.name || "-",
        allocation: allocationMap.get(framework.id) || null,
      };
    });

    const chaptersByProgram = new Map<string, CurriculumChapter[]>();
    chaptersData.forEach((chapter) => {
      if (!chapter.curriculum_program_id) return;

      const current = chaptersByProgram.get(chapter.curriculum_program_id) || [];
      current.push(chapter);
      chaptersByProgram.set(chapter.curriculum_program_id, current);
    });

    const subChaptersByChapter = new Map<string, CurriculumSubChapter[]>();
    subChaptersData.forEach((subChapter) => {
      if (!subChapter.curriculum_chapter_id) return;

      const current = subChaptersByChapter.get(subChapter.curriculum_chapter_id) || [];
      current.push(subChapter);
      subChaptersByChapter.set(subChapter.curriculum_chapter_id, current);
    });

    const progressByProgram = new Map<string, Set<string>>();
    progressData.forEach((progress) => {
      if (!progress.curriculum_program_id || !progress.curriculum_sub_chapter_id) {
        return;
      }

      const current =
        progressByProgram.get(progress.curriculum_program_id) || new Set<string>();

      current.add(progress.curriculum_sub_chapter_id);
      progressByProgram.set(progress.curriculum_program_id, current);
    });

    const progressPrograms = programsData.map((program) => {
      const chapters = chaptersByProgram.get(program.id) || [];
      const totalSubChapters = chapters.reduce((sum, chapter) => {
        return sum + (subChaptersByChapter.get(chapter.id) || []).length;
      }, 0);

      const completed = progressByProgram.get(program.id)?.size || 0;

      return {
        ...program,
        total_sub_chapters: totalSubChapters,
        completed_sub_chapters: completed,
        progress_percent:
          totalSubChapters > 0 ? Math.round((completed / totalSubChapters) * 100) : 0,
      };
    });

    setStudents(studentsData);
    setSubjects(subjectsData);
    setSchedules(schedulesData);
    setAttendance(attendanceData);
    setRpps(rppData);
    setFrameworks(enrichedFrameworks);
    setProgramProgress(progressPrograms);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("teacher-dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "schedules" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "rpp" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "material_frameworks" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "time_allocations" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "curriculum_programs" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "curriculum_chapters" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "curriculum_sub_chapters" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "curriculum_progress" }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const studentMap = useMemo(() => {
    return new Map(students.map((student) => [student.id, student]));
  }, [students]);

  const subjectMap = useMemo(() => {
    return new Map(subjects.map((subject) => [subject.id, subject]));
  }, [subjects]);

  const todayRombels = useMemo(() => {
    const today = todayYMD();
    const grouped = new Map<string, RombelToday>();

    schedules
      .filter((schedule) => schedule.schedule_date === today)
      .forEach((schedule) => {
        const key = createRombelKey(schedule);
        const subject = schedule.subject_id
          ? subjectMap.get(schedule.subject_id)
          : null;
        const student = schedule.student_id
          ? studentMap.get(schedule.student_id)
          : null;

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

        const current = grouped.get(key);

        if (!current) {
          grouped.set(key, {
            key,
            subject_name: subject?.name || "-",
            schedule_date: schedule.schedule_date || today,
            start_time: schedule.start_time || "",
            end_time: schedule.end_time || "",
            session_name: schedule.session_name || "-",
            material_topic: schedule.material_topic || "-",
            students: student ? [student] : [],
            alreadyAttendance: hasAttendance,
          });

          return;
        }

        if (student && !current.students.some((item) => item.id === student.id)) {
          current.students.push(student);
        }

        current.alreadyAttendance = current.alreadyAttendance || hasAttendance;
      });

    return Array.from(grouped.values()).sort((a, b) =>
      `${a.schedule_date} ${a.start_time}`.localeCompare(
        `${b.schedule_date} ${b.start_time}`
      )
    );
  }, [schedules, attendance, subjectMap, studentMap]);

  const summary = useMemo(() => {
    const totalFrameworkMeetings = frameworks.reduce((sum, item) => {
      return sum + Number(item.allocation?.total_meetings || 0);
    }, 0);

    const totalFrameworkMinutes = frameworks.reduce((sum, item) => {
      return sum + Number(item.allocation?.total_minutes || 0);
    }, 0);

    return {
      todayRombel: todayRombels.length,
      todayDone: todayRombels.filter((item) => item.alreadyAttendance).length,
      todayPending: todayRombels.filter((item) => !item.alreadyAttendance).length,
      totalRpp: rpps.length,
      rppDraft: rpps.filter((item) => item.status === "draft").length,
      rppSubmitted: rpps.filter((item) => item.status === "submitted").length,
      rppApproved: rpps.filter((item) => item.status === "approved").length,
      totalFramework: frameworks.length,
      totalFrameworkMeetings,
      totalFrameworkMinutes,
      totalProgram: programProgress.length,
    };
  }, [todayRombels, rpps, frameworks, programProgress]);

  const latestRpps = rpps.slice(0, 4);
  const latestFrameworks = frameworks.slice(0, 3);
  const latestPrograms = programProgress.slice(0, 4);

  return (
    <TeacherLayout
      activeMenu="Dashboard"
      teacherName={teacher?.full_name || "Guru"}
      teacherSubject={formatTeacherSubject(teacher?.subjects)}
      searchPlaceholder="Cari data dashboard..."
    >
      <section className="space-y-7">
        <div>
          <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#8A5A48]">
            Teacher Dashboard
          </p>

          <h1 className="mt-2 text-[30px] font-extrabold tracking-[-0.02em] text-[#2B1B18]">
            Selamat Datang, {teacher?.full_name || "Guru"}
          </h1>

          <p className="mt-2 max-w-[850px] text-[15px] leading-6 text-[#6F5549]">
            Pantau jadwal hari ini, absensi KBM, RPP, kerangka materi, dan
            progress Program Semester dalam satu dashboard.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={<CalendarDays className="h-5 w-5" />}
            label="Rombel Hari Ini"
            value={summary.todayRombel}
            info={formatDate(todayYMD())}
            tone="pink"
          />

          <SummaryCard
            icon={<ClipboardCheck className="h-5 w-5" />}
            label="Belum Diabsen"
            value={summary.todayPending}
            info={`${summary.todayDone} selesai`}
            tone="orange"
          />

          <SummaryCard
            icon={<FileText className="h-5 w-5" />}
            label="Total RPP"
            value={summary.totalRpp}
            info={`${summary.rppSubmitted} review`}
            tone="blue"
          />

          <SummaryCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="RPP Approved"
            value={summary.rppApproved}
            info={`${summary.rppDraft} draft`}
            tone="green"
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <DashboardPanel
            title="Jadwal / Rombel Hari Ini"
            subtitle="Jadwal yang perlu diabsen hari ini."
          >
            {loading ? (
              <EmptyText text="Memuat jadwal..." />
            ) : todayRombels.length === 0 ? (
              <EmptyText text="Tidak ada jadwal hari ini." />
            ) : (
              <div className="space-y-3">
                {todayRombels.map((rombel) => (
                  <div
                    key={rombel.key}
                    className="rounded-2xl border border-[#EADACA] bg-[#FFFCF8] px-4 py-4"
                  >
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div>
                        <p className="font-extrabold text-[#2B1B18]">
                          {rombel.subject_name}
                        </p>
                        <p className="mt-1 text-[13px] text-[#6F5549]">
                          {formatTime(rombel.start_time)} -{" "}
                          {formatTime(rombel.end_time)} • {rombel.session_name}
                        </p>
                        <p className="mt-1 text-[13px] text-[#6F5549]">
                          Materi: {rombel.material_topic}
                        </p>
                        <p className="mt-2 text-[12px] font-bold text-[#8A5A48]">
                          {rombel.students.length} murid
                        </p>
                      </div>

                      <StatusBadge
                        status={rombel.alreadyAttendance ? "approved" : "pending"}
                        label={rombel.alreadyAttendance ? "Sudah Absen" : "Belum Absen"}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DashboardPanel>

          <DashboardPanel
            title="Ringkasan Kerangka Materi"
            subtitle="Alokasi waktu dari kerangka materi guru."
          >
            <div className="grid gap-3">
              <SmallMetric
                label="Total Kerangka"
                value={summary.totalFramework}
                icon={<Layers3 className="h-4 w-4" />}
              />
              <SmallMetric
                label="Total Pertemuan"
                value={summary.totalFrameworkMeetings}
                icon={<BookOpen className="h-4 w-4" />}
              />
              <SmallMetric
                label="Total Menit"
                value={summary.totalFrameworkMinutes}
                icon={<CalendarDays className="h-4 w-4" />}
              />
            </div>
          </DashboardPanel>
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          <DashboardPanel title="RPP Terbaru" subtitle="RPP terakhir dibuat atau diperbarui.">
            {latestRpps.length === 0 ? (
              <EmptyText text="Belum ada RPP." />
            ) : (
              <div className="space-y-3">
                {latestRpps.map((rpp) => (
                  <MiniCard
                    key={rpp.id}
                    title={getRppTitle(rpp)}
                    subtitle={`${rpp.subject_name || "-"} • ${rpp.level || "-"} ${rpp.grade || ""}`}
                    status={rpp.status || "draft"}
                  />
                ))}
              </div>
            )}
          </DashboardPanel>

          <DashboardPanel title="Kerangka Materi" subtitle="Kerangka materi terbaru.">
            {latestFrameworks.length === 0 ? (
              <EmptyText text="Belum ada kerangka materi." />
            ) : (
              <div className="space-y-3">
                {latestFrameworks.map((framework) => (
                  <MiniCard
                    key={framework.id}
                    title={framework.framework_title || "-"}
                    subtitle={`${framework.subject_name} • ${framework.level} ${framework.grade}`}
                    status={framework.status || "draft"}
                  />
                ))}
              </div>
            )}
          </DashboardPanel>

          <DashboardPanel title="Progress Program Semester" subtitle="Realisasi sub bab dari absensi.">
            {latestPrograms.length === 0 ? (
              <EmptyText text="Belum ada Program Semester." />
            ) : (
              <div className="space-y-4">
                {latestPrograms.map((program) => (
                  <div key={program.id}>
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[14px] font-extrabold text-[#2B1B18]">
                          {program.subject_name}
                        </p>
                        <p className="text-[12px] text-[#6F5549]">
                          {program.level} {program.grade} • Semester{" "}
                          {program.semester}
                        </p>
                      </div>

                      <p className="text-[13px] font-extrabold text-[#158A58]">
                        {program.progress_percent}%
                      </p>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-[#EADACA]">
                      <div
                        className="h-full rounded-full bg-[#158A58]"
                        style={{ width: `${program.progress_percent}%` }}
                      />
                    </div>

                    <p className="mt-1 text-[11px] text-[#6F5549]">
                      {program.completed_sub_chapters}/{program.total_sub_chapters}{" "}
                      sub bab selesai
                    </p>
                  </div>
                ))}
              </div>
            )}
          </DashboardPanel>
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

function DashboardPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[22px] border border-[#E1CFBE] bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-[18px] font-extrabold text-[#2B1B18]">{title}</h2>
        <p className="mt-1 text-[13px] text-[#6F5549]">{subtitle}</p>
      </div>

      {children}
    </div>
  );
}

function StatusBadge({
  status,
  label,
}: {
  status?: string | null;
  label?: string;
}) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-[12px] font-extrabold ${getStatusClass(
        status
      )}`}
    >
      {label || getStatusLabel(status)}
    </span>
  );
}

function EmptyText({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-[#EADACA] bg-[#FFFCF8] px-4 py-8 text-center text-[14px] text-[#6F5549]">
      {text}
    </div>
  );
}

function SmallMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-[#EADACA] bg-[#FFFCF8] px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F8DFD0] text-[#8C0F2D]">
          {icon}
        </div>

        <p className="text-[13px] font-bold text-[#6F5549]">{label}</p>
      </div>

      <p className="text-[20px] font-extrabold text-[#2B1B18]">{value}</p>
    </div>
  );
}

function MiniCard({
  title,
  subtitle,
  status,
}: {
  title: string;
  subtitle: string;
  status?: string | null;
}) {
  return (
    <div className="rounded-2xl border border-[#EADACA] bg-[#FFFCF8] px-4 py-3">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-[14px] font-extrabold text-[#2B1B18]">{title}</p>
          <p className="mt-1 text-[12px] text-[#6F5549]">{subtitle}</p>
        </div>

        <StatusBadge status={status} />
      </div>
    </div>
  );
}