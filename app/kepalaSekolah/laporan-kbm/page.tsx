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

type KbmReportQueryResult = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  report_date: string;
  class_level: string | null;
  semester: string | null;
  chapter: string | null;
  material_topic: string | null;
  learning_issue: string | null;
  solution: string | null;
  teacher_note: string | null;
  status: string | null;
  students: StudentOption | StudentOption[] | null;
  teachers: TeacherOption | TeacherOption[] | null;
  subjects: SubjectOption | SubjectOption[] | null;
};

type KbmReport = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  report_date: string;
  class_level: string | null;
  semester: string | null;
  chapter: string | null;
  material_topic: string | null;
  learning_issue: string | null;
  solution: string | null;
  teacher_note: string | null;
  status: string | null;
  students: StudentOption | null;
  teachers: TeacherOption | null;
  subjects: SubjectOption | null;
};

type KbmReportForm = {
  student_id: string;
  teacher_id: string;
  subject_id: string;
  report_date: string;
  class_level: string;
  semester: string;
  chapter: string;
  material_topic: string;
  learning_issue: string;
  solution: string;
  teacher_note: string;
  status: string;
};

const initialForm: KbmReportForm = {
  student_id: "",
  teacher_id: "",
  subject_id: "",
  report_date: "",
  class_level: "",
  semester: "Genap",
  chapter: "",
  material_topic: "",
  learning_issue: "",
  solution: "",
  teacher_note: "",
  status: "draft",
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

export default function KepalaSekolahLaporanKBMPage() {
  const [reports, setReports] = useState<KbmReport[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [teacherFilter, setTeacherFilter] = useState("Semua Guru");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<KbmReportForm>(initialForm);
  const [errorMessage, setErrorMessage] = useState("");

  async function fetchStudents() {
    const { data, error } = await supabase
      .from("students")
      .select("id, full_name, level, grade, nis")
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
        students (
          id,
          full_name,
          level,
          grade,
          nis
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
      .order("report_date", { ascending: false });

    if (error) {
      console.error(error.message);
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    const rows = (data || []) as KbmReportQueryResult[];

    const normalizedReports: KbmReport[] = rows.map((item) => ({
      id: item.id,
      student_id: item.student_id,
      teacher_id: item.teacher_id,
      subject_id: item.subject_id,
      report_date: item.report_date,
      class_level: item.class_level,
      semester: item.semester,
      chapter: item.chapter,
      material_topic: item.material_topic,
      learning_issue: item.learning_issue,
      solution: item.solution,
      teacher_note: item.teacher_note,
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
        report.teachers?.full_name?.toLowerCase().includes(keyword) ||
        report.subjects?.name?.toLowerCase().includes(keyword) ||
        report.material_topic?.toLowerCase().includes(keyword) ||
        report.chapter?.toLowerCase().includes(keyword) ||
        report.teacher_note?.toLowerCase().includes(keyword);

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
  const totalPending = reports.filter(
    (report) => report.status === "pending_review"
  ).length;
  const totalPublished = reports.filter(
    (report) => report.status === "published"
  ).length;

  async function handleSubmitReport(event: React.FormEvent<HTMLFormElement>) {
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

    if (!form.report_date) {
      setErrorMessage("Tanggal laporan wajib diisi.");
      return;
    }

    if (!form.class_level.trim()) {
      setErrorMessage("Kelas wajib diisi.");
      return;
    }

    if (!form.material_topic.trim()) {
      setErrorMessage("Materi wajib diisi.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from("kbm_reports").insert({
        student_id: form.student_id,
        teacher_id: form.teacher_id,
        subject_id: form.subject_id,
        report_date: form.report_date,
        class_level: form.class_level.trim(),
        semester: form.semester,
        chapter: form.chapter.trim() || null,
        material_topic: form.material_topic.trim(),
        learning_issue: form.learning_issue.trim() || null,
        solution: form.solution.trim() || null,
        teacher_note: form.teacher_note.trim() || null,
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
        setErrorMessage("Gagal menyimpan laporan KBM.");
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
      activeMenu="Laporan KBM"
      searchPlaceholder="Cari laporan KBM..."
      buttonLabel="+ Buat Laporan"
    >
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[30px] font-bold tracking-tight">Laporan KBM</h1>
          <p className="mt-1 text-sm text-[#6B4A3A]">
            Kelola laporan kegiatan belajar mengajar siswa.
          </p>
        </div>

        <div className="flex gap-3">
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
            + Buat Laporan
          </button>
        </div>
      </div>

      <div className="mt-7 grid grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#6B4A3A]">Total Laporan</p>
          <p className="mt-4 text-3xl font-bold">{reports.length}</p>
        </div>

        <div className="rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#6B4A3A]">Draft</p>
          <p className="mt-4 text-3xl font-bold">{totalDraft}</p>
        </div>

        <div className="rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#6B4A3A]">Pending Review</p>
          <p className="mt-4 text-3xl font-bold">{totalPending}</p>
        </div>

        <div className="rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#6B4A3A]">Published</p>
          <p className="mt-4 text-3xl font-bold">{totalPublished}</p>
        </div>
      </div>

      <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
        <div className="grid grid-cols-[1fr_210px_220px] gap-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari siswa, guru, mapel, bab, atau materi..."
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

      <div className="mt-7 grid grid-cols-2 gap-5">
        {loading && (
          <div className="col-span-2 rounded-2xl border border-[#E8D6C1] bg-white p-8 text-center text-sm shadow-sm">
            Loading laporan KBM...
          </div>
        )}

        {!loading && filteredReports.length === 0 && (
          <div className="col-span-2 rounded-2xl border border-[#E8D6C1] bg-white p-8 text-center text-sm shadow-sm">
            Belum ada laporan KBM.
          </div>
        )}

        {!loading &&
          filteredReports.map((report) => (
            <div
              key={report.id}
              className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold">
                    {report.students?.full_name || "-"}
                  </h2>
                  <p className="mt-1 text-sm text-[#6B4A3A]">
                    {report.class_level || "-"} •{" "}
                    {report.subjects?.name || "-"} •{" "}
                    {formatDate(report.report_date)}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusBadge(
                    report.status
                  )}`}
                >
                  {getStatusLabel(report.status)}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-[#FFF8EF] p-3">
                  <p className="text-[#6B4A3A]">Guru</p>
                  <p className="font-bold">
                    {report.teachers?.full_name || "-"}
                  </p>
                </div>

                <div className="rounded-xl bg-[#FFF8EF] p-3">
                  <p className="text-[#6B4A3A]">Semester</p>
                  <p className="font-bold">{report.semester || "-"}</p>
                </div>

                <div className="rounded-xl bg-[#FFF8EF] p-3">
                  <p className="text-[#6B4A3A]">BAB</p>
                  <p className="font-bold">{report.chapter || "-"}</p>
                </div>

                <div className="rounded-xl bg-[#FFF8EF] p-3">
                  <p className="text-[#6B4A3A]">Materi</p>
                  <p className="font-bold">{report.material_topic || "-"}</p>
                </div>
              </div>

              <div className="mt-5 space-y-4 text-sm">
                <div>
                  <p className="font-bold">Masalah / Kendala</p>
                  <p className="mt-1 leading-6 text-[#6B4A3A]">
                    {report.learning_issue || "-"}
                  </p>
                </div>

                <div>
                  <p className="font-bold">Solusi</p>
                  <p className="mt-1 leading-6 text-[#6B4A3A]">
                    {report.solution || "-"}
                  </p>
                </div>

                <div>
                  <p className="font-bold">Catatan Guru</p>
                  <p className="mt-1 leading-6 text-[#6B4A3A]">
                    {report.teacher_note || "-"}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-[#E8D6C1] px-4 py-2 text-xs font-bold"
                >
                  View
                </button>

                <button
                  type="button"
                  className="rounded-lg bg-[#7A1F2B] px-4 py-2 text-xs font-bold text-white"
                >
                  Review
                </button>
              </div>
            </div>
          ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
          <div className="flex max-h-[88vh] w-full max-w-[440px] flex-col overflow-hidden rounded-2xl bg-[#FAF3EA] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E8D6C1] px-6 py-5">
              <h2 className="text-xl font-bold">Buat Laporan KBM</h2>

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

              <form onSubmit={handleSubmitReport} className="space-y-4">
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
                    <label className="text-sm font-bold">Tanggal Laporan</label>
                    <input
                      type="date"
                      value={form.report_date}
                      onChange={(event) =>
                        setForm({ ...form, report_date: event.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold">Kelas</label>
                    <input
                      value={form.class_level}
                      onChange={(event) =>
                        setForm({ ...form, class_level: event.target.value })
                      }
                      placeholder="Grade 4"
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-bold">Semester</label>
                    <select
                      value={form.semester}
                      onChange={(event) =>
                        setForm({ ...form, semester: event.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    >
                      <option>Ganjil</option>
                      <option>Genap</option>
                    </select>
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
                </div>

                <div>
                  <label className="text-sm font-bold">BAB</label>
                  <input
                    value={form.chapter}
                    onChange={(event) =>
                      setForm({ ...form, chapter: event.target.value })
                    }
                    placeholder="Contoh: Bab 6"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Materi</label>
                  <input
                    value={form.material_topic}
                    onChange={(event) =>
                      setForm({ ...form, material_topic: event.target.value })
                    }
                    placeholder="Contoh: Siklus Air"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Masalah / Kendala</label>
                  <textarea
                    value={form.learning_issue}
                    onChange={(event) =>
                      setForm({ ...form, learning_issue: event.target.value })
                    }
                    placeholder="Contoh: Perlu penguatan konsep..."
                    rows={3}
                    className="mt-2 w-full resize-none rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Solusi</label>
                  <textarea
                    value={form.solution}
                    onChange={(event) =>
                      setForm({ ...form, solution: event.target.value })
                    }
                    placeholder="Contoh: Diberikan latihan visual..."
                    rows={3}
                    className="mt-2 w-full resize-none rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Catatan Guru</label>
                  <textarea
                    value={form.teacher_note}
                    onChange={(event) =>
                      setForm({ ...form, teacher_note: event.target.value })
                    }
                    placeholder="Catatan perkembangan siswa"
                    rows={3}
                    className="mt-2 w-full resize-none rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div className="sticky bottom-0 -mx-6 mt-5 border-t border-[#E8D6C1] bg-[#FAF3EA] px-6 pb-1 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-xl bg-[#7A1F2B] py-3 text-sm font-bold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Menyimpan..." : "Simpan Laporan"}
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