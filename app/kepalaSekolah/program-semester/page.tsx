"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Edit3,
  FileText,
  Layers3,
  Plus,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import KepalaSekolahLayout from "../components/KepalaSekolahLayout";

type TeacherRow = {
  id: string;
  full_name: string | null;
  email?: string | null;
};

type SubjectRow = {
  id: string;
  name: string | null;
  level?: string | null;
  grade?: string | null;
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
  created_at?: string | null;
  updated_at?: string | null;
};

type CurriculumSubChapter = {
  id: string;
  curriculum_chapter_id: string | null;
  sub_chapter_title: string | null;
  sub_chapter_order: number | null;
  target_month: string | null;
  planned_week: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type CurriculumProgress = {
  id: string;
  curriculum_program_id: string | null;
  curriculum_chapter_id: string | null;
  curriculum_sub_chapter_id: string | null;
  teacher_id: string | null;
  teaching_date: string | null;
  created_at?: string | null;
};

type EnrichedSubChapter = CurriculumSubChapter & {
  progress_records: CurriculumProgress[];
};

type EnrichedChapter = CurriculumChapter & {
  sub_chapters: EnrichedSubChapter[];
};

type EnrichedProgram = CurriculumProgram & {
  teacher_name: string;
  chapters: EnrichedChapter[];
};

type ProgramForm = {
  id: string;
  teacher_id: string;
  program_type: string;
  level: string;
  grade: string;
  subject_name: string;
  semester: string;
  academic_year: string;
  status: string;
  document_url: string;
};

type ChapterForm = {
  id: string;
  curriculum_program_id: string;
  chapter_title: string;
  chapter_order: string;
};

type SubChapterForm = {
  id: string;
  curriculum_program_id: string;
  curriculum_chapter_id: string;
  sub_chapter_title: string;
  sub_chapter_order: string;
  target_month: string;
  planned_week: string;
};

const months = ["July", "August", "September", "October", "November", "December"];

const monthLabels: Record<string, string> = {
  July: "Juli",
  August: "Agustus",
  September: "September",
  October: "Oktober",
  November: "November",
  December: "Desember",
};

const weeks = ["W1", "W2", "W3", "W4", "W5"];

const levelOptions = ["SD", "SMP", "SMA"];
const semesterOptions = ["Ganjil", "Genap"];
const programTypeOptions = ["Regular", "Special Needs"];
const statusOptions = ["draft", "submitted", "approved", "rejected", "published"];

function emptyProgramForm(): ProgramForm {
  return {
    id: "",
    teacher_id: "",
    program_type: "Regular",
    level: "SMP",
    grade: "Kelas 7",
    subject_name: "",
    semester: "Ganjil",
    academic_year: "2026/2027",
    status: "draft",
    document_url: "",
  };
}

function emptyChapterForm(programId = ""): ChapterForm {
  return {
    id: "",
    curriculum_program_id: programId,
    chapter_title: "",
    chapter_order: "1",
  };
}

function emptySubChapterForm(programId = "", chapterId = ""): SubChapterForm {
  return {
    id: "",
    curriculum_program_id: programId,
    curriculum_chapter_id: chapterId,
    sub_chapter_title: "",
    sub_chapter_order: "1",
    target_month: "July",
    planned_week: "1",
  };
}

function normalizeText(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function toNumber(value: string) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return 1;
  return numeric;
}

function getMonthNameFromDate(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("en-US", { month: "long" });
}

function getWeekOfMonth(value?: string | null) {
  if (!value) return 1;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 1;

  return Math.ceil(date.getDate() / 7);
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
  if (status === "published") return "Published";
  return "Draft";
}

function getStatusClass(status?: string | null) {
  if (status === "approved" || status === "published") {
    return "bg-[#C7F0DA] text-[#158A58]";
  }

  if (status === "submitted") return "bg-[#FFF2B8] text-[#B26A00]";
  if (status === "rejected") return "bg-[#FFE4E6] text-[#BE123C]";

  return "bg-[#F1F5F9] text-[#64748B]";
}

function isPdfUrl(url?: string | null) {
  if (!url) return false;

  return url.toLowerCase().split("?")[0].endsWith(".pdf");
}

function getProgressPercent(program: EnrichedProgram) {
  const subChapters = program.chapters.flatMap((chapter) => chapter.sub_chapters);

  if (subChapters.length === 0) return 0;

  const completed = subChapters.filter(
    (subChapter) => subChapter.progress_records.length > 0
  ).length;

  return Math.round((completed / subChapters.length) * 100);
}

function getSubChapterCellStatus(
  subChapter: EnrichedSubChapter,
  month: string,
  week: string
) {
  const completedRecord = subChapter.progress_records.find((progress) => {
    const progressMonth = getMonthNameFromDate(progress.teaching_date);
    const progressWeek = `W${getWeekOfMonth(progress.teaching_date)}`;

    return progressMonth === month && progressWeek === week;
  });

  if (completedRecord) {
    return {
      type: "completed",
      record: completedRecord,
    };
  }

  const alreadyCompleted = subChapter.progress_records.length > 0;

  if (alreadyCompleted) {
    return {
      type: "empty",
      record: null,
    };
  }

  const targetWeek = `W${subChapter.planned_week || 1}`;

  if (subChapter.target_month === month && targetWeek === week) {
    return {
      type: "planned",
      record: null,
    };
  }

  return {
    type: "empty",
    record: null,
  };
}

export default function KepalaSekolahProgramSemesterPage() {
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [programs, setPrograms] = useState<EnrichedProgram[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("Semua Level");
  const [teacherFilter, setTeacherFilter] = useState("Semua Guru");
  const [semesterFilter, setSemesterFilter] = useState("Semua Semester");
  const [statusFilter, setStatusFilter] = useState("Semua Status");

  const [expandedProgramIds, setExpandedProgramIds] = useState<string[]>([]);
  const [expandedChapterIds, setExpandedChapterIds] = useState<string[]>([]);

  const [showProgramModal, setShowProgramModal] = useState(false);
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [showSubChapterModal, setShowSubChapterModal] = useState(false);

  const [programForm, setProgramForm] = useState<ProgramForm>(emptyProgramForm());
  const [chapterForm, setChapterForm] = useState<ChapterForm>(emptyChapterForm());
  const [subChapterForm, setSubChapterForm] =
    useState<SubChapterForm>(emptySubChapterForm());

  const [previewProgram, setPreviewProgram] = useState<EnrichedProgram | null>(null);
  const [rejectingProgram, setRejectingProgram] =
    useState<EnrichedProgram | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");

  async function fetchData() {
    setLoading(true);

    const [
      teachersRes,
      subjectsRes,
      programsRes,
      chaptersRes,
      subChaptersRes,
      progressRes,
    ] = await Promise.all([
      supabase.from("teachers").select("*").order("full_name"),
      supabase.from("subjects").select("*").order("name"),
      supabase
        .from("curriculum_programs")
        .select("*")
        .order("updated_at", { ascending: false }),
      supabase
        .from("curriculum_chapters")
        .select("*")
        .order("chapter_order", { ascending: true }),
      supabase
        .from("curriculum_sub_chapters")
        .select("*")
        .order("sub_chapter_order", { ascending: true }),
      supabase.from("curriculum_progress").select("*"),
    ]);

    const teachersData = (teachersRes.data || []) as TeacherRow[];
    const subjectsData = (subjectsRes.data || []) as SubjectRow[];
    const programsData = (programsRes.data || []) as CurriculumProgram[];
    const chaptersData = (chaptersRes.data || []) as CurriculumChapter[];
    const subChaptersData = (subChaptersRes.data || []) as CurriculumSubChapter[];
    const progressData = (progressRes.data || []) as CurriculumProgress[];

    const teacherMap = new Map(teachersData.map((teacher) => [teacher.id, teacher]));

    const progressBySubChapter = new Map<string, CurriculumProgress[]>();

    progressData.forEach((progress) => {
      if (!progress.curriculum_sub_chapter_id) return;

      const current = progressBySubChapter.get(progress.curriculum_sub_chapter_id) || [];
      current.push(progress);
      progressBySubChapter.set(progress.curriculum_sub_chapter_id, current);
    });

    const subChaptersByChapter = new Map<string, EnrichedSubChapter[]>();

    subChaptersData.forEach((subChapter) => {
      if (!subChapter.curriculum_chapter_id) return;

      const current = subChaptersByChapter.get(subChapter.curriculum_chapter_id) || [];

      current.push({
        ...subChapter,
        progress_records: progressBySubChapter.get(subChapter.id) || [],
      });

      subChaptersByChapter.set(subChapter.curriculum_chapter_id, current);
    });

    const chaptersByProgram = new Map<string, EnrichedChapter[]>();

    chaptersData.forEach((chapter) => {
      if (!chapter.curriculum_program_id) return;

      const current = chaptersByProgram.get(chapter.curriculum_program_id) || [];

      current.push({
        ...chapter,
        sub_chapters: subChaptersByChapter.get(chapter.id) || [],
      });

      chaptersByProgram.set(chapter.curriculum_program_id, current);
    });

    const enrichedPrograms: EnrichedProgram[] = programsData.map((program) => {
      const teacher = program.teacher_id ? teacherMap.get(program.teacher_id) : null;

      return {
        ...program,
        teacher_name: teacher?.full_name || "-",
        chapters: chaptersByProgram.get(program.id) || [],
      };
    });

    setTeachers(teachersData);
    setSubjects(subjectsData);
    setPrograms(enrichedPrograms);

    setLoading(false);
  }

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("kepala-program-semester-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "curriculum_programs" },
        fetchData
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "curriculum_chapters" },
        fetchData
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "curriculum_sub_chapters" },
        fetchData
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "curriculum_progress" },
        fetchData
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredPrograms = useMemo(() => {
    const q = normalizeText(search);

    return programs.filter((program) => {
      const matchSearch =
        !q ||
        normalizeText(program.subject_name).includes(q) ||
        normalizeText(program.teacher_name).includes(q) ||
        normalizeText(program.grade).includes(q) ||
        normalizeText(program.level).includes(q) ||
        program.chapters.some(
          (chapter) =>
            normalizeText(chapter.chapter_title).includes(q) ||
            chapter.sub_chapters.some((subChapter) =>
              normalizeText(subChapter.sub_chapter_title).includes(q)
            )
        );

      const matchLevel =
        levelFilter === "Semua Level" || program.level === levelFilter;

      const matchTeacher =
        teacherFilter === "Semua Guru" || program.teacher_id === teacherFilter;

      const matchSemester =
        semesterFilter === "Semua Semester" || program.semester === semesterFilter;

      const matchStatus =
        statusFilter === "Semua Status" || program.status === statusFilter;

      return matchSearch && matchLevel && matchTeacher && matchSemester && matchStatus;
    });
  }, [programs, search, levelFilter, teacherFilter, semesterFilter, statusFilter]);

  const summary = useMemo(() => {
    const totalPrograms = programs.length;
    const totalChapters = programs.reduce(
      (sum, program) => sum + program.chapters.length,
      0
    );
    const totalSubChapters = programs.reduce((sum, program) => {
      return (
        sum +
        program.chapters.reduce(
          (chapterSum, chapter) => chapterSum + chapter.sub_chapters.length,
          0
        )
      );
    }, 0);

    const completedSubChapters = programs.reduce((sum, program) => {
      return (
        sum +
        program.chapters.reduce((chapterSum, chapter) => {
          return (
            chapterSum +
            chapter.sub_chapters.filter(
              (subChapter) => subChapter.progress_records.length > 0
            ).length
          );
        }, 0)
      );
    }, 0);

    const submittedPrograms = programs.filter(
      (program) => program.status === "submitted"
    ).length;

    const approvedPrograms = programs.filter(
      (program) => program.status === "approved" || program.status === "published"
    ).length;

    return {
      totalPrograms,
      totalChapters,
      totalSubChapters,
      completedSubChapters,
      submittedPrograms,
      approvedPrograms,
    };
  }, [programs]);

  function toggleProgram(programId: string) {
    setExpandedProgramIds((prev) =>
      prev.includes(programId)
        ? prev.filter((id) => id !== programId)
        : [...prev, programId]
    );
  }

  function toggleChapter(chapterId: string) {
    setExpandedChapterIds((prev) =>
      prev.includes(chapterId)
        ? prev.filter((id) => id !== chapterId)
        : [...prev, chapterId]
    );
  }

  function updateProgramForm(field: keyof ProgramForm, value: string) {
    setProgramForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function updateChapterForm(field: keyof ChapterForm, value: string) {
    setChapterForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function updateSubChapterForm(field: keyof SubChapterForm, value: string) {
    setSubChapterForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function openCreateProgramModal() {
    setProgramForm(emptyProgramForm());
    setShowProgramModal(true);
  }

  function openEditProgramModal(program: EnrichedProgram) {
    setProgramForm({
      id: program.id,
      teacher_id: program.teacher_id || "",
      program_type: program.program_type || "Regular",
      level: program.level || "SMP",
      grade: program.grade || "Kelas 7",
      subject_name: program.subject_name || "",
      semester: program.semester || "Ganjil",
      academic_year: program.academic_year || "2026/2027",
      status: program.status || "draft",
      document_url: program.document_url || "",
    });

    setShowProgramModal(true);
  }

  function openCreateChapterModal(programId: string) {
    const program = programs.find((item) => item.id === programId);
    const nextOrder = (program?.chapters.length || 0) + 1;

    setChapterForm({
      ...emptyChapterForm(programId),
      chapter_order: String(nextOrder),
    });

    setShowChapterModal(true);
  }

  function openEditChapterModal(chapter: EnrichedChapter) {
    setChapterForm({
      id: chapter.id,
      curriculum_program_id: chapter.curriculum_program_id || "",
      chapter_title: chapter.chapter_title || "",
      chapter_order: String(chapter.chapter_order || 1),
    });

    setShowChapterModal(true);
  }

  function openCreateSubChapterModal(programId: string, chapterId: string) {
    const program = programs.find((item) => item.id === programId);
    const chapter = program?.chapters.find((item) => item.id === chapterId);
    const nextOrder = (chapter?.sub_chapters.length || 0) + 1;

    setSubChapterForm({
      ...emptySubChapterForm(programId, chapterId),
      sub_chapter_order: String(nextOrder),
    });

    setShowSubChapterModal(true);
  }

  function openEditSubChapterModal(
    programId: string,
    subChapter: EnrichedSubChapter
  ) {
    setSubChapterForm({
      id: subChapter.id,
      curriculum_program_id: programId,
      curriculum_chapter_id: subChapter.curriculum_chapter_id || "",
      sub_chapter_title: subChapter.sub_chapter_title || "",
      sub_chapter_order: String(subChapter.sub_chapter_order || 1),
      target_month: subChapter.target_month || "July",
      planned_week: String(subChapter.planned_week || 1),
    });

    setShowSubChapterModal(true);
  }

  async function handleSaveProgram() {
    if (!programForm.teacher_id) {
      alert("Pilih guru terlebih dahulu.");
      return;
    }

    if (!programForm.subject_name.trim()) {
      alert("Isi mata pelajaran terlebih dahulu.");
      return;
    }

    setSaving(true);

    const now = new Date().toISOString();

    const payload = {
      teacher_id: programForm.teacher_id,
      program_type: programForm.program_type,
      level: programForm.level,
      grade: programForm.grade,
      subject_name: programForm.subject_name.trim(),
      semester: programForm.semester,
      academic_year: programForm.academic_year.trim(),
      status: programForm.status,
      document_url: programForm.document_url.trim() || null,
      submitted_at: programForm.status === "submitted" ? now : null,
      approved_at:
        programForm.status === "approved" || programForm.status === "published"
          ? now
          : null,
      rejected_at: programForm.status === "rejected" ? now : null,
      updated_at: now,
    };

    if (programForm.id) {
      const { error } = await supabase
        .from("curriculum_programs")
        .update(payload)
        .eq("id", programForm.id);

      if (error) {
        setSaving(false);
        alert(`Gagal update program: ${error.message}`);
        return;
      }
    } else {
      const { error } = await supabase.from("curriculum_programs").insert(payload);

      if (error) {
        setSaving(false);
        alert(`Gagal tambah program: ${error.message}`);
        return;
      }
    }

    await fetchData();

    setSaving(false);
    setShowProgramModal(false);
    setProgramForm(emptyProgramForm());
  }

  async function handleApproveProgram(program: EnrichedProgram) {
    const confirmApprove = confirm(
      `Approve Program Semester "${program.subject_name}" dari ${program.teacher_name}?`
    );

    if (!confirmApprove) return;

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("curriculum_programs")
      .update({
        status: "approved",
        approved_at: now,
        rejected_at: null,
        rejection_note: null,
        updated_at: now,
      })
      .eq("id", program.id);

    if (error) {
      alert(`Gagal approve Program Semester: ${error.message}`);
      return;
    }

    await fetchData();
  }

  async function handleRejectProgram() {
    if (!rejectingProgram) return;

    if (!rejectionNote.trim()) {
      alert("Isi catatan revisi terlebih dahulu.");
      return;
    }

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("curriculum_programs")
      .update({
        status: "rejected",
        rejected_at: now,
        rejection_note: rejectionNote.trim(),
        updated_at: now,
      })
      .eq("id", rejectingProgram.id);

    if (error) {
      alert(`Gagal reject Program Semester: ${error.message}`);
      return;
    }

    await fetchData();

    setRejectingProgram(null);
    setRejectionNote("");
  }

  async function handleSaveChapter() {
    if (!chapterForm.curriculum_program_id) {
      alert("Program tidak ditemukan.");
      return;
    }

    if (!chapterForm.chapter_title.trim()) {
      alert("Isi judul Bab terlebih dahulu.");
      return;
    }

    setSaving(true);

    const payload = {
      curriculum_program_id: chapterForm.curriculum_program_id,
      chapter_title: chapterForm.chapter_title.trim(),
      chapter_order: toNumber(chapterForm.chapter_order),
      updated_at: new Date().toISOString(),
    };

    if (chapterForm.id) {
      const { error } = await supabase
        .from("curriculum_chapters")
        .update(payload)
        .eq("id", chapterForm.id);

      if (error) {
        setSaving(false);
        alert(`Gagal update Bab: ${error.message}`);
        return;
      }
    } else {
      const { error } = await supabase.from("curriculum_chapters").insert(payload);

      if (error) {
        setSaving(false);
        alert(`Gagal tambah Bab: ${error.message}`);
        return;
      }
    }

    await fetchData();

    setSaving(false);
    setShowChapterModal(false);
    setChapterForm(emptyChapterForm());
  }

  async function handleSaveSubChapter() {
    if (!subChapterForm.curriculum_program_id) {
      alert("Program tidak ditemukan.");
      return;
    }

    if (!subChapterForm.curriculum_chapter_id) {
      alert("Bab tidak ditemukan.");
      return;
    }

    if (!subChapterForm.sub_chapter_title.trim()) {
      alert("Isi judul Sub Bab terlebih dahulu.");
      return;
    }

    setSaving(true);

    const payload = {
      curriculum_chapter_id: subChapterForm.curriculum_chapter_id,
      sub_chapter_title: subChapterForm.sub_chapter_title.trim(),
      sub_chapter_order: toNumber(subChapterForm.sub_chapter_order),
      target_month: subChapterForm.target_month,
      planned_week: toNumber(subChapterForm.planned_week),
      updated_at: new Date().toISOString(),
    };

    if (subChapterForm.id) {
      const { error } = await supabase
        .from("curriculum_sub_chapters")
        .update(payload)
        .eq("id", subChapterForm.id);

      if (error) {
        setSaving(false);
        alert(`Gagal update Sub Bab: ${error.message}`);
        return;
      }
    } else {
      const { error } = await supabase
        .from("curriculum_sub_chapters")
        .insert(payload);

      if (error) {
        setSaving(false);
        alert(`Gagal tambah Sub Bab: ${error.message}`);
        return;
      }
    }

    await fetchData();

    setSaving(false);
    setShowSubChapterModal(false);
    setSubChapterForm(emptySubChapterForm());
  }

  async function handleDeleteProgram(program: EnrichedProgram) {
    const confirmDelete = confirm(
      `Hapus program "${program.subject_name}" beserta semua Bab dan Sub Bab?`
    );

    if (!confirmDelete) return;

    const subChapterIds = program.chapters.flatMap((chapter) =>
      chapter.sub_chapters.map((subChapter) => subChapter.id)
    );

    const chapterIds = program.chapters.map((chapter) => chapter.id);

    if (subChapterIds.length > 0) {
      await supabase
        .from("curriculum_progress")
        .delete()
        .in("curriculum_sub_chapter_id", subChapterIds);

      const { error } = await supabase
        .from("curriculum_sub_chapters")
        .delete()
        .in("id", subChapterIds);

      if (error) {
        alert(`Gagal hapus Sub Bab: ${error.message}`);
        return;
      }
    }

    if (chapterIds.length > 0) {
      const { error } = await supabase
        .from("curriculum_chapters")
        .delete()
        .in("id", chapterIds);

      if (error) {
        alert(`Gagal hapus Bab: ${error.message}`);
        return;
      }
    }

    const { error } = await supabase
      .from("curriculum_programs")
      .delete()
      .eq("id", program.id);

    if (error) {
      alert(`Gagal hapus program: ${error.message}`);
      return;
    }

    await fetchData();
  }

  async function handleDeleteChapter(chapter: EnrichedChapter) {
    const confirmDelete = confirm(
      `Hapus Bab "${chapter.chapter_title}" beserta semua Sub Bab?`
    );

    if (!confirmDelete) return;

    const subChapterIds = chapter.sub_chapters.map((subChapter) => subChapter.id);

    if (subChapterIds.length > 0) {
      await supabase
        .from("curriculum_progress")
        .delete()
        .in("curriculum_sub_chapter_id", subChapterIds);

      const { error } = await supabase
        .from("curriculum_sub_chapters")
        .delete()
        .in("id", subChapterIds);

      if (error) {
        alert(`Gagal hapus Sub Bab: ${error.message}`);
        return;
      }
    }

    const { error } = await supabase
      .from("curriculum_chapters")
      .delete()
      .eq("id", chapter.id);

    if (error) {
      alert(`Gagal hapus Bab: ${error.message}`);
      return;
    }

    await fetchData();
  }

  async function handleDeleteSubChapter(subChapter: EnrichedSubChapter) {
    const confirmDelete = confirm(`Hapus Sub Bab "${subChapter.sub_chapter_title}"?`);

    if (!confirmDelete) return;

    await supabase
      .from("curriculum_progress")
      .delete()
      .eq("curriculum_sub_chapter_id", subChapter.id);

    const { error } = await supabase
      .from("curriculum_sub_chapters")
      .delete()
      .eq("id", subChapter.id);

    if (error) {
      alert(`Gagal hapus Sub Bab: ${error.message}`);
      return;
    }

    await fetchData();
  }

  return (
    <KepalaSekolahLayout
      activeMenu="Program Semester"
      searchPlaceholder="Cari program semester..."
    >
      <section className="space-y-7">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#8A5A48]">
              Kurikulum
            </p>

            <h1 className="mt-2 text-[30px] font-extrabold tracking-[-0.02em] text-[#2B1B18]">
              Program Semester
            </h1>

            <p className="mt-2 max-w-[850px] text-[15px] leading-6 text-[#6F5549]">
              Kelola program semester, Bab, Sub Bab, target bulan, dan minggu.
              Checklist hijau otomatis muncul setelah guru menyimpan absensi KBM.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateProgramModal}
            className="flex h-11 w-fit items-center gap-2 rounded-xl bg-[#8C0F2D] px-5 text-[14px] font-extrabold text-white shadow-sm transition hover:bg-[#54131D]"
          >
            <Plus className="h-4 w-4" />
            Tambah Program
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={<CalendarDays className="h-5 w-5" />}
            label="Total Program"
            value={summary.totalPrograms}
            info={`${summary.submittedPrograms} review`}
            tone="pink"
          />

          <SummaryCard
            icon={<Layers3 className="h-5 w-5" />}
            label="Total Bab"
            value={summary.totalChapters}
            info="Bab"
            tone="orange"
          />

          <SummaryCard
            icon={<BookOpen className="h-5 w-5" />}
            label="Total Sub Bab"
            value={summary.totalSubChapters}
            info="Sub Bab"
            tone="blue"
          />

          <SummaryCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Terealisasi"
            value={summary.completedSubChapters}
            info={`${summary.approvedPrograms} approved`}
            tone="green"
          />
        </div>

        <div className="rounded-[22px] border border-[#E1CFBE] bg-white p-5 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr_1fr_1fr_1fr]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8E6A58]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari mapel, guru, Bab, atau Sub Bab..."
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
              value={semesterFilter}
              onChange={(event) => setSemesterFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              <option>Semua Semester</option>
              {semesterOptions.map((semester) => (
                <option key={semester}>{semester}</option>
              ))}
            </select>

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
              <option value="published">published</option>
            </select>
          </div>
        </div>

        <div className="space-y-5">
          {loading ? (
            <div className="rounded-[22px] border border-[#E1CFBE] bg-white px-6 py-12 text-center text-[#6F5549] shadow-sm">
              Memuat data Program Semester...
            </div>
          ) : filteredPrograms.length === 0 ? (
            <div className="rounded-[22px] border border-[#E1CFBE] bg-white px-6 py-12 text-center text-[#6F5549] shadow-sm">
              Belum ada data Program Semester.
            </div>
          ) : (
            filteredPrograms.map((program) => {
              const isExpanded = expandedProgramIds.includes(program.id);
              const progressPercent = getProgressPercent(program);

              return (
                <div
                  key={program.id}
                  className="overflow-hidden rounded-[22px] border border-[#E1CFBE] bg-white shadow-sm"
                >
                  <div className="border-b border-[#EADACA] bg-[#FFF8EF] px-6 py-5">
                    <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                      <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={() => toggleProgram(program.id)}
                          className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#DCC8B6] bg-white text-[#8C0F2D]"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>

                        <div>
                          <div className="mb-3 flex flex-wrap gap-2">
                            <StatusBadge status={program.status} />

                            <span className="rounded-full bg-[#F4E5DA] px-3 py-1 text-[12px] font-extrabold text-[#8A2332]">
                              {program.program_type || "Regular"}
                            </span>

                            <span className="rounded-full bg-[#F1F5F9] px-3 py-1 text-[12px] font-extrabold text-[#64748B]">
                              {program.level} — {program.grade}
                            </span>

                            <span className="rounded-full bg-[#FFF2B8] px-3 py-1 text-[12px] font-extrabold text-[#B26A00]">
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
                            {program.teacher_name} • Tahun Ajaran{" "}
                            {program.academic_year || "-"}
                          </p>

                          {program.rejection_note ? (
                            <p className="mt-2 max-w-[620px] rounded-xl bg-[#FFF1F2] px-3 py-2 text-[13px] font-bold text-[#BE123C]">
                              Catatan revisi: {program.rejection_note}
                            </p>
                          ) : null}

                          <div className="mt-4 max-w-[420px]">
                            <div className="mb-2 flex items-center justify-between text-[12px] font-bold text-[#6F5549]">
                              <span>Progress Realisasi</span>
                              <span>{progressPercent}%</span>
                            </div>

                            <div className="h-2 overflow-hidden rounded-full bg-[#EADACA]">
                              <div
                                className="h-full rounded-full bg-[#158A58]"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {program.document_url ? (
                          <button
                            type="button"
                            onClick={() => setPreviewProgram(program)}
                            className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#BAE6FD] bg-white px-3 text-[13px] font-extrabold text-[#0369A1] transition hover:bg-[#F0F9FF]"
                          >
                            <FileText className="h-4 w-4" />
                            {isPdfUrl(program.document_url)
                              ? "Preview PDF"
                              : "Dokumen"}
                          </button>
                        ) : null}

                        {program.status === "submitted" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingProgram(program);
                                setRejectionNote("");
                              }}
                              className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#FECACA] px-3 text-[13px] font-extrabold text-[#DC2626] transition hover:bg-[#FFF1F2]"
                            >
                              <X className="h-4 w-4" />
                              Revisi
                            </button>

                            <button
                              type="button"
                              onClick={() => handleApproveProgram(program)}
                              className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#158A58] px-3 text-[13px] font-extrabold text-white transition hover:bg-[#116C46]"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Approve
                            </button>
                          </>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => openCreateChapterModal(program.id)}
                          className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#8C0F2D] px-3 text-[13px] font-extrabold text-white transition hover:bg-[#54131D]"
                        >
                          <Plus className="h-4 w-4" />
                          Tambah Bab
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditProgramModal(program)}
                          className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#DCC8B6] px-3 text-[13px] font-extrabold text-[#8C0F2D] transition hover:bg-white"
                        >
                          <Edit3 className="h-4 w-4" />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteProgram(program)}
                          className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#FECACA] px-3 text-[13px] font-extrabold text-[#DC2626] transition hover:bg-[#FFF1F2]"
                        >
                          <Trash2 className="h-4 w-4" />
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="space-y-5 px-6 py-5">
                      <MatrixLegend />

                      <div className="overflow-x-auto rounded-2xl border border-[#EADACA]">
                        <table className="w-full min-w-[1380px] border-collapse bg-white">
                          <thead>
                            <tr className="border-b border-[#EADACA] bg-[#FFF8EF]">
                              <th className="sticky left-0 z-10 w-[360px] border-r border-[#EADACA] bg-[#FFF8EF] px-4 py-3 text-left text-[13px] font-extrabold text-[#6F5549]">
                                Bab / Sub Bab
                              </th>

                              {months.map((month) => (
                                <th
                                  key={month}
                                  colSpan={5}
                                  className="border-r border-[#EADACA] px-4 py-3 text-center text-[13px] font-extrabold text-[#6F5549]"
                                >
                                  {monthLabels[month]}
                                </th>
                              ))}
                            </tr>

                            <tr className="border-b border-[#EADACA] bg-[#FFFCF8]">
                              <th className="sticky left-0 z-10 border-r border-[#EADACA] bg-[#FFFCF8] px-4 py-3" />

                              {months.flatMap((month) =>
                                weeks.map((week) => (
                                  <th
                                    key={`${month}-${week}`}
                                    className="w-[52px] border-r border-[#F0E1D4] px-3 py-3 text-center text-[12px] font-extrabold text-[#8A5A48]"
                                  >
                                    {week}
                                  </th>
                                ))
                              )}
                            </tr>
                          </thead>

                          <tbody>
                            {program.chapters.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={1 + months.length * weeks.length}
                                  className="px-4 py-10 text-center text-[14px] text-[#6F5549]"
                                >
                                  Belum ada Bab. Klik tombol Tambah Bab.
                                </td>
                              </tr>
                            ) : (
                              program.chapters.map((chapter) => {
                                const chapterExpanded = expandedChapterIds.includes(
                                  chapter.id
                                );

                                return (
                                  <FragmentRows
                                    key={chapter.id}
                                    program={program}
                                    chapter={chapter}
                                    chapterExpanded={chapterExpanded}
                                    toggleChapter={toggleChapter}
                                    openCreateSubChapterModal={
                                      openCreateSubChapterModal
                                    }
                                    openEditChapterModal={openEditChapterModal}
                                    handleDeleteChapter={handleDeleteChapter}
                                    openEditSubChapterModal={
                                      openEditSubChapterModal
                                    }
                                    handleDeleteSubChapter={handleDeleteSubChapter}
                                  />
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </section>

      {showProgramModal ? (
        <ProgramModal
          teachers={teachers}
          subjects={subjects}
          form={programForm}
          saving={saving}
          onChange={updateProgramForm}
          onClose={() => setShowProgramModal(false)}
          onSave={handleSaveProgram}
        />
      ) : null}

      {showChapterModal ? (
        <ChapterModal
          form={chapterForm}
          saving={saving}
          onChange={updateChapterForm}
          onClose={() => setShowChapterModal(false)}
          onSave={handleSaveChapter}
        />
      ) : null}

      {showSubChapterModal ? (
        <SubChapterModal
          form={subChapterForm}
          saving={saving}
          onChange={updateSubChapterForm}
          onClose={() => setShowSubChapterModal(false)}
          onSave={handleSaveSubChapter}
        />
      ) : null}

      {previewProgram ? (
        <DocumentPreviewModal
          program={previewProgram}
          onClose={() => setPreviewProgram(null)}
        />
      ) : null}

      {rejectingProgram ? (
        <RejectModal
          program={rejectingProgram}
          note={rejectionNote}
          onChange={setRejectionNote}
          onClose={() => setRejectingProgram(null)}
          onSubmit={handleRejectProgram}
        />
      ) : null}
    </KepalaSekolahLayout>
  );
}

function FragmentRows({
  program,
  chapter,
  chapterExpanded,
  toggleChapter,
  openCreateSubChapterModal,
  openEditChapterModal,
  handleDeleteChapter,
  openEditSubChapterModal,
  handleDeleteSubChapter,
}: {
  program: EnrichedProgram;
  chapter: EnrichedChapter;
  chapterExpanded: boolean;
  toggleChapter: (chapterId: string) => void;
  openCreateSubChapterModal: (programId: string, chapterId: string) => void;
  openEditChapterModal: (chapter: EnrichedChapter) => void;
  handleDeleteChapter: (chapter: EnrichedChapter) => void;
  openEditSubChapterModal: (
    programId: string,
    subChapter: EnrichedSubChapter
  ) => void;
  handleDeleteSubChapter: (subChapter: EnrichedSubChapter) => void;
}) {
  return (
    <>
      <tr className="border-b border-[#EADACA] bg-[#FFF8EF]">
        <td colSpan={1 + months.length * weeks.length} className="px-4 py-3">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <button
              type="button"
              onClick={() => toggleChapter(chapter.id)}
              className="flex items-center gap-2 text-left"
            >
              {chapterExpanded ? (
                <ChevronDown className="h-4 w-4 text-[#8C0F2D]" />
              ) : (
                <ChevronRight className="h-4 w-4 text-[#8C0F2D]" />
              )}

              <span className="text-[14px] font-extrabold text-[#2B1B18]">
                Bab {chapter.chapter_order}. {chapter.chapter_title}
              </span>

              <span className="rounded-full bg-white px-2 py-1 text-[11px] font-extrabold text-[#8A5A48]">
                {chapter.sub_chapters.length} Sub Bab
              </span>
            </button>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openCreateSubChapterModal(program.id, chapter.id)}
                className="inline-flex h-8 items-center gap-2 rounded-lg bg-[#8C0F2D] px-3 text-[12px] font-extrabold text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                Sub Bab
              </button>

              <button
                type="button"
                onClick={() => openEditChapterModal(chapter)}
                className="inline-flex h-8 items-center gap-2 rounded-lg border border-[#DCC8B6] bg-white px-3 text-[12px] font-extrabold text-[#8C0F2D]"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Edit
              </button>

              <button
                type="button"
                onClick={() => handleDeleteChapter(chapter)}
                className="inline-flex h-8 items-center gap-2 rounded-lg border border-[#FECACA] bg-white px-3 text-[12px] font-extrabold text-[#DC2626]"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Hapus
              </button>
            </div>
          </div>
        </td>
      </tr>

      {chapterExpanded
        ? chapter.sub_chapters.map((subChapter) => (
            <tr key={subChapter.id} className="border-b border-[#F0E1D4]">
              <td className="sticky left-0 z-10 border-r border-[#EADACA] bg-white px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-bold text-[#2B1B18]">
                      {subChapter.sub_chapter_order}.{" "}
                      {subChapter.sub_chapter_title}
                    </p>

                    <p className="mt-1 text-[12px] text-[#6F5549]">
                      Target:{" "}
                      {monthLabels[subChapter.target_month || "July"] ||
                        subChapter.target_month}{" "}
                      W{subChapter.planned_week || 1}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => openEditSubChapterModal(program.id, subChapter)}
                      className="rounded-lg border border-[#DCC8B6] p-1.5 text-[#8C0F2D]"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteSubChapter(subChapter)}
                      className="rounded-lg border border-[#FECACA] p-1.5 text-[#DC2626]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </td>

              {months.flatMap((month) =>
                weeks.map((week) => {
                  const status = getSubChapterCellStatus(subChapter, month, week);

                  return (
                    <td
                      key={`${subChapter.id}-${month}-${week}`}
                      className="h-12 border-r border-[#F0E1D4] px-3 py-2 text-center"
                    >
                      {status.type === "completed" ? (
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#C7F0DA] text-[#158A58]">
                          <Check className="h-4 w-4" />
                        </span>
                      ) : status.type === "planned" ? (
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#FFE4E6] text-[20px] leading-none text-[#BE123C]">
                          •
                        </span>
                      ) : (
                        <span className="text-[#EADACA]">-</span>
                      )}
                    </td>
                  );
                })
              )}
            </tr>
          ))
        : null}
    </>
  );
}

function ProgramModal({
  teachers,
  subjects,
  form,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  teachers: TeacherRow[];
  subjects: SubjectRow[];
  form: ProgramForm;
  saving: boolean;
  onChange: (field: keyof ProgramForm, value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <ModalShell
      title={form.id ? "Edit Program Semester" : "Tambah Program Semester"}
      subtitle="Isi program utama terlebih dahulu. Setelah itu baru tambahkan Bab dan Sub Bab."
      onClose={onClose}
    >
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <FormGroup label="Guru">
            <select
              value={form.teacher_id}
              onChange={(event) => onChange("teacher_id", event.target.value)}
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
            <input
              value={form.subject_name}
              onChange={(event) => onChange("subject_name", event.target.value)}
              list="subject-list"
              placeholder="Contoh: IPA"
              className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
            />

            <datalist id="subject-list">
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.name || ""} />
              ))}
            </datalist>
          </FormGroup>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <FormGroup label="Jenis Program">
            <select
              value={form.program_type}
              onChange={(event) => onChange("program_type", event.target.value)}
              className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              {programTypeOptions.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </FormGroup>

          <FormGroup label="Level">
            <select
              value={form.level}
              onChange={(event) => onChange("level", event.target.value)}
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
              {semesterOptions.map((semester) => (
                <option key={semester}>{semester}</option>
              ))}
            </select>
          </FormGroup>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormGroup label="Tahun Ajaran">
            <input
              value={form.academic_year}
              onChange={(event) => onChange("academic_year", event.target.value)}
              placeholder="2026/2027"
              className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
            />
          </FormGroup>

          <FormGroup label="Status">
            <select
              value={form.status}
              onChange={(event) => onChange("status", event.target.value)}
              className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              {statusOptions.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </FormGroup>
        </div>

        <FormGroup label="Link Dokumen Program Semester">
          <input
            value={form.document_url}
            onChange={(event) => onChange("document_url", event.target.value)}
            placeholder="Opsional: link PDF / dokumen jika ada"
            className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
          />
        </FormGroup>

        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="h-12 w-full rounded-xl bg-[#8C0F2D] text-[15px] font-extrabold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Menyimpan..." : "Simpan Program"}
        </button>
      </div>
    </ModalShell>
  );
}

function ChapterModal({
  form,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  form: ChapterForm;
  saving: boolean;
  onChange: (field: keyof ChapterForm, value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <ModalShell
      title={form.id ? "Edit Bab" : "Tambah Bab"}
      subtitle="Bab akan masuk ke program semester yang dipilih."
      onClose={onClose}
    >
      <div className="space-y-5">
        <FormGroup label="Judul Bab">
          <input
            value={form.chapter_title}
            onChange={(event) => onChange("chapter_title", event.target.value)}
            placeholder="Contoh: Bab I Besaran dan Pengukuran"
            className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
          />
        </FormGroup>

        <FormGroup label="Urutan Bab">
          <input
            type="number"
            value={form.chapter_order}
            onChange={(event) => onChange("chapter_order", event.target.value)}
            placeholder="1"
            className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
          />
        </FormGroup>

        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="h-12 w-full rounded-xl bg-[#8C0F2D] text-[15px] font-extrabold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Menyimpan..." : "Simpan Bab"}
        </button>
      </div>
    </ModalShell>
  );
}

function SubChapterModal({
  form,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  form: SubChapterForm;
  saving: boolean;
  onChange: (field: keyof SubChapterForm, value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <ModalShell
      title={form.id ? "Edit Sub Bab" : "Tambah Sub Bab"}
      subtitle="Sub Bab akan muncul di matrix Program Semester sesuai bulan dan minggu target."
      onClose={onClose}
    >
      <div className="space-y-5">
        <FormGroup label="Judul Sub Bab">
          <input
            value={form.sub_chapter_title}
            onChange={(event) =>
              onChange("sub_chapter_title", event.target.value)
            }
            placeholder="Contoh: Besaran Pokok dan Besaran Turunan"
            className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
          />
        </FormGroup>

        <div className="grid gap-4 md:grid-cols-3">
          <FormGroup label="Urutan Sub Bab">
            <input
              type="number"
              value={form.sub_chapter_order}
              onChange={(event) =>
                onChange("sub_chapter_order", event.target.value)
              }
              placeholder="1"
              className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
            />
          </FormGroup>

          <FormGroup label="Target Bulan">
            <select
              value={form.target_month}
              onChange={(event) => onChange("target_month", event.target.value)}
              className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              {months.map((month) => (
                <option key={month} value={month}>
                  {monthLabels[month]}
                </option>
              ))}
            </select>
          </FormGroup>

          <FormGroup label="Target Minggu">
            <select
              value={form.planned_week}
              onChange={(event) => onChange("planned_week", event.target.value)}
              className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              <option value="1">W1</option>
              <option value="2">W2</option>
              <option value="3">W3</option>
              <option value="4">W4</option>
              <option value="5">W5</option>
            </select>
          </FormGroup>
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="h-12 w-full rounded-xl bg-[#8C0F2D] text-[15px] font-extrabold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Menyimpan..." : "Simpan Sub Bab"}
        </button>
      </div>
    </ModalShell>
  );
}

function DocumentPreviewModal({
  program,
  onClose,
}: {
  program: EnrichedProgram;
  onClose: () => void;
}) {
  return (
    <ModalShell
      title="Preview Dokumen Program Semester"
      subtitle={`${program.subject_name || "-"} • ${program.teacher_name}`}
      onClose={onClose}
    >
      <div className="space-y-4">
        {program.document_url ? (
          <>
            <div className="overflow-hidden rounded-xl border border-[#E1CFBE] bg-[#F8F2EA]">
              {isPdfUrl(program.document_url) ? (
                <iframe
                  src={program.document_url}
                  title="Preview PDF Program Semester"
                  className="h-[560px] w-full"
                />
              ) : (
                <div className="px-5 py-8 text-center">
                  <FileText className="mx-auto h-10 w-10 text-[#8C0F2D]" />
                  <p className="mt-3 text-[14px] text-[#6F5549]">
                    Preview langsung hanya tersedia untuk file PDF. Untuk DOC
                    atau DOCX, buka dokumen melalui tombol di bawah.
                  </p>
                </div>
              )}
            </div>

            <a
              href={program.document_url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-xl bg-[#8C0F2D] px-4 py-3 text-center text-[14px] font-extrabold text-white transition hover:bg-[#54131D]"
            >
              {isPdfUrl(program.document_url) ? "Buka PDF" : "Buka Dokumen"}
            </a>
          </>
        ) : (
          <p className="rounded-xl bg-white px-4 py-5 text-center text-[14px] text-[#6F5549]">
            Program Semester ini belum memiliki dokumen.
          </p>
        )}
      </div>
    </ModalShell>
  );
}

function RejectModal({
  program,
  note,
  onChange,
  onClose,
  onSubmit,
}: {
  program: EnrichedProgram;
  note: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <ModalShell
      title="Reject / Revisi Program Semester"
      subtitle={`${program.subject_name || "-"} • ${program.teacher_name}`}
      onClose={onClose}
    >
      <div className="space-y-4">
        <label className="block">
          <p className="mb-2 text-[14px] font-extrabold text-[#2B1B18]">
            Catatan Revisi
          </p>

          <textarea
            value={note}
            onChange={(event) => onChange(event.target.value)}
            rows={5}
            placeholder="Contoh: Mohon lengkapi Sub Bab, target bulan, atau dokumen Program Semester."
            className="w-full resize-none rounded-xl border border-[#DCC8B6] bg-white px-4 py-3 text-[14px] outline-none focus:border-[#9C0824]"
          />
        </label>

        <button
          type="button"
          onClick={onSubmit}
          className="h-11 w-full rounded-xl bg-[#DC2626] text-[14px] font-extrabold text-white transition hover:bg-[#B91C1C]"
        >
          Kirim Revisi
        </button>
      </div>
    </ModalShell>
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
      <div className="max-h-[92vh] w-full max-w-[860px] overflow-y-auto rounded-[22px] bg-[#FFF8EF] shadow-2xl">
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

function MatrixLegend() {
  return (
    <div className="flex flex-wrap gap-3 rounded-2xl border border-[#EADACA] bg-[#FFFCF8] px-4 py-3 text-[13px] font-bold text-[#6F5549]">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#FFE4E6] text-[18px] text-[#BE123C]">
          •
        </span>
        Target Rencana
      </div>

      <div className="flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#C7F0DA] text-[#158A58]">
          <Check className="h-4 w-4" />
        </span>
        Sudah Terealisasi dari Absensi KBM
      </div>
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