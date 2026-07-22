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

type TimeAllocationRow = {
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
  created_at: string | null;
  students: StudentRelation | StudentRelation[] | null;
  subjects: SubjectRelation | SubjectRelation[] | null;
};

type TimeAllocation = {
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
  created_at: string | null;
  students: StudentRelation | null;
  subjects: SubjectRelation | null;
};

type AllocationForm = {
  student_id: string;
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
  subject_id: "",
  class_level: "",
  academic_year: "2026/2027",
  semester: "Ganjil",
  month_name: "",
  week_1: "",
  week_2: "",
  week_3: "",
  week_4: "",
  total_allocation: "",
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

function normalizeRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function normalizeText(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function formatTimeAllocation(value: string | null) {
  if (!value) return "-";
  return value;
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

function countFilledWeeks(item: TimeAllocation) {
  const weeks = [item.week_1, item.week_2, item.week_3, item.week_4];

  return weeks.filter((week) => Boolean(week && week.trim())).length;
}

function calculateTotalFromWeeks(form: AllocationForm) {
  const weeks = [form.week_1, form.week_2, form.week_3, form.week_4];

  const total = weeks
    .map((week) => {
      const match = week.match(/\d+/);
      return match ? Number(match[0]) : 0;
    })
    .reduce((sum, value) => sum + value, 0);

  if (total === 0) return "";

  return `${total} JP`;
}

export default function TeacherAlokasiWaktuPage() {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [allocations, setAllocations] = useState<TimeAllocation[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [search, setSearch] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("Semua Semester");
  const [monthFilter, setMonthFilter] = useState("Semua Bulan");
  const [studentFilter, setStudentFilter] = useState("Semua Murid");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<AllocationForm>(initialForm);

  async function fetchActiveTeacher() {
    const { data: authData } = await supabase.auth.getUser();

    const email =
      authData.user?.email ||
      localStorage.getItem("hstkb_demo_email") ||
      localStorage.getItem("hstkb_email") ||
      "";

    if (email) {
      const { data, error } = await supabase
        .from("teachers")
        .select("id, full_name, email, phone, teacher_code, subjects")
        .eq("email", email)
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);

      if (data) {
        setTeacher(data as Teacher);
        return data as Teacher;
      }
    }

    const teacherCode =
      localStorage.getItem("hstkb_teacher_code") ||
      localStorage.getItem("teacher_code") ||
      "";

    if (teacherCode) {
      const { data, error } = await supabase
        .from("teachers")
        .select("id, full_name, email, phone, teacher_code, subjects")
        .eq("teacher_code", teacherCode)
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);

      if (data) {
        setTeacher(data as Teacher);
        return data as Teacher;
      }
    }

    const { data, error } = await supabase
      .from("teachers")
      .select("id, full_name, email, phone, teacher_code, subjects")
      .order("teacher_code", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);

    setTeacher((data as Teacher) || null);

    return (data as Teacher) || null;
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

  async function fetchAllocations(teacherId: string) {
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

    const rows = (data || []) as TimeAllocationRow[];

    const normalizedAllocations: TimeAllocation[] = rows.map((item) => ({
      id: item.id,
      student_id: item.student_id,
      teacher_id: item.teacher_id,
      subject_id: item.subject_id,
      class_level: item.class_level,
      academic_year: item.academic_year,
      semester: item.semester,
      month_name: item.month_name,
      week_1: item.week_1,
      week_2: item.week_2,
      week_3: item.week_3,
      week_4: item.week_4,
      total_allocation: item.total_allocation,
      created_at: item.created_at,
      students: normalizeRelation(item.students),
      subjects: normalizeRelation(item.subjects),
    }));

    setAllocations(normalizedAllocations);
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
        fetchAllocations(activeTeacher.id),
      ]);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengambil data alokasi waktu.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPageData();

    const channel = supabase
      .channel("teacher-alokasi-waktu-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "time_allocations" },
        () => fetchPageData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teachers" },
        () => fetchPageData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        () => fetchPageData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const teacherSubjectNames = useMemo(() => {
    return (teacher?.subjects || [])
      .map((subject) => normalizeText(subject))
      .filter(Boolean);
  }, [teacher]);

  const subjectOptions = useMemo(() => {
    if (teacherSubjectNames.length === 0) return subjects;

    const matchedSubjects = subjects.filter((subject) => {
      const subjectName = normalizeText(subject.name);

      return teacherSubjectNames.some((teacherSubject) => {
        return (
          teacherSubject.includes(subjectName) ||
          subjectName.includes(teacherSubject)
        );
      });
    });

    return matchedSubjects.length > 0 ? matchedSubjects : subjects;
  }, [subjects, teacherSubjectNames]);

  const filteredAllocations = useMemo(() => {
    const keyword = search.toLowerCase();

    return allocations.filter((allocation) => {
      const matchSearch =
        !keyword ||
        allocation.students?.full_name?.toLowerCase().includes(keyword) ||
        allocation.students?.grade?.toLowerCase().includes(keyword) ||
        allocation.subjects?.name?.toLowerCase().includes(keyword) ||
        allocation.class_level?.toLowerCase().includes(keyword) ||
        allocation.academic_year?.toLowerCase().includes(keyword) ||
        allocation.month_name?.toLowerCase().includes(keyword) ||
        allocation.week_1?.toLowerCase().includes(keyword) ||
        allocation.week_2?.toLowerCase().includes(keyword) ||
        allocation.week_3?.toLowerCase().includes(keyword) ||
        allocation.week_4?.toLowerCase().includes(keyword) ||
        allocation.total_allocation?.toLowerCase().includes(keyword);

      const matchSemester =
        semesterFilter === "Semua Semester" ||
        allocation.semester === semesterFilter;

      const matchMonth =
        monthFilter === "Semua Bulan" || allocation.month_name === monthFilter;

      const matchStudent =
        studentFilter === "Semua Murid" ||
        allocation.student_id === studentFilter;

      return matchSearch && matchSemester && matchMonth && matchStudent;
    });
  }, [allocations, search, semesterFilter, monthFilter, studentFilter]);

  const totalSubjects = useMemo(() => {
    const subjectIds = allocations
      .map((item) => item.subject_id)
      .filter(Boolean) as string[];

    return new Set(subjectIds).size;
  }, [allocations]);

  const totalStudents = useMemo(() => {
    const studentIds = allocations
      .map((item) => item.student_id)
      .filter(Boolean) as string[];

    return new Set(studentIds).size;
  }, [allocations]);

  const totalFilledWeeks = useMemo(() => {
    return allocations.reduce((sum, item) => sum + countFilledWeeks(item), 0);
  }, [allocations]);

  const monthSummary = useMemo(() => {
    return monthOptions.map((month) => {
      const total = allocations.filter(
        (allocation) =>
          allocation.month_name?.toLowerCase() === month.toLowerCase()
      ).length;

      return {
        month,
        total,
      };
    });
  }, [allocations]);

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

  function updateWeekField(field: keyof AllocationForm, value: string) {
    const nextForm = {
      ...form,
      [field]: value,
    };

    setForm({
      ...nextForm,
      total_allocation: calculateTotalFromWeeks(nextForm),
    });
  }

  async function handleSubmitAllocation(
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

    if (!form.class_level.trim()) {
      setErrorMessage("Kelas wajib diisi.");
      return;
    }

    if (!form.academic_year.trim()) {
      setErrorMessage("Tahun ajaran wajib diisi.");
      return;
    }

    if (!form.month_name) {
      setErrorMessage("Bulan wajib dipilih.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from("time_allocations").insert({
        student_id: form.student_id,
        teacher_id: teacher.id,
        subject_id: form.subject_id,
        class_level: form.class_level.trim(),
        academic_year: form.academic_year.trim(),
        semester: form.semester,
        month_name: form.month_name,
        week_1: form.week_1.trim() || null,
        week_2: form.week_2.trim() || null,
        week_3: form.week_3.trim() || null,
        week_4: form.week_4.trim() || null,
        total_allocation:
          form.total_allocation.trim() ||
          calculateTotalFromWeeks(form) ||
          null,
      });

      if (error) {
        throw new Error(error.message);
      }

      setForm(initialForm);
      setIsModalOpen(false);
      await fetchAllocations(teacher.id);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal menyimpan alokasi waktu.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <TeacherLayout
      activeMenu="Alokasi Waktu"
      teacherName={teacher?.full_name || "Guru"}
      teacherSubject={
        teacher?.subjects?.length
          ? `Guru — ${teacher.subjects.slice(0, 4).join(", ")}`
          : "Guru"
      }
      searchPlaceholder="Cari alokasi waktu..."
      buttonLabel="+ Tambah Alokasi"
    >
      <div className="w-full max-w-full overflow-hidden">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#6B4A3A]">
              Teacher Portal
            </p>

            <h1 className="mt-1 text-[30px] font-bold tracking-tight">
              Alokasi Waktu
            </h1>

            <p className="mt-1 text-sm text-[#6B4A3A]">
              Kelola alokasi waktu pembelajaran mingguan oleh{" "}
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
            + Tambah Alokasi
          </button>
        </div>

        {errorMessage && !isModalOpen && (
          <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {loading && (
          <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-8 text-center text-sm shadow-sm">
            Loading alokasi waktu...
          </div>
        )}

        {!loading && (
          <>
            <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6B4A3A]">Total Alokasi</p>
                <p className="mt-4 text-3xl font-bold">
                  {allocations.length}
                </p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6B4A3A]">Murid</p>
                <p className="mt-4 text-3xl font-bold">{totalStudents}</p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6B4A3A]">Mapel</p>
                <p className="mt-4 text-3xl font-bold">{totalSubjects}</p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6B4A3A]">Minggu Terisi</p>
                <p className="mt-4 text-3xl font-bold">{totalFilledWeeks}</p>
              </div>
            </div>

            <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_210px_210px_240px]">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari murid, kelas, mapel, bulan, minggu..."
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
              <div className="overflow-hidden rounded-2xl border border-[#E8D6C1] bg-white shadow-sm">
                <div className="border-b border-[#E8D6C1] px-6 py-5">
                  <h2 className="text-lg font-bold">Daftar Alokasi Waktu</h2>
                  <p className="mt-1 text-sm text-[#6B4A3A]">
                    Data tersimpan di table time_allocations.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1180px] text-left">
                    <thead className="bg-[#FFF8EF] text-sm font-bold text-[#6B4A3A]">
                      <tr>
                        <th className="px-4 py-4">Murid</th>
                        <th className="px-4 py-4">Kelas</th>
                        <th className="px-4 py-4">Mapel</th>
                        <th className="px-4 py-4">Tahun Ajaran</th>
                        <th className="px-4 py-4">Semester</th>
                        <th className="px-4 py-4">Bulan</th>
                        <th className="px-4 py-4">Minggu 1</th>
                        <th className="px-4 py-4">Minggu 2</th>
                        <th className="px-4 py-4">Minggu 3</th>
                        <th className="px-4 py-4">Minggu 4</th>
                        <th className="px-4 py-4">Total</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#E8D6C1]">
                      {filteredAllocations.length === 0 && (
                        <tr>
                          <td
                            colSpan={11}
                            className="px-4 py-10 text-center text-sm text-[#6B4A3A]"
                          >
                            Belum ada alokasi waktu untuk guru ini.
                          </td>
                        </tr>
                      )}

                      {filteredAllocations.map((allocation) => (
                        <tr key={allocation.id} className="hover:bg-[#FFF8EF]">
                          <td className="px-4 py-4 font-semibold">
                            {allocation.students?.full_name || "-"}
                          </td>

                          <td className="px-4 py-4">
                            {allocation.class_level || "-"}
                          </td>

                          <td className="px-4 py-4">
                            {allocation.subjects?.name || "-"}
                          </td>

                          <td className="px-4 py-4">
                            {allocation.academic_year || "-"}
                          </td>

                          <td className="px-4 py-4">
                            {allocation.semester || "-"}
                          </td>

                          <td className="px-4 py-4">
                            {allocation.month_name || "-"}
                          </td>

                          <td className="px-4 py-4">
                            {formatTimeAllocation(allocation.week_1)}
                          </td>

                          <td className="px-4 py-4">
                            {formatTimeAllocation(allocation.week_2)}
                          </td>

                          <td className="px-4 py-4">
                            {formatTimeAllocation(allocation.week_3)}
                          </td>

                          <td className="px-4 py-4">
                            {formatTimeAllocation(allocation.week_4)}
                          </td>

                          <td className="px-4 py-4 font-bold text-[#7A1F2B]">
                            {allocation.total_allocation || "-"}
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
                          + Alokasi
                        </button>
                      </div>
                    ))}
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
                              {item.total} alokasi
                            </span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-[#F1DFD5]">
                            <div
                              className="h-full rounded-full bg-[#7A1F2B]"
                              style={{
                                width:
                                  allocations.length > 0
                                    ? `${
                                        (item.total / allocations.length) * 100
                                      }%`
                                    : "0%",
                              }}
                            />
                          </div>
                        </div>
                      ))}

                    {monthSummary.filter((item) => item.total > 0).length ===
                      0 && (
                      <div className="rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] p-4 text-sm text-[#6B4A3A]">
                        Belum ada ringkasan bulan.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold">Catatan</h2>
                  <p className="mt-3 text-sm leading-6 text-[#6B4A3A]">
                    Tombol{" "}
                    <span className="font-bold text-[#2B1B18]">
                      + Tambah Alokasi
                    </span>{" "}
                    akan menyimpan data baru ke table{" "}
                    <span className="font-bold text-[#2B1B18]">
                      time_allocations
                    </span>
                    .
                  </p>

                  <p className="mt-3 text-sm leading-6 text-[#6B4A3A]">
                    Contoh isi minggu:{" "}
                    <span className="font-bold text-[#2B1B18]">
                      2 JP - Pecahan Senilai
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
          <div className="flex max-h-[92vh] w-full max-w-[500px] flex-col overflow-hidden rounded-2xl bg-[#FAF3EA] shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-[#E8D6C1] px-6 py-5">
              <h2 className="text-xl font-bold">Tambah Alokasi Waktu</h2>

              <button
                type="button"
                onClick={closeModal}
                className="text-2xl leading-none text-[#6B4A3A] hover:text-[#7A1F2B]"
              >
                ×
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              {errorMessage && (
                <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleSubmitAllocation} className="space-y-4 pb-24">
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
                    {subjectOptions.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                        {subject.grade ? ` — ${subject.grade}` : ""}
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
                      placeholder="2026/2027"
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
                </div>

                <div>
                  <label className="text-sm font-bold">Minggu 1</label>
                  <input
                    value={form.week_1}
                    onChange={(event) =>
                      updateWeekField("week_1", event.target.value)
                    }
                    placeholder="Contoh: 2 JP - Pengenalan Materi"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Minggu 2</label>
                  <input
                    value={form.week_2}
                    onChange={(event) =>
                      updateWeekField("week_2", event.target.value)
                    }
                    placeholder="Contoh: 2 JP - Latihan Soal"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Minggu 3</label>
                  <input
                    value={form.week_3}
                    onChange={(event) =>
                      updateWeekField("week_3", event.target.value)
                    }
                    placeholder="Contoh: 2 JP - Evaluasi"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Minggu 4</label>
                  <input
                    value={form.week_4}
                    onChange={(event) =>
                      updateWeekField("week_4", event.target.value)
                    }
                    placeholder="Contoh: 2 JP - Review"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
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
                    placeholder="Contoh: 8 JP"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div className="sticky bottom-0 -mx-6 mt-5 border-t border-[#E8D6C1] bg-[#FAF3EA] px-6 pb-4 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-xl bg-[#7A1F2B] py-3 text-sm font-bold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Menyimpan..." : "Simpan Alokasi Waktu"}
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