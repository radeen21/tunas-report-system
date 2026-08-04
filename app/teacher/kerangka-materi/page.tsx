"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BookOpen,
  Download,
  Edit,
  Eye,
  FileText,
  Layers3,
  Plus,
  Save,
  Search,
  Send,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import TeacherLayout from "../components/TeacherLayout";

const ACADEMIC_YEAR = "2026/2027";
const MATERIAL_FRAMEWORK_BUCKET = "material-framework-documents";

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
  document_url?: string | null;

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
  document_url: string;
};

const INITIAL_FORM: FormState = {
  subject_id: "",
  level: "SD",
  grade: "Kelas 1",
  semester: "Ganjil",
  academic_year: ACADEMIC_YEAR,
  framework_title: "",
  document_url: "",
};

const LEVEL_OPTIONS = ["Semua Tingkat", "SD", "SMP", "SMA"];
const FORM_LEVEL_OPTIONS = ["SD", "SMP", "SMA"];

const LEVEL_GRADE_OPTIONS: Record<string, string[]> = {
  SD: [
    "Kelas 1",
    "Kelas 2",
    "Kelas 3",
    "Kelas 4",
    "Kelas 5",
    "Kelas 6",
  ],
  SMP: ["Kelas 7", "Kelas 8", "Kelas 9"],
  SMA: ["Kelas 10", "Kelas 11", "Kelas 12"],
};

const STATUS_OPTIONS = [
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

  if (match?.[0]) {
    return `Kelas ${match[0]}`;
  }

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

  if (safe === "submitted") {
    return "bg-[#FFF2B8] text-[#B26A00]";
  }

  if (safe === "rejected") {
    return "bg-[#FFE4E6] text-[#BE123C]";
  }

  return "bg-[#F1F5F9] text-[#64748B]";
}

function canEditFramework(status?: string | null) {
  return !status || status === "draft" || status === "rejected";
}

function cleanFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");
}

function isAllowedFile(file: File) {
  const allowedExtensions = [".pdf", ".doc", ".docx"];
  const fileName = file.name.toLowerCase();

  return allowedExtensions.some((extension) => fileName.endsWith(extension));
}

