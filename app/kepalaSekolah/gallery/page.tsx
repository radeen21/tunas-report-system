"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Image as ImageIcon, Users, BookOpen, GraduationCap } from "lucide-react";
import { supabase } from "@/lib/supabase";
import KepalaSekolahLayout from "../components/KepalaSekolahLayout";

type TeacherRelation = {
  id: string;
  full_name: string | null;
  email: string | null;
  teacher_code: string | null;
  subjects: string[] | null;
};

type StudentRelation = {
  id: string;
  full_name: string | null;
  grade: string | null;
  level: string | null;
  nis: string | null;
  nisn: string | null;
};

type SubjectRelation = {
  id: string;
  name: string | null;
  level: string | null;
  grade: string | null;
};

type GalleryRow = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  title: string | null;
  caption: string | null;
  image_url: string | null;
  activity_date: string | null;
  status: string | null;
  created_at: string | null;
  teachers: TeacherRelation | TeacherRelation[] | null;
  students: StudentRelation | StudentRelation[] | null;
  subjects: SubjectRelation | SubjectRelation[] | null;
};

type GalleryItem = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  title: string | null;
  caption: string | null;
  image_url: string | null;
  activity_date: string | null;
  status: string | null;
  created_at: string | null;
  teachers: TeacherRelation | null;
  students: StudentRelation | null;
  subjects: SubjectRelation | null;
};

function normalizeRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function normalizeText(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function getInitials(name?: string | null) {
  if (!name) return "-";

  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getStatusLabel(status?: string | null) {
  if (status === "published") return "Published";
  if (status === "draft") return "Draft";
  if (status === "private") return "Private";
  if (status === "archived") return "Archived";

  return "Published";
}

function getStatusClass(status?: string | null) {
  if (status === "published") return "bg-emerald-100 text-emerald-700";
  if (status === "draft") return "bg-slate-200 text-slate-700";
  if (status === "private") return "bg-yellow-100 text-yellow-700";
  if (status === "archived") return "bg-red-100 text-red-700";

  return "bg-emerald-100 text-emerald-700";
}

function isValidImageUrl(url?: string | null) {
  if (!url) return false;

  return (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("/")
  );
}

export default function KepalaSekolahGalleryPage() {
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [teacherFilter, setTeacherFilter] = useState("Semua Guru");
  const [studentFilter, setStudentFilter] = useState("Semua Murid");

  const [selectedGallery, setSelectedGallery] = useState<GalleryItem | null>(
    null
  );

  async function fetchGallery() {
    setLoading(true);
    setErrorMessage("");

    try {
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
          teachers (
            id,
            full_name,
            email,
            teacher_code,
            subjects
          ),
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
        .order("activity_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

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
        teachers: normalizeRelation(item.teachers),
        students: normalizeRelation(item.students),
        subjects: normalizeRelation(item.subjects),
      }));

      setGallery(normalizedGallery);
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
    fetchGallery();

    const channel = supabase
      .channel("kepala-sekolah-gallery-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gallery" },
        fetchGallery
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teachers" },
        fetchGallery
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        fetchGallery
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const teacherOptions = useMemo(() => {
    const map = new Map<string, string>();

    gallery.forEach((item) => {
      if (!item.teacher_id) return;
      map.set(item.teacher_id, item.teachers?.full_name || "Tanpa Nama");
    });

    return Array.from(map.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }, [gallery]);

  const studentOptions = useMemo(() => {
    const map = new Map<string, string>();

    gallery.forEach((item) => {
      if (!item.student_id) return;
      map.set(item.student_id, item.students?.full_name || "Tanpa Nama");
    });

    return Array.from(map.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }, [gallery]);

  const filteredGallery = useMemo(() => {
    const keyword = normalizeText(search);

    return gallery.filter((item) => {
      const matchSearch =
        !keyword ||
        normalizeText(item.title).includes(keyword) ||
        normalizeText(item.caption).includes(keyword) ||
        normalizeText(item.teachers?.full_name).includes(keyword) ||
        normalizeText(item.students?.full_name).includes(keyword) ||
        normalizeText(item.students?.grade).includes(keyword) ||
        normalizeText(item.subjects?.name).includes(keyword);

      const matchStatus =
        statusFilter === "Semua Status" || item.status === statusFilter;

      const matchTeacher =
        teacherFilter === "Semua Guru" || item.teacher_id === teacherFilter;

      const matchStudent =
        studentFilter === "Semua Murid" || item.student_id === studentFilter;

      return matchSearch && matchStatus && matchTeacher && matchStudent;
    });
  }, [gallery, search, statusFilter, teacherFilter, studentFilter]);

  const publishedCount = gallery.filter(
    (item) => item.status === "published" || !item.status
  ).length;

  const draftCount = gallery.filter((item) => item.status === "draft").length;

  const totalTeachers = useMemo(() => {
    const ids = gallery.map((item) => item.teacher_id).filter(Boolean);
    return new Set(ids).size;
  }, [gallery]);

  const totalStudents = useMemo(() => {
    const ids = gallery.map((item) => item.student_id).filter(Boolean);
    return new Set(ids).size;
  }, [gallery]);

  return (
    <KepalaSekolahLayout
      activeMenu="Gallery"
      searchPlaceholder="Cari gallery activity..."
    >
      <div className="w-full max-w-full overflow-hidden">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#6B4A3A]">
              Principal Portal
            </p>

            <h1 className="mt-1 text-[30px] font-bold tracking-tight text-[#2B1B18]">
              Gallery Activity
            </h1>

            <p className="mt-1 text-sm text-[#6B4A3A]">
              Monitoring dokumentasi kegiatan belajar yang diupload oleh guru.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {loading ? (
          <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-8 text-center text-sm shadow-sm">
            Loading gallery activity...
          </div>
        ) : (
          <>
            <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Total Gallery"
                value={gallery.length}
                icon={<ImageIcon className="h-5 w-5" />}
              />

              <SummaryCard
                label="Published"
                value={publishedCount}
                icon={<BookOpen className="h-5 w-5" />}
              />

              <SummaryCard
                label="Draft"
                value={draftCount}
                icon={<ImageIcon className="h-5 w-5" />}
              />

              <SummaryCard
                label="Guru Upload"
                value={totalTeachers}
                icon={<GraduationCap className="h-5 w-5" />}
              />
            </div>

            <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_210px_240px_240px]">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8E6A58]" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Cari judul, caption, guru, murid, mapel..."
                    className="h-12 w-full rounded-xl border border-[#E8D6C1] bg-white pl-11 pr-4 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="h-12 rounded-xl border border-[#E8D6C1] bg-white px-4 text-sm outline-none focus:border-[#7A1F2B]"
                >
                  <option>Semua Status</option>
                  <option value="published">published</option>
                  <option value="draft">draft</option>
                  <option value="private">private</option>
                  <option value="archived">archived</option>
                </select>

                <select
                  value={teacherFilter}
                  onChange={(event) => setTeacherFilter(event.target.value)}
                  className="h-12 rounded-xl border border-[#E8D6C1] bg-white px-4 text-sm outline-none focus:border-[#7A1F2B]"
                >
                  <option>Semua Guru</option>
                  {teacherOptions.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>

                <select
                  value={studentFilter}
                  onChange={(event) => setStudentFilter(event.target.value)}
                  className="h-12 rounded-xl border border-[#E8D6C1] bg-white px-4 text-sm outline-none focus:border-[#7A1F2B]"
                >
                  <option>Semua Murid</option>
                  {studentOptions.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
              <div>
                {filteredGallery.length === 0 ? (
                  <div className="rounded-2xl border border-[#E8D6C1] bg-white p-10 text-center text-sm text-[#6B4A3A] shadow-sm">
                    Belum ada gallery activity.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {filteredGallery.map((item) => (
                      <div
                        key={item.id}
                        className="overflow-hidden rounded-2xl border border-[#E8D6C1] bg-white shadow-sm"
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedGallery(item)}
                          className="block w-full text-left"
                        >
                          <div className="relative h-48 bg-[#F1DFD5]">
                            {isValidImageUrl(item.image_url) ? (
                              <img
                                src={item.image_url || ""}
                                alt={item.title || "Gallery image"}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-4xl">
                                🖼️
                              </div>
                            )}

                            <div className="absolute left-4 top-4">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
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

                            <h2 className="mt-2 line-clamp-2 text-lg font-bold text-[#2B1B18]">
                              {item.title || "-"}
                            </h2>

                            <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#6B4A3A]">
                              {item.caption || "-"}
                            </p>

                            <div className="mt-5 rounded-2xl bg-[#FFF8EF] p-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FDE7D7] text-xs font-bold text-[#7A1F2B]">
                                  {getInitials(item.students?.full_name)}
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate text-sm font-bold text-[#2B1B18]">
                                    {item.students?.full_name || "-"}
                                  </p>
                                  <p className="truncate text-xs text-[#6B4A3A]">
                                    {item.students?.grade || "-"} •{" "}
                                    {item.subjects?.name || "-"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-5">
                <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#2B1B18]">
                    Ringkasan Gallery
                  </h2>

                  <div className="mt-5 space-y-4">
                    <InfoRow label="Total Upload" value={gallery.length} />
                    <InfoRow label="Published" value={publishedCount} />
                    <InfoRow label="Draft" value={draftCount} />
                    <InfoRow label="Guru Upload" value={totalTeachers} />
                    <InfoRow label="Murid Terkait" value={totalStudents} />
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#2B1B18]">
                    Activity Terbaru
                  </h2>

                  <div className="mt-5 space-y-3">
                    {gallery.slice(0, 5).length === 0 ? (
                      <div className="rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] p-4 text-sm text-[#6B4A3A]">
                        Belum ada activity terbaru.
                      </div>
                    ) : (
                      gallery.slice(0, 5).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedGallery(item)}
                          className="w-full rounded-xl border border-[#E8D6C1] p-4 text-left transition hover:bg-[#FFF8EF]"
                        >
                          <p className="font-bold text-[#2B1B18]">
                            {item.title || "-"}
                          </p>

                          <p className="mt-1 text-sm text-[#6B4A3A]">
                            {item.teachers?.full_name || "-"} •{" "}
                            {item.students?.full_name || "-"}
                          </p>

                          <p className="mt-1 text-xs text-[#6B4A3A]">
                            {formatDate(item.activity_date)}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#2B1B18]">Catatan</h2>
                  <p className="mt-3 text-sm leading-6 text-[#6B4A3A]">
                    Halaman ini memakai tag{" "}
                    <span className="font-bold text-[#2B1B18]">&lt;img&gt;</span>{" "}
                    agar gambar dari Supabase Storage maupun link eksternal lama
                    tetap bisa tampil tanpa error konfigurasi domain Next.js.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {selectedGallery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
          <div className="flex max-h-[92vh] w-full max-w-[760px] flex-col overflow-hidden rounded-2xl bg-[#FAF3EA] shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-[#E8D6C1] px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-[#2B1B18]">
                  Detail Gallery
                </h2>
                <p className="mt-1 text-sm text-[#6B4A3A]">
                  {formatDate(selectedGallery.activity_date)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedGallery(null)}
                className="text-2xl leading-none text-[#6B4A3A] hover:text-[#7A1F2B]"
              >
                ×
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              <div className="overflow-hidden rounded-2xl border border-[#E8D6C1] bg-white">
                {isValidImageUrl(selectedGallery.image_url) ? (
                  <img
                    src={selectedGallery.image_url || ""}
                    alt={selectedGallery.title || "Gallery image"}
                    className="max-h-[420px] w-full object-cover"
                  />
                ) : (
                  <div className="flex h-72 w-full items-center justify-center bg-[#F1DFD5] text-5xl">
                    🖼️
                  </div>
                )}
              </div>

              <div className="mt-5 rounded-2xl border border-[#E8D6C1] bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-[#2B1B18]">
                      {selectedGallery.title || "-"}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#6B4A3A]">
                      {selectedGallery.caption || "-"}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
                      selectedGallery.status
                    )}`}
                  >
                    {getStatusLabel(selectedGallery.status)}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <DetailBox
                    label="Guru"
                    value={selectedGallery.teachers?.full_name || "-"}
                  />

                  <DetailBox
                    label="Murid"
                    value={selectedGallery.students?.full_name || "-"}
                  />

                  <DetailBox
                    label="Mapel"
                    value={selectedGallery.subjects?.name || "-"}
                  />

                  <DetailBox
                    label="Kelas"
                    value={selectedGallery.students?.grade || "-"}
                  />

                  <DetailBox
                    label="NIS"
                    value={selectedGallery.students?.nis || "-"}
                  />

                  <DetailBox
                    label="Tanggal"
                    value={formatDate(selectedGallery.activity_date)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </KepalaSekolahLayout>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FDE7D7] text-[#7A1F2B]">
          {icon}
        </div>

        <span className="text-xs font-bold text-emerald-700">Data</span>
      </div>

      <p className="text-3xl font-bold text-[#2B1B18]">{value}</p>
      <p className="mt-2 text-sm text-[#6B4A3A]">{label}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-[#FFF8EF] px-4 py-3">
      <span className="text-sm text-[#6B4A3A]">{label}</span>
      <span className="font-bold text-[#2B1B18]">{value}</span>
    </div>
  );
}

function DetailBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#FFF8EF] p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-[#6B4A3A]">
        {label}
      </p>
      <p className="mt-2 font-bold text-[#2B1B18]">{value}</p>
    </div>
  );
}