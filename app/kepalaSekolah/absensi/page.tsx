"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import KepalaSekolahLayout from "../components/KepalaSekolahLayout";

type StudentOption = {
  id: string;
  full_name: string;
  level: string | null;
  grade: string | null;
  nis: string | null;
};

type TeacherOption = {
  id: string;
  full_name: string;
  email: string | null;
};

type SubjectOption = {
  id: string;
  name: string;
  level: string | null;
  grade: string | null;
};

type AttendanceQueryResult = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  schedule_id: string | null;
  attendance_date: string;
  day_name: string | null;
  start_time: string | null;
  end_time: string | null;
  attendance_status: string | null;
  understanding_status: string | null;
  material_topic: string | null;
  notes: string | null;
  students: StudentOption | StudentOption[] | null;
  teachers: TeacherOption | TeacherOption[] | null;
  subjects: SubjectOption | SubjectOption[] | null;
};

type Attendance = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  schedule_id: string | null;
  attendance_date: string;
  day_name: string | null;
  start_time: string | null;
  end_time: string | null;
  attendance_status: string | null;
  understanding_status: string | null;
  material_topic: string | null;
  notes: string | null;
  students: StudentOption | null;
  teachers: TeacherOption | null;
  subjects: SubjectOption | null;
};

type AttendanceForm = {
  student_id: string;
  teacher_id: string;
  subject_id: string;
  attendance_date: string;
  day_name: string;
  start_time: string;
  end_time: string;
  attendance_status: string;
  understanding_status: string;
  material_topic: string;
  notes: string;
};

const initialForm: AttendanceForm = {
  student_id: "",
  teacher_id: "",
  subject_id: "",
  attendance_date: "",
  day_name: "Senin",
  start_time: "",
  end_time: "",
  attendance_status: "Hadir",
  understanding_status: "P",
  material_topic: "",
  notes: "",
};

function normalizeRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function formatDate(date: string | null) {
  if (!date) return "-";

  const parsedDate = new Date(date);

  return parsedDate.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(time: string | null) {
  if (!time) return "-";

  return time.slice(0, 5);
}

function getAttendanceBadge(status: string | null) {
  if (status === "Hadir") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "Sakit") {
    return "bg-yellow-100 text-yellow-700";
  }

  if (status === "Izin") {
    return "bg-blue-100 text-blue-700";
  }

  return "bg-red-100 text-red-700";
}

function getUnderstandingLabel(code: string | null) {
  if (code === "T") return "Tahu";
  if (code === "B") return "Bisa";
  if (code === "P") return "Paham";
  if (code === "M") return "Mengerti";
  if (code === "TM") return "Tidak Mengerti";

  return "-";
}

