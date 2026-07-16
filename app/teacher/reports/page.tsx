"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import TeacherLayout from "../components/TeacherLayout";

type Teacher = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  teacher_code: string | null;
  subjects: string[] | null;
};

type Student = {
  id: string;
  full_name: string;
  nis: string | null;
  nisn: string | null;
  level: string | null;
  grade: string | null;
  homeroom_teacher_id: string | null;
};

type Subject = {
  id: string;
  name: string;
  level: string | null;
  grade: string | null;
};

type StudentRelation = {
  id: string;
  full_name: string;
  grade: string | null;
  level: string | null;
  nis: string | null;
  nisn: string | null;
};

type SubjectRelation = {
  id: string;
  name: string;
  level: string | null;
  grade: string | null;
};

type AcademicReportRow = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
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
  students: StudentRelation | StudentRelation[] | null;
  subjects: SubjectRelation | SubjectRelation[] | null;
};

type AcademicReport = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
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
  students: StudentRelation | null;
  subjects: SubjectRelation | null;
};

type AcademicForm = {
  student_id: string;
  subject_id: string;
  report_period: string;
  report_type: string;
  uh_score: string;
  task_score: string;
  uts_score: string;
  uas_score: string;
  process_score: string;
  final_score: string;
  description: string;
  teacher_comment: string;
  status: string;
};

const initialForm: AcademicForm = {
  student_id: "",
  subject_id: "",
  report_period: "",
  report_type: "monthly",
  uh_score: "",
  task_score: "",
  uts_score: "",
  uas_score: "",
  process_score: "",
  final_score: "",
  description: "",
  teacher_comment: "",
  status: "draft",
};

function normalizeRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function toNumber(value: string) {
  if (!value.trim()) return null;

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) return null;

  return numberValue;
}

function calculateFinalScore(form: AcademicForm) {
  const uh = Number(form.uh_score || 0);
  const task = Number(form.task_score || 0);
  const uts = Number(form.uts_score || 0);
  const uas = Number(form.uas_score || 0);
  const process = Number(form.process_score || 0);

  const values = [uh, task, uts, uas, process].filter((value) => value > 0);

  if (values.length === 0) return "";

  const total = values.reduce((sum, value) => sum + value, 0);
  const average = Math.round(total / values.length);

  return String(average);
}

function getScoreDescription(score: number | null) {
  if (score === null) return "-";
  if (score >= 90) return "Istimewa";
  if (score >= 85) return "Sangat Baik";
  if (score >= 80) return "Baik";
  if (score >= 75) return "Cukup";

  return "Perlu Penguatan";
}

