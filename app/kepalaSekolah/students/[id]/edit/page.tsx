"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText, Save, UploadCloud } from "lucide-react";
import { supabase } from "@/lib/supabase";
import KepalaSekolahLayout from "../../../components/KepalaSekolahLayout";

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

type Teacher = {
  id: string;
  full_name: string | null;
  email: string | null;
  teacher_code: string | null;
  subjects: string[] | null;
};

type Parent = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  relation: string | null;
};

type StudentForm = {
  full_name: string;
  nis: string;
  nisn: string;
  level: string;
  grade: string;
  academic_year: string;
  status: string;
  birth_date: string;
  birth_place: string;
  gender: string;
  religion: string;
  parent_id: string;
  parent_manual_name: string;
  parent_manual_phone: string;
  parent_manual_email: string;
  homeroom_teacher_id: string;
  progress: string;
  attendance: string;
  description: string;
  family_card_url: string;
  diploma_url: string;
  father_ktp_url: string;
  mother_ktp_url: string;
  report_card_url: string;
  student_photo_url: string;
  registration_form_url: string;
  skkb_url: string;
  birth_certificate_url: string;
};

const initialForm: StudentForm = {
  full_name: "",
  nis: "",
  nisn: "",
  level: "Primary Level",
  grade: "",
  academic_year: "2026/2027",
  status: "active",
  birth_date: "",
  birth_place: "",
  gender: "",
  religion: "",
  parent_id: "",
  parent_manual_name: "",
  parent_manual_phone: "",
  parent_manual_email: "",
  homeroom_teacher_id: "",
  progress: "0",
  attendance: "0",
  description: "",
  family_card_url: "",
  diploma_url: "",
  father_ktp_url: "",
  mother_ktp_url: "",
  report_card_url: "",
  student_photo_url: "",
  registration_form_url: "",
  skkb_url: "",
  birth_certificate_url: "",
};

const levelOptions = [
  "Early Learning",
  "Primary Level",
  "Secondary Level",
  "High School",
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

const statusOptions = ["active", "inactive"];

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

function cleanFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");
}

