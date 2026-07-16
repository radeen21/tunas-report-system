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

type RppRow = {
  id: string;
  teacher_id: string | null;
  subject_id: string | null;
  student_id: string | null;
  title: string;
  class_level: string | null;
  semester: string | null;
  chapter: string | null;
  material_topic: string | null;
  time_allocation: string | null;
  learning_method: string | null;
  assessment_method: string | null;
  status: string | null;
  created_at: string | null;
  students: StudentRelation | StudentRelation[] | null;
  subjects: SubjectRelation | SubjectRelation[] | null;
};

type Rpp = {
  id: string;
  teacher_id: string | null;
  subject_id: string | null;
  student_id: string | null;
  title: string;
  class_level: string | null;
  semester: string | null;
  chapter: string | null;
  material_topic: string | null;
  time_allocation: string | null;
  learning_method: string | null;
  assessment_method: string | null;
  status: string | null;
  created_at: string | null;
  students: StudentRelation | null;
  subjects: SubjectRelation | null;
};

type RppForm = {
  student_id: string;
  subject_id: string;
  title: string;
  class_level: string;
  semester: string;
  chapter: string;
  material_topic: string;
  time_allocation: string;
  learning_method: string;
  assessment_method: string;
  status: string;
};

const initialForm: RppForm = {
  student_id: "",
  subject_id: "",
  title: "",
  class_level: "",
  semester: "Genap",
  chapter: "",
  material_topic: "",
  time_allocation: "",
  learning_method: "",
  assessment_method: "",
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
  if (status === "planned") return "Planned";

  return "Draft";
}

