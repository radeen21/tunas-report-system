"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock,
  Plus,
  Search,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import KepalaSekolahLayout from "../components/KepalaSekolahLayout";

type TeacherRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  teacher_code?: string | null;
  subjects?: string[] | string | null;
};

type StudentRow = {
  id: string;
  full_name: string | null;
  grade: string | null;
  level: string | null;
  nis?: string | null;
  nisn?: string | null;
};

type SubjectRow = {
  id: string;
  name: string | null;
  level?: string | null;
  grade?: string | null;
};

type ScheduleRow = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  day_name: string | null;
  schedule_date: string | null;
  start_time: string | null;
  end_time: string | null;
  session_name: string | null;
  material_topic: string | null;
  semester: string | null;
};

type EnrichedSchedule = ScheduleRow & {
  student_name: string;
  student_grade: string;
  student_level: string;
  teacher_name: string;
  subject_name: string;
};

type ScheduleGroup = {
  key: string;
  schedule_date: string | null;
  day_name: string | null;
  start_time: string | null;
  end_time: string | null;
  teacher_id: string | null;
  teacher_name: string;
  subject_id: string | null;
  subject_name: string;
  session_name: string | null;
  material_topic: string | null;
  semester: string | null;
  students: EnrichedSchedule[];
  total_students: number;
};

const ALL = "Semua";

const dayOptions = [
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
  "Minggu",
];

const semesterOptions = ["Ganjil", "Genap"];

