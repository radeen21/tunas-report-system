"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import KepalaSekolahLayout from "../components/KepalaSekolahLayout";

type StudentOption = {
  id: string;
  full_name: string;
  grade: string | null;
};

type TeacherOption = {
  id: string;
  full_name: string;
};

type SubjectOption = {
  id: string;
  name: string;
};

type GalleryQueryResult = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  title: string;
  caption: string | null;
  image_url: string | null;
  activity_date: string | null;
  status: string | null;
  students: StudentOption | StudentOption[] | null;
  teachers: TeacherOption | TeacherOption[] | null;
  subjects: SubjectOption | SubjectOption[] | null;
};

type GalleryItem = GalleryQueryResult & {
  students: StudentOption | null;
  teachers: TeacherOption | null;
  subjects: SubjectOption | null;
};

type GalleryForm = {
  student_id: string;
  teacher_id: string;
  subject_id: string;
  title: string;
  caption: string;
  image_url: string;
  activity_date: string;
  status: string;
};

const initialForm: GalleryForm = {
  student_id: "",
  teacher_id: "",
  subject_id: "",
  title: "",
  caption: "",
  image_url: "",
  activity_date: "",
  status: "published",
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

export default function KepalaSekolahGalleryPage() {
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<GalleryForm>(initialForm);
  const [errorMessage, setErrorMessage] = useState("");

  async function fetchOptions() {
    const [studentsRes, teachersRes, subjectsRes] = await Promise.all([
      supabase.from("students").select("id, full_name, grade").order("full_name"),
      supabase.from("teachers").select("id, full_name").order("full_name"),
      supabase.from("subjects").select("id, name").order("name"),
    ]);

    setStudents(studentsRes.data || []);
    setTeachers(teachersRes.data || []);
    setSubjects(subjectsRes.data || []);
  }

  async function fetchGallery() {
    setLoading(true);
    setErrorMessage("");

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
        students (
          id,
          full_name,
          grade
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
      .order("activity_date", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    const rows = (data || []) as GalleryQueryResult[];

    setGallery(
      rows.map((item) => ({
        ...item,
        students: normalizeRelation(item.students),
        teachers: normalizeRelation(item.teachers),
        subjects: normalizeRelation(item.subjects),
      }))
    );

    setLoading(false);
  }

  async function fetchAllData() {
    await Promise.all([fetchOptions(), fetchGallery()]);
  }

  useEffect(() => {
    fetchAllData();
  }, []);

  const filteredGallery = useMemo(() => {
    const keyword = search.toLowerCase();

    return gallery.filter((item) => {
      const matchSearch =
        item.title.toLowerCase().includes(keyword) ||
        item.caption?.toLowerCase().includes(keyword) ||
        item.students?.full_name?.toLowerCase().includes(keyword) ||
        item.teachers?.full_name?.toLowerCase().includes(keyword) ||
        item.subjects?.name?.toLowerCase().includes(keyword);

      const matchStatus =
        statusFilter === "Semua Status" || item.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [gallery, search, statusFilter]);

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

    if (!form.title.trim()) {
      setErrorMessage("Judul foto wajib diisi.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from("gallery").insert({
        student_id: form.student_id,
        teacher_id: form.teacher_id,
        subject_id: form.subject_id,
        title: form.title.trim(),
        caption: form.caption.trim() || null,
        image_url: form.image_url.trim() || null,
        activity_date: form.activity_date || new Date().toISOString().slice(0, 10),
        status: form.status,
      });

      if (error) throw new Error(error.message);

      setForm(initialForm);
      setIsModalOpen(false);
      await fetchGallery();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal menyimpan foto."
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
      activeMenu="Gallery"
      searchPlaceholder="Cari gallery kegiatan..."
      buttonLabel="+ Upload Foto"
    >
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[30px] font-bold tracking-tight">Gallery</h1>
          <p className="mt-1 text-sm text-[#6B4A3A]">
            Kelola dokumentasi kegiatan belajar siswa.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="rounded-xl bg-[#7A1F2B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#54131D]"
        >
          + Upload Foto
        </button>
      </div>

      <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
        <div className="grid grid-cols-[1fr_220px] gap-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari judul, caption, siswa, guru, mapel..."
            className="w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
          >
            <option>Semua Status</option>
            <option value="draft">draft</option>
            <option value="published">published</option>
          </select>
        </div>
      </div>

      {errorMessage && !isModalOpen && (
        <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="mt-7 grid grid-cols-3 gap-5">
        {loading && (
          <div className="col-span-3 rounded-2xl border border-[#E8D6C1] bg-white p-8 text-center text-sm shadow-sm">
            Loading gallery...
          </div>
        )}

        {!loading && filteredGallery.length === 0 && (
          <div className="col-span-3 rounded-2xl border border-[#E8D6C1] bg-white p-8 text-center text-sm shadow-sm">
            Belum ada data gallery.
          </div>
        )}

        {!loading &&
          filteredGallery.map((item) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-2xl border border-[#E8D6C1] bg-white shadow-sm"
            >
              <div className="relative flex h-[220px] items-center justify-center bg-[#FDE7D7] text-5xl">
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="400px"
                  />
                ) : (
                  <span>🖼️</span>
                )}
              </div>

              <div className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="rounded-full bg-[#F1DFD5] px-3 py-1 text-xs font-bold text-[#7A1F2B]">
                    {item.subjects?.name || "-"}
                  </span>

                  <span className="text-xs text-[#6B4A3A]">
                    {formatDate(item.activity_date)}
                  </span>
                </div>

                <h2 className="font-bold">{item.title}</h2>

                <p className="mt-2 text-sm text-[#6B4A3A]">
                  {item.caption || "-"}
                </p>

                <div className="mt-4 border-t border-[#E8D6C1] pt-4 text-sm text-[#6B4A3A]">
                  <p>
                    <b>Siswa:</b> {item.students?.full_name || "-"}
                  </p>
                  <p>
                    <b>Guru:</b> {item.teachers?.full_name || "-"}
                  </p>
                  <p>
                    <b>Status:</b> {item.status || "-"}
                  </p>
                </div>
              </div>
            </div>
          ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
          <div className="flex max-h-[88vh] w-full max-w-[440px] flex-col overflow-hidden rounded-2xl bg-[#FAF3EA] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E8D6C1] px-6 py-5">
              <h2 className="text-xl font-bold">Upload Foto Kegiatan</h2>
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
                  <label className="text-sm font-bold">Judul Foto</label>
                  <input
                    value={form.title}
                    onChange={(event) =>
                      setForm({ ...form, title: event.target.value })
                    }
                    placeholder="Eksperimen sederhana siklus air"
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
                    rows={3}
                    placeholder="Deskripsi kegiatan..."
                    className="mt-2 w-full resize-none rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Image URL</label>
                  <input
                    value={form.image_url}
                    onChange={(event) =>
                      setForm({ ...form, image_url: event.target.value })
                    }
                    placeholder="https://..."
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                  <p className="mt-1 text-xs text-[#6B4A3A]">
                    Untuk MVP, masukkan URL gambar dulu. Upload file asli bisa
                    dibuat setelah storage Supabase disiapkan.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-bold">Tanggal Kegiatan</label>
                    <input
                      type="date"
                      value={form.activity_date}
                      onChange={(event) =>
                        setForm({ ...form, activity_date: event.target.value })
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
                      <option value="draft">draft</option>
                      <option value="published">published</option>
                    </select>
                  </div>
                </div>

                <div className="sticky bottom-0 -mx-6 mt-5 border-t border-[#E8D6C1] bg-[#FAF3EA] px-6 pb-1 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-xl bg-[#7A1F2B] py-3 text-sm font-bold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Menyimpan..." : "Simpan Foto"}
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