function getStatusBadge(status: string | null) {
  if (status === "published" || status === "approved") {
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

export default function TeacherRppPage() {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [rppList, setRppList] = useState<Rpp[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [semesterFilter, setSemesterFilter] = useState("Semua Semester");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<RppForm>(initialForm);

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

  async function fetchRpp(teacherId: string) {
    const { data, error } = await supabase
      .from("rpp")
      .select(
        `
        id,
        teacher_id,
        subject_id,
        student_id,
        title,
        class_level,
        semester,
        chapter,
        material_topic,
        time_allocation,
        learning_method,
        assessment_method,
        status,
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

    const rows = (data || []) as RppRow[];

    const normalizedRpp: Rpp[] = rows.map((item) => ({
      id: item.id,
      teacher_id: item.teacher_id,
      subject_id: item.subject_id,
      student_id: item.student_id,
      title: item.title,
      class_level: item.class_level,
      semester: item.semester,
      chapter: item.chapter,
      material_topic: item.material_topic,
      time_allocation: item.time_allocation,
      learning_method: item.learning_method,
      assessment_method: item.assessment_method,
      status: item.status,
      created_at: item.created_at,
      students: normalizeRelation(item.students),
      subjects: normalizeRelation(item.subjects),
    }));

    setRppList(normalizedRpp);
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
        fetchRpp(activeTeacher.id),
      ]);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengambil data RPP.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPageData();
  }, []);

  const filteredRpp = useMemo(() => {
    const keyword = search.toLowerCase();

    return rppList.filter((rpp) => {
      const matchSearch =
        rpp.title?.toLowerCase().includes(keyword) ||
        rpp.students?.full_name?.toLowerCase().includes(keyword) ||
        rpp.students?.grade?.toLowerCase().includes(keyword) ||
        rpp.subjects?.name?.toLowerCase().includes(keyword) ||
        rpp.chapter?.toLowerCase().includes(keyword) ||
        rpp.material_topic?.toLowerCase().includes(keyword) ||
        rpp.learning_method?.toLowerCase().includes(keyword) ||
        rpp.assessment_method?.toLowerCase().includes(keyword);

      const matchStatus =
        statusFilter === "Semua Status" || rpp.status === statusFilter;

      const matchSemester =
        semesterFilter === "Semua Semester" || rpp.semester === semesterFilter;

      return matchSearch && matchStatus && matchSemester;
    });
  }, [rppList, search, statusFilter, semesterFilter]);

  const draftCount = rppList.filter((rpp) => rpp.status === "draft").length;

  const plannedCount = rppList.filter(
    (rpp) => rpp.status === "planned"
  ).length;

  const publishedCount = rppList.filter(
    (rpp) => rpp.status === "published"
  ).length;

  const totalSubjects = useMemo(() => {
    const subjectIds = rppList
      .map((item) => item.subject_id)
      .filter(Boolean) as string[];

    return new Set(subjectIds).size;
  }, [rppList]);

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

  async function handleSubmitRpp(event: React.FormEvent<HTMLFormElement>) {
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

    if (!form.title.trim()) {
      setErrorMessage("Judul RPP wajib diisi.");
      return;
    }

    if (!form.material_topic.trim()) {
      setErrorMessage("Materi pembelajaran wajib diisi.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from("rpp").insert({
        teacher_id: teacher.id,
        student_id: form.student_id,
        subject_id: form.subject_id,
        title: form.title.trim(),
        class_level: form.class_level.trim() || null,
        semester: form.semester,
        chapter: form.chapter.trim() || null,
        material_topic: form.material_topic.trim(),
        time_allocation: form.time_allocation.trim() || null,
        learning_method: form.learning_method.trim() || null,
        assessment_method: form.assessment_method.trim() || null,
        status: form.status,
      });

      if (error) {
        throw new Error(error.message);
      }

      setForm(initialForm);
      setIsModalOpen(false);
      await fetchRpp(teacher.id);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal menyimpan RPP.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <TeacherLayout
      activeMenu="RPP"
      searchPlaceholder="Cari RPP..."
      buttonLabel="+ Buat RPP"
    >
      <div className="w-full max-w-full overflow-hidden">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#6B4A3A]">
              Teacher Portal
            </p>

            <h1 className="mt-1 text-[30px] font-bold tracking-tight">RPP</h1>

            <p className="mt-1 text-sm text-[#6B4A3A]">
              Buat dan kelola Rencana Pelaksanaan Pembelajaran oleh{" "}
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
            + Buat RPP
          </button>
        </div>

        {errorMessage && !isModalOpen && (
          <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {loading && (
          <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-8 text-center text-sm shadow-sm">
            Loading data RPP...
          </div>
        )}

        {!loading && (
          <>
            <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6B4A3A]">Total RPP</p>
                <p className="mt-4 text-3xl font-bold">{rppList.length}</p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6B4A3A]">Draft</p>
                <p className="mt-4 text-3xl font-bold">{draftCount}</p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6B4A3A]">Planned</p>
                <p className="mt-4 text-3xl font-bold">{plannedCount}</p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6B4A3A]">Mapel</p>
                <p className="mt-4 text-3xl font-bold">{totalSubjects}</p>
              </div>
            </div>

            <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_220px]">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari judul, murid, mapel, bab, materi, metode..."
                  className="w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                />

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                >
                  <option>Semua Status</option>
                  <option value="draft">draft</option>
                  <option value="planned">planned</option>
                  <option value="pending_review">pending_review</option>
                  <option value="published">published</option>
                </select>

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

            <div className="mt-7 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
              <div className="space-y-5">
                {filteredRpp.length === 0 && (
                  <div className="rounded-2xl border border-[#E8D6C1] bg-white p-10 text-center text-sm text-[#6B4A3A] shadow-sm">
                    Belum ada data RPP untuk guru ini.
                  </div>
                )}

                {filteredRpp.map((rpp) => (
                  <div
                    key={rpp.id}
                    className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FDE7D7] text-sm font-bold text-[#7A1F2B]">
                          {getInitials(rpp.students?.full_name || "RPP")}
                        </div>

                        <div>
                          <h2 className="text-lg font-bold">{rpp.title}</h2>

                          <p className="mt-1 text-sm text-[#6B4A3A]">
                            {rpp.students?.full_name || "-"} •{" "}
                            {rpp.subjects?.name || "-"} •{" "}
                            {rpp.class_level || "-"}
                          </p>

                          <p className="mt-1 text-sm text-[#6B4A3A]">
                            Dibuat: {formatDate(rpp.created_at)}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${getStatusBadge(
                          rpp.status
                        )}`}
                      >
                        {getStatusLabel(rpp.status)}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                      <div className="rounded-2xl bg-[#FFF8EF] p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-[#6B4A3A]">
                          Semester
                        </p>
                        <p className="mt-2 font-bold">{rpp.semester || "-"}</p>
                      </div>

                      <div className="rounded-2xl bg-[#FFF8EF] p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-[#6B4A3A]">
                          Bab
                        </p>
                        <p className="mt-2 font-bold">{rpp.chapter || "-"}</p>
                      </div>

                      <div className="rounded-2xl bg-[#FFF8EF] p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-[#6B4A3A]">
                          Alokasi
                        </p>
                        <p className="mt-2 font-bold">
                          {rpp.time_allocation || "-"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 space-y-3">
                      <div className="grid grid-cols-1 gap-2 border-b border-dashed border-[#E8D6C1] pb-3 md:grid-cols-[180px_1fr]">
                        <p className="text-sm font-bold text-[#6B4A3A]">
                          Materi
                        </p>
                        <p className="text-sm text-[#2B1B18]">
                          {rpp.material_topic || "-"}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-2 border-b border-dashed border-[#E8D6C1] pb-3 md:grid-cols-[180px_1fr]">
                        <p className="text-sm font-bold text-[#6B4A3A]">
                          Metode Pembelajaran
                        </p>
                        <p className="text-sm text-[#2B1B18]">
                          {rpp.learning_method || "-"}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-2 md:grid-cols-[180px_1fr]">
                        <p className="text-sm font-bold text-[#6B4A3A]">
                          Metode Penilaian
                        </p>
                        <p className="text-sm text-[#2B1B18]">
                          {rpp.assessment_method || "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-5">
                <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold">Guru Aktif</h2>

                  <div className="mt-5 rounded-2xl bg-[#FFF8EF] p-5">
                    <p className="text-sm text-[#6B4A3A]">Nama Guru</p>
                    <p className="mt-2 text-xl font-bold">
                      {teacher?.full_name || "-"}
                    </p>

                    <div className="mt-4 space-y-2 text-sm text-[#6B4A3A]">
                      <p>
                        <span className="font-semibold text-[#2B1B18]">
                          Kode:
                        </span>{" "}
                        {teacher?.teacher_code || "-"}
                      </p>

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
                          + RPP
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold">Status RPP</h2>

                  <div className="mt-5 space-y-4">
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
                              rppList.length > 0
                                ? `${(draftCount / rppList.length) * 100}%`
                                : "0%",
                          }}
                        />
                      </div>
                    </div>

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
                              rppList.length > 0
                                ? `${(plannedCount / rppList.length) * 100}%`
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
                              rppList.length > 0
                                ? `${(publishedCount / rppList.length) * 100}%`
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
                      + Buat RPP
                    </span>{" "}
                    akan menyimpan data ke table{" "}
                    <span className="font-bold text-[#2B1B18]">rpp</span>.
                    Setelah disimpan, data akan langsung muncul di daftar RPP.
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
              <h2 className="text-xl font-bold">Buat RPP</h2>

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

              <form onSubmit={handleSubmitRpp} className="space-y-4">
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
                  <label className="text-sm font-bold">Judul RPP</label>
                  <input
                    value={form.title}
                    onChange={(event) =>
                      setForm({ ...form, title: event.target.value })
                    }
                    placeholder="Contoh: RPP Matematika Pecahan Senilai"
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
                  <label className="text-sm font-bold">Materi Pembelajaran</label>
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
                    Metode Pembelajaran
                  </label>
                  <textarea
                    value={form.learning_method}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        learning_method: event.target.value,
                      })
                    }
                    rows={3}
                    placeholder="Contoh: Diskusi, latihan soal, demonstrasi visual"
                    className="mt-2 w-full resize-none rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Metode Penilaian</label>
                  <textarea
                    value={form.assessment_method}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        assessment_method: event.target.value,
                      })
                    }
                    rows={3}
                    placeholder="Contoh: Observasi, tugas tertulis, latihan mandiri"
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
                    <option value="draft">draft</option>
                    <option value="planned">planned</option>
                    <option value="pending_review">pending_review</option>
                    <option value="published">published</option>
                  </select>
                </div>

                <div className="sticky bottom-0 -mx-6 mt-5 border-t border-[#E8D6C1] bg-[#FAF3EA] px-6 pb-1 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-xl bg-[#7A1F2B] py-3 text-sm font-bold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Menyimpan..." : "Simpan RPP"}
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