function normalizeText(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatTime(value?: string | null) {
  if (!value) return "-";
  return value.slice(0, 5);
}

function getDayName(dateString: string) {
  if (!dateString) return "Senin";

  return new Intl.DateTimeFormat("id-ID", { weekday: "long" }).format(
    new Date(`${dateString}T00:00:00`)
  );
}

function getInitials(name?: string | null) {
  if (!name) return "-";

  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getScheduleGroupKey(schedule: EnrichedSchedule) {
  return [
    schedule.teacher_id || "",
    schedule.subject_id || "",
    schedule.schedule_date || "",
    schedule.start_time || "",
    schedule.end_time || "",
    schedule.session_name || "",
    normalizeText(schedule.material_topic),
    schedule.semester || "",
  ].join("__");
}

function groupSchedules(schedules: EnrichedSchedule[]) {
  const map = new Map<string, EnrichedSchedule[]>();

  schedules.forEach((schedule) => {
    const key = getScheduleGroupKey(schedule);
    const current = map.get(key) || [];

    current.push(schedule);
    map.set(key, current);
  });

  const groups: ScheduleGroup[] = Array.from(map.entries()).map(([key, rows]) => {
    const first = rows[0];

    return {
      key,
      schedule_date: first.schedule_date,
      day_name: first.day_name,
      start_time: first.start_time,
      end_time: first.end_time,
      teacher_id: first.teacher_id,
      teacher_name: first.teacher_name,
      subject_id: first.subject_id,
      subject_name: first.subject_name,
      session_name: first.session_name,
      material_topic: first.material_topic,
      semester: first.semester,
      students: rows.sort((a, b) => a.student_name.localeCompare(b.student_name)),
      total_students: rows.length,
    };
  });

  return groups.sort((a, b) => {
    const dateA = a.schedule_date || "";
    const dateB = b.schedule_date || "";

    if (dateA !== dateB) return dateB.localeCompare(dateA);

    return (a.start_time || "").localeCompare(b.start_time || "");
  });
}

export default function KepalaSekolahJadwalPage() {
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [schedules, setSchedules] = useState<EnrichedSchedule[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<ScheduleGroup | null>(null);

  const [search, setSearch] = useState("");
  const [teacherFilter, setTeacherFilter] = useState(ALL);
  const [dayFilter, setDayFilter] = useState(ALL);
  const [subjectFilter, setSubjectFilter] = useState(ALL);

  const [form, setForm] = useState({
    teacher_id: "",
    subject_id: "",
    schedule_date: "",
    day_name: "Senin",
    start_time: "",
    end_time: "",
    session_name: "Sesi 1",
    material_topic: "",
    semester: "Ganjil",
  });

  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState("");

  async function fetchData() {
    setLoading(true);

    const [teachersRes, studentsRes, subjectsRes, schedulesRes] =
      await Promise.all([
        supabase.from("teachers").select("*").order("full_name"),
        supabase.from("students").select("*").order("full_name"),
        supabase.from("subjects").select("*").order("name"),
        supabase
          .from("schedules")
          .select("*")
          .order("schedule_date", { ascending: false })
          .order("start_time", { ascending: true }),
      ]);

    const teachersData = (teachersRes.data || []) as TeacherRow[];
    const studentsData = (studentsRes.data || []) as StudentRow[];
    const subjectsData = (subjectsRes.data || []) as SubjectRow[];
    const schedulesData = (schedulesRes.data || []) as ScheduleRow[];

    const teacherMap = new Map(teachersData.map((teacher) => [teacher.id, teacher]));
    const studentMap = new Map(studentsData.map((student) => [student.id, student]));
    const subjectMap = new Map(subjectsData.map((subject) => [subject.id, subject]));

    const enriched: EnrichedSchedule[] = schedulesData.map((schedule) => {
      const teacher = schedule.teacher_id ? teacherMap.get(schedule.teacher_id) : null;
      const student = schedule.student_id ? studentMap.get(schedule.student_id) : null;
      const subject = schedule.subject_id ? subjectMap.get(schedule.subject_id) : null;

      return {
        ...schedule,
        teacher_name: teacher?.full_name || "-",
        student_name: student?.full_name || "-",
        student_grade: student?.grade || "-",
        student_level: student?.level || "-",
        subject_name: subject?.name || "-",
      };
    });

    setTeachers(teachersData);
    setStudents(studentsData);
    setSubjects(subjectsData);
    setSchedules(enriched);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("kepala-jadwal-rombel-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "schedules" },
        fetchData
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        fetchData
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teachers" },
        fetchData
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const groupedSchedules = useMemo(() => {
    const q = normalizeText(search);
    const groups = groupSchedules(schedules);

    return groups.filter((group) => {
      const matchSearch =
        !q ||
        normalizeText(group.teacher_name).includes(q) ||
        normalizeText(group.subject_name).includes(q) ||
        normalizeText(group.material_topic).includes(q) ||
        normalizeText(group.session_name).includes(q) ||
        group.students.some((student) =>
          normalizeText(student.student_name).includes(q)
        );

      const matchTeacher =
        teacherFilter === ALL || group.teacher_id === teacherFilter;

      const matchDay = dayFilter === ALL || group.day_name === dayFilter;

      const matchSubject =
        subjectFilter === ALL || group.subject_id === subjectFilter;

      return matchSearch && matchTeacher && matchDay && matchSubject;
    });
  }, [schedules, search, teacherFilter, dayFilter, subjectFilter]);

  const filteredStudents = useMemo(() => {
    const q = normalizeText(studentSearch);

    return students.filter((student) => {
      const matchSearch =
        !q ||
        normalizeText(student.full_name).includes(q) ||
        normalizeText(student.grade).includes(q) ||
        normalizeText(student.level).includes(q) ||
        normalizeText(student.nis).includes(q);

      return matchSearch;
    });
  }, [students, studentSearch]);

  const summary = useMemo(() => {
    const groups = groupSchedules(schedules);
    const totalSchedules = schedules.length;
    const totalRombel = groups.length;
    const totalStudentsScheduled = schedules.filter((item) => item.student_id).length;
    const activeTeachers = new Set(schedules.map((item) => item.teacher_id)).size;

    return {
      totalSchedules,
      totalRombel,
      totalStudentsScheduled,
      activeTeachers,
    };
  }, [schedules]);

  function resetForm() {
    setForm({
      teacher_id: "",
      subject_id: "",
      schedule_date: "",
      day_name: "Senin",
      start_time: "",
      end_time: "",
      session_name: "Sesi 1",
      material_topic: "",
      semester: "Ganjil",
    });
    setSelectedStudentIds([]);
    setStudentSearch("");
  }

  function openModal() {
    resetForm();
    setShowModal(true);
  }

  function toggleStudent(studentId: string) {
    setSelectedStudentIds((prev) => {
      if (prev.includes(studentId)) {
        return prev.filter((id) => id !== studentId);
      }

      return [...prev, studentId];
    });
  }

  function selectAllFilteredStudents() {
    const ids = filteredStudents.map((student) => student.id);

    setSelectedStudentIds((prev) => {
      const merged = new Set([...prev, ...ids]);
      return Array.from(merged);
    });
  }

  function clearSelectedStudents() {
    setSelectedStudentIds([]);
  }

  async function handleSaveSchedule() {
    if (!form.teacher_id) {
      alert("Pilih guru terlebih dahulu.");
      return;
    }

    if (!form.subject_id) {
      alert("Pilih mata pelajaran terlebih dahulu.");
      return;
    }

    if (!form.schedule_date) {
      alert("Pilih tanggal jadwal terlebih dahulu.");
      return;
    }

    if (!form.start_time || !form.end_time) {
      alert("Isi jam mulai dan jam selesai terlebih dahulu.");
      return;
    }

    if (!form.material_topic.trim()) {
      alert("Isi materi/topik pembelajaran terlebih dahulu.");
      return;
    }

    if (selectedStudentIds.length === 0) {
      alert("Pilih minimal 1 siswa untuk jadwal rombel.");
      return;
    }

    setSaving(true);

    const payload = selectedStudentIds.map((studentId) => ({
      student_id: studentId,
      teacher_id: form.teacher_id,
      subject_id: form.subject_id,
      day_name: form.day_name,
      schedule_date: form.schedule_date,
      start_time: form.start_time,
      end_time: form.end_time,
      session_name: form.session_name.trim() || "Sesi 1",
      material_topic: form.material_topic.trim(),
      semester: form.semester,
    }));

    const { error } = await supabase.from("schedules").insert(payload);

    if (error) {
      setSaving(false);
      alert(`Gagal menyimpan jadwal: ${error.message}`);
      return;
    }

    await fetchData();

    setSaving(false);
    setShowModal(false);
    resetForm();
  }

  async function handleDeleteGroup(group: ScheduleGroup) {
    const confirmDelete = confirm(
      `Hapus jadwal ${group.subject_name} - ${group.teacher_name} untuk ${group.total_students} siswa?`
    );

    if (!confirmDelete) return;

    const ids = group.students.map((item) => item.id);

    const { error } = await supabase.from("schedules").delete().in("id", ids);

    if (error) {
      alert(`Gagal menghapus jadwal: ${error.message}`);
      return;
    }

    await fetchData();
  }

  return (
    <KepalaSekolahLayout
      activeMenu="Jadwal Guru"
      searchPlaceholder="Cari jadwal guru..."
    >
      <section className="space-y-7">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#8A5A48]">
              Jadwal Pembelajaran
            </p>

            <h1 className="mt-2 text-[30px] font-extrabold tracking-[-0.02em] text-[#2B1B18]">
              Jadwal Guru / Rombel
            </h1>

            <p className="mt-2 max-w-[850px] text-[15px] leading-6 text-[#6F5549]">
              Buat jadwal guru untuk satu siswa atau beberapa siswa sekaligus.
              Jadwal dengan tanggal, jam, guru, mapel, sesi, dan materi yang
              sama akan terbaca sebagai rombel di menu Absensi Guru.
            </p>
          </div>

          <button
            type="button"
            onClick={openModal}
            className="flex h-11 w-fit items-center gap-2 rounded-xl bg-[#8C0F2D] px-5 text-[14px] font-extrabold text-white shadow-sm transition hover:bg-[#54131D]"
          >
            <Plus className="h-4 w-4" />
            Tambah Jadwal
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={<CalendarDays className="h-5 w-5" />}
            label="Total Jadwal"
            value={summary.totalSchedules}
            info="Rows"
            tone="pink"
          />
          <SummaryCard
            icon={<UsersRound className="h-5 w-5" />}
            label="Total Rombel"
            value={summary.totalRombel}
            info="Group"
            tone="orange"
          />
          <SummaryCard
            icon={<UserRound className="h-5 w-5" />}
            label="Siswa Terjadwal"
            value={summary.totalStudentsScheduled}
            info="Siswa"
            tone="green"
          />
          <SummaryCard
            icon={<Clock className="h-5 w-5" />}
            label="Guru Aktif"
            value={summary.activeTeachers}
            info="Guru"
            tone="blue"
          />
        </div>

        <div className="rounded-[22px] border border-[#E1CFBE] bg-white p-5 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-[1.7fr_1fr_1fr_1fr]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8E6A58]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari siswa, guru, mapel, atau materi..."
                className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] pl-11 pr-4 text-[14px] outline-none placeholder:text-[#9A7B6C] focus:border-[#9C0824]"
              />
            </div>

            <select
              value={teacherFilter}
              onChange={(event) => setTeacherFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              <option value={ALL}>Semua Guru</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.full_name}
                </option>
              ))}
            </select>

            <select
              value={dayFilter}
              onChange={(event) => setDayFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              <option value={ALL}>Semua Hari</option>
              {dayOptions.map((day) => (
                <option key={day}>{day}</option>
              ))}
            </select>

            <select
              value={subjectFilter}
              onChange={(event) => setSubjectFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              <option value={ALL}>Semua Mapel</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-[22px] border border-[#E1CFBE] bg-white shadow-sm">
          <div className="border-b border-[#EADACA] px-6 py-5">
            <h2 className="text-[20px] font-extrabold text-[#2B1B18]">
              Daftar Jadwal Rombel
            </h2>
            <p className="mt-1 text-[14px] text-[#6F5549]">
              Data dikelompokkan berdasarkan jadwal yang sama.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1160px] border-collapse">
              <thead>
                <tr className="border-b border-[#EADACA] bg-[#FFF8EF] text-left text-[13px] font-extrabold text-[#6F5549]">
                  <th className="px-6 py-4">Hari / Tanggal</th>
                  <th className="px-6 py-4">Jam</th>
                  <th className="px-6 py-4">Guru</th>
                  <th className="px-6 py-4">Mapel</th>
                  <th className="px-6 py-4">Sesi</th>
                  <th className="px-6 py-4">Materi</th>
                  <th className="px-6 py-4">Rombel</th>
                  <th className="px-6 py-4">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-12 text-center text-[#6F5549]"
                    >
                      Memuat data jadwal...
                    </td>
                  </tr>
                ) : groupedSchedules.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-12 text-center text-[#6F5549]"
                    >
                      Belum ada jadwal rombel.
                    </td>
                  </tr>
                ) : (
                  groupedSchedules.map((group) => (
                    <tr
                      key={group.key}
                      className="border-b border-[#F0E1D4] text-[14px] text-[#2B1B18]"
                    >
                      <td className="px-6 py-4">
                        <p className="font-extrabold">{group.day_name || "-"}</p>
                        <p className="mt-1 text-[13px] text-[#6F5549]">
                          {formatDate(group.schedule_date)}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        {formatTime(group.start_time)}-
                        {formatTime(group.end_time)}
                      </td>

                      <td className="px-6 py-4 font-extrabold">
                        {group.teacher_name}
                      </td>

                      <td className="px-6 py-4">{group.subject_name}</td>

                      <td className="px-6 py-4">{group.session_name || "-"}</td>

                      <td className="max-w-[260px] px-6 py-4">
                        <p className="line-clamp-2">
                          {group.material_topic || "-"}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => setSelectedGroup(group)}
                          className="rounded-full bg-[#F4E5DA] px-3 py-1 text-[12px] font-extrabold text-[#8A2332] transition hover:bg-[#EADACA]"
                        >
                          {group.total_students} siswa
                        </button>
                      </td>

                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => handleDeleteGroup(group)}
                          className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#FECACA] px-3 text-[13px] font-extrabold text-[#DC2626] transition hover:bg-[#FFF1F2]"
                        >
                          <Trash2 className="h-4 w-4" />
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-8">
          <div className="max-h-[92vh] w-full max-w-[860px] overflow-y-auto rounded-[22px] bg-[#FFF8EF] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E1CFBE] bg-[#FFF8EF] px-6 py-5">
              <h2 className="text-[22px] font-extrabold text-[#2B1B18]">
                Tambah Jadwal Rombel
              </h2>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-full p-2 text-[#6F5549] transition hover:bg-[#F4E5DA]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="grid gap-4 md:grid-cols-2">
                <FormGroup label="Guru">
                  <select
                    value={form.teacher_id}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        teacher_id: event.target.value,
                      }))
                    }
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
                  <select
                    value={form.subject_id}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        subject_id: event.target.value,
                      }))
                    }
                    className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                  >
                    <option value="">Pilih mata pelajaran</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name} {subject.grade ? `— ${subject.grade}` : ""}
                      </option>
                    ))}
                  </select>
                </FormGroup>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormGroup label="Tanggal">
                  <input
                    type="date"
                    value={form.schedule_date}
                    onChange={(event) => {
                      const dateValue = event.target.value;

                      setForm((prev) => ({
                        ...prev,
                        schedule_date: dateValue,
                        day_name: getDayName(dateValue),
                      }));
                    }}
                    className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                  />
                </FormGroup>

                <FormGroup label="Hari">
                  <select
                    value={form.day_name}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        day_name: event.target.value,
                      }))
                    }
                    className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                  >
                    {dayOptions.map((day) => (
                      <option key={day}>{day}</option>
                    ))}
                  </select>
                </FormGroup>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormGroup label="Jam Mulai">
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        start_time: event.target.value,
                      }))
                    }
                    className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                  />
                </FormGroup>

                <FormGroup label="Jam Selesai">
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        end_time: event.target.value,
                      }))
                    }
                    className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                  />
                </FormGroup>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormGroup label="Sesi">
                  <input
                    value={form.session_name}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        session_name: event.target.value,
                      }))
                    }
                    placeholder="Contoh: Sesi 1"
                    className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                  />
                </FormGroup>

                <FormGroup label="Semester">
                  <select
                    value={form.semester}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        semester: event.target.value,
                      }))
                    }
                    className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                  >
                    {semesterOptions.map((semester) => (
                      <option key={semester}>{semester}</option>
                    ))}
                  </select>
                </FormGroup>
              </div>

              <FormGroup label="Materi / Topik Pembelajaran">
                <input
                  value={form.material_topic}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      material_topic: event.target.value,
                    }))
                  }
                  placeholder="Contoh: Bab II - Wujud Zat"
                  className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                />
              </FormGroup>

              <div className="rounded-2xl border border-[#E1CFBE] bg-white px-5 py-4">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <h3 className="text-[16px] font-extrabold text-[#2B1B18]">
                      Pilih Siswa Rombel
                    </h3>
                    <p className="mt-1 text-[13px] text-[#6F5549]">
                      Terpilih {selectedStudentIds.length} siswa.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={selectAllFilteredStudents}
                      className="rounded-xl border border-[#DCC8B6] px-3 py-2 text-[12px] font-extrabold text-[#8C0F2D] transition hover:bg-[#FFF8EF]"
                    >
                      Pilih Semua Hasil Filter
                    </button>

                    <button
                      type="button"
                      onClick={clearSelectedStudents}
                      className="rounded-xl border border-[#FECACA] px-3 py-2 text-[12px] font-extrabold text-[#DC2626] transition hover:bg-[#FFF1F2]"
                    >
                      Kosongkan
                    </button>
                  </div>
                </div>

                <div className="relative mt-4">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8E6A58]" />
                  <input
                    value={studentSearch}
                    onChange={(event) => setStudentSearch(event.target.value)}
                    placeholder="Cari nama siswa, kelas, program, atau NIS..."
                    className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] pl-11 pr-4 text-[14px] outline-none placeholder:text-[#9A7B6C] focus:border-[#9C0824]"
                  />
                </div>

                <div className="mt-4 max-h-[280px] overflow-y-auto rounded-2xl border border-[#EADACA]">
                  {filteredStudents.length === 0 ? (
                    <div className="px-4 py-8 text-center text-[14px] text-[#6F5549]">
                      Tidak ada siswa ditemukan.
                    </div>
                  ) : (
                    filteredStudents.map((student) => {
                      const checked = selectedStudentIds.includes(student.id);

                      return (
                        <button
                          key={student.id}
                          type="button"
                          onClick={() => toggleStudent(student.id)}
                          className={`flex w-full items-center justify-between gap-4 border-b border-[#F0E1D4] px-4 py-3 text-left transition last:border-b-0 ${
                            checked ? "bg-[#FFF8EF]" : "bg-white hover:bg-[#FFF8EF]"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F8DFD0] text-[13px] font-extrabold text-[#8C0F2D]">
                              {getInitials(student.full_name)}
                            </div>

                            <div>
                              <p className="text-[14px] font-extrabold text-[#2B1B18]">
                                {student.full_name}
                              </p>
                              <p className="mt-1 text-[12px] text-[#6F5549]">
                                {student.level || "-"} — {student.grade || "-"}
                              </p>
                            </div>
                          </div>

                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleStudent(student.id)}
                            onClick={(event) => event.stopPropagation()}
                            className="h-5 w-5 accent-[#8C0F2D]"
                          />
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveSchedule}
                disabled={saving}
                className="h-12 w-full rounded-xl bg-[#8C0F2D] text-[15px] font-extrabold text-white shadow-sm transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Menyimpan..." : "Simpan Jadwal Rombel"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedGroup ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-8">
          <div className="max-h-[92vh] w-full max-w-[760px] overflow-y-auto rounded-[22px] bg-[#FFF8EF] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E1CFBE] bg-[#FFF8EF] px-6 py-5">
              <div>
                <h2 className="text-[22px] font-extrabold text-[#2B1B18]">
                  Detail Rombel
                </h2>

                <p className="mt-1 text-[14px] text-[#6F5549]">
                  {selectedGroup.teacher_name} • {selectedGroup.subject_name} •{" "}
                  {formatDate(selectedGroup.schedule_date)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedGroup(null)}
                className="rounded-full p-2 text-[#6F5549] transition hover:bg-[#F4E5DA]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="rounded-2xl border border-[#E1CFBE] bg-white px-5 py-4">
                <div className="grid gap-3 text-[13px] md:grid-cols-2">
                  <InfoItem
                    label="Tanggal"
                    value={`${selectedGroup.day_name || "-"}, ${formatDate(
                      selectedGroup.schedule_date
                    )}`}
                  />
                  <InfoItem
                    label="Jam"
                    value={`${formatTime(selectedGroup.start_time)}-${formatTime(
                      selectedGroup.end_time
                    )}`}
                  />
                  <InfoItem label="Sesi" value={selectedGroup.session_name || "-"} />
                  <InfoItem
                    label="Semester"
                    value={selectedGroup.semester || "-"}
                  />
                  <InfoItem
                    label="Materi"
                    value={selectedGroup.material_topic || "-"}
                  />
                  <InfoItem
                    label="Jumlah Siswa"
                    value={`${selectedGroup.total_students} siswa`}
                  />
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-[#E1CFBE] bg-white">
                <div className="border-b border-[#EADACA] px-5 py-4">
                  <h3 className="text-[16px] font-extrabold text-[#2B1B18]">
                    Siswa Dalam Rombel
                  </h3>
                </div>

                <div>
                  {selectedGroup.students.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center gap-3 border-b border-[#F0E1D4] px-5 py-4 last:border-b-0"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F8DFD0] text-[13px] font-extrabold text-[#8C0F2D]">
                        {getInitials(student.student_name)}
                      </div>

                      <div>
                        <p className="text-[14px] font-extrabold text-[#2B1B18]">
                          {student.student_name}
                        </p>
                        <p className="mt-1 text-[12px] text-[#6F5549]">
                          {student.student_level} — {student.student_grade}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedGroup(null)}
                className="h-11 w-full rounded-xl bg-[#8C0F2D] text-[14px] font-extrabold text-white transition hover:bg-[#54131D]"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </KepalaSekolahLayout>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  info,
  tone,
}: {
  icon: React.ReactNode;
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
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <p className="mb-2 text-[14px] font-extrabold text-[#2B1B18]">
        {label}
      </p>
      {children}
    </label>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#8A5A48]">
        {label}
      </p>
      <p className="mt-1 font-extrabold text-[#2B1B18]">{value}</p>
    </div>
  );
}