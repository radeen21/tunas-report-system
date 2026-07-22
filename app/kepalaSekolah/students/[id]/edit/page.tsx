"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import KepalaSekolahLayout from "../../../components/KepalaSekolahLayout";

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
  parent_id: string;
  homeroom_teacher_id: string;
  progress: string;
  attendance: string;
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
  parent_id: "",
  homeroom_teacher_id: "",
  progress: "0",
  attendance: "0",
};

const levelOptions = [
  "Early Learning",
  "Primary Level",
  "Secondary Level",
];

const statusOptions = ["active", "inactive"];

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
            parent_id,
            homeroom_teacher_id,
            progress,
            attendance
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
        parent_id: student.parent_id || "",
        homeroom_teacher_id: student.homeroom_teacher_id || "",
        progress: String(student.progress ?? 0),
        attendance: String(student.attendance ?? 0),
      });

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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
          parent_id: form.parent_id || null,
          homeroom_teacher_id: form.homeroom_teacher_id || null,
          progress: progressValue,
          attendance: attendanceValue,
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
      searchPlaceholder="Cari siswa, NIS, NISN, orang tua, atau guru..."
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
              Perbarui profil siswa, orang tua, guru pembimbing, progress, dan attendance.
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
                    NIS
                  </label>
                  <input
                    value={form.nis}
                    onChange={(event) => updateForm("nis", event.target.value)}
                    placeholder="Contoh: HSTKB-001"
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
                    Orang Tua
                  </label>
                  <select
                    value={form.parent_id}
                    onChange={(event) =>
                      updateForm("parent_id", event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  >
                    <option value="">Pilih orang tua</option>
                    {parents.map((parent) => (
                      <option key={parent.id} value={parent.id}>
                        {parent.full_name || "-"}
                        {parent.phone ? ` — ${parent.phone}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-bold text-[#2B1B18]">
                    Guru Pembimbing
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
                        {teacher.teacher_code ? ` — ${teacher.teacher_code}` : ""}
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
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-[#2B1B18]">
                  Ringkasan
                </h2>

                <div className="mt-5 space-y-3">
                  <InfoBox label="Nama" value={form.full_name || "-"} />
                  <InfoBox label="Kelas" value={form.grade || "-"} />
                  <InfoBox label="Level" value={form.level || "-"} />
                  <InfoBox label="Status" value={form.status || "-"} />
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