"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import KepalaSekolahLayout from "../components/KepalaSekolahLayout";

type StudentOption = {
  id: string;
  full_name: string;
  nis: string | null;
  nisn: string | null;
  grade: string | null;
};

type TeacherOption = {
  id: string;
  full_name: string;
};

type SubjectOption = {
  id: string;
  name: string;
};

type AllocationQueryResult = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  class_level: string | null;
  academic_year: string | null;
  semester: string | null;
  month_name: string | null;
  week_1: string | null;
  week_2: string | null;
  week_3: string | null;
  week_4: string | null;
  total_allocation: string | null;
  students: StudentOption | StudentOption[] | null;
  teachers: TeacherOption | TeacherOption[] | null;
  subjects: SubjectOption | SubjectOption[] | null;
};

type Allocation = AllocationQueryResult & {
  students: StudentOption | null;
  teachers: TeacherOption | null;
  subjects: SubjectOption | null;
};

type AllocationForm = {
  student_id: string;
  teacher_id: string;
  subject_id: string;
  class_level: string;
  academic_year: string;
  semester: string;
  month_name: string;
  week_1: string;
  week_2: string;
  week_3: string;
  week_4: string;
  total_allocation: string;
};

const initialForm: AllocationForm = {
  student_id: "",
  teacher_id: "",
  subject_id: "",
  class_level: "",
  academic_year: "2025/2026",
  semester: "Genap",
  month_name: "",
  week_1: "",
  week_2: "",
  week_3: "",
  week_4: "",
  total_allocation: "",
};

function normalizeRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

