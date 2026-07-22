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
  students: StudentRelation | StudentRelation[] | null;
  subjects: SubjectRelation | SubjectRelation[] | null;
};

type GalleryItem = {
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
  students: StudentRelation | null;
  subjects: SubjectRelation | null;
};

type GalleryForm = {
  student_id: string;
  subject_id: string;
  title: string;
  caption: string;
  activity_date: string;
  status: string;
};

const GALLERY_BUCKET = "gallery-images";

const initialForm: GalleryForm = {
  student_id: "",
  subject_id: "",
  title: "",
  caption: "",
  activity_date: new Date().toISOString().slice(0, 10),
  status: "published",
};

function normalizeRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function normalizeText(value?: string | null) {
  return (value || "").trim().toLowerCase();
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
  if (status === "draft") return "Draft";
  if (status === "private") return "Private";
  if (status === "archived") return "Archived";

  return "Published";
}

function getStatusBadge(status: string | null) {
  if (status === "published") return "bg-emerald-100 text-emerald-700";
  if (status === "draft") return "bg-slate-200 text-slate-700";
  if (status === "private") return "bg-yellow-100 text-yellow-700";
  if (status === "archived") return "bg-red-100 text-red-700";

  return "bg-emerald-100 text-emerald-700";
}

function isImageUrl(url: string | null) {
  if (!url) return false;

  return (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("/")
  );
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getFileExtension(file: File) {
  const filename = file.name || "";
  const extension = filename.split(".").pop();

  return extension ? extension.toLowerCase() : "jpg";
}

function getSafeFilename(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60);
}

