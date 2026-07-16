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
};

type SubjectOption = {
  id: string;
  name: string;
};

type FrameworkQueryResult = {
  id: string;
  teacher_id: string | null;
  subject_id: string | null;
  student_id: string | null;
  curriculum: string | null;
  class_level: string | null;
  chapter: string | null;
  material_topic: string | null;
  time_allocation: string | null;
  implementation_status: string | null;
  notes: string | null;
  students: StudentOption | StudentOption[] | null;
  teachers: TeacherOption | TeacherOption[] | null;
  subjects: SubjectOption | SubjectOption[] | null;
};

type Framework = {
  id: string;
  teacher_id: string | null;
  subject_id: string | null;
  student_id: string | null;
  curriculum: string | null;
  class_level: string | null;
  chapter: string | null;
  material_topic: string | null;
  time_allocation: string | null;
  implementation_status: string | null;
  notes: string | null;
  students: StudentOption | null;
  teachers: TeacherOption | null;
  subjects: SubjectOption | null;
};

type FrameworkForm = {
  student_id: string;
  teacher_id: string;
  subject_id: string;
  curriculum: string;
  class_level: string;
  chapter: string;
  material_topic: string;
  time_allocation: string;
  implementation_status: string;
  notes: string;
};

const initialForm: FrameworkForm = {
  student_id: "",
  teacher_id: "",
  subject_id: "",
  curriculum: "Kurikulum Merdeka",
  class_level: "",
  chapter: "",
  material_topic: "",
  time_allocation: "",
  implementation_status: "T",
  notes: "",
};

function normalizeRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