function getFileNameFromUrl(url?: string | null) {
  if (!url) return "-";

  try {
    const pathname = new URL(url).pathname;
    const fileName = pathname.split("/").pop();

    return fileName ? decodeURIComponent(fileName) : "Dokumen Kerangka Materi";
  } catch {
    return "Dokumen Kerangka Materi";
  }
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
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function getCurrentTeacher() {
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError) {
      throw new Error(authError.message);
    }

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

      if (error) {
        throw new Error(error.message);
      }

      if (data) {
        return data as TeacherRow;
      }
    }

    if (teacherCode) {
      const { data, error } = await supabase
        .from("teachers")
        .select("*")
        .eq("teacher_code", teacherCode)
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      if (data) {
        return data as TeacherRow;
      }
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

      if (subjectsRes.error) {
        throw new Error(subjectsRes.error.message);
      }

      if (frameworksRes.error) {
        throw new Error(frameworksRes.error.message);
      }

      const subjectsData = (subjectsRes.data || []) as SubjectRow[];
      const frameworksData = (frameworksRes.data ||
        []) as MaterialFrameworkRow[];

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
    void fetchData();

    const channel = supabase
      .channel("teacher-kerangka-materi-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teachers" },
        () => void fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "material_frameworks" },
        () => void fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subjects" },
        () => void fetchData()
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
    if (teacherSubjectNames.length === 0) {
      return subjects;
    }

    const filteredSubjects = subjects.filter((subject) => {
      return teacherSubjectNames.some((teacherSubject) =>
        sameSubjectName(teacherSubject, subject.name)
      );
    });

    return filteredSubjects.length > 0 ? filteredSubjects : subjects;
  }, [subjects, teacherSubjectNames]);

  const gradeOptionsForForm = useMemo(() => {
    return LEVEL_GRADE_OPTIONS[form.level] || [];
  }, [form.level]);

  function handleLevelChange(level: string) {
    const grades = LEVEL_GRADE_OPTIONS[level] || [];

    setForm((current) => ({
      ...current,
      level,
      grade: grades.includes(current.grade) ? current.grade : grades[0] || "",
    }));
  }

  function openCreateForm() {
    const firstSubject = subjectOptions[0];

    setEditingFramework(null);
    setSelectedFile(null);
    setForm({
      ...INITIAL_FORM,
      subject_id: firstSubject?.id || "",
    });

    setIsFormOpen(true);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function openEditForm(framework: EnrichedFramework) {
    if (!canEditFramework(framework.status)) {
      setErrorMessage(
        "Kerangka materi yang sudah submitted atau approved tidak bisa diedit."
      );
      return;
    }

    const normalizedLevel = normalizeLevel(framework.level);

    setEditingFramework(framework);
    setSelectedFile(null);
    setForm({
      subject_id: framework.subject_id || "",
      level:
        normalizedLevel === "SD" ||
        normalizedLevel === "SMP" ||
        normalizedLevel === "SMA"
          ? normalizedLevel
          : "SD",
      grade: normalizeGrade(framework.grade),
      semester: framework.semester || "Ganjil",
      academic_year: framework.academic_year || ACADEMIC_YEAR,
      framework_title: framework.framework_title || "",
      document_url: framework.document_url || "",
    });

    setIsFormOpen(true);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function closeForm() {
    if (saving) return;

    setIsFormOpen(false);
    setEditingFramework(null);
    setSelectedFile(null);
    setForm(INITIAL_FORM);
    setErrorMessage("");
  }

  function validateForm() {
    if (!teacher?.id) {
      setErrorMessage("Data guru belum ditemukan.");
      return false;
    }

    if (!form.subject_id) {
      setErrorMessage("Mapel wajib dipilih.");
      return false;
    }

    if (!form.level) {
      setErrorMessage("Tingkat wajib dipilih.");
      return false;
    }

    if (!form.grade) {
      setErrorMessage("Kelas wajib dipilih.");
      return false;
    }

    if (!form.framework_title.trim()) {
      setErrorMessage("Judul kerangka materi wajib diisi.");
      return false;
    }

    if (!selectedFile && !form.document_url.trim()) {
      setErrorMessage("Dokumen kerangka materi wajib diunggah.");
      return false;
    }

    if (selectedFile && !isAllowedFile(selectedFile)) {
      setErrorMessage("Dokumen harus berformat PDF, DOC, atau DOCX.");
      return false;
    }

    if (selectedFile && selectedFile.size > 10 * 1024 * 1024) {
      setErrorMessage("Ukuran dokumen maksimal 10MB.");
      return false;
    }

    return true;
  }

  async function uploadFrameworkDocument() {
    if (!selectedFile || !teacher?.id) {
      return form.document_url.trim() || null;
    }

    const safeTitle = cleanFileName(
      form.framework_title.trim() || "kerangka-materi"
    );

    const extension = selectedFile.name.split(".").pop() || "pdf";
    const fileName = `${Date.now()}-${safeTitle}.${extension}`;
    const filePath = `${teacher.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(MATERIAL_FRAMEWORK_BUCKET)
      .upload(filePath, selectedFile, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage
      .from(MATERIAL_FRAMEWORK_BUCKET)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function handleSave() {
    setErrorMessage("");
    setSuccessMessage("");

    if (!validateForm()) return;
    if (!teacher?.id) return;

    setSaving(true);

    try {
      const now = new Date().toISOString();
      const documentUrl = await uploadFrameworkDocument();

      const frameworkPayload = {
        teacher_id: teacher.id,
        subject_id: form.subject_id,
        level: form.level,
        grade: form.grade,
        semester: form.semester,
        academic_year: form.academic_year,
        framework_title: form.framework_title.trim(),
        document_url: documentUrl,

        // Kolom lama dikosongkan karena guru hanya upload dokumen.
        learning_outcomes: null,
        learning_objectives: null,
        core_materials: null,
        learning_methods: null,
        learning_resources: null,
        assessment_plan: null,
        notes: null,

        status: "draft",
        submitted_at: null,
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

        if (error) {
          throw new Error(error.message);
        }
      } else {
        const { error } = await supabase.from("material_frameworks").insert({
          ...frameworkPayload,
          created_at: now,
        });

        if (error) {
          throw new Error(error.message);
        }
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

    if (!framework.document_url) {
      setErrorMessage(
        "Dokumen belum tersedia. Edit kerangka materi lalu upload dokumen."
      );
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

      if (error) {
        throw new Error(error.message);
      }

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
        "Kerangka materi yang sudah submitted atau approved tidak bisa dihapus."
      );
      return;
    }

    const confirmDelete = window.confirm(
      `Hapus kerangka materi "${framework.framework_title || "-"}"?`
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

      if (error) {
        throw new Error(error.message);
      }

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
    const standardGrades = Object.values(LEVEL_GRADE_OPTIONS).flat();

    const existingGrades = frameworks
      .map((framework) => normalizeGrade(framework.grade))
      .filter((grade) => grade !== "-");

    return [
      "Semua Kelas",
      ...Array.from(new Set([...standardGrades, ...existingGrades])),
    ];
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
        normalizeText(frameworkLevel).includes(q) ||
        normalizeText(frameworkGrade).includes(q) ||
        normalizeText(framework.semester).includes(q) ||
        normalizeText(framework.academic_year).includes(q);

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
              Guru cukup memilih mapel, tingkat, kelas, semester, mengisi judul,
              lalu mengunggah dokumen kerangka materi.
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
                placeholder="Cari judul, mapel, kelas, semester, atau tahun ajaran..."
                className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] pl-11 pr-4 text-[14px] outline-none placeholder:text-[#9A7B6C] focus:border-[#9C0824]"
              />
            </div>

            <select
              value={levelFilter}
              onChange={(event) => setLevelFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              {LEVEL_OPTIONS.map((level) => (
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
              {STATUS_OPTIONS.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          {loading ? (
            <EmptyState text="Memuat data kerangka materi..." />
          ) : filteredFrameworks.length === 0 ? (
            <EmptyState text="Belum ada kerangka materi untuk guru ini." />
          ) : (
            filteredFrameworks.map((framework) => {
              const editable = canEditFramework(framework.status);

              return (
                <div
                  key={framework.id}
                  className="overflow-hidden rounded-[22px] border border-[#E1CFBE] bg-white shadow-sm"
                >
                  <div className="border-b border-[#EADACA] bg-[#FFF8EF] px-6 py-5">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge status={framework.status} />

                        <span className="whitespace-nowrap rounded-full bg-[#F4E5DA] px-3 py-1 text-[12px] font-extrabold text-[#8A2332]">
                          {formatLevelGrade(framework.level, framework.grade)}
                        </span>

                        <span className="whitespace-nowrap rounded-full bg-[#F1F5F9] px-3 py-1 text-[12px] font-extrabold text-[#64748B]">
                          Semester {framework.semester || "-"}
                        </span>

                        {framework.document_url ? (
                          <span className="whitespace-nowrap rounded-full bg-[#E0F2FE] px-3 py-1 text-[12px] font-extrabold text-[#0369A1]">
                            Ada Dokumen
                          </span>
                        ) : (
                          <span className="whitespace-nowrap rounded-full bg-[#FFE4E6] px-3 py-1 text-[12px] font-extrabold text-[#BE123C]">
                            Belum Upload
                          </span>
                        )}
                      </div>

                      <div>
                        <h2 className="text-[20px] font-extrabold leading-tight text-[#2B1B18]">
                          {framework.framework_title || "-"}
                        </h2>

                        <p className="mt-2 text-[14px] text-[#6F5549]">
                          {framework.subject_name} • Tahun Ajaran{" "}
                          {framework.academic_year || "-"}
                        </p>
                      </div>

                      {framework.status === "rejected" &&
                      framework.rejection_note ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] leading-5 text-red-700">
                          Catatan Revisi: {framework.rejection_note}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-4 px-6 py-5">
                    <div className="rounded-2xl border border-[#EADACA] bg-[#FFFCF8] px-5 py-4">
                      <p className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#8A5A48]">
                        Dokumen Kerangka Materi
                      </p>

                      <p className="mt-2 break-all text-[14px] font-bold text-[#2B1B18]">
                        {framework.document_url
                          ? getFileNameFromUrl(framework.document_url)
                          : "Belum ada dokumen"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedFramework(framework)}
                        className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#DCC8B6] px-3 text-[13px] font-extrabold text-[#8C0F2D] transition hover:bg-[#FFF8EF]"
                      >
                        <Eye className="h-4 w-4" />
                        Detail
                      </button>

                      {framework.document_url ? (
                        <a
                          href={framework.document_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#BAE6FD] px-3 text-[13px] font-extrabold text-[#0369A1] transition hover:bg-[#F0F9FF]"
                        >
                          <Download className="h-4 w-4" />
                          Buka Dokumen
                        </a>
                      ) : null}

                      {editable ? (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditForm(framework)}
                            className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#DCC8B6] px-3 text-[13px] font-extrabold text-[#8C0F2D] transition hover:bg-[#FFF8EF]"
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleSubmit(framework)}
                            disabled={saving || !framework.document_url}
                            className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#8C0F2D] px-3 text-[13px] font-extrabold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:bg-[#C9AAB2]"
                          >
                            <Send className="h-4 w-4" />
                            Submit
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleDelete(framework)}
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
          gradeOptions={gradeOptionsForForm}
          selectedFile={selectedFile}
          saving={saving}
          editingFramework={editingFramework}
          errorMessage={errorMessage}
          onChange={updateForm}
          onLevelChange={handleLevelChange}
          onFileChange={setSelectedFile}
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
  gradeOptions,
  selectedFile,
  saving,
  editingFramework,
  errorMessage,
  onChange,
  onLevelChange,
  onFileChange,
  onSave,
  onClose,
}: {
  form: FormState;
  subjects: SubjectRow[];
  gradeOptions: string[];
  selectedFile: File | null;
  saving: boolean;
  editingFramework: EnrichedFramework | null;
  errorMessage: string;
  onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onLevelChange: (level: string) => void;
  onFileChange: (file: File | null) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-8">
      <div className="max-h-[92vh] w-full max-w-[980px] overflow-y-auto rounded-[22px] bg-[#FFF8EF] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E1CFBE] bg-[#FFF8EF] px-6 py-5">
          <div>
            <h2 className="text-[22px] font-extrabold text-[#2B1B18]">
              {editingFramework
                ? "Edit Kerangka Materi"
                : "Tambah Kerangka Materi"}
            </h2>

            <p className="mt-1 text-[14px] text-[#6F5549]">
              Lengkapi data sampai judul, lalu upload dokumen kerangka materi.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full p-2 text-[#6F5549] transition hover:bg-[#F4E5DA] disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          {errorMessage ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <div className="rounded-2xl border border-[#EADACA] bg-white px-5 py-4">
            <p className="text-[14px] font-extrabold text-[#2B1B18]">
              Catatan
            </p>

            <p className="mt-1 text-[13px] leading-6 text-[#6F5549]">
              Guru cukup memilih mapel, tahun ajaran, tingkat, kelas, semester,
              mengisi judul, lalu mengunggah dokumen kerangka materi.
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
                onChange={(event) => onLevelChange(event.target.value)}
                className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
              >
                {FORM_LEVEL_OPTIONS.map((level) => (
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
                {gradeOptions.map((grade) => (
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

          <div className="rounded-2xl border border-dashed border-[#DCC8B6] bg-white px-5 py-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="flex items-center gap-2 text-[14px] font-extrabold text-[#2B1B18]">
                  <UploadCloud className="h-5 w-5 text-[#8C0F2D]" />
                  Upload Dokumen Kerangka Materi
                </p>

                <p className="mt-1 text-[13px] text-[#6F5549]">
                  Format PDF, DOC, atau DOCX. Maksimal 10MB.
                </p>

                {form.document_url ? (
                  <a
                    href={form.document_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-2 text-[13px] font-extrabold text-[#0369A1] underline"
                  >
                    <FileText className="h-4 w-4" />
                    Lihat dokumen yang sudah ada
                  </a>
                ) : null}

                {selectedFile ? (
                  <p className="mt-2 text-[13px] font-bold text-[#158A58]">
                    File dipilih: {selectedFile.name}
                  </p>
                ) : null}
              </div>

              <label className="flex h-11 cursor-pointer items-center justify-center rounded-xl bg-[#8C0F2D] px-5 text-[14px] font-extrabold text-white transition hover:bg-[#54131D]">
                Pilih File

                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    onFileChange(file);
                  }}
                />
              </label>
            </div>
          </div>

          <FormField label="Link Dokumen Manual (Opsional)">
            <input
              value={form.document_url}
              onChange={(event) =>
                onChange("document_url", event.target.value)
              }
              placeholder="Isi link Google Drive jika tidak upload file"
              className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none placeholder:text-[#9A7B6C] focus:border-[#9C0824]"
            />
          </FormField>

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
      <div className="max-h-[92vh] w-full max-w-[780px] overflow-y-auto rounded-[22px] bg-[#FFF8EF] shadow-2xl">
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

          <div className="rounded-2xl border border-[#E1CFBE] bg-white px-5 py-4">
            <p className="text-[13px] font-extrabold uppercase tracking-[0.08em] text-[#8A5A48]">
              Dokumen Kerangka Materi
            </p>

            {framework.document_url ? (
              <>
                <p className="mt-2 break-all text-[14px] font-bold text-[#2B1B18]">
                  {getFileNameFromUrl(framework.document_url)}
                </p>

                <a
                  href={framework.document_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-[#8C0F2D] px-5 text-[14px] font-extrabold text-white transition hover:bg-[#54131D]"
                >
                  <Download className="h-4 w-4" />
                  Buka Dokumen
                </a>
              </>
            ) : (
              <p className="mt-2 text-[14px] text-[#BE123C]">
                Dokumen belum diunggah.
              </p>
            )}
          </div>

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

function EmptyState({ text }: { text: string }) {
  return (
    <div className="col-span-full rounded-[22px] border border-[#E1CFBE] bg-white px-6 py-12 text-center text-[#6F5549] shadow-sm">
      {text}
    </div>
  );
}