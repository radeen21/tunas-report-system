"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import KepalaSekolahLayout from "../components/KepalaSekolahLayout";

type Teacher = {
  id: string;
  full_name: string;
  email: string | null;
};

type Parent = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  relation: string | null;
};

type Student = {
  id: string;
  nis: string | null;
  nisn: string | null;
  full_name: string;
  level: string | null;
  grade: string | null;
  academic_year: string | null;
  birth_date: string | null;
  progress: number | null;
  attendance: number | null;
  parent_id: string | null;
  homeroom_teacher_id: string | null;
  parents: Parent | null;
  teachers: Teacher | null;
};

type StudentForm = {
  full_name: string;
  birth_date: string;
  nis: string;
  nisn: string;
  level: string;
  grade: string;
  parent_name: string;
  teacher_id: string;
  academic_year: string;
};

const initialForm: StudentForm = {
  full_name: "",
  birth_date: "",
  nis: "",
  nisn: "",
  level: "Primary Level",
  grade: "",
  parent_name: "",
  teacher_id: "",
  academic_year: "2025/2026",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatBirthDate(date: string | null) {
  if (!date) return "-";

  const parsedDate = new Date(date);

  return parsedDate.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function KepalaSekolahStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [programFilter, setProgramFilter] = useState("Semua Program");
  const [teacherFilter, setTeacherFilter] = useState("Semua Guru");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<StudentForm>(initialForm);
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

  async function fetchStudents() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("students")
      .select(
        `
        id,
        nis,
        nisn,
        full_name,
        level,
        grade,
        academic_year,
        birth_date,
        progress,
        attendance,
        parent_id,
        homeroom_teacher_id,
        parents (
          id,
          full_name,
          email,
          phone,
          relation
        ),
        teachers (
          id,
          full_name,
          email
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

    const normalizedStudents: Student[] = (data || []).map((item) => {
      const parentData = Array.isArray(item.parents)
        ? item.parents[0] || null
        : item.parents || null;

      const teacherData = Array.isArray(item.teachers)
        ? item.teachers[0] || null
        : item.teachers || null;

      return {
        id: item.id,
        nis: item.nis,
        nisn: item.nisn,
        full_name: item.full_name,
        level: item.level,
        grade: item.grade,
        academic_year: item.academic_year,
        birth_date: item.birth_date,
        progress: item.progress,
        attendance: item.attendance,
        parent_id: item.parent_id,
        homeroom_teacher_id: item.homeroom_teacher_id,
        parents: parentData,
        teachers: teacherData,
      };
    });

    setStudents(normalizedStudents);
    setLoading(false);
  }

  useEffect(() => {
    fetchTeachers();
    fetchStudents();
  }, []);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const keyword = search.toLowerCase();

      const matchSearch =
        student.full_name.toLowerCase().includes(keyword) ||
        student.nis?.toLowerCase().includes(keyword) ||
        student.nisn?.toLowerCase().includes(keyword) ||
        student.parents?.full_name?.toLowerCase().includes(keyword) ||
        student.teachers?.full_name?.toLowerCase().includes(keyword);

      const matchProgram =
        programFilter === "Semua Program" || student.level === programFilter;

      const matchTeacher =
        teacherFilter === "Semua Guru" ||
        student.teachers?.full_name === teacherFilter;

      return matchSearch && matchProgram && matchTeacher;
    });
  }, [students, search, programFilter, teacherFilter]);

  const totalPrimary = students.filter(
    (student) => student.level === "Primary Level"
  ).length;

  const totalSecondary = students.filter(
    (student) => student.level === "Secondary Level"
  ).length;

  const totalEarly = students.filter(
    (student) => student.level === "Early Learning"
  ).length;

  async function findOrCreateParent(parentName: string) {
    const cleanedName = parentName.trim();

    if (!cleanedName) return null;

    const { data: existingParent, error: findError } = await supabase
      .from("parents")
      .select("id, full_name")
      .ilike("full_name", cleanedName)
      .maybeSingle();

    if (findError) {
      throw new Error(findError.message);
    }

    if (existingParent) {
      return existingParent.id;
    }

    const { data: newParent, error: insertError } = await supabase
      .from("parents")
      .insert({
        full_name: cleanedName,
        relation: "Orang Tua",
      })
      .select("id")
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    return newParent.id;
  }

  async function handleSubmitStudent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (!form.full_name.trim()) {
      setErrorMessage("Nama lengkap wajib diisi.");
      return;
    }

    if (!form.nis.trim()) {
      setErrorMessage("NIS wajib diisi.");
      return;
    }

    if (!form.nisn.trim()) {
      setErrorMessage("NISN wajib diisi.");
      return;
    }

    if (!form.teacher_id) {
      setErrorMessage("Guru pendamping wajib dipilih.");
      return;
    }

    setSaving(true);

    try {
      const parentId = await findOrCreateParent(form.parent_name);

      const { error } = await supabase.from("students").insert({
        full_name: form.full_name.trim(),
        birth_date: form.birth_date || null,
        nis: form.nis.trim(),
        nisn: form.nisn.trim(),
        level: form.level,
        grade: form.grade.trim(),
        parent_id: parentId,
        homeroom_teacher_id: form.teacher_id,
        academic_year: form.academic_year,
        progress: 0,
        attendance: 0,
        status: "active",
      });

      if (error) {
        throw new Error(error.message);
      }

      setForm(initialForm);
      setIsModalOpen(false);
      await fetchStudents();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal menyimpan data siswa.");
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
      activeMenu="Siswa"
      searchPlaceholder="Cari siswa, NIS, NISN, orang tua, atau guru..."
      buttonLabel="+ Tambah Siswa"
    >
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[30px] font-bold tracking-tight">Data Siswa</h1>
          <p className="mt-1 text-sm text-[#6B4A3A]">
            Kelola data siswa, NIS, NISN, orang tua, guru pendamping, dan
            progress belajar.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setErrorMessage("");
            setIsModalOpen(true);
          }}
          className="rounded-xl bg-[#7A1F2B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#54131D]"
        >
          + Tambah Siswa
        </button>
      </div>

      <div className="mt-7 grid grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#6B4A3A]">Total Siswa</p>
          <p className="mt-4 text-3xl font-bold">{students.length}</p>
        </div>

        <div className="rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#6B4A3A]">Primary Level</p>
          <p className="mt-4 text-3xl font-bold">{totalPrimary}</p>
        </div>

        <div className="rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#6B4A3A]">Secondary Level</p>
          <p className="mt-4 text-3xl font-bold">{totalSecondary}</p>
        </div>

        <div className="rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#6B4A3A]">Early Learning</p>
          <p className="mt-4 text-3xl font-bold">{totalEarly}</p>
        </div>
      </div>

      <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
        <div className="grid grid-cols-[1fr_200px_200px] gap-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama siswa..."
            className="w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
          />

          <select
            value={programFilter}
            onChange={(event) => setProgramFilter(event.target.value)}
            className="rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
          >
            <option>Semua Program</option>
            <option>Primary Level</option>
            <option>Secondary Level</option>
            <option>Early Learning</option>
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

      <div className="mt-7 overflow-hidden rounded-2xl border border-[#E8D6C1] bg-white shadow-sm">
        <div className="border-b border-[#E8D6C1] p-6">
          <h2 className="text-lg font-bold">Daftar Siswa</h2>
          <p className="mt-1 text-sm text-[#6B4A3A]">
            Data siswa aktif Homeschooling Tunas Karya Bangsa.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left">
            <thead className="bg-[#FFF8EF] text-xs uppercase text-[#6B4A3A]">
              <tr>
                <th className="px-6 py-4">Siswa</th>
                <th className="px-6 py-4">NIS / NISN</th>
                <th className="px-6 py-4">Level / Program</th>
                <th className="px-6 py-4">Orang Tua</th>
                <th className="px-6 py-4">Guru</th>
                <th className="px-6 py-4">Progress</th>
                <th className="px-6 py-4">Attendance</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E8D6C1]">
              {loading && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-sm">
                    Loading data siswa...
                  </td>
                </tr>
              )}

              {!loading && filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-sm">
                    Belum ada data siswa.
                  </td>
                </tr>
              )}

              {!loading &&
                filteredStudents.map((student) => {
                  const progress = Number(student.progress || 0);
                  const attendance = Number(student.attendance || 0);

                  return (
                    <tr key={student.id} className="hover:bg-[#FFF8EF]">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FDE7D7] text-sm font-bold text-[#7A1F2B]">
                            {getInitials(student.full_name)}
                          </div>

                          <div>
                            <p className="font-bold">{student.full_name}</p>
                            <p className="text-sm text-[#6B4A3A]">
                              Lahir: {formatBirthDate(student.birth_date)}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <p className="font-bold">{student.nis || "-"}</p>
                        <p className="text-sm text-[#6B4A3A]">
                          {student.nisn || "-"}
                        </p>
                      </td>

                      <td className="px-6 py-5">
                        <p className="font-bold">
                          {student.level || "-"}
                          {student.grade ? ` — ${student.grade}` : ""}
                        </p>
                        <p className="text-sm text-[#6B4A3A]">
                          {student.level || "-"}
                        </p>
                      </td>

                      <td className="px-6 py-5 text-sm text-[#6B4A3A]">
                        {student.parents?.full_name || "-"}
                      </td>

                      <td className="px-6 py-5 text-sm text-[#6B4A3A]">
                        {student.teachers?.full_name || "-"}
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-[#E8D6C1]">
                            <div
                              className="h-full rounded-full bg-[#7A1F2B]"
                              style={{ width: `${progress}%` }}
                            />
                          </div>

                          <span className="text-sm font-bold">
                            {progress}%
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                          {attendance}%
                        </span>
                      </td>

                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className="rounded-lg border border-[#E8D6C1] px-3 py-2 text-xs font-bold"
                          >
                            View
                          </button>

                          <button
                            type="button"
                            className="rounded-lg bg-[#7A1F2B] px-3 py-2 text-xs font-bold text-white"
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
          <div className="flex max-h-[88vh] w-full max-w-[440px] flex-col overflow-hidden rounded-2xl bg-[#FAF3EA] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E8D6C1] px-6 py-5">
              <h2 className="text-xl font-bold">Tambah Murid Baru</h2>

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

              <form onSubmit={handleSubmitStudent} className="space-y-4">
                <div>
                  <label className="text-sm font-bold">Nama Lengkap</label>
                  <input
                    value={form.full_name}
                    onChange={(event) =>
                      setForm({ ...form, full_name: event.target.value })
                    }
                    placeholder="Nama murid"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-bold">Tanggal Lahir</label>
                    <input
                      type="date"
                      value={form.birth_date}
                      onChange={(event) =>
                        setForm({ ...form, birth_date: event.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold">Level</label>
                    <select
                      value={form.level}
                      onChange={(event) =>
                        setForm({ ...form, level: event.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    >
                      <option>Primary Level</option>
                      <option>Secondary Level</option>
                      <option>Early Learning</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-bold">NIS</label>
                    <input
                      value={form.nis}
                      onChange={(event) =>
                        setForm({ ...form, nis: event.target.value })
                      }
                      placeholder="HSTKB-002"
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold">NISN</label>
                    <input
                      value={form.nisn}
                      onChange={(event) =>
                        setForm({ ...form, nisn: event.target.value })
                      }
                      placeholder="005104212"
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold">Grade / Kelas</label>
                  <input
                    value={form.grade}
                    onChange={(event) =>
                      setForm({ ...form, grade: event.target.value })
                    }
                    placeholder="Contoh: Grade 4"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Orang Tua</label>
                  <input
                    value={form.parent_name}
                    onChange={(event) =>
                      setForm({ ...form, parent_name: event.target.value })
                    }
                    placeholder="Nama orang tua"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Guru Pendamping</label>
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

                <div className="sticky bottom-0 -mx-6 mt-5 border-t border-[#E8D6C1] bg-[#FAF3EA] px-6 pb-1 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-xl bg-[#7A1F2B] py-3 text-sm font-bold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Menyimpan..." : "Simpan Murid"}
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