"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Search, Trash2, UploadCloud, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import KepalaSekolahLayout from "../components/KepalaSekolahLayout";

const STUDENT_DOCUMENT_BUCKET = "student-documents";

type DocumentKey =
  | "family_card_url"
  | "diploma_url"
  | "father_ktp_url"
  | "mother_ktp_url"
  | "report_card_url"
  | "student_photo_url"
  | "registration_form_url"
  | "skkb_url"
  | "birth_certificate_url";

type StudentRow = {
  id: string;
  full_name: string;
  nis: string;
  nisn: string;
  level: string;
  grade: string;
  academic_year: string;
  birth_date: string;
  birth_place: string;
  gender: string;
  religion: string;
  parent_id?: string | null;
  homeroom_teacher_id?: string | null;
  parent_name: string;
  teacher_name: string;
  progress: number;
  attendance: number;
};

type ParentRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
};

type TeacherRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  teacher_code: string | null;
};

type StudentForm = {
  full_name: string;
  nis: string;
  nisn: string;
  level: string;
  grade: string;
  academic_year: string;
  birth_date: string;
  birth_place: string;
  gender: string;
  religion: string;
  parent_id: string;
  homeroom_teacher_id: string;
  description: string;
};

const initialForm: StudentForm = {
  full_name: "",
  nis: "",
  nisn: "",
  level: "Primary Level",
  grade: "Grade 4",
  academic_year: "2026/2027",
  birth_date: "",
  birth_place: "",
  gender: "",
  religion: "",
  parent_id: "",
  homeroom_teacher_id: "",
  description: "",
};

const documentFields: Array<{
  key: DocumentKey;
  label: string;
  accept: string;
}> = [
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
  {
    key: "father_ktp_url",
    label: "KTP Ayah",
    accept: ".pdf,.jpg,.jpeg,.png",
  },
  {
    key: "mother_ktp_url",
    label: "KTP Ibu",
    accept: ".pdf,.jpg,.jpeg,.png",
  },
  {
    key: "report_card_url",
    label: "Raport",
    accept: ".pdf,.jpg,.jpeg,.png,.doc,.docx",
  },
  {
    key: "student_photo_url",
    label: "Foto",
    accept: ".jpg,.jpeg,.png,.webp",
  },
  {
    key: "registration_form_url",
    label: "Formulir",
    accept: ".pdf,.jpg,.jpeg,.png,.doc,.docx",
  },
  {
    key: "skkb_url",
    label: "SKKB",
    accept: ".pdf,.jpg,.jpeg,.png,.doc,.docx",
  },
  {
    key: "birth_certificate_url",
    label: "Akte",
    accept: ".pdf,.jpg,.jpeg,.png,.doc,.docx",
  },
];

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

function getInitials(name: string) {
  if (!name) return "S";

  const words = name.trim().split(" ").filter(Boolean);

  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }

  return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
}

function formatBirthDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function clampPercent(value: number) {
  if (Number.isNaN(value)) return 0;

  return Math.max(0, Math.min(100, Math.round(value)));
}