export default function TeacherGalleryPage() {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [studentFilter, setStudentFilter] = useState("Semua Murid");
  const [subjectFilter, setSubjectFilter] = useState("Semua Mapel");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<GalleryForm>(initialForm);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

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

  async function fetchGallery(teacherId: string) {
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
      const activeTeacher = await fetchActiveTeacher();

      if (!activeTeacher) {
        setErrorMessage("Belum ada data guru di table teachers.");
        setLoading(false);
        return;
      }

      await Promise.all([
        fetchStudents(activeTeacher.id),
        fetchSubjects(),
        fetchGallery(activeTeacher.id),
      ]);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengambil data gallery.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPageData();

    const channel = supabase
      .channel("teacher-gallery-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gallery" },
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

  const uploadSubjectOptions = useMemo(() => {
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

  const subjectOptions = useMemo(() => {
    const subjectNames = gallery
      .map((item) => item.subjects?.name)
      .filter(Boolean) as string[];

    return Array.from(new Set(subjectNames));
  }, [gallery]);

  const filteredGallery = useMemo(() => {
    const keyword = search.toLowerCase();

    return gallery.filter((item) => {
      const matchSearch =
        item.title?.toLowerCase().includes(keyword) ||
        item.caption?.toLowerCase().includes(keyword) ||
        item.students?.full_name?.toLowerCase().includes(keyword) ||
        item.students?.grade?.toLowerCase().includes(keyword) ||
        item.subjects?.name?.toLowerCase().includes(keyword);

      const matchStatus =
        statusFilter === "Semua Status" || item.status === statusFilter;

      const matchStudent =
        studentFilter === "Semua Murid" || item.student_id === studentFilter;

      const matchSubject =
        subjectFilter === "Semua Mapel" ||
        item.subjects?.name === subjectFilter;

      return matchSearch && matchStatus && matchStudent && matchSubject;
    });
  }, [gallery, search, statusFilter, studentFilter, subjectFilter]);

  const publishedCount = gallery.filter(
    (item) => item.status === "published" || !item.status
  ).length;

  const totalStudents = useMemo(() => {
    const studentIds = gallery
      .map((item) => item.student_id)
      .filter(Boolean) as string[];

    return new Set(studentIds).size;
  }, [gallery]);

  const totalSubjects = useMemo(() => {
    const subjectIds = gallery
      .map((item) => item.subject_id)
      .filter(Boolean) as string[];

    return new Set(subjectIds).size;
  }, [gallery]);

  const recentGallery = gallery.slice(0, 5);

  function openModal(student?: Student) {
    setErrorMessage("");
    setSelectedImageFile(null);
    setPreviewUrl("");

    setForm({
      ...initialForm,
      student_id: student?.id || "",
      activity_date: getTodayDate(),
    });

    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setErrorMessage("");
    setSelectedImageFile(null);
    setPreviewUrl("");

    setForm({
      ...initialForm,
      activity_date: getTodayDate(),
    });
  }

  function handleImageFileChange(file: File | null) {
    setErrorMessage("");

    if (!file) {
      setSelectedImageFile(null);
      setPreviewUrl("");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

    if (!allowedTypes.includes(file.type)) {
      setErrorMessage("File harus berupa gambar JPG, PNG, atau WEBP.");
      setSelectedImageFile(null);
      setPreviewUrl("");
      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      setErrorMessage("Ukuran gambar maksimal 5MB.");
      setSelectedImageFile(null);
      setPreviewUrl("");
      return;
    }

    setSelectedImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function uploadGalleryImage(file: File, teacherId: string) {
    const extension = getFileExtension(file);
    const safeTitle = getSafeFilename(form.title || "gallery-activity");
    const filePath = `${teacherId}/${Date.now()}-${safeTitle}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(GALLERY_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage
      .from(GALLERY_BUCKET)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function handleSubmitGallery(event: React.FormEvent<HTMLFormElement>) {
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
      setErrorMessage("Judul activity wajib diisi.");
      return;
    }

    if (!selectedImageFile) {
      setErrorMessage("File gambar wajib diupload.");
      return;
    }

    if (!form.activity_date) {
      setErrorMessage("Tanggal kegiatan wajib diisi.");
      return;
    }

    setSaving(true);

    try {
      const imageUrl = await uploadGalleryImage(selectedImageFile, teacher.id);

      const { error } = await supabase.from("gallery").insert({
        student_id: form.student_id,
        teacher_id: teacher.id,
        subject_id: form.subject_id,
        title: form.title.trim(),
        caption: form.caption.trim() || null,
        image_url: imageUrl,
        activity_date: form.activity_date,
        status: form.status,
      });

      if (error) {
        throw new Error(error.message);
      }

      setForm({
        ...initialForm,
        activity_date: getTodayDate(),
      });
      setSelectedImageFile(null);
      setPreviewUrl("");
      setIsModalOpen(false);
      await fetchGallery(teacher.id);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal menyimpan gallery.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <TeacherLayout
      activeMenu="Gallery Upload"
      teacherName={teacher?.full_name || "Guru"}
      teacherSubject={
        teacher?.subjects?.length
          ? `Guru — ${teacher.subjects.slice(0, 4).join(", ")}`
          : "Guru"
      }
      searchPlaceholder="Cari gallery activity..."
      buttonLabel="+ Upload Activity"
    >
      <div className="w-full max-w-full overflow-hidden">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#6B4A3A]">
              Teacher Portal
            </p>

            <h1 className="mt-1 text-[30px] font-bold tracking-tight">
              Gallery Upload
            </h1>

            <p className="mt-1 text-sm text-[#6B4A3A]">
              Upload dokumentasi kegiatan belajar oleh{" "}
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
            + Upload Activity
          </button>
        </div>

        {errorMessage && !isModalOpen && (
          <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {loading && (
          <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-8 text-center text-sm shadow-sm">
            Loading gallery activity...
          </div>
        )}

        {!loading && (
          <>
            <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6B4A3A]">Total Gallery</p>
                <p className="mt-4 text-3xl font-bold">{gallery.length}</p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6B4A3A]">Published</p>
                <p className="mt-4 text-3xl font-bold">{publishedCount}</p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6B4A3A]">Murid</p>
                <p className="mt-4 text-3xl font-bold">{totalStudents}</p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6B4A3A]">Mapel</p>
                <p className="mt-4 text-3xl font-bold">{totalSubjects}</p>
              </div>
            </div>

            <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_210px_240px_220px]">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari judul, caption, murid, kelas, mapel..."
                  className="w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                />

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                >
                  <option>Semua Status</option>
                  <option value="published">published</option>
                  <option value="draft">draft</option>
                  <option value="private">private</option>
                  <option value="archived">archived</option>
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

                <select
                  value={subjectFilter}
                  onChange={(event) => setSubjectFilter(event.target.value)}
                  className="rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                >
                  <option>Semua Mapel</option>
                  {subjectOptions.map((subject) => (
                    <option key={subject}>{subject}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
              <div>
                {filteredGallery.length === 0 && (
                  <div className="rounded-2xl border border-[#E8D6C1] bg-white p-10 text-center text-sm text-[#6B4A3A] shadow-sm">
                    Belum ada gallery activity untuk guru ini.
                  </div>
                )}

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {filteredGallery.map((item) => (
                    <div
                      key={item.id}
                      className="overflow-hidden rounded-2xl border border-[#E8D6C1] bg-white shadow-sm"
                    >
                      <div className="relative h-48 bg-[#F1DFD5]">
                        {isImageUrl(item.image_url) ? (
                          <img
                            src={item.image_url || ""}
                            alt={item.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-4xl">
                            🖼️
                          </div>
                        )}

                        <div className="absolute left-4 top-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusBadge(
                              item.status
                            )}`}
                          >
                            {getStatusLabel(item.status)}
                          </span>
                        </div>
                      </div>

                      <div className="p-5">
                        <p className="text-xs font-bold uppercase tracking-wide text-[#6B4A3A]">
                          {formatDate(item.activity_date)}
                        </p>

                        <h2 className="mt-2 text-lg font-bold">{item.title}</h2>

                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#6B4A3A]">
                          {item.caption || "-"}
                        </p>

                        <div className="mt-5 rounded-2xl bg-[#FFF8EF] p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FDE7D7] text-xs font-bold text-[#7A1F2B]">
                              {getInitials(item.students?.full_name || "Murid")}
                            </div>

                            <div>
                              <p className="text-sm font-bold">
                                {item.students?.full_name || "-"}
                              </p>
                              <p className="text-xs text-[#6B4A3A]">
                                {item.students?.grade || "-"} •{" "}
                                {item.subjects?.name || "-"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
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
                          + Upload
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold">Activity Terbaru</h2>

                  <div className="mt-5 space-y-3">
                    {recentGallery.length === 0 && (
                      <div className="rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] p-4 text-sm text-[#6B4A3A]">
                        Belum ada activity terbaru.
                      </div>
                    )}

                    {recentGallery.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-[#E8D6C1] p-4"
                      >
                        <p className="font-bold">{item.title}</p>

                        <p className="mt-1 text-sm text-[#6B4A3A]">
                          {item.students?.full_name || "-"} •{" "}
                          {item.subjects?.name || "-"}
                        </p>

                        <p className="mt-1 text-xs text-[#6B4A3A]">
                          {formatDate(item.activity_date)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold">Catatan</h2>
                  <p className="mt-3 text-sm leading-6 text-[#6B4A3A]">
                    Tombol{" "}
                    <span className="font-bold text-[#2B1B18]">
                      + Upload Activity
                    </span>{" "}
                    akan upload gambar ke Supabase Storage bucket{" "}
                    <span className="font-bold text-[#2B1B18]">
                      gallery-images
                    </span>{" "}
                    lalu menyimpan datanya ke table{" "}
                    <span className="font-bold text-[#2B1B18]">gallery</span>.
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
              <h2 className="text-xl font-bold">Upload Gallery Activity</h2>

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

              <form onSubmit={handleSubmitGallery} className="space-y-4 pb-24">
                <div>
                  <label className="text-sm font-bold">Murid</label>
                  <select
                    value={form.student_id}
                    onChange={(event) =>
                      setForm({ ...form, student_id: event.target.value })
                    }
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
                    {uploadSubjectOptions.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                        {subject.grade ? ` — ${subject.grade}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-bold">Judul Activity</label>
                  <input
                    value={form.title}
                    onChange={(event) =>
                      setForm({ ...form, title: event.target.value })
                    }
                    placeholder="Contoh: Eksperimen Siklus Air"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Caption</label>
                  <textarea
                    value={form.caption}
                    onChange={(event) =>
                      setForm({ ...form, caption: event.target.value })
                    }
                    placeholder="Ceritakan kegiatan belajar siswa"
                    rows={3}
                    className="mt-2 w-full resize-none rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Upload File Gambar</label>

                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={(event) =>
                      handleImageFileChange(event.target.files?.[0] || null)
                    }
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-[#7A1F2B] file:px-4 file:py-2 file:text-sm file:font-bold file:text-white focus:border-[#7A1F2B]"
                  />

                  <p className="mt-2 text-xs text-[#6B4A3A]">
                    Format JPG, PNG, atau WEBP. Maksimal 5MB.
                  </p>
                </div>

                {previewUrl && (
                  <div className="overflow-hidden rounded-2xl border border-[#E8D6C1] bg-white">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="h-44 w-full object-cover"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-bold">Tanggal Kegiatan</label>
                    <input
                      type="date"
                      value={form.activity_date}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          activity_date: event.target.value,
                        })
                      }
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
                      <option value="published">published</option>
                      <option value="draft">draft</option>
                      <option value="private">private</option>
                      <option value="archived">archived</option>
                    </select>
                  </div>
                </div>

                <div className="sticky bottom-0 -mx-6 mt-5 border-t border-[#E8D6C1] bg-[#FAF3EA] px-6 pb-4 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-xl bg-[#7A1F2B] py-3 text-sm font-bold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Mengupload..." : "Simpan Gallery"}
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