"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import KepalaSekolahLayout from "../components/KepalaSekolahLayout";

type Teacher = {
  id: string;
  user_id: string | null;
  teacher_code: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  subjects: string[] | null;
  status: string | null;
};

type StudentTeacher = {
  id: string;
  full_name: string;
  email: string | null;
};

type Student = {
  id: string;
  full_name: string;
  level: string | null;
  grade: string | null;
  nis: string | null;
  homeroom_teacher_id: string | null;
  teachers: StudentTeacher | null;
};

type KbmReport = {
  id: string;
  teacher_id: string | null;
};

type TeacherForm = {
  full_name: string;
  email: string;
  phone: string;
  teacher_code: string;
  subjects: string;
  status: string;
};

const initialForm: TeacherForm = {
  full_name: "",
  email: "",
  phone: "",
  teacher_code: "",
  subjects: "",
  status: "active",
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

function normalizeSubjects(subjects: string[] | null) {
  if (!subjects || subjects.length === 0) return [];

  return subjects;
}

export default function KepalaSekolahTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [kbmReports, setKbmReports] = useState<KbmReport[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<TeacherForm>(initialForm);
  const [errorMessage, setErrorMessage] = useState("");

  async function fetchTeachers() {
    const { data, error } = await supabase
      .from("teachers")
      .select("id, user_id, teacher_code, full_name, email, phone, subjects, status")
      .order("full_name", { ascending: true });

    if (error) {
      console.error(error.message);
      setErrorMessage(error.message);
      return;
    }

    setTeachers(data || []);
  }

  async function fetchStudents() {
    const { data, error } = await supabase
      .from("students")
      .select(
        `
        id,
        full_name,
        level,
        grade,
        nis,
        homeroom_teacher_id,
        teachers (
          id,
          full_name,
          email
        )
      `
      )
      .order("full_name", { ascending: true });

    if (error) {
      console.error(error.message);
      return;
    }

    const normalizedStudents: Student[] = (data || []).map((item) => {
      const teacherData = Array.isArray(item.teachers)
        ? item.teachers[0] || null
        : item.teachers || null;

      return {
        id: item.id,
        full_name: item.full_name,
        level: item.level,
        grade: item.grade,
        nis: item.nis,
        homeroom_teacher_id: item.homeroom_teacher_id,
        teachers: teacherData,
      };
    });

    setStudents(normalizedStudents);
  }

  async function fetchKbmReports() {
    const { data, error } = await supabase
      .from("kbm_reports")
      .select("id, teacher_id");

    if (error) {
      console.error(error.message);
      return;
    }

    setKbmReports(data || []);
  }

  async function fetchAllData() {
    setLoading(true);
    setErrorMessage("");

    await Promise.all([fetchTeachers(), fetchStudents(), fetchKbmReports()]);

    setLoading(false);
  }

  useEffect(() => {
    fetchAllData();
  }, []);

  const filteredTeachers = useMemo(() => {
    const keyword = search.toLowerCase();

    return teachers.filter((teacher) => {
      const subjectText = normalizeSubjects(teacher.subjects)
        .join(" ")
        .toLowerCase();

      return (
        teacher.full_name.toLowerCase().includes(keyword) ||
        teacher.email?.toLowerCase().includes(keyword) ||
        teacher.teacher_code?.toLowerCase().includes(keyword) ||
        subjectText.includes(keyword)
      );
    });
  }, [teachers, search]);

  function getStudentCountByTeacher(teacherId: string) {
    return students.filter(
      (student) => student.homeroom_teacher_id === teacherId
    ).length;
  }

  function getReportCountByTeacher(teacherId: string) {
    return kbmReports.filter((report) => report.teacher_id === teacherId)
      .length;
  }

  async function findOrCreateTeacherUser() {
    const email = form.email.trim().toLowerCase();

    const { data: existingUser, error: findError } = await supabase
      .from("users_profile")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    if (findError) {
      throw new Error(findError.message);
    }

    if (existingUser) {
      return existingUser.id;
    }

    const { data: newUser, error: insertError } = await supabase
      .from("users_profile")
      .insert({
        full_name: form.full_name.trim(),
        email,
        role: "guru",
        phone: form.phone.trim() || null,
        is_active: true,
      })
      .select("id")
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    return newUser.id;
  }

  async function handleSubmitTeacher(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (!form.full_name.trim()) {
      setErrorMessage("Nama guru wajib diisi.");
      return;
    }

    if (!form.email.trim()) {
      setErrorMessage("Email guru wajib diisi.");
      return;
    }

    if (!form.teacher_code.trim()) {
      setErrorMessage("Kode guru wajib diisi.");
      return;
    }

    if (!form.subjects.trim()) {
      setErrorMessage("Mata pelajaran wajib diisi.");
      return;
    }

    setSaving(true);

    try {
      const userId = await findOrCreateTeacherUser();

      const subjectList = form.subjects
        .split(",")
        .map((subject) => subject.trim())
        .filter(Boolean);

      const { error } = await supabase.from("teachers").insert({
        user_id: userId,
        teacher_code: form.teacher_code.trim(),
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || null,
        subjects: subjectList,
        status: form.status,
      });

      if (error) {
        throw new Error(error.message);
      }

      setForm(initialForm);
      setIsModalOpen(false);
      await fetchAllData();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal menyimpan data guru.");
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
      activeMenu="Guru"
      searchPlaceholder="Cari murid, guru, atau report..."
      buttonLabel="+ Tambah Guru"
    >
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[30px] font-bold tracking-tight">
            Teacher Management
          </h1>
          <p className="mt-1 text-sm text-[#6B4A3A]">
            Kelola guru dan assign ke murid.
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
          + Add Teacher
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari nama guru, kode guru, email, atau mata pelajaran..."
          className="w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
        />
      </div>

      {errorMessage && !isModalOpen && (
        <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {loading && (
        <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-8 text-center text-sm shadow-sm">
          Loading data guru...
        </div>
      )}

      {!loading && filteredTeachers.length === 0 && (
        <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-8 text-center text-sm shadow-sm">
          Belum ada data guru.
        </div>
      )}

      {!loading && filteredTeachers.length > 0 && (
        <div className="mt-7 grid grid-cols-3 gap-5">
          {filteredTeachers.map((teacher) => {
            const subjects = normalizeSubjects(teacher.subjects);
            const studentCount = getStudentCountByTeacher(teacher.id);
            const reportCount = getReportCountByTeacher(teacher.id);

            return (
              <div
                key={teacher.id}
                className="overflow-hidden rounded-2xl border border-[#E8D6C1] bg-white shadow-sm"
              >
                <div className="h-[70px] bg-gradient-to-r from-[#7A1F2B] to-[#D96B2B]" />

                <div className="px-6 pb-6">
                  <div className="-mt-9 flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-white bg-[#FDE7D7] text-lg font-bold text-[#7A1F2B] shadow-sm">
                    {getInitials(teacher.full_name)}
                  </div>

                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold">{teacher.full_name}</h2>
                      <p className="mt-1 text-sm text-[#6B4A3A]">
                        {teacher.email || "-"}
                      </p>
                      <p className="mt-1 text-xs text-[#9B8175]">
                        {teacher.teacher_code || "-"} •{" "}
                        {teacher.status || "active"}
                      </p>
                    </div>

                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                      Active
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {subjects.length > 0 ? (
                      subjects.map((subject) => (
                        <span
                          key={`${teacher.id}-${subject}`}
                          className="rounded-full bg-[#F1DFD5] px-3 py-1 text-xs font-bold text-[#7A1F2B]"
                        >
                          {subject}
                        </span>
                      ))
                    ) : (
                      <span className="rounded-full bg-[#F1DFD5] px-3 py-1 text-xs font-bold text-[#7A1F2B]">
                        Belum ada mapel
                      </span>
                    )}
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-[#FFF8EF] p-4">
                      <p className="text-sm text-[#6B4A3A]">👥 Murid</p>
                      <p className="mt-2 text-2xl font-bold">{studentCount}</p>
                    </div>

                    <div className="rounded-xl bg-[#FFF8EF] p-4">
                      <p className="text-sm text-[#6B4A3A]">📖 Reports</p>
                      <p className="mt-2 text-2xl font-bold">{reportCount}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] px-4 py-2 text-sm font-bold transition hover:bg-white"
                    >
                      View Reports
                    </button>

                    <button
                      type="button"
                      className="rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] px-4 py-2 text-sm font-bold transition hover:bg-white"
                    >
                      Assign
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold">Assignment Matrix</h2>
        <p className="mt-1 text-sm text-[#6B4A3A]">
          Daftar murid dan guru pendamping yang sedang aktif.
        </p>

        <div className="mt-5 overflow-hidden rounded-xl border border-[#E8D6C1]">
          <table className="w-full text-left">
            <thead className="bg-[#FFF8EF] text-xs uppercase text-[#6B4A3A]">
              <tr>
                <th className="px-5 py-4">Murid</th>
                <th className="px-5 py-4">Level</th>
                <th className="px-5 py-4">NIS</th>
                <th className="px-5 py-4">Guru Pendamping</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E8D6C1]">
              {students.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-sm">
                    Belum ada data murid.
                  </td>
                </tr>
              )}

              {students.map((student) => (
                <tr key={student.id} className="hover:bg-[#FFF8EF]">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FDE7D7] text-xs font-bold text-[#7A1F2B]">
                        {getInitials(student.full_name)}
                      </div>

                      <p className="font-bold">{student.full_name}</p>
                    </div>
                  </td>

                  <td className="px-5 py-4 text-sm text-[#6B4A3A]">
                    {student.level || "-"}
                    {student.grade ? ` — ${student.grade}` : ""}
                  </td>

                  <td className="px-5 py-4 text-sm text-[#6B4A3A]">
                    {student.nis || "-"}
                  </td>

                  <td className="px-5 py-4">
                    <span className="rounded-full border border-[#D96B2B] px-4 py-2 text-xs font-bold text-[#D96B2B]">
                      {student.teachers?.full_name || "Belum assigned"}
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
              <h2 className="text-xl font-bold">Tambah Guru Baru</h2>

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

              <form onSubmit={handleSubmitTeacher} className="space-y-4">
                <div>
                  <label className="text-sm font-bold">Nama Guru</label>
                  <input
                    value={form.full_name}
                    onChange={(event) =>
                      setForm({ ...form, full_name: event.target.value })
                    }
                    placeholder="Contoh: Ms. Clara"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm({ ...form, email: event.target.value })
                    }
                    placeholder="clara@hstkb.id"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Nomor HP</label>
                  <input
                    value={form.phone}
                    onChange={(event) =>
                      setForm({ ...form, phone: event.target.value })
                    }
                    placeholder="0812xxxx"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-bold">Kode Guru</label>
                    <input
                      value={form.teacher_code}
                      onChange={(event) =>
                        setForm({ ...form, teacher_code: event.target.value })
                      }
                      placeholder="TCH-003"
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
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold">Mata Pelajaran</label>
                  <input
                    value={form.subjects}
                    onChange={(event) =>
                      setForm({ ...form, subjects: event.target.value })
                    }
                    placeholder="Contoh: Math, Science"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                  <p className="mt-1 text-xs text-[#6B4A3A]">
                    Pisahkan dengan koma, contoh: Math, Science, Reading
                  </p>
                </div>

                <div className="sticky bottom-0 -mx-6 mt-5 border-t border-[#E8D6C1] bg-[#FAF3EA] px-6 pb-1 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-xl bg-[#7A1F2B] py-3 text-sm font-bold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Menyimpan..." : "Simpan Guru"}
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