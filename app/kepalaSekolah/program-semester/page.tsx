"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import KepalaSekolahLayout from "../components/KepalaSekolahLayout";

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

type ProgramQueryResult = {
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
  teachers: TeacherOption | TeacherOption[] | null;
  subjects: SubjectOption | SubjectOption[] | null;
};

type Program = {
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
  teachers: TeacherOption | null;
  subjects: SubjectOption | null;
};

type ProgramForm = {
  teacher_id: string;
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
  teacher_id: "",
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

function normalizeRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function getStatusLabel(status: string | null) {
  if (status === "planned") return "Planned";
  if (status === "ongoing") return "Ongoing";
  if (status === "done") return "Done";
  return status || "-";
}

function getStatusBadge(status: string | null) {
  if (status === "done") return "bg-emerald-100 text-emerald-700";
  if (status === "ongoing") return "bg-yellow-100 text-yellow-700";
  return "bg-slate-200 text-slate-700";
}

export default function KepalaSekolahProgramSemesterPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("Semua Semester");
  const [teacherFilter, setTeacherFilter] = useState("Semua Guru");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<ProgramForm>(initialForm);
  const [errorMessage, setErrorMessage] = useState("");

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

  async function fetchPrograms() {
    setLoading(true);
    setErrorMessage("");

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
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    const rows = (data || []) as ProgramQueryResult[];

    const normalized: Program[] = rows.map((item) => ({
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
      teachers: normalizeRelation(item.teachers),
      subjects: normalizeRelation(item.subjects),
    }));

    setPrograms(normalized);
    setLoading(false);
  }

  async function fetchAllData() {
    await Promise.all([fetchTeachers(), fetchSubjects(), fetchPrograms()]);
  }

  useEffect(() => {
    fetchAllData();
  }, []);

  const filteredPrograms = useMemo(() => {
    const keyword = search.toLowerCase();

    return programs.filter((program) => {
      const matchSearch =
        program.teachers?.full_name?.toLowerCase().includes(keyword) ||
        program.subjects?.name?.toLowerCase().includes(keyword) ||
        program.class_level?.toLowerCase().includes(keyword) ||
        program.chapter?.toLowerCase().includes(keyword) ||
        program.main_material?.toLowerCase().includes(keyword) ||
        program.month_name?.toLowerCase().includes(keyword);

      const matchSemester =
        semesterFilter === "Semua Semester" ||
        program.semester === semesterFilter;

      const matchTeacher =
        teacherFilter === "Semua Guru" ||
        program.teachers?.full_name === teacherFilter;

      return matchSearch && matchSemester && matchTeacher;
    });
  }, [programs, search, semesterFilter, teacherFilter]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (!form.teacher_id) {
      setErrorMessage("Guru wajib dipilih.");
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

    if (!form.main_material.trim()) {
      setErrorMessage("Materi pokok wajib diisi.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from("semester_programs").insert({
        teacher_id: form.teacher_id,
        subject_id: form.subject_id,
        class_level: form.class_level.trim(),
        semester: form.semester,
        academic_year: form.academic_year.trim(),
        chapter: form.chapter.trim() || null,
        main_material: form.main_material.trim(),
        month_name: form.month_name.trim() || null,
        week_name: form.week_name.trim() || null,
        time_allocation: form.time_allocation.trim() || null,
        status: form.status,
      });

      if (error) throw new Error(error.message);

      setForm(initialForm);
      setIsModalOpen(false);
      await fetchPrograms();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal menyimpan program."
      );
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
      activeMenu="Program Semester"
      searchPlaceholder="Cari program semester..."
      buttonLabel="+ Tambah Program"
    >
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[30px] font-bold tracking-tight">
            Program Semester
          </h1>
          <p className="mt-1 text-sm text-[#6B4A3A]">
            Kelola rencana pembelajaran semester berdasarkan guru dan mata
            pelajaran.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="rounded-xl bg-[#7A1F2B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#54131D]"
        >
          + Tambah Program
        </button>
      </div>

      <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
        <div className="grid grid-cols-[1fr_210px_220px] gap-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari guru, mapel, kelas, bab, materi..."
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

      <div className="mt-7 overflow-hidden rounded-2xl border border-[#E8D6C1] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left">
            <thead className="bg-[#FFF8EF] text-sm font-bold text-[#6B4A3A]">
              <tr>
                <th className="px-5 py-4">Guru</th>
                <th className="px-5 py-4">Mapel</th>
                <th className="px-5 py-4">Kelas</th>
                <th className="px-5 py-4">Semester</th>
                <th className="px-5 py-4">Tahun Ajaran</th>
                <th className="px-5 py-4">BAB</th>
                <th className="px-5 py-4">Materi Pokok</th>
                <th className="px-5 py-4">Bulan</th>
                <th className="px-5 py-4">Minggu</th>
                <th className="px-5 py-4">Alokasi</th>
                <th className="px-5 py-4">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E8D6C1]">
              {loading && (
                <tr>
                  <td colSpan={11} className="px-5 py-8 text-center text-sm">
                    Loading program semester...
                  </td>
                </tr>
              )}

              {!loading && filteredPrograms.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-5 py-8 text-center text-sm">
                    Belum ada data program semester.
                  </td>
                </tr>
              )}

              {!loading &&
                filteredPrograms.map((program) => (
                  <tr key={program.id} className="hover:bg-[#FFF8EF]">
                    <td className="px-5 py-4 font-semibold">
                      {program.teachers?.full_name || "-"}
                    </td>
                    <td className="px-5 py-4">
                      {program.subjects?.name || "-"}
                    </td>
                    <td className="px-5 py-4">{program.class_level || "-"}</td>
                    <td className="px-5 py-4">{program.semester || "-"}</td>
                    <td className="px-5 py-4">
                      {program.academic_year || "-"}
                    </td>
                    <td className="px-5 py-4">{program.chapter || "-"}</td>
                    <td className="px-5 py-4 font-semibold">
                      {program.main_material || "-"}
                    </td>
                    <td className="px-5 py-4">{program.month_name || "-"}</td>
                    <td className="px-5 py-4">{program.week_name || "-"}</td>
                    <td className="px-5 py-4">
                      {program.time_allocation || "-"}
                    </td>
                    <td className="px-5 py-4">
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
          <div className="flex max-h-[88vh] w-full max-w-[440px] flex-col overflow-hidden rounded-2xl bg-[#FAF3EA] shadow-2xl">
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

              <form onSubmit={handleSubmit} className="space-y-4">
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

                <div>
                  <label className="text-sm font-bold">BAB</label>
                  <input
                    value={form.chapter}
                    onChange={(event) =>
                      setForm({ ...form, chapter: event.target.value })
                    }
                    placeholder="Bab 6"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Materi Pokok</label>
                  <input
                    value={form.main_material}
                    onChange={(event) =>
                      setForm({ ...form, main_material: event.target.value })
                    }
                    placeholder="Siklus Air"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-bold">Bulan</label>
                    <input
                      value={form.month_name}
                      onChange={(event) =>
                        setForm({ ...form, month_name: event.target.value })
                      }
                      placeholder="Juli"
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold">Minggu</label>
                    <input
                      value={form.week_name}
                      onChange={(event) =>
                        setForm({ ...form, week_name: event.target.value })
                      }
                      placeholder="Minggu 1"
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    />
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
                    placeholder="4 JP"
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
                    <option value="planned">Planned</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                <div className="sticky bottom-0 -mx-6 mt-5 border-t border-[#E8D6C1] bg-[#FAF3EA] px-6 pb-1 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-xl bg-[#7A1F2B] py-3 text-sm font-bold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Menyimpan..." : "Simpan Program"}
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