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

type MaterialFrameworkRow = {
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
  created_at: string | null;
  students: StudentRelation | StudentRelation[] | null;
  subjects: SubjectRelation | SubjectRelation[] | null;
};

type MaterialFramework = {
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
  created_at: string | null;
  students: StudentRelation | null;
  subjects: SubjectRelation | null;
};

type FrameworkForm = {
  student_id: string;
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
  subject_id: "",
  curriculum: "Kurikulum Merdeka",
  class_level: "",
  chapter: "",
  material_topic: "",
  time_allocation: "",
  implementation_status: "planned",
  notes: "",
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
  if (status === "planned") return "Planned";
  if (status === "in_progress") return "In Progress";
  if (status === "done") return "Done";
  if (status === "revision") return "Revision";
  if (status === "published") return "Published";

  return "Draft";
}

function getStatusBadge(status: string | null) {
  if (status === "done" || status === "published") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "in_progress") {
    return "bg-blue-100 text-blue-700";
  }

  if (status === "planned") {
    return "bg-yellow-100 text-yellow-700";
  }

  if (status === "revision") {
    return "bg-red-100 text-red-700";
  }

  return "bg-slate-200 text-slate-700";
}

export default function TeacherKerangkaMateriPage() {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [frameworks, setFrameworks] = useState<MaterialFramework[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [studentFilter, setStudentFilter] = useState("Semua Murid");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<FrameworkForm>(initialForm);

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

  async function fetchFrameworks(teacherId: string) {
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

    const rows = (data || []) as MaterialFrameworkRow[];

    const normalizedFrameworks: MaterialFramework[] = rows.map((item) => ({
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
      created_at: item.created_at,
      students: normalizeRelation(item.students),
      subjects: normalizeRelation(item.subjects),
    }));

    setFrameworks(normalizedFrameworks);
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
        fetchFrameworks(activeTeacher.id),
      ]);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengambil data kerangka materi.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPageData();
  }, []);

  const filteredFrameworks = useMemo(() => {
    const keyword = search.toLowerCase();

    return frameworks.filter((framework) => {
      const matchSearch =
        framework.students?.full_name?.toLowerCase().includes(keyword) ||
        framework.students?.grade?.toLowerCase().includes(keyword) ||
        framework.subjects?.name?.toLowerCase().includes(keyword) ||
        framework.curriculum?.toLowerCase().includes(keyword) ||
        framework.class_level?.toLowerCase().includes(keyword) ||
        framework.chapter?.toLowerCase().includes(keyword) ||
        framework.material_topic?.toLowerCase().includes(keyword) ||
        framework.time_allocation?.toLowerCase().includes(keyword) ||
        framework.notes?.toLowerCase().includes(keyword);

      const matchStatus =
        statusFilter === "Semua Status" ||
        framework.implementation_status === statusFilter;

      const matchStudent =
        studentFilter === "Semua Murid" ||
        framework.student_id === studentFilter;

      return matchSearch && matchStatus && matchStudent;
    });
  }, [frameworks, search, statusFilter, studentFilter]);

  const plannedCount = frameworks.filter(
    (item) => item.implementation_status === "planned"
  ).length;

  const progressCount = frameworks.filter(
    (item) => item.implementation_status === "in_progress"
  ).length;

  const doneCount = frameworks.filter(
    (item) => item.implementation_status === "done"
  ).length;

  const totalSubjects = useMemo(() => {
    const subjectIds = frameworks
      .map((item) => item.subject_id)
      .filter(Boolean) as string[];

    return new Set(subjectIds).size;
  }, [frameworks]);

  const subjectSummary = useMemo(() => {
    const summary = new Map<string, number>();

    frameworks.forEach((framework) => {
      const subjectName = framework.subjects?.name || "Lainnya";
      summary.set(subjectName, (summary.get(subjectName) || 0) + 1);
    });

    return Array.from(summary.entries())
      .map(([name, total]) => ({ name, total }))
      .slice(0, 6);
  }, [frameworks]);

  function openModal(student?: Student) {
    setErrorMessage("");

    setForm({
      ...initialForm,
      student_id: student?.id || "",
      class_level: student?.grade || "",
    });

    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setErrorMessage("");
    setForm(initialForm);
  }

  function handleStudentChange(studentId: string) {
    const selectedStudent = students.find((student) => student.id === studentId);

    setForm({
      ...form,
      student_id: studentId,
      class_level: selectedStudent?.grade || "",
    });
  }

  async function handleSubmitFramework(
    event: React.FormEvent<HTMLFormElement>
  ) {
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

    if (!form.curriculum.trim()) {
      setErrorMessage("Kurikulum wajib diisi.");
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

    if (!form.material_topic.trim()) {
      setErrorMessage("Materi wajib diisi.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from("material_frameworks").insert({
        teacher_id: teacher.id,
        student_id: form.student_id,
        subject_id: form.subject_id,
        curriculum: form.curriculum.trim(),
        class_level: form.class_level.trim(),
        chapter: form.chapter.trim(),
        material_topic: form.material_topic.trim(),
        time_allocation: form.time_allocation.trim() || null,
        implementation_status: form.implementation_status,
        notes: form.notes.trim() || null,
      });

      if (error) {
        throw new Error(error.message);
      }

      setForm(initialForm);
      setIsModalOpen(false);
      await fetchFrameworks(teacher.id);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal menyimpan kerangka materi.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <TeacherLayout
      activeMenu="Kerangka Materi"
      searchPlaceholder="Cari kerangka materi..."
      buttonLabel="+ Tambah Kerangka"
    >
      <div className="w-full max-w-full overflow-hidden">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#6B4A3A]">
              Teacher Portal
            </p>

            <h1 className="mt-1 text-[30px] font-bold tracking-tight">
              Kerangka Materi
            </h1>

            <p className="mt-1 text-sm text-[#6B4A3A]">
              Kelola kerangka materi pembelajaran oleh{" "}
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
            + Tambah Kerangka
          </button>
        </div>

        {errorMessage && !isModalOpen && (
          <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {loading && (
          <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-8 text-center text-sm shadow-sm">
            Loading kerangka materi...
          </div>
        )}

        {!loading && (
          <>
            <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6B4A3A]">Total Kerangka</p>
                <p className="mt-4 text-3xl font-bold">{frameworks.length}</p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6B4A3A]">Planned</p>
                <p className="mt-4 text-3xl font-bold">{plannedCount}</p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6B4A3A]">In Progress</p>
                <p className="mt-4 text-3xl font-bold">{progressCount}</p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6B4A3A]">Mapel</p>
                <p className="mt-4 text-3xl font-bold">{totalSubjects}</p>
              </div>
            </div>

            <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_240px]">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari murid, kelas, mapel, kurikulum, bab, materi..."
                  className="w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                />

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                >
                  <option>Semua Status</option>
                  <option value="planned">planned</option>
                  <option value="in_progress">in_progress</option>
                  <option value="done">done</option>
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
              <div className="space-y-5">
                {filteredFrameworks.length === 0 && (
                  <div className="rounded-2xl border border-[#E8D6C1] bg-white p-10 text-center text-sm text-[#6B4A3A] shadow-sm">
                    Belum ada kerangka materi untuk guru ini.
                  </div>
                )}

                {filteredFrameworks.map((framework) => (
                  <div
                    key={framework.id}
                    className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FDE7D7] text-sm font-bold text-[#7A1F2B]">
                          {getInitials(
                            framework.students?.full_name || "Materi"
                          )}
                        </div>

                        <div>
                          <h2 className="text-lg font-bold">
                            {framework.material_topic || "-"}
                          </h2>

                          <p className="mt-1 text-sm text-[#6B4A3A]">
                            {framework.students?.full_name || "-"} •{" "}
                            {framework.subjects?.name || "-"} •{" "}
                            {framework.class_level || "-"}
                          </p>

                          <p className="mt-1 text-sm text-[#6B4A3A]">
                            Dibuat: {formatDate(framework.created_at)}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${getStatusBadge(
                          framework.implementation_status
                        )}`}
                      >
                        {getStatusLabel(framework.implementation_status)}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                      <div className="rounded-2xl bg-[#FFF8EF] p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-[#6B4A3A]">
                          Kurikulum
                        </p>
                        <p className="mt-2 font-bold">
                          {framework.curriculum || "-"}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-[#FFF8EF] p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-[#6B4A3A]">
                          Bab
                        </p>
                        <p className="mt-2 font-bold">
                          {framework.chapter || "-"}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-[#FFF8EF] p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-[#6B4A3A]">
                          Alokasi
                        </p>
                        <p className="mt-2 font-bold">
                          {framework.time_allocation || "-"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl bg-[#FFF8EF] p-4">
                      <p className="text-sm font-bold">Catatan Materi</p>
                      <p className="mt-2 text-sm leading-6 text-[#6B4A3A]">
                        {framework.notes || "-"}
                      </p>
                    </div>
                  </div>
                ))}
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
                          + Kerangka
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold">Ringkasan Mapel</h2>

                  <div className="mt-5 space-y-4">
                    {subjectSummary.length === 0 && (
                      <div className="rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] p-4 text-sm text-[#6B4A3A]">
                        Belum ada ringkasan mapel.
                      </div>
                    )}

                    {subjectSummary.map((subject) => (
                      <div key={subject.name}>
                        <div className="mb-2 flex justify-between text-sm">
                          <span>{subject.name}</span>
                          <span className="font-bold">
                            {subject.total} materi
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-[#F1DFD5]">
                          <div
                            className="h-full rounded-full bg-[#7A1F2B]"
                            style={{
                              width:
                                frameworks.length > 0
                                  ? `${(subject.total / frameworks.length) * 100}%`
                                  : "0%",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold">Status Implementasi</h2>

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
                              frameworks.length > 0
                                ? `${(plannedCount / frameworks.length) * 100}%`
                                : "0%",
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex justify-between text-sm">
                        <span>In Progress</span>
                        <span className="font-bold">{progressCount}</span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-[#F1DFD5]">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{
                            width:
                              frameworks.length > 0
                                ? `${(progressCount / frameworks.length) * 100}%`
                                : "0%",
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex justify-between text-sm">
                        <span>Done</span>
                        <span className="font-bold">{doneCount}</span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-[#F1DFD5]">
                        <div
                          className="h-full rounded-full bg-emerald-600"
                          style={{
                            width:
                              frameworks.length > 0
                                ? `${(doneCount / frameworks.length) * 100}%`
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
                      + Tambah Kerangka
                    </span>{" "}
                    akan menyimpan data baru ke table{" "}
                    <span className="font-bold text-[#2B1B18]">
                      material_frameworks
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

              <form onSubmit={handleSubmitFramework} className="space-y-4">
                <div>
                  <label className="text-sm font-bold">Murid</label>
                  <select
                    value={form.student_id}
                    onChange={(event) => handleStudentChange(event.target.value)}
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

                <div>
                  <label className="text-sm font-bold">Kurikulum</label>
                  <input
                    value={form.curriculum}
                    onChange={(event) =>
                      setForm({ ...form, curriculum: event.target.value })
                    }
                    placeholder="Contoh: Kurikulum Merdeka"
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
                    placeholder="Contoh: Grade 4"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
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
                  <label className="text-sm font-bold">Materi</label>
                  <input
                    value={form.material_topic}
                    onChange={(event) =>
                      setForm({ ...form, material_topic: event.target.value })
                    }
                    placeholder="Contoh: Pecahan Senilai"
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
                    placeholder="Contoh: 2 x 45 menit"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">
                    Status Implementasi
                  </label>
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
                    <option value="planned">planned</option>
                    <option value="in_progress">in_progress</option>
                    <option value="done">done</option>
                    <option value="revision">revision</option>
                    <option value="published">published</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-bold">Catatan</label>
                  <textarea
                    value={form.notes}
                    onChange={(event) =>
                      setForm({ ...form, notes: event.target.value })
                    }
                    placeholder="Catatan kerangka materi"
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
                    {saving ? "Menyimpan..." : "Simpan Kerangka Materi"}
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