function getDescriptionBadge(description: string | null) {
  if (description === "Istimewa") return "bg-purple-100 text-purple-700";
  if (description === "Sangat Baik") return "bg-emerald-100 text-emerald-700";
  if (description === "Baik") return "bg-blue-100 text-blue-700";
  if (description === "Cukup") return "bg-yellow-100 text-yellow-700";

  return "bg-red-100 text-red-700";
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

export default function TeacherAcademicReportsPage() {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [reports, setReports] = useState<AcademicReport[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [studentFilter, setStudentFilter] = useState("Semua Murid");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<AcademicForm>(initialForm);

  async function fetchActiveTeacher() {
    const { data, error } = await supabase
      .from("teachers")
      .select("id, full_name, email, phone, teacher_code, subjects")
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);

    const teacherList = data || [];

    const sarahTeacher =
      teacherList.find((item) =>
        item.full_name?.toLowerCase().includes("sarah")
      ) || null;

    const selectedTeacher = sarahTeacher || teacherList[0] || null;

    setTeacher(selectedTeacher);

    return selectedTeacher;
  }

  async function fetchStudents(teacherId: string) {
    const { data, error } = await supabase
      .from("students")
      .select("id, full_name, nis, nisn, level, grade, homeroom_teacher_id")
      .eq("homeroom_teacher_id", teacherId)
      .order("full_name", { ascending: true });

    if (error) throw new Error(error.message);

    setStudents(data || []);
  }

  async function fetchSubjects() {
    const { data, error } = await supabase
      .from("subjects")
      .select("id, name, level, grade")
      .order("name", { ascending: true });

    if (error) throw new Error(error.message);

    setSubjects(data || []);
  }

  async function fetchReports(teacherId: string) {
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
        students (
          id,
          full_name,
          grade,
          level,
          nis,
          nisn
        ),
        subjects (
          id,
          name,
          level,
          grade
        )
      `
      )
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const rows = (data || []) as AcademicReportRow[];

    const normalizedReports: AcademicReport[] = rows.map((item) => ({
      id: item.id,
      student_id: item.student_id,
      teacher_id: item.teacher_id,
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
      students: normalizeRelation(item.students),
      subjects: normalizeRelation(item.subjects),
    }));

    setReports(normalizedReports);
  }

  async function fetchPageData() {
    setLoading(true);
    setErrorMessage("");

    try {
      const activeTeacher = await fetchActiveTeacher();

      if (!activeTeacher) {
        setErrorMessage("Belum ada data guru di table teachers.");
        setLoading(false);
        return;
      }

      await Promise.all([
        fetchStudents(activeTeacher.id),
        fetchSubjects(),
        fetchReports(activeTeacher.id),
      ]);
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

  useEffect(() => {
    fetchPageData();
  }, []);

  const filteredReports = useMemo(() => {
    const keyword = search.toLowerCase();

    return reports.filter((report) => {
      const description =
        report.description || getScoreDescription(report.final_score);

      const matchSearch =
        report.students?.full_name?.toLowerCase().includes(keyword) ||
        report.students?.nisn?.toLowerCase().includes(keyword) ||
        report.students?.grade?.toLowerCase().includes(keyword) ||
        report.subjects?.name?.toLowerCase().includes(keyword) ||
        report.report_period?.toLowerCase().includes(keyword) ||
        description.toLowerCase().includes(keyword) ||
        report.teacher_comment?.toLowerCase().includes(keyword);

      const matchStatus =
        statusFilter === "Semua Status" || report.status === statusFilter;

      const matchStudent =
        studentFilter === "Semua Murid" || report.student_id === studentFilter;

      return matchSearch && matchStatus && matchStudent;
    });
  }, [reports, search, statusFilter, studentFilter]);

  const draftCount = reports.filter((report) => report.status === "draft").length;

  const reviewCount = reports.filter(
    (report) => report.status === "pending_review"
  ).length;

  const publishedCount = reports.filter(
    (report) => report.status === "published"
  ).length;

  const averageScore = useMemo(() => {
    const scores = reports
      .map((report) => Number(report.final_score || 0))
      .filter((score) => score > 0);

    if (scores.length === 0) return 0;

    const total = scores.reduce((sum, score) => sum + score, 0);

    return Math.round(total / scores.length);
  }, [reports]);

  const subjectPerformance = useMemo(() => {
    const subjectMap = new Map<string, number[]>();

    reports.forEach((report) => {
      const subjectName = report.subjects?.name || "Lainnya";
      const score = Number(report.final_score || 0);

      if (score <= 0) return;

      if (!subjectMap.has(subjectName)) {
        subjectMap.set(subjectName, []);
      }

      subjectMap.get(subjectName)?.push(score);
    });

    return Array.from(subjectMap.entries())
      .map(([name, scores]) => {
        const total = scores.reduce((sum, score) => sum + score, 0);
        const average = Math.round(total / scores.length);

        return {
          name,
          value: average,
        };
      })
      .slice(0, 5);
  }, [reports]);

  function openModal(student?: Student) {
    setErrorMessage("");

    setForm({
      ...initialForm,
      student_id: student?.id || "",
      report_period: "",
    });

    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setErrorMessage("");
    setForm(initialForm);
  }

  function updateScoreField(field: keyof AcademicForm, value: string) {
    const nextForm = {
      ...form,
      [field]: value,
    };

    const calculatedFinalScore = calculateFinalScore(nextForm);

    setForm({
      ...nextForm,
      final_score: calculatedFinalScore,
      description: calculatedFinalScore
        ? getScoreDescription(Number(calculatedFinalScore))
        : "",
    });
  }

  async function handleSubmitScore(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (!teacher?.id) {
      setErrorMessage("Data guru aktif tidak ditemukan.");
      return;
    }

    if (!form.student_id) {
      setErrorMessage("Murid wajib dipilih.");
      return;
    }

    if (!form.subject_id) {
      setErrorMessage("Mata pelajaran wajib dipilih.");
      return;
    }

    if (!form.report_period.trim()) {
      setErrorMessage("Periode laporan wajib diisi.");
      return;
    }

    if (!form.final_score.trim()) {
      setErrorMessage("Total nilai wajib diisi.");
      return;
    }

    setSaving(true);

    try {
      const finalScore = toNumber(form.final_score);

      const { error } = await supabase.from("academic_reports").insert({
        student_id: form.student_id,
        teacher_id: teacher.id,
        subject_id: form.subject_id,
        report_period: form.report_period.trim(),
        report_type: form.report_type,
        uh_score: toNumber(form.uh_score),
        task_score: toNumber(form.task_score),
        uts_score: toNumber(form.uts_score),
        uas_score: toNumber(form.uas_score),
        process_score: toNumber(form.process_score),
        final_score: finalScore,
        description: form.description.trim() || getScoreDescription(finalScore),
        teacher_comment: form.teacher_comment.trim() || null,
        status: form.status,
      });

      if (error) {
        throw new Error(error.message);
      }

      setForm(initialForm);
      setIsModalOpen(false);
      await fetchReports(teacher.id);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal menyimpan nilai akademik.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <TeacherLayout
      activeMenu="Laporan Akademik"
      searchPlaceholder="Cari laporan akademik..."
      buttonLabel="+ Tambah Nilai"
    >
      <div className="w-full max-w-full overflow-hidden">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#6B4A3A]">
              Teacher Portal
            </p>

            <h1 className="mt-1 text-[30px] font-bold tracking-tight">
              Laporan Akademik
            </h1>

            <p className="mt-1 text-sm text-[#6B4A3A]">
              Input dan pantau nilai akademik siswa oleh{" "}
              <span className="font-bold text-[#2B1B18]">
                {teacher?.full_name || "guru aktif"}
              </span>
              .
            </p>
          </div>

          <button
            type="button"
            onClick={() => openModal()}
            className="w-fit rounded-xl bg-[#7A1F2B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#54131D]"
          >
            + Tambah Nilai
          </button>
        </div>

        {errorMessage && !isModalOpen && (
          <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {loading && (
          <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-8 text-center text-sm shadow-sm">
            Loading laporan akademik...
          </div>
        )}

        {!loading && (
          <>
            <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6B4A3A]">Total Nilai</p>
                <p className="mt-4 text-3xl font-bold">{reports.length}</p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6B4A3A]">Rata-rata Nilai</p>
                <p className="mt-4 text-3xl font-bold">{averageScore}</p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6B4A3A]">Pending Review</p>
                <p className="mt-4 text-3xl font-bold">{reviewCount}</p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6B4A3A]">Published</p>
                <p className="mt-4 text-3xl font-bold">{publishedCount}</p>
              </div>
            </div>

            <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_240px]">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari murid, NISN, kelas, mapel, periode..."
                  className="w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                />

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                >
                  <option>Semua Status</option>
                  <option value="draft">draft</option>
                  <option value="pending_review">pending_review</option>
                  <option value="approved">approved</option>
                  <option value="revision">revision</option>
                  <option value="published">published</option>
                </select>

                <select
                  value={studentFilter}
                  onChange={(event) => setStudentFilter(event.target.value)}
                  className="rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                >
                  <option>Semua Murid</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
              <div className="overflow-hidden rounded-2xl border border-[#E8D6C1] bg-white shadow-sm">
                <div className="border-b border-[#E8D6C1] px-6 py-5">
                  <h2 className="text-lg font-bold">Daftar Nilai Akademik</h2>
                  <p className="mt-1 text-sm text-[#6B4A3A]">
                    Data nilai tersimpan di table academic_reports.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1180px] text-left">
                    <thead className="bg-[#FFF8EF] text-sm font-bold text-[#6B4A3A]">
                      <tr>
                        <th className="px-4 py-4">Murid</th>
                        <th className="px-4 py-4">NISN</th>
                        <th className="px-4 py-4">Kelas</th>
                        <th className="px-4 py-4">Mapel</th>
                        <th className="px-4 py-4">Periode</th>
                        <th className="px-4 py-4">UH</th>
                        <th className="px-4 py-4">Tugas</th>
                        <th className="px-4 py-4">UTS</th>
                        <th className="px-4 py-4">UAS</th>
                        <th className="px-4 py-4">Proses</th>
                        <th className="px-4 py-4">Total</th>
                        <th className="px-4 py-4">Keterangan</th>
                        <th className="px-4 py-4">Status</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#E8D6C1]">
                      {filteredReports.length === 0 && (
                        <tr>
                          <td
                            colSpan={13}
                            className="px-4 py-10 text-center text-sm text-[#6B4A3A]"
                          >
                            Belum ada laporan akademik untuk guru ini.
                          </td>
                        </tr>
                      )}

                      {filteredReports.map((report) => {
                        const description =
                          report.description ||
                          getScoreDescription(report.final_score);

                        return (
                          <tr key={report.id} className="hover:bg-[#FFF8EF]">
                            <td className="px-4 py-4 font-semibold">
                              {report.students?.full_name || "-"}
                            </td>

                            <td className="px-4 py-4">
                              {report.students?.nisn || "-"}
                            </td>

                            <td className="px-4 py-4">
                              {report.students?.grade || "-"}
                            </td>

                            <td className="px-4 py-4">
                              {report.subjects?.name || "-"}
                            </td>

                            <td className="px-4 py-4">
                              {report.report_period || "-"}
                            </td>

                            <td className="px-4 py-4">
                              {report.uh_score ?? "-"}
                            </td>

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

                            <td className="px-4 py-4 font-bold text-[#7A1F2B]">
                              {report.final_score ?? "-"}
                            </td>

                            <td className="px-4 py-4">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-bold ${getDescriptionBadge(
                                  description
                                )}`}
                              >
                                {description}
                              </span>
                            </td>

                            <td className="px-4 py-4">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusBadge(
                                  report.status
                                )}`}
                              >
                                {getStatusLabel(report.status)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold">Guru Aktif</h2>

                  <div className="mt-5 rounded-2xl bg-[#FFF8EF] p-5">
                    <p className="text-sm text-[#6B4A3A]">Nama Guru</p>
                    <p className="mt-2 text-xl font-bold">
                      {teacher?.full_name || "-"}
                    </p>

                    <div className="mt-4 space-y-2 text-sm text-[#6B4A3A]">
                      <p>
                        <span className="font-semibold text-[#2B1B18]">
                          Kode:
                        </span>{" "}
                        {teacher?.teacher_code || "-"}
                      </p>

                      <p>
                        <span className="font-semibold text-[#2B1B18]">
                          Email:
                        </span>{" "}
                        {teacher?.email || "-"}
                      </p>

                      <p>
                        <span className="font-semibold text-[#2B1B18]">
                          Mapel:
                        </span>{" "}
                        {teacher?.subjects?.join(", ") || "-"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold">Murid Terhubung</h2>

                  <div className="mt-5 space-y-3">
                    {students.length === 0 && (
                      <div className="rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] p-4 text-sm text-[#6B4A3A]">
                        Belum ada murid untuk guru ini.
                      </div>
                    )}

                    {students.slice(0, 5).map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-[#E8D6C1] p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FDE7D7] text-xs font-bold text-[#7A1F2B]">
                            {getInitials(student.full_name)}
                          </div>

                          <div>
                            <p className="font-bold">{student.full_name}</p>
                            <p className="text-sm text-[#6B4A3A]">
                              {student.grade || "-"} • {student.nis || "-"}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => openModal(student)}
                          className="shrink-0 rounded-xl bg-[#7A1F2B] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#54131D]"
                        >
                          + Nilai
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold">Performa Mapel</h2>

                  <div className="mt-5 space-y-4">
                    {subjectPerformance.length === 0 && (
                      <div className="rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] p-4 text-sm text-[#6B4A3A]">
                        Belum ada nilai per mata pelajaran.
                      </div>
                    )}

                    {subjectPerformance.map((subject) => (
                      <div key={subject.name}>
                        <div className="mb-2 flex justify-between text-sm">
                          <span>{subject.name}</span>
                          <span className="font-bold">{subject.value}</span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-[#F1DFD5]">
                          <div
                            className="h-full rounded-full bg-[#7A1F2B]"
                            style={{
                              width: `${Math.min(100, subject.value)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold">Status Nilai</h2>

                  <div className="mt-5 space-y-4">
                    <div>
                      <div className="mb-2 flex justify-between text-sm">
                        <span>Draft</span>
                        <span className="font-bold">{draftCount}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#F1DFD5]">
                        <div
                          className="h-full rounded-full bg-slate-500"
                          style={{
                            width:
                              reports.length > 0
                                ? `${(draftCount / reports.length) * 100}%`
                                : "0%",
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex justify-between text-sm">
                        <span>Pending Review</span>
                        <span className="font-bold">{reviewCount}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#F1DFD5]">
                        <div
                          className="h-full rounded-full bg-yellow-500"
                          style={{
                            width:
                              reports.length > 0
                                ? `${(reviewCount / reports.length) * 100}%`
                                : "0%",
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex justify-between text-sm">
                        <span>Published</span>
                        <span className="font-bold">{publishedCount}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#F1DFD5]">
                        <div
                          className="h-full rounded-full bg-emerald-600"
                          style={{
                            width:
                              reports.length > 0
                                ? `${(publishedCount / reports.length) * 100}%`
                                : "0%",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
          <div className="flex max-h-[88vh] w-full max-w-[460px] flex-col overflow-hidden rounded-2xl bg-[#FAF3EA] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E8D6C1] px-6 py-5">
              <h2 className="text-xl font-bold">Tambah Nilai Akademik</h2>

              <button
                type="button"
                onClick={closeModal}
                className="text-2xl leading-none text-[#6B4A3A] hover:text-[#7A1F2B]"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5">
              {errorMessage && (
                <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleSubmitScore} className="space-y-4">
                <div>
                  <label className="text-sm font-bold">Murid</label>
                  <select
                    value={form.student_id}
                    onChange={(event) =>
                      setForm({ ...form, student_id: event.target.value })
                    }
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  >
                    <option value="">Pilih murid</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.full_name} — {student.grade || "-"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-bold">Mata Pelajaran</label>
                  <select
                    value={form.subject_id}
                    onChange={(event) =>
                      setForm({ ...form, subject_id: event.target.value })
                    }
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  >
                    <option value="">Pilih mata pelajaran</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-bold">Periode</label>
                    <input
                      value={form.report_period}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          report_period: event.target.value,
                        })
                      }
                      placeholder="Juli 2026"
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold">Tipe Report</label>
                    <select
                      value={form.report_type}
                      onChange={(event) =>
                        setForm({ ...form, report_type: event.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="semester">Semester</option>
                      <option value="final">Final</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-bold">UH</label>
                    <input
                      type="number"
                      value={form.uh_score}
                      onChange={(event) =>
                        updateScoreField("uh_score", event.target.value)
                      }
                      placeholder="85"
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold">Tugas</label>
                    <input
                      type="number"
                      value={form.task_score}
                      onChange={(event) =>
                        updateScoreField("task_score", event.target.value)
                      }
                      placeholder="90"
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold">UTS</label>
                    <input
                      type="number"
                      value={form.uts_score}
                      onChange={(event) =>
                        updateScoreField("uts_score", event.target.value)
                      }
                      placeholder="82"
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold">UAS</label>
                    <input
                      type="number"
                      value={form.uas_score}
                      onChange={(event) =>
                        updateScoreField("uas_score", event.target.value)
                      }
                      placeholder="88"
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold">Proses KBM</label>
                  <input
                    type="number"
                    value={form.process_score}
                    onChange={(event) =>
                      updateScoreField("process_score", event.target.value)
                    }
                    placeholder="90"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-bold">Total Nilai</label>
                    <input
                      type="number"
                      value={form.final_score}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          final_score: event.target.value,
                          description: event.target.value
                            ? getScoreDescription(Number(event.target.value))
                            : "",
                        })
                      }
                      placeholder="87"
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold">Keterangan</label>
                    <input
                      value={form.description}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          description: event.target.value,
                        })
                      }
                      placeholder="Sangat Baik"
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold">Komentar Guru</label>
                  <textarea
                    value={form.teacher_comment}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        teacher_comment: event.target.value,
                      })
                    }
                    placeholder="Komentar perkembangan siswa"
                    rows={3}
                    className="mt-2 w-full resize-none rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Status</label>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm({ ...form, status: event.target.value })
                    }
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  >
                    <option value="draft">draft</option>
                    <option value="pending_review">pending_review</option>
                    <option value="published">published</option>
                  </select>
                </div>

                <div className="sticky bottom-0 -mx-6 mt-5 border-t border-[#E8D6C1] bg-[#FAF3EA] px-6 pb-1 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-xl bg-[#7A1F2B] py-3 text-sm font-bold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Menyimpan..." : "Simpan Nilai"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </TeacherLayout>
  );
}