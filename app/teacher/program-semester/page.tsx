"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CalendarRange,
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

const PROGRAM_BUCKET = "program-semester-documents";
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
  status: "draft" | "submitted" | "approved" | "rejected" | string | null;
  document_url?: string | null;
  submitted_at?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  rejection_note?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
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

type SubChapterForm = {
  id?: string;
  sub_chapter_title: string;
  target_month: string;
  planned_week: string;
};

type ChapterForm = {
  id?: string;
  chapter_title: string;
  sub_chapters: SubChapterForm[];
};

type ProgramForm = {
  id: string;
  program_type: string;
  level: string;
  grade: string;
  subject_name: string;
  semester: string;
  academic_year: string;
  document_url: string;
  status: string;
  chapters: ChapterForm[];
};

const monthOptions = [
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
];

const weekOptions = [
  { label: "W1", value: "1" },
  { label: "W2", value: "2" },
  { label: "W3", value: "3" },
  { label: "W4", value: "4" },
  { label: "W5", value: "5" },
];

function emptyProgramForm(): ProgramForm {
  return {
    id: "",
    program_type: "Program Semester",
    level: "",
    grade: "",
    subject_name: "",
    semester: "Ganjil",
    academic_year: ACADEMIC_YEAR,
    document_url: "",
    status: "draft",
    chapters: [
      {
        chapter_title: "",
        sub_chapters: [
          {
            sub_chapter_title: "",
            target_month: "Juli",
            planned_week: "1",
          },
        ],
      },
    ],
  };
}

