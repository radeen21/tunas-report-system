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
  teacher_code?: string | null;
  subjects?: string[] | string | null;
};

type StudentRow = {
  id: string;
  full_name: string | null;
  level: string | null;
  grade: string | null;
  nis?: string | null;
  nisn?: string | null;
};

type SubjectRow = {
  id: string;
  name: string | null;
  level?: string | null;
  grade?: string | null;
};

type StudentTeacherRow = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  academic_year: string | null;
  notes?: string | null;
};

type RppRow = {
  id: string;
  title?: string | null;
  teacher_id: string | null;

  curriculum_program_id?: string | null;
  curriculum_chapter_id?: string | null;
  curriculum_sub_chapter_id?: string | null;

  manual_program_semester?: string | null;
  manual_chapter?: string | null;
  manual_sub_chapter?: string | null;

  student_id?: string | null;
  student_name?: string | null;
  student_class?: string | null;
  student_nis?: string | null;

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

  manual_program_semester: string;
  manual_chapter: string;
  manual_sub_chapter: string;

  student_id: string;
  student_name: string;
  student_class: string;
  student_nis: string;

  subject_id: string;
  subject_name: string;
  semester: string;

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

    manual_program_semester: "",
    manual_chapter: "",
    manual_sub_chapter: "",

    student_id: "",
    student_name: "",
    student_class: "",
    student_nis: "",

    subject_id: "",
    subject_name: "",
    semester: "Ganjil",

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

function normalizeLevel(level?: string | null) {
  const safe = normalizeText(level);

  if (safe.includes("primary") || safe === "sd") return "SD";
  if (safe.includes("secondary") || safe === "smp") return "SMP";
  if (safe.includes("high") || safe === "sma") return "SMA";
  if (safe.includes("early")) return "Bimbel/Kursus";

  return level || "-";
}

function formatClass(level?: string | null, grade?: string | null) {
  const cleanLevel = normalizeLevel(level);
  const cleanGrade = grade || "";

  if (cleanLevel && cleanGrade) return `${cleanLevel} ${cleanGrade}`;
  if (cleanLevel) return cleanLevel;
  if (cleanGrade) return cleanGrade;

  return "-";
}

function sameSubjectName(a?: string | null, b?: string | null) {
  if (!a || !b) return false;

  const left = normalizeText(a);
  const right = normalizeText(b);

  return left === right || left.includes(right) || right.includes(left);
}

function formatTeacherSubject(subjects?: string[] | string | null) {
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

function getSubjectLabel(subject?: SubjectRow | null) {
  if (!subject) return "-";

  const level = subject.level ? normalizeLevel(subject.level) : "";
  const grade = subject.grade || "";

  if (level && grade) return `${subject.name || "-"} — ${level} ${grade}`;
  if (grade) return `${subject.name || "-"} — ${grade}`;
  if (level) return `${subject.name || "-"} — ${level}`;

  return subject.name || "-";
}

function getManualProgram(rpp: RppRow) {
  return rpp.manual_program_semester || "-";
}

function getManualChapter(rpp: RppRow) {
  return rpp.manual_chapter || "-";
}

function getManualSubChapter(rpp: RppRow) {
  return rpp.manual_sub_chapter || "-";
}

function getRppStudentName(rpp: RppRow) {
  return rpp.student_name || "-";
}

function getRppStudentClass(rpp: RppRow) {
  return rpp.student_class || rpp.grade || "-";
}

function getRppStudentNis(rpp: RppRow) {
  return rpp.student_nis || "-";
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export default function TeacherRppPage() {
  const [teacher, setTeacher] = useState<TeacherRow | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [studentTeachers, setStudentTeachers] = useState<StudentTeacherRow[]>(
    []
  );
  const [rpps, setRpps] = useState<RppRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");

  const [showModal, setShowModal] = useState(false);
  const [selectedRpp, setSelectedRpp] = useState<RppRow | null>(null);
  const [form, setForm] = useState<RppForm>(emptyForm());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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
        setStudents([]);
        setSubjects([]);
        setStudentTeachers([]);
        setRpps([]);
        setErrorMessage(
          "Data guru belum terhubung dengan akun login ini. Hubungkan email guru di tabel teachers atau isi teacher_code."
        );
        return;
      }

      const [relationsRes, rppRes] = await Promise.all([
        supabase
          .from("student_teachers")
          .select("*")
          .eq("teacher_id", currentTeacher.id)
          .eq("academic_year", ACADEMIC_YEAR),

        supabase
          .from("rpp")
          .select("*")
          .eq("teacher_id", currentTeacher.id)
          .order("updated_at", { ascending: false }),
      ]);

      if (relationsRes.error) throw new Error(relationsRes.error.message);
      if (rppRes.error) throw new Error(rppRes.error.message);

      const relationsData = (relationsRes.data || []) as StudentTeacherRow[];
      const rppData = (rppRes.data || []) as RppRow[];

      const relationStudentIds = relationsData
        .map((relation) => relation.student_id || "")
        .filter(Boolean);

      const rppStudentIds = rppData
        .map((rpp) => rpp.student_id || "")
        .filter(Boolean);

      const relationSubjectIds = relationsData
        .map((relation) => relation.subject_id || "")
        .filter(Boolean);

      const studentIds = uniqueStrings([...relationStudentIds, ...rppStudentIds]);
      const subjectIds = uniqueStrings(relationSubjectIds);

      let studentsData: StudentRow[] = [];
      let subjectsData: SubjectRow[] = [];

      if (studentIds.length > 0) {
        const { data, error } = await supabase
          .from("students")
          .select("*")
          .in("id", studentIds)
          .order("full_name");

        if (error) throw new Error(error.message);

        studentsData = (data || []) as StudentRow[];
      }

      if (subjectIds.length > 0) {
        const { data, error } = await supabase
          .from("subjects")
          .select("*")
          .in("id", subjectIds)
          .order("name");

        if (error) throw new Error(error.message);

        subjectsData = (data || []) as SubjectRow[];
      }

      setStudents(studentsData);
      setSubjects(subjectsData);
      setStudentTeachers(relationsData);
      setRpps(rppData);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengambil data RPP.");
      }

      setTeacher(null);
      setStudents([]);
      setSubjects([]);
      setStudentTeachers([]);
      setRpps([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("teacher-rpp-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teachers" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rpp" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "student_teachers" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
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

  const studentOptionsForForm = useMemo(() => {
    const studentIdsFromRelation = new Set(
      studentTeachers
        .map((relation) => relation.student_id)
        .filter(Boolean) as string[]
    );

    return students
      .filter((student) => studentIdsFromRelation.has(student.id))
      .sort((a, b) => {
        return (a.full_name || "").localeCompare(b.full_name || "");
      });
  }, [students, studentTeachers]);

  const subjectOptions = useMemo(() => {
    if (!form.student_id) {
      const subjectIdsFromRelation = new Set(
        studentTeachers
          .map((relation) => relation.subject_id)
          .filter(Boolean) as string[]
      );

      return subjects.filter((subject) => subjectIdsFromRelation.has(subject.id));
    }

    const subjectIdsForStudent = new Set(
      studentTeachers
        .filter((relation) => relation.student_id === form.student_id)
        .map((relation) => relation.subject_id)
        .filter(Boolean) as string[]
    );

    return subjects.filter((subject) => subjectIdsForStudent.has(subject.id));
  }, [subjects, studentTeachers, form.student_id]);

  const selectedSubject = useMemo(() => {
    return subjects.find((subject) => subject.id === form.subject_id) || null;
  }, [subjects, form.subject_id]);

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
        normalizeText(rpp.notes).includes(q) ||
        normalizeText(rpp.manual_program_semester).includes(q) ||
        normalizeText(rpp.manual_chapter).includes(q) ||
        normalizeText(rpp.manual_sub_chapter).includes(q) ||
        normalizeText(rpp.student_name).includes(q) ||
        normalizeText(rpp.student_class).includes(q) ||
        normalizeText(rpp.student_nis).includes(q);

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

  function handleStudentChange(studentId: string) {
    const student = students.find((item) => item.id === studentId);

    const studentSubjectIds = studentTeachers
      .filter((relation) => relation.student_id === studentId)
      .map((relation) => relation.subject_id)
      .filter(Boolean) as string[];

    const firstSubjectId = studentSubjectIds[0] || "";
    const firstSubject = subjects.find((subject) => subject.id === firstSubjectId);

    setForm((prev) => ({
      ...prev,
      student_id: studentId,
      student_name: student?.full_name || "",
      student_class: student ? formatClass(student.level, student.grade) : "",
      student_nis: student?.nis || "",
      subject_id: firstSubjectId,
      subject_name: firstSubject?.name || "",
    }));
  }

  function handleSubjectChange(subjectId: string) {
    const subject = subjects.find((item) => item.id === subjectId);

    setForm((prev) => ({
      ...prev,
      subject_id: subjectId,
      subject_name: subject?.name || "",
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

    const matchedSubject = subjects.find((subject) =>
      sameSubjectName(subject.name, rpp.subject_name)
    );

    setForm({
      id: rpp.id,

      manual_program_semester: rpp.manual_program_semester || "",
      manual_chapter: rpp.manual_chapter || "",
      manual_sub_chapter: rpp.manual_sub_chapter || "",

      student_id: rpp.student_id || "",
      student_name: rpp.student_name || "",
      student_class: rpp.student_class || rpp.grade || "",
      student_nis: rpp.student_nis || "",

      subject_id: matchedSubject?.id || "",
      subject_name: rpp.subject_name || "",
      semester: rpp.semester || "Ganjil",

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

    if (!form.manual_program_semester.trim()) {
      alert("Isi Program Semester terlebih dahulu.");
      return false;
    }

    if (!form.manual_chapter.trim()) {
      alert("Isi Bab terlebih dahulu.");
      return false;
    }

    if (!form.manual_sub_chapter.trim()) {
      alert("Isi Sub Bab terlebih dahulu.");
      return false;
    }

    if (!form.student_id.trim()) {
      alert("Pilih siswa terlebih dahulu.");
      return false;
    }

    if (!form.student_name.trim()) {
      alert("Nama siswa belum terisi.");
      return false;
    }

    if (!form.student_class.trim()) {
      alert("Isi kelas siswa terlebih dahulu.");
      return false;
    }

    if (!form.student_nis.trim()) {
      alert("Isi NIS/NIPD terlebih dahulu.");
      return false;
    }

    if (!form.subject_id.trim()) {
      alert("Pilih mata pelajaran terlebih dahulu.");
      return false;
    }

    if (!form.subject_name.trim()) {
      alert("Mata pelajaran belum terisi.");
      return false;
    }

    const allowedRelation = studentTeachers.some((relation) => {
      return (
        relation.teacher_id === teacher.id &&
        relation.student_id === form.student_id &&
        relation.subject_id === form.subject_id
      );
    });

    if (!allowedRelation) {
      alert("Siswa dan mapel ini belum terhubung dengan guru login.");
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

    if (!teacher?.id) return;

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

        curriculum_program_id: null,
        curriculum_chapter_id: null,
        curriculum_sub_chapter_id: null,

        manual_program_semester: form.manual_program_semester.trim(),
        manual_chapter: form.manual_chapter.trim(),
        manual_sub_chapter: form.manual_sub_chapter.trim(),

        student_id: form.student_id || null,
        student_name: form.student_name.trim(),
        student_class: form.student_class.trim(),
        student_nis: form.student_nis.trim(),

        subject_name: form.subject_name.trim(),
        level: null,
        grade: form.student_class.trim(),
        semester: form.semester,
        academic_year: ACADEMIC_YEAR,

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

      setShowModal(false);
      setForm(emptyForm());
      setSelectedFile(null);

      alert(
        nextStatus === "submitted"
          ? "RPP berhasil disubmit."
          : "RPP berhasil disimpan."
      );
    } catch (error) {
      alert(
        `Gagal simpan RPP: ${
          error instanceof Error ? error.message : "Terjadi kesalahan"
        }`
      );
    } finally {
      setSaving(false);
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
      teacherSubject={formatTeacherSubject(teacher?.subjects ?? null)}
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
              Buat RPP secara manual berdasarkan Program Semester, Bab, Sub Bab,
              nama siswa, kelas, mapel, NIS/NIPD, dan upload file RPP.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            disabled={!teacher || saving || studentOptionsForForm.length === 0}
            className="flex h-11 w-fit items-center gap-2 rounded-xl bg-[#8C0F2D] px-5 text-[14px] font-extrabold text-white shadow-sm transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:bg-[#C9AAB2]"
          >
            <Plus className="h-4 w-4" />
            Tambah RPP
          </button>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-[14px] leading-6 text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {!loading && teacher && studentOptionsForForm.length === 0 ? (
          <div className="rounded-2xl border border-[#E8D6C1] bg-white px-5 py-4 text-[14px] leading-6 text-[#6F5549]">
            Belum ada siswa yang terhubung ke guru ini. Hubungkan siswa dengan
            guru dan mapel dari menu Kepala Sekolah → Siswa → Edit Siswa.
          </div>
        ) : null}

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
                placeholder="Cari judul, siswa, NIPD, kelas, mapel, program, bab, indikator, materi..."
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
                      {getRppStudentClass(rpp)}
                    </span>

                    <span className="rounded-full bg-[#F1F5F9] px-3 py-1 text-[12px] font-extrabold text-[#64748B]">
                      Semester {rpp.semester || "-"}
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
                    {rpp.subject_name || "-"} • {getRppStudentName(rpp)} • NIPD:{" "}
                    {getRppStudentNis(rpp)}
                  </p>
                </div>

                <div className="space-y-4 px-6 py-5">
                  <div className="grid gap-3 md:grid-cols-3">
                    <MiniInfo
                      label="Program Semester"
                      value={getManualProgram(rpp)}
                    />
                    <MiniInfo label="Bab" value={getManualChapter(rpp)} />
                    <MiniInfo label="Sub Bab" value={getManualSubChapter(rpp)} />
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
          students={studentOptionsForForm}
          subjectOptions={subjectOptions}
          selectedSubject={selectedSubject}
          selectedFile={selectedFile}
          saving={saving}
          onChange={updateForm}
          onStudentChange={handleStudentChange}
          onSubjectChange={handleSubjectChange}
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
  students,
  subjectOptions,
  selectedSubject,
  selectedFile,
  saving,
  onChange,
  onStudentChange,
  onSubjectChange,
  onFileChange,
  onClose,
  onSaveDraft,
  onSubmit,
}: {
  form: RppForm;
  students: StudentRow[];
  subjectOptions: SubjectRow[];
  selectedSubject: SubjectRow | null;
  selectedFile: File | null;
  saving: boolean;
  onChange: (field: keyof RppForm, value: string) => void;
  onStudentChange: (studentId: string) => void;
  onSubjectChange: (subjectId: string) => void;
  onFileChange: (file: File | null) => void;
  onClose: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
}) {
  return (
    <ModalShell
      title={form.id ? "Edit RPP" : "Tambah RPP"}
      subtitle="Isi RPP secara manual: Program Semester, Bab, Sub Bab, siswa, kelas, mapel, NIS/NIPD, dan upload file."
      onClose={onClose}
    >
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          <FormGroup label="Program Semester">
            <input
              value={form.manual_program_semester}
              onChange={(event) =>
                onChange("manual_program_semester", event.target.value)
              }
              placeholder="Contoh: Program Semester 1 / Ganjil"
              className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
            />
          </FormGroup>

          <FormGroup label="Bab">
            <input
              value={form.manual_chapter}
              onChange={(event) => onChange("manual_chapter", event.target.value)}
              placeholder="Contoh: Bab 1"
              className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
            />
          </FormGroup>

          <FormGroup label="Sub Bab">
            <input
              value={form.manual_sub_chapter}
              onChange={(event) =>
                onChange("manual_sub_chapter", event.target.value)
              }
              placeholder="Contoh: Mengubah Bentuk Energi"
              className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
            />
          </FormGroup>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormGroup label="Nama Siswa">
            <select
              value={form.student_id}
              onChange={(event) => onStudentChange(event.target.value)}
              className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              <option value="">Pilih siswa</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name} — {formatClass(student.level, student.grade)} —
                  NIPD: {student.nis || "-"}
                </option>
              ))}
            </select>
          </FormGroup>

          <FormGroup label="Nama Siswa">
            <input
              value={form.student_name}
              readOnly
              placeholder="Otomatis dari pilihan siswa"
              className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-[#FFF8EF] px-4 text-[14px] font-bold text-[#2B1B18] outline-none"
            />
          </FormGroup>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <FormGroup label="Kelas">
            <input
              value={form.student_class}
              readOnly
              placeholder="Otomatis dari data siswa"
              className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-[#FFF8EF] px-4 text-[14px] font-bold text-[#2B1B18] outline-none"
            />
          </FormGroup>

          <FormGroup label="Mapel">
            <select
              value={form.subject_id}
              onChange={(event) => onSubjectChange(event.target.value)}
              disabled={!form.student_id}
              className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824] disabled:cursor-not-allowed disabled:bg-[#F4E5DA] disabled:opacity-70"
            >
              <option value="">
                {form.student_id ? "Pilih mapel" : "Pilih siswa dulu"}
              </option>
              {subjectOptions.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {getSubjectLabel(subject)}
                </option>
              ))}
            </select>
          </FormGroup>

          <FormGroup label="NIS / NIPD">
            <input
              value={form.student_nis}
              readOnly
              placeholder="Otomatis dari data siswa"
              className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-[#FFF8EF] px-4 text-[14px] font-bold text-[#2B1B18] outline-none"
            />
          </FormGroup>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormGroup label="Mapel">
            <input
              value={form.subject_name}
              readOnly
              placeholder="Otomatis dari pilihan mapel"
              className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-[#FFF8EF] px-4 text-[14px] font-bold text-[#2B1B18] outline-none"
            />
          </FormGroup>

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
        </div>

        {selectedSubject ? (
          <div className="rounded-2xl border border-[#EADACA] bg-[#FFF8EF] px-5 py-4 text-[13px] leading-6 text-[#6F5549]">
            Mapel terpilih:{" "}
            <span className="font-extrabold text-[#2B1B18]">
              {getSubjectLabel(selectedSubject)}
            </span>
          </div>
        ) : null}

        <FormGroup label="Judul RPP">
          <input
            value={form.rpp_title}
            onChange={(event) => onChange("rpp_title", event.target.value)}
            placeholder="Contoh: RPP IPAS - Mengubah Bentuk Energi"
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
            {rpp.subject_name || "-"}
          </span>

          <span className="rounded-full bg-[#F1F5F9] px-3 py-1 text-[12px] font-extrabold text-[#64748B]">
            {getRppStudentClass(rpp)}
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <MiniInfo label="Program Semester" value={getManualProgram(rpp)} />
          <MiniInfo label="Bab" value={getManualChapter(rpp)} />
          <MiniInfo label="Sub Bab" value={getManualSubChapter(rpp)} />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <MiniInfo label="Nama Siswa" value={getRppStudentName(rpp)} />
          <MiniInfo label="Kelas" value={getRppStudentClass(rpp)} />
          <MiniInfo label="NIS / NIPD" value={getRppStudentNis(rpp)} />
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

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#E1CFBE] bg-[#FFF8EF] px-4 py-3">
      <p className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#8A5A48]">
        {label}
      </p>
      <p className="mt-1 text-[14px] font-extrabold text-[#2B1B18]">
        {value || "-"}
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