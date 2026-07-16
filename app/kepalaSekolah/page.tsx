"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import KepalaSekolahLayout from "./components/KepalaSekolahLayout";

type Student = {
  id: string;
  full_name: string;
  level: string | null;
  grade: string | null;
  nis: string | null;
  nisn: string | null;
  created_at: string | null;
};

type Teacher = {
  id: string;
  full_name: string;
  email: string | null;
  subjects: string[] | null;
};

type Subject = {
  id: string;
  name: string;
};

type AcademicReportRow = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  report_period: string | null;
  report_type: string | null;
  final_score: number | null;
  description: string | null;
  teacher_comment: string | null;
  status: string | null;
  created_at: string | null;
  students:
    | {
        id: string;
        full_name: string;
        grade: string | null;
      }
    | {
        id: string;
        full_name: string;
        grade: string | null;
      }[]
    | null;
  teachers:
    | {
        id: string;
        full_name: string;
      }
    | {
        id: string;
        full_name: string;
      }[]
    | null;
  subjects:
    | {
        id: string;
        name: string;
      }
    | {
        id: string;
        name: string;
      }[]
    | null;
};

type AcademicReport = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  report_period: string | null;
  report_type: string | null;
  final_score: number | null;
  description: string | null;
  teacher_comment: string | null;
  status: string | null;
  created_at: string | null;
  students: {
    id: string;
    full_name: string;
    grade: string | null;
  } | null;
  teachers: {
    id: string;
    full_name: string;
  } | null;
  subjects: {
    id: string;
    name: string;
  } | null;
};

type KbmReportRow = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  report_date: string | null;
  class_level: string | null;
  semester: string | null;
  chapter: string | null;
  material_topic: string | null;
  status: string | null;
  created_at: string | null;
  students:
    | {
        id: string;
        full_name: string;
        grade: string | null;
      }
    | {
        id: string;
        full_name: string;
        grade: string | null;
      }[]
    | null;
  teachers:
    | {
        id: string;
        full_name: string;
      }
    | {
        id: string;
        full_name: string;
      }[]
    | null;
  subjects:
    | {
        id: string;
        name: string;
      }
    | {
        id: string;
        name: string;
      }[]
    | null;
};

type KbmReport = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  report_date: string | null;
  class_level: string | null;
  semester: string | null;
  chapter: string | null;
  material_topic: string | null;
  status: string | null;
  created_at: string | null;
  students: {
    id: string;
    full_name: string;
    grade: string | null;
  } | null;
  teachers: {
    id: string;
    full_name: string;
  } | null;
  subjects: {
    id: string;
    name: string;
  } | null;
};

type AttendanceRow = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  attendance_date: string | null;
  attendance_status: string | null;
  understanding_status: string | null;
  created_at: string | null;
};

type LatestReport = {
  id: string;
  type: "academic" | "kbm";
  title: string;
  studentName: string;
  teacherName: string;
  period: string;
  dateText: string;
  status: string | null;
  createdAt: string | null;
};

type PendingItem = {
  id: string;
  type: "academic" | "kbm";
  studentName: string;
  teacherName: string;
  period: string;
  status: string | null;
};

function normalizeRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function formatDate(date: string | null) {
  if (!date) return "-";

  const parsedDate = new Date(date);

  return parsedDate.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusLabel(status: string | null) {
  if (status === "published") return "Published";
  if (status === "approved") return "Approved";
  if (status === "pending_review") return "Pending Review";
  if (status === "revision") return "Revision";

  return "Draft";
}

function getStatusBadge(status: string | null) {
  if (status === "published") return "bg-emerald-100 text-emerald-700";
  if (status === "approved") return "bg-blue-100 text-blue-700";
  if (status === "pending_review") return "bg-yellow-100 text-yellow-700";
  if (status === "revision") return "bg-red-100 text-red-700";

  return "bg-slate-200 text-slate-700";
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

function getMonthShortName(monthIndex: number) {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  return months[monthIndex] || "-";
}

export default function KepalaSekolahDashboardPage() {
  const [profileName, setProfileName] = useState("Bapak Mulyadi");

  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [academicReports, setAcademicReports] = useState<AcademicReport[]>([]);
  const [kbmReports, setKbmReports] = useState<KbmReport[]>([]);
  const [attendanceList, setAttendanceList] = useState<AttendanceRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function fetchProfileName() {
    const email = localStorage.getItem("hstkb_demo_email");

    if (!email) return;

    const { data, error } = await supabase
      .from("users_profile")
      .select("full_name, email, role")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      console.log("Gagal ambil profile kepala sekolah:", error.message);
      return;
    }

    if (data?.full_name) {
      setProfileName(data.full_name);
    }
  }

  async function fetchStudents() {
    const { data, error } = await supabase
      .from("students")
      .select("id, full_name, level, grade, nis, nisn, created_at")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    setStudents(data || []);
  }

  async function fetchTeachers() {
    const { data, error } = await supabase
      .from("teachers")
      .select("id, full_name, email, subjects")
      .order("full_name", { ascending: true });

    if (error) throw new Error(error.message);

    setTeachers(data || []);
  }

  async function fetchSubjects() {
    const { data, error } = await supabase
      .from("subjects")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) throw new Error(error.message);

    setSubjects(data || []);
  }

  async function fetchAcademicReports() {
    const { data, error } = await supabase
      .from("academic_reports")
      .select(
        `
        id,
        student_id,
        teacher_id,
        subject_id,
        report_period,
        report_type,
        final_score,
        description,
        teacher_comment,
        status,
        created_at,
        students (
          id,
          full_name,
          grade
        ),
        teachers (
          id,
          full_name
        ),
        subjects (
          id,
          name
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const rows = (data || []) as AcademicReportRow[];

    const normalized: AcademicReport[] = rows.map((item) => ({
      id: item.id,
      student_id: item.student_id,
      teacher_id: item.teacher_id,
      subject_id: item.subject_id,
      report_period: item.report_period,
      report_type: item.report_type,
      final_score: item.final_score,
      description: item.description,
      teacher_comment: item.teacher_comment,
      status: item.status,
      created_at: item.created_at,
      students: normalizeRelation(item.students),
      teachers: normalizeRelation(item.teachers),
      subjects: normalizeRelation(item.subjects),
    }));

    setAcademicReports(normalized);
  }

  async function fetchKbmReports() {
    const { data, error } = await supabase
      .from("kbm_reports")
      .select(
        `
        id,
        student_id,
        teacher_id,
        subject_id,
        report_date,
        class_level,
        semester,
        chapter,
        material_topic,
        status,
        created_at,
        students (
          id,
          full_name,
          grade
        ),
        teachers (
          id,
          full_name
        ),
        subjects (
          id,
          name
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const rows = (data || []) as KbmReportRow[];

    const normalized: KbmReport[] = rows.map((item) => ({
      id: item.id,
      student_id: item.student_id,
      teacher_id: item.teacher_id,
      subject_id: item.subject_id,
      report_date: item.report_date,
      class_level: item.class_level,
      semester: item.semester,
      chapter: item.chapter,
      material_topic: item.material_topic,
      status: item.status,
      created_at: item.created_at,
      students: normalizeRelation(item.students),
      teachers: normalizeRelation(item.teachers),
      subjects: normalizeRelation(item.subjects),
    }));

    setKbmReports(normalized);
  }

  async function fetchAttendance() {
    const { data, error } = await supabase
      .from("attendance")
      .select(
        `
        id,
        student_id,
        teacher_id,
        subject_id,
        attendance_date,
        attendance_status,
        understanding_status,
        created_at
      `
      )
      .order("attendance_date", { ascending: true });

    if (error) throw new Error(error.message);

    setAttendanceList(data || []);
  }

  async function fetchDashboardData() {
    setLoading(true);
    setErrorMessage("");

    try {
      await Promise.all([
        fetchStudents(),
        fetchTeachers(),
        fetchSubjects(),
        fetchAcademicReports(),
        fetchKbmReports(),
        fetchAttendance(),
      ]);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengambil data dashboard.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProfileName();
    fetchDashboardData();
  }, []);

  const pendingApprovalCount = useMemo(() => {
    const pendingAcademic = academicReports.filter(
      (report) => report.status === "pending_review"
    ).length;

    const pendingKbm = kbmReports.filter(
      (report) => report.status === "pending_review"
    ).length;

    return pendingAcademic + pendingKbm;
  }, [academicReports, kbmReports]);

  const publishedReportsCount = useMemo(() => {
    const publishedAcademic = academicReports.filter(
      (report) => report.status === "published"
    ).length;

    const publishedKbm = kbmReports.filter(
      (report) => report.status === "published"
    ).length;

    return publishedAcademic + publishedKbm;
  }, [academicReports, kbmReports]);

  const academicChartData = useMemo(() => {
    const subjectMap = new Map<string, number[]>();

    academicReports.forEach((report) => {
      const subjectName = report.subjects?.name || "Lainnya";
      const score = Number(report.final_score || 0);

      if (score <= 0) return;

      if (!subjectMap.has(subjectName)) {
        subjectMap.set(subjectName, []);
      }

      subjectMap.get(subjectName)?.push(score);
    });

    const fromReports = Array.from(subjectMap.entries()).map(
      ([name, scores]) => {
        const total = scores.reduce((sum, score) => sum + score, 0);
        const average = Math.round(total / scores.length);

        return {
          name,
          value: average,
        };
      }
    );

    if (fromReports.length > 0) {
      return fromReports.slice(0, 6);
    }

    return subjects.slice(0, 6).map((subject) => ({
      name: subject.name,
      value: 0,
    }));
  }, [academicReports, subjects]);

  const attendanceSummary = useMemo(() => {
    const now = new Date();

    const lastSixMonths = Array.from({ length: 6 }).map((_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);

      return {
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
          2,
          "0"
        )}`,
        label: getMonthShortName(date.getMonth()),
        present: 0,
        total: 0,
      };
    });

    attendanceList.forEach((attendance) => {
      if (!attendance.attendance_date) return;

      const date = new Date(attendance.attendance_date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}`;

      const monthItem = lastSixMonths.find((item) => item.key === key);

      if (!monthItem) return;

      monthItem.total += 1;

      if (attendance.attendance_status === "Hadir") {
        monthItem.present += 1;
      }
    });

    return lastSixMonths.map((item) => ({
      label: item.label,
      value:
        item.total > 0 ? Math.round((item.present / item.total) * 100) : 0,
      total: item.total,
    }));
  }, [attendanceList]);

  const averageAttendance = useMemo(() => {
    const total = attendanceList.length;

    if (total === 0) return 0;

    const present = attendanceList.filter(
      (attendance) => attendance.attendance_status === "Hadir"
    ).length;

    return Math.round((present / total) * 100);
  }, [attendanceList]);

  const latestUploadedReports = useMemo(() => {
    const academicLatest: LatestReport[] = academicReports.map((report) => ({
      id: report.id,
      type: "academic",
      title: `${report.students?.full_name || "-"} — ${
        report.report_type || "Academic"
      }`,
      studentName: report.students?.full_name || "-",
      teacherName: report.teachers?.full_name || "-",
      period: report.report_period || "-",
      dateText: formatDate(report.created_at),
      status: report.status,
      createdAt: report.created_at,
    }));

    const kbmLatest: LatestReport[] = kbmReports.map((report) => ({
      id: report.id,
      type: "kbm",
      title: `${report.students?.full_name || "-"} — KBM`,
      studentName: report.students?.full_name || "-",
      teacherName: report.teachers?.full_name || "-",
      period: report.material_topic || report.chapter || "-",
      dateText: formatDate(report.report_date || report.created_at),
      status: report.status,
      createdAt: report.created_at,
    }));

    return [...academicLatest, ...kbmLatest]
      .sort(
        (a, b) =>
          new Date(b.createdAt || "").getTime() -
          new Date(a.createdAt || "").getTime()
      )
      .slice(0, 4);
  }, [academicReports, kbmReports]);

  const pendingApprovalItems = useMemo(() => {
    const academicPending: PendingItem[] = academicReports
      .filter((report) => report.status === "pending_review")
      .map((report) => ({
        id: report.id,
        type: "academic",
        studentName: report.students?.full_name || "-",
        teacherName: report.teachers?.full_name || "-",
        period: report.report_period || "-",
        status: report.status,
      }));

    const kbmPending: PendingItem[] = kbmReports
      .filter((report) => report.status === "pending_review")
      .map((report) => ({
        id: report.id,
        type: "kbm",
        studentName: report.students?.full_name || "-",
        teacherName: report.teachers?.full_name || "-",
        period: report.material_topic || report.chapter || "-",
        status: report.status,
      }));

    return [...academicPending, ...kbmPending].slice(0, 3);
  }, [academicReports, kbmReports]);

  const teacherPerformance = useMemo(() => {
    return teachers
      .map((teacher) => {
        const academicCount = academicReports.filter(
          (report) => report.teacher_id === teacher.id
        ).length;

        const kbmCount = kbmReports.filter(
          (report) => report.teacher_id === teacher.id
        ).length;

        return {
          id: teacher.id,
          name: teacher.full_name,
          totalReports: academicCount + kbmCount,
        };
      })
      .sort((a, b) => b.totalReports - a.totalReports)
      .slice(0, 4);
  }, [teachers, academicReports, kbmReports]);

  return (
    <KepalaSekolahLayout
      activeMenu="Dashboard"
      searchPlaceholder="Cari murid, guru, atau report..."
      buttonLabel="Create New Report"
    >
      <div className="w-full max-w-full overflow-hidden">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#6B4A3A]">
              Tahun Ajaran 2025/2026
            </p>

            <h1 className="mt-1 text-[30px] font-bold tracking-tight">
              Selamat datang, {profileName} 👋
            </h1>

            <p className="mt-1 text-sm text-[#6B4A3A]">
              Ringkasan aktivitas sekolah berdasarkan data terbaru dari
              Supabase.
            </p>
          </div>

          <button
            type="button"
            className="w-fit rounded-xl bg-[#7A1F2B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#54131D]"
          >
            Create New Report
          </button>
        </div>

        {errorMessage && (
          <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {loading && (
          <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-8 text-center text-sm shadow-sm">
            Loading dashboard...
          </div>
        )}

        {!loading && (
          <>
            <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FDE7D7] text-xl">
                    👥
                  </div>

                  <span className="text-sm font-bold text-emerald-600">
                    ▲ {students.length}
                  </span>
                </div>

                <p className="mt-7 text-3xl font-bold">{students.length}</p>
                <p className="mt-1 text-sm text-[#6B4A3A]">Total Students</p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F1DFD5] text-xl">
                    🎓
                  </div>

                  <span className="text-sm font-bold text-emerald-600">
                    ▲ {teachers.length}
                  </span>
                </div>

                <p className="mt-7 text-3xl font-bold">{teachers.length}</p>
                <p className="mt-1 text-sm text-[#6B4A3A]">Total Teachers</p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 text-xl">
                    📋
                  </div>

                  <span className="text-sm font-bold text-[#D96B2B]">
                    Review
                  </span>
                </div>

                <p className="mt-7 text-3xl font-bold">
                  {pendingApprovalCount}
                </p>
                <p className="mt-1 text-sm text-[#6B4A3A]">
                  Pending Approval
                </p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-xl">
                    📨
                  </div>

                  <span className="text-sm font-bold text-emerald-600">
                    ▲ {publishedReportsCount}
                  </span>
                </div>

                <p className="mt-7 text-3xl font-bold">
                  {publishedReportsCount}
                </p>
                <p className="mt-1 text-sm text-[#6B4A3A]">
                  Published Reports
                </p>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-1 gap-5 xl:grid-cols-[2fr_1fr]">
              <div className="overflow-hidden rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold">
                      Perkembangan Akademik Sekolah
                    </h2>
                    <p className="mt-1 text-sm text-[#6B4A3A]">
                      Rata-rata skor per mata pelajaran
                    </p>
                  </div>

                  <span className="text-xl text-emerald-600">↗</span>
                </div>

                <div className="mt-8 h-[310px] overflow-hidden">
                  <div className="relative h-[260px] w-full pl-10 pr-4">
                    <div className="absolute bottom-0 left-10 right-4 top-0">
                      {[100, 75, 50, 25, 0].map((value, index) => (
                        <div
                          key={value}
                          className="absolute left-0 right-0 border-t border-dashed border-[#E8D6C1]"
                          style={{ top: `${index * 25}%` }}
                        >
                          <span className="absolute -left-9 -top-2 text-xs text-[#6B4A3A]">
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="absolute bottom-0 left-10 right-4 top-0 flex items-end gap-5">
                      {academicChartData.length === 0 && (
                        <div className="flex h-full w-full items-center justify-center text-sm text-[#6B4A3A]">
                          Belum ada data nilai.
                        </div>
                      )}

                      {academicChartData.map((item) => {
                        const height = Math.max(
                          8,
                          Math.min(100, (item.value / 100) * 100)
                        );

                        return (
                          <div
                            key={item.name}
                            className="group relative flex h-full min-w-[70px] flex-1 cursor-pointer items-end justify-center"
                          >
                            <div className="absolute bottom-0 top-0 hidden w-full rounded-xl bg-black/10 group-hover:block" />

                            <div
                              className="pointer-events-none absolute left-1/2 z-30 hidden -translate-x-1/2 rounded-xl bg-white px-4 py-3 text-sm shadow-lg ring-1 ring-black/5 group-hover:block"
                              style={{
                                bottom: `calc(${height}% + 14px)`,
                              }}
                            >
                              <p className="font-semibold text-[#2B1B18]">
                                {item.name}
                              </p>
                              <p className="mt-1 whitespace-nowrap text-[#7A1F2B]">
                                score : {item.value}
                              </p>
                            </div>

                            <div
                              className="absolute left-1/2 z-20 -translate-x-1/2 text-xs font-bold text-[#6B4A3A]"
                              style={{
                                bottom: `calc(${height}% + 6px)`,
                              }}
                            >
                              {item.value}
                            </div>

                            <div
                              className="relative z-10 w-full max-w-[90px] rounded-t-lg bg-[#7A1F2B] transition-all duration-200 group-hover:bg-[#8E2634]"
                              style={{ height: `${height}%` }}
                            />

                            <p className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-[#6B4A3A]">
                              {item.name}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold">Attendance Summary</h2>
                <p className="mt-1 text-sm text-[#6B4A3A]">6 bulan terakhir</p>

                <div className="mt-8">
                  <div className="relative h-[220px] w-full pl-8">
                    <div className="absolute bottom-0 left-8 right-0 top-0">
                      {[100, 95, 90, 85, 80].map((value, index) => (
                        <div
                          key={value}
                          className="absolute left-0 right-0 border-t border-dashed border-[#E8D6C1]"
                          style={{ top: `${index * 25}%` }}
                        >
                          <span className="absolute -left-7 -top-2 text-xs text-[#6B4A3A]">
                            {value}
                          </span>
                        </div>
                      ))}

                      {attendanceSummary.map((item, index) => (
                        <div
                          key={item.label}
                          className="absolute bottom-0 top-0 border-l border-dashed border-[#E8D6C1]"
                          style={{
                            left:
                              attendanceSummary.length === 1
                                ? "0%"
                                : `${
                                    (index /
                                      (attendanceSummary.length - 1)) *
                                    100
                                  }%`,
                          }}
                        />
                      ))}
                    </div>

                    <svg
                      viewBox="0 0 300 180"
                      preserveAspectRatio="none"
                      className="absolute bottom-0 left-8 right-0 top-0 h-full w-[calc(100%-2rem)] overflow-visible"
                    >
                      {(() => {
                        const chartWidth = 300;
                        const chartHeight = 145;
                        const chartTop = 8;

                        const points = attendanceSummary.map((item, index) => {
                          const x =
                            attendanceSummary.length === 1
                              ? 0
                              : (index / (attendanceSummary.length - 1)) *
                                chartWidth;

                          const normalizedValue =
                            item.value > 0
                              ? Math.max(80, Math.min(100, item.value))
                              : 80;

                          const y =
                            chartTop +
                            ((100 - normalizedValue) / 20) * chartHeight;

                          return { x, y };
                        });

                        const linePath = points
                          .map((point, index) =>
                            index === 0
                              ? `M ${point.x} ${point.y}`
                              : `L ${point.x} ${point.y}`
                          )
                          .join(" ");

                        const areaPath =
                          points.length > 0
                            ? `${linePath} L ${
                                points[points.length - 1].x
                              } ${chartTop + chartHeight} L ${points[0].x} ${
                                chartTop + chartHeight
                              } Z`
                            : "";

                        return (
                          <>
                            <path d={areaPath} fill="#D96B2B" opacity="0.18" />

                            <path
                              d={linePath}
                              fill="none"
                              stroke="#D96B2B"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />

                            {points.map((point, index) => (
                              <circle
                                key={attendanceSummary[index].label}
                                cx={point.x}
                                cy={point.y}
                                r="3"
                                fill="#D96B2B"
                              />
                            ))}
                          </>
                        );
                      })()}
                    </svg>

                    <div className="absolute bottom-[-28px] left-8 right-0 flex justify-between">
                      {attendanceSummary.map((item) => (
                        <span
                          key={item.label}
                          className="text-xs text-[#6B4A3A]"
                        >
                          {item.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="mt-12 text-sm text-[#6B4A3A]">
                    Rata-rata sekolah:{" "}
                    <span className="font-bold text-[#2B1B18]">
                      {averageAttendance}%
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-1 gap-5 xl:grid-cols-[2fr_1fr]">
              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">Latest Uploaded Reports</h2>

                  <button className="text-sm font-bold text-[#7A1F2B]">
                    Lihat semua →
                  </button>
                </div>

                <div className="mt-6 divide-y divide-[#E8D6C1]">
                  {latestUploadedReports.length === 0 && (
                    <div className="py-6 text-center text-sm text-[#6B4A3A]">
                      Belum ada report terbaru.
                    </div>
                  )}

                  {latestUploadedReports.map((report) => (
                    <div
                      key={`${report.type}-${report.id}`}
                      className="flex items-center justify-between gap-4 py-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FDE7D7] text-sm font-bold text-[#7A1F2B]">
                          {getInitials(report.studentName)}
                        </div>

                        <div>
                          <p className="font-bold">{report.title}</p>
                          <p className="mt-1 text-sm text-[#6B4A3A]">
                            {report.teacherName} • {report.period} •{" "}
                            {report.dateText}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusBadge(
                            report.status
                          )}`}
                        >
                          {getStatusLabel(report.status)}
                        </span>

                        <button className="text-sm font-bold text-[#7A1F2B]">
                          Preview
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold">Pending Approval</h2>

                <div className="mt-6 space-y-4">
                  {pendingApprovalItems.length === 0 && (
                    <div className="rounded-2xl border border-[#E8D6C1] bg-[#FFF8EF] p-5 text-sm text-[#6B4A3A]">
                      Tidak ada laporan yang menunggu approval.
                    </div>
                  )}

                  {pendingApprovalItems.map((item) => (
                    <div
                      key={`${item.type}-${item.id}`}
                      className="rounded-2xl border border-yellow-300 bg-yellow-50 p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-bold">{item.studentName}</p>
                          <p className="mt-1 text-sm text-[#B85C38]">
                            {item.teacherName} • {item.period}
                          </p>
                          <p className="mt-2 text-sm text-[#B85C38]">
                            Menunggu review
                          </p>
                        </div>

                        <button className="text-xl text-[#D96B2B]">→</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-[#E8D6C1] bg-[#FFF8EF] p-5">
                  <h3 className="text-sm font-bold">
                    Performa Guru Bulan Ini
                  </h3>

                  <div className="mt-4 space-y-4">
                    {teacherPerformance.length === 0 && (
                      <p className="text-sm text-[#6B4A3A]">
                        Belum ada data performa guru.
                      </p>
                    )}

                    {teacherPerformance.map((teacher) => (
                      <div
                        key={teacher.id}
                        className="flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FDE7D7] text-xs font-bold text-[#7A1F2B]">
                            {getInitials(teacher.name)}
                          </div>

                          <p className="text-sm font-bold">{teacher.name}</p>
                        </div>

                        <p className="text-sm text-[#6B4A3A]">
                          {teacher.totalReports} reports
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </KepalaSekolahLayout>
  );
}