function normalizeText(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function formatTeacherSubject(subjects: TeacherRow["subjects"]) {
  if (!subjects) return "Guru";
  if (Array.isArray(subjects)) return `Guru — ${subjects.slice(0, 4).join(", ")}`;
  return `Guru — ${subjects}`;
}

function normalizeSubjects(subjects: TeacherRow["subjects"]) {
  if (!subjects) return [];

  if (Array.isArray(subjects)) {
    return subjects;
  }

  return subjects
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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

function cleanFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");
}

function isAllowedDocument(file: File) {
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

function isPdfUrl(url?: string | null) {
  if (!url) return false;
  return url.toLowerCase().split("?")[0].endsWith(".pdf");
}

function isTargetPlanCell(
  subChapter: CurriculumSubChapter,
  month: string,
  weekValue: string
) {
  return (
    normalizeText(subChapter.target_month) === normalizeText(month) &&
    String(subChapter.planned_week || "") === weekValue
  );
}

export default function TeacherProgramSemesterPage() {
  const [teacher, setTeacher] = useState<TeacherRow | null>(null);
  const [programs, setPrograms] = useState<ProgramWithChildren[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");

  const [showModal, setShowModal] = useState(false);
  const [selectedProgram, setSelectedProgram] =
    useState<ProgramWithChildren | null>(null);
  const [form, setForm] = useState<ProgramForm>(emptyProgramForm());
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
      setLoading(false);
      return;
    }

    const [programsRes, chaptersRes, subChaptersRes] = await Promise.all([
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
    ]);

    const programsData = (programsRes.data || []) as CurriculumProgram[];
    const chaptersData = (chaptersRes.data || []) as CurriculumChapter[];
    const subChaptersData = (subChaptersRes.data ||
      []) as CurriculumSubChapter[];

    const subChaptersByChapter = new Map<string, CurriculumSubChapter[]>();

    subChaptersData.forEach((subChapter) => {
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

    chaptersData.forEach((chapter) => {
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
    setLoading(false);
  }

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("teacher-program-semester-realtime")
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

  const teacherSubjects = useMemo(() => {
    return normalizeSubjects(teacher?.subjects);
  }, [teacher]);

  const filteredPrograms = useMemo(() => {
    const q = normalizeText(search);

    return programs.filter((program) => {
      const matchSearch =
        !q ||
        normalizeText(program.subject_name).includes(q) ||
        normalizeText(program.level).includes(q) ||
        normalizeText(program.grade).includes(q) ||
        normalizeText(program.semester).includes(q) ||
        normalizeText(program.academic_year).includes(q);

      const matchStatus =
        statusFilter === "Semua Status" || program.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [programs, search, statusFilter]);

  const summary = useMemo(() => {
    return {
      total: programs.length,
      draft: programs.filter((program) => program.status === "draft").length,
      submitted: programs.filter((program) => program.status === "submitted")
        .length,
      approved: programs.filter((program) => program.status === "approved")
        .length,
    };
  }, [programs]);

  function openCreateModal() {
    const nextForm = emptyProgramForm();

    if (teacherSubjects.length > 0) {
      nextForm.subject_name = teacherSubjects[0];
    }

    setForm(nextForm);
    setSelectedFile(null);
    setShowModal(true);
  }

  function openEditModal(program: ProgramWithChildren) {
    setForm({
      id: program.id,
      program_type: program.program_type || "Program Semester",
      level: program.level || "",
      grade: program.grade || "",
      subject_name: program.subject_name || "",
      semester: program.semester || "Ganjil",
      academic_year: program.academic_year || ACADEMIC_YEAR,
      document_url: program.document_url || "",
      status: program.status || "draft",
      chapters:
        program.chapters.length > 0
          ? program.chapters.map((chapter) => ({
            id: chapter.id,
            chapter_title: chapter.chapter_title || "",
            sub_chapters:
              chapter.sub_chapters.length > 0
                ? chapter.sub_chapters.map((subChapter) => ({
                  id: subChapter.id,
                  sub_chapter_title: subChapter.sub_chapter_title || "",
                  target_month: subChapter.target_month || "Juli",
                  planned_week: String(subChapter.planned_week || 1),
                }))
                : [
                  {
                    sub_chapter_title: "",
                    target_month: "Juli",
                    planned_week: "1",
                  },
                ],
          }))
          : [
            {
              chapter_title: "",
              sub_chapters: [
                {
                  sub_chapter_title: "",
                  target_month: "Juli",
                  planned_week: "1",
                },
              ],
            },
          ],
    });

    setSelectedFile(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setSelectedFile(null);
    setForm(emptyProgramForm());
  }

  function validateForm() {
    if (!teacher?.id) {
      alert("Data guru tidak ditemukan.");
      return false;
    }

    if (!form.subject_name.trim()) {
      alert("Mata pelajaran wajib diisi.");
      return false;
    }

    if (!form.level.trim()) {
      alert("Level wajib diisi.");
      return false;
    }

    if (!form.grade.trim()) {
      alert("Kelas wajib diisi.");
      return false;
    }

    if (!form.semester.trim()) {
      alert("Semester wajib diisi.");
      return false;
    }

    const validChapters = form.chapters.filter((chapter) =>
      chapter.chapter_title.trim()
    );

    if (validChapters.length === 0) {
      alert("Minimal isi 1 Bab.");
      return false;
    }

    for (const chapter of validChapters) {
      const validSubChapters = chapter.sub_chapters.filter((subChapter) =>
        subChapter.sub_chapter_title.trim()
      );

      if (validSubChapters.length === 0) {
        alert("Setiap Bab minimal punya 1 Sub Bab.");
        return false;
      }
    }

    if (selectedFile && !isAllowedDocument(selectedFile)) {
      alert("File harus berformat PDF, DOC, atau DOCX.");
      return false;
    }

    if (selectedFile && selectedFile.size > 10 * 1024 * 1024) {
      alert("Ukuran file maksimal 10MB.");
      return false;
    }

    return true;
  }

  async function uploadProgramFile() {
    if (!selectedFile || !teacher?.id) return form.document_url.trim() || null;

    const fileExtension = selectedFile.name.split(".").pop() || "pdf";
    const safeSubject = cleanFileName(form.subject_name || "program-semester");
    const fileName = `${Date.now()}-${safeSubject}.${fileExtension}`;
    const filePath = `${teacher.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(PROGRAM_BUCKET)
      .upload(filePath, selectedFile, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage
      .from(PROGRAM_BUCKET)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function handleSave(statusOverride?: "draft" | "submitted") {
    if (!validateForm()) return;

    if (!teacher?.id) return;

    setSaving(true);

    try {
      const now = new Date().toISOString();
      const nextStatus = statusOverride || form.status || "draft";
      const uploadedDocumentUrl = await uploadProgramFile();

      const programPayload = {
        teacher_id: teacher.id,
        program_type: form.program_type.trim() || "Program Semester",
        level: form.level.trim(),
        grade: form.grade.trim(),
        subject_name: form.subject_name.trim(),
        semester: form.semester.trim(),
        academic_year: form.academic_year.trim() || ACADEMIC_YEAR,
        status: nextStatus,
        document_url: uploadedDocumentUrl,
        submitted_at: nextStatus === "submitted" ? now : null,
        rejected_at: null,
        rejection_note: null,
        updated_at: now,
      };

      let programId = form.id;

      if (form.id) {
        const { error } = await supabase
          .from("curriculum_programs")
          .update(programPayload)
          .eq("id", form.id);

        if (error) throw new Error(error.message);
      } else {
        const { data, error } = await supabase
          .from("curriculum_programs")
          .insert(programPayload)
          .select("id")
          .single();

        if (error) throw new Error(error.message);

        programId = data.id;
      }

      const existingChapterIds = form.chapters
        .map((chapter) => chapter.id)
        .filter(Boolean) as string[];

      if (form.id) {
        const currentProgram = programs.find((program) => program.id === form.id);
        const oldChapterIds =
          currentProgram?.chapters.map((chapter) => chapter.id) || [];
        const deletedChapterIds = oldChapterIds.filter(
          (chapterId) => !existingChapterIds.includes(chapterId)
        );

        if (deletedChapterIds.length > 0) {
          const { error } = await supabase
            .from("curriculum_chapters")
            .delete()
            .in("id", deletedChapterIds);

          if (error) throw new Error(error.message);
        }
      }

      for (
        let chapterIndex = 0;
        chapterIndex < form.chapters.length;
        chapterIndex++
      ) {
        const chapter = form.chapters[chapterIndex];

        if (!chapter.chapter_title.trim()) continue;

        let chapterId = chapter.id || "";

        const chapterPayload = {
          curriculum_program_id: programId,
          chapter_title: chapter.chapter_title.trim(),
          chapter_order: chapterIndex + 1,
        };

        if (chapter.id) {
          const { error } = await supabase
            .from("curriculum_chapters")
            .update(chapterPayload)
            .eq("id", chapter.id);

          if (error) throw new Error(error.message);
        } else {
          const { data, error } = await supabase
            .from("curriculum_chapters")
            .insert(chapterPayload)
            .select("id")
            .single();

          if (error) throw new Error(error.message);

          chapterId = data.id;
        }

        const existingSubChapterIds = chapter.sub_chapters
          .map((subChapter) => subChapter.id)
          .filter(Boolean) as string[];

        if (chapter.id) {
          const currentProgram = programs.find((program) => program.id === form.id);
          const currentChapter = currentProgram?.chapters.find(
            (item) => item.id === chapter.id
          );

          const oldSubChapterIds =
            currentChapter?.sub_chapters.map((subChapter) => subChapter.id) ||
            [];

          const deletedSubChapterIds = oldSubChapterIds.filter(
            (subChapterId) => !existingSubChapterIds.includes(subChapterId)
          );

          if (deletedSubChapterIds.length > 0) {
            const { error } = await supabase
              .from("curriculum_sub_chapters")
              .delete()
              .in("id", deletedSubChapterIds);

            if (error) throw new Error(error.message);
          }
        }

        for (
          let subIndex = 0;
          subIndex < chapter.sub_chapters.length;
          subIndex++
        ) {
          const subChapter = chapter.sub_chapters[subIndex];

          if (!subChapter.sub_chapter_title.trim()) continue;

          const subPayload = {
            curriculum_chapter_id: chapterId,
            sub_chapter_title: subChapter.sub_chapter_title.trim(),
            sub_chapter_order: subIndex + 1,
            target_month: subChapter.target_month,
            planned_week: Number(subChapter.planned_week || 1),
          };

          if (subChapter.id) {
            const { error } = await supabase
              .from("curriculum_sub_chapters")
              .update(subPayload)
              .eq("id", subChapter.id);

            if (error) throw new Error(error.message);
          } else {
            const { error } = await supabase
              .from("curriculum_sub_chapters")
              .insert(subPayload);

            if (error) throw new Error(error.message);
          }
        }
      }

      await fetchData();

      setSaving(false);
      closeModal();

      alert(
        nextStatus === "submitted"
          ? "Program Semester berhasil disubmit."
          : "Program Semester berhasil disimpan."
      );
    } catch (error) {
      setSaving(false);
      alert(
        `Gagal simpan Program Semester: ${error instanceof Error ? error.message : "Terjadi kesalahan"
        }`
      );
    }
  }

  async function handleDelete(program: ProgramWithChildren) {
    const confirmDelete = confirm(
      `Hapus Program Semester ${program.subject_name || ""} ${program.level || ""
      } ${program.grade || ""}?`
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("curriculum_programs")
      .delete()
      .eq("id", program.id);

    if (error) {
      alert(`Gagal hapus Program Semester: ${error.message}`);
      return;
    }

    await fetchData();
  }

  function updateForm(field: keyof ProgramForm, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function addChapter() {
    setForm((prev) => ({
      ...prev,
      chapters: [
        ...prev.chapters,
        {
          chapter_title: "",
          sub_chapters: [
            {
              sub_chapter_title: "",
              target_month: "Juli",
              planned_week: "1",
            },
          ],
        },
      ],
    }));
  }

  function removeChapter(chapterIndex: number) {
    setForm((prev) => ({
      ...prev,
      chapters: prev.chapters.filter((_, index) => index !== chapterIndex),
    }));
  }

  function updateChapter(chapterIndex: number, value: string) {
    setForm((prev) => ({
      ...prev,
      chapters: prev.chapters.map((chapter, index) =>
        index === chapterIndex ? { ...chapter, chapter_title: value } : chapter
      ),
    }));
  }

  function addSubChapter(chapterIndex: number) {
    setForm((prev) => ({
      ...prev,
      chapters: prev.chapters.map((chapter, index) =>
        index === chapterIndex
          ? {
            ...chapter,
            sub_chapters: [
              ...chapter.sub_chapters,
              {
                sub_chapter_title: "",
                target_month: "Juli",
                planned_week: "1",
              },
            ],
          }
          : chapter
      ),
    }));
  }

  function removeSubChapter(chapterIndex: number, subIndex: number) {
    setForm((prev) => ({
      ...prev,
      chapters: prev.chapters.map((chapter, index) =>
        index === chapterIndex
          ? {
            ...chapter,
            sub_chapters: chapter.sub_chapters.filter(
              (_, itemIndex) => itemIndex !== subIndex
            ),
          }
          : chapter
      ),
    }));
  }

  function updateSubChapter(
    chapterIndex: number,
    subIndex: number,
    field: keyof SubChapterForm,
    value: string
  ) {
    setForm((prev) => ({
      ...prev,
      chapters: prev.chapters.map((chapter, index) =>
        index === chapterIndex
          ? {
            ...chapter,
            sub_chapters: chapter.sub_chapters.map((subChapter, itemIndex) =>
              itemIndex === subIndex
                ? {
                  ...subChapter,
                  [field]: value,
                }
                : subChapter
            ),
          }
          : chapter
      ),
    }));
  }

  return (
    <TeacherLayout
      activeMenu="Program Semester"
      teacherName={teacher?.full_name || "Guru"}
      teacherSubject={formatTeacherSubject(teacher?.subjects)}
      searchPlaceholder="Cari Program Semester..."
    >
      <section className="space-y-7">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#8A5A48]">
              Teacher Portal
            </p>

            <h1 className="mt-2 text-[30px] font-extrabold tracking-[-0.02em] text-[#2B1B18]">
              Program Semester
            </h1>

            <p className="mt-2 max-w-[850px] text-[15px] leading-6 text-[#6F5549]">
              Kelola Program Semester, Bab, Sub Bab, target bulan, W1 sampai W5,
              dan upload dokumen pendukung.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex h-11 w-fit items-center gap-2 rounded-xl bg-[#8C0F2D] px-5 text-[14px] font-extrabold text-white shadow-sm transition hover:bg-[#54131D]"
          >
            <Plus className="h-4 w-4" />
            Tambah Program
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={<CalendarRange className="h-5 w-5" />}
            label="Total Program"
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
                placeholder="Cari mapel, level, kelas, semester, atau tahun ajaran..."
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
            <EmptyState text="Memuat Program Semester..." />
          ) : filteredPrograms.length === 0 ? (
            <EmptyState text="Belum ada Program Semester." />
          ) : (
            filteredPrograms.map((program) => (
              <ProgramCard
                key={program.id}
                program={program}
                onDetail={() => setSelectedProgram(program)}
                onEdit={() => openEditModal(program)}
                onDelete={() => handleDelete(program)}
              />
            ))
          )}
        </div>
      </section>

      {showModal ? (
        <ProgramModal
          form={form}
          teacherSubjects={teacherSubjects}
          selectedFile={selectedFile}
          saving={saving}
          onChange={updateForm}
          onFileChange={setSelectedFile}
          onClose={closeModal}
          onSaveDraft={() => handleSave("draft")}
          onSubmit={() => handleSave("submitted")}
          addChapter={addChapter}
          removeChapter={removeChapter}
          updateChapter={updateChapter}
          addSubChapter={addSubChapter}
          removeSubChapter={removeSubChapter}
          updateSubChapter={updateSubChapter}
        />
      ) : null}

      {selectedProgram ? (
        <ProgramDetailModal
          program={selectedProgram}
          onClose={() => setSelectedProgram(null)}
        />
      ) : null}
    </TeacherLayout>
  );
}

function ProgramCard({
  program,
  onDetail,
  onEdit,
  onDelete,
}: {
  program: ProgramWithChildren;
  onDetail: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-[#E1CFBE] bg-white shadow-sm">
      <div className="border-b border-[#EADACA] bg-[#FFF8EF] px-6 py-5">
        <div className="mb-3 flex flex-wrap gap-2">
          <StatusBadge status={program.status} />

          <span className="rounded-full bg-[#F4E5DA] px-3 py-1 text-[12px] font-extrabold text-[#8A2332]">
            {program.level} — {program.grade}
          </span>

          <span className="rounded-full bg-[#F1F5F9] px-3 py-1 text-[12px] font-extrabold text-[#64748B]">
            Semester {program.semester}
          </span>

          {program.document_url ? (
            <span className="rounded-full bg-[#E0F2FE] px-3 py-1 text-[12px] font-extrabold text-[#0369A1]">
              Ada Dokumen
            </span>
          ) : null}
        </div>

        <h2 className="text-[20px] font-extrabold text-[#2B1B18]">
          {program.subject_name || "-"}
        </h2>

        <p className="mt-2 text-[14px] text-[#6F5549]">
          {program.program_type || "Program Semester"} •{" "}
          {program.academic_year || ACADEMIC_YEAR}
        </p>
      </div>

      <div className="space-y-4 px-6 py-5">
        <div className="grid grid-cols-3 gap-3">
          <MiniStat label="Bab" value={program.chapters.length} />
          <MiniStat
            label="Sub Bab"
            value={program.chapters.reduce(
              (total, chapter) => total + chapter.sub_chapters.length,
              0
            )}
          />
          <MiniStat label="Update" value={formatDateTime(program.updated_at)} />
        </div>

        {program.rejection_note ? (
          <div className="rounded-2xl border border-[#FECACA] bg-[#FFF1F2] px-4 py-3">
            <p className="text-[13px] font-extrabold text-[#BE123C]">
              Catatan Revisi Kepala Sekolah
            </p>
            <p className="mt-2 text-[14px] text-[#7F1D1D]">
              {program.rejection_note}
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={onDetail}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#DCC8B6] px-3 text-[13px] font-extrabold text-[#8C0F2D] transition hover:bg-[#FFF8EF]"
          >
            <Eye className="h-4 w-4" />
            Detail
          </button>

          {program.document_url ? (
            <a
              href={program.document_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#BAE6FD] px-3 text-[13px] font-extrabold text-[#0369A1] transition hover:bg-[#F0F9FF]"
            >
              <FileText className="h-4 w-4" />
              {isPdfUrl(program.document_url) ? "Preview PDF" : "Dokumen"}
            </a>
          ) : null}

          {program.status !== "approved" ? (
            <>
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#DCC8B6] px-3 text-[13px] font-extrabold text-[#8C0F2D] transition hover:bg-[#FFF8EF]"
              >
                <Edit3 className="h-4 w-4" />
                Edit
              </button>

              <button
                type="button"
                onClick={onDelete}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#FECACA] px-3 text-[13px] font-extrabold text-[#DC2626] transition hover:bg-[#FFF1F2]"
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
}

function ProgramModal({
  form,
  teacherSubjects,
  selectedFile,
  saving,
  onChange,
  onFileChange,
  onClose,
  onSaveDraft,
  onSubmit,
  addChapter,
  removeChapter,
  updateChapter,
  addSubChapter,
  removeSubChapter,
  updateSubChapter,
}: {
  form: ProgramForm;
  teacherSubjects: string[];
  selectedFile: File | null;
  saving: boolean;
  onChange: (field: keyof ProgramForm, value: string) => void;
  onFileChange: (file: File | null) => void;
  onClose: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
  addChapter: () => void;
  removeChapter: (chapterIndex: number) => void;
  updateChapter: (chapterIndex: number, value: string) => void;
  addSubChapter: (chapterIndex: number) => void;
  removeSubChapter: (chapterIndex: number, subIndex: number) => void;
  updateSubChapter: (
    chapterIndex: number,
    subIndex: number,
    field: keyof SubChapterForm,
    value: string
  ) => void;
}) {
  return (
    <ModalShell
      title={form.id ? "Edit Program Semester" : "Tambah Program Semester"}
      subtitle="Isi Program Semester, Bab, Sub Bab, Bulan, W1 sampai W5, dan upload dokumen jika ada."
      onClose={onClose}
    >
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          <FormGroup label="Mata Pelajaran">
            {teacherSubjects.length > 0 ? (
              <select
                value={form.subject_name}
                onChange={(event) => onChange("subject_name", event.target.value)}
                className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
              >
                <option value="">Pilih Mapel</option>
                {teacherSubjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={form.subject_name}
                onChange={(event) => onChange("subject_name", event.target.value)}
                placeholder="Contoh: Matematika"
                className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
              />
            )}
          </FormGroup>

          <FormGroup label="Level">
            <input
              value={form.level}
              onChange={(event) => onChange("level", event.target.value)}
              placeholder="Contoh: SD / SMP / SMA"
              className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
            />
          </FormGroup>

          <FormGroup label="Kelas">
            <input
              value={form.grade}
              onChange={(event) => onChange("grade", event.target.value)}
              placeholder="Contoh: Kelas 4"
              className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
            />
          </FormGroup>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <FormGroup label="Semester">
            <select
              value={form.semester}
              onChange={(event) => onChange("semester", event.target.value)}
              className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              <option>Ganjil</option>
              <option>Genap</option>
            </select>
          </FormGroup>

          <FormGroup label="Academic Year">
            <input
              value={form.academic_year}
              onChange={(event) => onChange("academic_year", event.target.value)}
              className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
            />
          </FormGroup>

          <FormGroup label="Tipe Program">
            <input
              value={form.program_type}
              onChange={(event) => onChange("program_type", event.target.value)}
              className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
            />
          </FormGroup>
        </div>

        <div className="rounded-2xl border border-dashed border-[#DCC8B6] bg-white px-5 py-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="flex items-center gap-2 text-[14px] font-extrabold text-[#2B1B18]">
                <UploadCloud className="h-5 w-5 text-[#8C0F2D]" />
                Upload Dokumen Program Semester
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

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-[17px] font-extrabold text-[#2B1B18]">
                Bab dan Sub Bab
              </h3>
              <p className="text-[13px] text-[#6F5549]">
                Target week sudah tersedia sampai W5.
              </p>
            </div>

            <button
              type="button"
              onClick={addChapter}
              className="rounded-xl border border-[#DCC8B6] px-4 py-2 text-[13px] font-extrabold text-[#8C0F2D] transition hover:bg-white"
            >
              + Tambah Bab
            </button>
          </div>

          {form.chapters.map((chapter, chapterIndex) => (
            <div
              key={chapterIndex}
              className="rounded-2xl border border-[#E1CFBE] bg-white px-5 py-5"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <h4 className="text-[15px] font-extrabold text-[#2B1B18]">
                  Bab {chapterIndex + 1}
                </h4>

                {form.chapters.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeChapter(chapterIndex)}
                    className="text-[13px] font-bold text-[#DC2626]"
                  >
                    Hapus Bab
                  </button>
                ) : null}
              </div>

              <FormGroup label="Judul Bab">
                <input
                  value={chapter.chapter_title}
                  onChange={(event) =>
                    updateChapter(chapterIndex, event.target.value)
                  }
                  placeholder="Contoh: Bilangan Pecahan"
                  className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
                />
              </FormGroup>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[14px] font-extrabold text-[#2B1B18]">
                    Sub Bab
                  </p>

                  <button
                    type="button"
                    onClick={() => addSubChapter(chapterIndex)}
                    className="text-[13px] font-extrabold text-[#8C0F2D]"
                  >
                    + Tambah Sub Bab
                  </button>
                </div>

                {chapter.sub_chapters.map((subChapter, subIndex) => (
                  <div
                    key={subIndex}
                    className="grid gap-3 rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] p-3 md:grid-cols-[1fr_150px_120px_70px]"
                  >
                    <input
                      value={subChapter.sub_chapter_title}
                      onChange={(event) =>
                        updateSubChapter(
                          chapterIndex,
                          subIndex,
                          "sub_chapter_title",
                          event.target.value
                        )
                      }
                      placeholder={`Sub Bab ${subIndex + 1}`}
                      className="h-11 rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                    />

                    <select
                      value={subChapter.target_month}
                      onChange={(event) =>
                        updateSubChapter(
                          chapterIndex,
                          subIndex,
                          "target_month",
                          event.target.value
                        )
                      }
                      className="h-11 rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                    >
                      {monthOptions.map((month) => (
                        <option key={month}>{month}</option>
                      ))}
                    </select>

                    <select
                      value={subChapter.planned_week}
                      onChange={(event) =>
                        updateSubChapter(
                          chapterIndex,
                          subIndex,
                          "planned_week",
                          event.target.value
                        )
                      }
                      className="h-11 rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                    >
                      {weekOptions.map((week) => (
                        <option key={week.value} value={week.value}>
                          {week.label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => removeSubChapter(chapterIndex, subIndex)}
                      disabled={chapter.sub_chapters.length === 1}
                      className="h-11 rounded-xl border border-[#FECACA] text-[13px] font-bold text-[#DC2626] transition hover:bg-[#FFF1F2] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

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

function ProgramDetailModal({
  program,
  onClose,
}: {
  program: ProgramWithChildren;
  onClose: () => void;
}) {
  return (
    <ModalShell
      title="Detail Program Semester"
      subtitle={`${program.subject_name || "-"} • ${program.level || "-"} ${program.grade || ""
        }`}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={program.status} />

          <span className="rounded-full bg-[#F4E5DA] px-3 py-1 text-[12px] font-extrabold text-[#8A2332]">
            {program.level} — {program.grade}
          </span>

          <span className="rounded-full bg-[#F1F5F9] px-3 py-1 text-[12px] font-extrabold text-[#64748B]">
            Semester {program.semester}
          </span>

          <span className="rounded-full bg-[#E0F2FE] px-3 py-1 text-[12px] font-extrabold text-[#0369A1]">
            {program.academic_year}
          </span>
        </div>

        <InfoBlock label="Mata Pelajaran" value={program.subject_name || "-"} />
        <InfoBlock label="Program" value={program.program_type || "-"} />

        {program.document_url ? (
          <div className="rounded-2xl border border-[#E1CFBE] bg-white px-5 py-4">
            <p className="text-[13px] font-extrabold uppercase tracking-[0.08em] text-[#8A5A48]">
              Dokumen Program Semester
            </p>

            <div className="mt-4 overflow-hidden rounded-xl border border-[#E1CFBE] bg-[#F8F2EA]">
              {isPdfUrl(program.document_url) ? (
                <iframe
                  src={program.document_url}
                  title="Preview PDF Program Semester"
                  className="h-[520px] w-full"
                />
              ) : (
                <div className="px-5 py-8 text-center">
                  <FileText className="mx-auto h-10 w-10 text-[#8C0F2D]" />
                  <p className="mt-3 text-[14px] text-[#6F5549]">
                    Preview langsung hanya tersedia untuk PDF. Untuk DOC/DOCX,
                    buka dokumen melalui tombol di bawah.
                  </p>
                </div>
              )}
            </div>

            <a
              href={program.document_url}
              target="_blank"
              rel="noreferrer"
              className="mt-4 block rounded-xl bg-[#8C0F2D] px-4 py-3 text-center text-[14px] font-extrabold text-white transition hover:bg-[#54131D]"
            >
              {isPdfUrl(program.document_url) ? "Buka PDF" : "Buka Dokumen"}
            </a>
          </div>
        ) : null}

        {program.rejection_note ? (
          <InfoBlock label="Catatan Revisi" value={program.rejection_note} />
        ) : null}

        <ProgramPlanTable program={program} />

        <div className="space-y-4">
          {program.chapters.map((chapter) => (
            <div
              key={chapter.id}
              className="rounded-2xl border border-[#E1CFBE] bg-white px-5 py-4"
            >
              <p className="text-[15px] font-extrabold text-[#2B1B18]">
                Bab {chapter.chapter_order}. {chapter.chapter_title}
              </p>

              <div className="mt-4 space-y-2">
                {chapter.sub_chapters.map((subChapter) => (
                  <div
                    key={subChapter.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#FFF8EF] px-4 py-3 text-[14px]"
                  >
                    <span className="font-bold text-[#2B1B18]">
                      {subChapter.sub_chapter_order}.{" "}
                      {subChapter.sub_chapter_title}
                    </span>

                    <span className="rounded-full bg-[#F4E5DA] px-3 py-1 text-[12px] font-extrabold text-[#8A2332]">
                      {subChapter.target_month} • W{subChapter.planned_week}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </ModalShell>
  );
}

function ProgramPlanTable({ program }: { program: ProgramWithChildren }) {
  const totalColumns = monthOptions.length * weekOptions.length + 1;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E1CFBE] bg-white">
      <div className="flex flex-wrap items-center gap-4 border-b border-[#E1CFBE] bg-[#FFF8EF] px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm border border-[#EF4444] bg-[#FCA5A5]" />
          <span className="text-[12px] font-bold text-[#7F1D1D]">
            Target Rencana
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#C7F0DA] text-[10px] font-bold text-[#158A58]">
            ✓
          </span>
          <span className="text-[12px] font-bold text-[#158A58]">
            Sudah Terealisasi dari Absensi KBM
          </span>
        </div>
      </div>

      <div className="max-h-[58vh] overflow-auto">
        <table className="w-full min-w-[1800px] border-collapse text-left">
          <thead>
            <tr className="bg-[#FFF8EF]">
              <th className="w-[280px] border-b border-r border-[#E1CFBE] px-3 py-3 text-[12px] font-extrabold text-[#6F5549]">
                Bab / Sub Bab
              </th>

              {monthOptions.map((month) => (
                <th
                  key={month}
                  colSpan={5}
                  className="border-b border-r border-[#E1CFBE] px-3 py-3 text-center text-[12px] font-extrabold text-[#6F5549]"
                >
                  {month}
                </th>
              ))}
            </tr>

            <tr className="bg-[#FFF8EF]">
              <th className="border-b border-r border-[#E1CFBE] px-3 py-2 text-[11px] font-bold text-[#8A5A48]">
                Target per minggu
              </th>

              {monthOptions.map((month) =>
                weekOptions.map((week) => (
                  <th
                    key={`${month}-${week.value}`}
                    className="h-9 w-[36px] border-b border-r border-[#E1CFBE] text-center text-[11px] font-extrabold text-[#6F5549]"
                  >
                    {week.label}
                  </th>
                ))
              )}
            </tr>
          </thead>

          {program.chapters.map((chapter) => (
            <tbody key={chapter.id}>
              <tr>
                <td
                  colSpan={totalColumns}
                  className="border-b border-[#E1CFBE] bg-[#FFF8EF] px-3 py-3 text-[13px] font-extrabold text-[#2B1B18]"
                >
                  Bab {chapter.chapter_order}. {chapter.chapter_title}
                  <span className="ml-2 text-[11px] font-bold text-[#8A5A48]">
                    {chapter.sub_chapters.length} Sub Bab
                  </span>
                </td>
              </tr>

              {chapter.sub_chapters.map((subChapter) => (
                <tr key={subChapter.id} className="hover:bg-[#FFFCF8]">
                  <td className="min-w-[280px] border-b border-r border-[#E1CFBE] px-3 py-3 align-top">
                    <p className="text-[13px] font-bold text-[#2B1B18]">
                      {subChapter.sub_chapter_order}.{" "}
                      {subChapter.sub_chapter_title}
                    </p>

                    <p className="mt-1 text-[11px] text-[#8A5A48]">
                      Target: {subChapter.target_month || "-"} Minggu{" "}
                      {subChapter.planned_week || "-"}
                    </p>
                  </td>

                  {monthOptions.map((month) =>
                    weekOptions.map((week) => {
                      const isTarget = isTargetPlanCell(
                        subChapter,
                        month,
                        week.value
                      );

                      return (
                        <td
                          key={`${subChapter.id}-${month}-${week.value}`}
                          title={
                            isTarget
                              ? `Target Rencana: ${month} ${week.label}`
                              : undefined
                          }
                          className={`h-10 w-[36px] border-b border-r border-[#E1CFBE] text-center ${isTarget
                              ? "bg-[#FCA5A5]"
                              : "bg-white"
                            }`}
                        >
                          {!isTarget ? (
                            <span className="text-[11px] text-[#E8D6C1]">
                              -
                            </span>
                          ) : null}
                        </td>
                      );
                    })
                  )}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
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

function MiniStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl bg-[#FFF8EF] px-4 py-3">
      <p className="text-[12px] font-bold text-[#8A5A48]">{label}</p>
      <p className="mt-1 text-[14px] font-extrabold text-[#2B1B18]">{value}</p>
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/55 px-4 py-6">
      <div className="mx-auto w-full max-w-[1280px] rounded-[22px] bg-[#FFF8EF] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#E1CFBE] bg-[#FFF8EF] px-6 py-5">
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

        <div className="max-h-[calc(90vh-90px)] overflow-y-auto px-6 py-6">
          {children}
        </div>
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