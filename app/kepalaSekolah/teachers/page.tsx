"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
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

type KbmReportQueryResult = {
  id: string;
  teacher_id: string | null;
  student_id: string | null;
  subject_id: string | null;
  report_date: string | null;
  class_level: string | null;
  semester: string | null;
  chapter: string | null;
  material_topic: string | null;
  learning_issue: string | null;
  solution: string | null;
  teacher_note: string | null;
  status: string | null;
  students:
    | {
        id: string;
        full_name: string;
        level: string | null;
        grade: string | null;
        nis: string | null;
      }
    | {
        id: string;
        full_name: string;
        level: string | null;
        grade: string | null;
        nis: string | null;
      }[]
    | null;
  subjects:
    | {
        id: string;
        name: string;
      }
    | {
        id: string;
        name: string;
      }[]
    | null;
};

type KbmReport = {
  id: string;
  teacher_id: string | null;
  student_id: string | null;
  subject_id: string | null;
  report_date: string | null;
  class_level: string | null;
  semester: string | null;
  chapter: string | null;
  material_topic: string | null;
  learning_issue: string | null;
  solution: string | null;
  teacher_note: string | null;
  status: string | null;
  student_name: string;
  student_level: string;
  student_grade: string;
  student_nis: string;
  subject_name: string;
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

function getTeacherStatusBadge(status: string | null) {
  if (status === "inactive") return "bg-red-100 text-red-700";
  return "bg-emerald-100 text-emerald-700";
}

function getTeacherStatusLabel(status: string | null) {
  if (status === "inactive") return "Inactive";
  return "Active";
}

export default function KepalaSekolahTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [kbmReports, setKbmReports] = useState<KbmReport[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [form, setForm] = useState<TeacherForm>(initialForm);
  const [errorMessage, setErrorMessage] = useState("");

  const [viewReportsTeacher, setViewReportsTeacher] = useState<Teacher | null>(
    null
  );
  const [assignTeacher, setAssignTeacher] = useState<Teacher | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

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
      .select(
        `
        id,
        teacher_id,
        student_id,
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
        subjects (
          id,
          name
        )
      `
      )
      .order("report_date", { ascending: false });

    if (error) {
      console.error(error.message);
      return;
    }

    const rows = (data || []) as KbmReportQueryResult[];

    const normalizedReports: KbmReport[] = rows.map((item) => {
      const student = normalizeRelation(item.students);
      const subject = normalizeRelation(item.subjects);

      return {
        id: item.id,
        teacher_id: item.teacher_id,
        student_id: item.student_id,
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
        student_name: student?.full_name || "-",
        student_level: student?.level || "-",
        student_grade: student?.grade || "-",
        student_nis: student?.nis || "-",
        subject_name: subject?.name || "-",
      };
    });

    setKbmReports(normalizedReports);
  }

  async function fetchAllData() {
    setLoading(true);
    setErrorMessage("");

    await Promise.all([fetchTeachers(), fetchStudents(), fetchKbmReports()]);

    setLoading(false);
  }

  useEffect(() => {
    fetchAllData();

    const channel = supabase
      .channel("kepala-teachers-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teachers" },
        () => fetchAllData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        () => fetchAllData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "kbm_reports" },
        () => fetchAllData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  function getReportsByTeacher(teacherId: string) {
    return kbmReports.filter((report) => report.teacher_id === teacherId);
  }

  function openCreateTeacherModal() {
    setEditingTeacher(null);
    setForm(initialForm);
    setErrorMessage("");
    setIsModalOpen(true);
  }

  function openEditTeacherModal(teacher: Teacher) {
    setEditingTeacher(teacher);
    setForm({
      full_name: teacher.full_name || "",
      email: teacher.email || "",
      phone: teacher.phone || "",
      teacher_code: teacher.teacher_code || "",
      subjects: normalizeSubjects(teacher.subjects).join(", "),
      status: teacher.status || "active",
    });
    setErrorMessage("");
    setIsModalOpen(true);
  }

  function openAssignModal(teacher: Teacher) {
    const assignedStudentIds = students
      .filter((student) => student.homeroom_teacher_id === teacher.id)
      .map((student) => student.id);

    setAssignTeacher(teacher);
    setSelectedStudentIds(assignedStudentIds);
  }

  function toggleStudentSelection(studentId: string) {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  }

  async function handleSaveAssign() {
    if (!assignTeacher) return;

    setAssigning(true);

    try {
      const currentlyAssignedStudentIds = students
        .filter((student) => student.homeroom_teacher_id === assignTeacher.id)
        .map((student) => student.id);

      const toAssign = selectedStudentIds.filter(
        (studentId) => !currentlyAssignedStudentIds.includes(studentId)
      );

      const toUnassign = currentlyAssignedStudentIds.filter(
        (studentId) => !selectedStudentIds.includes(studentId)
      );

      if (toAssign.length > 0) {
        const { error } = await supabase
          .from("students")
          .update({
            homeroom_teacher_id: assignTeacher.id,
          })
          .in("id", toAssign);

        if (error) {
          throw new Error(error.message);
        }
      }

      if (toUnassign.length > 0) {
        const { error } = await supabase
          .from("students")
          .update({
            homeroom_teacher_id: null,
          })
          .in("id", toUnassign);

        if (error) {
          throw new Error(error.message);
        }
      }

      await fetchAllData();

      setAssignTeacher(null);
      setSelectedStudentIds([]);
    } catch (error) {
      if (error instanceof Error) {
        alert(`Gagal assign murid: ${error.message}`);
      } else {
        alert("Gagal assign murid.");
      }
    } finally {
      setAssigning(false);
    }
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
        is_active: form.status === "active",
      })
      .select("id")
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    return newUser.id;
  }

  async function updateTeacherUserProfile(teacher: Teacher) {
    if (!teacher.user_id) return;

    const { error } = await supabase
      .from("users_profile")
      .update({
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || null,
        is_active: form.status === "active",
      })
      .eq("id", teacher.user_id);

    if (error) {
      throw new Error(error.message);
    }
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
      const subjectList = form.subjects
        .split(",")
        .map((subject) => subject.trim())
        .filter(Boolean);

      if (editingTeacher) {
        await updateTeacherUserProfile(editingTeacher);

        const { error } = await supabase
          .from("teachers")
          .update({
            teacher_code: form.teacher_code.trim(),
            full_name: form.full_name.trim(),
            email: form.email.trim().toLowerCase(),
            phone: form.phone.trim() || null,
            subjects: subjectList,
            status: form.status,
          })
          .eq("id", editingTeacher.id);

        if (error) {
          throw new Error(error.message);
        }
      } else {
        const userId = await findOrCreateTeacherUser();

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
      }

      setForm(initialForm);
      setEditingTeacher(null);
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
    setEditingTeacher(null);
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
          onClick={openCreateTeacherModal}
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

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${getTeacherStatusBadge(
                        teacher.status
                      )}`}
                    >
                      {getTeacherStatusLabel(teacher.status)}
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
                      onClick={() => setViewReportsTeacher(teacher)}
                      className="rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] px-4 py-2 text-sm font-bold transition hover:bg-white"
                    >
                      View Reports
                    </button>

                    <button
                      type="button"
                      onClick={() => openAssignModal(teacher)}
                      className="rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] px-4 py-2 text-sm font-bold transition hover:bg-white"
                    >
                      Assign
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => openEditTeacherModal(teacher)}
                    className="mt-3 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-2 text-sm font-bold text-[#7A1F2B] transition hover:bg-[#FFF8EF]"
                  >
                    Edit Profile Guru
                  </button>
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
              <h2 className="text-xl font-bold">
                {editingTeacher ? "Edit Profile Guru" : "Tambah Guru Baru"}
              </h2>

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
                  <textarea
                    value={form.subjects}
                    onChange={(event) =>
                      setForm({ ...form, subjects: event.target.value })
                    }
                    placeholder="Contoh: MTK kelas 1, 2, 3, Bahasa Indonesia kelas 1, 2, 3"
                    rows={4}
                    className="mt-2 w-full resize-none rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
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
                    {saving
                      ? "Menyimpan..."
                      : editingTeacher
                      ? "Update Guru"
                      : "Simpan Guru"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {viewReportsTeacher ? (
        <ViewReportsModal
          teacher={viewReportsTeacher}
          reports={getReportsByTeacher(viewReportsTeacher.id)}
          onClose={() => setViewReportsTeacher(null)}
        />
      ) : null}

      {assignTeacher ? (
        <AssignModal
          teacher={assignTeacher}
          students={students}
          selectedStudentIds={selectedStudentIds}
          assigning={assigning}
          onToggleStudent={toggleStudentSelection}
          onClose={() => {
            setAssignTeacher(null);
            setSelectedStudentIds([]);
          }}
          onSave={handleSaveAssign}
        />
      ) : null}
    </KepalaSekolahLayout>
  );
}

function ViewReportsModal({
  teacher,
  reports,
  onClose,
}: {
  teacher: Teacher;
  reports: KbmReport[];
  onClose: () => void;
}) {
  return (
    <ModalShell
      title="Laporan KBM Guru"
      subtitle={`${teacher.full_name} • ${reports.length} laporan`}
      onClose={onClose}
      maxWidth="max-w-[900px]"
    >
      {reports.length === 0 ? (
        <div className="rounded-2xl border border-[#E8D6C1] bg-white p-8 text-center text-sm text-[#6B4A3A]">
          Belum ada laporan KBM untuk guru ini.
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="rounded-2xl border border-[#E8D6C1] bg-white p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-[#2B1B18]">
                    {report.student_name}
                  </h3>

                  <p className="mt-1 text-sm text-[#6B4A3A]">
                    {report.student_level} {report.student_grade} •{" "}
                    {report.subject_name} • {formatDate(report.report_date)}
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

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <ReportInfo label="Semester" value={report.semester || "-"} />
                <ReportInfo label="BAB" value={report.chapter || "-"} />
                <ReportInfo
                  label="Materi"
                  value={report.material_topic || "-"}
                />
                <ReportInfo label="NIS" value={report.student_nis || "-"} />
              </div>

              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <p className="font-bold text-[#2B1B18]">Masalah / Kendala</p>
                  <p className="mt-1 whitespace-pre-line leading-6 text-[#6B4A3A]">
                    {report.learning_issue || "-"}
                  </p>
                </div>

                <div>
                  <p className="font-bold text-[#2B1B18]">Solusi</p>
                  <p className="mt-1 whitespace-pre-line leading-6 text-[#6B4A3A]">
                    {report.solution || "-"}
                  </p>
                </div>

                <div>
                  <p className="font-bold text-[#2B1B18]">Catatan Guru</p>
                  <p className="mt-1 whitespace-pre-line leading-6 text-[#6B4A3A]">
                    {report.teacher_note || "-"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  );
}

function AssignModal({
  teacher,
  students,
  selectedStudentIds,
  assigning,
  onToggleStudent,
  onClose,
  onSave,
}: {
  teacher: Teacher;
  students: Student[];
  selectedStudentIds: string[];
  assigning: boolean;
  onToggleStudent: (studentId: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <ModalShell
      title="Assign Murid ke Guru"
      subtitle={`${teacher.full_name} • pilih murid yang menjadi dampingan`}
      onClose={onClose}
      maxWidth="max-w-[780px]"
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-[#E8D6C1] bg-white p-4 text-sm text-[#6B4A3A]">
          Centang murid yang ingin di-assign ke guru ini. Jika centang dilepas,
          murid akan dilepaskan dari guru pendamping ini.
        </div>

        <div className="max-h-[460px] overflow-y-auto rounded-2xl border border-[#E8D6C1] bg-white">
          {students.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#6B4A3A]">
              Belum ada data murid.
            </div>
          ) : (
            <div className="divide-y divide-[#E8D6C1]">
              {students.map((student) => {
                const checked = selectedStudentIds.includes(student.id);
                const assignedToOtherTeacher =
                  student.homeroom_teacher_id &&
                  student.homeroom_teacher_id !== teacher.id;

                return (
                  <label
                    key={student.id}
                    className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 transition hover:bg-[#FFF8EF]"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleStudent(student.id)}
                        className="h-4 w-4 accent-[#7A1F2B]"
                      />

                      <div>
                        <p className="font-bold text-[#2B1B18]">
                          {student.full_name}
                        </p>
                        <p className="mt-1 text-xs text-[#6B4A3A]">
                          {student.level || "-"}
                          {student.grade ? ` — ${student.grade}` : ""} • NIS:{" "}
                          {student.nis || "-"}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      {assignedToOtherTeacher ? (
                        <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-700">
                          Assigned: {student.teachers?.full_name || "-"}
                        </span>
                      ) : checked ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                          Dipilih
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                          Belum dipilih
                        </span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl border border-[#E8D6C1] bg-white text-sm font-bold text-[#7A1F2B] transition hover:bg-[#FFF8EF]"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={assigning}
            className="h-11 rounded-xl bg-[#7A1F2B] text-sm font-bold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {assigning ? "Menyimpan..." : "Simpan Assign"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function ModalShell({
  title,
  subtitle,
  children,
  onClose,
  maxWidth = "max-w-[720px]",
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  onClose: () => void;
  maxWidth?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
      <div
        className={`flex max-h-[88vh] w-full ${maxWidth} flex-col overflow-hidden rounded-2xl bg-[#FAF3EA] shadow-2xl`}
      >
        <div className="flex items-center justify-between border-b border-[#E8D6C1] px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-[#2B1B18]">{title}</h2>
            <p className="mt-1 text-sm text-[#6B4A3A]">{subtitle}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-[#6B4A3A] hover:text-[#7A1F2B]"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function ReportInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#FFF8EF] p-3 text-sm">
      <p className="text-[#6B4A3A]">{label}</p>
      <p className="mt-1 font-bold text-[#2B1B18]">{value}</p>
    </div>
  );
}