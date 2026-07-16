"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Layers3,
  NotebookText,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import KepalaSekolahLayout from "./components/KepalaSekolahLayout";

type TeacherRow = {
  id: string;
  full_name: string | null;
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
};

type RppRow = {
  id: string;
  title?: string | null;
  rpp_title?: string | null;
  teacher_id: string | null;
  subject_name?: string | null;
  level?: string | null;
  grade?: string | null;
  status?: string | null;
  updated_at?: string | null;
};

type AcademicReportRow = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  report_period: string | null;
  status?: string | null;
  approval_status?: string | null;
  final_grade?: number | null;
  final_score?: number | null;
  updated_at?: string | null;
};

type MaterialFrameworkRow = {
  id: string;
  teacher_id: string | null;
  subject_id: string | null;
  framework_title: string | null;
  level: string | null;
  grade: string | null;
  status: string | null;
  updated_at?: string | null;
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
};

type RombelToday = {
  key: string;
  teacher_name: string;
  subject_name: string;
  schedule_date: string;
  start_time: string;
  end_time: string;
  students_count: number;
  alreadyAttendance: boolean;
};

type ProgramProgress = CurriculumProgram & {
  teacher_name: string;
  total_sub_chapters: number;
  completed_sub_chapters: number;
  progress_percent: number;
};

type EnrichedRpp = RppRow & {
  teacher_name: string;
};

