"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
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

type EnrichedRpp = RppRow & {
  teacher_name: string;
};

type EnrichedAcademicReport = AcademicReportRow & {
  teacher_name: string;
  student_name: string;
  subject_name: string;
};

type EnrichedFramework = MaterialFrameworkRow & {
  teacher_name: string;
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

function getAcademicStatus(report: AcademicReportRow) {
  if (report.approval_status) return report.approval_status;

  if (report.status === "published") return "approved";
  if (report.status === "approved") return "approved";
  if (report.status === "pending") return "pending";
  if (report.status === "rejected") return "rejected";

  return "draft";
}

function isPendingStatus(status?: string | null) {
  return status === "submitted" || status === "pending";
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
  const [academicReports, setAcademicReports] = useState<
    EnrichedAcademicReport[]
  >([]);
  const [frameworks, setFrameworks] = useState<EnrichedFramework[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function fetchData() {
    setLoading(true);
    setErrorMessage("");

    try {
      const [
        teachersRes,
        studentsRes,
        subjectsRes,
        schedulesRes,
        attendanceRes,
        rppRes,
        academicReportsRes,
        frameworksRes,
      ] = await Promise.all([
        supabase.from("teachers").select("id, full_name").order("full_name"),
        supabase.from("students").select("id, full_name, level, grade").order("full_name"),
        supabase.from("subjects").select("id, name").order("name"),
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
      ]);

      if (teachersRes.error) throw new Error(teachersRes.error.message);
      if (studentsRes.error) throw new Error(studentsRes.error.message);
      if (subjectsRes.error) throw new Error(subjectsRes.error.message);
      if (schedulesRes.error) throw new Error(schedulesRes.error.message);
      if (attendanceRes.error) throw new Error(attendanceRes.error.message);
      if (rppRes.error) throw new Error(rppRes.error.message);
      if (academicReportsRes.error) {
        throw new Error(academicReportsRes.error.message);
      }
      if (frameworksRes.error) throw new Error(frameworksRes.error.message);

      const teachersData = (teachersRes.data || []) as TeacherRow[];
      const studentsData = (studentsRes.data || []) as StudentRow[];
      const subjectsData = (subjectsRes.data || []) as SubjectRow[];
      const schedulesData = (schedulesRes.data || []) as ScheduleRow[];
      const attendanceData = (attendanceRes.data || []) as AttendanceRow[];
      const rppData = (rppRes.data || []) as RppRow[];
      const academicData = (academicReportsRes.data || []) as AcademicReportRow[];
      const frameworksData = (frameworksRes.data || []) as MaterialFrameworkRow[];

      const teacherMap = new Map(
        teachersData.map((teacher) => [teacher.id, teacher])
      );

      const studentMap = new Map(
        studentsData.map((student) => [student.id, student])
      );

      const subjectMap = new Map(
        subjectsData.map((subject) => [subject.id, subject])
      );

      const enrichedRpps: EnrichedRpp[] = rppData.map((rpp) => {
        const teacher = rpp.teacher_id ? teacherMap.get(rpp.teacher_id) : null;

        return {
          ...rpp,
          teacher_name: teacher?.full_name || "-",
        };
      });

      const enrichedAcademic: EnrichedAcademicReport[] = academicData.map(
        (report) => {
          const teacher = report.teacher_id
            ? teacherMap.get(report.teacher_id)
            : null;

          const student = report.student_id
            ? studentMap.get(report.student_id)
            : null;

          const subject = report.subject_id
            ? subjectMap.get(report.subject_id)
            : null;

          return {
            ...report,
            teacher_name: teacher?.full_name || "-",
            student_name: student?.full_name || "-",
            subject_name: subject?.name || "-",
          };
        }
      );

      const enrichedFrameworks: EnrichedFramework[] = frameworksData.map(
        (framework) => {
          const teacher = framework.teacher_id
            ? teacherMap.get(framework.teacher_id)
            : null;

          const subject = framework.subject_id
            ? subjectMap.get(framework.subject_id)
            : null;

          return {
            ...framework,
            teacher_name: teacher?.full_name || "-",
            subject_name: subject?.name || "-",
          };
        }
      );

      setTeachers(teachersData);
      setStudents(studentsData);
      setSubjects(subjectsData);
      setSchedules(schedulesData);
      setAttendance(attendanceData);
      setRpps(enrichedRpps);
      setAcademicReports(enrichedAcademic);
      setFrameworks(enrichedFrameworks);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengambil data dashboard admin/kepala sekolah.");
      }

      setTeachers([]);
      setStudents([]);
      setSubjects([]);
      setSchedules([]);
      setAttendance([]);
      setRpps([]);
      setAcademicReports([]);
      setFrameworks([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("kepala-dashboard-realtime")
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "schedules" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rpp" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "academic_reports" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "material_frameworks" },
        () => fetchData()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const todayRombels = useMemo(() => {
    const today = todayYMD();
    const grouped = new Map<string, RombelToday>();

    const teacherMap = new Map(
      teachers.map((teacher) => [teacher.id, teacher])
    );

    const subjectMap = new Map(
      subjects.map((subject) => [subject.id, subject])
    );

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
    const rppSubmitted = rpps.filter((rpp) =>
      isPendingStatus(rpp.status)
    ).length;

    const rppApproved = rpps.filter((rpp) =>
      isApprovedStatus(rpp.status)
    ).length;

    const academicPending = academicReports.filter((report) => {
      const status = getAcademicStatus(report);
      return status === "pending";
    }).length;

    const academicApproved = academicReports.filter((report) => {
      const status = getAcademicStatus(report);
      return status === "approved";
    }).length;

    const frameworkSubmitted = frameworks.filter((framework) =>
      isPendingStatus(framework.status)
    ).length;

    const frameworkApproved = frameworks.filter((framework) =>
      isApprovedStatus(framework.status)
    ).length;

    const todayDone = todayRombels.filter((item) => item.alreadyAttendance)
      .length;

    const todayPending = todayRombels.length - todayDone;

    return {
      totalStudents: students.length,
      totalTeachers: teachers.length,
      totalSchedules: schedules.length,
      todayRombel: todayRombels.length,
      todayDone,
      todayPending,
      rppSubmitted,
      rppApproved,
      academicPending,
      academicApproved,
      totalFrameworks: frameworks.length,
      frameworkSubmitted,
      frameworkApproved,
    };
  }, [students, teachers, schedules, todayRombels, rpps, academicReports, frameworks]);

  const latestRppSubmitted = rpps
    .filter((rpp) => isPendingStatus(rpp.status))
    .slice(0, 4);

  const latestAcademicPending = academicReports
    .filter((report) => getAcademicStatus(report) === "pending")
    .slice(0, 4);

  const latestFrameworkSubmitted = frameworks
    .filter((framework) => isPendingStatus(framework.status))
    .slice(0, 4);

  return (
    <KepalaSekolahLayout
      activeMenu="Dashboard"
      searchPlaceholder="Cari data dashboard..."
    >
      <section className="space-y-7">
        <div>
          <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#8A5A48]">
            Admin / Kepala Sekolah Dashboard
          </p>

          <h1 className="mt-2 text-[30px] font-extrabold tracking-[-0.02em] text-[#2B1B18]">
            Monitoring Sekolah
          </h1>

          <p className="mt-2 max-w-[900px] text-[15px] leading-6 text-[#6F5549]">
            Pantau data siswa, guru, jadwal, absensi harian, RPP, laporan
            akademik, dan kerangka materi dalam satu dashboard.
          </p>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-[14px] leading-6 text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={<Users className="h-5 w-5" />}
            label="Total Siswa"
            value={summary.totalStudents}
            info={`${summary.totalTeachers} guru`}
            tone="pink"
          />

          <SummaryCard
            icon={<CalendarDays className="h-5 w-5" />}
            label="Jadwal Hari Ini"
            value={summary.todayRombel}
            info={`${summary.totalSchedules} total`}
            tone="orange"
          />

          <SummaryCard
            icon={<FileText className="h-5 w-5" />}
            label="RPP Menunggu Review"
            value={summary.rppSubmitted}
            info={`${summary.rppApproved} approved`}
            tone="blue"
          />

          <SummaryCard
            icon={<GraduationCap className="h-5 w-5" />}
            label="Laporan Akademik Pending"
            value={summary.academicPending}
            info={`${summary.academicApproved} approved`}
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
                        label={
                          rombel.alreadyAttendance
                            ? "Sudah Absen"
                            : "Belum Absen"
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DashboardPanel>

          <DashboardPanel
            title="Ringkasan Akademik"
            subtitle="Data approval dan monitoring akademik."
          >
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
                label="Kerangka Materi Review"
                value={summary.frameworkSubmitted}
                icon={<Layers3 className="h-4 w-4" />}
              />

              <SmallMetric
                label="Kerangka Materi Approved"
                value={summary.frameworkApproved}
                icon={<CheckCircle2 className="h-4 w-4" />}
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
          <DashboardPanel
            title="RPP Menunggu Review"
            subtitle="RPP submitted dari guru."
          >
            {loading ? (
              <EmptyText text="Memuat RPP..." />
            ) : latestRppSubmitted.length === 0 ? (
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
            subtitle="Laporan akademik yang perlu approval."
          >
            {loading ? (
              <EmptyText text="Memuat laporan akademik..." />
            ) : latestAcademicPending.length === 0 ? (
              <EmptyText text="Tidak ada laporan akademik pending." />
            ) : (
              <div className="space-y-3">
                {latestAcademicPending.map((report) => (
                  <MiniCard
                    key={report.id}
                    title={`${report.student_name} • ${report.subject_name}`}
                    subtitle={`${report.teacher_name} • ${
                      report.report_period || "-"
                    }`}
                    status={getAcademicStatus(report)}
                  />
                ))}
              </div>
            )}
          </DashboardPanel>

          <DashboardPanel
            title="Kerangka Materi Review"
            subtitle="Kerangka materi submitted dari guru."
          >
            {loading ? (
              <EmptyText text="Memuat kerangka materi..." />
            ) : latestFrameworkSubmitted.length === 0 ? (
              <EmptyText text="Tidak ada kerangka materi yang menunggu review." />
            ) : (
              <div className="space-y-3">
                {latestFrameworkSubmitted.map((framework) => (
                  <MiniCard
                    key={framework.id}
                    title={framework.framework_title || "-"}
                    subtitle={`${framework.teacher_name} • ${
                      framework.subject_name
                    } • ${framework.level || "-"} ${framework.grade || ""}`}
                    status={framework.status || "submitted"}
                  />
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