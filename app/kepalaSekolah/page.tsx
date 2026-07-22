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
  X,
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
  document_url?: string | null;
  submitted_at?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  rejection_note?: string | null;
  updated_at?: string | null;
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

type ProgramTeacherProgress = {
  teacher_id: string;
  teacher_name: string;
  total: number;
  draft: number;
  submitted: number;
  approved: number;
  rejected: number;
  average_progress: number;
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

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

function isApprovedStatus(status?: string | null) {
  return status === "approved" || status === "published";
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
  const [showProgramSemesterPopup, setShowProgramSemesterPopup] = useState(false);

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

  const programTeacherProgress = useMemo(() => {
    const teacherMap = new Map<string, ProgramTeacherProgress>();

    programProgress.forEach((program) => {
      const key = program.teacher_id || program.teacher_name || "-";
      const current =
        teacherMap.get(key) ||
        ({
          teacher_id: program.teacher_id || key,
          teacher_name: program.teacher_name || "-",
          total: 0,
          draft: 0,
          submitted: 0,
          approved: 0,
          rejected: 0,
          average_progress: 0,
        } satisfies ProgramTeacherProgress);

      current.total += 1;

      if (program.status === "submitted") current.submitted += 1;
      else if (isApprovedStatus(program.status)) current.approved += 1;
      else if (program.status === "rejected") current.rejected += 1;
      else current.draft += 1;

      current.average_progress += program.progress_percent;

      teacherMap.set(key, current);
    });

    return Array.from(teacherMap.values())
      .map((item) => ({
        ...item,
        average_progress:
          item.total > 0 ? Math.round(item.average_progress / item.total) : 0,
      }))
      .sort((a, b) => b.submitted - a.submitted || b.average_progress - a.average_progress);
  }, [programProgress]);

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
      programSubmitted: programProgress.filter((program) => program.status === "submitted").length,
      programApproved: programProgress.filter((program) => isApprovedStatus(program.status)).length,
      programRejected: programProgress.filter((program) => program.status === "rejected").length,
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

  const latestProgramReview = programProgress
    .filter((program) => program.status === "submitted")
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
            label="Program Semester"
            value={`${summary.curriculumPercent}%`}
            info={`${summary.programSubmitted} review`}
            tone="green"
            onClick={() => setShowProgramSemesterPopup(true)}
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
                label="Program Semester Review"
                value={summary.programSubmitted}
                icon={<CalendarDays className="h-4 w-4" />}
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
            title="Program Semester Review"
            subtitle="Program Semester submitted dari guru."
          >
            {latestProgramReview.length === 0 ? (
              <EmptyText text="Tidak ada Program Semester yang menunggu review." />
            ) : (
              <div className="space-y-3">
                {latestProgramReview.map((program) => (
                  <MiniCard
                    key={program.id}
                    title={program.subject_name || "-"}
                    subtitle={`${program.teacher_name} • ${program.level || "-"} ${
                      program.grade || ""
                    }`}
                    status={program.status || "submitted"}
                  />
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowProgramSemesterPopup(true)}
              className="mt-4 h-10 w-full rounded-xl border border-[#DCC8B6] text-[13px] font-extrabold text-[#8C0F2D] transition hover:bg-[#FFF8EF]"
            >
              Lihat Progress Approval Guru
            </button>
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

      {showProgramSemesterPopup ? (
        <ProgramSemesterPopup
          programs={programProgress}
          teacherProgress={programTeacherProgress}
          summary={{
            total: summary.totalPrograms,
            submitted: summary.programSubmitted,
            approved: summary.programApproved,
            rejected: summary.programRejected,
            curriculumPercent: summary.curriculumPercent,
          }}
          onClose={() => setShowProgramSemesterPopup(false)}
        />
      ) : null}
    </KepalaSekolahLayout>
  );
}

function ProgramSemesterPopup({
  programs,
  teacherProgress,
  summary,
  onClose,
}: {
  programs: ProgramProgress[];
  teacherProgress: ProgramTeacherProgress[];
  summary: {
    total: number;
    submitted: number;
    approved: number;
    rejected: number;
    curriculumPercent: number;
  };
  onClose: () => void;
}) {
  const sortedPrograms = [...programs].sort((a, b) => {
    const statusOrder = (status?: string | null) => {
      if (status === "submitted") return 1;
      if (status === "rejected") return 2;
      if (isApprovedStatus(status)) return 3;
      return 4;
    };

    return (
      statusOrder(a.status) - statusOrder(b.status) ||
      b.progress_percent - a.progress_percent
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-8">
      <div className="max-h-[92vh] w-full max-w-[1120px] overflow-y-auto rounded-[22px] bg-[#FFF8EF] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E1CFBE] bg-[#FFF8EF] px-6 py-5">
          <div>
            <h2 className="text-[22px] font-extrabold text-[#2B1B18]">
              Progress Approval Program Semester
            </h2>

            <p className="mt-1 text-[14px] text-[#6F5549]">
              Ringkasan status Program Semester per guru dan progress realisasi
              kurikulum.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#6F5549] transition hover:bg-[#F4E5DA]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <PopupMetric label="Total Program" value={summary.total} />
            <PopupMetric label="Submitted" value={summary.submitted} />
            <PopupMetric label="Approved" value={summary.approved} />
            <PopupMetric label="Rejected" value={summary.rejected} />
            <PopupMetric label="Realisasi" value={`${summary.curriculumPercent}%`} />
          </div>

          <div className="rounded-[22px] border border-[#E1CFBE] bg-white p-5">
            <div className="mb-4">
              <h3 className="text-[17px] font-extrabold text-[#2B1B18]">
                Progress Approval per Guru
              </h3>
              <p className="mt-1 text-[13px] text-[#6F5549]">
                Menampilkan total Program Semester, status approval, dan rata-rata
                progress realisasi.
              </p>
            </div>

            {teacherProgress.length === 0 ? (
              <EmptyText text="Belum ada data Program Semester." />
            ) : (
              <div className="space-y-3">
                {teacherProgress.map((item) => (
                  <div
                    key={item.teacher_id}
                    className="rounded-2xl border border-[#EADACA] bg-[#FFFCF8] px-4 py-4"
                  >
                    <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
                      <div>
                        <p className="text-[15px] font-extrabold text-[#2B1B18]">
                          {item.teacher_name}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <StatusPill text={`${item.total} total`} tone="neutral" />
                          <StatusPill text={`${item.submitted} submitted`} tone="yellow" />
                          <StatusPill text={`${item.approved} approved`} tone="green" />
                          <StatusPill text={`${item.rejected} rejected`} tone="red" />
                          <StatusPill text={`${item.draft} draft`} tone="gray" />
                        </div>
                      </div>

                      <div className="w-full max-w-[280px]">
                        <div className="mb-2 flex items-center justify-between text-[12px] font-bold text-[#6F5549]">
                          <span>Avg. Realisasi</span>
                          <span>{item.average_progress}%</span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-[#EADACA]">
                          <div
                            className="h-full rounded-full bg-[#158A58]"
                            style={{ width: `${item.average_progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[22px] border border-[#E1CFBE] bg-white p-5">
            <div className="mb-4">
              <h3 className="text-[17px] font-extrabold text-[#2B1B18]">
                Detail Program Semester
              </h3>
              <p className="mt-1 text-[13px] text-[#6F5549]">
                Urutan teratas menampilkan Program Semester yang perlu direview.
              </p>
            </div>

            {sortedPrograms.length === 0 ? (
              <EmptyText text="Belum ada Program Semester." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse">
                  <thead>
                    <tr className="border-b border-[#EADACA] bg-[#FFF8EF] text-left text-[13px] font-extrabold text-[#6F5549]">
                      <th className="px-4 py-3">Guru</th>
                      <th className="px-4 py-3">Mapel</th>
                      <th className="px-4 py-3">Kelas</th>
                      <th className="px-4 py-3">Semester</th>
                      <th className="px-4 py-3">Progress</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Update</th>
                    </tr>
                  </thead>

                  <tbody>
                    {sortedPrograms.map((program) => (
                      <tr
                        key={program.id}
                        className="border-b border-[#F0E1D4] text-[14px] text-[#2B1B18]"
                      >
                        <td className="px-4 py-3 font-bold">
                          {program.teacher_name}
                        </td>

                        <td className="px-4 py-3">{program.subject_name || "-"}</td>

                        <td className="px-4 py-3">
                          {[program.level, program.grade].filter(Boolean).join(" ") ||
                            "-"}
                        </td>

                        <td className="px-4 py-3">{program.semester || "-"}</td>

                        <td className="px-4 py-3">
                          <div className="w-[160px]">
                            <div className="mb-1 flex items-center justify-between text-[12px] font-bold text-[#6F5549]">
                              <span>
                                {program.completed_sub_chapters}/
                                {program.total_sub_chapters}
                              </span>
                              <span>{program.progress_percent}%</span>
                            </div>

                            <div className="h-2 overflow-hidden rounded-full bg-[#EADACA]">
                              <div
                                className="h-full rounded-full bg-[#158A58]"
                                style={{ width: `${program.progress_percent}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <StatusBadge status={program.status} />
                        </td>

                        <td className="px-4 py-3 text-[12px] text-[#6F5549]">
                          {formatDateTime(program.updated_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  info,
  tone,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  info: string;
  tone: "pink" | "orange" | "blue" | "green";
  onClick?: () => void;
}) {
  const toneClass = {
    pink: "bg-[#F8E1E8] text-[#8C0F2D]",
    orange: "bg-[#F4DFD5] text-[#B85C38]",
    blue: "bg-[#D7ECFA] text-[#1779B8]",
    green: "bg-[#C7F0DA] text-[#158A58]",
  }[tone];

  const content = (
    <>
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
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="rounded-[18px] border border-[#E8D6C1] bg-white px-5 py-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="rounded-[18px] border border-[#E8D6C1] bg-white px-5 py-5 shadow-sm">
      {content}
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

function StatusPill({
  text,
  tone,
}: {
  text: string;
  tone: "neutral" | "yellow" | "green" | "red" | "gray";
}) {
  const toneClass = {
    neutral: "bg-[#F4E5DA] text-[#8A2332]",
    yellow: "bg-[#FFF2B8] text-[#B26A00]",
    green: "bg-[#C7F0DA] text-[#158A58]",
    red: "bg-[#FFE4E6] text-[#BE123C]",
    gray: "bg-[#F1F5F9] text-[#64748B]",
  }[tone];

  return (
    <span className={`rounded-full px-3 py-1 text-[12px] font-extrabold ${toneClass}`}>
      {text}
    </span>
  );
}

function PopupMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-[#EADACA] bg-white px-4 py-4">
      <p className="text-[12px] font-bold text-[#8A5A48]">{label}</p>
      <p className="mt-2 text-[24px] font-extrabold text-[#2B1B18]">{value}</p>
    </div>
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