export default function KepalaSekolahAlokasiWaktuPage() {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("Semua Semester");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<AllocationForm>(initialForm);
  const [errorMessage, setErrorMessage] = useState("");

  async function fetchOptions() {
    const [studentsRes, teachersRes, subjectsRes] = await Promise.all([
      supabase
        .from("students")
        .select("id, full_name, nis, nisn, grade")
        .order("full_name"),
      supabase.from("teachers").select("id, full_name").order("full_name"),
      supabase.from("subjects").select("id, name").order("name"),
    ]);

    setStudents(studentsRes.data || []);
    setTeachers(teachersRes.data || []);
    setSubjects(subjectsRes.data || []);
  }

  async function fetchAllocations() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("time_allocations")
      .select(
        `
        id,
        student_id,
        teacher_id,
        subject_id,
        class_level,
        academic_year,
        semester,
        month_name,
        week_1,
        week_2,
        week_3,
        week_4,
        total_allocation,
        students (
          id,
          full_name,
          nis,
          nisn,
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

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    const rows = (data || []) as AllocationQueryResult[];

    setAllocations(
      rows.map((item) => ({
        ...item,
        students: normalizeRelation(item.students),
        teachers: normalizeRelation(item.teachers),
        subjects: normalizeRelation(item.subjects),
      }))
    );

    setLoading(false);
  }

  async function fetchAllData() {
    await Promise.all([fetchOptions(), fetchAllocations()]);
  }

  useEffect(() => {
    fetchAllData();
  }, []);

  const filteredAllocations = useMemo(() => {
    const keyword = search.toLowerCase();

    return allocations.filter((item) => {
      const matchSearch =
        item.students?.full_name?.toLowerCase().includes(keyword) ||
        item.teachers?.full_name?.toLowerCase().includes(keyword) ||
        item.subjects?.name?.toLowerCase().includes(keyword) ||
        item.class_level?.toLowerCase().includes(keyword) ||
        item.month_name?.toLowerCase().includes(keyword);

      const matchSemester =
        semesterFilter === "Semua Semester" || item.semester === semesterFilter;

      return matchSearch && matchSemester;
    });
  }, [allocations, search, semesterFilter]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (!form.student_id) {
      setErrorMessage("Siswa wajib dipilih.");
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

    if (!form.class_level.trim()) {
      setErrorMessage("Kelas wajib diisi.");
      return;
    }

    if (!form.month_name.trim()) {
      setErrorMessage("Bulan wajib diisi.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from("time_allocations").insert({
        student_id: form.student_id,
        teacher_id: form.teacher_id,
        subject_id: form.subject_id,
        class_level: form.class_level.trim(),
        academic_year: form.academic_year.trim(),
        semester: form.semester,
        month_name: form.month_name.trim(),
        week_1: form.week_1.trim() || null,
        week_2: form.week_2.trim() || null,
        week_3: form.week_3.trim() || null,
        week_4: form.week_4.trim() || null,
        total_allocation: form.total_allocation.trim() || null,
      });

      if (error) throw new Error(error.message);

      setForm(initialForm);
      setIsModalOpen(false);
      await fetchAllocations();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal menyimpan alokasi."
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
      activeMenu="Alokasi Waktu"
      searchPlaceholder="Cari alokasi waktu..."
      buttonLabel="+ Tambah Alokasi"
    >
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[30px] font-bold tracking-tight">
            Alokasi Waktu
          </h1>
          <p className="mt-1 text-sm text-[#6B4A3A]">
            Kelola prediksi alokasi waktu pembelajaran per siswa dan mapel.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="rounded-xl bg-[#7A1F2B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#54131D]"
        >
          + Tambah Alokasi
        </button>
      </div>

      <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
        <div className="grid grid-cols-[1fr_220px] gap-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari siswa, guru, mapel, kelas, bulan..."
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
        </div>
      </div>

      {errorMessage && !isModalOpen && (
        <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="mt-7 overflow-hidden rounded-2xl border border-[#E8D6C1] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left">
            <thead className="bg-[#FFF8EF] text-sm font-bold text-[#6B4A3A]">
              <tr>
                <th className="px-4 py-4">Siswa</th>
                <th className="px-4 py-4">NIS</th>
                <th className="px-4 py-4">NISN</th>
                <th className="px-4 py-4">Guru</th>
                <th className="px-4 py-4">Mapel</th>
                <th className="px-4 py-4">Kelas</th>
                <th className="px-4 py-4">Tahun</th>
                <th className="px-4 py-4">Semester</th>
                <th className="px-4 py-4">Bulan</th>
                <th className="px-4 py-4">M1</th>
                <th className="px-4 py-4">M2</th>
                <th className="px-4 py-4">M3</th>
                <th className="px-4 py-4">M4</th>
                <th className="px-4 py-4">Total</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E8D6C1]">
              {loading && (
                <tr>
                  <td colSpan={14} className="px-4 py-8 text-center text-sm">
                    Loading alokasi waktu...
                  </td>
                </tr>
              )}

              {!loading && filteredAllocations.length === 0 && (
                <tr>
                  <td colSpan={14} className="px-4 py-8 text-center text-sm">
                    Belum ada data alokasi waktu.
                  </td>
                </tr>
              )}

              {!loading &&
                filteredAllocations.map((item) => (
                  <tr key={item.id} className="hover:bg-[#FFF8EF]">
                    <td className="px-4 py-4 font-semibold">
                      {item.students?.full_name || "-"}
                    </td>
                    <td className="px-4 py-4">{item.students?.nis || "-"}</td>
                    <td className="px-4 py-4">{item.students?.nisn || "-"}</td>
                    <td className="px-4 py-4">
                      {item.teachers?.full_name || "-"}
                    </td>
                    <td className="px-4 py-4">{item.subjects?.name || "-"}</td>
                    <td className="px-4 py-4">{item.class_level || "-"}</td>
                    <td className="px-4 py-4">{item.academic_year || "-"}</td>
                    <td className="px-4 py-4">{item.semester || "-"}</td>
                    <td className="px-4 py-4">{item.month_name || "-"}</td>
                    <td className="px-4 py-4">{item.week_1 || "-"}</td>
                    <td className="px-4 py-4">{item.week_2 || "-"}</td>
                    <td className="px-4 py-4">{item.week_3 || "-"}</td>
                    <td className="px-4 py-4">{item.week_4 || "-"}</td>
                    <td className="px-4 py-4 font-bold">
                      {item.total_allocation || "-"}
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
              <h2 className="text-xl font-bold">Tambah Alokasi Waktu</h2>
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
                  <label className="text-sm font-bold">Siswa</label>
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
                        setForm({
                          ...form,
                          academic_year: event.target.value,
                        })
                      }
                      placeholder="2025/2026"
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
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={form.week_1}
                    onChange={(event) =>
                      setForm({ ...form, week_1: event.target.value })
                    }
                    placeholder="Minggu 1"
                    className="rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                  <input
                    value={form.week_2}
                    onChange={(event) =>
                      setForm({ ...form, week_2: event.target.value })
                    }
                    placeholder="Minggu 2"
                    className="rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                  <input
                    value={form.week_3}
                    onChange={(event) =>
                      setForm({ ...form, week_3: event.target.value })
                    }
                    placeholder="Minggu 3"
                    className="rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                  <input
                    value={form.week_4}
                    onChange={(event) =>
                      setForm({ ...form, week_4: event.target.value })
                    }
                    placeholder="Minggu 4"
                    className="rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Total Alokasi</label>
                  <input
                    value={form.total_allocation}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        total_allocation: event.target.value,
                      })
                    }
                    placeholder="8 JP"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div className="sticky bottom-0 -mx-6 mt-5 border-t border-[#E8D6C1] bg-[#FAF3EA] px-6 pb-1 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-xl bg-[#7A1F2B] py-3 text-sm font-bold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Menyimpan..." : "Simpan Alokasi"}
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