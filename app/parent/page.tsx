"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import ParentLayout from "./components/ParentLayout";

type Parent = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  relation: string | null;
};

type TeacherRelation = {
  id: string;
  full_name: string;
  email: string | null;
};

type StudentRow = {
  id: string;
  parent_id: string | null;
  homeroom_teacher_id: string | null;
  nis: string | null;
  nisn: string | null;
  full_name: string;
  level: string | null;
  grade: string | null;
  academic_year: string | null;
  status: string | null;
  progress: number | null;
  attendance: number | null;
  teachers: TeacherRelation | TeacherRelation[] | null;
};

type Student = {
  id: string;
  parent_id: string | null;
  homeroom_teacher_id: string | null;
  nis: string | null;
  nisn: string | null;
  full_name: string;
  level: string | null;
  grade: string | null;
  academic_year: string | null;
  status: string | null;
  progress: number | null;
  attendance: number | null;
  teachers: TeacherRelation | null;
};

type SubjectRelation = {
  id: string;
  name: string;
};

type AcademicReportRow = {
  id: string;
  student_id: string | null;
  subject_id: string | null;
  report_period: string | null;
  report_type: string | null;
  final_score: number | null;
  description: string | null;
  teacher_comment: string | null;
  status: string | null;
  created_at: string | null;
  subjects: SubjectRelation | SubjectRelation[] | null;
};

type AcademicReport = Omit<AcademicReportRow, "subjects"> & {
  subjects: SubjectRelation | null;
};

type AttendanceRow = {
  id: string;
  student_id: string | null;
  attendance_date: string | null;
  attendance_status: string | null;
  understanding_status: string | null;
  material_topic: string | null;
  notes: string | null;
  subjects: SubjectRelation | SubjectRelation[] | null;
};

type Attendance = Omit<AttendanceRow, "subjects"> & {
  subjects: SubjectRelation | null;
};

type KbmReportRow = {
  id: string;
  student_id: string | null;
  subject_id: string | null;
  report_date: string | null;
  class_level: string | null;
  semester: string | null;
  chapter: string | null;
  material_topic: string | null;
  learning_issue: string | null;
  solution: string | null;
  teacher_note: string | null;
  status: string | null;
  created_at: string | null;
  subjects: SubjectRelation | SubjectRelation[] | null;
};

type KbmReport = Omit<KbmReportRow, "subjects"> & {
  subjects: SubjectRelation | null;
};

type GalleryRow = {
  id: string;
  student_id: string | null;
  title: string;
  caption: string | null;
  image_url: string | null;
  activity_date: string | null;
  status: string | null;
  subjects: SubjectRelation | SubjectRelation[] | null;
};

type GalleryItem = Omit<GalleryRow, "subjects"> & {
  subjects: SubjectRelation | null;
};

type ScheduleRow = {
  id: string;
  student_id: string | null;
  subject_id: string | null;
  day_name: string | null;
  schedule_date: string | null;
  start_time: string | null;
  end_time: string | null;
  session_name: string | null;
  material_topic: string | null;
  subjects: SubjectRelation | SubjectRelation[] | null;
};

type ScheduleItem = Omit<ScheduleRow, "subjects"> & {
  subjects: SubjectRelation | null;
};

