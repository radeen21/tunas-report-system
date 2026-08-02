"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BookOpen,
  Edit,
  Eye,
  FileText,
  Layers3,
  Plus,
  Save,
  Search,
  Send,
  Trash2,
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
  submitted_at?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  rejection_note?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type EnrichedFramework = MaterialFrameworkRow & {
  subject_name: string;
};

type FormState = {
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
};

const ACADEMIC_YEAR = "2026/2027";

const initialForm: FormState = {
  subject_id: "",
  level: "SD",
  grade: "Kelas 1",
  semester: "Ganjil",
  academic_year: ACADEMIC_YEAR,
  framework_title: "",
  learning_outcomes: "",
  learning_objectives: "",
  core_materials: "",
  learning_methods: "",
  learning_resources: "",
  assessment_plan: "",
  notes: "",
};

const levelOptions = ["Semua Tingkat", "SD", "SMP", "SMA"];

const formLevelOptions = ["SD", "SMP", "SMA"];

const gradeOptions = [
  "Semua Kelas",
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

const formGradeOptions = [
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

function normalizeLevel(value?: string | null) {
  const level = normalizeText(value);

  if (!level) return "-";
  if (level === "sd" || level.includes("primary")) return "SD";
  if (level === "smp" || level.includes("secondary")) return "SMP";
  if (level === "sma" || level.includes("high")) return "SMA";

  return value || "-";
}

function normalizeGrade(value?: string | null) {
  const grade = (value || "").trim();

  if (!grade) return "-";

  const match = grade.match(/\d+/);
  if (match?.[0]) return `Kelas ${match[0]}`;

  return grade;
}

function normalizeSubjects(subjects: TeacherRow["subjects"]) {
  if (!subjects) return [];

  if (Array.isArray(subjects)) {
    return subjects.map((subject) => normalizeText(subject)).filter(Boolean);
  }

  return subjects
    .split(",")
    .map((subject) => normalizeText(subject))
    .filter(Boolean);
}

function sameSubjectName(a?: string | null, b?: string | null) {
  if (!a || !b) return false;

  const left = normalizeText(a);
  const right = normalizeText(b);

  return left === right || left.includes(right) || right.includes(left);
}

function formatLevelGrade(level?: string | null, grade?: string | null) {
  return `${normalizeLevel(level)} — ${normalizeGrade(grade)}`;
}

function formatTeacherSubject(subjects: TeacherRow["subjects"]) {
  if (!subjects) return "Guru";

  if (Array.isArray(subjects)) {
    return `Guru — ${subjects.slice(0, 4).join(", ")}`;
  }

  return `Guru — ${subjects}`;
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
  if (status === "submitted") return "Submitted";
  if (status === "approved" || status === "published") return "Approved";
  if (status === "rejected") return "Revisi";
  return "Draft";
}

function getStatusClass(status?: string | null) {
  const safe = status || "draft";

  if (safe === "approved" || safe === "published") {
    return "bg-[#C7F0DA] text-[#158A58]";
  }

  if (safe === "submitted") return "bg-[#FFF2B8] text-[#B26A00]";
  if (safe === "rejected") return "bg-[#FFE4E6] text-[#BE123C]";

  return "bg-[#F1F5F9] text-[#64748B]";
}

function canEditFramework(status?: string | null) {
  return !status || status === "draft" || status === "rejected";
}

export default function TeacherKerangkaMateriPage() {
  const [teacher, setTeacher] = useState<TeacherRow | null>(null);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [frameworks, setFrameworks] = useState<EnrichedFramework[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("Semua Tingkat");
  const [gradeFilter, setGradeFilter] = useState("Semua Kelas");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [semesterFilter, setSemesterFilter] = useState("Semua Semester");

  const [selectedFramework, setSelectedFramework] =
    useState<EnrichedFramework | null>(null);

  const [editingFramework, setEditingFramework] =
    useState<EnrichedFramework | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function getCurrentTeacher() {
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError) throw new Error(authError.message);

    const email = (
      authData.user?.email ||
      localStorage.getItem("hstkb_demo_email") ||
      localStorage.getItem("hstkb_email") ||
      ""
    )
      .trim()
      .toLowerCase();

    const teacherCode =
      localStorage.getItem("hstkb_teacher_code") ||
      localStorage.getItem("teacher_code") ||
      "";

    if (email) {
      const { data, error } = await supabase
        .from("teachers")
        .select("*")
        .ilike("email", email)
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (data) return data as TeacherRow;
    }

    if (teacherCode) {
      const { data, error } = await supabase
        .from("teachers")
        .select("*")
        .eq("teacher_code", teacherCode)
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (data) return data as TeacherRow;
    }

    return null;
  }

  async function fetchData() {
    setLoading(true);
    setErrorMessage("");

    try {
      const currentTeacher = await getCurrentTeacher();
      setTeacher(currentTeacher);

      if (!currentTeacher?.id) {
        setFrameworks([]);
        setSubjects([]);
        setErrorMessage(
          "Data guru belum terhubung dengan akun login ini. Hubungkan email guru di tabel teachers atau isi teacher_code."
        );
        return;
      }

      const [subjectsRes, frameworksRes] = await Promise.all([
        supabase.from("subjects").select("*").order("name"),
        supabase
          .from("material_frameworks")
          .select("*")
          .eq("teacher_id", currentTeacher.id)
          .order("updated_at", { ascending: false }),
      ]);

      if (subjectsRes.error) throw new Error(subjectsRes.error.message);
      if (frameworksRes.error) throw new Error(frameworksRes.error.message);

      const subjectsData = (subjectsRes.data || []) as SubjectRow[];
      const frameworksData = (frameworksRes.data || []) as MaterialFrameworkRow[];

      const subjectMap = new Map(
        subjectsData.map((subject) => [subject.id, subject])
      );

      const enriched: EnrichedFramework[] = frameworksData.map((framework) => {
        const subject = framework.subject_id
          ? subjectMap.get(framework.subject_id)
          : null;

        return {
          ...framework,
          subject_name: subject?.name || "-",
        };
      });

      setSubjects(subjectsData);
      setFrameworks(enriched);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengambil data kerangka materi.");
      }

      setFrameworks([]);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("teacher-kerangka-materi-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teachers" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "material_frameworks" },
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

  const teacherSubjectNames = useMemo(() => {
    return normalizeSubjects(teacher?.subjects);
  }, [teacher]);

  const subjectOptions = useMemo(() => {
    if (teacherSubjectNames.length === 0) return subjects;

    const filteredSubjects = subjects.filter((subject) => {
      return teacherSubjectNames.some((teacherSubject) =>
        sameSubjectName(teacherSubject, subject.name)
      );
    });

    return filteredSubjects.length > 0 ? filteredSubjects : subjects;
  }, [subjects, teacherSubjectNames]);

  function openCreateForm() {
    const firstSubject = subjectOptions[0];

    setEditingFramework(null);
    setForm({
      ...initialForm,
      subject_id: firstSubject?.id || "",
    });
    setIsFormOpen(true);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function openEditForm(framework: EnrichedFramework) {
    if (!canEditFramework(framework.status)) {
      setErrorMessage(
        "Kerangka materi yang sudah submitted/approved tidak bisa diedit."
      );
      return;
    }

    setEditingFramework(framework);
    setForm({
      subject_id: framework.subject_id || "",
      level: normalizeLevel(framework.level),
      grade: normalizeGrade(framework.grade),
      semester: framework.semester || "Ganjil",
      academic_year: framework.academic_year || ACADEMIC_YEAR,
      framework_title: framework.framework_title || "",
      learning_outcomes: framework.learning_outcomes || "",
      learning_objectives: framework.learning_objectives || "",
      core_materials: framework.core_materials || "",
      learning_methods: framework.learning_methods || "",
      learning_resources: framework.learning_resources || "",
      assessment_plan: framework.assessment_plan || "",
      notes: framework.notes || "",
    });
    setIsFormOpen(true);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingFramework(null);
    setForm(initialForm);
  }

  async function handleSave() {
    if (!teacher?.id) {
      setErrorMessage("Data guru belum ditemukan.");
      return;
    }

    if (!form.subject_id) {
      setErrorMessage("Mapel wajib dipilih.");
      return;
    }

    if (!form.framework_title.trim()) {
      setErrorMessage("Judul kerangka materi wajib diisi.");
      return;
    }

    if (!form.core_materials.trim()) {
      setErrorMessage("Materi pokok wajib diisi.");
      return;
    }

    if (!form.learning_objectives.trim()) {
      setErrorMessage("Tujuan pembelajaran wajib diisi.");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const now = new Date().toISOString();

      const frameworkPayload = {
        teacher_id: teacher.id,
        subject_id: form.subject_id,
        level: form.level,
        grade: form.grade,
        semester: form.semester,
        academic_year: form.academic_year,
        framework_title: form.framework_title.trim(),
        learning_outcomes: form.learning_outcomes.trim() || null,
        learning_objectives: form.learning_objectives.trim() || null,
        core_materials: form.core_materials.trim() || null,
        learning_methods: form.learning_methods.trim() || null,
        learning_resources: form.learning_resources.trim() || null,
        assessment_plan: form.assessment_plan.trim() || null,
        notes: form.notes.trim() || null,
        status: "draft",
        rejected_at: null,
        rejection_note: null,
        updated_at: now,
      };

      if (editingFramework) {
        const { error } = await supabase
          .from("material_frameworks")
          .update(frameworkPayload)
          .eq("id", editingFramework.id)
          .eq("teacher_id", teacher.id);

        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("material_frameworks").insert({
          ...frameworkPayload,
          created_at: now,
        });

        if (error) throw new Error(error.message);
      }

      setSuccessMessage("Kerangka materi berhasil disimpan sebagai draft.");
      closeForm();
      await fetchData();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal menyimpan kerangka materi.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(framework: EnrichedFramework) {
    if (!canEditFramework(framework.status)) {
      setErrorMessage("Data ini sudah dikirim atau disetujui.");
      return;
    }

    const confirmSubmit = window.confirm(
      "Kirim kerangka materi ini ke Admin/Kepala Sekolah untuk direview?"
    );

    if (!confirmSubmit) return;

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const now = new Date().toISOString();

      const { error } = await supabase
        .from("material_frameworks")
        .update({
          status: "submitted",
          submitted_at: now,
          rejected_at: null,
          rejection_note: null,
          updated_at: now,
        })
        .eq("id", framework.id)
        .eq("teacher_id", teacher?.id);

      if (error) throw new Error(error.message);

      setSuccessMessage("Kerangka materi berhasil dikirim untuk review.");
      await fetchData();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal submit kerangka materi.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(framework: EnrichedFramework) {
    if (!canEditFramework(framework.status)) {
      setErrorMessage(
        "Kerangka materi yang sudah submitted/approved tidak bisa dihapus."
      );
      return;
    }

    const confirmDelete = window.confirm(
      "Yakin ingin menghapus kerangka materi ini?"
    );

    if (!confirmDelete) return;

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } = await supabase
        .from("material_frameworks")
        .delete()
        .eq("id", framework.id)
        .eq("teacher_id", teacher?.id);

      if (error) throw new Error(error.message);

      setSuccessMessage("Kerangka materi berhasil dihapus.");
      await fetchData();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal menghapus kerangka materi.");
      }
    } finally {
      setSaving(false);
    }
  }

  const availableGradeOptions = useMemo(() => {
    const existingGrades = frameworks
      .map((framework) => normalizeGrade(framework.grade))
      .filter((grade) => grade !== "-");

    const combined = Array.from(
      new Set([
        ...gradeOptions.filter((grade) => grade !== "Semua Kelas"),
        ...existingGrades,
      ])
    );

    return ["Semua Kelas", ...combined];
  }, [frameworks]);

  const filteredFrameworks = useMemo(() => {
    const q = normalizeText(search);

    return frameworks.filter((framework) => {
      const frameworkLevel = normalizeLevel(framework.level);
      const frameworkGrade = normalizeGrade(framework.grade);

      const matchSearch =
        !q ||
        normalizeText(framework.framework_title).includes(q) ||
        normalizeText(framework.subject_name).includes(q) ||
        normalizeText(framework.core_materials).includes(q) ||
        normalizeText(framework.learning_outcomes).includes(q) ||
        normalizeText(framework.learning_objectives).includes(q) ||
        normalizeText(framework.learning_methods).includes(q) ||
        normalizeText(framework.assessment_plan).includes(q) ||
        normalizeText(frameworkLevel).includes(q) ||
        normalizeText(frameworkGrade).includes(q);

      const matchLevel =
        levelFilter === "Semua Tingkat" || frameworkLevel === levelFilter;

      const matchGrade =
        gradeFilter === "Semua Kelas" || frameworkGrade === gradeFilter;

      const matchStatus =
        statusFilter === "Semua Status" || framework.status === statusFilter;

      const matchSemester =
        semesterFilter === "Semua Semester" ||
        framework.semester === semesterFilter;

      return (
        matchSearch &&
        matchLevel &&
        matchGrade &&
        matchStatus &&
        matchSemester
      );
    });
  }, [
    frameworks,
    search,
    levelFilter,
    gradeFilter,
    statusFilter,
    semesterFilter,
  ]);

  const summary = useMemo(() => {
    const total = frameworks.length;

    const approved = frameworks.filter(
      (framework) =>
        framework.status === "approved" || framework.status === "published"
    ).length;

    const submitted = frameworks.filter(
      (framework) => framework.status === "submitted"
    ).length;

    const rejected = frameworks.filter(
      (framework) => framework.status === "rejected"
    ).length;

    const draft = frameworks.filter(
      (framework) => !framework.status || framework.status === "draft"
    ).length;

    return {
      total,
      approved,
      submitted,
      rejected,
      draft,
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
              Kerangka Materi
            </h1>

            <p className="mt-2 max-w-[850px] text-[15px] leading-6 text-[#6F5549]">
              Guru membuat kerangka materi secara mandiri. Setelah selesai,
              submit ke Admin/Kepala Sekolah untuk direview.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            disabled={!teacher || saving}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#8C0F2D] px-5 text-[14px] font-extrabold text-white shadow-sm transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:bg-[#C9AAB2]"
          >
            <Plus className="h-4 w-4" />
            Tambah Kerangka
          </button>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-[14px] leading-6 text-red-700">
            {errorMessage}
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
            label="Submitted"
            value={summary.submitted}
            info="Review"
            tone="orange"
          />

          <SummaryCard
            icon={<FileText className="h-5 w-5" />}
            label="Approved"
            value={summary.approved}
            info="Disetujui"
            tone="green"
          />

          <SummaryCard
            icon={<BookOpen className="h-5 w-5" />}
            label="Revisi"
            value={summary.rejected}
            info="Perlu diperbaiki"
            tone="blue"
          />
        </div>

        <div className="rounded-[22px] border border-[#E1CFBE] bg-white p-5 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-[1.4fr_0.9fr_0.9fr_0.9fr_0.9fr]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8E6A58]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari judul, mapel, materi, tujuan, kelas, atau metode..."
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
              value={gradeFilter}
              onChange={(event) => setGradeFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              {availableGradeOptions.map((grade) => (
                <option key={grade}>{grade}</option>
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
            filteredFrameworks.map((framework) => {
              const editable = canEditFramework(framework.status);

              return (
                <div
                  key={framework.id}
                  className="overflow-hidden rounded-[22px] border border-[#E1CFBE] bg-white shadow-sm"
                >
                  <div className="border-b border-[#EADACA] bg-[#FFF8EF] px-6 py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="mb-3 flex flex-wrap gap-2">
                          <StatusBadge status={framework.status} />

                          <span className="whitespace-nowrap rounded-full bg-[#F4E5DA] px-3 py-1 text-[12px] font-extrabold text-[#8A2332]">
                            {formatLevelGrade(framework.level, framework.grade)}
                          </span>

                          <span className="whitespace-nowrap rounded-full bg-[#F1F5F9] px-3 py-1 text-[12px] font-extrabold text-[#64748B]">
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

                        {framework.status === "rejected" &&
                        framework.rejection_note ? (
                          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] leading-5 text-red-700">
                            Catatan Revisi: {framework.rejection_note}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedFramework(framework)}
                          className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#DCC8B6] px-3 text-[13px] font-extrabold text-[#8C0F2D] transition hover:bg-white"
                        >
                          <Eye className="h-4 w-4" />
                          Detail
                        </button>

                        {editable ? (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditForm(framework)}
                              className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#DCC8B6] px-3 text-[13px] font-extrabold text-[#8C0F2D] transition hover:bg-white"
                            >
                              <Edit className="h-4 w-4" />
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSubmit(framework)}
                              disabled={saving}
                              className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#8C0F2D] px-3 text-[13px] font-extrabold text-white transition hover:bg-[#54131D] disabled:bg-[#C9AAB2]"
                            >
                              <Send className="h-4 w-4" />
                              Submit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(framework)}
                              disabled={saving}
                              className="inline-flex h-9 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 text-[13px] font-extrabold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                            >
                              <Trash2 className="h-4 w-4" />
                              Hapus
                            </button>
                          </>
                        ) : null}
                      </div>
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

                    <div className="grid gap-3 md:grid-cols-2">
                      <MiniInfo
                        label="Metode Pembelajaran"
                        value={framework.learning_methods || "-"}
                      />

                      <MiniInfo
                        label="Rencana Assessment"
                        value={framework.assessment_plan || "-"}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {selectedFramework ? (
        <FrameworkDetailModal
          framework={selectedFramework}
          onClose={() => setSelectedFramework(null)}
        />
      ) : null}

      {isFormOpen ? (
        <FrameworkFormModal
          form={form}
          subjects={subjectOptions}
          saving={saving}
          editingFramework={editingFramework}
          onChange={updateForm}
          onSave={handleSave}
          onClose={closeForm}
        />
      ) : null}
    </TeacherLayout>
  );
}

function FrameworkFormModal({
  form,
  subjects,
  saving,
  editingFramework,
  onChange,
  onSave,
  onClose,
}: {
  form: FormState;
  subjects: SubjectRow[];
  saving: boolean;
  editingFramework: EnrichedFramework | null;
  onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-8">
      <div className="max-h-[92vh] w-full max-w-[980px] overflow-y-auto rounded-[22px] bg-[#FFF8EF] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E1CFBE] bg-[#FFF8EF] px-6 py-5">
          <div>
            <h2 className="text-[22px] font-extrabold text-[#2B1B18]">
              {editingFramework ? "Edit Kerangka Materi" : "Tambah Kerangka Materi"}
            </h2>

            <p className="mt-1 text-[14px] text-[#6F5549]">
              Data akan tersimpan sebagai draft. Setelah selesai, klik Submit.
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
          <div className="rounded-2xl border border-[#EADACA] bg-white px-5 py-4">
            <p className="text-[14px] font-extrabold text-[#2B1B18]">
              Catatan
            </p>
            <p className="mt-1 text-[13px] leading-6 text-[#6F5549]">
              Kerangka materi tidak menggunakan menu Alokasi Waktu. Guru cukup
              mengisi materi, tujuan, metode, sumber belajar, dan assessment.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Mapel">
              <select
                value={form.subject_id}
                onChange={(event) => onChange("subject_id", event.target.value)}
                className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
              >
                <option value="">Pilih Mapel</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name || "-"}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Tahun Ajaran">
              <input
                value={form.academic_year}
                onChange={(event) =>
                  onChange("academic_year", event.target.value)
                }
                className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
              />
            </FormField>

            <FormField label="Tingkat">
              <select
                value={form.level}
                onChange={(event) => onChange("level", event.target.value)}
                className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
              >
                {formLevelOptions.map((level) => (
                  <option key={level}>{level}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Kelas">
              <select
                value={form.grade}
                onChange={(event) => onChange("grade", event.target.value)}
                className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
              >
                {formGradeOptions.map((grade) => (
                  <option key={grade}>{grade}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Semester">
              <select
                value={form.semester}
                onChange={(event) => onChange("semester", event.target.value)}
                className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
              >
                <option>Ganjil</option>
                <option>Genap</option>
              </select>
            </FormField>

            <FormField label="Judul Kerangka Materi">
              <input
                value={form.framework_title}
                onChange={(event) =>
                  onChange("framework_title", event.target.value)
                }
                placeholder="Contoh: Kerangka Materi Bahasa Indonesia Semester Ganjil"
                className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none placeholder:text-[#9A7B6C] focus:border-[#9C0824]"
              />
            </FormField>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <FormTextarea
              label="Capaian Pembelajaran"
              value={form.learning_outcomes}
              onChange={(value) => onChange("learning_outcomes", value)}
            />

            <FormTextarea
              label="Tujuan Pembelajaran"
              value={form.learning_objectives}
              onChange={(value) => onChange("learning_objectives", value)}
            />

            <FormTextarea
              label="Materi Pokok"
              value={form.core_materials}
              onChange={(value) => onChange("core_materials", value)}
            />

            <FormTextarea
              label="Metode Pembelajaran"
              value={form.learning_methods}
              onChange={(value) => onChange("learning_methods", value)}
            />

            <FormTextarea
              label="Sumber Belajar"
              value={form.learning_resources}
              onChange={(value) => onChange("learning_resources", value)}
            />

            <FormTextarea
              label="Rencana Assessment"
              value={form.assessment_plan}
              onChange={(value) => onChange("assessment_plan", value)}
            />
          </div>

          <FormTextarea
            label="Catatan Tambahan"
            value={form.notes}
            onChange={(value) => onChange("notes", value)}
          />

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
              onClick={onSave}
              disabled={saving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#8C0F2D] px-5 text-[14px] font-extrabold text-white transition hover:bg-[#54131D] disabled:bg-[#C9AAB2]"
            >
              <Save className="h-4 w-4" />
              {saving ? "Menyimpan..." : "Simpan Draft"}
            </button>
          </div>
        </div>
      </div>
    </div>
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
              {framework.subject_name} •{" "}
              {formatLevelGrade(framework.level, framework.grade)}
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
            <DetailCard label="Tingkat" value={normalizeLevel(framework.level)} />
            <DetailCard label="Kelas" value={normalizeGrade(framework.grade)} />
            <DetailCard label="Semester" value={framework.semester || "-"} />
            <DetailCard label="Status" value={getStatusLabel(framework.status)} />
          </div>

          <div className="rounded-2xl border border-[#E1CFBE] bg-white px-5 py-4">
            <div className="mb-3 flex flex-wrap gap-2">
              <StatusBadge status={framework.status} />

              <span className="whitespace-nowrap rounded-full bg-[#F4E5DA] px-3 py-1 text-[12px] font-extrabold text-[#8A2332]">
                {framework.academic_year || "-"}
              </span>
            </div>

            <h3 className="text-[20px] font-extrabold text-[#2B1B18]">
              {framework.framework_title || "-"}
            </h3>

            <p className="mt-2 text-[14px] text-[#6F5549]">
              Update terakhir: {formatDateTime(framework.updated_at)}
            </p>

            {framework.status === "rejected" && framework.rejection_note ? (
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

function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-extrabold text-[#6F5549]">
        {label}
      </span>
      {children}
    </label>
  );
}

function FormTextarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-extrabold text-[#6F5549]">
        {label}
      </span>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="w-full rounded-xl border border-[#DCC8B6] bg-white px-4 py-3 text-[14px] leading-6 outline-none placeholder:text-[#9A7B6C] focus:border-[#9C0824]"
      />
    </label>
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
      <p className="mt-1 text-[14px] font-extrabold text-[#2B1B18]">
        {value}
      </p>
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#E1CFBE] bg-white px-5 py-4">
      <p className="text-[13px] text-[#6F5549]">{label}</p>
      <p className="mt-2 text-[18px] font-extrabold text-[#2B1B18]">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  const safe = status || "draft";

  return (
    <span
      className={`inline-flex w-fit min-w-[82px] items-center justify-center whitespace-nowrap rounded-full px-3 py-1 text-center text-[11px] font-extrabold leading-none ${getStatusClass(
        safe
      )}`}
    >
      {getStatusLabel(safe)}
    </span>
  );
}