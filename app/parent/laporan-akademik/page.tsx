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

function normalizeRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function getDescription(score: number | null, description: string | null) {
  if (description) return description;

  const finalScore = Number(score || 0);

  if (finalScore >= 90) return "Sangat Baik";
  if (finalScore >= 80) return "Baik";
  if (finalScore >= 75) return "Cukup";

  return "Perlu Pendampingan";
}

function getBadgeClass(value: string) {
  const text = value.toLowerCase();

  if (text.includes("sangat")) {
    return "bg-emerald-100 text-emerald-800";
  }

  if (text.includes("baik")) {
    return "bg-green-100 text-green-800";
  }

  if (text.includes("cukup")) {
    return "bg-yellow-100 text-yellow-800";
  }

  return "bg-red-100 text-red-800";
}

export default function ParentLaporanAkademikPage() {
  const [parent, setParent] = useState<Parent | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [reports, setReports] = useState<AcademicReport[]>([]);

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
    const { data, error } = await supabase
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
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const rows = (data || []) as AcademicReportRow[];

    const normalizedReports: AcademicReport[] = rows.map((item) => ({
      id: item.id,
      student_id: item.student_id,
      subject_id: item.subject_id,
      report_period: item.report_period,
      report_type: item.report_type,
      uh_score: item.uh_score,
      task_score: item.task_score,
      uts_score: item.uts_score,
      uas_score: item.uas_score,
      process_score: item.process_score,
      final_score: item.final_score,
      description: item.description,
      teacher_comment: item.teacher_comment,
      status: item.status,
      created_at: item.created_at,
      subjects: normalizeRelation(item.subjects),
    }));

    setReports(normalizedReports);
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
        setErrorMessage("Gagal mengambil laporan akademik.");
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

  const reportPeriod = useMemo(() => {
    return reports[0]?.report_period || "Semester Genap 2025/2026";
  }, [reports]);

  const averageScore = useMemo(() => {
    const scores = reports
      .map((report) => Number(report.final_score || 0))
      .filter((score) => score > 0);

    if (scores.length === 0) return 0;

    const total = scores.reduce((sum, score) => sum + score, 0);

    return Math.round(total / scores.length);
  }, [reports]);

  const publishedCount = reports.filter(
    (report) => report.status === "published" || report.status === "approved"
  ).length;

  return (
    <ParentLayout
      activeMenu="Laporan Akademik"
      searchPlaceholder="Cari laporan akademik..."
      parentName={parent?.full_name || "Parent"}
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-[28px] font-extrabold tracking-tight">
              Laporan Akademik
            </h1>

            <p className="mt-1 text-base text-[#6B4A3A]">
              Rekap nilai {selectedStudent?.full_name || "anak"} —{" "}
              {reportPeriod}
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
            Loading laporan akademik...
          </div>
        )}

        {!loading && (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-[#6B4A3A]">
                  Total Laporan
                </p>
                <p className="mt-2 text-3xl font-extrabold">{reports.length}</p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-[#6B4A3A]">
                  Rata-rata Nilai
                </p>
                <p className="mt-2 text-3xl font-extrabold text-[#8C0F2D]">
                  {averageScore || "-"}
                </p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-[#6B4A3A]">
                  Published
                </p>
                <p className="mt-2 text-3xl font-extrabold text-emerald-700">
                  {publishedCount}
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#E8D6C1] bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-left">
                  <thead className="border-b border-[#E8D6C1] bg-white text-sm font-extrabold text-[#6B4A3A]">
                    <tr>
                      <th className="px-4 py-4">Mata Pelajaran</th>
                      <th className="px-4 py-4">UH</th>
                      <th className="px-4 py-4">Tugas</th>
                      <th className="px-4 py-4">UTS</th>
                      <th className="px-4 py-4">UAS</th>
                      <th className="px-4 py-4">Proses KBM</th>
                      <th className="px-4 py-4">Total</th>
                      <th className="px-4 py-4">Ket.</th>
                      <th className="px-4 py-4">Komentar Guru</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#E8D6C1] text-[15px]">
                    {reports.length === 0 && (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-4 py-10 text-center text-sm text-[#6B4A3A]"
                        >
                          Belum ada data laporan akademik untuk anak ini.
                        </td>
                      </tr>
                    )}

                    {reports.map((report) => {
                      const description = getDescription(
                        report.final_score,
                        report.description
                      );

                      return (
                        <tr key={report.id} className="hover:bg-[#FFF8EF]">
                          <td className="px-4 py-4 font-semibold">
                            {report.subjects?.name || "-"}
                          </td>

                          <td className="px-4 py-4">{report.uh_score ?? "-"}</td>

                          <td className="px-4 py-4">
                            {report.task_score ?? "-"}
                          </td>

                          <td className="px-4 py-4">
                            {report.uts_score ?? "-"}
                          </td>

                          <td className="px-4 py-4">
                            {report.uas_score ?? "-"}
                          </td>

                          <td className="px-4 py-4">
                            {report.process_score ?? "-"}
                          </td>

                          <td className="px-4 py-4 font-extrabold text-[#8C0F2D]">
                            {report.final_score ?? "-"}
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`rounded-full px-4 py-1.5 text-xs font-extrabold ${getBadgeClass(
                                description
                              )}`}
                            >
                              {description}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-[#6B4A3A]">
                            {report.teacher_comment || "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
              <h2 className="text-lg font-extrabold">Keterangan</h2>

              <p className="mt-3 text-sm leading-6 text-[#6B4A3A]">
                Data Laporan Akademik ini otomatis mengambil dari table{" "}
                <span className="font-bold text-[#2B1B18]">
                  academic_reports
                </span>
                . Nilai yang diinput oleh guru akan langsung tampil di halaman
                parent sesuai anak yang terhubung.
              </p>
            </div>
          </>
        )}
      </div>
    </ParentLayout>
  );
}