"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import KepalaSekolahLayout from "../components/KepalaSekolahLayout";

type StudentOption = {
  id: string;
  full_name: string;
  level: string | null;
  grade: string | null;
  nis: string | null;
  nisn: string | null;
};

type TeacherOption = {
  id: string;
  full_name: string;
  email: string | null;
};

type SubjectOption = {
  id: string;
  name: string;
  level: string | null;
  grade: string | null;
};

type AcademicReportQueryResult = {
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
  students: StudentOption | StudentOption[] | null;
  teachers: TeacherOption | TeacherOption[] | null;
  subjects: SubjectOption | SubjectOption[] | null;
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
  students: StudentOption | null;
  teachers: TeacherOption | null;
  subjects: SubjectOption | null;
};

type AcademicForm = {
  student_id: string;
  teacher_id: string;
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
  teacher_id: "",
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

export default function KepalaSekolahLaporanAkademikPage() {
  const [reports, setReports] = useState<AcademicReport[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [teacherFilter, setTeacherFilter] = useState("Semua Guru");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<AcademicForm>(initialForm);
  const [errorMessage, setErrorMessage] = useState("");

  async function fetchStudents() {
    const { data, error } = await supabase
      .from("students")
      .select("id, full_name, level, grade, nis, nisn")
      .order("full_name", { ascending: true });

    if (error) {
      console.error(error.message);
      return;
    }

    setStudents(data || []);
  }

  async function fetchTeachers() {
    const { data, error } = await supabase
      .from("teachers")
      .select("id, full_name, email")
      .order("full_name", { ascending: true });

    if (error) {
      console.error(error.message);
      return;
    }

    setTeachers(data || []);
  }

  async function fetchSubjects() {
    const { data, error } = await supabase
      .from("subjects")
      .select("id, name, level, grade")
      .order("name", { ascending: true });

    if (error) {
      console.error(error.message);
      return;
    }

    setSubjects(data || []);
  }

  async function fetchReports() {
    setLoading(true);
    setErrorMessage("");

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
        students (
          id,
          full_name,
          level,
          grade,
          nis,
          nisn
        ),
        teachers (
          id,
          full_name,
          email
        ),
        subjects (
          id,
          name,
          level,
          grade
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error.message);
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    const rows = (data || []) as AcademicReportQueryResult[];

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
      students: normalizeRelation(item.students),
      teachers: normalizeRelation(item.teachers),
      subjects: normalizeRelation(item.subjects),
    }));

    setReports(normalizedReports);
    setLoading(false);
  }

  async function fetchAllData() {
    await Promise.all([
      fetchStudents(),
      fetchTeachers(),
      fetchSubjects(),
      fetchReports(),
    ]);
  }

  useEffect(() => {
    fetchAllData();
  }, []);

  const filteredReports = useMemo(() => {
    const keyword = search.toLowerCase();

    return reports.filter((report) => {
      const matchSearch =
        report.students?.full_name?.toLowerCase().includes(keyword) ||
        report.students?.nisn?.toLowerCase().includes(keyword) ||
        report.teachers?.full_name?.toLowerCase().includes(keyword) ||
        report.subjects?.name?.toLowerCase().includes(keyword) ||
        report.report_period?.toLowerCase().includes(keyword) ||
        report.description?.toLowerCase().includes(keyword) ||
        report.teacher_comment?.toLowerCase().includes(keyword);

      const matchStatus =
        statusFilter === "Semua Status" ||
        getStatusLabel(report.status) === statusFilter;

      const matchTeacher =
        teacherFilter === "Semua Guru" ||
        report.teachers?.full_name === teacherFilter;

      return matchSearch && matchStatus && matchTeacher;
    });
  }, [reports, search, statusFilter, teacherFilter]);

  const totalDraft = reports.filter((report) => report.status === "draft").length;

  const totalPublished = reports.filter(
    (report) => report.status === "published"
  ).length;

  const averageScore =
    reports.length > 0
      ? Math.round(
          reports.reduce(
            (sum, report) => sum + Number(report.final_score || 0),
            0
          ) / reports.length
        )
      : 0;

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

    if (!form.student_id) {
      setErrorMessage("Nama siswa wajib dipilih.");
      return;
    }

    if (!form.teacher_id) {
      setErrorMessage("Guru wajib dipilih.");
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
        teacher_id: form.teacher_id,
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
      await fetchReports();
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

  function closeModal() {
    setIsModalOpen(false);
    setErrorMessage("");
    setForm(initialForm);
  }

  return (
    <KepalaSekolahLayout
      activeMenu="Laporan Akademik"
      searchPlaceholder="Cari laporan akademik..."
      buttonLabel="+ Tambah Nilai"
    >
      <div className="w-full max-w-full overflow-hidden">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-[30px] font-bold tracking-tight">
              Laporan Akademik
            </h1>
            <p className="mt-1 text-sm text-[#6B4A3A]">
              Rekap nilai UH, Tugas, UTS, UAS, dan proses KBM.
            </p>
          </div>

          <div className="flex shrink-0 gap-3">
            <button
              type="button"
              className="rounded-xl border border-[#E8D6C1] bg-white px-5 py-3 text-sm font-semibold text-[#2B1B18] shadow-sm transition hover:bg-[#FFF8EF]"
            >
              ⬇ Export
            </button>

            <button
              type="button"
              onClick={() => {
                setErrorMessage("");
                setIsModalOpen(true);
              }}
              className="rounded-xl bg-[#7A1F2B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#54131D]"
            >
              + Tambah Nilai
            </button>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
            <p className="text-sm text-[#6B4A3A]">Total Nilai</p>
            <p className="mt-4 text-3xl font-bold">{reports.length}</p>
          </div>

          <div className="rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
            <p className="text-sm text-[#6B4A3A]">Rata-rata Nilai</p>
            <p className="mt-4 text-3xl font-bold">{averageScore}</p>
          </div>

          <div className="rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
            <p className="text-sm text-[#6B4A3A]">Draft</p>
            <p className="mt-4 text-3xl font-bold">{totalDraft}</p>
          </div>

          <div className="rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
            <p className="text-sm text-[#6B4A3A]">Published</p>
            <p className="mt-4 text-3xl font-bold">{totalPublished}</p>
          </div>
        </div>

        <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_210px_220px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari siswa, NISN, guru, mapel, periode..."
              className="w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
            >
              <option>Semua Status</option>
              <option>Draft</option>
              <option>Pending Review</option>
              <option>Approved</option>
              <option>Revision</option>
              <option>Published</option>
            </select>

            <select
              value={teacherFilter}
              onChange={(event) => setTeacherFilter(event.target.value)}
              className="rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
            >
              <option>Semua Guru</option>
              {teachers.map((teacher) => (
                <option key={teacher.id}>{teacher.full_name}</option>
              ))}
            </select>
          </div>
        </div>

        {errorMessage && !isModalOpen && (
          <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="mt-7 max-w-full overflow-hidden rounded-2xl border border-[#E8D6C1] bg-white shadow-sm">
          <div className="w-full overflow-x-auto">
            <table className="min-w-[1100px] text-left">
              <thead className="bg-[#FFF8EF] text-sm font-bold text-[#6B4A3A]">
                <tr>
                  <th className="px-4 py-4">Nama</th>
                  <th className="px-4 py-4">NISN</th>
                  <th className="px-4 py-4">Kelas</th>
                  <th className="px-4 py-4">Mata Pelajaran</th>
                  <th className="px-4 py-4">UH</th>
                  <th className="px-4 py-4">Tugas</th>
                  <th className="px-4 py-4">UTS</th>
                  <th className="px-4 py-4">UAS</th>
                  <th className="px-4 py-4">Proses KBM</th>
                  <th className="px-4 py-4">Total</th>
                  <th className="px-4 py-4">Keterangan</th>
                  <th className="px-4 py-4">Komentar Guru</th>
                  <th className="px-4 py-4">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E8D6C1]">
                {loading && (
                  <tr>
                    <td colSpan={13} className="px-4 py-8 text-center text-sm">
                      Loading laporan akademik...
                    </td>
                  </tr>
                )}

                {!loading && filteredReports.length === 0 && (
                  <tr>
                    <td colSpan={13} className="px-4 py-8 text-center text-sm">
                      Belum ada data nilai akademik.
                    </td>
                  </tr>
                )}

                {!loading &&
                  filteredReports.map((report) => {
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
                        <td className="px-4 py-4">{report.uh_score ?? "-"}</td>
                        <td className="px-4 py-4">
                          {report.task_score ?? "-"}
                        </td>
                        <td className="px-4 py-4">{report.uts_score ?? "-"}</td>
                        <td className="px-4 py-4">{report.uas_score ?? "-"}</td>
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
                        <td className="max-w-[260px] px-4 py-4 text-sm leading-6 text-[#6B4A3A]">
                          {report.teacher_comment || "-"}
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
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
          <div className="flex max-h-[88vh] w-full max-w-[440px] flex-col overflow-hidden rounded-2xl bg-[#FAF3EA] shadow-2xl">
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
                  <label className="text-sm font-bold">Nama Siswa</label>
                  <select
                    value={form.student_id}
                    onChange={(event) =>
                      setForm({ ...form, student_id: event.target.value })
                    }
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  >
                    <option value="">Pilih siswa</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.full_name}
                        {student.grade ? ` — ${student.grade}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-bold">Guru</label>
                  <select
                    value={form.teacher_id}
                    onChange={(event) =>
                      setForm({ ...form, teacher_id: event.target.value })
                    }
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  >
                    <option value="">Pilih guru</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.full_name}
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
                    <option value="draft">Draft</option>
                    <option value="pending_review">Pending Review</option>
                    <option value="approved">Approved</option>
                    <option value="published">Published</option>
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
    </KepalaSekolahLayout>
  );
}