"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Layers3,
  Search,
  Send,
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
  submitted_at?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  rejection_note?: string | null;
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

const levelOptions = ["SD", "SMP", "SMA", "Bimbel/Kursus"];

const gradeOptionsByLevel: Record<string, string[]> = {
  SD: ["Kelas 1", "Kelas 2", "Kelas 3", "Kelas 4", "Kelas 5", "Kelas 6"],
  SMP: ["Kelas 7", "Kelas 8", "Kelas 9"],
  SMA: ["Kelas 10", "Kelas 11", "Kelas 12"],
  "Bimbel/Kursus": [
    "Kelas 1",
    "Kelas 2",
    "Kelas 3",
    "Kelas 4",
    "Kelas 5",
    "Kelas 6",
    "Kelas 7",
    "Kelas 8",
    "Kelas 9",
    "Kelas 10",
    "Kelas 11",
    "Kelas 12",
  ],
};

const allGradeOptions = [
  "Kelas 1",
  "Kelas 2",
  "Kelas 3",
  "Kelas 4",
  "Kelas 5",
  "Kelas 6",
  "Kelas 7",
  "Kelas 8",
  "Kelas 9",
  "Kelas 10",
  "Kelas 11",
  "Kelas 12",
];

const statusOptions = [
  "Semua Status",
  "draft",
  "submitted",
  "approved",
  "rejected",
];