type SubjectProgress = {
  name: string;
  score: number;
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

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getLocalMonthLabel(dateString: string | null) {
  if (!dateString) return "-";

  const parsedDate = new Date(dateString);

  return parsedDate.toLocaleDateString("id-ID", {
    month: "short",
  });
}

function isImageUrl(url: string | null) {
  if (!url) return false;

  return (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("/")
  );
}

function getScoreDescription(score: number) {
  if (score >= 90) return "Sangat baik";
  if (score >= 80) return "Baik";
  if (score >= 75) return "Cukup baik";

  return "Perlu pendampingan";
}

export default function ParentDashboardPage() {
  const [parent, setParent] = useState<Parent | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");

  const [academicReports, setAcademicReports] = useState<AcademicReport[]>([]);
  const [attendanceList, setAttendanceList] = useState<Attendance[]>([]);
  const [kbmReports, setKbmReports] = useState<KbmReport[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function fetchActiveParent() {
    const { data, error } = await supabase
      .from("parents")
      .select("id, full_name, email, phone, relation")
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);

    const parentList = data || [];

    const ericParent =
      parentList.find((item) =>
        item.full_name?.toLowerCase().includes("eric")
      ) || null;

    const selectedParent = ericParent || parentList[0] || null;

    setParent(selectedParent);

    return selectedParent;
  }

  async function fetchStudents(parentId: string) {
    const { data, error } = await supabase
      .from("students")
      .select(
        `
        id,
        parent_id,
        homeroom_teacher_id,
        nis,
        nisn,
        full_name,
        level,
        grade,
        academic_year,
        status,
        progress,
        attendance,
        teachers (
          id,
          full_name,
          email
        )
      `
      )
      .eq("parent_id", parentId)
      .order("full_name", { ascending: true });

    if (error) throw new Error(error.message);

    const rows = (data || []) as StudentRow[];

    const normalizedStudents: Student[] = rows.map((item) => ({
      id: item.id,
      parent_id: item.parent_id,
      homeroom_teacher_id: item.homeroom_teacher_id,
      nis: item.nis,
      nisn: item.nisn,
      full_name: item.full_name,
      level: item.level,
      grade: item.grade,
      academic_year: item.academic_year,
      status: item.status,
      progress: item.progress,
      attendance: item.attendance,
      teachers: normalizeRelation(item.teachers),
    }));

    setStudents(normalizedStudents);

    if (normalizedStudents.length > 0) {
      setSelectedStudentId(normalizedStudents[0].id);
      return normalizedStudents[0];
    }

    return null;
  }

  async function fetchStudentData(studentId: string) {
    const [
      academicReportsRes,
      attendanceRes,
      kbmReportsRes,
      galleryRes,
      schedulesRes,
    ] = await Promise.all([
      supabase
        .from("academic_reports")
        .select(
          `
          id,
          student_id,
          subject_id,
          report_period,
          report_type,
          final_score,
          description,
          teacher_comment,
          status,
          created_at,
          subjects (
            id,
            name
          )
        `
        )
        .eq("student_id", studentId)
        .order("created_at", { ascending: false }),

      supabase
        .from("attendance")
        .select(
          `
          id,
          student_id,
          attendance_date,
          attendance_status,
          understanding_status,
          material_topic,
          notes,
          subjects (
            id,
            name
          )
        `
        )
        .eq("student_id", studentId)
        .order("attendance_date", { ascending: false }),

      supabase
        .from("kbm_reports")
        .select(
          `
          id,
          student_id,
          subject_id,
          report_date,
          class_level,
          semester,
          chapter,
          material_topic,
          learning_issue,
          solution,
          teacher_note,
          status,
          created_at,
          subjects (
            id,
            name
          )
        `
        )
        .eq("student_id", studentId)
        .order("report_date", { ascending: false }),

      supabase
        .from("gallery")
        .select(
          `
          id,
          student_id,
          title,
          caption,
          image_url,
          activity_date,
          status,
          subjects (
            id,
            name
          )
        `
        )
        .eq("student_id", studentId)
        .order("activity_date", { ascending: false }),

      supabase
        .from("schedules")
        .select(
          `
          id,
          student_id,
          subject_id,
          day_name,
          schedule_date,
          start_time,
          end_time,
          session_name,
          material_topic,
          subjects (
            id,
            name
          )
        `
        )
        .eq("student_id", studentId)
        .order("schedule_date", { ascending: true }),
    ]);

    const possibleErrors = [
      academicReportsRes.error,
      attendanceRes.error,
      kbmReportsRes.error,
      galleryRes.error,
      schedulesRes.error,
    ].filter(Boolean);

    if (possibleErrors.length > 0) {
      throw new Error(
        possibleErrors[0]?.message || "Gagal mengambil data anak."
      );
    }

    setAcademicReports(
      ((academicReportsRes.data || []) as AcademicReportRow[]).map((item) => ({
        ...item,
        subjects: normalizeRelation(item.subjects),
      }))
    );

    setAttendanceList(
      ((attendanceRes.data || []) as AttendanceRow[]).map((item) => ({
        ...item,
        subjects: normalizeRelation(item.subjects),
      }))
    );

    setKbmReports(
      ((kbmReportsRes.data || []) as KbmReportRow[]).map((item) => ({
        ...item,
        subjects: normalizeRelation(item.subjects),
      }))
    );

    setGallery(
      ((galleryRes.data || []) as GalleryRow[]).map((item) => ({
        ...item,
        subjects: normalizeRelation(item.subjects),
      }))
    );

    setSchedules(
      ((schedulesRes.data || []) as ScheduleRow[]).map((item) => ({
        ...item,
        subjects: normalizeRelation(item.subjects),
      }))
    );
  }

  async function fetchPageData() {
    setLoading(true);
    setErrorMessage("");

    try {
      const activeParent = await fetchActiveParent();

      if (!activeParent) {
        setErrorMessage("Belum ada data parent di table parents.");
        return;
      }

      const firstStudent = await fetchStudents(activeParent.id);

      if (!firstStudent) {
        setErrorMessage("Belum ada murid yang terhubung ke parent ini.");
        return;
      }

      await fetchStudentData(firstStudent.id);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengambil dashboard parent.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleChangeStudent(studentId: string) {
    setSelectedStudentId(studentId);
    setLoading(true);
    setErrorMessage("");

    try {
      await fetchStudentData(studentId);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengganti data anak.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPageData();
  }, []);

  const selectedStudent = students.find(
    (student) => student.id === selectedStudentId
  );

  const subjectProgress = useMemo<SubjectProgress[]>(() => {
    const map = new Map<string, number[]>();

    academicReports.forEach((report) => {
      const subjectName = report.subjects?.name || "Lainnya";
      const score = Number(report.final_score || 0);

      if (score <= 0) return;

      if (!map.has(subjectName)) {
        map.set(subjectName, []);
      }

      map.get(subjectName)?.push(score);
    });

    return Array.from(map.entries()).map(([name, scores]) => {
      const total = scores.reduce((sum, score) => sum + score, 0);
      const average = Math.round(total / scores.length);

      return {
        name,
        score: average,
      };
    });
  }, [academicReports]);

  const averageScore = useMemo(() => {
    const scores = academicReports
      .map((report) => Number(report.final_score || 0))
      .filter((score) => score > 0);

    if (scores.length === 0) return Number(selectedStudent?.progress || 0);

    const total = scores.reduce((sum, score) => sum + score, 0);

    return Math.round(total / scores.length);
  }, [academicReports, selectedStudent]);

  const attendancePercentage = useMemo(() => {
    if (attendanceList.length === 0) {
      return Number(selectedStudent?.attendance || 0);
    }

    const present = attendanceList.filter(
      (item) => item.attendance_status === "Hadir"
    ).length;

    return Math.round((present / attendanceList.length) * 100);
  }, [attendanceList, selectedStudent]);

  const latestReports = useMemo(() => {
    const academic = academicReports.map((report) => ({
      id: `academic-${report.id}`,
      type: "Laporan Akademik",
      title: `${report.subjects?.name || "-"} • Nilai ${
        report.final_score || "-"
      }`,
      date: report.created_at,
      description:
        report.teacher_comment ||
        report.description ||
        getScoreDescription(Number(report.final_score || 0)),
    }));

    const kbm = kbmReports.map((report) => ({
      id: `kbm-${report.id}`,
      type: "Laporan KBM",
      title: `${report.subjects?.name || "-"} • ${
        report.material_topic || "-"
      }`,
      date: report.report_date || report.created_at,
      description: report.teacher_note || report.learning_issue || "-",
    }));

    return [...academic, ...kbm]
      .sort(
        (a, b) =>
          new Date(b.date || "").getTime() - new Date(a.date || "").getTime()
      )
      .slice(0, 4);
  }, [academicReports, kbmReports]);

  const attendanceChart = useMemo(() => {
    const map = new Map<string, { total: number; present: number }>();

    attendanceList.forEach((item) => {
      const month = getLocalMonthLabel(item.attendance_date);

      if (!map.has(month)) {
        map.set(month, { total: 0, present: 0 });
      }

      const current = map.get(month);

      if (!current) return;

      current.total += 1;

      if (item.attendance_status === "Hadir") {
        current.present += 1;
      }
    });

    const data = Array.from(map.entries())
      .map(([month, value]) => ({
        month,
        value:
          value.total > 0 ? Math.round((value.present / value.total) * 100) : 0,
      }))
      .reverse()
      .slice(-6);

    if (data.length > 0) return data;

    return [
      { month: "Jan", value: 94 },
      { month: "Feb", value: 96 },
      { month: "Mar", value: 92 },
      { month: "Apr", value: 95 },
      { month: "Mei", value: 97 },
      { month: "Jun", value: attendancePercentage || 96 },
    ];
  }, [attendanceList, attendancePercentage]);

  const latestGallery = gallery.slice(0, 4);
  const nextSchedules = schedules.slice(0, 4);

  const chartPoints = attendanceChart
    .map((item, index) => {
      const x = 30 + index * 58;
      const y = 150 - (item.value - 80) * 5;

      return `${x},${Math.max(25, Math.min(150, y))}`;
    })
    .join(" ");

  return (
    <ParentLayout
      activeMenu="Dashboard Anak"
      searchPlaceholder="Cari progress anak..."
      parentName={parent?.full_name || "Parent"}
    >
      {errorMessage && (
        <div className="mb-5 rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-[#E8D6C1] bg-white p-10 text-center text-sm shadow-sm">
          Loading dashboard parent...
        </div>
      )}

      {!loading && selectedStudent && (
        <>
          <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#7A1F2B] via-[#4A2633] to-[#0B1F44] p-8 text-white shadow-lg">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr_220px] xl:items-center">
              <div className="flex items-center gap-5">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/30 bg-white/20 text-xl font-bold">
                  {getInitials(selectedStudent.full_name)}
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-white/70">
                    Selamat Datang
                  </p>

                  <h1 className="mt-1 text-4xl font-extrabold">
                    {selectedStudent.full_name}
                  </h1>

                  <p className="mt-2 text-sm font-semibold text-white/80">
                    {selectedStudent.level || "-"} —{" "}
                    {selectedStudent.grade || "-"} •{" "}
                    {selectedStudent.academic_year || "-"}
                  </p>

                  {students.length > 1 && (
                    <select
                      value={selectedStudentId}
                      onChange={(event) =>
                        handleChangeStudent(event.target.value)
                      }
                      className="mt-4 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white outline-none"
                    >
                      {students.map((student) => (
                        <option
                          key={student.id}
                          value={student.id}
                          className="text-[#2B1B18]"
                        >
                          {student.full_name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-white/15 p-5 backdrop-blur">
                  <p className="text-xl">✨</p>
                  <p className="mt-3 text-2xl font-extrabold">
                    {averageScore}%
                  </p>
                  <p className="text-sm text-white/70">Overall Progress</p>
                </div>

                <div className="rounded-2xl bg-white/15 p-5 backdrop-blur">
                  <p className="text-xl">🗓️</p>
                  <p className="mt-3 text-2xl font-extrabold">
                    {attendancePercentage}%
                  </p>
                  <p className="text-sm text-white/70">Attendance</p>
                </div>

                <div className="rounded-2xl bg-white/15 p-5 backdrop-blur">
                  <p className="text-xl">🏅</p>
                  <p className="mt-3 text-xl font-extrabold">
                    {selectedStudent.teachers?.full_name || "-"}
                  </p>
                  <p className="text-sm text-white/70">Guru Pendamping</p>
                </div>
              </div>

              <div className="space-y-3">
                <Link
                  href="/parent/laporan-akademik"
                  className="flex items-center justify-between rounded-2xl bg-white px-5 py-4 text-sm font-bold text-[#7A1F2B] transition hover:bg-[#FFF8EF]"
                >
                  Lihat Detail Report <span>→</span>
                </Link>

                <Link
                  href="/parent/download-report"
                  className="flex items-center justify-center gap-3 rounded-2xl border border-white/30 bg-white/10 px-5 py-4 text-sm font-bold text-white transition hover:bg-white/20"
                >
                  ⇩ Download PDF
                </Link>
              </div>
            </div>
          </section>

          <section className="mt-7 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_430px]">
            <div className="rounded-3xl border border-[#E8D6C1] bg-white p-7 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-extrabold">
                    Ringkasan Progress Belajar
                  </h2>
                  <p className="mt-1 text-sm text-[#6B4A3A]">
                    Berdasarkan nilai akademik terbaru.
                  </p>
                </div>

                <Link
                  href="/parent/analytics"
                  className="text-sm font-bold text-[#7A1F2B]"
                >
                  Lihat analitik →
                </Link>
              </div>

              <div className="mt-7 space-y-6">
                {subjectProgress.length === 0 && (
                  <div className="rounded-2xl bg-[#FFF8EF] p-5 text-sm text-[#6B4A3A]">
                    Belum ada nilai akademik untuk anak ini.
                  </div>
                )}

                {subjectProgress.map((subject) => (
                  <div key={subject.name}>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="font-bold">{subject.name}</p>
                      <p className="font-bold text-[#6B4A3A]">
                        {subject.score}/100
                      </p>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-[#E8CCD0]">
                      <div
                        className="h-full rounded-full bg-[#8C0F2D]"
                        style={{
                          width: `${Math.min(100, subject.score)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-[#E8D6C1] bg-white p-7 shadow-sm">
              <h2 className="text-xl font-extrabold">Attendance Bulan Ini</h2>
              <p className="mt-1 text-sm text-[#6B4A3A]">6 bulan terakhir</p>

              <div className="mt-6 rounded-2xl bg-[#FFF8EF] p-4">
                <svg viewBox="0 0 360 180" className="h-[190px] w-full">
                  <line x1="30" y1="25" x2="30" y2="150" stroke="#E8D6C1" />
                  <line x1="30" y1="150" x2="340" y2="150" stroke="#E8D6C1" />

                  {[100, 95, 90, 85, 80].map((label, index) => {
                    const y = 25 + index * 31;

                    return (
                      <g key={label}>
                        <line
                          x1="30"
                          y1={y}
                          x2="340"
                          y2={y}
                          stroke="#E8D6C1"
                          strokeDasharray="4 4"
                        />
                        <text x="8" y={y + 4} fontSize="10" fill="#6B4A3A">
                          {label}
                        </text>
                      </g>
                    );
                  })}

                  <polyline
                    points={chartPoints}
                    fill="none"
                    stroke="#D96B2B"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {attendanceChart.map((item, index) => {
                    const x = 30 + index * 58;
                    const y = Math.max(
                      25,
                      Math.min(150, 150 - (item.value - 80) * 5)
                    );

                    return (
                      <g key={`${item.month}-${index}`}>
                        <circle cx={x} cy={y} r="4" fill="#D96B2B" />
                        <text x={x - 10} y="170" fontSize="11" fill="#6B4A3A">
                          {item.month}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <p className="text-sm text-[#6B4A3A]">
                  Rata-rata:{" "}
                  <span className="font-extrabold text-[#2B1B18]">
                    {attendancePercentage}%
                  </span>
                </p>

                <p className="text-sm font-bold text-emerald-600">
                  ▲ Data tersinkron
                </p>
              </div>
            </div>
          </section>

          <section className="mt-7 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_430px]">
            <div className="rounded-3xl border border-[#E8D6C1] bg-white p-7 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-extrabold">Report Terbaru</h2>
                <span className="text-xl">📖</span>
              </div>

              <div className="space-y-4">
                {latestReports.length === 0 && (
                  <div className="rounded-2xl bg-[#FFF8EF] p-5 text-sm text-[#6B4A3A]">
                    Belum ada report terbaru.
                  </div>
                )}

                {latestReports.map((report) => (
                  <div
                    key={report.id}
                    className="rounded-2xl border border-[#E8D6C1] bg-[#FFF8EF] p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-[#7A1F2B]">
                          {report.type}
                        </p>

                        <h3 className="mt-1 font-extrabold">{report.title}</h3>

                        <p className="mt-2 text-sm leading-6 text-[#6B4A3A]">
                          {report.description}
                        </p>
                      </div>

                      <p className="shrink-0 text-xs font-bold text-[#6B4A3A]">
                        {formatDate(report.date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-[#E8D6C1] bg-white p-7 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-extrabold">Foto Kegiatan</h2>

                <Link
                  href="/parent/gallery"
                  className="text-sm font-bold text-[#7A1F2B]"
                >
                  Lihat semua →
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {latestGallery.length === 0 && (
                  <div className="col-span-2 rounded-2xl bg-[#FFF8EF] p-5 text-sm text-[#6B4A3A]">
                    Belum ada foto kegiatan.
                  </div>
                )}

                {latestGallery.map((item) => (
                  <div
                    key={item.id}
                    className="overflow-hidden rounded-2xl border border-[#E8D6C1] bg-[#FFF8EF]"
                  >
                    <div className="h-32 bg-[#F1DFD5]">
                      {isImageUrl(item.image_url) ? (
                        <img
                          src={item.image_url || ""}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-3xl">
                          🖼️
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      <p className="text-xs font-bold uppercase text-[#6B4A3A]">
                        {formatDate(item.activity_date)}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm font-bold">
                        {item.title}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-7 rounded-3xl border border-[#E8D6C1] bg-white p-7 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold">Jadwal Belajar Anak</h2>
                <p className="mt-1 text-sm text-[#6B4A3A]">
                  Jadwal yang dibuat Kepala Sekolah dan tersinkron ke parent.
                </p>
              </div>

              <Link
                href="/parent/jadwal"
                className="text-sm font-bold text-[#7A1F2B]"
              >
                Lihat semua →
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {nextSchedules.length === 0 && (
                <div className="rounded-2xl bg-[#FFF8EF] p-5 text-sm text-[#6B4A3A]">
                  Belum ada jadwal.
                </div>
              )}

              {nextSchedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="rounded-2xl border border-[#E8D6C1] bg-[#FFF8EF] p-5"
                >
                  <p className="text-sm font-bold text-[#7A1F2B]">
                    {schedule.day_name || "-"}
                  </p>

                  <h3 className="mt-2 font-extrabold">
                    {schedule.subjects?.name || "-"}
                  </h3>

                  <p className="mt-2 text-sm text-[#6B4A3A]">
                    {schedule.start_time?.slice(0, 5) || "-"} -{" "}
                    {schedule.end_time?.slice(0, 5) || "-"}
                  </p>

                  <p className="mt-2 text-sm text-[#6B4A3A]">
                    {schedule.material_topic || "-"}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </ParentLayout>
  );
}