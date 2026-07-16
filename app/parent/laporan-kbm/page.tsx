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
  teachers: TeacherRelation | null;
};

type SubjectRelation = {
  id: string;
  name: string;
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

type AttendanceRow = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  attendance_date: string | null;
  attendance_status: string | null;
  start_time: string | null;
  end_time: string | null;
  material_topic: string | null;
  subjects: SubjectRelation | SubjectRelation[] | null;
};

type AttendanceItem = Omit<AttendanceRow, "subjects"> & {
  subjects: SubjectRelation | null;
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

function formatTime(time: string | null) {
  if (!time) return "-";
  return time.slice(0, 5);
}

function getChapterLabel(chapter: string | null) {
  if (!chapter) return "-";

  const lower = chapter.toLowerCase();

  if (lower.includes("bab")) return chapter;

  return `Bab ${chapter}`;
}

function getStatusBadge(status: string | null) {
  if (status === "published") return "bg-emerald-100 text-emerald-700";
  if (status === "approved") return "bg-blue-100 text-blue-700";
  if (status === "pending_review") return "bg-yellow-100 text-yellow-700";
  if (status === "revision") return "bg-red-100 text-red-700";

  return "bg-slate-200 text-slate-700";
}

function getStatusLabel(status: string | null) {
  if (status === "published") return "Published";
  if (status === "approved") return "Approved";
  if (status === "pending_review") return "Pending Review";
  if (status === "revision") return "Revision";

  return "Draft";
}

export default function ParentLaporanKbmPage() {
  const [parent, setParent] = useState<Parent | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");

  const [reports, setReports] = useState<KbmReport[]>([]);
  const [attendanceList, setAttendanceList] = useState<AttendanceItem[]>([]);

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
      teachers: normalizeRelation(item.teachers),
    }));

    setStudents(normalizedStudents);

    if (normalizedStudents.length > 0) {
      setSelectedStudentId(normalizedStudents[0].id);
      return normalizedStudents[0];
    }

    return null;
  }

  async function fetchReports(studentId: string) {
    const [kbmRes, attendanceRes] = await Promise.all([
      supabase
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
        .order("report_date", { ascending: false })
        .order("created_at", { ascending: false }),

      supabase
        .from("attendance")
        .select(
          `
          id,
          student_id,
          teacher_id,
          subject_id,
          attendance_date,
          attendance_status,
          start_time,
          end_time,
          material_topic,
          subjects (
            id,
            name
          )
        `
        )
        .eq("student_id", studentId)
        .order("attendance_date", { ascending: false }),
    ]);

    if (kbmRes.error) throw new Error(kbmRes.error.message);
    if (attendanceRes.error) throw new Error(attendanceRes.error.message);

    setReports(
      ((kbmRes.data || []) as KbmReportRow[]).map((item) => ({
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

      await fetchReports(firstStudent.id);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengambil laporan KBM.");
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
      await fetchReports(studentId);
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

  const attendanceByDateAndSubject = useMemo(() => {
    const map = new Map<string, AttendanceItem[]>();

    attendanceList.forEach((attendance) => {
      const key = `${attendance.attendance_date || ""}-${
        attendance.subject_id || ""
      }`;

      if (!map.has(key)) {
        map.set(key, []);
      }

      map.get(key)?.push(attendance);
    });

    return map;
  }, [attendanceList]);

  function getAttendanceSummary(report: KbmReport) {
    const key = `${report.report_date || ""}-${report.subject_id || ""}`;
    const relatedAttendance = attendanceByDateAndSubject.get(key) || [];

    if (relatedAttendance.length === 0) {
      const byDate = attendanceList.filter(
        (item) => item.attendance_date === report.report_date
      );

      if (byDate.length === 0) return "-";

      const present = byDate.filter(
        (item) => item.attendance_status === "Hadir"
      ).length;

      return `${present}/${byDate.length} hadir`;
    }

    const present = relatedAttendance.filter(
      (item) => item.attendance_status === "Hadir"
    ).length;

    return `${present}/${relatedAttendance.length} hadir`;
  }

  function getReportTime(report: KbmReport) {
    const key = `${report.report_date || ""}-${report.subject_id || ""}`;
    const relatedAttendance = attendanceByDateAndSubject.get(key)?.[0];

    if (relatedAttendance) {
      return `${formatTime(relatedAttendance.start_time)}-${formatTime(
        relatedAttendance.end_time
      )}`;
    }

    const byDate = attendanceList.find(
      (item) => item.attendance_date === report.report_date
    );

    if (byDate) {
      return `${formatTime(byDate.start_time)}-${formatTime(byDate.end_time)}`;
    }

    return "-";
  }

  const totalPublished = reports.filter(
    (item) => item.status === "published"
  ).length;

  const totalPending = reports.filter(
    (item) => item.status === "pending_review"
  ).length;

  const totalSubjects = useMemo(() => {
    const subjectIds = reports
      .map((report) => report.subject_id)
      .filter(Boolean) as string[];

    return new Set(subjectIds).size;
  }, [reports]);

  return (
    <ParentLayout
      activeMenu="Laporan KBM"
      searchPlaceholder="Cari laporan KBM..."
      parentName={parent?.full_name || "Parent"}
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-[28px] font-extrabold tracking-tight">
              Laporan KBM
            </h1>

            <p className="mt-1 text-base text-[#6B4A3A]">
              Ringkasan sesi belajar {selectedStudent?.full_name || "anak"}
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
            Loading laporan KBM...
          </div>
        )}

        {!loading && (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-[#6B4A3A]">
                  Total Laporan
                </p>
                <p className="mt-2 text-3xl font-extrabold">
                  {reports.length}
                </p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-[#6B4A3A]">
                  Published
                </p>
                <p className="mt-2 text-3xl font-extrabold text-emerald-700">
                  {totalPublished}
                </p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-[#6B4A3A]">
                  Pending
                </p>
                <p className="mt-2 text-3xl font-extrabold text-yellow-700">
                  {totalPending}
                </p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-[#6B4A3A]">
                  Mata Pelajaran
                </p>
                <p className="mt-2 text-3xl font-extrabold">
                  {totalSubjects}
                </p>
              </div>
            </div>

            {reports.length === 0 && (
              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-10 text-center text-sm text-[#6B4A3A] shadow-sm">
                Belum ada laporan KBM untuk anak ini.
              </div>
            )}

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-extrabold">
                        {report.subjects?.name || "-"}
                      </h2>

                      <p className="mt-2 text-sm font-semibold text-[#6B4A3A]">
                        {formatDate(report.report_date)} • {getReportTime(report)}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span className="rounded-full border border-[#D96B2B] bg-[#FFF8EF] px-4 py-1 text-xs font-extrabold text-[#D96B2B]">
                        {getChapterLabel(report.chapter)}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusBadge(
                          report.status
                        )}`}
                      >
                        {getStatusLabel(report.status)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 space-y-0">
                    <ReportRow
                      label="Materi"
                      value={report.material_topic || "-"}
                    />

                    <ReportRow
                      label="Masalah"
                      value={report.learning_issue || "-"}
                    />

                    <ReportRow label="Solusi" value={report.solution || "-"} />

                    <ReportRow
                      label="Kehadiran"
                      value={getAttendanceSummary(report)}
                    />
                  </div>

                  <div className="mt-5 rounded-2xl bg-[#FFF8EF] p-5">
                    <p className="text-sm font-extrabold">Catatan Guru</p>

                    <p className="mt-2 text-sm leading-6 text-[#6B4A3A]">
                      {report.teacher_note || "-"}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
              <h2 className="text-lg font-extrabold">Keterangan</h2>

              <p className="mt-3 text-sm leading-6 text-[#6B4A3A]">
                Data Laporan KBM ini otomatis mengambil dari table{" "}
                <span className="font-bold text-[#2B1B18]">kbm_reports</span>.
                Setiap laporan yang dibuat oleh guru untuk murid akan tampil di
                halaman parent sesuai anak yang terhubung.
              </p>
            </div>
          </>
        )}
      </div>
    </ParentLayout>
  );
}

function ReportRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[150px_1fr] border-b border-dashed border-[#E8D6C1] py-3 text-sm last:border-b-0">
      <p className="text-[#6B4A3A]">{label}</p>

      <p className="text-right font-bold text-[#2B1B18]">{value}</p>
    </div>
  );
}