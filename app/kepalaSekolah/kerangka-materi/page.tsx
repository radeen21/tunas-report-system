"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BookOpen,
  Clock,
  Edit3,
  FileText,
  Layers3,
  Plus,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import KepalaSekolahLayout from "../components/KepalaSekolahLayout";

type TeacherRow = {
  id: string;
  full_name: string | null;
  email?: string | null;
  teacher_code?: string | null;
};

type SubjectRow = {
  id: string;
  name: string | null;
  level?: string | null;
  grade?: string | null;
};

type MaterialFrameworkRow = {
  id: string;
  teacher_id: string | null;
  subject_id: string | null;
  level: string | null;
  grade: string | null;
  semester: string | null;
  academic_year: string | null;
  framework_title: string | null;
  learning_outcomes: string | null;
  learning_objectives: string | null;
  core_materials: string | null;
  learning_methods: string | null;
  learning_resources: string | null;
  assessment_plan: string | null;
  notes: string | null;
  status: string | null;
  created_at?: string | null;
  updated_at?: string | null;
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

type EnrichedFramework = MaterialFrameworkRow & {
  teacher_name: string;
  subject_name: string;
  allocation: TimeAllocationRow | null;
};

type FrameworkForm = {
  id: string;
  teacher_id: string;
  subject_id: string;
  level: string;
  grade: string;
  semester: string;
  academic_year: string;
  framework_title: string;
  learning_outcomes: string;
  learning_objectives: string;
  core_materials: string;
  learning_methods: string;
  learning_resources: string;
  assessment_plan: string;
  notes: string;
  status: string;
  total_meetings: string;
  minutes_per_meeting: string;
  weeks_count: string;
  allocation_notes: string;
};

const levelOptions = ["SD", "SMP", "SMA"];
const semesterOptions = ["Ganjil", "Genap"];
const statusOptions = ["draft", "published"];

function emptyForm(): FrameworkForm {
  return {
    id: "",
    teacher_id: "",
    subject_id: "",
    level: "SMP",
    grade: "Kelas 7",
    semester: "Ganjil",
    academic_year: "2026/2027",
    framework_title: "",
    learning_outcomes: "",
    learning_objectives: "",
    core_materials: "",
    learning_methods: "",
    learning_resources: "",
    assessment_plan: "",
    notes: "",
    status: "draft",
    total_meetings: "",
    minutes_per_meeting: "",
    weeks_count: "",
    allocation_notes: "",
  };
}

function normalizeText(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function toNumber(value: string) {
  if (!value) return null;

  const numeric = Number(value);

  if (Number.isNaN(numeric)) return null;

  return numeric;
}

function formatNumber(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";

  return Number(value).toFixed(2).replace(".00", "");
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
  return "Draft";
}

export default function KepalaSekolahKerangkaMateriPage() {
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [frameworks, setFrameworks] = useState<EnrichedFramework[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [selectedFramework, setSelectedFramework] =
    useState<EnrichedFramework | null>(null);

  const [form, setForm] = useState<FrameworkForm>(emptyForm());

  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("Semua Level");
  const [teacherFilter, setTeacherFilter] = useState("Semua Guru");
  const [statusFilter, setStatusFilter] = useState("Semua Status");

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
        supabase.from("time_allocations").select("*"),
      ]);

    const teachersData = (teachersRes.data || []) as TeacherRow[];
    const subjectsData = (subjectsRes.data || []) as SubjectRow[];
    const frameworksData = (frameworksRes.data || []) as MaterialFrameworkRow[];
    const allocationsData = (allocationsRes.data || []) as TimeAllocationRow[];

    const teacherMap = new Map(teachersData.map((teacher) => [teacher.id, teacher]));
    const subjectMap = new Map(subjectsData.map((subject) => [subject.id, subject]));

    const allocationMap = new Map(
      allocationsData
        .filter((allocation) => allocation.material_framework_id)
        .map((allocation) => [allocation.material_framework_id as string, allocation])
    );

    const enriched: EnrichedFramework[] = frameworksData.map((framework) => {
      const teacher = framework.teacher_id
        ? teacherMap.get(framework.teacher_id)
        : null;

      const subject = framework.subject_id
        ? subjectMap.get(framework.subject_id)
        : null;

      return {
        ...framework,
        teacher_name: teacher?.full_name || "-",
        subject_name: subject?.name || "-",
        allocation: allocationMap.get(framework.id) || null,
      };
    });

    setTeachers(teachersData);
    setSubjects(subjectsData);
    setFrameworks(enriched);

    setLoading(false);
  }

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("kepala-kerangka-materi-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "material_frameworks" },
        fetchData
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "time_allocations" },
        fetchData
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teachers" },
        fetchData
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subjects" },
        fetchData
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredFrameworks = useMemo(() => {
    const q = normalizeText(search);

    return frameworks.filter((framework) => {
      const matchSearch =
        !q ||
        normalizeText(framework.framework_title).includes(q) ||
        normalizeText(framework.teacher_name).includes(q) ||
        normalizeText(framework.subject_name).includes(q) ||
        normalizeText(framework.core_materials).includes(q) ||
        normalizeText(framework.learning_objectives).includes(q);

      const matchLevel =
        levelFilter === "Semua Level" || framework.level === levelFilter;

      const matchTeacher =
        teacherFilter === "Semua Guru" || framework.teacher_id === teacherFilter;

      const matchStatus =
        statusFilter === "Semua Status" || framework.status === statusFilter;

      return matchSearch && matchLevel && matchTeacher && matchStatus;
    });
  }, [frameworks, search, levelFilter, teacherFilter, statusFilter]);

  const summary = useMemo(() => {
    const total = frameworks.length;
    const published = frameworks.filter(
      (framework) => framework.status === "published"
    ).length;
    const draft = frameworks.filter(
      (framework) => framework.status !== "published"
    ).length;

    const totalMeetings = frameworks.reduce((sum, framework) => {
      return sum + Number(framework.allocation?.total_meetings || 0);
    }, 0);

    const totalMinutes = frameworks.reduce((sum, framework) => {
      return sum + Number(framework.allocation?.total_minutes || 0);
    }, 0);

    return {
      total,
      published,
      draft,
      totalMeetings,
      totalMinutes,
    };
  }, [frameworks]);

  function updateForm(field: keyof FrameworkForm, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function openCreateModal() {
    setForm(emptyForm());
    setShowModal(true);
  }

  function openEditModal(framework: EnrichedFramework) {
    setForm({
      id: framework.id,
      teacher_id: framework.teacher_id || "",
      subject_id: framework.subject_id || "",
      level: framework.level || "SMP",
      grade: framework.grade || "Kelas 7",
      semester: framework.semester || "Ganjil",
      academic_year: framework.academic_year || "2026/2027",
      framework_title: framework.framework_title || "",
      learning_outcomes: framework.learning_outcomes || "",
      learning_objectives: framework.learning_objectives || "",
      core_materials: framework.core_materials || "",
      learning_methods: framework.learning_methods || "",
      learning_resources: framework.learning_resources || "",
      assessment_plan: framework.assessment_plan || "",
      notes: framework.notes || "",
      status: framework.status || "draft",
      total_meetings: framework.allocation?.total_meetings?.toString() || "",
      minutes_per_meeting:
        framework.allocation?.minutes_per_meeting?.toString() || "",
      weeks_count: framework.allocation?.weeks_count?.toString() || "",
      allocation_notes: framework.allocation?.allocation_notes || "",
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

    if (!form.framework_title.trim()) {
      alert("Isi judul kerangka materi terlebih dahulu.");
      return false;
    }

    if (!form.core_materials.trim()) {
      alert("Isi materi pokok terlebih dahulu.");
      return false;
    }

    return true;
  }

  async function handleSaveFramework() {
    if (!validateForm()) return;

    setSaving(true);

    const now = new Date().toISOString();

    const totalMeetings = toNumber(form.total_meetings);
    const minutesPerMeeting = toNumber(form.minutes_per_meeting);
    const weeksCount = toNumber(form.weeks_count);

    const totalMinutes =
      totalMeetings && minutesPerMeeting ? totalMeetings * minutesPerMeeting : null;

    const frameworkPayload = {
      teacher_id: form.teacher_id,
      subject_id: form.subject_id,
      level: form.level,
      grade: form.grade,
      semester: form.semester,
      academic_year: form.academic_year,
      framework_title: form.framework_title.trim(),
      learning_outcomes: form.learning_outcomes.trim() || null,
      learning_objectives: form.learning_objectives.trim() || null,
      core_materials: form.core_materials.trim(),
      learning_methods: form.learning_methods.trim() || null,
      learning_resources: form.learning_resources.trim() || null,
      assessment_plan: form.assessment_plan.trim() || null,
      notes: form.notes.trim() || null,
      status: form.status,
      updated_at: now,
    };

    let frameworkId = form.id;

    if (form.id) {
      const { error } = await supabase
        .from("material_frameworks")
        .update(frameworkPayload)
        .eq("id", form.id);

      if (error) {
        setSaving(false);
        alert(`Gagal update kerangka materi: ${error.message}`);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("material_frameworks")
        .insert(frameworkPayload)
        .select("id")
        .single();

      if (error) {
        setSaving(false);
        alert(`Gagal menyimpan kerangka materi: ${error.message}`);
        return;
      }

      frameworkId = data.id;
    }

    const allocationPayload = {
      material_framework_id: frameworkId,
      teacher_id: form.teacher_id,
      subject_id: form.subject_id,
      level: form.level,
      grade: form.grade,
      semester: form.semester,
      academic_year: form.academic_year,
      total_meetings: totalMeetings,
      minutes_per_meeting: minutesPerMeeting,
      total_minutes: totalMinutes,
      weeks_count: weeksCount,
      allocation_notes: form.allocation_notes.trim() || null,
      updated_at: now,
    };

    const existingAllocation = frameworks.find(
      (framework) => framework.id === frameworkId
    )?.allocation;

    if (existingAllocation?.id) {
      const { error } = await supabase
        .from("time_allocations")
        .update(allocationPayload)
        .eq("id", existingAllocation.id);

      if (error) {
        setSaving(false);
        alert(`Kerangka tersimpan, tapi alokasi waktu gagal: ${error.message}`);
        return;
      }
    } else {
      const { error } = await supabase
        .from("time_allocations")
        .insert(allocationPayload);

      if (error) {
        setSaving(false);
        alert(`Kerangka tersimpan, tapi alokasi waktu gagal: ${error.message}`);
        return;
      }
    }

    await fetchData();

    setSaving(false);
    setShowModal(false);
    setForm(emptyForm());
  }

  async function handleDeleteFramework(framework: EnrichedFramework) {
    const confirmDelete = confirm(
      `Hapus kerangka materi "${framework.framework_title}"?`
    );

    if (!confirmDelete) return;

    if (framework.allocation?.id) {
      const { error: allocationError } = await supabase
        .from("time_allocations")
        .delete()
        .eq("id", framework.allocation.id);

      if (allocationError) {
        alert(`Gagal hapus alokasi waktu: ${allocationError.message}`);
        return;
      }
    }

    const { error } = await supabase
      .from("material_frameworks")
      .delete()
      .eq("id", framework.id);

    if (error) {
      alert(`Gagal hapus kerangka materi: ${error.message}`);
      return;
    }

    await fetchData();
  }

  return (
    <KepalaSekolahLayout
      activeMenu="Kerangka Materi"
      searchPlaceholder="Cari kerangka materi..."
    >
      <section className="space-y-7">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#8A5A48]">
              Kurikulum
            </p>

            <h1 className="mt-2 text-[30px] font-extrabold tracking-[-0.02em] text-[#2B1B18]">
              Kerangka Materi & Alokasi Waktu
            </h1>

            <p className="mt-2 max-w-[850px] text-[15px] leading-6 text-[#6F5549]">
              Kelola kerangka materi, capaian pembelajaran, tujuan, materi pokok,
              metode, sumber belajar, assessment, dan alokasi waktu dalam satu
              halaman.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex h-11 w-fit items-center gap-2 rounded-xl bg-[#8C0F2D] px-5 text-[14px] font-extrabold text-white shadow-sm transition hover:bg-[#54131D]"
          >
            <Plus className="h-4 w-4" />
            Tambah Kerangka
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={<Layers3 className="h-5 w-5" />}
            label="Total Kerangka"
            value={summary.total}
            info="Data"
            tone="pink"
          />
          <SummaryCard
            icon={<FileText className="h-5 w-5" />}
            label="Published"
            value={summary.published}
            info={`${summary.draft} Draft`}
            tone="green"
          />
          <SummaryCard
            icon={<BookOpen className="h-5 w-5" />}
            label="Total Pertemuan"
            value={formatNumber(summary.totalMeetings)}
            info="Meeting"
            tone="orange"
          />
          <SummaryCard
            icon={<Clock className="h-5 w-5" />}
            label="Total Menit"
            value={formatNumber(summary.totalMinutes)}
            info="Alokasi"
            tone="blue"
          />
        </div>

        <div className="rounded-[22px] border border-[#E1CFBE] bg-white p-5 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr_1fr_1fr]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8E6A58]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari judul, guru, mapel, materi, atau tujuan..."
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
              value={levelFilter}
              onChange={(event) => setLevelFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              <option>Semua Level</option>
              {levelOptions.map((level) => (
                <option key={level}>{level}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              <option>Semua Status</option>
              {statusOptions.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          {loading ? (
            <div className="col-span-full rounded-[22px] border border-[#E1CFBE] bg-white px-6 py-12 text-center text-[#6F5549] shadow-sm">
              Memuat data kerangka materi...
            </div>
          ) : filteredFrameworks.length === 0 ? (
            <div className="col-span-full rounded-[22px] border border-[#E1CFBE] bg-white px-6 py-12 text-center text-[#6F5549] shadow-sm">
              Belum ada data kerangka materi.
            </div>
          ) : (
            filteredFrameworks.map((framework) => (
              <div
                key={framework.id}
                className="overflow-hidden rounded-[22px] border border-[#E1CFBE] bg-white shadow-sm"
              >
                <div className="border-b border-[#EADACA] bg-[#FFF8EF] px-6 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="mb-3 flex flex-wrap gap-2">
                        <StatusBadge status={framework.status} />

                        <span className="rounded-full bg-[#F4E5DA] px-3 py-1 text-[12px] font-extrabold text-[#8A2332]">
                          {framework.level} — {framework.grade}
                        </span>

                        <span className="rounded-full bg-[#F1F5F9] px-3 py-1 text-[12px] font-extrabold text-[#64748B]">
                          Semester {framework.semester}
                        </span>
                      </div>

                      <h2 className="text-[20px] font-extrabold leading-tight text-[#2B1B18]">
                        {framework.framework_title || "-"}
                      </h2>

                      <p className="mt-2 text-[14px] text-[#6F5549]">
                        {framework.subject_name} • {framework.teacher_name}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedFramework(framework)}
                      className="rounded-xl border border-[#DCC8B6] px-3 py-2 text-[13px] font-extrabold text-[#8C0F2D] transition hover:bg-white"
                    >
                      Detail
                    </button>
                  </div>
                </div>

                <div className="space-y-4 px-6 py-5">
                  <InfoBlock
                    label="Materi Pokok"
                    value={framework.core_materials || "-"}
                  />

                  <InfoBlock
                    label="Tujuan Pembelajaran"
                    value={framework.learning_objectives || "-"}
                  />

                  <div className="grid gap-3 md:grid-cols-3">
                    <MiniInfo
                      label="Pertemuan"
                      value={`${formatNumber(
                        framework.allocation?.total_meetings
                      )}x`}
                    />
                    <MiniInfo
                      label="Menit / Pertemuan"
                      value={`${formatNumber(
                        framework.allocation?.minutes_per_meeting
                      )} menit`}
                    />
                    <MiniInfo
                      label="Total Alokasi"
                      value={`${formatNumber(
                        framework.allocation?.total_minutes
                      )} menit`}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(framework)}
                      className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#DCC8B6] px-3 text-[13px] font-extrabold text-[#8C0F2D] transition hover:bg-[#FFF8EF]"
                    >
                      <Edit3 className="h-4 w-4" />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteFramework(framework)}
                      className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#FECACA] px-3 text-[13px] font-extrabold text-[#DC2626] transition hover:bg-[#FFF1F2]"
                    >
                      <Trash2 className="h-4 w-4" />
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-8">
          <div className="max-h-[92vh] w-full max-w-[980px] overflow-y-auto rounded-[22px] bg-[#FFF8EF] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E1CFBE] bg-[#FFF8EF] px-6 py-5">
              <div>
                <h2 className="text-[22px] font-extrabold text-[#2B1B18]">
                  {form.id ? "Edit Kerangka Materi" : "Tambah Kerangka Materi"}
                </h2>

                <p className="mt-1 text-[14px] text-[#6F5549]">
                  Alokasi waktu sudah digabung di dalam form kerangka materi.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-full p-2 text-[#6F5549] transition hover:bg-[#F4E5DA]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="grid gap-4 md:grid-cols-2">
                <FormGroup label="Guru">
                  <select
                    value={form.teacher_id}
                    onChange={(event) => updateForm("teacher_id", event.target.value)}
                    className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                  >
                    <option value="">Pilih guru</option>
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
                    onChange={(event) => updateForm("subject_id", event.target.value)}
                    className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                  >
                    <option value="">Pilih mata pelajaran</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name} {subject.grade ? `— ${subject.grade}` : ""}
                      </option>
                    ))}
                  </select>
                </FormGroup>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <FormGroup label="Level">
                  <select
                    value={form.level}
                    onChange={(event) => updateForm("level", event.target.value)}
                    className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                  >
                    {levelOptions.map((level) => (
                      <option key={level}>{level}</option>
                    ))}
                  </select>
                </FormGroup>

                <FormGroup label="Kelas">
                  <input
                    value={form.grade}
                    onChange={(event) => updateForm("grade", event.target.value)}
                    placeholder="Kelas 7"
                    className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                  />
                </FormGroup>

                <FormGroup label="Semester">
                  <select
                    value={form.semester}
                    onChange={(event) => updateForm("semester", event.target.value)}
                    className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                  >
                    {semesterOptions.map((semester) => (
                      <option key={semester}>{semester}</option>
                    ))}
                  </select>
                </FormGroup>

                <FormGroup label="Tahun Ajaran">
                  <input
                    value={form.academic_year}
                    onChange={(event) =>
                      updateForm("academic_year", event.target.value)
                    }
                    placeholder="2026/2027"
                    className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                  />
                </FormGroup>
              </div>

              <FormGroup label="Judul Kerangka Materi">
                <input
                  value={form.framework_title}
                  onChange={(event) =>
                    updateForm("framework_title", event.target.value)
                  }
                  placeholder="Contoh: Kerangka Materi IPA Kelas 7 Semester Ganjil"
                  className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                />
              </FormGroup>

              <div className="grid gap-4 md:grid-cols-2">
                <FormGroup label="Capaian Pembelajaran">
                  <textarea
                    value={form.learning_outcomes}
                    onChange={(event) =>
                      updateForm("learning_outcomes", event.target.value)
                    }
                    rows={5}
                    placeholder="Tuliskan capaian pembelajaran..."
                    className="w-full resize-none rounded-xl border border-[#DCC8B6] bg-white px-4 py-3 text-[14px] outline-none focus:border-[#9C0824]"
                  />
                </FormGroup>

                <FormGroup label="Tujuan Pembelajaran">
                  <textarea
                    value={form.learning_objectives}
                    onChange={(event) =>
                      updateForm("learning_objectives", event.target.value)
                    }
                    rows={5}
                    placeholder="Tuliskan tujuan pembelajaran..."
                    className="w-full resize-none rounded-xl border border-[#DCC8B6] bg-white px-4 py-3 text-[14px] outline-none focus:border-[#9C0824]"
                  />
                </FormGroup>
              </div>

              <FormGroup label="Materi Pokok">
                <textarea
                  value={form.core_materials}
                  onChange={(event) => updateForm("core_materials", event.target.value)}
                  rows={5}
                  placeholder="Contoh: Besaran, satuan, pengukuran, zat dan wujudnya..."
                  className="w-full resize-none rounded-xl border border-[#DCC8B6] bg-white px-4 py-3 text-[14px] outline-none focus:border-[#9C0824]"
                />
              </FormGroup>

              <div className="grid gap-4 md:grid-cols-2">
                <FormGroup label="Metode Pembelajaran">
                  <textarea
                    value={form.learning_methods}
                    onChange={(event) =>
                      updateForm("learning_methods", event.target.value)
                    }
                    rows={4}
                    placeholder="Contoh: Diskusi, praktik, observasi, tanya jawab..."
                    className="w-full resize-none rounded-xl border border-[#DCC8B6] bg-white px-4 py-3 text-[14px] outline-none focus:border-[#9C0824]"
                  />
                </FormGroup>

                <FormGroup label="Sumber Belajar">
                  <textarea
                    value={form.learning_resources}
                    onChange={(event) =>
                      updateForm("learning_resources", event.target.value)
                    }
                    rows={4}
                    placeholder="Contoh: Buku paket, modul, video pembelajaran, worksheet..."
                    className="w-full resize-none rounded-xl border border-[#DCC8B6] bg-white px-4 py-3 text-[14px] outline-none focus:border-[#9C0824]"
                  />
                </FormGroup>
              </div>

              <FormGroup label="Rencana Assessment / Penilaian">
                <textarea
                  value={form.assessment_plan}
                  onChange={(event) =>
                    updateForm("assessment_plan", event.target.value)
                  }
                  rows={4}
                  placeholder="Contoh: Observasi, tugas, kuis, praktik, UH..."
                  className="w-full resize-none rounded-xl border border-[#DCC8B6] bg-white px-4 py-3 text-[14px] outline-none focus:border-[#9C0824]"
                />
              </FormGroup>

              <div className="rounded-2xl border border-[#E1CFBE] bg-white p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F8DFD0] text-[#8C0F2D]">
                    <Clock className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="text-[16px] font-extrabold text-[#2B1B18]">
                      Alokasi Waktu
                    </h3>
                    <p className="mt-1 text-[13px] text-[#6F5549]">
                      Alokasi waktu sekarang masuk ke dalam Kerangka Materi.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <FormGroup label="Jumlah Pertemuan">
                    <input
                      type="number"
                      value={form.total_meetings}
                      onChange={(event) =>
                        updateForm("total_meetings", event.target.value)
                      }
                      placeholder="Contoh: 8"
                      className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
                    />
                  </FormGroup>

                  <FormGroup label="Menit / Pertemuan">
                    <input
                      type="number"
                      value={form.minutes_per_meeting}
                      onChange={(event) =>
                        updateForm("minutes_per_meeting", event.target.value)
                      }
                      placeholder="Contoh: 60"
                      className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
                    />
                  </FormGroup>

                  <FormGroup label="Jumlah Minggu">
                    <input
                      type="number"
                      value={form.weeks_count}
                      onChange={(event) =>
                        updateForm("weeks_count", event.target.value)
                      }
                      placeholder="Contoh: 4"
                      className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
                    />
                  </FormGroup>
                </div>

                <div className="mt-4 rounded-2xl border border-[#EADACA] bg-[#FFF8EF] px-4 py-3">
                  <p className="text-[13px] text-[#6F5549]">
                    Total alokasi waktu:
                  </p>
                  <p className="mt-1 text-[22px] font-extrabold text-[#2B1B18]">
                    {formatNumber(
                      Number(form.total_meetings || 0) *
                        Number(form.minutes_per_meeting || 0)
                    )}{" "}
                    menit
                  </p>
                </div>

                <div className="mt-4">
                  <FormGroup label="Catatan Alokasi Waktu">
                    <textarea
                      value={form.allocation_notes}
                      onChange={(event) =>
                        updateForm("allocation_notes", event.target.value)
                      }
                      rows={3}
                      placeholder="Contoh: 2 pertemuan untuk praktik, 1 pertemuan untuk asesmen."
                      className="w-full resize-none rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 py-3 text-[14px] outline-none focus:border-[#9C0824]"
                    />
                  </FormGroup>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormGroup label="Status">
                  <select
                    value={form.status}
                    onChange={(event) => updateForm("status", event.target.value)}
                    className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                  >
                    {statusOptions.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </FormGroup>

                <FormGroup label="Catatan">
                  <input
                    value={form.notes}
                    onChange={(event) => updateForm("notes", event.target.value)}
                    placeholder="Catatan tambahan..."
                    className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                  />
                </FormGroup>
              </div>

              <button
                type="button"
                onClick={handleSaveFramework}
                disabled={saving}
                className="h-12 w-full rounded-xl bg-[#8C0F2D] text-[15px] font-extrabold text-white shadow-sm transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Menyimpan..." : "Simpan Kerangka Materi"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedFramework ? (
        <FrameworkDetailModal
          framework={selectedFramework}
          onClose={() => setSelectedFramework(null)}
        />
      ) : null}
    </KepalaSekolahLayout>
  );
}

function FrameworkDetailModal({
  framework,
  onClose,
}: {
  framework: EnrichedFramework;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-8">
      <div className="max-h-[92vh] w-full max-w-[980px] overflow-y-auto rounded-[22px] bg-[#FFF8EF] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E1CFBE] bg-[#FFF8EF] px-6 py-5">
          <div>
            <h2 className="text-[22px] font-extrabold text-[#2B1B18]">
              Detail Kerangka Materi
            </h2>

            <p className="mt-1 text-[14px] text-[#6F5549]">
              {framework.subject_name} • {framework.teacher_name}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#6F5549] transition hover:bg-[#F4E5DA]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div className="grid gap-4 md:grid-cols-4">
            <DetailCard label="Level" value={`${framework.level} — ${framework.grade}`} />
            <DetailCard label="Semester" value={framework.semester || "-"} />
            <DetailCard
              label="Pertemuan"
              value={`${formatNumber(framework.allocation?.total_meetings)}x`}
            />
            <DetailCard
              label="Total Menit"
              value={`${formatNumber(framework.allocation?.total_minutes)} menit`}
            />
          </div>

          <div className="rounded-2xl border border-[#E1CFBE] bg-white px-5 py-4">
            <h3 className="text-[18px] font-extrabold text-[#2B1B18]">
              {framework.framework_title || "-"}
            </h3>

            <p className="mt-2 text-[14px] text-[#6F5549]">
              Tahun ajaran {framework.academic_year || "-"}
            </p>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <InfoBlock label="Capaian Pembelajaran" value={framework.learning_outcomes || "-"} />
            <InfoBlock label="Tujuan Pembelajaran" value={framework.learning_objectives || "-"} />
            <InfoBlock label="Materi Pokok" value={framework.core_materials || "-"} />
            <InfoBlock label="Metode Pembelajaran" value={framework.learning_methods || "-"} />
            <InfoBlock label="Sumber Belajar" value={framework.learning_resources || "-"} />
            <InfoBlock label="Rencana Assessment" value={framework.assessment_plan || "-"} />
          </div>

          <InfoBlock
            label="Catatan Alokasi Waktu"
            value={framework.allocation?.allocation_notes || "-"}
          />

          <InfoBlock label="Catatan Tambahan" value={framework.notes || "-"} />

          <button
            type="button"
            onClick={onClose}
            className="h-11 w-full rounded-xl bg-[#8C0F2D] text-[14px] font-extrabold text-white transition hover:bg-[#54131D]"
          >
            Tutup Detail
          </button>
        </div>
      </div>
    </div>
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

function FormGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <p className="mb-2 text-[14px] font-extrabold text-[#2B1B18]">{label}</p>
      {children}
    </label>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#E1CFBE] bg-white px-5 py-4">
      <p className="text-[13px] font-extrabold uppercase tracking-[0.08em] text-[#8A5A48]">
        {label}
      </p>
      <p className="mt-2 whitespace-pre-line text-[14px] leading-6 text-[#2B1B18]">
        {value}
      </p>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#EADACA] bg-[#FFFCF8] px-4 py-3">
      <p className="text-[12px] font-bold text-[#6F5549]">{label}</p>
      <p className="mt-1 text-[16px] font-extrabold text-[#2B1B18]">{value}</p>
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#E1CFBE] bg-white px-5 py-4">
      <p className="text-[13px] text-[#6F5549]">{label}</p>
      <p className="mt-2 text-[20px] font-extrabold text-[#2B1B18]">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  const safe = status || "draft";

  const className =
    safe === "published"
      ? "bg-[#C7F0DA] text-[#158A58]"
      : "bg-[#F1F5F9] text-[#64748B]";

  return (
    <span
      className={`rounded-full px-3 py-1 text-[12px] font-extrabold ${className}`}
    >
      {getStatusLabel(safe)}
    </span>
  );
}