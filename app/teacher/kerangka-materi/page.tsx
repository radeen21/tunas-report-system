"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BookOpen,
  Clock,
  Eye,
  FileText,
  Layers3,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import TeacherLayout from "../components/TeacherLayout";

type TeacherRow = {
  id: string;
  full_name: string | null;
  email?: string | null;
  teacher_code?: string | null;
  subjects?: string[] | string | null;
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
  subject_name: string;
  allocation: TimeAllocationRow | null;
};

const levelOptions = ["Semua Level", "SD", "SMP", "SMA"];
const statusOptions = ["Semua Status", "draft", "published"];

function normalizeText(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function formatTeacherSubject(subjects: TeacherRow["subjects"]) {
  if (!subjects) return "Guru";

  if (Array.isArray(subjects)) {
    return `Guru — ${subjects.slice(0, 4).join(", ")}`;
  }

  return `Guru — ${subjects}`;
}

function formatNumber(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";

  return Number(value).toFixed(2).replace(".00", "");
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

function getStatusLabel(status?: string | null) {
  if (status === "published") return "Published";
  return "Draft";
}

export default function TeacherKerangkaMateriPage() {
  const [teacher, setTeacher] = useState<TeacherRow | null>(null);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [frameworks, setFrameworks] = useState<EnrichedFramework[]>([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("Semua Level");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [semesterFilter, setSemesterFilter] = useState("Semua Semester");

  const [selectedFramework, setSelectedFramework] =
    useState<EnrichedFramework | null>(null);

  async function getCurrentTeacher() {
    const { data: authData } = await supabase.auth.getUser();

    const email =
      authData.user?.email ||
      localStorage.getItem("hstkb_demo_email") ||
      localStorage.getItem("hstkb_email") ||
      "";

    if (email) {
      const { data } = await supabase
        .from("teachers")
        .select("*")
        .eq("email", email)
        .limit(1)
        .maybeSingle();

      if (data) return data as TeacherRow;
    }

    const { data } = await supabase
      .from("teachers")
      .select("*")
      .order("teacher_code", { ascending: true })
      .limit(1)
      .maybeSingle();

    return data as TeacherRow | null;
  }

  async function fetchData() {
    setLoading(true);

    const currentTeacher = await getCurrentTeacher();
    setTeacher(currentTeacher);

    if (!currentTeacher?.id) {
      setSubjects([]);
      setFrameworks([]);
      setLoading(false);
      return;
    }

    const [subjectsRes, frameworksRes, allocationsRes] = await Promise.all([
      supabase.from("subjects").select("*").order("name"),

      supabase
        .from("material_frameworks")
        .select("*")
        .eq("teacher_id", currentTeacher.id)
        .order("updated_at", { ascending: false }),

      supabase
        .from("time_allocations")
        .select("*")
        .eq("teacher_id", currentTeacher.id),
    ]);

    const subjectsData = (subjectsRes.data || []) as SubjectRow[];
    const frameworksData = (frameworksRes.data || []) as MaterialFrameworkRow[];
    const allocationsData = (allocationsRes.data || []) as TimeAllocationRow[];

    const subjectMap = new Map(subjectsData.map((subject) => [subject.id, subject]));

    const allocationMap = new Map(
      allocationsData
        .filter((allocation) => allocation.material_framework_id)
        .map((allocation) => [allocation.material_framework_id as string, allocation])
    );

    const enriched: EnrichedFramework[] = frameworksData.map((framework) => {
      const subject = framework.subject_id
        ? subjectMap.get(framework.subject_id)
        : null;

      return {
        ...framework,
        subject_name: subject?.name || "-",
        allocation: allocationMap.get(framework.id) || null,
      };
    });

    setSubjects(subjectsData);
    setFrameworks(enriched);

    setLoading(false);
  }

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("teacher-kerangka-materi-realtime")
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
        normalizeText(framework.subject_name).includes(q) ||
        normalizeText(framework.core_materials).includes(q) ||
        normalizeText(framework.learning_objectives).includes(q) ||
        normalizeText(framework.learning_methods).includes(q);

      const matchLevel =
        levelFilter === "Semua Level" || framework.level === levelFilter;

      const matchStatus =
        statusFilter === "Semua Status" || framework.status === statusFilter;

      const matchSemester =
        semesterFilter === "Semua Semester" ||
        framework.semester === semesterFilter;

      return matchSearch && matchLevel && matchStatus && matchSemester;
    });
  }, [frameworks, search, levelFilter, statusFilter, semesterFilter]);

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

  return (
    <TeacherLayout
      activeMenu="Kerangka Materi"
      teacherName={teacher?.full_name || "Guru"}
      teacherSubject={formatTeacherSubject(teacher?.subjects)}
      searchPlaceholder="Cari kerangka materi..."
    >
      <section className="space-y-7">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#8A5A48]">
              Teacher Portal
            </p>

            <h1 className="mt-2 text-[30px] font-extrabold tracking-[-0.02em] text-[#2B1B18]">
              Kerangka Materi & Alokasi Waktu
            </h1>

            <p className="mt-2 max-w-[850px] text-[15px] leading-6 text-[#6F5549]">
              Lihat kerangka materi, capaian pembelajaran, tujuan, materi pokok,
              metode pembelajaran, sumber belajar, assessment, dan alokasi waktu
              yang sudah dibuat untuk guru.
            </p>
          </div>

          <div className="rounded-2xl border border-[#E1CFBE] bg-white px-5 py-3 text-[14px] font-bold text-[#6F5549] shadow-sm">
            Mode:{" "}
            <span className="font-extrabold text-[#2B1B18]">
              Read Only
            </span>
          </div>
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
                placeholder="Cari judul, mapel, materi, tujuan, atau metode..."
                className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] pl-11 pr-4 text-[14px] outline-none placeholder:text-[#9A7B6C] focus:border-[#9C0824]"
              />
            </div>

            <select
              value={levelFilter}
              onChange={(event) => setLevelFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              {levelOptions.map((level) => (
                <option key={level}>{level}</option>
              ))}
            </select>

            <select
              value={semesterFilter}
              onChange={(event) => setSemesterFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              <option>Semua Semester</option>
              <option>Ganjil</option>
              <option>Genap</option>
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
              Belum ada kerangka materi untuk guru ini.
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
                        {framework.subject_name} • Tahun Ajaran{" "}
                        {framework.academic_year || "-"}
                      </p>
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
        />
      ) : null}
    </TeacherLayout>
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
              {framework.subject_name} • {framework.level} {framework.grade}
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
            <div className="mb-3 flex flex-wrap gap-2">
              <StatusBadge status={framework.status} />

              <span className="rounded-full bg-[#F4E5DA] px-3 py-1 text-[12px] font-extrabold text-[#8A2332]">
                {framework.academic_year || "-"}
              </span>
            </div>

            <h3 className="text-[20px] font-extrabold text-[#2B1B18]">
              {framework.framework_title || "-"}
            </h3>

            <p className="mt-2 text-[14px] text-[#6F5549]">
              Update terakhir: {formatDateTime(framework.updated_at)}
            </p>
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

          <div className="rounded-2xl border border-[#E1CFBE] bg-white p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F8DFD0] text-[#8C0F2D]">
                <Clock className="h-5 w-5" />
              </div>

              <h3 className="text-[16px] font-extrabold text-[#2B1B18]">
                Alokasi Waktu
              </h3>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <MiniInfo
                label="Jumlah Pertemuan"
                value={`${formatNumber(framework.allocation?.total_meetings)}x`}
              />

              <MiniInfo
                label="Menit / Pertemuan"
                value={`${formatNumber(
                  framework.allocation?.minutes_per_meeting
                )} menit`}
              />

              <MiniInfo
                label="Jumlah Minggu"
                value={`${formatNumber(framework.allocation?.weeks_count)} minggu`}
              />

              <MiniInfo
                label="Total Menit"
                value={`${formatNumber(framework.allocation?.total_minutes)} menit`}
              />
            </div>

            <div className="mt-4">
              <InfoBlock
                label="Catatan Alokasi Waktu"
                value={framework.allocation?.allocation_notes || "-"}
              />
            </div>
          </div>

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
      <p className="mt-1 text-[16px] font-extrabold text-[#2B1B18]">
        {value}
      </p>
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#E1CFBE] bg-white px-5 py-4">
      <p className="text-[13px] text-[#6F5549]">{label}</p>
      <p className="mt-2 text-[20px] font-extrabold text-[#2B1B18]">
        {value}
      </p>
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