export default function KepalaSekolahAbsensiPage() {
  const [attendanceList, setAttendanceList] = useState<Attendance[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [dayFilter, setDayFilter] = useState("Semua Hari");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<AttendanceForm>(initialForm);
  const [errorMessage, setErrorMessage] = useState("");

  async function fetchStudents() {
    const { data, error } = await supabase
      .from("students")
      .select("id, full_name, level, grade, nis")
      .order("full_name", { ascending: true });

    if (error) {
      console.error(error.message);
      return;
    }

    setStudents(data || []);
  }

  async function fetchTeachers() {
    const { data, error } = await supabase
      .from("teachers")
      .select("id, full_name, email")
      .order("full_name", { ascending: true });

    if (error) {
      console.error(error.message);
      return;
    }

    setTeachers(data || []);
  }

  async function fetchSubjects() {
    const { data, error } = await supabase
      .from("subjects")
      .select("id, name, level, grade")
      .order("name", { ascending: true });

    if (error) {
      console.error(error.message);
      return;
    }

    setSubjects(data || []);
  }

  async function fetchAttendance() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("attendance")
      .select(
        `
        id,
        student_id,
        teacher_id,
        subject_id,
        schedule_id,
        attendance_date,
        day_name,
        start_time,
        end_time,
        attendance_status,
        understanding_status,
        material_topic,
        notes,
        students (
          id,
          full_name,
          level,
          grade,
          nis
        ),
        teachers (
          id,
          full_name,
          email
        ),
        subjects (
          id,
          name,
          level,
          grade
        )
      `
      )
      .order("attendance_date", { ascending: false })
      .order("start_time", { ascending: true });

    if (error) {
      console.error(error.message);
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    const rows = (data || []) as AttendanceQueryResult[];

    const normalizedAttendance: Attendance[] = rows.map((item) => ({
      id: item.id,
      student_id: item.student_id,
      teacher_id: item.teacher_id,
      subject_id: item.subject_id,
      schedule_id: item.schedule_id,
      attendance_date: item.attendance_date,
      day_name: item.day_name,
      start_time: item.start_time,
      end_time: item.end_time,
      attendance_status: item.attendance_status,
      understanding_status: item.understanding_status,
      material_topic: item.material_topic,
      notes: item.notes,
      students: normalizeRelation(item.students),
      teachers: normalizeRelation(item.teachers),
      subjects: normalizeRelation(item.subjects),
    }));

    setAttendanceList(normalizedAttendance);
    setLoading(false);
  }

  async function fetchAllData() {
    await Promise.all([
      fetchStudents(),
      fetchTeachers(),
      fetchSubjects(),
      fetchAttendance(),
    ]);
  }

  useEffect(() => {
    fetchAllData();
  }, []);

  const filteredAttendance = useMemo(() => {
    const keyword = search.toLowerCase();

    return attendanceList.filter((attendance) => {
      const matchSearch =
        attendance.students?.full_name?.toLowerCase().includes(keyword) ||
        attendance.teachers?.full_name?.toLowerCase().includes(keyword) ||
        attendance.subjects?.name?.toLowerCase().includes(keyword) ||
        attendance.material_topic?.toLowerCase().includes(keyword) ||
        attendance.notes?.toLowerCase().includes(keyword);

      const matchStatus =
        statusFilter === "Semua Status" ||
        attendance.attendance_status === statusFilter;

      const matchDay =
        dayFilter === "Semua Hari" || attendance.day_name === dayFilter;

      return matchSearch && matchStatus && matchDay;
    });
  }, [attendanceList, search, statusFilter, dayFilter]);

  async function handleSubmitAttendance(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setErrorMessage("");

    if (!form.student_id) {
      setErrorMessage("Nama siswa wajib dipilih.");
      return;
    }

    if (!form.teacher_id) {
      setErrorMessage("Guru wajib dipilih.");
      return;
    }

    if (!form.subject_id) {
      setErrorMessage("Mata pelajaran wajib dipilih.");
      return;
    }

    if (!form.attendance_date) {
      setErrorMessage("Tanggal absensi wajib diisi.");
      return;
    }

    if (!form.start_time) {
      setErrorMessage("Jam mulai wajib diisi.");
      return;
    }

    if (!form.end_time) {
      setErrorMessage("Jam selesai wajib diisi.");
      return;
    }

    if (!form.material_topic.trim()) {
      setErrorMessage("Materi wajib diisi.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from("attendance").insert({
        student_id: form.student_id,
        teacher_id: form.teacher_id,
        subject_id: form.subject_id,
        attendance_date: form.attendance_date,
        day_name: form.day_name,
        start_time: form.start_time,
        end_time: form.end_time,
        attendance_status: form.attendance_status,
        understanding_status: form.understanding_status,
        material_topic: form.material_topic.trim(),
        notes: form.notes.trim() || null,
      });

      if (error) {
        throw new Error(error.message);
      }

      setForm(initialForm);
      setIsModalOpen(false);
      await fetchAttendance();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal menyimpan absensi.");
      }
    } finally {
      setSaving(false);
    }
  }

  function closeModal() {
    setIsModalOpen(false);
    setErrorMessage("");
    setForm(initialForm);
  }

  return (
    <KepalaSekolahLayout
      activeMenu="Absensi KBM"
      searchPlaceholder="Cari absensi siswa..."
      buttonLabel="+ Input Absensi"
    >
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[30px] font-bold tracking-tight">Absensi KBM</h1>
          <p className="mt-1 text-sm text-[#6B4A3A]">
            Rekap kehadiran siswa per sesi pembelajaran.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            className="rounded-xl border border-[#E8D6C1] bg-white px-5 py-3 text-sm font-semibold text-[#2B1B18] shadow-sm transition hover:bg-[#FFF8EF]"
          >
            ⬇ Export
          </button>

          <button
            type="button"
            onClick={() => {
              setErrorMessage("");
              setIsModalOpen(true);
            }}
            className="rounded-xl bg-[#7A1F2B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#54131D]"
          >
            + Input Absensi
          </button>
        </div>
      </div>

      <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
        <div className="grid grid-cols-[1fr_200px_180px] gap-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari siswa, guru, mapel, materi, atau catatan..."
            className="w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
          >
            <option>Semua Status</option>
            <option>Hadir</option>
            <option>Sakit</option>
            <option>Izin</option>
            <option>Alpha</option>
          </select>

          <select
            value={dayFilter}
            onChange={(event) => setDayFilter(event.target.value)}
            className="rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
          >
            <option>Semua Hari</option>
            <option>Senin</option>
            <option>Selasa</option>
            <option>Rabu</option>
            <option>Kamis</option>
            <option>Jumat</option>
            <option>Sabtu</option>
          </select>
        </div>
      </div>

      {errorMessage && !isModalOpen && (
        <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="mt-7 overflow-hidden rounded-2xl border border-[#E8D6C1] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px] text-left">
            <thead className="bg-[#FFF8EF] text-sm font-bold text-[#6B4A3A]">
              <tr>
                <th className="px-4 py-4">Hari</th>
                <th className="px-4 py-4">Tanggal</th>
                <th className="px-4 py-4">Jam Mulai</th>
                <th className="px-4 py-4">Jam Selesai</th>
                <th className="px-4 py-4">Kehadiran</th>
                <th className="px-4 py-4">Nama Siswa</th>
                <th className="px-4 py-4">Kelas</th>
                <th className="px-4 py-4">Guru</th>
                <th className="px-4 py-4">Mapel</th>
                <th className="px-4 py-4">Materi</th>
                <th className="px-4 py-4">Ket.</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E8D6C1]">
              {loading && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-sm">
                    Loading absensi...
                  </td>
                </tr>
              )}

              {!loading && filteredAttendance.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-sm">
                    Belum ada data absensi.
                  </td>
                </tr>
              )}

              {!loading &&
                filteredAttendance.map((attendance) => (
                  <tr key={attendance.id} className="hover:bg-[#FFF8EF]">
                    <td className="px-4 py-4">
                      {attendance.day_name || "-"}
                    </td>
                    <td className="px-4 py-4">
                      {formatDate(attendance.attendance_date)}
                    </td>
                    <td className="px-4 py-4">
                      {formatTime(attendance.start_time)}
                    </td>
                    <td className="px-4 py-4">
                      {formatTime(attendance.end_time)}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${getAttendanceBadge(
                          attendance.attendance_status
                        )}`}
                      >
                        {attendance.attendance_status || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-semibold">
                      {attendance.students?.full_name || "-"}
                    </td>
                    <td className="px-4 py-4">
                      {attendance.students?.grade || "-"}
                    </td>
                    <td className="px-4 py-4">
                      {attendance.teachers?.full_name || "-"}
                    </td>
                    <td className="px-4 py-4">
                      {attendance.subjects?.name || "-"}
                    </td>
                    <td className="px-4 py-4">
                      {attendance.material_topic || "-"}
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full border border-[#D96B2B] px-3 py-1 text-xs font-bold text-[#D96B2B]">
                        {attendance.understanding_status || "-"}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold">Legenda Keterangan</h2>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            ["T", "Tahu — Siswa sekadar tahu materi"],
            ["B", "Bisa — Siswa sudah bisa dengan materi"],
            ["P", "Paham — Siswa sudah paham materi"],
            ["M", "Mengerti — Siswa mengerti materi"],
            ["TM", "Tidak Mengerti — perlu pengulangan"],
          ].map(([code, label]) => (
            <div
              key={code}
              className="rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] px-4 py-3 text-sm text-[#6B4A3A]"
            >
              <span className="mr-2 rounded-full bg-[#D96B2B] px-3 py-1 text-xs font-bold text-white">
                {code}
              </span>
              {label}
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
          <div className="flex max-h-[88vh] w-full max-w-[440px] flex-col overflow-hidden rounded-2xl bg-[#FAF3EA] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E8D6C1] px-6 py-5">
              <h2 className="text-xl font-bold">Input Absensi KBM</h2>

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

              <form onSubmit={handleSubmitAttendance} className="space-y-4">
                <div>
                  <label className="text-sm font-bold">Nama Siswa</label>
                  <select
                    value={form.student_id}
                    onChange={(event) =>
                      setForm({ ...form, student_id: event.target.value })
                    }
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  >
                    <option value="">Pilih siswa</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.full_name}
                        {student.grade ? ` — ${student.grade}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-bold">Guru</label>
                  <select
                    value={form.teacher_id}
                    onChange={(event) =>
                      setForm({ ...form, teacher_id: event.target.value })
                    }
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  >
                    <option value="">Pilih guru</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-bold">Mata Pelajaran</label>
                  <select
                    value={form.subject_id}
                    onChange={(event) =>
                      setForm({ ...form, subject_id: event.target.value })
                    }
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  >
                    <option value="">Pilih mata pelajaran</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-bold">Tanggal</label>
                    <input
                      type="date"
                      value={form.attendance_date}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          attendance_date: event.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold">Hari</label>
                    <select
                      value={form.day_name}
                      onChange={(event) =>
                        setForm({ ...form, day_name: event.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    >
                      <option>Senin</option>
                      <option>Selasa</option>
                      <option>Rabu</option>
                      <option>Kamis</option>
                      <option>Jumat</option>
                      <option>Sabtu</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-bold">Jam Mulai</label>
                    <input
                      type="time"
                      value={form.start_time}
                      onChange={(event) =>
                        setForm({ ...form, start_time: event.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold">Jam Selesai</label>
                    <input
                      type="time"
                      value={form.end_time}
                      onChange={(event) =>
                        setForm({ ...form, end_time: event.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-bold">Kehadiran</label>
                    <select
                      value={form.attendance_status}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          attendance_status: event.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    >
                      <option>Hadir</option>
                      <option>Sakit</option>
                      <option>Izin</option>
                      <option>Alpha</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-bold">Ket. Pemahaman</label>
                    <select
                      value={form.understanding_status}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          understanding_status: event.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    >
                      <option value="T">T - Tahu</option>
                      <option value="B">B - Bisa</option>
                      <option value="P">P - Paham</option>
                      <option value="M">M - Mengerti</option>
                      <option value="TM">TM - Tidak Mengerti</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold">Materi</label>
                  <input
                    value={form.material_topic}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        material_topic: event.target.value,
                      })
                    }
                    placeholder="Contoh: Pecahan Senilai"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Catatan</label>
                  <textarea
                    value={form.notes}
                    onChange={(event) =>
                      setForm({ ...form, notes: event.target.value })
                    }
                    placeholder="Catatan pembelajaran atau kondisi siswa"
                    rows={3}
                    className="mt-2 w-full resize-none rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div className="sticky bottom-0 -mx-6 mt-5 border-t border-[#E8D6C1] bg-[#FAF3EA] px-6 pb-1 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-xl bg-[#7A1F2B] py-3 text-sm font-bold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Menyimpan..." : "Simpan Absensi"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </KepalaSekolahLayout>
  );
}