function normalizeText(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function normalizePhone(value?: string | null) {
  return (value || "").replace(/\D/g, "");
}

function genderLabel(gender?: string | null) {
  if (gender === "L") return "Laki-laki";
  if (gender === "P") return "Perempuan";
  return "-";
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

async function ensureValidSession() {
  const { data: sessionData } = await supabase.auth.getSession();

  if (sessionData.session) return true;

  const { data: refreshData, error: refreshError } =
    await supabase.auth.refreshSession();

  if (refreshError || !refreshData.session) {
    alert("Sesi login sudah berakhir. Silakan login ulang.");
    await supabase.auth.signOut();
    window.location.href = "/";
    return false;
  }

  return true;
}

export default function KepalaSekolahStudentEditPage() {
  const router = useRouter();
  const params = useParams();

  const studentId = useMemo(() => {
    const rawId = params?.id;
    if (Array.isArray(rawId)) return rawId[0] || "";
    return rawId || "";
  }, [params]);

  const [form, setForm] = useState<StudentForm>(initialForm);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [documentFiles, setDocumentFiles] = useState<
    Partial<Record<DocumentKey, File>>
  >({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function fetchPageData() {
    setLoading(true);
    setErrorMessage("");

    try {
      if (!studentId) {
        setErrorMessage("ID siswa tidak ditemukan.");
        setLoading(false);
        return;
      }

      const [studentRes, teachersRes, parentsRes] = await Promise.all([
        supabase
          .from("students")
          .select(
            `
            id,
            full_name,
            nis,
            nisn,
            level,
            grade,
            academic_year,
            status,
            birth_date,
            birth_place,
            gender,
            religion,
            parent_id,
            homeroom_teacher_id,
            progress,
            attendance,
            description,
            family_card_url,
            diploma_url,
            father_ktp_url,
            mother_ktp_url,
            report_card_url,
            student_photo_url,
            registration_form_url,
            skkb_url,
            birth_certificate_url
          `
          )
          .eq("id", studentId)
          .maybeSingle(),

        supabase
          .from("teachers")
          .select("id, full_name, email, teacher_code, subjects")
          .order("full_name", { ascending: true }),

        supabase
          .from("parents")
          .select("id, full_name, email, phone, relation")
          .order("full_name", { ascending: true }),
      ]);

      if (studentRes.error) throw new Error(studentRes.error.message);
      if (teachersRes.error) throw new Error(teachersRes.error.message);
      if (parentsRes.error) throw new Error(parentsRes.error.message);

      if (!studentRes.data) {
        setErrorMessage("Data siswa tidak ditemukan.");
        setLoading(false);
        return;
      }

      const student = studentRes.data;

      setForm({
        full_name: student.full_name || "",
        nis: student.nis || "",
        nisn: student.nisn || "",
        level: student.level || "Primary Level",
        grade: student.grade || "",
        academic_year: student.academic_year || "2026/2027",
        status: student.status || "active",
        birth_date: student.birth_date || "",
        birth_place: student.birth_place || "",
        gender: student.gender || "",
        religion: student.religion || "",
        parent_id: student.parent_id || "",
        parent_manual_name: "",
        parent_manual_phone: "",
        parent_manual_email: "",
        homeroom_teacher_id: student.homeroom_teacher_id || "",
        progress: String(student.progress ?? 0),
        attendance: String(student.attendance ?? 0),
        description: student.description || "",
        family_card_url: student.family_card_url || "",
        diploma_url: student.diploma_url || "",
        father_ktp_url: student.father_ktp_url || "",
        mother_ktp_url: student.mother_ktp_url || "",
        report_card_url: student.report_card_url || "",
        student_photo_url: student.student_photo_url || "",
        registration_form_url: student.registration_form_url || "",
        skkb_url: student.skkb_url || "",
        birth_certificate_url: student.birth_certificate_url || "",
      });

      setDocumentFiles({});
      setTeachers((teachersRes.data || []) as Teacher[]);
      setParents((parentsRes.data || []) as Parent[]);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengambil data siswa.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPageData();
  }, [studentId]);

  function updateForm(key: keyof StudentForm, value: string) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function getOrCreateParentId() {
    if (form.parent_id) return form.parent_id;

    const manualName = form.parent_manual_name.trim();
    const manualPhone = form.parent_manual_phone.trim();
    const manualEmail = form.parent_manual_email.trim().toLowerCase();

    if (!manualName) {
      return "";
    }

    const normalizedManualName = normalizeText(manualName);
    const normalizedManualPhone = normalizePhone(manualPhone);
    const normalizedManualEmail = normalizeText(manualEmail);

    const existingParent = parents.find((parent) => {
      const sameName = normalizeText(parent.full_name) === normalizedManualName;
      const samePhone =
        normalizedManualPhone &&
        normalizePhone(parent.phone) === normalizedManualPhone;
      const sameEmail =
        normalizedManualEmail &&
        normalizeText(parent.email) === normalizedManualEmail;

      return sameEmail || samePhone || sameName;
    });

    if (existingParent?.id) {
      return existingParent.id;
    }

    const { data, error } = await supabase
      .from("parents")
      .insert({
        full_name: manualName,
        phone: manualPhone || null,
        email: manualEmail || null,
        relation: "Orang Tua / Wali",
        notes: `Dibuat otomatis dari form edit siswa: ${form.full_name.trim()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(`Gagal membuat data orang tua: ${error.message}`);
    }

    if (!data?.id) {
      throw new Error("Gagal membuat data orang tua.");
    }

    return String(data.id);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (!studentId) {
      setErrorMessage("ID siswa tidak ditemukan.");
      return;
    }

    if (!form.full_name.trim()) {
      setErrorMessage("Nama siswa wajib diisi.");
      return;
    }

    if (!form.nis.trim()) {
      setErrorMessage("NIPD wajib diisi.");
      return;
    }

    if (!form.level.trim()) {
      setErrorMessage("Level wajib dipilih.");
      return;
    }

    if (!form.grade.trim()) {
      setErrorMessage("Kelas wajib diisi.");
      return;
    }

    const progressValue = Number(form.progress || 0);
    const attendanceValue = Number(form.attendance || 0);

    if (progressValue < 0 || progressValue > 100) {
      setErrorMessage("Progress harus di antara 0 sampai 100.");
      return;
    }

    if (attendanceValue < 0 || attendanceValue > 100) {
      setErrorMessage("Attendance harus di antara 0 sampai 100.");
      return;
    }

    setSaving(true);

    try {
      const sessionOk = await ensureValidSession();

      if (!sessionOk) {
        setSaving(false);
        return;
      }

      const parentId = await getOrCreateParentId();

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

      const { error } = await supabase
        .from("students")
        .update({
          full_name: form.full_name.trim(),
          nis: form.nis.trim() || null,
          nisn: form.nisn.trim() || null,
          level: form.level,
          grade: form.grade.trim(),
          academic_year: form.academic_year.trim() || "2026/2027",
          status: form.status,
          birth_date: form.birth_date || null,
          birth_place: form.birth_place.trim() || null,
          gender: form.gender || null,
          religion: form.religion || null,
          parent_id: parentId || null,
          homeroom_teacher_id: form.homeroom_teacher_id || null,
          progress: progressValue,
          attendance: attendanceValue,
          description: form.description.trim() || null,
          family_card_url:
            uploadedUrls.family_card_url || form.family_card_url || null,
          diploma_url: uploadedUrls.diploma_url || form.diploma_url || null,
          father_ktp_url:
            uploadedUrls.father_ktp_url || form.father_ktp_url || null,
          mother_ktp_url:
            uploadedUrls.mother_ktp_url || form.mother_ktp_url || null,
          report_card_url:
            uploadedUrls.report_card_url || form.report_card_url || null,
          student_photo_url:
            uploadedUrls.student_photo_url || form.student_photo_url || null,
          registration_form_url:
            uploadedUrls.registration_form_url ||
            form.registration_form_url ||
            null,
          skkb_url: uploadedUrls.skkb_url || form.skkb_url || null,
          birth_certificate_url:
            uploadedUrls.birth_certificate_url ||
            form.birth_certificate_url ||
            null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", studentId);

      if (error) throw new Error(error.message);

      router.push("/kepalaSekolah/students");
      router.refresh();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal menyimpan perubahan siswa.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <KepalaSekolahLayout
      activeMenu="Siswa"
      searchPlaceholder="Cari siswa, NIPD, NISN, orang tua, atau guru..."
    >
      <div className="w-full max-w-full overflow-hidden">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <Link
              href="/kepalaSekolah/students"
              className="inline-flex items-center gap-2 text-sm font-bold text-[#7A1F2B]"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke daftar siswa
            </Link>

            <p className="mt-5 text-xs font-bold uppercase tracking-widest text-[#6B4A3A]">
              Principal Portal
            </p>

            <h1 className="mt-1 text-[30px] font-bold tracking-tight text-[#2B1B18]">
              Edit Data Siswa
            </h1>

            <p className="mt-1 text-sm text-[#6B4A3A]">
              Perbarui profil siswa, orang tua/wali, guru mapel, dokumen,
              progress, dan attendance.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {loading ? (
          <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-8 text-center text-sm shadow-sm">
            Loading data siswa...
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mt-7 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]"
          >
            <div className="space-y-5">
              <div className="rounded-2xl border border-[#E8D6C1] bg-white shadow-sm">
                <div className="border-b border-[#E8D6C1] px-6 py-5">
                  <h2 className="text-lg font-bold text-[#2B1B18]">
                    Informasi Siswa
                  </h2>
                  <p className="mt-1 text-sm text-[#6B4A3A]">
                    Data utama yang tampil di menu siswa.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="text-sm font-bold text-[#2B1B18]">
                      Nama Siswa
                    </label>
                    <input
                      value={form.full_name}
                      onChange={(event) =>
                        updateForm("full_name", event.target.value)
                      }
                      placeholder="Nama lengkap siswa"
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold text-[#2B1B18]">
                      NIPD
                    </label>
                    <input
                      value={form.nis}
                      onChange={(event) => updateForm("nis", event.target.value)}
                      placeholder="Contoh: B-1-00459-24"
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold text-[#2B1B18]">
                      NISN
                    </label>
                    <input
                      value={form.nisn}
                      onChange={(event) => updateForm("nisn", event.target.value)}
                      placeholder="Nomor NISN"
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold text-[#2B1B18]">
                      JK / Jenis Kelamin
                    </label>
                    <select
                      value={form.gender}
                      onChange={(event) =>
                        updateForm("gender", event.target.value)
                      }
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    >
                      <option value="">Pilih JK</option>
                      <option value="L">Laki-laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-bold text-[#2B1B18]">
                      Agama
                    </label>
                    <select
                      value={form.religion}
                      onChange={(event) =>
                        updateForm("religion", event.target.value)
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
                    <label className="text-sm font-bold text-[#2B1B18]">
                      Level / Program
                    </label>
                    <select
                      value={form.level}
                      onChange={(event) =>
                        updateForm("level", event.target.value)
                      }
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    >
                      {levelOptions.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-bold text-[#2B1B18]">
                      Kelas
                    </label>
                    <input
                      value={form.grade}
                      onChange={(event) =>
                        updateForm("grade", event.target.value)
                      }
                      placeholder="Contoh: Grade 4 / Kelas 7"
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold text-[#2B1B18]">
                      Tahun Ajaran
                    </label>
                    <input
                      value={form.academic_year}
                      onChange={(event) =>
                        updateForm("academic_year", event.target.value)
                      }
                      placeholder="2026/2027"
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold text-[#2B1B18]">
                      Status
                    </label>
                    <select
                      value={form.status}
                      onChange={(event) =>
                        updateForm("status", event.target.value)
                      }
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-bold text-[#2B1B18]">
                      Tanggal Lahir
                    </label>
                    <input
                      type="date"
                      value={form.birth_date}
                      onChange={(event) =>
                        updateForm("birth_date", event.target.value)
                      }
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold text-[#2B1B18]">
                      Tempat Kelahiran
                    </label>
                    <input
                      value={form.birth_place}
                      onChange={(event) =>
                        updateForm("birth_place", event.target.value)
                      }
                      placeholder="Contoh: Jakarta"
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm font-bold text-[#2B1B18]">
                      Orang Tua / Wali
                    </label>

                    <select
                      value={form.parent_id}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          parent_id: event.target.value,
                          parent_manual_name: event.target.value
                            ? ""
                            : prev.parent_manual_name,
                          parent_manual_phone: event.target.value
                            ? ""
                            : prev.parent_manual_phone,
                          parent_manual_email: event.target.value
                            ? ""
                            : prev.parent_manual_email,
                        }))
                      }
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    >
                      <option value="">Pilih orang tua yang sudah ada</option>
                      {parents.map((parent) => (
                        <option key={parent.id} value={parent.id}>
                          {parent.full_name || parent.email || "-"}
                          {parent.phone ? ` — ${parent.phone}` : ""}
                        </option>
                      ))}
                    </select>

                    <div className="mt-4 rounded-2xl border border-[#E8D6C1] bg-[#FFF8EF] p-4">
                      <p className="text-[13px] font-bold text-[#6F5549]">
                        Tambah Manual Orang Tua / Wali
                      </p>

                      <p className="mt-1 text-[12px] text-[#7D5E50]">
                        Jika orang tua belum ada di pilihan atas, isi manual di
                        bawah. Saat Simpan Perubahan, data orang tua otomatis
                        masuk ke database.
                      </p>

                      <div className="mt-4 grid gap-4 md:grid-cols-3">
                        <FormInput
                          label="Nama Orang Tua / Wali"
                          value={form.parent_manual_name}
                          placeholder="Contoh: Dedi"
                          onChange={(value) =>
                            setForm((prev) => ({
                              ...prev,
                              parent_manual_name: value,
                              parent_id: value.trim() ? "" : prev.parent_id,
                            }))
                          }
                        />

                        <FormInput
                          label="No HP / WhatsApp"
                          value={form.parent_manual_phone}
                          placeholder="Contoh: 08123456789"
                          onChange={(value) =>
                            setForm((prev) => ({
                              ...prev,
                              parent_manual_phone: value,
                              parent_id: value.trim() ? "" : prev.parent_id,
                            }))
                          }
                        />

                        <FormInput
                          label="Email Orang Tua"
                          value={form.parent_manual_email}
                          placeholder="Opsional"
                          onChange={(value) =>
                            setForm((prev) => ({
                              ...prev,
                              parent_manual_email: value,
                              parent_id: value.trim() ? "" : prev.parent_id,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-bold text-[#2B1B18]">
                      Guru Mapel
                    </label>
                    <select
                      value={form.homeroom_teacher_id}
                      onChange={(event) =>
                        updateForm("homeroom_teacher_id", event.target.value)
                      }
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    >
                      <option value="">Pilih guru</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.full_name || "-"}
                          {teacher.teacher_code
                            ? ` — ${teacher.teacher_code}`
                            : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-bold text-[#2B1B18]">
                      Progress %
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={form.progress}
                      onChange={(event) =>
                        updateForm("progress", event.target.value)
                      }
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold text-[#2B1B18]">
                      Attendance %
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={form.attendance}
                      onChange={(event) =>
                        updateForm("attendance", event.target.value)
                      }
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm font-bold text-[#2B1B18]">
                      Keterangan
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(event) =>
                        updateForm("description", event.target.value)
                      }
                      rows={4}
                      placeholder="Catatan tambahan siswa"
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white shadow-sm">
                <div className="border-b border-[#E8D6C1] px-6 py-5">
                  <h2 className="text-lg font-bold text-[#2B1B18]">
                    Dokumen Siswa
                  </h2>
                  <p className="mt-1 text-sm text-[#6B4A3A]">
                    Upload atau ganti dokumen siswa sesuai data Excel.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
                  {documentFields.map((field) => (
                    <DocumentUploadBox
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
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-[#2B1B18]">
                  Ringkasan
                </h2>

                <div className="mt-5 space-y-3">
                  <InfoBox label="Nama" value={form.full_name || "-"} />
                  <InfoBox label="NIPD" value={form.nis || "-"} />
                  <InfoBox label="JK" value={genderLabel(form.gender)} />
                  <InfoBox label="Agama" value={form.religion || "-"} />
                  <InfoBox label="Kelas" value={form.grade || "-"} />
                  <InfoBox label="Level" value={form.level || "-"} />
                  <InfoBox label="Status" value={form.status || "-"} />
                  <InfoBox
                    label="Tempat Lahir"
                    value={form.birth_place || "-"}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-[#2B1B18]">
                  Progress
                </h2>

                <div className="mt-5 space-y-5">
                  <ProgressBar label="Progress" value={Number(form.progress || 0)} />
                  <ProgressBar
                    label="Attendance"
                    value={Number(form.attendance || 0)}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-[#2B1B18]">
                  Kelengkapan Dokumen
                </h2>

                <div className="mt-5 space-y-2">
                  {documentFields.map((field) => {
                    const hasDocument = Boolean(form[field.key]);

                    return (
                      <div
                        key={field.key}
                        className="flex items-center justify-between rounded-xl bg-[#FFF8EF] px-4 py-3 text-sm"
                      >
                        <span className="font-bold text-[#2B1B18]">
                          {field.label}
                        </span>

                        {hasDocument ? (
                          <a
                            href={form[field.key]}
                            target="_blank"
                            rel="noreferrer"
                            className="font-bold text-[#158A58] underline"
                          >
                            Ada
                          </a>
                        ) : (
                          <span className="font-bold text-[#D11A2A]">
                            Belum ada
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7A1F2B] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>

                <Link
                  href="/kepalaSekolah/students"
                  className="mt-3 flex w-full items-center justify-center rounded-xl border border-[#E8D6C1] px-5 py-3 text-sm font-bold text-[#2B1B18] transition hover:bg-[#FFF8EF]"
                >
                  Batal
                </Link>
              </div>
            </div>
          </form>
        )}
      </div>
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

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#FFF8EF] px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-wide text-[#6B4A3A]">
        {label}
      </p>
      <p className="mt-1 font-bold text-[#2B1B18]">{value}</p>
    </div>
  );
}

function ProgressBar({ label, value }: { label: string; value: number }) {
  const safeValue = Math.max(0, Math.min(100, value || 0));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-[#6B4A3A]">{label}</span>
        <span className="font-bold text-[#2B1B18]">{safeValue}%</span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-[#F1DFD5]">
        <div
          className="h-full rounded-full bg-[#7A1F2B]"
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}

function DocumentUploadBox({
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