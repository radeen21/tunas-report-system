"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CalendarDays,
  Clock,
  Edit3,
  Layers3,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import KepalaSekolahLayout from "../components/KepalaSekolahLayout";

type TeacherRow = {
  id: string;
  full_name: string | null;
};

type SubjectRow = {
  id: string;
  name: string | null;
};

type MaterialFrameworkRow = {
  id: string;
  teacher_id: string | null;
  subject_id: string | null;
  framework_title: string | null;
  level: string | null;
  grade: string | null;
  semester: string | null;
  academic_year: string | null;
};

type TimeAllocationRow = {
  id: string;
  material_framework_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  level: string | null;
  grade: string | null;
  semester: string | null;
  academic_year: string | null;
  total_meetings: number | null;
  minutes_per_meeting: number | null;
  total_minutes: number | null;
  weeks_count: number | null;
  allocation_notes: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type EnrichedAllocation = TimeAllocationRow & {
  teacher_name: string;
  subject_name: string;
  framework_title: string;
};

type AllocationForm = {
  id: string;
  material_framework_id: string;
  teacher_id: string;
  subject_id: string;
  level: string;
  grade: string;
  semester: string;
  academic_year: string;
  total_meetings: string;
  minutes_per_meeting: string;
  weeks_count: string;
  allocation_notes: string;
};

function emptyForm(): AllocationForm {
  return {
    id: "",
    material_framework_id: "",
    teacher_id: "",
    subject_id: "",
    level: "",
    grade: "",
    semester: "",
    academic_year: "2026/2027",
    total_meetings: "",
    minutes_per_meeting: "",
    weeks_count: "",
    allocation_notes: "",
  };
}

function normalizeText(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function numberValue(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export default function KepalaSekolahAlokasiWaktuPage() {
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [frameworks, setFrameworks] = useState<MaterialFrameworkRow[]>([]);
  const [allocations, setAllocations] = useState<EnrichedAllocation[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [teacherFilter, setTeacherFilter] = useState("Semua Guru");
  const [semesterFilter, setSemesterFilter] = useState("Semua Semester");

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<AllocationForm>(emptyForm());

  async function fetchData() {
    setLoading(true);

    const [teachersRes, subjectsRes, frameworksRes, allocationsRes] =
      await Promise.all([
        supabase.from("teachers").select("*").order("full_name"),
        supabase.from("subjects").select("*").order("name"),
        supabase
          .from("material_frameworks")
          .select("*")
          .order("updated_at", { ascending: false }),
        supabase
          .from("time_allocations")
          .select("*")
          .order("updated_at", { ascending: false }),
      ]);

    const teachersData = (teachersRes.data || []) as TeacherRow[];
    const subjectsData = (subjectsRes.data || []) as SubjectRow[];
    const frameworksData = (frameworksRes.data || []) as MaterialFrameworkRow[];
    const allocationsData = (allocationsRes.data || []) as TimeAllocationRow[];

    const teacherMap = new Map(teachersData.map((teacher) => [teacher.id, teacher]));
    const subjectMap = new Map(subjectsData.map((subject) => [subject.id, subject]));
    const frameworkMap = new Map(
      frameworksData.map((framework) => [framework.id, framework])
    );

    const enriched = allocationsData.map((allocation) => {
      const framework = allocation.material_framework_id
        ? frameworkMap.get(allocation.material_framework_id)
        : null;

      const teacherId = allocation.teacher_id || framework?.teacher_id || "";
      const subjectId = allocation.subject_id || framework?.subject_id || "";

      const teacher = teacherId ? teacherMap.get(teacherId) : null;
      const subject = subjectId ? subjectMap.get(subjectId) : null;

      return {
        ...allocation,
        teacher_name: teacher?.full_name || "-",
        subject_name: subject?.name || "-",
        framework_title: framework?.framework_title || "-",
      };
    });

    setTeachers(teachersData);
    setSubjects(subjectsData);
    setFrameworks(frameworksData);
    setAllocations(enriched);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("kepala-alokasi-waktu-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "time_allocations" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "material_frameworks" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teachers" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subjects" },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const selectedFramework = useMemo(() => {
    return (
      frameworks.find((framework) => framework.id === form.material_framework_id) ||
      null
    );
  }, [frameworks, form.material_framework_id]);

  const filteredAllocations = useMemo(() => {
    const q = normalizeText(search);

    return allocations.filter((allocation) => {
      const matchSearch =
        !q ||
        normalizeText(allocation.framework_title).includes(q) ||
        normalizeText(allocation.teacher_name).includes(q) ||
        normalizeText(allocation.subject_name).includes(q) ||
        normalizeText(allocation.level).includes(q) ||
        normalizeText(allocation.grade).includes(q) ||
        normalizeText(allocation.allocation_notes).includes(q);

      const matchTeacher =
        teacherFilter === "Semua Guru" || allocation.teacher_id === teacherFilter;

      const matchSemester =
        semesterFilter === "Semua Semester" ||
        allocation.semester === semesterFilter;

      return matchSearch && matchTeacher && matchSemester;
    });
  }, [allocations, search, teacherFilter, semesterFilter]);

  const summary = useMemo(() => {
    const totalMeetings = allocations.reduce((sum, item) => {
      return sum + Number(item.total_meetings || 0);
    }, 0);

    const totalMinutes = allocations.reduce((sum, item) => {
      return sum + Number(item.total_minutes || 0);
    }, 0);

    const totalWeeks = allocations.reduce((sum, item) => {
      return sum + Number(item.weeks_count || 0);
    }, 0);

    return {
      total: allocations.length,
      totalMeetings,
      totalMinutes,
      totalWeeks,
    };
  }, [allocations]);

  function updateForm(field: keyof AllocationForm, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleSelectFramework(frameworkId: string) {
    const framework = frameworks.find((item) => item.id === frameworkId);

    setForm((prev) => ({
      ...prev,
      material_framework_id: frameworkId,
      teacher_id: framework?.teacher_id || "",
      subject_id: framework?.subject_id || "",
      level: framework?.level || "",
      grade: framework?.grade || "",
      semester: framework?.semester || "",
      academic_year: framework?.academic_year || prev.academic_year,
    }));
  }

  function openCreateModal() {
    setForm(emptyForm());
    setShowModal(true);
  }

  function openEditModal(allocation: EnrichedAllocation) {
    setForm({
      id: allocation.id,
      material_framework_id: allocation.material_framework_id || "",
      teacher_id: allocation.teacher_id || "",
      subject_id: allocation.subject_id || "",
      level: allocation.level || "",
      grade: allocation.grade || "",
      semester: allocation.semester || "",
      academic_year: allocation.academic_year || "2026/2027",
      total_meetings: String(allocation.total_meetings || ""),
      minutes_per_meeting: String(allocation.minutes_per_meeting || ""),
      weeks_count: String(allocation.weeks_count || ""),
      allocation_notes: allocation.allocation_notes || "",
    });

    setShowModal(true);
  }

  function validateForm() {
    if (!form.teacher_id) {
      alert("Pilih guru terlebih dahulu.");
      return false;
    }

    if (!form.subject_id) {
      alert("Pilih mata pelajaran terlebih dahulu.");
      return false;
    }

    if (!form.level.trim()) {
      alert("Isi level terlebih dahulu.");
      return false;
    }

    if (!form.grade.trim()) {
      alert("Isi kelas terlebih dahulu.");
      return false;
    }

    if (!form.semester.trim()) {
      alert("Isi semester terlebih dahulu.");
      return false;
    }

    if (!form.total_meetings.trim()) {
      alert("Isi total pertemuan terlebih dahulu.");
      return false;
    }

    if (!form.minutes_per_meeting.trim()) {
      alert("Isi menit per pertemuan terlebih dahulu.");
      return false;
    }

    return true;
  }

  async function handleSave() {
    if (!validateForm()) return;

    setSaving(true);

    const now = new Date().toISOString();
    const totalMeetings = numberValue(form.total_meetings) || 0;
    const minutesPerMeeting = numberValue(form.minutes_per_meeting) || 0;
    const totalMinutes = totalMeetings * minutesPerMeeting;

    const payload = {
      material_framework_id: form.material_framework_id || null,
      teacher_id: form.teacher_id,
      subject_id: form.subject_id,
      level: form.level.trim(),
      grade: form.grade.trim(),
      semester: form.semester.trim(),
      academic_year: form.academic_year.trim() || "2026/2027",
      total_meetings: totalMeetings,
      minutes_per_meeting: minutesPerMeeting,
      total_minutes: totalMinutes,
      weeks_count: numberValue(form.weeks_count),
      allocation_notes: form.allocation_notes.trim() || null,
      updated_at: now,
    };

    if (form.id) {
      const { error } = await supabase
        .from("time_allocations")
        .update(payload)
        .eq("id", form.id);

      if (error) {
        setSaving(false);
        alert(`Gagal update alokasi waktu: ${error.message}`);
        return;
      }
    } else {
      const { error } = await supabase.from("time_allocations").insert(payload);

      if (error) {
        setSaving(false);
        alert(`Gagal tambah alokasi waktu: ${error.message}`);
        return;
      }
    }

    await fetchData();

    setSaving(false);
    setShowModal(false);
    setForm(emptyForm());

    alert("Alokasi waktu berhasil disimpan.");
  }

  async function handleDelete(allocation: EnrichedAllocation) {
    const confirmDelete = confirm(
      `Hapus alokasi waktu "${allocation.framework_title}"?`
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("time_allocations")
      .delete()
      .eq("id", allocation.id);

    if (error) {
      alert(`Gagal hapus alokasi waktu: ${error.message}`);
      return;
    }

    await fetchData();
  }

  return (
    <KepalaSekolahLayout
      activeMenu="Alokasi Waktu"
      searchPlaceholder="Cari alokasi waktu..."
    >
      <section className="space-y-7">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#8A5A48]">
              Kepala Sekolah
            </p>

            <h1 className="mt-2 text-[30px] font-extrabold tracking-[-0.02em] text-[#2B1B18]">
              Alokasi Waktu
            </h1>

            <p className="mt-2 max-w-[850px] text-[15px] leading-6 text-[#6F5549]">
              Kelola alokasi waktu pembelajaran berdasarkan guru, mapel,
              kerangka materi, jumlah pertemuan, dan menit per pertemuan.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex h-11 w-fit items-center gap-2 rounded-xl bg-[#8C0F2D] px-5 text-[14px] font-extrabold text-white shadow-sm transition hover:bg-[#54131D]"
          >
            <Plus className="h-4 w-4" />
            Tambah Alokasi
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={<Layers3 className="h-5 w-5" />}
            label="Total Alokasi"
            value={summary.total}
            info="Data"
            tone="pink"
          />

          <SummaryCard
            icon={<CalendarDays className="h-5 w-5" />}
            label="Total Pertemuan"
            value={summary.totalMeetings}
            info="Meeting"
            tone="orange"
          />

          <SummaryCard
            icon={<Clock className="h-5 w-5" />}
            label="Total Menit"
            value={summary.totalMinutes}
            info="Menit"
            tone="blue"
          />

          <SummaryCard
            icon={<CalendarDays className="h-5 w-5" />}
            label="Total Minggu"
            value={summary.totalWeeks}
            info="Minggu"
            tone="green"
          />
        </div>

        <div className="rounded-[22px] border border-[#E1CFBE] bg-white p-5 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr_1fr]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8E6A58]" />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari kerangka, guru, mapel, kelas, atau catatan..."
                className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] pl-11 pr-4 text-[14px] outline-none placeholder:text-[#9A7B6C] focus:border-[#9C0824]"
              />
            </div>

            <select
              value={teacherFilter}
              onChange={(event) => setTeacherFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              <option value="Semua Guru">Semua Guru</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.full_name}
                </option>
              ))}
            </select>

            <select
              value={semesterFilter}
              onChange={(event) => setSemesterFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              <option>Semua Semester</option>
              <option value="Ganjil">Ganjil</option>
              <option value="Genap">Genap</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-[22px] border border-[#E1CFBE] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse">
              <thead>
                <tr className="border-b border-[#EADACA] bg-[#FFF8EF] text-left text-[13px] font-extrabold text-[#6F5549]">
                  <th className="px-6 py-4">Kerangka Materi</th>
                  <th className="px-6 py-4">Guru</th>
                  <th className="px-6 py-4">Mapel</th>
                  <th className="px-6 py-4">Kelas</th>
                  <th className="px-6 py-4">Semester</th>
                  <th className="px-6 py-4">Pertemuan</th>
                  <th className="px-6 py-4">Total Menit</th>
                  <th className="px-6 py-4">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-12 text-center text-[#6F5549]"
                    >
                      Memuat data alokasi waktu...
                    </td>
                  </tr>
                ) : filteredAllocations.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-12 text-center text-[#6F5549]"
                    >
                      Belum ada data alokasi waktu.
                    </td>
                  </tr>
                ) : (
                  filteredAllocations.map((allocation) => (
                    <tr
                      key={allocation.id}
                      className="border-b border-[#F0E1D4] text-[14px] text-[#2B1B18]"
                    >
                      <td className="px-6 py-4">
                        <p className="font-extrabold">
                          {allocation.framework_title}
                        </p>
                        <p className="mt-1 text-[12px] text-[#6F5549]">
                          Update: {formatDateTime(allocation.updated_at)}
                        </p>
                      </td>

                      <td className="px-6 py-4">{allocation.teacher_name}</td>
                      <td className="px-6 py-4">{allocation.subject_name}</td>

                      <td className="px-6 py-4">
                        {allocation.level} — {allocation.grade}
                      </td>

                      <td className="px-6 py-4">
                        {allocation.semester || "-"}
                        <br />
                        <span className="text-[12px] text-[#6F5549]">
                          {allocation.academic_year || "-"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {allocation.total_meetings || 0}x
                        <br />
                        <span className="text-[12px] text-[#6F5549]">
                          {allocation.minutes_per_meeting || 0} menit/pertemuan
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-extrabold">
                          {allocation.total_minutes || 0}
                        </span>{" "}
                        menit
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(allocation)}
                            className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#DCC8B6] px-3 text-[13px] font-extrabold text-[#8C0F2D] transition hover:bg-[#FFF8EF]"
                          >
                            <Edit3 className="h-4 w-4" />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(allocation)}
                            className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#FECACA] px-3 text-[13px] font-extrabold text-[#DC2626] transition hover:bg-[#FFF1F2]"
                          >
                            <Trash2 className="h-4 w-4" />
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {showModal ? (
        <AllocationModal
          form={form}
          teachers={teachers}
          subjects={subjects}
          frameworks={frameworks}
          selectedFramework={selectedFramework}
          saving={saving}
          onChange={updateForm}
          onSelectFramework={handleSelectFramework}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      ) : null}
    </KepalaSekolahLayout>
  );
}

function AllocationModal({
  form,
  teachers,
  subjects,
  frameworks,
  selectedFramework,
  saving,
  onChange,
  onSelectFramework,
  onClose,
  onSave,
}: {
  form: AllocationForm;
  teachers: TeacherRow[];
  subjects: SubjectRow[];
  frameworks: MaterialFrameworkRow[];
  selectedFramework: MaterialFrameworkRow | null;
  saving: boolean;
  onChange: (field: keyof AllocationForm, value: string) => void;
  onSelectFramework: (frameworkId: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const totalMeetings = numberValue(form.total_meetings) || 0;
  const minutesPerMeeting = numberValue(form.minutes_per_meeting) || 0;
  const totalMinutes = totalMeetings * minutesPerMeeting;

  return (
    <ModalShell
      title={form.id ? "Edit Alokasi Waktu" : "Tambah Alokasi Waktu"}
      subtitle="Atur jumlah pertemuan, menit per pertemuan, dan total alokasi waktu."
      onClose={onClose}
    >
      <div className="space-y-5">
        <FormGroup label="Kerangka Materi">
          <select
            value={form.material_framework_id}
            onChange={(event) => onSelectFramework(event.target.value)}
            className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
          >
            <option value="">Pilih Kerangka Materi</option>
            {frameworks.map((framework) => (
              <option key={framework.id} value={framework.id}>
                {framework.framework_title} — {framework.level} {framework.grade}
              </option>
            ))}
          </select>
        </FormGroup>

        {selectedFramework ? (
          <div className="rounded-2xl border border-[#E1CFBE] bg-white px-5 py-4">
            <p className="text-[13px] font-extrabold uppercase tracking-[0.08em] text-[#8A5A48]">
              Kerangka Dipilih
            </p>
            <p className="mt-2 text-[15px] font-extrabold text-[#2B1B18]">
              {selectedFramework.framework_title}
            </p>
            <p className="mt-1 text-[13px] text-[#6F5549]">
              {selectedFramework.level} {selectedFramework.grade} • Semester{" "}
              {selectedFramework.semester} • {selectedFramework.academic_year}
            </p>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <FormGroup label="Guru">
            <select
              value={form.teacher_id}
              onChange={(event) => onChange("teacher_id", event.target.value)}
              className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              <option value="">Pilih Guru</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.full_name}
                </option>
              ))}
            </select>
          </FormGroup>

          <FormGroup label="Mata Pelajaran">
            <select
              value={form.subject_id}
              onChange={(event) => onChange("subject_id", event.target.value)}
              className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              <option value="">Pilih Mapel</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </FormGroup>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <FormGroup label="Level">
            <input
              value={form.level}
              onChange={(event) => onChange("level", event.target.value)}
              placeholder="SD / SMP / SMA"
              className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
            />
          </FormGroup>

          <FormGroup label="Kelas">
            <input
              value={form.grade}
              onChange={(event) => onChange("grade", event.target.value)}
              placeholder="Kelas 7"
              className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
            />
          </FormGroup>

          <FormGroup label="Semester">
            <select
              value={form.semester}
              onChange={(event) => onChange("semester", event.target.value)}
              className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              <option value="">Pilih Semester</option>
              <option value="Ganjil">Ganjil</option>
              <option value="Genap">Genap</option>
            </select>
          </FormGroup>

          <FormGroup label="Tahun Ajaran">
            <input
              value={form.academic_year}
              onChange={(event) => onChange("academic_year", event.target.value)}
              placeholder="2026/2027"
              className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
            />
          </FormGroup>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <FormGroup label="Total Pertemuan">
            <input
              type="number"
              value={form.total_meetings}
              onChange={(event) => onChange("total_meetings", event.target.value)}
              placeholder="Contoh: 16"
              className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
            />
          </FormGroup>

          <FormGroup label="Menit Per Pertemuan">
            <input
              type="number"
              value={form.minutes_per_meeting}
              onChange={(event) =>
                onChange("minutes_per_meeting", event.target.value)
              }
              placeholder="Contoh: 60"
              className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
            />
          </FormGroup>

          <FormGroup label="Jumlah Minggu">
            <input
              type="number"
              value={form.weeks_count}
              onChange={(event) => onChange("weeks_count", event.target.value)}
              placeholder="Contoh: 8"
              className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
            />
          </FormGroup>
        </div>

        <div className="rounded-2xl border border-[#E1CFBE] bg-white px-5 py-4">
          <p className="text-[13px] font-extrabold uppercase tracking-[0.08em] text-[#8A5A48]">
            Total Alokasi
          </p>
          <p className="mt-2 text-[28px] font-extrabold text-[#2B1B18]">
            {totalMinutes} menit
          </p>
          <p className="mt-1 text-[13px] text-[#6F5549]">
            {totalMeetings} pertemuan x {minutesPerMeeting} menit
          </p>
        </div>

        <FormGroup label="Catatan Alokasi">
          <textarea
            value={form.allocation_notes}
            onChange={(event) => onChange("allocation_notes", event.target.value)}
            rows={4}
            placeholder="Catatan tambahan terkait pembagian waktu..."
            className="w-full resize-none rounded-xl border border-[#DCC8B6] bg-white px-4 py-3 text-[14px] outline-none focus:border-[#9C0824]"
          />
        </FormGroup>

        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#8C0F2D] text-[15px] font-extrabold text-white transition hover:bg-[#54131D] disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? "Menyimpan..." : "Simpan Alokasi Waktu"}
        </button>
      </div>
    </ModalShell>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  info,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  info: string;
  tone: "pink" | "orange" | "blue" | "green";
}) {
  const toneClass = {
    pink: "bg-[#F8E1E8] text-[#8C0F2D]",
    orange: "bg-[#F4DFD5] text-[#B85C38]",
    blue: "bg-[#D7ECFA] text-[#1779B8]",
    green: "bg-[#C7F0DA] text-[#158A58]",
  }[tone];

  return (
    <div className="rounded-[18px] border border-[#E8D6C1] bg-white px-5 py-5 shadow-sm">
      <div className="mb-7 flex items-start justify-between">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-full ${toneClass}`}
        >
          {icon}
        </div>

        <span className="text-[13px] font-extrabold text-[#009B68]">
          {info}
        </span>
      </div>

      <p className="text-[26px] font-extrabold leading-none text-[#2B1B18]">
        {value}
      </p>
      <p className="mt-2 text-[13px] text-[#6B4A3A]">{label}</p>
    </div>
  );
}

function ModalShell({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-8">
      <div className="max-h-[92vh] w-full max-w-[980px] overflow-y-auto rounded-[22px] bg-[#FFF8EF] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E1CFBE] bg-[#FFF8EF] px-6 py-5">
          <div>
            <h2 className="text-[22px] font-extrabold text-[#2B1B18]">
              {title}
            </h2>
            <p className="mt-1 text-[14px] text-[#6F5549]">{subtitle}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#6F5549] transition hover:bg-[#F4E5DA]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-6">{children}</div>
      </div>
    </div>
  );
}

function FormGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <p className="mb-2 text-[14px] font-extrabold text-[#2B1B18]">{label}</p>
      {children}
    </label>
  );
}