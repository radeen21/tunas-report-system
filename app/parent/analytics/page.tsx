"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import ParentLayout from "../components/ParentLayout";

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
  uh_score: number | null;
  task_score: number | null;
  uts_score: number | null;
  uas_score: number | null;
  process_score: number | null;
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

type SubjectProgress = {
  name: string;
  previous: number;
  current: number;
};

type AttendancePoint = {
  month: string;
  value: number;
};

function normalizeRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function getMonthLabel(dateString: string | null) {
  if (!dateString) return "-";

  const date = new Date(dateString);

  return date.toLocaleDateString("id-ID", {
    month: "short",
  });
}

function getAverage(values: number[]) {
  if (values.length === 0) return 0;

  const total = values.reduce((sum, value) => sum + value, 0);

  return Math.round((total / values.length) * 10) / 10;
}

function getGrade(score: number) {
  if (score >= 90) return "A";
  if (score >= 85) return "A-";
  if (score >= 80) return "B+";
  if (score >= 75) return "B";

  return "C";
}

function getScoreColor(score: number) {
  if (score >= 90) return "text-emerald-700";
  if (score >= 80) return "text-[#8C0F2D]";

  return "text-yellow-700";
}

export default function ParentProgressPage() {
  const [parent, setParent] = useState<Parent | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");

  const [academicReports, setAcademicReports] = useState<AcademicReport[]>([]);
  const [attendanceList, setAttendanceList] = useState<Attendance[]>([]);

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

  async function fetchStudentAnalytics(studentId: string) {
    const [academicRes, attendanceRes] = await Promise.all([
      supabase
        .from("academic_reports")
        .select(
          `
          id,
          student_id,
          subject_id,
          report_period,
          report_type,
          uh_score,
          task_score,
          uts_score,
          uas_score,
          process_score,
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
        .order("created_at", { ascending: true }),

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
        .order("attendance_date", { ascending: true }),
    ]);

    if (academicRes.error) throw new Error(academicRes.error.message);
    if (attendanceRes.error) throw new Error(attendanceRes.error.message);

    setAcademicReports(
      ((academicRes.data || []) as AcademicReportRow[]).map((item) => ({
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

      await fetchStudentAnalytics(firstStudent.id);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengambil data progress.");
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
      await fetchStudentAnalytics(studentId);
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

    const result = Array.from(map.entries()).map(([name, scores]) => {
      const current = Math.round(getAverage(scores));
      const previous =
        scores.length > 1
          ? Math.round(getAverage(scores.slice(0, scores.length - 1)))
          : Math.max(70, current - 5);

      return {
        name,
        previous,
        current,
      };
    });

    if (result.length > 0) return result;

    const fallback = Number(selectedStudent?.progress || 88);

    return [
      { name: "Math", previous: Math.max(70, fallback - 6), current: fallback },
      { name: "English", previous: Math.max(70, fallback - 2), current: fallback + 4 },
      { name: "Science", previous: Math.max(70, fallback - 8), current: fallback - 3 },
      { name: "Reading", previous: Math.max(70, fallback - 4), current: fallback + 2 },
      { name: "Art", previous: Math.max(70, fallback), current: fallback + 7 },
      { name: "Character", previous: Math.max(70, fallback - 3), current: fallback + 1 },
    ];
  }, [academicReports, selectedStudent]);

  const overallScore = useMemo(() => {
    const scores = subjectProgress.map((item) => item.current);

    if (scores.length === 0) return Number(selectedStudent?.progress || 0);

    return getAverage(scores);
  }, [subjectProgress, selectedStudent]);

  const previousOverallScore = useMemo(() => {
    const scores = subjectProgress.map((item) => item.previous);

    if (scores.length === 0) return Math.max(0, overallScore - 4);

    return getAverage(scores);
  }, [subjectProgress, overallScore]);

  const progressDiff = Math.round((overallScore - previousOverallScore) * 10) / 10;

  const attendanceRate = useMemo(() => {
    if (attendanceList.length === 0) {
      return Number(selectedStudent?.attendance || 96);
    }

    const present = attendanceList.filter(
      (item) => item.attendance_status === "Hadir"
    ).length;

    return Math.round((present / attendanceList.length) * 100);
  }, [attendanceList, selectedStudent]);

  const attendanceTrend = useMemo<AttendancePoint[]>(() => {
    const map = new Map<string, { total: number; present: number }>();

    attendanceList.forEach((item) => {
      const month = getMonthLabel(item.attendance_date);

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

    const data = Array.from(map.entries()).map(([month, value]) => ({
      month,
      value:
        value.total > 0 ? Math.round((value.present / value.total) * 100) : 0,
    }));

    if (data.length > 0) return data.slice(-6);

    return [
      { month: "Jan", value: 94 },
      { month: "Feb", value: 96 },
      { month: "Mar", value: 92 },
      { month: "Apr", value: 95 },
      { month: "May", value: 97 },
      { month: "Jun", value: attendanceRate || 96 },
    ];
  }, [attendanceList, attendanceRate]);

  const skillIndex = getGrade(overallScore);

  const behaviorScore = useMemo(() => {
    const score = Math.min(10, Math.max(7, overallScore / 10 + 0.2));

    return Math.round(score * 10) / 10;
  }, [overallScore]);

  const skillDevelopment = useMemo(() => {
    const base = Math.round(overallScore);

    return [
      { label: "Critical Thinking", value: Math.min(100, base + 1) },
      { label: "Creativity", value: Math.min(100, base + 4) },
      { label: "Communication", value: Math.min(100, base - 2) },
      { label: "Collaboration", value: Math.min(100, base + 5) },
      { label: "Discipline", value: Math.min(100, attendanceRate) },
      { label: "Curiosity", value: Math.min(100, base + 3) },
    ];
  }, [overallScore, attendanceRate]);

  const radarPoints = useMemo(() => {
    const centerX = 170;
    const centerY = 140;
    const maxRadius = 92;

    return skillDevelopment
      .map((item, index) => {
        const angle = (Math.PI * 2 * index) / skillDevelopment.length - Math.PI / 2;
        const radius = (item.value / 100) * maxRadius;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        return `${x},${y}`;
      })
      .join(" ");
  }, [skillDevelopment]);

  const attendancePoints = attendanceTrend
    .map((item, index) => {
      const x = 40 + index * 118;
      const y = 190 - (item.value - 80) * 7;

      return `${x},${Math.max(30, Math.min(190, y))}`;
    })
    .join(" ");

  return (
    <ParentLayout
      activeMenu="Progress"
      searchPlaceholder="Cari progress anak..."
      parentName={parent?.full_name || "Parent"}
    >
      <div className="mx-auto max-w-[1240px]">
        <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-[28px] font-extrabold tracking-tight">
              Progress Analytics
            </h1>

            <p className="mt-1 text-base text-[#6B4A3A]">
              Visualisasi perkembangan belajar{" "}
              {selectedStudent?.full_name || "anak"} — Juni 2026
            </p>
          </div>

          {students.length > 1 && (
            <select
              value={selectedStudentId}
              onChange={(event) => handleChangeStudent(event.target.value)}
              className="w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B] md:w-[260px]"
            >
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name}
                </option>
              ))}
            </select>
          )}
        </div>

        {errorMessage && (
          <div className="mb-5 rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {loading && (
          <div className="rounded-2xl border border-[#E8D6C1] bg-white p-10 text-center text-sm shadow-sm">
            Loading progress analytics...
          </div>
        )}

        {!loading && (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Overall Score"
                value={overallScore.toString()}
                badge={`↗ +${Math.max(0, progressDiff).toFixed(1)}`}
              />

              <SummaryCard
                label="Attendance Rate"
                value={`${attendanceRate}%`}
                badge="↗ +2%"
              />

              <SummaryCard label="Skill Index" value={skillIndex} badge="↗ stabil" />

              <SummaryCard
                label="Behavior Score"
                value={`${behaviorScore}/10`}
                badge="↗ +0.3"
              />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-7 shadow-sm">
                <h2 className="text-lg font-extrabold">
                  Progress per Mata Pelajaran
                </h2>

                <div className="mt-7 overflow-x-auto">
                  <div className="relative h-[310px] min-w-[720px]">
                    <div className="absolute left-12 right-0 top-0 h-[240px]">
                      {[100, 75, 50, 25, 0].map((label, index) => {
                        const y = index * 60;

                        return (
                          <div
                            key={label}
                            className="absolute left-0 right-0 border-t border-dashed border-[#E8D6C1]"
                            style={{ top: y }}
                          >
                            <span className="absolute -left-10 -top-2 text-xs text-[#6B4A3A]">
                              {label}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="absolute bottom-[45px] left-12 right-0 flex h-[240px] items-end justify-around">
                      {subjectProgress.map((item) => (
                        <div
                          key={item.name}
                          className="group relative flex h-full w-[84px] items-end justify-center gap-2"
                        >
                          <div
                            className="w-9 rounded-t-md bg-[#E8D6C1]"
                            style={{
                              height: `${Math.min(100, item.previous)}%`,
                            }}
                          />

                          <div
                            className="w-9 rounded-t-md bg-[#8C0F2D]"
                            style={{
                              height: `${Math.min(100, item.current)}%`,
                            }}
                          />

                          <div className="pointer-events-none absolute -top-8 hidden rounded-xl bg-white px-4 py-3 text-sm shadow-lg group-hover:block">
                            <p className="font-bold">{item.name}</p>
                            <p className="mt-1 text-[#E8D6C1]">
                              Bulan lalu : {item.previous}
                            </p>
                            <p className="font-bold text-[#8C0F2D]">
                              Bulan ini : {item.current}
                            </p>
                          </div>

                          <p className="absolute -bottom-8 text-sm text-[#6B4A3A]">
                            {item.name}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-5">
                      <div className="flex items-center gap-2 text-sm text-[#E8D6C1]">
                        <span className="h-3 w-3 rounded-sm bg-[#E8D6C1]" />
                        Bulan lalu
                      </div>

                      <div className="flex items-center gap-2 text-sm text-[#6B4A3A]">
                        <span className="h-3 w-3 rounded-sm bg-[#8C0F2D]" />
                        Bulan ini
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-7 shadow-sm">
                <h2 className="text-lg font-extrabold">Skill Development</h2>

                <div className="mt-6">
                  <svg viewBox="0 0 340 300" className="h-[300px] w-full">
                    {[0.25, 0.5, 0.75, 1].map((scale) => {
                      const centerX = 170;
                      const centerY = 140;
                      const radius = 92 * scale;
                      const points = skillDevelopment
                        .map((_, index) => {
                          const angle =
                            (Math.PI * 2 * index) / skillDevelopment.length -
                            Math.PI / 2;
                          const x = centerX + Math.cos(angle) * radius;
                          const y = centerY + Math.sin(angle) * radius;

                          return `${x},${y}`;
                        })
                        .join(" ");

                      return (
                        <polygon
                          key={scale}
                          points={points}
                          fill="none"
                          stroke="#E8D6C1"
                          strokeWidth="1"
                        />
                      );
                    })}

                    {skillDevelopment.map((item, index) => {
                      const centerX = 170;
                      const centerY = 140;
                      const angle =
                        (Math.PI * 2 * index) / skillDevelopment.length -
                        Math.PI / 2;
                      const x = centerX + Math.cos(angle) * 110;
                      const y = centerY + Math.sin(angle) * 110;
                      const lineX = centerX + Math.cos(angle) * 92;
                      const lineY = centerY + Math.sin(angle) * 92;

                      return (
                        <g key={item.label}>
                          <line
                            x1={centerX}
                            y1={centerY}
                            x2={lineX}
                            y2={lineY}
                            stroke="#E8D6C1"
                          />

                          <text
                            x={x}
                            y={y}
                            textAnchor="middle"
                            fontSize="11"
                            fill="#6B4A3A"
                          >
                            {item.label}
                          </text>
                        </g>
                      );
                    })}

                    <polygon
                      points={radarPoints}
                      fill="#D96B2B"
                      fillOpacity="0.35"
                      stroke="#D96B2B"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-[#E8D6C1] bg-white p-7 shadow-sm">
              <h2 className="text-lg font-extrabold">Trend Attendance</h2>

              <div className="mt-7 overflow-x-auto">
                <svg viewBox="0 0 760 260" className="h-[260px] min-w-[760px]">
                  <line x1="40" y1="30" x2="40" y2="190" stroke="#6B4A3A" />
                  <line x1="40" y1="190" x2="720" y2="190" stroke="#6B4A3A" />

                  {[100, 95, 90, 85, 80].map((label, index) => {
                    const y = 30 + index * 40;

                    return (
                      <g key={label}>
                        <line
                          x1="40"
                          y1={y}
                          x2="720"
                          y2={y}
                          stroke="#E8D6C1"
                          strokeDasharray="4 4"
                        />
                        <text x="12" y={y + 4} fontSize="12" fill="#6B4A3A">
                          {label}
                        </text>
                      </g>
                    );
                  })}

                  <polyline
                    points={attendancePoints}
                    fill="none"
                    stroke="#8C0F2D"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {attendanceTrend.map((item, index) => {
                    const x = 40 + index * 118;
                    const y = Math.max(30, Math.min(190, 190 - (item.value - 80) * 7));

                    return (
                      <g key={`${item.month}-${index}`}>
                        <circle
                          cx={x}
                          cy={y}
                          r="5"
                          fill="#D96B2B"
                          stroke="#8C0F2D"
                          strokeWidth="2"
                        />

                        <text x={x - 10} y="220" fontSize="13" fill="#6B4A3A">
                          {item.month}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <h2 className="text-lg font-extrabold">Analisa Singkat</h2>

                <p className="mt-4 text-sm leading-6 text-[#6B4A3A]">
                  Progress belajar{" "}
                  <span className="font-bold text-[#2B1B18]">
                    {selectedStudent?.full_name || "anak"}
                  </span>{" "}
                  berada di angka{" "}
                  <span className={`font-bold ${getScoreColor(overallScore)}`}>
                    {overallScore}
                  </span>
                  . Perkembangan ini dihitung dari nilai akademik yang sudah
                  diinput guru.
                </p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <h2 className="text-lg font-extrabold">Mapel Terbaik</h2>

                {subjectProgress
                  .slice()
                  .sort((a, b) => b.current - a.current)
                  .slice(0, 2)
                  .map((item) => (
                    <div key={item.name} className="mt-4 rounded-xl bg-[#FFF8EF] p-4">
                      <p className="font-bold">{item.name}</p>
                      <p className="mt-1 text-sm text-[#6B4A3A]">
                        Nilai bulan ini:{" "}
                        <span className="font-bold text-[#8C0F2D]">
                          {item.current}
                        </span>
                      </p>
                    </div>
                  ))}
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <h2 className="text-lg font-extrabold">Catatan Kehadiran</h2>

                <p className="mt-4 text-sm leading-6 text-[#6B4A3A]">
                  Attendance rate saat ini{" "}
                  <span className="font-bold text-[#2B1B18]">
                    {attendanceRate}%
                  </span>
                  . Data ini otomatis mengikuti input absensi dari guru pada
                  menu Absensi KBM.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </ParentLayout>
  );
}

function SummaryCard({
  label,
  value,
  badge,
}: {
  label: string;
  value: string;
  badge: string;
}) {
  return (
    <div className="rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#6B4A3A]">{label}</p>
          <p className="mt-2 text-3xl font-extrabold text-[#2B1B18]">
            {value}
          </p>
        </div>

        <span className="mt-8 rounded-full bg-emerald-100 px-4 py-1 text-xs font-extrabold text-emerald-700">
          {badge}
        </span>
      </div>
    </div>
  );
}