function normalizeText(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function normalizeStatus(status?: string | null) {
  if (status === "published") return "approved";
  if (status === "pending") return "submitted";
  return status || "draft";
}

function formatNumber(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return Number(value).toFixed(2).replace(".00", "");
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getStatusLabel(status?: string | null) {
  const safe = normalizeStatus(status);

  if (safe === "submitted") return "Submitted";
  if (safe === "approved") return "Approved";
  if (safe === "rejected") return "Revisi";
  return "Draft";
}

function getStatusClass(status?: string | null) {
  const safe = normalizeStatus(status);

  if (safe === "approved") return "bg-[#C7F0DA] text-[#158A58]";
  if (safe === "submitted") return "bg-[#FFF2B8] text-[#B26A00]";
  if (safe === "rejected") return "bg-[#FFE4E6] text-[#BE123C]";

  return "bg-[#F1F5F9] text-[#64748B]";
}

function canReview(status?: string | null) {
  return normalizeStatus(status) === "submitted";
}

export default function KepalaSekolahKerangkaMateriPage() {
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [frameworks, setFrameworks] = useState<EnrichedFramework[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [selectedFramework, setSelectedFramework] =
    useState<EnrichedFramework | null>(null);

  const [revisionFramework, setRevisionFramework] =
    useState<EnrichedFramework | null>(null);

  const [revisionNote, setRevisionNote] = useState("");

  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("Semua Tingkat");
  const [gradeFilter, setGradeFilter] = useState("Semua Kelas");
  const [teacherFilter, setTeacherFilter] = useState("Semua Guru");
  const [statusFilter, setStatusFilter] = useState("Semua Status");

  async function fetchData() {
    setLoading(true);
    setErrorMessage("");

    try {
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

      if (teachersRes.error) throw new Error(teachersRes.error.message);
      if (subjectsRes.error) throw new Error(subjectsRes.error.message);
      if (frameworksRes.error) throw new Error(frameworksRes.error.message);
      if (allocationsRes.error) throw new Error(allocationsRes.error.message);

      const teachersData = (teachersRes.data || []) as TeacherRow[];
      const subjectsData = (subjectsRes.data || []) as SubjectRow[];
      const frameworksData = (frameworksRes.data || []) as MaterialFrameworkRow[];
      const allocationsData = (allocationsRes.data || []) as TimeAllocationRow[];

      const teacherMap = new Map(
        teachersData.map((teacher) => [teacher.id, teacher])
      );

      const subjectMap = new Map(
        subjectsData.map((subject) => [subject.id, subject])
      );

      const allocationMap = new Map(
        allocationsData
          .filter((allocation) => allocation.material_framework_id)
          .map((allocation) => [
            allocation.material_framework_id as string,
            allocation,
          ])
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
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengambil data kerangka materi.");
      }

      setTeachers([]);
      setSubjects([]);
      setFrameworks([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("kepala-kerangka-materi-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "material_frameworks" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "time_allocations" },
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
      void supabase.removeChannel(channel);
    };
  }, []);

  const filteredFrameworks = useMemo(() => {
    const q = normalizeText(search);

    return frameworks.filter((framework) => {
      const status = normalizeStatus(framework.status);

      const matchSearch =
        !q ||
        normalizeText(framework.framework_title).includes(q) ||
        normalizeText(framework.teacher_name).includes(q) ||
        normalizeText(framework.subject_name).includes(q) ||
        normalizeText(framework.core_materials).includes(q) ||
        normalizeText(framework.learning_objectives).includes(q) ||
        normalizeText(framework.grade).includes(q) ||
        normalizeText(framework.level).includes(q);

      const matchLevel =
        levelFilter === "Semua Tingkat" || framework.level === levelFilter;

      const matchGrade =
        gradeFilter === "Semua Kelas" || framework.grade === gradeFilter;

      const matchTeacher =
        teacherFilter === "Semua Guru" ||
        framework.teacher_id === teacherFilter;

      const matchStatus =
        statusFilter === "Semua Status" || status === statusFilter;

      return (
        matchSearch &&
        matchLevel &&
        matchGrade &&
        matchTeacher &&
        matchStatus
      );
    });
  }, [frameworks, search, levelFilter, gradeFilter, teacherFilter, statusFilter]);

  const summary = useMemo(() => {
    const total = frameworks.length;

    const submitted = frameworks.filter(
      (framework) => normalizeStatus(framework.status) === "submitted"
    ).length;

    const approved = frameworks.filter(
      (framework) => normalizeStatus(framework.status) === "approved"
    ).length;

    const rejected = frameworks.filter(
      (framework) => normalizeStatus(framework.status) === "rejected"
    ).length;

    const draft = frameworks.filter(
      (framework) => normalizeStatus(framework.status) === "draft"
    ).length;

    const totalMeetings = frameworks.reduce((sum, framework) => {
      return sum + Number(framework.allocation?.total_meetings || 0);
    }, 0);

    const totalMinutes = frameworks.reduce((sum, framework) => {
      return sum + Number(framework.allocation?.total_minutes || 0);
    }, 0);

    return {
      total,
      submitted,
      approved,
      rejected,
      draft,
      totalMeetings,
      totalMinutes,
    };
  }, [frameworks]);

  async function handleApprove(framework: EnrichedFramework) {
    if (!canReview(framework.status)) {
      setErrorMessage("Hanya kerangka materi dengan status submitted yang bisa di-approve.");
      return;
    }

    const confirmApprove = window.confirm(
      `Approve kerangka materi "${framework.framework_title || "-"}"?`
    );

    if (!confirmApprove) return;

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } = await supabase
        .from("material_frameworks")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
          rejected_at: null,
          rejection_note: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", framework.id);

      if (error) throw new Error(error.message);

      setSuccessMessage("Kerangka materi berhasil di-approve.");
      await fetchData();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal approve kerangka materi.");
      }
    } finally {
      setSaving(false);
    }
  }

  function openRevisionModal(framework: EnrichedFramework) {
    if (!canReview(framework.status)) {
      setErrorMessage("Hanya kerangka materi dengan status submitted yang bisa direvisi.");
      return;
    }

    setRevisionFramework(framework);
    setRevisionNote(framework.rejection_note || "");
    setErrorMessage("");
    setSuccessMessage("");
  }

  async function handleRejectRevision() {
    if (!revisionFramework) return;

    if (!revisionNote.trim()) {
      setErrorMessage("Catatan revisi wajib diisi.");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } = await supabase
        .from("material_frameworks")
        .update({
          status: "rejected",
          rejected_at: new Date().toISOString(),
          rejection_note: revisionNote.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", revisionFramework.id);

      if (error) throw new Error(error.message);

      setRevisionFramework(null);
      setRevisionNote("");
      setSuccessMessage("Kerangka materi berhasil dikembalikan untuk revisi.");
      await fetchData();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengirim revisi kerangka materi.");
      }
    } finally {
      setSaving(false);
    }
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
              Review Kerangka Materi
            </h1>

            <p className="mt-2 max-w-[850px] text-[15px] leading-6 text-[#6F5549]">
              Admin/Kepala Sekolah hanya melakukan monitoring, detail, approve,
              atau meminta revisi. Input dan edit kerangka materi dilakukan oleh
              guru.
            </p>
          </div>

          <div className="rounded-2xl border border-[#E1CFBE] bg-white px-5 py-3 text-[14px] font-bold text-[#6F5549] shadow-sm">
            Mode:{" "}
            <span className="font-extrabold text-[#2B1B18]">
              Review / Approval
            </span>
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-[14px] leading-6 text-red-700">
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p>{errorMessage}</p>
            </div>
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-[14px] leading-6 text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={<Layers3 className="h-5 w-5" />}
            label="Total Kerangka"
            value={summary.total}
            info={`${summary.draft} Draft`}
            tone="pink"
          />

          <SummaryCard
            icon={<Send className="h-5 w-5" />}
            label="Menunggu Review"
            value={summary.submitted}
            info="Submitted"
            tone="orange"
          />

          <SummaryCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Approved"
            value={summary.approved}
            info={`${summary.rejected} Revisi`}
            tone="green"
          />

          <SummaryCard
            icon={<Clock className="h-5 w-5" />}
            label="Total Menit"
            value={formatNumber(summary.totalMinutes)}
            info={`${formatNumber(summary.totalMeetings)} Meeting`}
            tone="blue"
          />
        </div>

        <div className="rounded-[22px] border border-[#E1CFBE] bg-white p-5 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8E6A58]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari judul, guru, mapel, materi, tujuan, kelas..."
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
              onChange={(event) => {
                setLevelFilter(event.target.value);
                setGradeFilter("Semua Kelas");
              }}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              <option>Semua Tingkat</option>
              {levelOptions.map((level) => (
                <option key={level}>{level}</option>
              ))}
            </select>

            <select
              value={gradeFilter}
              onChange={(event) => setGradeFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              <option>Semua Kelas</option>
              {(levelFilter === "Semua Tingkat"
                ? allGradeOptions
                : gradeOptionsByLevel[levelFilter] || allGradeOptions
              ).map((grade) => (
                <option key={grade}>{grade}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
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
                          {framework.level || "-"} — {framework.grade || "-"}
                        </span>

                        <span className="rounded-full bg-[#F1F5F9] px-3 py-1 text-[12px] font-extrabold text-[#64748B]">
                          Semester {framework.semester || "-"}
                        </span>
                      </div>

                      <h2 className="text-[20px] font-extrabold leading-tight text-[#2B1B18]">
                        {framework.framework_title || "-"}
                      </h2>

                      <p className="mt-2 text-[14px] text-[#6F5549]">
                        {framework.subject_name} • {framework.teacher_name}
                      </p>

                      {normalizeStatus(framework.status) === "rejected" &&
                      framework.rejection_note ? (
                        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] leading-5 text-red-700">
                          Catatan Revisi: {framework.rejection_note}
                        </p>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedFramework(framework)}
                      className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#DCC8B6] px-3 text-[13px] font-extrabold text-[#8C0F2D] transition hover:bg-white"
                    >
                      <Eye className="h-4 w-4" />
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

                  {canReview(framework.status) ? (
                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => handleApprove(framework)}
                        disabled={saving}
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#158A58] px-4 text-[13px] font-extrabold text-white transition hover:bg-[#0F6D46] disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve
                      </button>

                      <button
                        type="button"
                        onClick={() => openRevisionModal(framework)}
                        disabled={saving}
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#FECACA] bg-red-50 px-4 text-[13px] font-extrabold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                      >
                        <X className="h-4 w-4" />
                        Revisi
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {selectedFramework ? (
        <FrameworkDetailModal
          framework={selectedFramework}
          onClose={() => setSelectedFramework(null)}
          onApprove={() => handleApprove(selectedFramework)}
          onRevision={() => openRevisionModal(selectedFramework)}
          saving={saving}
        />
      ) : null}

      {revisionFramework ? (
        <RevisionModal
          framework={revisionFramework}
          note={revisionNote}
          saving={saving}
          onChange={setRevisionNote}
          onClose={() => {
            setRevisionFramework(null);
            setRevisionNote("");
          }}
          onSubmit={handleRejectRevision}
        />
      ) : null}
    </KepalaSekolahLayout>
  );
}

function FrameworkDetailModal({
  framework,
  onClose,
  onApprove,
  onRevision,
  saving,
}: {
  framework: EnrichedFramework;
  onClose: () => void;
  onApprove: () => void;
  onRevision: () => void;
  saving: boolean;
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
            <DetailCard
              label="Tingkat / Kelas"
              value={`${framework.level || "-"} — ${framework.grade || "-"}`}
            />
            <DetailCard label="Semester" value={framework.semester || "-"} />
            <DetailCard
              label="Pertemuan"
              value={`${formatNumber(framework.allocation?.total_meetings)}x`}
            />
            <DetailCard
              label="Total Menit"
              value={`${formatNumber(
                framework.allocation?.total_minutes
              )} menit`}
            />
          </div>

          <div className="rounded-2xl border border-[#E1CFBE] bg-white px-5 py-4">
            <div className="mb-3 flex flex-wrap gap-2">
              <StatusBadge status={framework.status} />

              <span className="rounded-full bg-[#F4E5DA] px-3 py-1 text-[12px] font-extrabold text-[#8A2332]">
                Tahun Ajaran {framework.academic_year || "-"}
              </span>
            </div>

            <h3 className="text-[18px] font-extrabold text-[#2B1B18]">
              {framework.framework_title || "-"}
            </h3>

            <p className="mt-2 text-[14px] text-[#6F5549]">
              Update terakhir: {formatDateTime(framework.updated_at)}
            </p>

            {normalizeStatus(framework.status) === "rejected" &&
            framework.rejection_note ? (
              <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] leading-5 text-red-700">
                Catatan Revisi: {framework.rejection_note}
              </p>
            ) : null}
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <InfoBlock
              label="Capaian Pembelajaran"
              value={framework.learning_outcomes || "-"}
            />
            <InfoBlock
              label="Tujuan Pembelajaran"
              value={framework.learning_objectives || "-"}
            />
            <InfoBlock
              label="Materi Pokok"
              value={framework.core_materials || "-"}
            />
            <InfoBlock
              label="Metode Pembelajaran"
              value={framework.learning_methods || "-"}
            />
            <InfoBlock
              label="Sumber Belajar"
              value={framework.learning_resources || "-"}
            />
            <InfoBlock
              label="Rencana Assessment"
              value={framework.assessment_plan || "-"}
            />
          </div>

          <InfoBlock
            label="Catatan Alokasi Waktu"
            value={framework.allocation?.allocation_notes || "-"}
          />

          <InfoBlock label="Catatan Tambahan" value={framework.notes || "-"} />

          <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-white px-5 text-[14px] font-extrabold text-[#8C0F2D] transition hover:bg-[#FFF8EF]"
            >
              Tutup
            </button>

            {canReview(framework.status) ? (
              <>
                <button
                  type="button"
                  onClick={onRevision}
                  disabled={saving}
                  className="h-11 rounded-xl border border-red-200 bg-red-50 px-5 text-[14px] font-extrabold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                >
                  Revisi
                </button>

                <button
                  type="button"
                  onClick={onApprove}
                  disabled={saving}
                  className="h-11 rounded-xl bg-[#158A58] px-5 text-[14px] font-extrabold text-white transition hover:bg-[#0F6D46] disabled:opacity-60"
                >
                  Approve
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function RevisionModal({
  framework,
  note,
  saving,
  onChange,
  onClose,
  onSubmit,
}: {
  framework: EnrichedFramework;
  note: string;
  saving: boolean;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 px-4 py-8">
      <div className="w-full max-w-[620px] rounded-[22px] bg-[#FFF8EF] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#E1CFBE] px-6 py-5">
          <div>
            <h2 className="text-[22px] font-extrabold text-[#2B1B18]">
              Catatan Revisi
            </h2>

            <p className="mt-1 text-[14px] text-[#6F5549]">
              {framework.framework_title || "-"}
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

        <div className="space-y-4 px-6 py-6">
          <label className="block">
            <span className="mb-2 block text-[14px] font-extrabold text-[#2B1B18]">
              Tulis catatan revisi
            </span>

            <textarea
              value={note}
              onChange={(event) => onChange(event.target.value)}
              rows={6}
              placeholder="Contoh: Mohon lengkapi tujuan pembelajaran dan alokasi waktu per pertemuan."
              className="w-full resize-none rounded-xl border border-[#DCC8B6] bg-white px-4 py-3 text-[14px] leading-6 outline-none focus:border-[#9C0824]"
            />
          </label>

          <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-white px-5 text-[14px] font-extrabold text-[#8C0F2D] transition hover:bg-[#FFF8EF] disabled:opacity-60"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={onSubmit}
              disabled={saving}
              className="h-11 rounded-xl bg-[#8C0F2D] px-5 text-[14px] font-extrabold text-white transition hover:bg-[#54131D] disabled:bg-[#C9AAB2]"
            >
              {saving ? "Mengirim..." : "Kirim Revisi"}
            </button>
          </div>
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
  return (
    <span
      className={`rounded-full px-3 py-1 text-[12px] font-extrabold ${getStatusClass(
        status
      )}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}