function levelLabel(level?: string | null, grade?: string | null) {
  const safeLevel = level?.trim() || "Program Belum Diisi";
  const safeGrade = grade?.trim() || "-";

  return `${safeLevel} — ${safeGrade}`;
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

async function uploadStudentDocument(
  file: File,
  studentName: string,
  fieldKey: DocumentKey
) {
  const safeStudentName = cleanFileName(studentName || "student");
  const safeFileName = cleanFileName(file.name);
  const filePath = `${safeStudentName}/${fieldKey}-${Date.now()}-${safeFileName}`;

  const { error } = await supabase.storage
    .from(STUDENT_DOCUMENT_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage
    .from(STUDENT_DOCUMENT_BUCKET)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

export default function KepalaSekolahStudentsPage() {
  const router = useRouter();

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [parents, setParents] = useState<ParentRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<StudentForm>(initialForm);
  const [documentFiles, setDocumentFiles] = useState<
    Partial<Record<DocumentKey, File>>
  >({});
  const [formError, setFormError] = useState("");

  async function fetchAllData() {
    setLoading(true);

    const [studentsRes, parentsRes, teachersRes, reportsRes, attendanceRes] =
      await Promise.all([
        supabase
          .from("students")
          .select("*")
          .order("full_name", { ascending: true }),

        supabase
          .from("parents")
          .select("*")
          .order("full_name", { ascending: true }),

        supabase
          .from("teachers")
          .select("*")
          .order("full_name", { ascending: true }),

        supabase.from("academic_reports").select("*"),

        supabase.from("attendance").select("*"),
      ]);

    const studentsData = studentsRes.data ?? [];
    const parentsData = parentsRes.data ?? [];
    const teachersData = teachersRes.data ?? [];
    const reportsData = reportsRes.data ?? [];
    const attendanceData = attendanceRes.data ?? [];

    setParents(parentsData as ParentRow[]);
    setTeachers(teachersData as TeacherRow[]);

    const parentMap = new Map<string, any>();
    const teacherMap = new Map<string, any>();

    parentsData.forEach((parent: any) => {
      if (parent?.id) parentMap.set(String(parent.id), parent);
    });

    teachersData.forEach((teacher: any) => {
      if (teacher?.id) teacherMap.set(String(teacher.id), teacher);
    });

    const reportByStudent = new Map<string, any[]>();

    reportsData.forEach((report: any) => {
      const studentId = String(report.student_id ?? "");

      if (!studentId) return;

      if (!reportByStudent.has(studentId)) {
        reportByStudent.set(studentId, []);
      }

      reportByStudent.get(studentId)?.push(report);
    });

    const attendanceByStudent = new Map<string, any[]>();

    attendanceData.forEach((attendance: any) => {
      const studentId = String(attendance.student_id ?? "");

      if (!studentId) return;

      if (!attendanceByStudent.has(studentId)) {
        attendanceByStudent.set(studentId, []);
      }

      attendanceByStudent.get(studentId)?.push(attendance);
    });

    const mappedStudents: StudentRow[] = studentsData.map((student: any) => {
      const parent =
        parentMap.get(String(student.parent_id ?? "")) ??
        parentMap.get(String(student.parentId ?? ""));

      const teacher =
        teacherMap.get(String(student.homeroom_teacher_id ?? "")) ??
        teacherMap.get(String(student.teacher_id ?? "")) ??
        teacherMap.get(String(student.homeroomTeacherId ?? ""));

      const studentReports = reportByStudent.get(String(student.id)) ?? [];
      const studentAttendance = attendanceByStudent.get(String(student.id)) ?? [];

      const finalScores = studentReports
        .map((report: any) => Number(report.final_score ?? report.score ?? 0))
        .filter((score: number) => !Number.isNaN(score) && score > 0);

      const progress =
        finalScores.length > 0
          ? clampPercent(
              finalScores.reduce(
                (sum: number, value: number) => sum + value,
                0
              ) / finalScores.length
            )
          : Number(student.progress ?? 0);

      const hadirCount = studentAttendance.filter((attendance: any) => {
        const status = String(
          attendance.attendance_status ?? attendance.status ?? ""
        ).toLowerCase();

        return status === "hadir" || status === "present";
      }).length;

      const attendance =
        studentAttendance.length > 0
          ? clampPercent((hadirCount / studentAttendance.length) * 100)
          : Number(student.attendance ?? 0);

      return {
        id: String(student.id),
        full_name: student.full_name ?? student.name ?? "Tanpa Nama",
        nis: student.nis ?? "-",
        nisn: student.nisn ?? "-",
        level: student.level ?? student.program ?? "Program",
        grade: student.grade ?? student.class_level ?? "-",
        academic_year: student.academic_year ?? "-",
        birth_date:
          student.birth_date ??
          student.date_of_birth ??
          student.dob ??
          student.birthdate ??
          "",
        birth_place: student.birth_place ?? "",
        gender: student.gender ?? "",
        religion: student.religion ?? "",
        parent_id: student.parent_id ?? null,
        homeroom_teacher_id: student.homeroom_teacher_id ?? null,
        parent_name: parent?.full_name ?? parent?.name ?? "-",
        teacher_name: teacher?.full_name ?? teacher?.name ?? "-",
        progress: clampPercent(Number(progress)),
        attendance: clampPercent(Number(attendance)),
      };
    });

    setStudents(mappedStudents);
    setLoading(false);
  }

  useEffect(() => {
    fetchAllData();

    const channel = supabase
      .channel("kepala-sekolah-students-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        fetchAllData
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "parents" },
        fetchAllData
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teachers" },
        fetchAllData
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "academic_reports" },
        fetchAllData
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance" },
        fetchAllData
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredStudents = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (!query) return students;

    return students.filter((student) => {
      return (
        student.full_name.toLowerCase().includes(query) ||
        student.nis.toLowerCase().includes(query) ||
        student.nisn.toLowerCase().includes(query) ||
        student.parent_name.toLowerCase().includes(query) ||
        student.teacher_name.toLowerCase().includes(query) ||
        student.level.toLowerCase().includes(query) ||
        student.grade.toLowerCase().includes(query) ||
        student.birth_place.toLowerCase().includes(query) ||
        student.gender.toLowerCase().includes(query) ||
        student.religion.toLowerCase().includes(query)
      );
    });
  }, [students, search]);

  function openAddModal() {
    setForm(initialForm);
    setDocumentFiles({});
    setFormError("");
    setShowAddModal(true);
  }

  function closeAddModal() {
    if (saving) return;

    setShowAddModal(false);
    setForm(initialForm);
    setDocumentFiles({});
    setFormError("");
  }

  async function handleSaveStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setFormError("");

    if (!form.full_name.trim()) {
      setFormError("Nama siswa wajib diisi.");
      return;
    }

    if (!form.nis.trim()) {
      setFormError("NIPD wajib diisi.");
      return;
    }

    if (!form.parent_id) {
      setFormError("Orang tua wajib dipilih.");
      return;
    }

    if (!form.homeroom_teacher_id) {
      setFormError("Guru pendamping wajib dipilih.");
      return;
    }

    setSaving(true);

    try {
      const uploadedUrls: Partial<Record<DocumentKey, string>> = {};

      for (const field of documentFields) {
        const file = documentFiles[field.key];

        if (file) {
          uploadedUrls[field.key] = await uploadStudentDocument(
            file,
            form.full_name,
            field.key
          );
        }
      }

      const { error } = await supabase.from("students").insert({
        full_name: form.full_name.trim(),
        nis: form.nis.trim(),
        nisn: form.nisn.trim() || null,
        level: form.level,
        grade: form.grade,
        academic_year: form.academic_year,
        birth_date: form.birth_date || null,
        birth_place: form.birth_place.trim() || null,
        gender: form.gender || null,
        religion: form.religion || null,
        parent_id: form.parent_id,
        homeroom_teacher_id: form.homeroom_teacher_id,
        description: form.description.trim() || null,
        family_card_url: uploadedUrls.family_card_url || null,
        diploma_url: uploadedUrls.diploma_url || null,
        father_ktp_url: uploadedUrls.father_ktp_url || null,
        mother_ktp_url: uploadedUrls.mother_ktp_url || null,
        report_card_url: uploadedUrls.report_card_url || null,
        student_photo_url: uploadedUrls.student_photo_url || null,
        registration_form_url: uploadedUrls.registration_form_url || null,
        skkb_url: uploadedUrls.skkb_url || null,
        birth_certificate_url: uploadedUrls.birth_certificate_url || null,
        progress: 0,
        attendance: 0,
      });

      if (error) {
        setFormError(error.message);
        return;
      }

      setShowAddModal(false);
      setForm(initialForm);
      setDocumentFiles({});
      await fetchAllData();
    } catch (error) {
      if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError("Gagal menyimpan data siswa.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteStudent(studentId: string, studentName: string) {
    const confirmed = window.confirm(
      `Yakin mau hapus data siswa "${studentName}"?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("students")
      .delete()
      .eq("id", studentId);

    if (error) {
      alert(error.message);
      return;
    }

    await fetchAllData();
  }

  return (
    <KepalaSekolahLayout
      activeMenu="Siswa"
      searchPlaceholder="Cari siswa, NIPD, NISN, orang tua, atau guru..."
    >
      <section className="w-full max-w-full space-y-7 overflow-hidden">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-[#2B1B18]">
              Student Management
            </h1>
            <p className="mt-1 text-[15px] text-[#6F5549]">
              Kelola data murid Homeschooling HSTKB
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="flex h-[46px] items-center gap-3 rounded-2xl bg-[#9C0824] px-6 text-[15px] font-bold text-white shadow-sm transition hover:brightness-105"
          >
            <Plus className="h-4 w-4" />
            Add Student
          </button>
        </div>

        <div className="rounded-[22px] border border-[#E1CFBE] bg-white/60 p-4 shadow-[0_4px_14px_rgba(77,31,9,0.05)]">
          <div className="relative max-w-[400px]">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8E6A58]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari murid..."
              className="h-[38px] w-full rounded-[14px] border border-[#DCC8B6] bg-[#FBF8F4] pl-11 pr-4 text-[15px] outline-none placeholder:text-[#9A7B6C]"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-[22px] border border-[#E1CFBE] bg-white shadow-[0_4px_14px_rgba(77,31,9,0.05)]">
          <div className="grid grid-cols-[2.1fr_2.1fr_1.5fr_1.3fr_0.85fr_0.9fr_0.55fr] gap-3 border-b border-[#EADACA] px-4 py-4 text-[12px] font-bold text-[#6F5549]">
            <div>Murid</div>
            <div>Level / Program</div>
            <div>Orang Tua</div>
            <div>Guru</div>
            <div>Progress</div>
            <div>Attendance</div>
            <div className="text-right">Aksi</div>
          </div>

          {loading ? (
            <div className="px-5 py-12 text-center text-[#7D5E50]">
              Memuat data siswa...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="px-5 py-12 text-center text-[#7D5E50]">
              Belum ada data siswa.
            </div>
          ) : (
            filteredStudents.map((student) => (
              <div
                key={student.id}
                className="grid grid-cols-[2.1fr_2.1fr_1.5fr_1.3fr_0.85fr_0.9fr_0.55fr] gap-3 border-b border-[#F1E5DA] px-4 py-4 last:border-b-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F3E1D6] text-[14px] font-bold text-[#8E2333]">
                    {getInitials(student.full_name)}
                  </div>

                  <div className="min-w-0">
                    <p
                      className="max-w-[210px] truncate text-[14px] font-bold leading-5 text-[#2C1A17]"
                      title={student.full_name}
                    >
                      {student.full_name}
                    </p>
                    <p className="mt-0.5 text-[12px] text-[#7A5E52]">
                      {formatBirthDate(student.birth_date)}
                      {student.birth_place ? ` • ${student.birth_place}` : ""}
                    </p>
                    <p className="mt-0.5 text-[12px] text-[#7A5E52]">
                      NIPD: {student.nis || "-"} • JK: {genderLabel(student.gender)} • Agama:{" "}
                      {student.religion || "-"}
                    </p>
                  </div>
                </div>

                <div className="min-w-0 self-center">
                  <p
                    className="max-w-[240px] truncate text-[14px] font-semibold leading-5 text-[#2C1A17]"
                    title={levelLabel(student.level, student.grade)}
                  >
                    {levelLabel(student.level, student.grade)}
                  </p>
                  <p className="mt-1 truncate text-[12px] text-[#7A5E52]">
                    {student.level || "-"}
                  </p>
                </div>

                <div className="flex min-w-0 items-center">
                  <p
                    className="max-w-[170px] truncate text-[14px] text-[#2C1A17]"
                    title={student.parent_name}
                  >
                    {student.parent_name}
                  </p>
                </div>

                <div className="flex min-w-0 items-center">
                  <p
                    className="max-w-[150px] truncate text-[14px] text-[#2C1A17]"
                    title={student.teacher_name}
                  >
                    {student.teacher_name}
                  </p>
                </div>

                <div className="flex items-center">
                  <span className="rounded-full bg-[#C7F0DA] px-3 py-1 text-[12px] font-bold text-[#158A58]">
                    {student.progress}%
                  </span>
                </div>

                <div className="flex items-center">
                  <span className="rounded-full bg-[#D7ECFA] px-3 py-1 text-[12px] font-bold text-[#1779B8]">
                    {student.attendance}%
                  </span>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() =>
                      router.push(`/kepalaSekolah/students/${student.id}/edit`)
                    }
                    className="text-[#4A2E28] transition hover:text-[#9C0824]"
                    title="Edit"
                    type="button"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() =>
                      handleDeleteStudent(student.id, student.full_name)
                    }
                    className="text-[#D11A2A] transition hover:opacity-80"
                    title="Hapus"
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {showAddModal ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/45 px-4 py-8">
          <div className="mx-auto w-full max-w-[900px] overflow-hidden rounded-[24px] bg-[#FFF8EF] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E8D7C5] px-6 py-5">
              <div>
                <h2 className="text-[22px] font-bold text-[#2C1A17]">
                  Add Student
                </h2>
                <p className="mt-1 text-[14px] text-[#7D5E50]">
                  Tambahkan data siswa baru ke sistem HSTKB.
                </p>
              </div>

              <button
                onClick={closeAddModal}
                className="flex h-10 w-10 items-center justify-center rounded-full text-[#7D5E50] transition hover:bg-[#F0E2D4] hover:text-[#9C0824]"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="px-6 py-6">
              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-5">
                <h3 className="text-[16px] font-bold text-[#2C1A17]">
                  Data Utama Siswa
                </h3>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <FormInput
                    label="Nama Siswa"
                    value={form.full_name}
                    placeholder="Contoh: Jonathan Wijaya"
                    onChange={(value) =>
                      setForm((prev) => ({ ...prev, full_name: value }))
                    }
                  />

                  <div>
                    <label className="text-[13px] font-bold text-[#6F5549]">
                      Tanggal Lahir
                    </label>
                    <input
                      type="date"
                      value={form.birth_date}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          birth_date: event.target.value,
                        }))
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                    />
                  </div>

                  <FormInput
                    label="Tempat Kelahiran"
                    value={form.birth_place}
                    placeholder="Contoh: Jakarta"
                    onChange={(value) =>
                      setForm((prev) => ({ ...prev, birth_place: value }))
                    }
                  />

                  <div>
                    <label className="text-[13px] font-bold text-[#6F5549]">
                      JK / Jenis Kelamin
                    </label>
                    <select
                      value={form.gender}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          gender: event.target.value,
                        }))
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                    >
                      <option value="">Pilih JK</option>
                      <option value="L">Laki-laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[13px] font-bold text-[#6F5549]">
                      Agama
                    </label>
                    <select
                      value={form.religion}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          religion: event.target.value,
                        }))
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
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

                  <FormInput
                    label="NIPD"
                    value={form.nis}
                    placeholder="Contoh: B-1-00459-24"
                    onChange={(value) =>
                      setForm((prev) => ({ ...prev, nis: value }))
                    }
                  />

                  <FormInput
                    label="NISN"
                    value={form.nisn}
                    placeholder="Opsional"
                    onChange={(value) =>
                      setForm((prev) => ({ ...prev, nisn: value }))
                    }
                  />

                  <div>
                    <label className="text-[13px] font-bold text-[#6F5549]">
                      Level
                    </label>
                    <select
                      value={form.level}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          level: event.target.value,
                        }))
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                    >
                      <option value="Early Learning">Early Learning</option>
                      <option value="Primary Level">Primary Level</option>
                      <option value="Secondary Level">Secondary Level</option>
                      <option value="High School">High School</option>
                    </select>
                  </div>

                  <FormInput
                    label="Grade / Kelas"
                    value={form.grade}
                    placeholder="Contoh: Grade 4 / kelas 3"
                    onChange={(value) =>
                      setForm((prev) => ({ ...prev, grade: value }))
                    }
                  />

                  <FormInput
                    label="Tahun Ajaran"
                    value={form.academic_year}
                    placeholder="2026/2027"
                    onChange={(value) =>
                      setForm((prev) => ({ ...prev, academic_year: value }))
                    }
                  />

                  <div>
                    <label className="text-[13px] font-bold text-[#6F5549]">
                      Orang Tua
                    </label>
                    <select
                      value={form.parent_id}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          parent_id: event.target.value,
                        }))
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                    >
                      <option value="">Pilih orang tua</option>
                      {parents.map((parent) => (
                        <option key={parent.id} value={parent.id}>
                          {parent.full_name || parent.email || "Tanpa Nama"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[13px] font-bold text-[#6F5549]">
                      Guru Pendamping
                    </label>
                    <select
                      value={form.homeroom_teacher_id}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          homeroom_teacher_id: event.target.value,
                        }))
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                    >
                      <option value="">Pilih guru</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.full_name || teacher.email || "Tanpa Nama"}
                          {teacher.teacher_code
                            ? ` — ${teacher.teacher_code}`
                            : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[13px] font-bold text-[#6F5549]">
                      Keterangan
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          description: event.target.value,
                        }))
                      }
                      rows={4}
                      placeholder="Catatan tambahan siswa"
                      className="mt-2 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 py-3 text-[14px] outline-none focus:border-[#9C0824]"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-[#E8D6C1] bg-white p-5">
                <h3 className="text-[16px] font-bold text-[#2C1A17]">
                  Dokumen Siswa
                </h3>
                <p className="mt-1 text-[13px] text-[#7D5E50]">
                  Upload KK, ijazah, KTP ayah/ibu, raport, foto, formulir, SKKB,
                  dan akte sesuai data Excel.
                </p>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {documentFields.map((field) => (
                    <FileInputBox
                      key={field.key}
                      label={field.label}
                      accept={field.accept}
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

              {formError ? (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                  {formError}
                </div>
              ) : null}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeAddModal}
                  disabled={saving}
                  className="h-11 rounded-xl border border-[#DCC8B6] bg-white px-5 text-[14px] font-bold text-[#6F5549] transition hover:bg-[#F7EDE2] disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="h-11 rounded-xl bg-[#9C0824] px-6 text-[14px] font-bold text-white transition hover:brightness-105 disabled:opacity-60"
                >
                  {saving ? "Menyimpan..." : "Save Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </KepalaSekolahLayout>
  );
}

function FormInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-[13px] font-bold text-[#6F5549]">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
      />
    </div>
  );
}

function FileInputBox({
  label,
  accept,
  fileName,
  onChange,
}: {
  label: string;
  accept: string;
  fileName: string;
  onChange: (file: File | null) => void;
}) {
  return (
    <div className="rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] p-4">
      <label className="text-[13px] font-bold text-[#6F5549]">{label}</label>

      <label className="mt-2 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#DCC8B6] bg-white px-4 text-[13px] font-bold text-[#7A1F2B] transition hover:bg-[#F7EDE2]">
        <UploadCloud className="h-4 w-4" />
        Pilih File
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => onChange(event.target.files?.[0] || null)}
        />
      </label>

      <p className="mt-2 truncate text-[12px] text-[#7D5E50]">
        {fileName || "Belum ada file dipilih"}
      </p>
    </div>
  );
}