export default function KepalaSekolahKerangkaMateriPage() {
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [teacherFilter, setTeacherFilter] = useState("Semua Guru");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<FrameworkForm>(initialForm);
  const [errorMessage, setErrorMessage] = useState("");

  async function fetchOptions() {
    const [studentsRes, teachersRes, subjectsRes] = await Promise.all([
      supabase
        .from("students")
        .select("id, full_name, level, grade, nis, nisn")
        .order("full_name", { ascending: true }),
      supabase.from("teachers").select("id, full_name").order("full_name"),
      supabase.from("subjects").select("id, name").order("name"),
    ]);

    setStudents(studentsRes.data || []);
    setTeachers(teachersRes.data || []);
    setSubjects(subjectsRes.data || []);
  }

  async function fetchFrameworks() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("material_frameworks")
      .select(
        `
        id,
        teacher_id,
        subject_id,
        student_id,
        curriculum,
        class_level,
        chapter,
        material_topic,
        time_allocation,
        implementation_status,
        notes,
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

    const rows = (data || []) as FrameworkQueryResult[];

    setFrameworks(
      rows.map((item) => ({
        id: item.id,
        teacher_id: item.teacher_id,
        subject_id: item.subject_id,
        student_id: item.student_id,
        curriculum: item.curriculum,
        class_level: item.class_level,
        chapter: item.chapter,
        material_topic: item.material_topic,
        time_allocation: item.time_allocation,
        implementation_status: item.implementation_status,
        notes: item.notes,
        students: normalizeRelation(item.students),
        teachers: normalizeRelation(item.teachers),
        subjects: normalizeRelation(item.subjects),
      }))
    );

    setLoading(false);
  }

  async function fetchAllData() {
    await Promise.all([fetchOptions(), fetchFrameworks()]);
  }

  useEffect(() => {
    fetchAllData();
  }, []);

  const filteredFrameworks = useMemo(() => {
    const keyword = search.toLowerCase();

    return frameworks.filter((item) => {
      const matchSearch =
        item.students?.full_name?.toLowerCase().includes(keyword) ||
        item.teachers?.full_name?.toLowerCase().includes(keyword) ||
        item.subjects?.name?.toLowerCase().includes(keyword) ||
        item.curriculum?.toLowerCase().includes(keyword) ||
        item.chapter?.toLowerCase().includes(keyword) ||
        item.material_topic?.toLowerCase().includes(keyword);

      const matchTeacher =
        teacherFilter === "Semua Guru" ||
        item.teachers?.full_name === teacherFilter;

      return matchSearch && matchTeacher;
    });
  }, [frameworks, search, teacherFilter]);

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

    if (!form.material_topic.trim()) {
      setErrorMessage("Materi wajib diisi.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from("material_frameworks").insert({
        student_id: form.student_id,
        teacher_id: form.teacher_id,
        subject_id: form.subject_id,
        curriculum: form.curriculum.trim(),
        class_level: form.class_level.trim() || null,
        chapter: form.chapter.trim() || null,
        material_topic: form.material_topic.trim(),
        time_allocation: form.time_allocation.trim() || null,
        implementation_status: form.implementation_status,
        notes: form.notes.trim() || null,
      });

      if (error) throw new Error(error.message);

      setForm(initialForm);
      setIsModalOpen(false);
      await fetchFrameworks();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal menyimpan materi."
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
      activeMenu="Kerangka Materi"
      searchPlaceholder="Cari kerangka materi..."
      buttonLabel="+ Tambah Materi"
    >
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[30px] font-bold tracking-tight">
            Kerangka Materi
          </h1>
          <p className="mt-1 text-sm text-[#6B4A3A]">
            Kelola kerangka materi ajar berdasarkan siswa, guru, dan mata
            pelajaran.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="rounded-xl bg-[#7A1F2B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#54131D]"
        >
          + Tambah Materi
        </button>
      </div>

      <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
        <div className="grid grid-cols-[1fr_220px] gap-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari siswa, guru, mapel, kurikulum, bab, materi..."
            className="w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
          />

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
          <table className="w-full min-w-[1150px] text-left">
            <thead className="bg-[#FFF8EF] text-sm font-bold text-[#6B4A3A]">
              <tr>
                <th className="px-4 py-4">Siswa</th>
                <th className="px-4 py-4">NISN</th>
                <th className="px-4 py-4">Guru</th>
                <th className="px-4 py-4">Mapel</th>
                <th className="px-4 py-4">Kurikulum</th>
                <th className="px-4 py-4">Kelas</th>
                <th className="px-4 py-4">BAB</th>
                <th className="px-4 py-4">Materi</th>
                <th className="px-4 py-4">AW</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Catatan</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E8D6C1]">
              {loading && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-sm">
                    Loading kerangka materi...
                  </td>
                </tr>
              )}

              {!loading && filteredFrameworks.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-sm">
                    Belum ada data kerangka materi.
                  </td>
                </tr>
              )}

              {!loading &&
                filteredFrameworks.map((item) => (
                  <tr key={item.id} className="hover:bg-[#FFF8EF]">
                    <td className="px-4 py-4 font-semibold">
                      {item.students?.full_name || "-"}
                    </td>
                    <td className="px-4 py-4">
                      {item.students?.nisn || "-"}
                    </td>
                    <td className="px-4 py-4">
                      {item.teachers?.full_name || "-"}
                    </td>
                    <td className="px-4 py-4">{item.subjects?.name || "-"}</td>
                    <td className="px-4 py-4">{item.curriculum || "-"}</td>
                    <td className="px-4 py-4">{item.class_level || "-"}</td>
                    <td className="px-4 py-4">{item.chapter || "-"}</td>
                    <td className="px-4 py-4 font-semibold">
                      {item.material_topic || "-"}
                    </td>
                    <td className="px-4 py-4">
                      {item.time_allocation || "-"}
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-[#FDE7D7] px-3 py-1 text-xs font-bold text-[#7A1F2B]">
                        {item.implementation_status || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-4">{item.notes || "-"}</td>
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
              <h2 className="text-xl font-bold">Tambah Kerangka Materi</h2>
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

                <div>
                  <label className="text-sm font-bold">Kurikulum</label>
                  <input
                    value={form.curriculum}
                    onChange={(event) =>
                      setForm({ ...form, curriculum: event.target.value })
                    }
                    placeholder="Kurikulum Merdeka"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
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
                </div>

                <div>
                  <label className="text-sm font-bold">Materi</label>
                  <input
                    value={form.material_topic}
                    onChange={(event) =>
                      setForm({ ...form, material_topic: event.target.value })
                    }
                    placeholder="Siklus Air"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
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
                    placeholder="2 x 60 menit"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Status Pelaksanaan</label>
                  <select
                    value={form.implementation_status}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        implementation_status: event.target.value,
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  >
                    <option value="T">T - Terlaksana</option>
                    <option value="B">B - Berjalan</option>
                    <option value="P">P - Pending</option>
                    <option value="TM">TM - Tidak Masuk</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-bold">Catatan</label>
                  <textarea
                    value={form.notes}
                    onChange={(event) =>
                      setForm({ ...form, notes: event.target.value })
                    }
                    rows={3}
                    placeholder="Catatan materi..."
                    className="mt-2 w-full resize-none rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div className="sticky bottom-0 -mx-6 mt-5 border-t border-[#E8D6C1] bg-[#FAF3EA] px-6 pb-1 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-xl bg-[#7A1F2B] py-3 text-sm font-bold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Menyimpan..." : "Simpan Materi"}
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