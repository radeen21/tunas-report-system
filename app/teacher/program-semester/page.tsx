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

type Subject = {
  id: string;
  name: string;
  level: string | null;
  grade: string | null;
};

type SubjectRelation = {
  id: string;
  name: string;
  level: string | null;
  grade: string | null;
};

type SemesterProgramRow = {
  id: string;
  teacher_id: string | null;
  subject_id: string | null;
  class_level: string | null;
  semester: string | null;
  academic_year: string | null;
  chapter: string | null;
  main_material: string | null;
  month_name: string | null;
  week_name: string | null;
  time_allocation: string | null;
  status: string | null;
  created_at: string | null;
  subjects: SubjectRelation | SubjectRelation[] | null;
};

type SemesterProgram = {
  id: string;
  teacher_id: string | null;
  subject_id: string | null;
  class_level: string | null;
  semester: string | null;
  academic_year: string | null;
  chapter: string | null;
  main_material: string | null;
  month_name: string | null;
  week_name: string | null;
  time_allocation: string | null;
  status: string | null;
  created_at: string | null;
  subjects: SubjectRelation | null;
};

type ProgramForm = {
  subject_id: string;
  class_level: string;
  semester: string;
  academic_year: string;
  chapter: string;
  main_material: string;
  month_name: string;
  week_name: string;
  time_allocation: string;
  status: string;
};

const initialForm: ProgramForm = {
  subject_id: "",
  class_level: "",
  semester: "Genap",
  academic_year: "2025/2026",
  chapter: "",
  main_material: "",
  month_name: "",
  week_name: "",
  time_allocation: "",
  status: "planned",
};

const monthOptions = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const weekOptions = [
  "Minggu 1",
  "Minggu 2",
  "Minggu 3",
  "Minggu 4",
  "Minggu 5",
];

function normalizeRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
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

function getStatusLabel(status: string | null) {
  if (status === "published") return "Published";
  if (status === "approved") return "Approved";
  if (status === "pending_review") return "Pending Review";
  if (status === "revision") return "Revision";
  if (status === "done") return "Done";
  if (status === "planned") return "Planned";

  return "Draft";
}

function getStatusBadge(status: string | null) {
  if (status === "published" || status === "approved" || status === "done") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "pending_review" || status === "planned") {
    return "bg-yellow-100 text-yellow-700";
  }

  if (status === "revision") {
    return "bg-red-100 text-red-700";
  }

  return "bg-slate-200 text-slate-700";
}