type EnrichedAcademicReport = AcademicReportRow & {
  teacher_name: string;
  student_name: string;
  subject_name: string;
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

export default function KepalaSekolahDashboardPage() {
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [rpps, setRpps] = useState<EnrichedRpp[]>([]);
  const [academicReports, setAcademicReports] = useState<EnrichedAcademicReport[]>([]);
  const [frameworks, setFrameworks] = useState<MaterialFrameworkRow[]>([]);
  const [programProgress, setProgramProgress] = useState<ProgramProgress[]>([]);

  const [loading, setLoading] = useState(true);

  async function fetchData() {
    setLoading(true);

    const [
      teachersRes,
      studentsRes,
      subjectsRes,
      schedulesRes,
      attendanceRes,
      rppRes,
      academicReportsRes,
      frameworksRes,
      programsRes,
      chaptersRes,
      subChaptersRes,
      progressRes,
    ] = await Promise.all([
      supabase.from("teachers").select("*").order("full_name"),
      supabase.from("students").select("*").order("full_name"),
      supabase.from("subjects").select("*").order("name"),
      supabase.from("schedules").select("*"),
      supabase.from("attendance").select("*"),
      supabase.from("rpp").select("*").order("updated_at", { ascending: false }),
      supabase
        .from("academic_reports")
        .select("*")
        .order("updated_at", { ascending: false }),
      supabase
        .from("material_frameworks")
        .select("*")
        .order("updated_at", { ascending: false }),
      supabase.from("curriculum_programs").select("*"),
      supabase.from("curriculum_chapters").select("*"),
      supabase.from("curriculum_sub_chapters").select("*"),
      supabase.from("curriculum_progress").select("*"),
    ]);

    const teachersData = (teachersRes.data || []) as TeacherRow[];
    const studentsData = (studentsRes.data || []) as StudentRow[];
    const subjectsData = (subjectsRes.data || []) as SubjectRow[];
    const schedulesData = (schedulesRes.data || []) as ScheduleRow[];
    const attendanceData = (attendanceRes.data || []) as AttendanceRow[];
    const rppData = (rppRes.data || []) as RppRow[];
    const academicData = (academicReportsRes.data || []) as AcademicReportRow[];
    const frameworksData = (frameworksRes.data || []) as MaterialFrameworkRow[];
    const programsData = (programsRes.data || []) as CurriculumProgram[];
    const chaptersData = (chaptersRes.data || []) as CurriculumChapter[];
    const subChaptersData = (subChaptersRes.data || []) as CurriculumSubChapter[];
    const progressData = (progressRes.data || []) as CurriculumProgress[];

    const teacherMap = new Map(teachersData.map((teacher) => [teacher.id, teacher]));
    const studentMap = new Map(studentsData.map((student) => [student.id, student]));
    const subjectMap = new Map(subjectsData.map((subject) => [subject.id, subject]));

    const enrichedRpps = rppData.map((rpp) => {
      const teacher = rpp.teacher_id ? teacherMap.get(rpp.teacher_id) : null;

      return {
        ...rpp,
        teacher_name: teacher?.full_name || "-",
      };
    });

    const enrichedAcademic = academicData.map((report) => {
      const teacher = report.teacher_id ? teacherMap.get(report.teacher_id) : null;
      const student = report.student_id ? studentMap.get(report.student_id) : null;
      const subject = report.subject_id ? subjectMap.get(report.subject_id) : null;

      return {
        ...report,
        teacher_name: teacher?.full_name || "-",
        student_name: student?.full_name || "-",
        subject_name: subject?.name || "-",
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
      const teacher = program.teacher_id ? teacherMap.get(program.teacher_id) : null;
      const chapters = chaptersByProgram.get(program.id) || [];

      const totalSubChapters = chapters.reduce((sum, chapter) => {
        return sum + (subChaptersByChapter.get(chapter.id) || []).length;
      }, 0);

      const completed = progressByProgram.get(program.id)?.size || 0;

      return {
        ...program,
        teacher_name: teacher?.full_name || "-",
        total_sub_chapters: totalSubChapters,
        completed_sub_chapters: completed,
        progress_percent:
          totalSubChapters > 0 ? Math.round((completed / totalSubChapters) * 100) : 0,
      };
    });

    setTeachers(teachersData);
    setStudents(studentsData);
    setSubjects(subjectsData);
    setSchedules(schedulesData);
    setAttendance(attendanceData);
    setRpps(enrichedRpps);
    setAcademicReports(enrichedAcademic);
    setFrameworks(frameworksData);
    setProgramProgress(progressPrograms);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("kepala-dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "students" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "teachers" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "schedules" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "rpp" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "academic_reports" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "material_frameworks" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "curriculum_programs" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "curriculum_chapters" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "curriculum_sub_chapters" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "curriculum_progress" }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const todayRombels = useMemo(() => {
    const today = todayYMD();
    const grouped = new Map<string, RombelToday>();

    const teacherMap = new Map(teachers.map((teacher) => [teacher.id, teacher]));
    const subjectMap = new Map(subjects.map((subject) => [subject.id, subject]));

    schedules
      .filter((schedule) => schedule.schedule_date === today)
      .forEach((schedule) => {
        const key = createRombelKey(schedule);
        const teacher = schedule.teacher_id
          ? teacherMap.get(schedule.teacher_id)
          : null;
        const subject = schedule.subject_id
          ? subjectMap.get(schedule.subject_id)
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
            teacher_name: teacher?.full_name || "-",
            subject_name: subject?.name || "-",
            schedule_date: schedule.schedule_date || today,
            start_time: schedule.start_time || "",
            end_time: schedule.end_time || "",
            students_count: 1,
            alreadyAttendance: hasAttendance,
          });

          return;
        }

        current.students_count += 1;
        current.alreadyAttendance = current.alreadyAttendance || hasAttendance;
      });

    return Array.from(grouped.values()).sort((a, b) =>
      `${a.schedule_date} ${a.start_time}`.localeCompare(
        `${b.schedule_date} ${b.start_time}`
      )
    );
  }, [schedules, attendance, teachers, subjects]);

  const summary = useMemo(() => {
    const rppSubmitted = rpps.filter((rpp) => rpp.status === "submitted").length;
    const academicPending = academicReports.filter((report) => {
      return report.approval_status === "pending" || report.status === "pending";
    }).length;

    const todayDone = todayRombels.filter((item) => item.alreadyAttendance).length;
    const todayPending = todayRombels.length - todayDone;

    const totalSubChapters = programProgress.reduce((sum, program) => {
      return sum + program.total_sub_chapters;
    }, 0);

    const completedSubChapters = programProgress.reduce((sum, program) => {
      return sum + program.completed_sub_chapters;
    }, 0);

    const curriculumPercent =
      totalSubChapters > 0
        ? Math.round((completedSubChapters / totalSubChapters) * 100)
        : 0;

    return {
      totalStudents: students.length,
      totalTeachers: teachers.length,
      todayRombel: todayRombels.length,
      todayDone,
      todayPending,
      rppSubmitted,
      rppApproved: rpps.filter((rpp) => rpp.status === "approved").length,
      academicPending,
      academicApproved: academicReports.filter((report) => {
        return report.approval_status === "approved" || report.status === "published";
      }).length,
      totalFrameworks: frameworks.length,
      totalPrograms: programProgress.length,
      curriculumPercent,
    };
  }, [students, teachers, todayRombels, rpps, academicReports, frameworks, programProgress]);

  const latestRppSubmitted = rpps.filter((rpp) => rpp.status === "submitted").slice(0, 4);
  const latestAcademicPending = academicReports
    .filter((report) => report.approval_status === "pending" || report.status === "pending")
    .slice(0, 4);
  const latestPrograms = [...programProgress]
    .sort((a, b) => b.progress_percent - a.progress_percent)
    .slice(0, 5);

  return (
    <KepalaSekolahLayout
      activeMenu="Dashboard"
      searchPlaceholder="Cari data dashboard..."
    >
      <section className="space-y-7">
        <div>
          <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#8A5A48]">
            Kepala Sekolah Dashboard
          </p>

          <h1 className="mt-2 text-[30px] font-extrabold tracking-[-0.02em] text-[#2B1B18]">
            Monitoring Sekolah
          </h1>

          <p className="mt-2 max-w-[900px] text-[15px] leading-6 text-[#6F5549]">
            Pantau RPP, laporan akademik, absensi harian, kerangka materi, dan
            progress kurikulum dari satu dashboard.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={<Users className="h-5 w-5" />}
            label="Total Siswa"
            value={summary.totalStudents}
            info={`${summary.totalTeachers} guru`}
            tone="pink"
          />

          <SummaryCard
            icon={<FileText className="h-5 w-5" />}
            label="RPP Menunggu Review"
            value={summary.rppSubmitted}
            info={`${summary.rppApproved} approved`}
            tone="orange"
          />

          <SummaryCard
            icon={<GraduationCap className="h-5 w-5" />}
            label="Laporan Akademik Pending"
            value={summary.academicPending}
            info={`${summary.academicApproved} approved`}
            tone="blue"
          />

          <SummaryCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Progress Kurikulum"
            value={`${summary.curriculumPercent}%`}
            info={`${summary.totalPrograms} program`}
            tone="green"
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <DashboardPanel
            title="Absensi KBM Hari Ini"
            subtitle={`Rombel tanggal ${formatDate(todayYMD())}`}
          >
            {loading ? (
              <EmptyText text="Memuat absensi..." />
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
                          {rombel.teacher_name} • {formatTime(rombel.start_time)} -{" "}
                          {formatTime(rombel.end_time)}
                        </p>
                        <p className="mt-2 text-[12px] font-bold text-[#8A5A48]">
                          {rombel.students_count} murid
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

          <DashboardPanel title="Ringkasan Akademik" subtitle="Data approval dan kurikulum.">
            <div className="grid gap-3">
              <SmallMetric
                label="RPP Submitted"
                value={summary.rppSubmitted}
                icon={<NotebookText className="h-4 w-4" />}
              />
              <SmallMetric
                label="Laporan Akademik Pending"
                value={summary.academicPending}
                icon={<GraduationCap className="h-4 w-4" />}
              />
              <SmallMetric
                label="Kerangka Materi"
                value={summary.totalFrameworks}
                icon={<Layers3 className="h-4 w-4" />}
              />
              <SmallMetric
                label="Absensi Belum Selesai"
                value={summary.todayPending}
                icon={<ClipboardCheck className="h-4 w-4" />}
              />
            </div>
          </DashboardPanel>
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          <DashboardPanel title="RPP Menunggu Review" subtitle="RPP submitted dari guru.">
            {latestRppSubmitted.length === 0 ? (
              <EmptyText text="Tidak ada RPP yang menunggu review." />
            ) : (
              <div className="space-y-3">
                {latestRppSubmitted.map((rpp) => (
                  <MiniCard
                    key={rpp.id}
                    title={getRppTitle(rpp)}
                    subtitle={`${rpp.teacher_name} • ${rpp.subject_name || "-"}`}
                    status={rpp.status || "submitted"}
                  />
                ))}
              </div>
            )}
          </DashboardPanel>

          <DashboardPanel
            title="Laporan Akademik Pending"
            subtitle="Laporan akademik menunggu approval."
          >
            {latestAcademicPending.length === 0 ? (
              <EmptyText text="Tidak ada laporan akademik pending." />
            ) : (
              <div className="space-y-3">
                {latestAcademicPending.map((report) => (
                  <MiniCard
                    key={report.id}
                    title={`${report.student_name} - ${report.subject_name}`}
                    subtitle={`${report.teacher_name} • ${report.report_period || "-"}`}
                    status={report.approval_status || report.status || "pending"}
                  />
                ))}
              </div>
            )}
          </DashboardPanel>

          <DashboardPanel title="Progress Program Semester" subtitle="Realisasi kurikulum.">
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
                          {program.teacher_name} • {program.level} {program.grade}
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