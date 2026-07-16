"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import ParentLayout from "../components/ParentLayout";

type Parent = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  relation: string | null;
};

type TeacherRelation = {
  id: string;
  full_name: string;
  email: string | null;
};

type StudentRow = {
  id: string;
  parent_id: string | null;
  homeroom_teacher_id: string | null;
  nis: string | null;
  nisn: string | null;
  full_name: string;
  level: string | null;
  grade: string | null;
  academic_year: string | null;
  status: string | null;
  teachers: TeacherRelation | TeacherRelation[] | null;
};

type Student = {
  id: string;
  parent_id: string | null;
  homeroom_teacher_id: string | null;
  nis: string | null;
  nisn: string | null;
  full_name: string;
  level: string | null;
  grade: string | null;
  academic_year: string | null;
  status: string | null;
  teachers: TeacherRelation | null;
};

type SubjectRelation = {
  id: string;
  name: string;
};

type GalleryRow = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  title: string;
  caption: string | null;
  image_url: string | null;
  activity_date: string | null;
  status: string | null;
  created_at: string | null;
  students: Student | Student[] | null;
  subjects: SubjectRelation | SubjectRelation[] | null;
};

type GalleryItem = Omit<GalleryRow, "students" | "subjects"> & {
  students: Student | null;
  subjects: SubjectRelation | null;
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

function isImageUrl(url: string | null) {
  if (!url) return false;

  return (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("/")
  );
}

function getStatusBadge(status: string | null) {
  if (status === "published" || !status) {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "draft") {
    return "bg-slate-200 text-slate-700";
  }

  if (status === "private") {
    return "bg-yellow-100 text-yellow-700";
  }

  if (status === "archived") {
    return "bg-red-100 text-red-700";
  }

  return "bg-slate-200 text-slate-700";
}

function getStatusLabel(status: string | null) {
  if (status === "published" || !status) return "Published";
  if (status === "draft") return "Draft";
  if (status === "private") return "Private";
  if (status === "archived") return "Archived";

  return status;
}

export default function ParentGalleryPage() {
  const [parent, setParent] = useState<Parent | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);

  const [search, setSearch] = useState("");
  const [studentFilter, setStudentFilter] = useState("Semua Murid");
  const [subjectFilter, setSubjectFilter] = useState("Semua Subject");
  const [dateFilter, setDateFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function fetchActiveParent() {
    const { data, error } = await supabase
      .from("parents")
      .select("id, full_name, email, phone, relation")
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);

    const parentList = data || [];

    const ericParent =
      parentList.find((item) =>
        item.full_name?.toLowerCase().includes("eric")
      ) || null;

    const selectedParent = ericParent || parentList[0] || null;

    setParent(selectedParent);

    return selectedParent;
  }

  async function fetchStudents(parentId: string) {
    const { data, error } = await supabase
      .from("students")
      .select(
        `
        id,
        parent_id,
        homeroom_teacher_id,
        nis,
        nisn,
        full_name,
        level,
        grade,
        academic_year,
        status,
        teachers (
          id,
          full_name,
          email
        )
      `
      )
      .eq("parent_id", parentId)
      .order("full_name", { ascending: true });

    if (error) throw new Error(error.message);

    const rows = (data || []) as StudentRow[];

    const normalizedStudents: Student[] = rows.map((item) => ({
      id: item.id,
      parent_id: item.parent_id,
      homeroom_teacher_id: item.homeroom_teacher_id,
      nis: item.nis,
      nisn: item.nisn,
      full_name: item.full_name,
      level: item.level,
      grade: item.grade,
      academic_year: item.academic_year,
      status: item.status,
      teachers: normalizeRelation(item.teachers),
    }));

    setStudents(normalizedStudents);

    return normalizedStudents;
  }

  async function fetchGallery(studentIds: string[]) {
    if (studentIds.length === 0) {
      setGallery([]);
      return;
    }

    const { data, error } = await supabase
      .from("gallery")
      .select(
        `
        id,
        student_id,
        teacher_id,
        subject_id,
        title,
        caption,
        image_url,
        activity_date,
        status,
        created_at,
        students (
          id,
          parent_id,
          homeroom_teacher_id,
          nis,
          nisn,
          full_name,
          level,
          grade,
          academic_year,
          status
        ),
        subjects (
          id,
          name
        )
      `
      )
      .in("student_id", studentIds)
      .order("activity_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const rows = (data || []) as GalleryRow[];

    const normalizedGallery: GalleryItem[] = rows.map((item) => ({
      id: item.id,
      student_id: item.student_id,
      teacher_id: item.teacher_id,
      subject_id: item.subject_id,
      title: item.title,
      caption: item.caption,
      image_url: item.image_url,
      activity_date: item.activity_date,
      status: item.status,
      created_at: item.created_at,
      students: normalizeRelation(item.students),
      subjects: normalizeRelation(item.subjects),
    }));

    setGallery(normalizedGallery);
  }

  async function fetchPageData() {
    setLoading(true);
    setErrorMessage("");

    try {
      const activeParent = await fetchActiveParent();

      if (!activeParent) {
        setErrorMessage("Belum ada data parent di table parents.");
        return;
      }

      const studentList = await fetchStudents(activeParent.id);

      if (studentList.length === 0) {
        setErrorMessage("Belum ada murid yang terhubung ke parent ini.");
        return;
      }

      await fetchGallery(studentList.map((student) => student.id));
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengambil gallery activity.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPageData();
  }, []);

  const subjectOptions = useMemo(() => {
    const subjects = gallery
      .map((item) => item.subjects?.name)
      .filter(Boolean) as string[];

    return Array.from(new Set(subjects));
  }, [gallery]);

  const filteredGallery = useMemo(() => {
    const keyword = search.toLowerCase();

    return gallery.filter((item) => {
      const matchSearch =
        item.title?.toLowerCase().includes(keyword) ||
        item.caption?.toLowerCase().includes(keyword) ||
        item.students?.full_name?.toLowerCase().includes(keyword) ||
        item.subjects?.name?.toLowerCase().includes(keyword);

      const matchStudent =
        studentFilter === "Semua Murid" || item.student_id === studentFilter;

      const matchSubject =
        subjectFilter === "Semua Subject" ||
        item.subjects?.name === subjectFilter;

      const matchDate =
        !dateFilter || item.activity_date === dateFilter;

      return matchSearch && matchStudent && matchSubject && matchDate;
    });
  }, [gallery, search, studentFilter, subjectFilter, dateFilter]);

  return (
    <ParentLayout
      activeMenu="Gallery Activity"
      searchPlaceholder="Cari gallery activity..."
      parentName={parent?.full_name || "Parent"}
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-7">
          <h1 className="text-[28px] font-extrabold tracking-tight">
            Gallery Activity
          </h1>

          <p className="mt-1 text-base text-[#6B4A3A]">
            Dokumentasi kegiatan belajar siswa
          </p>
        </div>

        {errorMessage && (
          <div className="mb-5 rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {loading && (
          <div className="rounded-2xl border border-[#E8D6C1] bg-white p-10 text-center text-sm shadow-sm">
            Loading gallery activity...
          </div>
        )}

        {!loading && (
          <>
            <div className="mb-7 rounded-2xl border border-[#E8D6C1] bg-white p-4 shadow-sm">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_190px_190px_170px]">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B4A3A]">
                    🔍
                  </span>

                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Cari aktivitas..."
                    className="w-full rounded-xl border border-[#E8D6C1] bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

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

                <select
                  value={subjectFilter}
                  onChange={(event) => setSubjectFilter(event.target.value)}
                  className="rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                >
                  <option>Semua Subject</option>
                  {subjectOptions.map((subject) => (
                    <option key={subject}>{subject}</option>
                  ))}
                </select>

                <input
                  type="date"
                  value={dateFilter}
                  onChange={(event) => setDateFilter(event.target.value)}
                  className="rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                />
              </div>
            </div>

            {filteredGallery.length === 0 && (
              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-10 text-center text-sm text-[#6B4A3A] shadow-sm">
                Belum ada gallery activity untuk filter ini.
              </div>
            )}

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
              {filteredGallery.map((item) => (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-2xl border border-[#E8D6C1] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="h-[285px] bg-[#F1DFD5]">
                    {isImageUrl(item.image_url) ? (
                      <img
                        src={item.image_url || ""}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-5xl">
                        🖼️
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-extrabold ${getStatusBadge(
                          item.status
                        )}`}
                      >
                        {item.subjects?.name || getStatusLabel(item.status)}
                      </span>

                      <p className="shrink-0 text-xs font-semibold text-[#6B4A3A]">
                        {formatDate(item.activity_date)}
                      </p>
                    </div>

                    <h2 className="line-clamp-2 text-base font-extrabold">
                      {item.title}
                    </h2>

                    <p className="mt-2 text-sm font-medium text-[#6B4A3A]">
                      {item.students?.full_name || "-"}
                    </p>

                    {item.caption && (
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#6B4A3A]">
                        {item.caption}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
              <h2 className="text-lg font-extrabold">Keterangan</h2>

              <p className="mt-3 text-sm leading-6 text-[#6B4A3A]">
                Data Gallery Activity ini otomatis mengambil dari table{" "}
                <span className="font-bold text-[#2B1B18]">gallery</span>.
                Setiap dokumentasi yang diupload guru akan tampil di halaman
                parent sesuai anak yang terhubung.
              </p>
            </div>
          </>
        )}
      </div>
    </ParentLayout>
  );
}