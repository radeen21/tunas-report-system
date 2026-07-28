"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CheckCircle2,
  Edit3,
  Eye,
  FileText,
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

const RPP_BUCKET = "rpp-documents";
const ACADEMIC_YEAR = "2026/2027";

type TeacherRow = {
  id: string;
  full_name: string | null;
  email?: string | null;
  subjects?: string[] | string | null;
};

type CurriculumProgram = {
  id: string;
  teacher_id: string | null;
  program_type: string | null;
  level: string | null;
  grade: string | null;
  subject_name: string | null;
  semester: string | null;
  academic_year: string | null;
  status: string | null;
};

type CurriculumChapter = {
  id: string;
  curriculum_program_id: string | null;
  chapter_title: string | null;
  chapter_order: number | null;
};

type CurriculumSubChapter = {
  id: string;
  curriculum_chapter_id: string | null;
  sub_chapter_title: string | null;
  sub_chapter_order: number | null;
  target_month: string | null;
  planned_week: number | null;
};

type ProgramWithChildren = CurriculumProgram & {
  chapters: Array<
    CurriculumChapter & {
      sub_chapters: CurriculumSubChapter[];
    }
  >;
};

type RppRow = {
  id: string;
  title?: string | null;
  teacher_id: string | null;
  curriculum_program_id: string | null;
  curriculum_chapter_id: string | null;
  curriculum_sub_chapter_id: string | null;
  subject_name: string | null;
  level: string | null;
  grade: string | null;
  semester: string | null;
  academic_year: string | null;

  meeting_date: string | null;
  meeting_number: number | null;
  opening_activity: string | null;
  core_activity: string | null;
  closing_activity: string | null;

  rpp_title: string | null;
  indicator: string | null;
  subject_material: string | null;
  learning_objectives: string | null;
  assessment: string | null;
  learning_media: string | null;
  learning_resources: string | null;
  document_url: string | null;
  notes: string | null;
  status: "draft" | "submitted" | "approved" | "rejected" | string | null;
  submitted_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_note: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type RppForm = {
  id: string;
  curriculum_program_id: string;
  curriculum_chapter_id: string;
  curriculum_sub_chapter_id: string;
  rpp_title: string;
  indicator: string;
  subject_material: string;
  learning_objectives: string;
  assessment: string;
  learning_media: string;
  learning_resources: string;
  document_url: string;
  notes: string;
  status: string;
};

function emptyForm(): RppForm {
  return {
    id: "",
    curriculum_program_id: "",
    curriculum_chapter_id: "",
    curriculum_sub_chapter_id: "",
    rpp_title: "",
    indicator: "",
    subject_material: "",
    learning_objectives: "",
    assessment: "",
    learning_media: "",
    learning_resources: "",
    document_url: "",
    notes: "",
    status: "draft",
  };
}

function normalizeText(value?: string | null) {
  return (value || "").trim().toLowerCase();
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

function isTeacherSubjectMatch(
  teacherSubjects: string[],
  programSubject?: string | null
) {
  if (teacherSubjects.length === 0) return true;

  const subjectName = normalizeText(programSubject);

  if (!subjectName) return false;

  return teacherSubjects.some((teacherSubject) => {
    return (
      teacherSubject === subjectName ||
      teacherSubject.includes(subjectName) ||
      subjectName.includes(teacherSubject)
    );
  });
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

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getRppTitle(rpp: RppRow) {
  return rpp.rpp_title || rpp.title || "-";
}

function getStatusLabel(status?: string | null) {
  if (status === "submitted") return "Submitted";
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Draft";
}

function getStatusClass(status?: string | null) {
  if (status === "approved") return "bg-[#C7F0DA] text-[#158A58]";
  if (status === "submitted") return "bg-[#FFF2B8] text-[#B26A00]";
  if (status === "rejected") return "bg-[#FFE4E6] text-[#BE123C]";
  return "bg-[#F1F5F9] text-[#64748B]";
}

function canEditRpp(status?: string | null) {
  return !status || status === "draft" || status === "rejected";
}

function canDeleteRpp(status?: string | null) {
  return !status || status === "draft" || status === "rejected";
}

function cleanFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");
}

function isAllowedRppFile(file: File) {
  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
  ];

  const allowedExtensions = [".pdf", ".doc", ".docx"];
  const lowerName = file.name.toLowerCase();

  return (
    allowedTypes.includes(file.type) ||
    allowedExtensions.some((extension) => lowerName.endsWith(extension))
  );
}

export default function TeacherRppPage() {
  const [teacher, setTeacher] = useState<TeacherRow | null>(null);
  const [programs, setPrograms] = useState<ProgramWithChildren[]>([]);
  const [rpps, setRpps] = useState<RppRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");

  const [showModal, setShowModal] = useState(false);
  const [selectedRpp, setSelectedRpp] = useState<RppRow | null>(null);
  const [form, setForm] = useState<RppForm>(emptyForm());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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
      .order("full_name")
      .limit(1)
      .maybeSingle();

    return data as TeacherRow | null;
  }

  async function fetchData() {
    setLoading(true);

    const currentTeacher = await getCurrentTeacher();
    setTeacher(currentTeacher);

    if (!currentTeacher?.id) {
      setPrograms([]);
      setRpps([]);
      setLoading(false);
      return;
    }

    const teacherSubjects = normalizeSubjects(currentTeacher.subjects);

    const [programsRes, chaptersRes, subChaptersRes, rppRes] =
      await Promise.all([
        supabase
          .from("curriculum_programs")
          .select("*")
          .eq("teacher_id", currentTeacher.id)
          .order("updated_at", { ascending: false }),

        supabase
          .from("curriculum_chapters")
          .select("*")
          .order("chapter_order", { ascending: true }),

        supabase
          .from("curriculum_sub_chapters")
          .select("*")
          .order("sub_chapter_order", { ascending: true }),

        supabase
          .from("rpp")
          .select("*")
          .eq("teacher_id", currentTeacher.id)
          .order("updated_at", { ascending: false }),
      ]);

    if (programsRes.error) {
      alert(`Gagal mengambil Program Semester: ${programsRes.error.message}`);
    }

    if (chaptersRes.error) {
      alert(`Gagal mengambil Bab: ${chaptersRes.error.message}`);
    }

    if (subChaptersRes.error) {
      alert(`Gagal mengambil Sub Bab: ${subChaptersRes.error.message}`);
    }

    if (rppRes.error) {
      alert(`Gagal mengambil RPP: ${rppRes.error.message}`);
    }

    const rawProgramsData = (programsRes.data || []) as CurriculumProgram[];

    const programsData = rawProgramsData.filter((program) => {
      const matchTeacher = program.teacher_id === currentTeacher.id;

      const matchSubject = isTeacherSubjectMatch(
        teacherSubjects,
        program.subject_name
      );

      const matchAcademicYear =
        !program.academic_year || program.academic_year === ACADEMIC_YEAR;

      return matchTeacher && matchSubject && matchAcademicYear;
    });

    const chaptersData = (chaptersRes.data || []) as CurriculumChapter[];
    const subChaptersData = (subChaptersRes.data || []) as CurriculumSubChapter[];
    const rppData = (rppRes.data || []) as RppRow[];

    const allowedProgramIds = new Set(programsData.map((program) => program.id));

    const allowedChapterIds = new Set(
      chaptersData
        .filter((chapter) => {
          return (
            chapter.curriculum_program_id &&
            allowedProgramIds.has(chapter.curriculum_program_id)
          );
        })
        .map((chapter) => chapter.id)
    );

    const filteredChaptersData = chaptersData.filter((chapter) => {
      return (
        chapter.curriculum_program_id &&
        allowedProgramIds.has(chapter.curriculum_program_id)
      );
    });

    const filteredSubChaptersData = subChaptersData.filter((subChapter) => {
      return (
        subChapter.curriculum_chapter_id &&
        allowedChapterIds.has(subChapter.curriculum_chapter_id)
      );
    });

    const subChaptersByChapter = new Map<string, CurriculumSubChapter[]>();

    filteredSubChaptersData.forEach((subChapter) => {
      if (!subChapter.curriculum_chapter_id) return;

      const current =
        subChaptersByChapter.get(subChapter.curriculum_chapter_id) || [];

      current.push(subChapter);
      subChaptersByChapter.set(subChapter.curriculum_chapter_id, current);
    });

    const chaptersByProgram = new Map<
      string,
      Array<CurriculumChapter & { sub_chapters: CurriculumSubChapter[] }>
    >();

    filteredChaptersData.forEach((chapter) => {
      if (!chapter.curriculum_program_id) return;

      const current = chaptersByProgram.get(chapter.curriculum_program_id) || [];

      current.push({
        ...chapter,
        sub_chapters: subChaptersByChapter.get(chapter.id) || [],
      });

      chaptersByProgram.set(chapter.curriculum_program_id, current);
    });

    const programsWithChildren: ProgramWithChildren[] = programsData.map(
      (program) => ({
        ...program,
        chapters: chaptersByProgram.get(program.id) || [],
      })
    );

    setPrograms(programsWithChildren);
    setRpps(rppData);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("teacher-rpp-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rpp" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "curriculum_programs" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "curriculum_chapters" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "curriculum_sub_chapters" },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const selectedProgram = useMemo(() => {
    return (
      programs.find((program) => program.id === form.curriculum_program_id) ||
      null
    );
  }, [programs, form.curriculum_program_id]);

  const selectedChapter = useMemo(() => {
    return (
      selectedProgram?.chapters.find(
        (chapter) => chapter.id === form.curriculum_chapter_id
      ) || null
    );
  }, [selectedProgram, form.curriculum_chapter_id]);

  const selectedSubChapter = useMemo(() => {
    return (
      selectedChapter?.sub_chapters.find(
        (subChapter) => subChapter.id === form.curriculum_sub_chapter_id
      ) || null
    );
  }, [selectedChapter, form.curriculum_sub_chapter_id]);

  const filteredRpps = useMemo(() => {
    const q = normalizeText(search);

    return rpps.filter((rpp) => {
      const matchSearch =
        !q ||
        normalizeText(getRppTitle(rpp)).includes(q) ||
        normalizeText(rpp.subject_name).includes(q) ||
        normalizeText(rpp.indicator).includes(q) ||
        normalizeText(rpp.subject_material).includes(q) ||
        normalizeText(rpp.learning_objectives).includes(q) ||
        normalizeText(rpp.notes).includes(q);

      const matchStatus =
        statusFilter === "Semua Status" || rpp.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [rpps, search, statusFilter]);

  const summary = useMemo(() => {
    return {
      total: rpps.length,
      draft: rpps.filter((rpp) => rpp.status === "draft").length,
      submitted: rpps.filter((rpp) => rpp.status === "submitted").length,
      approved: rpps.filter((rpp) => rpp.status === "approved").length,
    };
  }, [rpps]);

  function updateForm(field: keyof RppForm, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function openCreateModal() {
    setForm(emptyForm());
    setSelectedFile(null);
    setShowModal(true);
  }

  function openEditModal(rpp: RppRow) {
    if (!canEditRpp(rpp.status)) {
      alert("RPP yang sudah submitted atau approved tidak bisa diedit.");
      return;
    }

    setForm({
      id: rpp.id,
      curriculum_program_id: rpp.curriculum_program_id || "",
      curriculum_chapter_id: rpp.curriculum_chapter_id || "",
      curriculum_sub_chapter_id: rpp.curriculum_sub_chapter_id || "",
      rpp_title: rpp.rpp_title || rpp.title || "",
      indicator: rpp.indicator || "",
      subject_material: rpp.subject_material || "",
      learning_objectives: rpp.learning_objectives || "",
      assessment: rpp.assessment || "",
      learning_media: rpp.learning_media || "",
      learning_resources: rpp.learning_resources || "",
      document_url: rpp.document_url || "",
      notes: rpp.notes || "",
      status: rpp.status || "draft",
    });

    setSelectedFile(null);
    setShowModal(true);
  }

  function validateForm() {
    if (!teacher?.id) {
      alert("Data guru tidak ditemukan.");
      return false;
    }

    if (!selectedProgram) {
      alert("Pilih Program Semester terlebih dahulu.");
      return false;
    }

    if (selectedProgram.teacher_id !== teacher.id) {
      alert("Program Semester ini bukan milik guru aktif.");
      return false;
    }

    if (!isTeacherSubjectMatch(normalizeSubjects(teacher.subjects), selectedProgram.subject_name)) {
      alert("Mapel Program Semester tidak sesuai dengan mapel guru aktif.");
      return false;
    }

    if (!selectedChapter) {
      alert("Pilih Bab terlebih dahulu.");
      return false;
    }

    if (selectedChapter.curriculum_program_id !== selectedProgram.id) {
      alert("Bab tidak sesuai dengan Program Semester yang dipilih.");
      return false;
    }

    if (!selectedSubChapter) {
      alert("Pilih Sub Bab terlebih dahulu.");
      return false;
    }

    if (selectedSubChapter.curriculum_chapter_id !== selectedChapter.id) {
      alert("Sub Bab tidak sesuai dengan Bab yang dipilih.");
      return false;
    }

    if (!form.rpp_title.trim()) {
      alert("Isi judul RPP terlebih dahulu.");
      return false;
    }

    if (!form.indicator.trim()) {
      alert("Isi indikator terlebih dahulu.");
      return false;
    }

    if (!form.subject_material.trim()) {
      alert("Isi materi pelajaran terlebih dahulu.");
      return false;
    }

    if (!form.learning_objectives.trim()) {
      alert("Isi tujuan pembelajaran terlebih dahulu.");
      return false;
    }

    if (selectedFile && !isAllowedRppFile(selectedFile)) {
      alert("File harus berformat PDF, DOC, atau DOCX.");
      return false;
    }

    if (selectedFile && selectedFile.size > 10 * 1024 * 1024) {
      alert("Ukuran file maksimal 10MB.");
      return false;
    }

    return true;
  }

  async function uploadRppFile() {
    if (!selectedFile || !teacher?.id) return form.document_url.trim() || null;

    const fileExtension = selectedFile.name.split(".").pop() || "pdf";
    const safeTitle = cleanFileName(form.rpp_title || "rpp");
    const fileName = `${Date.now()}-${safeTitle}.${fileExtension}`;
    const filePath = `${teacher.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(RPP_BUCKET)
      .upload(filePath, selectedFile, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage.from(RPP_BUCKET).getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function handleSave(statusOverride?: "draft" | "submitted") {
    if (!validateForm()) return;

    if (!teacher?.id || !selectedProgram || !selectedChapter || !selectedSubChapter) {
      return;
    }

    if (form.id) {
      const existingRpp = rpps.find((rpp) => rpp.id === form.id);

      if (existingRpp && !canEditRpp(existingRpp.status)) {
        alert("RPP yang sudah submitted atau approved tidak bisa diedit.");
        return;
      }
    }

    setSaving(true);

    try {
      const now = new Date().toISOString();
      const nextStatus = statusOverride || form.status || "draft";
      const uploadedDocumentUrl = await uploadRppFile();

      const payload = {
        title: form.rpp_title.trim(),
        teacher_id: teacher.id,
        curriculum_program_id: selectedProgram.id,
        curriculum_chapter_id: selectedChapter.id,
        curriculum_sub_chapter_id: selectedSubChapter.id,
        subject_name: selectedProgram.subject_name,
        level: selectedProgram.level,
        grade: selectedProgram.grade,
        semester: selectedProgram.semester,
        academic_year: selectedProgram.academic_year || ACADEMIC_YEAR,

        meeting_date: null,
        meeting_number: null,
        opening_activity: null,
        core_activity: null,
        closing_activity: null,

        rpp_title: form.rpp_title.trim(),
        indicator: form.indicator.trim(),
        subject_material: form.subject_material.trim(),
        learning_objectives: form.learning_objectives.trim(),
        assessment: form.assessment.trim() || null,
        learning_media: form.learning_media.trim() || null,
        learning_resources: form.learning_resources.trim() || null,
        document_url: uploadedDocumentUrl,
        notes: form.notes.trim() || null,
        status: nextStatus,
        submitted_at: nextStatus === "submitted" ? now : null,
        rejected_at: null,
        rejection_note: null,
        updated_at: now,
      };

      if (form.id) {
        const { error } = await supabase
          .from("rpp")
          .update(payload)
          .eq("id", form.id)
          .eq("teacher_id", teacher.id);

        if (error) {
          throw new Error(error.message);
        }
      } else {
        const { error } = await supabase.from("rpp").insert(payload);

        if (error) {
          throw new Error(error.message);
        }
      }

      await fetchData();

      setSaving(false);
      setShowModal(false);
      setForm(emptyForm());
      setSelectedFile(null);

      alert(
        nextStatus === "submitted"
          ? "RPP berhasil disubmit."
          : "RPP berhasil disimpan."
      );
    } catch (error) {
      setSaving(false);
      alert(
        `Gagal simpan RPP: ${
          error instanceof Error ? error.message : "Terjadi kesalahan"
        }`
      );
    }
  }

  async function handleDelete(rpp: RppRow) {
    if (!teacher?.id) {
      alert("Data guru tidak ditemukan.");
      return;
    }

    if (!canDeleteRpp(rpp.status)) {
      alert("RPP yang sudah submitted atau approved tidak bisa dihapus.");
      return;
    }

    const confirmDelete = confirm(`Hapus RPP "${getRppTitle(rpp)}"?`);

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("rpp")
      .delete()
      .eq("id", rpp.id)
      .eq("teacher_id", teacher.id);

    if (error) {
      alert(`Gagal hapus RPP: ${error.message}`);
      return;
    }

    await fetchData();
  }

  return (
    <TeacherLayout
      activeMenu="RPP"
      teacherName={teacher?.full_name || "Guru"}
      teacherSubject={formatTeacherSubject(teacher?.subjects)}
      searchPlaceholder="Cari RPP..."
    >
      <section className="space-y-7">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#8A5A48]">
              Teacher Portal
            </p>

            <h1 className="mt-2 text-[30px] font-extrabold tracking-[-0.02em] text-[#2B1B18]">
              RPP
            </h1>

            <p className="mt-2 max-w-[850px] text-[15px] leading-6 text-[#6F5549]">
              Buat RPP berdasarkan Program Semester, Bab, dan Sub Bab milik guru
              aktif. Format baru menggunakan Indikator dan Materi Pelajaran.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex h-11 w-fit items-center gap-2 rounded-xl bg-[#8C0F2D] px-5 text-[14px] font-extrabold text-white shadow-sm transition hover:bg-[#54131D]"
          >
            <Plus className="h-4 w-4" />
            Tambah RPP
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={<FileText className="h-5 w-5" />}
            label="Total RPP"
            value={summary.total}
            info="Data"
            tone="pink"
          />
          <SummaryCard
            icon={<Edit3 className="h-5 w-5" />}
            label="Draft"
            value={summary.draft}
            info="Draft"
            tone="orange"
          />
          <SummaryCard
            icon={<Send className="h-5 w-5" />}
            label="Submitted"
            value={summary.submitted}
            info="Review"
            tone="blue"
          />
          <SummaryCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Approved"
            value={summary.approved}
            info="Approved"
            tone="green"
          />
        </div>

        <div className="rounded-[22px] border border-[#E1CFBE] bg-white p-5 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8E6A58]" />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari judul, mapel, indikator, materi, tujuan, atau catatan..."
                className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] pl-11 pr-4 text-[14px] outline-none placeholder:text-[#9A7B6C] focus:border-[#9C0824]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              <option>Semua Status</option>
              <option value="draft">draft</option>
              <option value="submitted">submitted</option>
              <option value="approved">approved</option>
              <option value="rejected">rejected</option>
            </select>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          {loading ? (
            <EmptyState text="Memuat data RPP..." />
          ) : filteredRpps.length === 0 ? (
            <EmptyState text="Belum ada data RPP." />
          ) : (
            filteredRpps.map((rpp) => (
              <div
                key={rpp.id}
                className="overflow-hidden rounded-[22px] border border-[#E1CFBE] bg-white shadow-sm"
              >
                <div className="border-b border-[#EADACA] bg-[#FFF8EF] px-6 py-5">
                  <div className="mb-3 flex flex-wrap gap-2">
                    <StatusBadge status={rpp.status} />

                    <span className="rounded-full bg-[#F4E5DA] px-3 py-1 text-[12px] font-extrabold text-[#8A2332]">
                      {rpp.level} — {rpp.grade}
                    </span>

                    <span className="rounded-full bg-[#F1F5F9] px-3 py-1 text-[12px] font-extrabold text-[#64748B]">
                      Semester {rpp.semester}
                    </span>

                    {rpp.document_url ? (
                      <span className="rounded-full bg-[#E0F2FE] px-3 py-1 text-[12px] font-extrabold text-[#0369A1]">
                        Ada Dokumen
                      </span>
                    ) : null}
                  </div>

                  <h2 className="text-[20px] font-extrabold text-[#2B1B18]">
                    {getRppTitle(rpp)}
                  </h2>

                  <p className="mt-2 text-[14px] text-[#6F5549]">
                    {rpp.subject_name || "-"} • {rpp.academic_year || "-"}
                  </p>
                </div>

                <div className="space-y-4 px-6 py-5">
                  <InfoBlock label="Indikator" value={rpp.indicator || "-"} />

                  <InfoBlock
                    label="Materi Pelajaran"
                    value={rpp.subject_material || "-"}
                  />

                  <InfoBlock
                    label="Tujuan Pembelajaran"
                    value={rpp.learning_objectives || "-"}
                  />

                  {rpp.status === "rejected" ? (
                    <div className="rounded-2xl border border-[#FECACA] bg-[#FFF1F2] px-4 py-3">
                      <p className="text-[13px] font-extrabold text-[#BE123C]">
                        Catatan Revisi Kepala Sekolah
                      </p>
                      <p className="mt-2 text-[14px] text-[#7F1D1D]">
                        {rpp.rejection_note || "-"}
                      </p>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedRpp(rpp)}
                      className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#DCC8B6] px-3 text-[13px] font-extrabold text-[#8C0F2D] transition hover:bg-[#FFF8EF]"
                    >
                      <Eye className="h-4 w-4" />
                      Detail
                    </button>

                    {rpp.document_url ? (
                      <a
                        href={rpp.document_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#BAE6FD] px-3 text-[13px] font-extrabold text-[#0369A1] transition hover:bg-[#F0F9FF]"
                      >
                        <FileText className="h-4 w-4" />
                        Dokumen
                      </a>
                    ) : null}

                    {canEditRpp(rpp.status) ? (
                      <button
                        type="button"
                        onClick={() => openEditModal(rpp)}
                        className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#DCC8B6] px-3 text-[13px] font-extrabold text-[#8C0F2D] transition hover:bg-[#FFF8EF]"
                      >
                        <Edit3 className="h-4 w-4" />
                        Edit
                      </button>
                    ) : null}

                    {canDeleteRpp(rpp.status) ? (
                      <button
                        type="button"
                        onClick={() => handleDelete(rpp)}
                        className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#FECACA] px-3 text-[13px] font-extrabold text-[#DC2626] transition hover:bg-[#FFF1F2]"
                      >
                        <Trash2 className="h-4 w-4" />
                        Hapus
                      </button>
                    ) : null}
                  </div>

                  {!canEditRpp(rpp.status) ? (
                    <p className="pt-1 text-[12px] font-semibold text-[#8A5A48]">
                      RPP yang sudah submitted/approved tidak bisa diedit. Jika
                      perlu revisi, tunggu status rejected dari Kepala Sekolah.
                    </p>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {showModal ? (
        <RppModal
          form={form}
          programs={programs}
          selectedProgram={selectedProgram}
          selectedChapter={selectedChapter}
          selectedFile={selectedFile}
          saving={saving}
          onChange={updateForm}
          onFileChange={setSelectedFile}
          onClose={() => setShowModal(false)}
          onSaveDraft={() => handleSave("draft")}
          onSubmit={() => handleSave("submitted")}
        />
      ) : null}

      {selectedRpp ? (
        <RppDetailModal rpp={selectedRpp} onClose={() => setSelectedRpp(null)} />
      ) : null}
    </TeacherLayout>
  );
}

function RppModal({
  form,
  programs,
  selectedProgram,
  selectedChapter,
  selectedFile,
  saving,
  onChange,
  onFileChange,
  onClose,
  onSaveDraft,
  onSubmit,
}: {
  form: RppForm;
  programs: ProgramWithChildren[];
  selectedProgram: ProgramWithChildren | null;
  selectedChapter:
    | (CurriculumChapter & { sub_chapters: CurriculumSubChapter[] })
    | null;
  selectedFile: File | null;
  saving: boolean;
  onChange: (field: keyof RppForm, value: string) => void;
  onFileChange: (file: File | null) => void;
  onClose: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
}) {
  return (
    <ModalShell
      title={form.id ? "Edit RPP" : "Tambah RPP"}
      subtitle="Pilih Program Semester, Bab, Sub Bab, lalu isi format RPP terbaru."
      onClose={onClose}
    >
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          <FormGroup label="Program Semester">
            <select
              value={form.curriculum_program_id}
              onChange={(event) => {
                onChange("curriculum_program_id", event.target.value);
                onChange("curriculum_chapter_id", "");
                onChange("curriculum_sub_chapter_id", "");
              }}
              className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              <option value="">Pilih Program</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.subject_name} — {program.level} {program.grade} —
                  Semester {program.semester || "-"}
                </option>
              ))}
            </select>
          </FormGroup>

          <FormGroup label="Bab">
            <select
              value={form.curriculum_chapter_id}
              onChange={(event) => {
                onChange("curriculum_chapter_id", event.target.value);
                onChange("curriculum_sub_chapter_id", "");
              }}
              disabled={!selectedProgram}
              className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824] disabled:opacity-60"
            >
              <option value="">Pilih Bab</option>
              {selectedProgram?.chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  Bab {chapter.chapter_order}. {chapter.chapter_title}
                </option>
              ))}
            </select>
          </FormGroup>

          <FormGroup label="Sub Bab">
            <select
              value={form.curriculum_sub_chapter_id}
              onChange={(event) =>
                onChange("curriculum_sub_chapter_id", event.target.value)
              }
              disabled={!selectedChapter}
              className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824] disabled:opacity-60"
            >
              <option value="">Pilih Sub Bab</option>
              {selectedChapter?.sub_chapters.map((subChapter) => (
                <option key={subChapter.id} value={subChapter.id}>
                  {subChapter.sub_chapter_order}.{" "}
                  {subChapter.sub_chapter_title}
                </option>
              ))}
            </select>
          </FormGroup>
        </div>

        {programs.length === 0 ? (
          <div className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-5 py-4 text-[13px] leading-6 text-[#92400E]">
            Belum ada Program Semester yang cocok dengan guru/mapel aktif.
            Pastikan Program Semester dibuat menggunakan guru dan mapel yang
            sesuai.
          </div>
        ) : null}

        <FormGroup label="Judul RPP">
          <input
            value={form.rpp_title}
            onChange={(event) => onChange("rpp_title", event.target.value)}
            placeholder="Contoh: RPP IPA - Besaran dan Pengukuran"
            className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
          />
        </FormGroup>

        <TextArea
          label="Indikator"
          value={form.indicator}
          onChange={(value) => onChange("indicator", value)}
          placeholder="Tuliskan indikator pembelajaran..."
        />

        <TextArea
          label="Materi Pelajaran"
          value={form.subject_material}
          onChange={(value) => onChange("subject_material", value)}
          placeholder="Tuliskan materi pelajaran..."
        />

        <TextArea
          label="Tujuan Pembelajaran"
          value={form.learning_objectives}
          onChange={(value) => onChange("learning_objectives", value)}
          placeholder="Tuliskan tujuan pembelajaran..."
        />

        <TextArea
          label="Assessment / Penilaian"
          value={form.assessment}
          onChange={(value) => onChange("assessment", value)}
          placeholder="Tuliskan assessment / penilaian..."
        />

        <div className="grid gap-4 md:grid-cols-2">
          <TextArea
            label="Media Pembelajaran"
            value={form.learning_media}
            onChange={(value) => onChange("learning_media", value)}
            placeholder="Tuliskan media pembelajaran..."
          />
          <TextArea
            label="Sumber Belajar"
            value={form.learning_resources}
            onChange={(value) => onChange("learning_resources", value)}
            placeholder="Tuliskan sumber belajar..."
          />
        </div>

        <div className="rounded-2xl border border-dashed border-[#DCC8B6] bg-white px-5 py-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="flex items-center gap-2 text-[14px] font-extrabold text-[#2B1B18]">
                <UploadCloud className="h-5 w-5 text-[#8C0F2D]" />
                Upload Dokumen RPP
              </p>

              <p className="mt-1 text-[13px] text-[#6F5549]">
                Format PDF, DOC, atau DOCX. Maksimal 10MB.
              </p>

              {form.document_url ? (
                <a
                  href={form.document_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-[13px] font-extrabold text-[#0369A1] underline"
                >
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

        <FormGroup label="Link Dokumen Manual">
          <input
            value={form.document_url}
            onChange={(event) => onChange("document_url", event.target.value)}
            placeholder="Opsional: link Google Drive / PDF jika tidak upload file"
            className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
          />
        </FormGroup>

        <TextArea
          label="Catatan"
          value={form.notes}
          onChange={(value) => onChange("notes", value)}
          rows={3}
          placeholder="Catatan tambahan jika ada..."
        />

        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={saving}
            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-[#DCC8B6] text-[15px] font-extrabold text-[#8C0F2D] transition hover:bg-white disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? "Menyimpan..." : "Simpan Draft"}
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={saving}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#8C0F2D] text-[15px] font-extrabold text-white transition hover:bg-[#54131D] disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {saving ? "Mengirim..." : "Submit ke Kepala Sekolah"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function RppDetailModal({ rpp, onClose }: { rpp: RppRow; onClose: () => void }) {
  return (
    <ModalShell title="Detail RPP" subtitle={getRppTitle(rpp)} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={rpp.status} />

          <span className="rounded-full bg-[#F4E5DA] px-3 py-1 text-[12px] font-extrabold text-[#8A2332]">
            {rpp.subject_name}
          </span>

          <span className="rounded-full bg-[#F1F5F9] px-3 py-1 text-[12px] font-extrabold text-[#64748B]">
            {rpp.level} — {rpp.grade}
          </span>
        </div>

        <InfoBlock label="Indikator" value={rpp.indicator || "-"} />

        <InfoBlock
          label="Materi Pelajaran"
          value={rpp.subject_material || "-"}
        />

        <InfoBlock
          label="Tujuan Pembelajaran"
          value={rpp.learning_objectives || "-"}
        />

        <InfoBlock label="Assessment" value={rpp.assessment || "-"} />
        <InfoBlock label="Media Pembelajaran" value={rpp.learning_media || "-"} />
        <InfoBlock label="Sumber Belajar" value={rpp.learning_resources || "-"} />
        <InfoBlock label="Catatan" value={rpp.notes || "-"} />

        {rpp.document_url ? (
          <a
            href={rpp.document_url}
            target="_blank"
            rel="noreferrer"
            className="block rounded-xl bg-[#8C0F2D] px-4 py-3 text-center text-[14px] font-extrabold text-white"
          >
            Buka Dokumen RPP
          </a>
        ) : null}

        {rpp.approved_at ? (
          <InfoBlock label="Approved At" value={formatDateTime(rpp.approved_at)} />
        ) : null}

        {rpp.rejection_note ? (
          <InfoBlock label="Catatan Revisi" value={rpp.rejection_note} />
        ) : null}
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

function TextArea({
  label,
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <FormGroup label={label}>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full resize-none rounded-xl border border-[#DCC8B6] bg-white px-4 py-3 text-[14px] outline-none placeholder:text-[#9A7B6C] focus:border-[#9C0824]"
      />
    </FormGroup>
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

function EmptyState({ text }: { text: string }) {
  return (
    <div className="col-span-full rounded-[22px] border border-[#E1CFBE] bg-white px-6 py-12 text-center text-[#6F5549] shadow-sm">
      {text}
    </div>
  );
}