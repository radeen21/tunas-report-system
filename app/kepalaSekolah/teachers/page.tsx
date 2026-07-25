"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { FileText, UploadCloud } from "lucide-react";
import { supabase } from "@/lib/supabase";
import KepalaSekolahLayout from "../components/KepalaSekolahLayout";

const TEACHER_DOCUMENT_BUCKET = "teacher-documents";

type TeacherDocumentKey =
  | "ktp_url"
  | "family_card_url"
  | "diploma_url"
  | "photo_url"
  | "certificate_url";

type Teacher = {
  id: string;
  user_id: string | null;
  teacher_code: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  subjects: string[] | null;
  status: string | null;
  birth_place: string | null;
  birth_date: string | null;
  gender: string | null;
  religion: string | null;
  education_level: string | null;
  start_date: string | null;
  graduation: string | null;
  employment_status: string | null;
  ktp_url: string | null;
  family_card_url: string | null;
  diploma_url: string | null;
  photo_url: string | null;
  certificate_url: string | null;
};

type StudentTeacher = {
  id: string;
  full_name: string;
  email: string | null;
};

type Student = {
  id: string;
  full_name: string;
  level: string | null;
  grade: string | null;
  nis: string | null;
  homeroom_teacher_id: string | null;
  teachers: StudentTeacher | null;
};

type KbmReportQueryResult = {
  id: string;
  teacher_id: string | null;
  student_id: string | null;
  subject_id: string | null;
  report_date: string | null;
  class_level: string | null;
  semester: string | null;
  chapter: string | null;
  material_topic: string | null;
  learning_issue: string | null;
  solution: string | null;
  teacher_note: string | null;
  status: string | null;
  students:
    | {
        id: string;
        full_name: string;
        level: string | null;
        grade: string | null;
        nis: string | null;
      }
    | {
        id: string;
        full_name: string;
        level: string | null;
        grade: string | null;
        nis: string | null;
      }[]
    | null;
  subjects:
    | {
        id: string;
        name: string;
      }
    | {
        id: string;
        name: string;
      }[]
    | null;
};

type KbmReport = {
  id: string;
  teacher_id: string | null;
  student_id: string | null;
  subject_id: string | null;
  report_date: string | null;
  class_level: string | null;
  semester: string | null;
  chapter: string | null;
  material_topic: string | null;
  learning_issue: string | null;
  solution: string | null;
  teacher_note: string | null;
  status: string | null;
  student_name: string;
  student_level: string;
  student_grade: string;
  student_nis: string;
  subject_name: string;
};

type TeacherForm = {
  full_name: string;
  email: string;
  phone: string;
  teacher_code: string;
  subjects: string;
  status: string;
  birth_place: string;
  birth_date: string;
  gender: string;
  religion: string;
  education_level: string;
  start_date: string;
  graduation: string;
  employment_status: string;
  ktp_url: string;
  family_card_url: string;
  diploma_url: string;
  photo_url: string;
  certificate_url: string;
};

const initialForm: TeacherForm = {
  full_name: "",
  email: "",
  phone: "",
  teacher_code: "",
  subjects: "",
  status: "active",
  birth_place: "",
  birth_date: "",
  gender: "",
  religion: "",
  education_level: "",
  start_date: "",
  graduation: "",
  employment_status: "Honor",
  ktp_url: "",
  family_card_url: "",
  diploma_url: "",
  photo_url: "",
  certificate_url: "",
};

const genderOptions = ["", "L", "P"];

const religionOptions = [
  "",
  "Kristen",
  "Katolik",
  "Islam",
  "Hindu",
  "Buddha",
  "Konghucu",
  "Lainnya",
];

const educationOptions = [
  "",
  "SD",
  "SMP",
  "SMA/SMK",
  "D1",
  "D2",
  "D3",
  "D4",
  "S1",
  "S2",
  "S3",
  "Lainnya",
];

const employmentStatusOptions = ["Honor", "Tetap"];

