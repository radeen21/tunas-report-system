"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Layers3,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import TeacherLayout from "./components/TeacherLayout";

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
  teacher_id?: string | null;
  total_meetings: number | null;
  total_minutes: number | null;
};

type AcademicReportRow = {
  id: string;
  teacher_id: string | null;
  student_id: string | null;
  subject_id: string | null;
  report_period: string | null;
  report_type: string | null;
  final_grade?: number | null;
  final_score?: number | null;
  predicate?: string | null;
  description?: string | null;
  approval_status?: string | null;
  status?: string | null;
  updated_at?: string | null;
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

type FrameworkSummary = MaterialFrameworkRow & {
  subject_name: string;
  allocation: TimeAllocationRow | null;
};

type AcademicReportSummary = AcademicReportRow & {
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

function formatTeacherSubject(subjects: TeacherRow["subjects"]) {
  if (!subjects) return "Guru";

  if (Array.isArray(subjects)) {
    return `Guru — ${subjects.slice(0, 4).join(", ")}`;
  }

  return `Guru — ${subjects}`;
}

function formatNumber(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";

  return Number(value).toFixed(2).replace(".00", "");
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

export default function TeacherDashboardPage() {
  const [teacher, setTeacher] = useState<TeacherRow | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [rpps, setRpps] = useState<RppRow[]>([]);
  const [frameworks, setFrameworks] = useState<FrameworkSummary[]>([]);
  const [academicReports, setAcademicReports] = useState<AcademicReportSummary[]>(
    []
  );

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

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
        setSchedules([]);
        setAttendance([]);
        setRpps([]);
        setFrameworks([]);
        setAcademicReports([]);
        setErrorMessage(
          "Data guru belum terhubung dengan akun login ini. Hubungkan email guru di tabel teachers atau isi teacher_code di akun guru."
        );
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
        academicReportsRes,
      ] = await Promise.all([
        supabase.from("students").select("id, full_name, level, grade").order("full_name"),
        supabase.from("subjects").select("id, name").order("name"),
        supabase.from("schedules").select("*").eq("teacher_id", currentTeacher.id),
        supabase.from("attendance").select("*").eq("teacher_id", currentTeacher.id),
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
          .from("academic_reports")
          .select("*")
          .eq("teacher_id", currentTeacher.id)
          .order("updated_at", { ascending: false }),
      ]);

      if (studentsRes.error) throw new Error(studentsRes.error.message);
      if (subjectsRes.error) throw new Error(subjectsRes.error.message);
      if (schedulesRes.error) throw new Error(schedulesRes.error.message);
      if (attendanceRes.error) throw new Error(attendanceRes.error.message);
      if (rppRes.error) throw new Error(rppRes.error.message);
      if (frameworksRes.error) throw new Error(frameworksRes.error.message);
      if (allocationsRes.error) throw new Error(allocationsRes.error.message);
      if (academicReportsRes.error) {
        throw new Error(academicReportsRes.error.message);
      }

      const studentsData = (studentsRes.data || []) as StudentRow[];
      const subjectsData = (subjectsRes.data || []) as SubjectRow[];
      const schedulesData = (schedulesRes.data || []) as ScheduleRow[];
      const attendanceData = (attendanceRes.data || []) as AttendanceRow[];
      const rppData = (rppRes.data || []) as RppRow[];
      const frameworksData = (frameworksRes.data || []) as MaterialFrameworkRow[];
      const allocationsData = (allocationsRes.data || []) as TimeAllocationRow[];
      const academicReportsData = (academicReportsRes.data ||
        []) as AcademicReportRow[];

      const subjectMap = new Map(
        subjectsData.map((subject) => [subject.id, subject])
      );

      const studentMap = new Map(
        studentsData.map((student) => [student.id, student])
      );

      const allocationMap = new Map(
        allocationsData
          .filter((allocation) => allocation.material_framework_id)
          .map((allocation) => [
            allocation.material_framework_id as string,
            allocation,
          ])
      );

      const enrichedFrameworks: FrameworkSummary[] = frameworksData.map(
        (framework) => {
          const subject = framework.subject_id
            ? subjectMap.get(framework.subject_id)
            : null;

          return {
            ...framework,
            subject_name: subject?.name || "-",
            allocation: allocationMap.get(framework.id) || null,
          };
        }
      );

      const enrichedAcademicReports: AcademicReportSummary[] =
        academicReportsData.map((report) => {
          const student = report.student_id
            ? studentMap.get(report.student_id)
            : null;

          const subject = report.subject_id
            ? subjectMap.get(report.subject_id)
            : null;

          return {
            ...report,
            student_name: student?.full_name || "-",
            subject_name: subject?.name || "-",
          };
        });

      setStudents(studentsData);
      setSubjects(subjectsData);
      setSchedules(schedulesData);
      setAttendance(attendanceData);
      setRpps(rppData);
      setFrameworks(enrichedFrameworks);
      setAcademicReports(enrichedAcademicReports);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengambil data dashboard guru.");
      }

      setTeacher(null);
      setStudents([]);
      setSubjects([]);
      setSchedules([]);
      setAttendance([]);
      setRpps([]);
      setFrameworks([]);
      setAcademicReports([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("teacher-dashboard-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teachers" },
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
        { event: "*", schema: "public", table: "material_frameworks" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "time_allocations" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "academic_reports" },
        () => fetchData()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
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
      totalAcademicReports: academicReports.length,
      academicPending: academicReports.filter(
        (item) => getAcademicStatus(item) === "pending"
      ).length,
      academicApproved: academicReports.filter(
        (item) => getAcademicStatus(item) === "approved"
      ).length,
    };
  }, [todayRombels, rpps, frameworks, academicReports]);

  const latestRpps = rpps.slice(0, 4);
  const latestFrameworks = frameworks.slice(0, 3);
  const latestAcademicReports = academicReports.slice(0, 4);

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
            laporan akademik dalam satu dashboard.
          </p>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-[14px] leading-6 text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-[22px] border border-[#E1CFBE] bg-white px-6 py-12 text-center text-[#6F5549] shadow-sm">
            Memuat dashboard guru...
          </div>
        ) : null}

        {!loading && !teacher ? (
          <div className="rounded-[22px] border border-[#E1CFBE] bg-white px-6 py-12 text-center text-[#6F5549] shadow-sm">
            Data guru belum terhubung dengan akun login ini.
          </div>
        ) : null}

        {!loading && teacher ? (
          <>
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
                {todayRombels.length === 0 ? (
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
                              {formatTime(rombel.end_time)} •{" "}
                              {rombel.session_name}
                            </p>
                            <p className="mt-1 text-[13px] text-[#6F5549]">
                              Materi: {rombel.material_topic}
                            </p>
                            <p className="mt-2 text-[12px] font-bold text-[#8A5A48]">
                              {rombel.students.length} murid
                            </p>
                          </div>

                          <StatusBadge
                            status={
                              rombel.alreadyAttendance ? "approved" : "pending"
                            }
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
              <DashboardPanel
                title="RPP Terbaru"
                subtitle="RPP terakhir dibuat atau diperbarui."
              >
                {latestRpps.length === 0 ? (
                  <EmptyText text="Belum ada RPP." />
                ) : (
                  <div className="space-y-3">
                    {latestRpps.map((rpp) => (
                      <MiniCard
                        key={rpp.id}
                        title={getRppTitle(rpp)}
                        subtitle={`${rpp.subject_name || "-"} • ${
                          rpp.level || "-"
                        } ${rpp.grade || ""}`}
                        status={rpp.status || "draft"}
                      />
                    ))}
                  </div>
                )}
              </DashboardPanel>

              <DashboardPanel
                title="Kerangka Materi"
                subtitle="Kerangka materi terbaru."
              >
                {latestFrameworks.length === 0 ? (
                  <EmptyText text="Belum ada kerangka materi." />
                ) : (
                  <div className="space-y-3">
                    {latestFrameworks.map((framework) => (
                      <MiniCard
                        key={framework.id}
                        title={framework.framework_title || "-"}
                        subtitle={`${framework.subject_name} • ${
                          framework.level
                        } ${framework.grade}`}
                        status={framework.status || "draft"}
                      />
                    ))}
                  </div>
                )}
              </DashboardPanel>

              <DashboardPanel
                title="Laporan Akademik"
                subtitle="Laporan akademik terakhir yang dibuat guru."
              >
                {latestAcademicReports.length === 0 ? (
                  <EmptyText text="Belum ada laporan akademik." />
                ) : (
                  <div className="space-y-3">
                    {latestAcademicReports.map((report) => {
                      const status = getAcademicStatus(report);
                      const score =
                        report.final_grade ?? report.final_score ?? null;

                      return (
                        <MiniCard
                          key={report.id}
                          title={`${report.student_name} • ${report.subject_name}`}
                          subtitle={`${report.report_period || "-"} • Nilai ${formatNumber(
                            score
                          )} • ${report.predicate || report.description || "-"}`}
                          status={status}
                        />
                      );
                    })}
                  </div>
                )}
              </DashboardPanel>
            </div>
          </>
        ) : null}
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