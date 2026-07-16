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

type ScheduleQueryResult = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  day_name: string;
  schedule_date: string | null;
  start_time: string | null;
  end_time: string | null;
  session_name: string | null;
  material_topic: string | null;
  academic_year: string | null;
  semester: string | null;
  students: StudentOption | StudentOption[] | null;
  teachers: TeacherOption | TeacherOption[] | null;
  subjects: SubjectOption | SubjectOption[] | null;
};

type Schedule = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  day_name: string;
  schedule_date: string | null;
  start_time: string | null;
  end_time: string | null;
  session_name: string | null;
  material_topic: string | null;
  academic_year: string | null;
  semester: string | null;
  students: StudentOption | null;
  teachers: TeacherOption | null;
  subjects: SubjectOption | null;
};

type ScheduleForm = {
  student_id: string;
  teacher_id: string;
  subject_id: string;
  day_name: string;
  schedule_date: string;
  start_time: string;
  end_time: string;
  session_name: string;
  material_topic: string;
  academic_year: string;
  semester: string;
};

const initialForm: ScheduleForm = {
  student_id: "",
  teacher_id: "",
  subject_id: "",
  day_name: "Senin",
  schedule_date: "",
  start_time: "",
  end_time: "",
  session_name: "Sesi 1",
  material_topic: "",
  academic_year: "2025/2026",
  semester: "Genap",
};

function normalizeRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function formatTime(time: string | null) {
  if (!time) return "-";

  return time.slice(0, 5);
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

export default function KepalaSekolahJadwalPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [dayFilter, setDayFilter] = useState("Semua Hari");
  const [teacherFilter, setTeacherFilter] = useState("Semua Guru");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<ScheduleForm>(initialForm);
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

  async function fetchSchedules() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("schedules")
      .select(
        `
        id,
        student_id,
        teacher_id,
        subject_id,
        day_name,
        schedule_date,
        start_time,
        end_time,
        session_name,
        material_topic,
        academic_year,
        semester,
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
      .order("schedule_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      console.error(error.message);
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    const rows = (data || []) as ScheduleQueryResult[];

    const normalizedSchedules: Schedule[] = rows.map((item) => ({
      id: item.id,
      student_id: item.student_id,
      teacher_id: item.teacher_id,
      subject_id: item.subject_id,
      day_name: item.day_name,
      schedule_date: item.schedule_date,
      start_time: item.start_time,
      end_time: item.end_time,
      session_name: item.session_name,
      material_topic: item.material_topic,
      academic_year: item.academic_year,
      semester: item.semester,
      students: normalizeRelation(item.students),
      teachers: normalizeRelation(item.teachers),
      subjects: normalizeRelation(item.subjects),
    }));

    setSchedules(normalizedSchedules);
    setLoading(false);
  }

  async function fetchAllData() {
    await Promise.all([
      fetchStudents(),
      fetchTeachers(),
      fetchSubjects(),
      fetchSchedules(),
    ]);
  }

  useEffect(() => {
    fetchAllData();
  }, []);

  const filteredSchedules = useMemo(() => {
    const keyword = search.toLowerCase();

    return schedules.filter((schedule) => {
      const matchSearch =
        schedule.students?.full_name?.toLowerCase().includes(keyword) ||
        schedule.teachers?.full_name?.toLowerCase().includes(keyword) ||
        schedule.subjects?.name?.toLowerCase().includes(keyword) ||
        schedule.material_topic?.toLowerCase().includes(keyword) ||
        schedule.day_name.toLowerCase().includes(keyword);

      const matchDay =
        dayFilter === "Semua Hari" || schedule.day_name === dayFilter;

      const matchTeacher =
        teacherFilter === "Semua Guru" ||
        schedule.teachers?.full_name === teacherFilter;

      return matchSearch && matchDay && matchTeacher;
    });
  }, [schedules, search, dayFilter, teacherFilter]);

  async function handleSubmitSchedule(event: React.FormEvent<HTMLFormElement>) {
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

    if (!form.schedule_date) {
      setErrorMessage("Tanggal jadwal wajib diisi.");
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

    setSaving(true);

    try {
      const { error } = await supabase.from("schedules").insert({
        student_id: form.student_id,
        teacher_id: form.teacher_id,
        subject_id: form.subject_id,
        day_name: form.day_name,
        schedule_date: form.schedule_date,
        start_time: form.start_time,
        end_time: form.end_time,
        session_name: form.session_name,
        material_topic: form.material_topic.trim() || null,
        academic_year: form.academic_year,
        semester: form.semester,
      });

      if (error) {
        throw new Error(error.message);
      }

      setForm(initialForm);
      setIsModalOpen(false);
      await fetchSchedules();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal menyimpan jadwal.");
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
      activeMenu="Jadwal Guru"
      searchPlaceholder="Cari jadwal guru..."
      buttonLabel="+ Tambah Jadwal"
    >
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[30px] font-bold tracking-tight">Jadwal Guru</h1>
          <p className="mt-1 text-sm text-[#6B4A3A]">
            Jadwal mengajar seluruh guru HSTKB.
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
            + Tambah Jadwal
          </button>
        </div>
      </div>

      <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
        <div className="grid grid-cols-[1fr_180px_220px] gap-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari siswa, guru, mapel, atau materi..."
            className="w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
          />

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

          <select
            value={teacherFilter}
            onChange={(event) => setTeacherFilter(event.target.value)}
            className="rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
          >
            <option>Semua Guru</option>
            {teachers.map((teacher) => (
              <option key={teacher.id}>{teacher.full_name}</option>
            ))}
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
          <table className="w-full min-w-[1050px] text-left">
            <thead className="bg-[#FFF8EF] text-sm font-bold text-[#6B4A3A]">
              <tr>
                <th className="px-4 py-4">Hari</th>
                <th className="px-4 py-4">Tanggal</th>
                <th className="px-4 py-4">Jam</th>
                <th className="px-4 py-4">Nama Siswa</th>
                <th className="px-4 py-4">Kelas</th>
                <th className="px-4 py-4">Guru</th>
                <th className="px-4 py-4">Mata Pelajaran</th>
                <th className="px-4 py-4">Sesi</th>
                <th className="px-4 py-4">Materi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E8D6C1]">
              {loading && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm">
                    Loading jadwal...
                  </td>
                </tr>
              )}

              {!loading && filteredSchedules.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm">
                    Belum ada data jadwal.
                  </td>
                </tr>
              )}

              {!loading &&
                filteredSchedules.map((schedule) => (
                  <tr key={schedule.id} className="hover:bg-[#FFF8EF]">
                    <td className="px-4 py-4">{schedule.day_name}</td>
                    <td className="px-4 py-4">
                      {formatDate(schedule.schedule_date)}
                    </td>
                    <td className="px-4 py-4">
                      {formatTime(schedule.start_time)}-
                      {formatTime(schedule.end_time)}
                    </td>
                    <td className="px-4 py-4 font-semibold">
                      {schedule.students?.full_name || "-"}
                    </td>
                    <td className="px-4 py-4">
                      {schedule.students?.grade || "-"}
                    </td>
                    <td className="px-4 py-4">
                      {schedule.teachers?.full_name || "-"}
                    </td>
                    <td className="px-4 py-4">
                      {schedule.subjects?.name || "-"}
                    </td>
                    <td className="px-4 py-4">
                      {schedule.session_name || "-"}
                    </td>
                    <td className="px-4 py-4">
                      {schedule.material_topic || "-"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
          <div className="flex max-h-[88vh] w-full max-w-[440px] flex-col overflow-hidden rounded-2xl bg-[#FAF3EA] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E8D6C1] px-6 py-5">
              <h2 className="text-xl font-bold">Tambah Jadwal Baru</h2>

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

              <form onSubmit={handleSubmitSchedule} className="space-y-4">
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

                  <div>
                    <label className="text-sm font-bold">Tanggal</label>
                    <input
                      type="date"
                      value={form.schedule_date}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          schedule_date: event.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    />
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
                    <label className="text-sm font-bold">Sesi</label>
                    <select
                      value={form.session_name}
                      onChange={(event) =>
                        setForm({ ...form, session_name: event.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    >
                      <option>Sesi 1</option>
                      <option>Sesi 2</option>
                      <option>Sesi 3</option>
                      <option>Sesi 4</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-bold">Semester</label>
                    <select
                      value={form.semester}
                      onChange={(event) =>
                        setForm({ ...form, semester: event.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    >
                      <option>Ganjil</option>
                      <option>Genap</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold">Materi</label>
                  <input
                    value={form.material_topic}
                    onChange={(event) =>
                      setForm({ ...form, material_topic: event.target.value })
                    }
                    placeholder="Contoh: Pecahan Senilai"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Tahun Ajaran</label>
                  <input
                    value={form.academic_year}
                    onChange={(event) =>
                      setForm({ ...form, academic_year: event.target.value })
                    }
                    placeholder="2025/2026"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  />
                </div>

                <div className="sticky bottom-0 -mx-6 mt-5 border-t border-[#E8D6C1] bg-[#FAF3EA] px-6 pb-1 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-xl bg-[#7A1F2B] py-3 text-sm font-bold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Menyimpan..." : "Simpan Jadwal"}
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