export default function TeacherProgramSemesterPage() {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [programs, setPrograms] = useState<SemesterProgram[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [search, setSearch] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("Semua Semester");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [monthFilter, setMonthFilter] = useState("Semua Bulan");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<ProgramForm>(initialForm);

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

  async function fetchSubjects() {
    const { data, error } = await supabase
      .from("subjects")
      .select("id, name, level, grade")
      .order("name", { ascending: true });

    if (error) throw new Error(error.message);

    setSubjects(data || []);
  }

  async function fetchPrograms(teacherId: string) {
    const { data, error } = await supabase
      .from("semester_programs")
      .select(
        `
        id,
        teacher_id,
        subject_id,
        class_level,
        semester,
        academic_year,
        chapter,
        main_material,
        month_name,
        week_name,
        time_allocation,
        status,
        created_at,
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

    const rows = (data || []) as SemesterProgramRow[];

    const normalizedPrograms: SemesterProgram[] = rows.map((item) => ({
      id: item.id,
      teacher_id: item.teacher_id,
      subject_id: item.subject_id,
      class_level: item.class_level,
      semester: item.semester,
      academic_year: item.academic_year,
      chapter: item.chapter,
      main_material: item.main_material,
      month_name: item.month_name,
      week_name: item.week_name,
      time_allocation: item.time_allocation,
      status: item.status,
      created_at: item.created_at,
      subjects: normalizeRelation(item.subjects),
    }));

    setPrograms(normalizedPrograms);
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

      await Promise.all([fetchSubjects(), fetchPrograms(activeTeacher.id)]);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengambil data program semester.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPageData();
  }, []);

  const filteredPrograms = useMemo(() => {
    const keyword = search.toLowerCase();

    return programs.filter((program) => {
      const matchSearch =
        program.subjects?.name?.toLowerCase().includes(keyword) ||
        program.class_level?.toLowerCase().includes(keyword) ||
        program.academic_year?.toLowerCase().includes(keyword) ||
        program.chapter?.toLowerCase().includes(keyword) ||
        program.main_material?.toLowerCase().includes(keyword) ||
        program.month_name?.toLowerCase().includes(keyword) ||
        program.week_name?.toLowerCase().includes(keyword) ||
        program.time_allocation?.toLowerCase().includes(keyword);

      const matchSemester =
        semesterFilter === "Semua Semester" ||
        program.semester === semesterFilter;

      const matchStatus =
        statusFilter === "Semua Status" || program.status === statusFilter;

      const matchMonth =
        monthFilter === "Semua Bulan" || program.month_name === monthFilter;

      return matchSearch && matchSemester && matchStatus && matchMonth;
    });
  }, [programs, search, semesterFilter, statusFilter, monthFilter]);

  const plannedCount = programs.filter(
    (program) => program.status === "planned"
  ).length;

  const draftCount = programs.filter(
    (program) => program.status === "draft"
  ).length;

  const publishedCount = programs.filter(
    (program) => program.status === "published"
  ).length;

  const totalSubjects = useMemo(() => {
    const subjectIds = programs
      .map((item) => item.subject_id)
      .filter(Boolean) as string[];

    return new Set(subjectIds).size;
  }, [programs]);

  const monthSummary = useMemo(() => {
    return monthOptions.map((month) => {
      const total = programs.filter(
        (program) => program.month_name?.toLowerCase() === month.toLowerCase()
      ).length;

      return {
        month,
        total,
      };
    });
  }, [programs]);

  function openModal() {
    setErrorMessage("");
    setForm(initialForm);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setErrorMessage("");
    setForm(initialForm);
  }

  async function handleSubmitProgram(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (!teacher?.id) {
      setErrorMessage("Data guru aktif tidak ditemukan.");
      return;
    }

    if (!form.subject_id) {
      setErrorMessage("Mata pelajaran wajib dipilih.");
      return;
    }

    if (!form.class_level.trim()) {
      setErrorMessage("Kelas wajib diisi.");
      return;
    }

    if (!form.chapter.trim()) {
      setErrorMessage("Bab / unit wajib diisi.");
      return;
    }

    if (!form.main_material.trim()) {
      setErrorMessage("Materi utama wajib diisi.");
      return;
    }

    if (!form.month_name) {
      setErrorMessage("Bulan wajib dipilih.");
      return;
    }

    if (!form.week_name) {
      setErrorMessage("Minggu wajib dipilih.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from("semester_programs").insert({
        teacher_id: teacher.id,
        subject_id: form.subject_id,
        class_level: form.class_level.trim(),
        semester: form.semester,
        academic_year: form.academic_year.trim() || "2025/2026",
        chapter: form.chapter.trim(),
        main_material: form.main_material.trim(),
        month_name: form.month_name,
        week_name: form.week_name,
        time_allocation: form.time_allocation.trim() || null,
        status: form.status,
      });

      if (error) {
        throw new Error(error.message);
      }

      setForm(initialForm);
      setIsModalOpen(false);
      await fetchPrograms(teacher.id);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal menyimpan program semester.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <TeacherLayout
      activeMenu="Program Semester"
      searchPlaceholder="Cari program semester..."
      buttonLabel="+ Tambah Program"
    >
      <div className="w-full max-w-full overflow-hidden">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#6B4A3A]">
              Teacher Portal
            </p>

            <h1 className="mt-1 text-[30px] font-bold tracking-tight">
              Program Semester
            </h1>

            <p className="mt-1 text-sm text-[#6B4A3A]">
              Susun rencana materi semester oleh{" "}
              <span className="font-bold text-[#2B1B18]">
                {teacher?.full_name || "guru aktif"}
              </span>
              .
            </p>
          </div>

          <button
            type="button"
            onClick={openModal}
            className="w-fit rounded-xl bg-[#7A1F2B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#54131D]"
          >
            + Tambah Program
          </button>
        </div>

        {errorMessage && !isModalOpen && (
          <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {loading && (
          <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-8 text-center text-sm shadow-sm">
            Loading program semester...
          </div>
        )}

        {!loading && (
          <>
            <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6B4A3A]">Total Program</p>
                <p className="mt-4 text-3xl font-bold">{programs.length}</p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6B4A3A]">Planned</p>
                <p className="mt-4 text-3xl font-bold">{plannedCount}</p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6B4A3A]">Draft</p>
                <p className="mt-4 text-3xl font-bold">{draftCount}</p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6B4A3A]">Mapel</p>
                <p className="mt-4 text-3xl font-bold">{totalSubjects}</p>
              </div>
            </div>

            <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_210px_210px_210px]">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari mapel, kelas, bab, materi, bulan..."
                  className="w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                />

                <select
                  value={semesterFilter}
                  onChange={(event) => setSemesterFilter(event.target.value)}
                  className="rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                >
                  <option>Semua Semester</option>
                  <option>Ganjil</option>
                  <option>Genap</option>
                </select>

                <select
                  value={monthFilter}
                  onChange={(event) => setMonthFilter(event.target.value)}
                  className="rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                >
                  <option>Semua Bulan</option>
                  {monthOptions.map((month) => (
                    <option key={month}>{month}</option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                >
                  <option>Semua Status</option>
                  <option value="planned">planned</option>
                  <option value="draft">draft</option>
                  <option value="pending_review">pending_review</option>
                  <option value="published">published</option>
                  <option value="done">done</option>
                </select>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
              <div className="overflow-hidden rounded-2xl border border-[#E8D6C1] bg-white shadow-sm">
                <div className="border-b border-[#E8D6C1] px-6 py-5">
                  <h2 className="text-lg font-bold">Daftar Program Semester</h2>
                  <p className="mt-1 text-sm text-[#6B4A3A]">
                    Data tersimpan di table semester_programs.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1120px] text-left">
                    <thead className="bg-[#FFF8EF] text-sm font-bold text-[#6B4A3A]">
                      <tr>
                        <th className="px-4 py-4">Mapel</th>
                        <th className="px-4 py-4">Kelas</th>
                        <th className="px-4 py-4">Semester</th>
                        <th className="px-4 py-4">Tahun Ajaran</th>
                        <th className="px-4 py-4">Bab</th>
                        <th className="px-4 py-4">Materi Utama</th>
                        <th className="px-4 py-4">Bulan</th>
                        <th className="px-4 py-4">Minggu</th>
                        <th className="px-4 py-4">Alokasi</th>
                        <th className="px-4 py-4">Status</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#E8D6C1]">
                      {filteredPrograms.length === 0 && (
                        <tr>
                          <td
                            colSpan={10}
                            className="px-4 py-10 text-center text-sm text-[#6B4A3A]"
                          >
                            Belum ada program semester untuk guru ini.
                          </td>
                        </tr>
                      )}

                      {filteredPrograms.map((program) => (
                        <tr key={program.id} className="hover:bg-[#FFF8EF]">
                          <td className="px-4 py-4 font-semibold">
                            {program.subjects?.name || "-"}
                          </td>

                          <td className="px-4 py-4">
                            {program.class_level || "-"}
                          </td>

                          <td className="px-4 py-4">
                            {program.semester || "-"}
                          </td>

                          <td className="px-4 py-4">
                            {program.academic_year || "-"}
                          </td>

                          <td className="px-4 py-4">
                            {program.chapter || "-"}
                          </td>

                          <td className="px-4 py-4">
                            {program.main_material || "-"}
                          </td>

                          <td className="px-4 py-4">
                            {program.month_name || "-"}
                          </td>

                          <td className="px-4 py-4">
                            {program.week_name || "-"}
                          </td>

                          <td className="px-4 py-4">
                            {program.time_allocation || "-"}
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusBadge(
                                program.status
                              )}`}
                            >
                              {getStatusLabel(program.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold">Guru Aktif</h2>

                  <div className="mt-5 flex items-center gap-4 rounded-2xl bg-[#FFF8EF] p-5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#7A1F2B] text-sm font-bold text-white">
                      {getInitials(teacher?.full_name || "Guru")}
                    </div>

                    <div>
                      <p className="font-bold">{teacher?.full_name || "-"}</p>
                      <p className="mt-1 text-sm text-[#6B4A3A]">
                        {teacher?.teacher_code || "-"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-[#6B4A3A]">
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

                <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold">Ringkasan Bulan</h2>

                  <div className="mt-5 space-y-4">
                    {monthSummary
                      .filter((item) => item.total > 0)
                      .slice(0, 6)
                      .map((item) => (
                        <div key={item.month}>
                          <div className="mb-2 flex justify-between text-sm">
                            <span>{item.month}</span>
                            <span className="font-bold">
                              {item.total} program
                            </span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-[#F1DFD5]">
                            <div
                              className="h-full rounded-full bg-[#7A1F2B]"
                              style={{
                                width:
                                  programs.length > 0
                                    ? `${(item.total / programs.length) * 100}%`
                                    : "0%",
                              }}
                            />
                          </div>
                        </div>
                      ))}

                    {monthSummary.filter((item) => item.total > 0).length ===
                      0 && (
                      <div className="rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] p-4 text-sm text-[#6B4A3A]">
                        Belum ada program per bulan.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold">Status Program</h2>

                  <div className="mt-5 space-y-4">
                    <div>
                      <div className="mb-2 flex justify-between text-sm">
                        <span>Planned</span>
                        <span className="font-bold">{plannedCount}</span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-[#F1DFD5]">
                        <div
                          className="h-full rounded-full bg-yellow-500"
                          style={{
                            width:
                              programs.length > 0
                                ? `${(plannedCount / programs.length) * 100}%`
                                : "0%",
                          }}
                        />
                      </div>
                    </div>

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
                              programs.length > 0
                                ? `${(draftCount / programs.length) * 100}%`
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
                              programs.length > 0
                                ? `${(publishedCount / programs.length) * 100}%`
                                : "0%",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold">Catatan</h2>
                  <p className="mt-3 text-sm leading-6 text-[#6B4A3A]">
                    Tombol{" "}
                    <span className="font-bold text-[#2B1B18]">
                      + Tambah Program
                    </span>{" "}
                    akan menyimpan data baru ke table{" "}
                    <span className="font-bold text-[#2B1B18]">
                      semester_programs
                    </span>
                    .
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
          <div className="flex max-h-[88vh] w-full max-w-[470px] flex-col overflow-hidden rounded-2xl bg-[#FAF3EA] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E8D6C1] px-6 py-5">
              <h2 className="text-xl font-bold">Tambah Program Semester</h2>

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

              <form onSubmit={handleSubmitProgram} className="space-y-4">
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

                  <div>
                    <label className="text-sm font-bold">Tahun Ajaran</label>
                    <input
                      value={form.academic_year}
                      onChange={(event) =>
                        setForm({ ...form, academic_year: event.target.value })
                      }
                      placeholder="2025/2026"
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    />
                  </div>
                </div>

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
                  <label className="text-sm font-bold">Bab / Unit</label>
                  <input
                    value={form.chapter}
                    onChange={(event) =>
                      setForm({ ...form, chapter: event.target.value })
                    }
                    placeholder="Contoh: Bab 5"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Materi Utama</label>
                  <input
                    value={form.main_material}
                    onChange={(event) =>
                      setForm({ ...form, main_material: event.target.value })
                    }
                    placeholder="Contoh: Pecahan Senilai"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-bold">Bulan</label>
                    <select
                      value={form.month_name}
                      onChange={(event) =>
                        setForm({ ...form, month_name: event.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    >
                      <option value="">Pilih bulan</option>
                      {monthOptions.map((month) => (
                        <option key={month}>{month}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-bold">Minggu</label>
                    <select
                      value={form.week_name}
                      onChange={(event) =>
                        setForm({ ...form, week_name: event.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    >
                      <option value="">Pilih minggu</option>
                      {weekOptions.map((week) => (
                        <option key={week}>{week}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold">Alokasi Waktu</label>
                  <input
                    value={form.time_allocation}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        time_allocation: event.target.value,
                      })
                    }
                    placeholder="Contoh: 2 x 45 menit"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
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
                    <option value="planned">planned</option>
                    <option value="draft">draft</option>
                    <option value="pending_review">pending_review</option>
                    <option value="published">published</option>
                    <option value="done">done</option>
                  </select>
                </div>

                <div className="sticky bottom-0 -mx-6 mt-5 border-t border-[#E8D6C1] bg-[#FAF3EA] px-6 pb-1 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-xl bg-[#7A1F2B] py-3 text-sm font-bold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Menyimpan..." : "Simpan Program Semester"}
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