const teacherDocumentFields: Array<{
  key: TeacherDocumentKey;
  label: string;
  accept: string;
}> = [
  { key: "ktp_url", label: "KTP", accept: ".pdf,.jpg,.jpeg,.png" },
  {
    key: "family_card_url",
    label: "KK",
    accept: ".pdf,.jpg,.jpeg,.png,.doc,.docx",
  },
  {
    key: "diploma_url",
    label: "Ijazah",
    accept: ".pdf,.jpg,.jpeg,.png,.doc,.docx",
  },
  { key: "photo_url", label: "Foto", accept: ".jpg,.jpeg,.png,.webp" },
  {
    key: "certificate_url",
    label: "Sertifikat",
    accept: ".pdf,.jpg,.jpeg,.png,.doc,.docx",
  },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function normalizeSubjects(subjects: string[] | null) {
  if (!subjects || subjects.length === 0) return [];

  return subjects;
}

function normalizeRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function formatDate(date: string | null) {
  if (!date) return "-";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "-";

  return parsedDate.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusLabel(status: string | null) {
  if (status === "published") return "Published";
  if (status === "approved") return "Approved";
  if (status === "pending_review") return "Pending Review";
  if (status === "revision") return "Revision";
  return "Draft";
}

function getStatusBadge(status: string | null) {
  if (status === "published") return "bg-emerald-100 text-emerald-700";
  if (status === "approved") return "bg-blue-100 text-blue-700";
  if (status === "pending_review") return "bg-yellow-100 text-yellow-700";
  if (status === "revision") return "bg-red-100 text-red-700";

  return "bg-slate-200 text-slate-700";
}

function getTeacherStatusBadge(status: string | null) {
  if (status === "inactive") return "bg-red-100 text-red-700";
  return "bg-emerald-100 text-emerald-700";
}

function getTeacherStatusLabel(status: string | null) {
  if (status === "inactive") return "Inactive";
  return "Active";
}

function genderLabel(gender?: string | null) {
  if (gender === "L") return "Laki-laki";
  if (gender === "P") return "Perempuan";
  return "-";
}

function cleanFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");
}

async function uploadTeacherDocument(
  file: File,
  teacherName: string,
  fieldKey: TeacherDocumentKey
) {
  const safeTeacherName = cleanFileName(teacherName || "teacher");
  const safeFileName = cleanFileName(file.name);
  const filePath = `${safeTeacherName}/${fieldKey}-${Date.now()}-${safeFileName}`;

  const { error } = await supabase.storage
    .from(TEACHER_DOCUMENT_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage
    .from(TEACHER_DOCUMENT_BUCKET)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

export default function KepalaSekolahTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [kbmReports, setKbmReports] = useState<KbmReport[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [form, setForm] = useState<TeacherForm>(initialForm);
  const [documentFiles, setDocumentFiles] = useState<
    Partial<Record<TeacherDocumentKey, File>>
  >({});
  const [errorMessage, setErrorMessage] = useState("");

  const [viewReportsTeacher, setViewReportsTeacher] = useState<Teacher | null>(
    null
  );
  const [assignTeacher, setAssignTeacher] = useState<Teacher | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  async function fetchTeachers() {
    const { data, error } = await supabase
      .from("teachers")
      .select(
        `
        id,
        user_id,
        teacher_code,
        full_name,
        email,
        phone,
        subjects,
        status,
        birth_place,
        birth_date,
        gender,
        religion,
        education_level,
        start_date,
        graduation,
        employment_status,
        ktp_url,
        family_card_url,
        diploma_url,
        photo_url,
        certificate_url
      `
      )
      .order("full_name", { ascending: true });

    if (error) {
      console.error(error.message);
      setErrorMessage(error.message);
      return;
    }

    setTeachers((data || []) as Teacher[]);
  }

  async function fetchStudents() {
    const { data, error } = await supabase
      .from("students")
      .select(
        `
        id,
        full_name,
        level,
        grade,
        nis,
        homeroom_teacher_id,
        teachers (
          id,
          full_name,
          email
        )
      `
      )
      .order("full_name", { ascending: true });

    if (error) {
      console.error(error.message);
      return;
    }

    const normalizedStudents: Student[] = (data || []).map((item) => {
      const teacherData = Array.isArray(item.teachers)
        ? item.teachers[0] || null
        : item.teachers || null;

      return {
        id: item.id,
        full_name: item.full_name,
        level: item.level,
        grade: item.grade,
        nis: item.nis,
        homeroom_teacher_id: item.homeroom_teacher_id,
        teachers: teacherData,
      };
    });

    setStudents(normalizedStudents);
  }

  async function fetchKbmReports() {
    const { data, error } = await supabase
      .from("kbm_reports")
      .select(
        `
        id,
        teacher_id,
        student_id,
        subject_id,
        report_date,
        class_level,
        semester,
        chapter,
        material_topic,
        learning_issue,
        solution,
        teacher_note,
        status,
        students (
          id,
          full_name,
          level,
          grade,
          nis
        ),
        subjects (
          id,
          name
        )
      `
      )
      .order("report_date", { ascending: false });

    if (error) {
      console.error(error.message);
      return;
    }

    const rows = (data || []) as KbmReportQueryResult[];

    const normalizedReports: KbmReport[] = rows.map((item) => {
      const student = normalizeRelation(item.students);
      const subject = normalizeRelation(item.subjects);

      return {
        id: item.id,
        teacher_id: item.teacher_id,
        student_id: item.student_id,
        subject_id: item.subject_id,
        report_date: item.report_date,
        class_level: item.class_level,
        semester: item.semester,
        chapter: item.chapter,
        material_topic: item.material_topic,
        learning_issue: item.learning_issue,
        solution: item.solution,
        teacher_note: item.teacher_note,
        status: item.status,
        student_name: student?.full_name || "-",
        student_level: student?.level || "-",
        student_grade: student?.grade || "-",
        student_nis: student?.nis || "-",
        subject_name: subject?.name || "-",
      };
    });

    setKbmReports(normalizedReports);
  }

  async function fetchAllData() {
    setLoading(true);
    setErrorMessage("");

    await Promise.all([fetchTeachers(), fetchStudents(), fetchKbmReports()]);

    setLoading(false);
  }

  useEffect(() => {
    fetchAllData();

    const channel = supabase
      .channel("kepala-teachers-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teachers" },
        () => fetchAllData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        () => fetchAllData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "kbm_reports" },
        () => fetchAllData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredTeachers = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return teachers.filter((teacher) => {
      const subjectText = normalizeSubjects(teacher.subjects)
        .join(" ")
        .toLowerCase();

      return (
        teacher.full_name.toLowerCase().includes(keyword) ||
        teacher.email?.toLowerCase().includes(keyword) ||
        teacher.phone?.toLowerCase().includes(keyword) ||
        teacher.teacher_code?.toLowerCase().includes(keyword) ||
        teacher.birth_place?.toLowerCase().includes(keyword) ||
        teacher.religion?.toLowerCase().includes(keyword) ||
        teacher.education_level?.toLowerCase().includes(keyword) ||
        teacher.graduation?.toLowerCase().includes(keyword) ||
        teacher.employment_status?.toLowerCase().includes(keyword) ||
        subjectText.includes(keyword)
      );
    });
  }, [teachers, search]);

  function getStudentCountByTeacher(teacherId: string) {
    return students.filter(
      (student) => student.homeroom_teacher_id === teacherId
    ).length;
  }

  function getReportCountByTeacher(teacherId: string) {
    return kbmReports.filter((report) => report.teacher_id === teacherId)
      .length;
  }

  function getReportsByTeacher(teacherId: string) {
    return kbmReports.filter((report) => report.teacher_id === teacherId);
  }

  function openCreateTeacherModal() {
    setEditingTeacher(null);
    setForm(initialForm);
    setDocumentFiles({});
    setErrorMessage("");
    setIsModalOpen(true);
  }

  function openEditTeacherModal(teacher: Teacher) {
    setEditingTeacher(teacher);
    setForm({
      full_name: teacher.full_name || "",
      email: teacher.email || "",
      phone: teacher.phone || "",
      teacher_code: teacher.teacher_code || "",
      subjects: normalizeSubjects(teacher.subjects).join(", "),
      status: teacher.status || "active",
      birth_place: teacher.birth_place || "",
      birth_date: teacher.birth_date || "",
      gender: teacher.gender || "",
      religion: teacher.religion || "",
      education_level: teacher.education_level || "",
      start_date: teacher.start_date || "",
      graduation: teacher.graduation || "",
      employment_status: teacher.employment_status || "Honor",
      ktp_url: teacher.ktp_url || "",
      family_card_url: teacher.family_card_url || "",
      diploma_url: teacher.diploma_url || "",
      photo_url: teacher.photo_url || "",
      certificate_url: teacher.certificate_url || "",
    });
    setDocumentFiles({});
    setErrorMessage("");
    setIsModalOpen(true);
  }

  function openAssignModal(teacher: Teacher) {
    const assignedStudentIds = students
      .filter((student) => student.homeroom_teacher_id === teacher.id)
      .map((student) => student.id);

    setAssignTeacher(teacher);
    setSelectedStudentIds(assignedStudentIds);
  }

  function toggleStudentSelection(studentId: string) {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  }

  async function handleSaveAssign() {
    if (!assignTeacher) return;

    setAssigning(true);

    try {
      const currentlyAssignedStudentIds = students
        .filter((student) => student.homeroom_teacher_id === assignTeacher.id)
        .map((student) => student.id);

      const toAssign = selectedStudentIds.filter(
        (studentId) => !currentlyAssignedStudentIds.includes(studentId)
      );

      const toUnassign = currentlyAssignedStudentIds.filter(
        (studentId) => !selectedStudentIds.includes(studentId)
      );

      if (toAssign.length > 0) {
        const { error } = await supabase
          .from("students")
          .update({
            homeroom_teacher_id: assignTeacher.id,
          })
          .in("id", toAssign);

        if (error) {
          throw new Error(error.message);
        }
      }

      if (toUnassign.length > 0) {
        const { error } = await supabase
          .from("students")
          .update({
            homeroom_teacher_id: null,
          })
          .in("id", toUnassign);

        if (error) {
          throw new Error(error.message);
        }
      }

      await fetchAllData();

      setAssignTeacher(null);
      setSelectedStudentIds([]);
    } catch (error) {
      if (error instanceof Error) {
        alert(`Gagal assign murid: ${error.message}`);
      } else {
        alert("Gagal assign murid.");
      }
    } finally {
      setAssigning(false);
    }
  }

  async function findOrCreateTeacherUser() {
    const email = form.email.trim().toLowerCase();

    const { data: existingUser, error: findError } = await supabase
      .from("users_profile")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    if (findError) {
      throw new Error(findError.message);
    }

    if (existingUser) {
      return existingUser.id;
    }

    const { data: newUser, error: insertError } = await supabase
      .from("users_profile")
      .insert({
        full_name: form.full_name.trim(),
        email,
        role: "guru",
        phone: form.phone.trim() || null,
        is_active: form.status === "active",
      })
      .select("id")
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    return newUser.id;
  }

  async function updateTeacherUserProfile(teacher: Teacher) {
    if (!teacher.user_id) return;

    const { error } = await supabase
      .from("users_profile")
      .update({
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || null,
        is_active: form.status === "active",
      })
      .eq("id", teacher.user_id);

    if (error) {
      throw new Error(error.message);
    }
  }

  async function handleSubmitTeacher(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (!form.full_name.trim()) {
      setErrorMessage("Nama guru wajib diisi.");
      return;
    }

    if (!form.email.trim()) {
      setErrorMessage("Email guru wajib diisi.");
      return;
    }

    if (!form.teacher_code.trim()) {
      setErrorMessage("Kode guru wajib diisi.");
      return;
    }

    if (!form.subjects.trim()) {
      setErrorMessage("Mata pelajaran wajib diisi.");
      return;
    }

    setSaving(true);

    try {
      const subjectList = form.subjects
        .split(",")
        .map((subject) => subject.trim())
        .filter(Boolean);

      const uploadedUrls: Partial<Record<TeacherDocumentKey, string>> = {};

      for (const field of teacherDocumentFields) {
        const file = documentFiles[field.key];

        if (file) {
          uploadedUrls[field.key] = await uploadTeacherDocument(
            file,
            form.full_name,
            field.key
          );
        }
      }

      const teacherPayload = {
        teacher_code: form.teacher_code.trim(),
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || null,
        subjects: subjectList,
        status: form.status,
        birth_place: form.birth_place.trim() || null,
        birth_date: form.birth_date || null,
        gender: form.gender || null,
        religion: form.religion || null,
        education_level: form.education_level || null,
        start_date: form.start_date || null,
        graduation: form.graduation.trim() || null,
        employment_status: form.employment_status || null,
        ktp_url: uploadedUrls.ktp_url || form.ktp_url || null,
        family_card_url:
          uploadedUrls.family_card_url || form.family_card_url || null,
        diploma_url: uploadedUrls.diploma_url || form.diploma_url || null,
        photo_url: uploadedUrls.photo_url || form.photo_url || null,
        certificate_url:
          uploadedUrls.certificate_url || form.certificate_url || null,
        updated_at: new Date().toISOString(),
      };

      if (editingTeacher) {
        await updateTeacherUserProfile(editingTeacher);

        const { error } = await supabase
          .from("teachers")
          .update(teacherPayload)
          .eq("id", editingTeacher.id);

        if (error) {
          throw new Error(error.message);
        }
      } else {
        const userId = await findOrCreateTeacherUser();

        const { error } = await supabase.from("teachers").insert({
          ...teacherPayload,
          user_id: userId,
        });

        if (error) {
          throw new Error(error.message);
        }
      }

      setForm(initialForm);
      setDocumentFiles({});
      setEditingTeacher(null);
      setIsModalOpen(false);
      await fetchAllData();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal menyimpan data guru.");
      }
    } finally {
      setSaving(false);
    }
  }

  function closeModal() {
    setIsModalOpen(false);
    setErrorMessage("");
    setEditingTeacher(null);
    setForm(initialForm);
    setDocumentFiles({});
  }

  return (
    <KepalaSekolahLayout
      activeMenu="Guru"
      searchPlaceholder="Cari guru, kode, email, mapel, agama, atau status..."
      buttonLabel="+ Tambah Guru"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-bold tracking-tight">
            Teacher Management
          </h1>
          <p className="mt-1 text-sm text-[#6B4A3A]">
            Kelola data guru, dokumen guru, dan assign ke murid.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateTeacherModal}
          className="rounded-xl bg-[#7A1F2B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#54131D]"
        >
          + Add Teacher
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari nama guru, kode guru, email, agama, status, atau mata pelajaran..."
          className="w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
        />
      </div>

      {errorMessage && !isModalOpen && (
        <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {loading && (
        <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-8 text-center text-sm shadow-sm">
          Loading data guru...
        </div>
      )}

      {!loading && filteredTeachers.length === 0 && (
        <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-8 text-center text-sm shadow-sm">
          Belum ada data guru.
        </div>
      )}

      {!loading && filteredTeachers.length > 0 && (
        <div className="mt-7 grid gap-5 xl:grid-cols-3 md:grid-cols-2 grid-cols-1">
          {filteredTeachers.map((teacher) => {
            const subjects = normalizeSubjects(teacher.subjects);
            const studentCount = getStudentCountByTeacher(teacher.id);
            const reportCount = getReportCountByTeacher(teacher.id);
            const documentCount = teacherDocumentFields.filter(
              (field) => teacher[field.key]
            ).length;

            return (
              <div
                key={teacher.id}
                className="overflow-hidden rounded-2xl border border-[#E8D6C1] bg-white shadow-sm"
              >
                <div className="h-[70px] bg-gradient-to-r from-[#7A1F2B] to-[#D96B2B]" />

                <div className="px-6 pb-6">
                  <div className="-mt-9 flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-white bg-[#FDE7D7] text-lg font-bold text-[#7A1F2B] shadow-sm">
                    {getInitials(teacher.full_name)}
                  </div>

                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2
                        className="truncate text-xl font-bold"
                        title={teacher.full_name}
                      >
                        {teacher.full_name}
                      </h2>
                      <p className="mt-1 truncate text-sm text-[#6B4A3A]">
                        {teacher.email || "-"}
                      </p>
                      <p className="mt-1 text-xs text-[#9B8175]">
                        {teacher.teacher_code || "-"} • {teacher.phone || "-"}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${getTeacherStatusBadge(
                        teacher.status
                      )}`}
                    >
                      {getTeacherStatusLabel(teacher.status)}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-2 rounded-2xl bg-[#FFF8EF] p-4 text-sm text-[#6B4A3A]">
                    <InfoLine label="JK" value={genderLabel(teacher.gender)} />
                    <InfoLine label="Agama" value={teacher.religion || "-"} />
                    <InfoLine
                      label="Pendidikan"
                      value={teacher.education_level || "-"}
                    />
                    <InfoLine
                      label="Status Guru"
                      value={teacher.employment_status || "-"}
                    />
                    <InfoLine
                      label="Mulai Masuk"
                      value={formatDate(teacher.start_date)}
                    />
                    <InfoLine label="Lulusan" value={teacher.graduation || "-"} />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {subjects.length > 0 ? (
                      subjects.map((subject) => (
                        <span
                          key={`${teacher.id}-${subject}`}
                          className="rounded-full bg-[#F1DFD5] px-3 py-1 text-xs font-bold text-[#7A1F2B]"
                        >
                          {subject}
                        </span>
                      ))
                    ) : (
                      <span className="rounded-full bg-[#F1DFD5] px-3 py-1 text-xs font-bold text-[#7A1F2B]">
                        Belum ada mapel
                      </span>
                    )}
                  </div>

                  <div className="mt-6 grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-[#FFF8EF] p-4">
                      <p className="text-xs text-[#6B4A3A]">Murid</p>
                      <p className="mt-2 text-2xl font-bold">{studentCount}</p>
                    </div>

                    <div className="rounded-xl bg-[#FFF8EF] p-4">
                      <p className="text-xs text-[#6B4A3A]">Reports</p>
                      <p className="mt-2 text-2xl font-bold">{reportCount}</p>
                    </div>

                    <div className="rounded-xl bg-[#FFF8EF] p-4">
                      <p className="text-xs text-[#6B4A3A]">Dokumen</p>
                      <p className="mt-2 text-2xl font-bold">{documentCount}/5</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setViewReportsTeacher(teacher)}
                      className="rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] px-4 py-2 text-sm font-bold transition hover:bg-white"
                    >
                      View Reports
                    </button>

                    <button
                      type="button"
                      onClick={() => openAssignModal(teacher)}
                      className="rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] px-4 py-2 text-sm font-bold transition hover:bg-white"
                    >
                      Assign
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => openEditTeacherModal(teacher)}
                    className="mt-3 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-2 text-sm font-bold text-[#7A1F2B] transition hover:bg-[#FFF8EF]"
                  >
                    Edit Profile Guru
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold">Assignment Matrix</h2>
        <p className="mt-1 text-sm text-[#6B4A3A]">
          Daftar murid dan guru pendamping yang sedang aktif.
        </p>

        <div className="mt-5 overflow-hidden rounded-xl border border-[#E8D6C1]">
          <table className="w-full text-left">
            <thead className="bg-[#FFF8EF] text-xs uppercase text-[#6B4A3A]">
              <tr>
                <th className="px-5 py-4">Murid</th>
                <th className="px-5 py-4">Level</th>
                <th className="px-5 py-4">NIPD</th>
                <th className="px-5 py-4">Guru Pendamping</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E8D6C1]">
              {students.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-sm">
                    Belum ada data murid.
                  </td>
                </tr>
              )}

              {students.map((student) => (
                <tr key={student.id} className="hover:bg-[#FFF8EF]">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FDE7D7] text-xs font-bold text-[#7A1F2B]">
                        {getInitials(student.full_name)}
                      </div>

                      <p className="font-bold">{student.full_name}</p>
                    </div>
                  </td>

                  <td className="px-5 py-4 text-sm text-[#6B4A3A]">
                    {student.level || "-"}
                    {student.grade ? ` — ${student.grade}` : ""}
                  </td>

                  <td className="px-5 py-4 text-sm text-[#6B4A3A]">
                    {student.nis || "-"}
                  </td>

                  <td className="px-5 py-4">
                    <span className="rounded-full border border-[#D96B2B] px-4 py-2 text-xs font-bold text-[#D96B2B]">
                      {student.teachers?.full_name || "Belum assigned"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
          <div className="flex max-h-[90vh] w-full max-w-[900px] flex-col overflow-hidden rounded-2xl bg-[#FAF3EA] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E8D6C1] px-6 py-5">
              <div>
                <h2 className="text-xl font-bold">
                  {editingTeacher ? "Edit Profile Guru" : "Tambah Guru Baru"}
                </h2>
                <p className="mt-1 text-sm text-[#6B4A3A]">
                  Lengkapi data guru sesuai format HSTKB.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="text-2xl leading-none text-[#6B4A3A] hover:text-[#7A1F2B]"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5">
              {errorMessage && (
                <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleSubmitTeacher} className="space-y-5">
                <div className="rounded-2xl border border-[#E8D6C1] bg-white p-5">
                  <h3 className="font-bold text-[#2B1B18]">Data Utama Guru</h3>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <FormInput
                      label="Nama Guru"
                      value={form.full_name}
                      placeholder="Contoh: Ms. Clara"
                      onChange={(value) =>
                        setForm((prev) => ({ ...prev, full_name: value }))
                      }
                    />

                    <FormInput
                      label="Email"
                      value={form.email}
                      placeholder="clara@hstkb.id"
                      type="email"
                      onChange={(value) =>
                        setForm((prev) => ({ ...prev, email: value }))
                      }
                    />

                    <FormInput
                      label="Nomor HP"
                      value={form.phone}
                      placeholder="0812xxxx"
                      onChange={(value) =>
                        setForm((prev) => ({ ...prev, phone: value }))
                      }
                    />

                    <FormInput
                      label="Kode Guru"
                      value={form.teacher_code}
                      placeholder="TCH-003"
                      onChange={(value) =>
                        setForm((prev) => ({ ...prev, teacher_code: value }))
                      }
                    />

                    <FormInput
                      label="Tempat Lahir"
                      value={form.birth_place}
                      placeholder="Contoh: Jakarta"
                      onChange={(value) =>
                        setForm((prev) => ({ ...prev, birth_place: value }))
                      }
                    />

                    <div>
                      <label className="text-sm font-bold">Tanggal Lahir</label>
                      <input
                        type="date"
                        value={form.birth_date}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            birth_date: event.target.value,
                          }))
                        }
                        className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-bold">Jenis Kelamin</label>
                      <select
                        value={form.gender}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            gender: event.target.value,
                          }))
                        }
                        className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                      >
                        <option value="">Pilih jenis kelamin</option>
                        {genderOptions
                          .filter((gender) => gender !== "")
                          .map((gender) => (
                            <option key={gender} value={gender}>
                              {gender === "L" ? "Laki-laki" : "Perempuan"}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-bold">Agama</label>
                      <select
                        value={form.religion}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            religion: event.target.value,
                          }))
                        }
                        className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                      >
                        <option value="">Pilih agama</option>
                        {religionOptions
                          .filter((religion) => religion !== "")
                          .map((religion) => (
                            <option key={religion} value={religion}>
                              {religion}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-bold">Pendidikan</label>
                      <select
                        value={form.education_level}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            education_level: event.target.value,
                          }))
                        }
                        className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                      >
                        <option value="">Pilih pendidikan</option>
                        {educationOptions
                          .filter((education) => education !== "")
                          .map((education) => (
                            <option key={education} value={education}>
                              {education}
                            </option>
                          ))}
                      </select>
                    </div>

                    <FormInput
                      label="Lulusan"
                      value={form.graduation}
                      placeholder="Contoh: Universitas Terbuka"
                      onChange={(value) =>
                        setForm((prev) => ({ ...prev, graduation: value }))
                      }
                    />

                    <div>
                      <label className="text-sm font-bold">
                        Mulai Masuk HSTKB
                      </label>
                      <input
                        type="date"
                        value={form.start_date}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            start_date: event.target.value,
                          }))
                        }
                        className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-bold">Status Guru</label>
                      <select
                        value={form.employment_status}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            employment_status: event.target.value,
                          }))
                        }
                        className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                      >
                        {employmentStatusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-bold">Status Akun</label>
                      <select
                        value={form.status}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            status: event.target.value,
                          }))
                        }
                        className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-sm font-bold">
                        Bidang Studi yang Diampu
                      </label>
                      <textarea
                        value={form.subjects}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            subjects: event.target.value,
                          }))
                        }
                        placeholder="Contoh: MTK kelas 1, 2, 3, Bahasa Indonesia kelas 1, 2, 3"
                        rows={4}
                        className="mt-2 w-full resize-none rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                      />
                      <p className="mt-1 text-xs text-[#6B4A3A]">
                        Pisahkan dengan koma, contoh: Math, Science, Reading
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E8D6C1] bg-white p-5">
                  <h3 className="font-bold text-[#2B1B18]">Dokumen Guru</h3>
                  <p className="mt-1 text-sm text-[#6B4A3A]">
                    Upload KTP, KK, Ijazah, Foto, dan Sertifikat guru.
                  </p>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {teacherDocumentFields.map((field) => (
                      <TeacherDocumentUploadBox
                        key={field.key}
                        label={field.label}
                        accept={field.accept}
                        currentUrl={form[field.key]}
                        fileName={documentFiles[field.key]?.name || ""}
                        onChange={(file) =>
                          setDocumentFiles((prev) => ({
                            ...prev,
                            [field.key]: file || undefined,
                          }))
                        }
                      />
                    ))}
                  </div>
                </div>

                <div className="sticky bottom-0 -mx-6 mt-5 border-t border-[#E8D6C1] bg-[#FAF3EA] px-6 pb-1 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-xl bg-[#7A1F2B] py-3 text-sm font-bold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving
                      ? "Menyimpan..."
                      : editingTeacher
                      ? "Update Guru"
                      : "Simpan Guru"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {viewReportsTeacher ? (
        <ViewReportsModal
          teacher={viewReportsTeacher}
          reports={getReportsByTeacher(viewReportsTeacher.id)}
          onClose={() => setViewReportsTeacher(null)}
        />
      ) : null}

      {assignTeacher ? (
        <AssignModal
          teacher={assignTeacher}
          students={students}
          selectedStudentIds={selectedStudentIds}
          assigning={assigning}
          onToggleStudent={toggleStudentSelection}
          onClose={() => {
            setAssignTeacher(null);
            setSelectedStudentIds([]);
          }}
          onSave={handleSaveAssign}
        />
      ) : null}
    </KepalaSekolahLayout>
  );
}

function ViewReportsModal({
  teacher,
  reports,
  onClose,
}: {
  teacher: Teacher;
  reports: KbmReport[];
  onClose: () => void;
}) {
  return (
    <ModalShell
      title="Laporan KBM Guru"
      subtitle={`${teacher.full_name} • ${reports.length} laporan`}
      onClose={onClose}
      maxWidth="max-w-[900px]"
    >
      {reports.length === 0 ? (
        <div className="rounded-2xl border border-[#E8D6C1] bg-white p-8 text-center text-sm text-[#6B4A3A]">
          Belum ada laporan KBM untuk guru ini.
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="rounded-2xl border border-[#E8D6C1] bg-white p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-[#2B1B18]">
                    {report.student_name}
                  </h3>

                  <p className="mt-1 text-sm text-[#6B4A3A]">
                    {report.student_level} {report.student_grade} •{" "}
                    {report.subject_name} • {formatDate(report.report_date)}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusBadge(
                    report.status
                  )}`}
                >
                  {getStatusLabel(report.status)}
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <ReportInfo label="Semester" value={report.semester || "-"} />
                <ReportInfo label="BAB" value={report.chapter || "-"} />
                <ReportInfo
                  label="Materi"
                  value={report.material_topic || "-"}
                />
                <ReportInfo label="NIS" value={report.student_nis || "-"} />
              </div>

              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <p className="font-bold text-[#2B1B18]">Masalah / Kendala</p>
                  <p className="mt-1 whitespace-pre-line leading-6 text-[#6B4A3A]">
                    {report.learning_issue || "-"}
                  </p>
                </div>

                <div>
                  <p className="font-bold text-[#2B1B18]">Solusi</p>
                  <p className="mt-1 whitespace-pre-line leading-6 text-[#6B4A3A]">
                    {report.solution || "-"}
                  </p>
                </div>

                <div>
                  <p className="font-bold text-[#2B1B18]">Catatan Guru</p>
                  <p className="mt-1 whitespace-pre-line leading-6 text-[#6B4A3A]">
                    {report.teacher_note || "-"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  );
}

function AssignModal({
  teacher,
  students,
  selectedStudentIds,
  assigning,
  onToggleStudent,
  onClose,
  onSave,
}: {
  teacher: Teacher;
  students: Student[];
  selectedStudentIds: string[];
  assigning: boolean;
  onToggleStudent: (studentId: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <ModalShell
      title="Assign Murid ke Guru"
      subtitle={`${teacher.full_name} • pilih murid yang menjadi dampingan`}
      onClose={onClose}
      maxWidth="max-w-[780px]"
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-[#E8D6C1] bg-white p-4 text-sm text-[#6B4A3A]">
          Centang murid yang ingin di-assign ke guru ini. Jika centang dilepas,
          murid akan dilepaskan dari guru pendamping ini.
        </div>

        <div className="max-h-[460px] overflow-y-auto rounded-2xl border border-[#E8D6C1] bg-white">
          {students.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#6B4A3A]">
              Belum ada data murid.
            </div>
          ) : (
            <div className="divide-y divide-[#E8D6C1]">
              {students.map((student) => {
                const checked = selectedStudentIds.includes(student.id);
                const assignedToOtherTeacher =
                  student.homeroom_teacher_id &&
                  student.homeroom_teacher_id !== teacher.id;

                return (
                  <label
                    key={student.id}
                    className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 transition hover:bg-[#FFF8EF]"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleStudent(student.id)}
                        className="h-4 w-4 accent-[#7A1F2B]"
                      />

                      <div>
                        <p className="font-bold text-[#2B1B18]">
                          {student.full_name}
                        </p>
                        <p className="mt-1 text-xs text-[#6B4A3A]">
                          {student.level || "-"}
                          {student.grade ? ` — ${student.grade}` : ""} • NIPD:{" "}
                          {student.nis || "-"}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      {assignedToOtherTeacher ? (
                        <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-700">
                          Assigned: {student.teachers?.full_name || "-"}
                        </span>
                      ) : checked ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                          Dipilih
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                          Belum dipilih
                        </span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl border border-[#E8D6C1] bg-white text-sm font-bold text-[#7A1F2B] transition hover:bg-[#FFF8EF]"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={assigning}
            className="h-11 rounded-xl bg-[#7A1F2B] text-sm font-bold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {assigning ? "Menyimpan..." : "Simpan Assign"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function ModalShell({
  title,
  subtitle,
  children,
  onClose,
  maxWidth = "max-w-[720px]",
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  onClose: () => void;
  maxWidth?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
      <div
        className={`flex max-h-[88vh] w-full ${maxWidth} flex-col overflow-hidden rounded-2xl bg-[#FAF3EA] shadow-2xl`}
      >
        <div className="flex items-center justify-between border-b border-[#E8D6C1] px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-[#2B1B18]">{title}</h2>
            <p className="mt-1 text-sm text-[#6B4A3A]">{subtitle}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-[#6B4A3A] hover:text-[#7A1F2B]"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function ReportInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#FFF8EF] p-3 text-sm">
      <p className="text-[#6B4A3A]">{label}</p>
      <p className="mt-1 font-bold text-[#2B1B18]">{value}</p>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-bold text-[#6B4A3A]">{label}</span>
      <span className="truncate text-right text-xs font-bold text-[#2B1B18]">
        {value}
      </span>
    </div>
  );
}

function FormInput({
  label,
  value,
  placeholder,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-sm font-bold">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
      />
    </div>
  );
}

function TeacherDocumentUploadBox({
  label,
  accept,
  currentUrl,
  fileName,
  onChange,
}: {
  label: string;
  accept: string;
  currentUrl: string;
  fileName: string;
  onChange: (file: File | null) => void;
}) {
  return (
    <div className="rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-bold text-[#6F5549]">{label}</p>

          {currentUrl ? (
            <a
              href={currentUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-[12px] font-bold text-[#158A58] underline"
            >
              <FileText className="h-3.5 w-3.5" />
              Lihat file saat ini
            </a>
          ) : (
            <p className="mt-1 text-[12px] text-[#D11A2A]">Belum ada file</p>
          )}
        </div>
      </div>

      <label className="mt-3 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#DCC8B6] bg-white px-4 text-[13px] font-bold text-[#7A1F2B] transition hover:bg-[#F7EDE2]">
        <UploadCloud className="h-4 w-4" />
        Ganti / Upload File
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => onChange(event.target.files?.[0] || null)}
        />
      </label>

      <p className="mt-2 truncate text-[12px] text-[#7D5E50]">
        {fileName || "Belum pilih file baru"}
      </p>
    </div>
  );
}
