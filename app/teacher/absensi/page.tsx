"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import TeacherLayout from "../components/TeacherLayout";

type Teacher = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  teacher_code: string | null;
  subjects: string[] | null;
};

type StudentRelation = {
  id: string;
  full_name: string;
  grade: string | null;
  level: string | null;
  nis: string | null;
  nisn: string | null;
};

type SubjectRelation = {
  id: string;
  name: string;
  level: string | null;
  grade: string | null;
};

type AttendanceRow = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  schedule_id: string | null;
  attendance_date: string | null;
  day_name: string | null;
  start_time: string | null;
  end_time: string | null;
  attendance_status: string | null;
  understanding_status: string | null;
  material_topic: string | null;
  notes: string | null;
  created_at: string | null;
  students: StudentRelation | StudentRelation[] | null;
  subjects: SubjectRelation | SubjectRelation[] | null;
};

type Attendance = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  schedule_id: string | null;
  attendance_date: string | null;
  day_name: string | null;
  start_time: string | null;
  end_time: string | null;
  attendance_status: string | null;
  understanding_status: string | null;
  material_topic: string | null;
  notes: string | null;
  created_at: string | null;
  students: StudentRelation | null;
  subjects: SubjectRelation | null;
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
  students: StudentRelation | StudentRelation[] | null;
  subjects: SubjectRelation | SubjectRelation[] | null;
};

type Schedule = {
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
  students: StudentRelation | null;
  subjects: SubjectRelation | null;
};

type AttendanceForm = {
  schedule_id: string;
  student_id: string;
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
  schedule_id: "",
  student_id: "",
  subject_id: "",
  attendance_date: new Date().toISOString().slice(0, 10),
  day_name: "",
  start_time: "",
  end_time: "",
  attendance_status: "Hadir",
  understanding_status: "Paham",
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

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getAttendanceBadge(status: string | null) {
  if (status === "Hadir") return "bg-emerald-100 text-emerald-700";
  if (status === "Sakit") return "bg-yellow-100 text-yellow-700";
  if (status === "Izin") return "bg-blue-100 text-blue-700";
  if (status === "Alpha") return "bg-red-100 text-red-700";

  return "bg-slate-200 text-slate-700";
}

function getUnderstandingBadge(status: string | null) {
  if (status === "Paham") return "bg-emerald-100 text-emerald-700";
  if (status === "Bisa") return "bg-blue-100 text-blue-700";
  if (status === "Mengerti") return "bg-purple-100 text-purple-700";
  if (status === "Tidak Mengerti") return "bg-red-100 text-red-700";

  return "bg-yellow-100 text-yellow-700";
}

function getDayNameFromDate(dateString: string) {
  if (!dateString) return "";

  const dayNames = [
    "Minggu",
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
    "Sabtu",
  ];

  const date = new Date(dateString);

  return dayNames[date.getDay()] || "";
}

export default function TeacherAbsensiPage() {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [attendanceList, setAttendanceList] = useState<Attendance[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [dateFilter, setDateFilter] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<AttendanceForm>(initialForm);

  async function fetchActiveTeacher() {
    const { data, error } = await supabase
      .from("teachers")
      .select("id, full_name, email, phone, teacher_code, subjects")
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);

    const teacherList = data || [];

    const sarahTeacher =
      teacherList.find((item) =>
        item.full_name?.toLowerCase().includes("sarah")
      ) || null;

    const selectedTeacher = sarahTeacher || teacherList[0] || null;

    setTeacher(selectedTeacher);

    return selectedTeacher;
  }

  async function fetchSchedules(teacherId: string) {
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
        students (
          id,
          full_name,
          grade,
          level,
          nis,
          nisn
        ),
        subjects (
          id,
          name,
          level,
          grade
        )
      `
      )
      .eq("teacher_id", teacherId)
      .order("schedule_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) throw new Error(error.message);

    const rows = (data || []) as ScheduleRow[];

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
      students: normalizeRelation(item.students),
      subjects: normalizeRelation(item.subjects),
    }));

    setSchedules(normalizedSchedules);
  }

  async function fetchAttendance(teacherId: string) {
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
        created_at,
        students (
          id,
          full_name,
          grade,
          level,
          nis,
          nisn
        ),
        subjects (
          id,
          name,
          level,
          grade
        )
      `
      )
      .eq("teacher_id", teacherId)
      .order("attendance_date", { ascending: false })
      .order("start_time", { ascending: true });

    if (error) throw new Error(error.message);

    const rows = (data || []) as AttendanceRow[];

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
      created_at: item.created_at,
      students: normalizeRelation(item.students),
      subjects: normalizeRelation(item.subjects),
    }));

    setAttendanceList(normalizedAttendance);
  }

  async function fetchPageData() {
    setLoading(true);
    setErrorMessage("");

    try {
      const activeTeacher = await fetchActiveTeacher();

      if (!activeTeacher) {
        setErrorMessage("Belum ada data guru di table teachers.");
        setLoading(false);
        return;
      }

      await Promise.all([
        fetchSchedules(activeTeacher.id),
        fetchAttendance(activeTeacher.id),
      ]);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengambil data absensi.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPageData();
  }, []);

  const filteredAttendance = useMemo(() => {
    const keyword = search.toLowerCase();

    return attendanceList.filter((attendance) => {
      const matchSearch =
        attendance.students?.full_name?.toLowerCase().includes(keyword) ||
        attendance.students?.grade?.toLowerCase().includes(keyword) ||
        attendance.subjects?.name?.toLowerCase().includes(keyword) ||
        attendance.material_topic?.toLowerCase().includes(keyword) ||
        attendance.notes?.toLowerCase().includes(keyword);

      const matchStatus =
        statusFilter === "Semua Status" ||
        attendance.attendance_status === statusFilter;

      const matchDate =
        !dateFilter || attendance.attendance_date === dateFilter;

      return matchSearch && matchStatus && matchDate;
    });
  }, [attendanceList, search, statusFilter, dateFilter]);

  const todayAttendance = attendanceList.filter(
    (attendance) => attendance.attendance_date === getTodayDate()
  ).length;

  const totalPresent = attendanceList.filter(
    (attendance) => attendance.attendance_status === "Hadir"
  ).length;

  const attendancePercentage =
    attendanceList.length > 0
      ? Math.round((totalPresent / attendanceList.length) * 100)
      : 0;

  const totalNotPresent = attendanceList.filter(
    (attendance) => attendance.attendance_status !== "Hadir"
  ).length;

  function openModal(schedule?: Schedule) {
    setErrorMessage("");

    if (schedule) {
      setForm({
        schedule_id: schedule.id,
        student_id: schedule.student_id || "",
        subject_id: schedule.subject_id || "",
        attendance_date:
          schedule.schedule_date || new Date().toISOString().slice(0, 10),
        day_name:
          schedule.day_name ||
          getDayNameFromDate(new Date().toISOString().slice(0, 10)),
        start_time: schedule.start_time || "",
        end_time: schedule.end_time || "",
        attendance_status: "Hadir",
        understanding_status: "Paham",
        material_topic: schedule.material_topic || "",
        notes: "",
      });
    } else {
      setForm({
        ...initialForm,
        attendance_date: new Date().toISOString().slice(0, 10),
        day_name: getDayNameFromDate(new Date().toISOString().slice(0, 10)),
      });
    }

    setIsModalOpen(true);
  }

  function handleScheduleChange(scheduleId: string) {
    const selectedSchedule = schedules.find(
      (schedule) => schedule.id === scheduleId
    );

    if (!selectedSchedule) {
      setForm({
        ...form,
        schedule_id: "",
        student_id: "",
        subject_id: "",
        day_name: getDayNameFromDate(form.attendance_date),
        start_time: "",
        end_time: "",
        material_topic: "",
      });
      return;
    }

    setForm({
      ...form,
      schedule_id: selectedSchedule.id,
      student_id: selectedSchedule.student_id || "",
      subject_id: selectedSchedule.subject_id || "",
      attendance_date:
        selectedSchedule.schedule_date ||
        form.attendance_date ||
        new Date().toISOString().slice(0, 10),
      day_name:
        selectedSchedule.day_name ||
        getDayNameFromDate(form.attendance_date),
      start_time: selectedSchedule.start_time || "",
      end_time: selectedSchedule.end_time || "",
      material_topic: selectedSchedule.material_topic || "",
    });
  }

  async function handleSubmitAttendance(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setErrorMessage("");

    if (!teacher?.id) {
      setErrorMessage("Data guru aktif tidak ditemukan.");
      return;
    }

    if (!form.schedule_id) {
      setErrorMessage("Jadwal wajib dipilih.");
      return;
    }

    if (!form.student_id) {
      setErrorMessage("Siswa wajib dipilih dari jadwal.");
      return;
    }

    if (!form.subject_id) {
      setErrorMessage("Mata pelajaran wajib dipilih dari jadwal.");
      return;
    }

    if (!form.attendance_date) {
      setErrorMessage("Tanggal absensi wajib diisi.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from("attendance").insert({
        student_id: form.student_id,
        teacher_id: teacher.id,
        subject_id: form.subject_id,
        schedule_id: form.schedule_id || null,
        attendance_date: form.attendance_date,
        day_name: form.day_name || getDayNameFromDate(form.attendance_date),
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        attendance_status: form.attendance_status,
        understanding_status: form.understanding_status,
        material_topic: form.material_topic.trim() || null,
        notes: form.notes.trim() || null,
      });

      if (error) {
        throw new Error(error.message);
      }

      setForm({
        ...initialForm,
        attendance_date: new Date().toISOString().slice(0, 10),
      });
      setIsModalOpen(false);
      await fetchAttendance(teacher.id);
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
    setForm({
      ...initialForm,
      attendance_date: new Date().toISOString().slice(0, 10),
    });
  }

  const selectedSchedule = schedules.find(
    (schedule) => schedule.id === form.schedule_id
  );

  return (
    <TeacherLayout
      activeMenu="Absensi KBM"
      searchPlaceholder="Cari absensi KBM..."
      buttonLabel="+ Input Absensi"
    >
      <div className="w-full max-w-full overflow-hidden">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#6B4A3A]">
              Teacher Portal
            </p>

            <h1 className="mt-1 text-[30px] font-bold tracking-tight">
              Absensi KBM
            </h1>

            <p className="mt-1 text-sm text-[#6B4A3A]">
              Input dan pantau kehadiran siswa untuk{" "}
              <span className="font-bold text-[#2B1B18]">
                {teacher?.full_name || "guru aktif"}
              </span>
              .
            </p>
          </div>

          <button
            type="button"
            onClick={() => openModal()}
            className="w-fit rounded-xl bg-[#7A1F2B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#54131D]"
          >
            + Input Absensi
          </button>
        </div>

        {errorMessage && !isModalOpen && (
          <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {loading && (
          <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-8 text-center text-sm shadow-sm">
            Loading absensi KBM...
          </div>
        )}

        {!loading && (
          <>
            <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6B4A3A]">Total Absensi</p>
                <p className="mt-4 text-3xl font-bold">
                  {attendanceList.length}
                </p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6B4A3A]">Absensi Hari Ini</p>
                <p className="mt-4 text-3xl font-bold">{todayAttendance}</p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6B4A3A]">Kehadiran</p>
                <p className="mt-4 text-3xl font-bold">
                  {attendancePercentage}%
                </p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6B4A3A]">Tidak Hadir</p>
                <p className="mt-4 text-3xl font-bold">{totalNotPresent}</p>
              </div>
            </div>

            <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_220px]">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari siswa, kelas, mapel, materi, catatan..."
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

                <input
                  type="date"
                  value={dateFilter}
                  onChange={(event) => setDateFilter(event.target.value)}
                  className="rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                />
              </div>
            </div>

            <div className="mt-7 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
              <div className="overflow-hidden rounded-2xl border border-[#E8D6C1] bg-white shadow-sm">
                <div className="border-b border-[#E8D6C1] px-6 py-5">
                  <h2 className="text-lg font-bold">Rekap Absensi</h2>
                  <p className="mt-1 text-sm text-[#6B4A3A]">
                    Data absensi KBM yang tersimpan di Supabase.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1180px] text-left">
                    <thead className="bg-[#FFF8EF] text-sm font-bold text-[#6B4A3A]">
                      <tr>
                        <th className="px-4 py-4">Hari</th>
                        <th className="px-4 py-4">Tanggal</th>
                        <th className="px-4 py-4">Jam</th>
                        <th className="px-4 py-4">Siswa</th>
                        <th className="px-4 py-4">Kelas</th>
                        <th className="px-4 py-4">Mapel</th>
                        <th className="px-4 py-4">Kehadiran</th>
                        <th className="px-4 py-4">Pemahaman</th>
                        <th className="px-4 py-4">Materi</th>
                        <th className="px-4 py-4">Catatan</th>
                        <th className="px-4 py-4">Aksi</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#E8D6C1]">
                      {filteredAttendance.length === 0 && (
                        <tr>
                          <td
                            colSpan={11}
                            className="px-4 py-10 text-center text-sm text-[#6B4A3A]"
                          >
                            Belum ada data absensi untuk guru ini.
                          </td>
                        </tr>
                      )}

                      {filteredAttendance.map((attendance) => (
                        <tr key={attendance.id} className="hover:bg-[#FFF8EF]">
                          <td className="px-4 py-4 font-semibold">
                            {attendance.day_name || "-"}
                          </td>

                          <td className="px-4 py-4">
                            {formatDate(attendance.attendance_date)}
                          </td>

                          <td className="px-4 py-4">
                            {formatTime(attendance.start_time)} -{" "}
                            {formatTime(attendance.end_time)}
                          </td>

                          <td className="px-4 py-4 font-semibold">
                            {attendance.students?.full_name || "-"}
                          </td>

                          <td className="px-4 py-4">
                            {attendance.students?.grade || "-"}
                          </td>

                          <td className="px-4 py-4">
                            {attendance.subjects?.name || "-"}
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

                          <td className="px-4 py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${getUnderstandingBadge(
                                attendance.understanding_status
                              )}`}
                            >
                              {attendance.understanding_status || "-"}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            {attendance.material_topic || "-"}
                          </td>

                          <td className="px-4 py-4">
                            {attendance.notes || "-"}
                          </td>

                          <td className="px-4 py-4">
                            <button
                              type="button"
                              onClick={() => {
                                const schedule = schedules.find(
                                  (item) => item.id === attendance.schedule_id
                                );
                                openModal(schedule);
                              }}
                              className="rounded-xl bg-[#7A1F2B] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#54131D]"
                            >
                              + Input Lagi
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold">Guru Aktif</h2>

                  <div className="mt-5 rounded-2xl bg-[#FFF8EF] p-5">
                    <p className="text-sm text-[#6B4A3A]">Nama Guru</p>
                    <p className="mt-2 text-xl font-bold">
                      {teacher?.full_name || "-"}
                    </p>

                    <div className="mt-4 space-y-2 text-sm text-[#6B4A3A]">
                      <p>
                        <span className="font-semibold text-[#2B1B18]">
                          Kode:
                        </span>{" "}
                        {teacher?.teacher_code || "-"}
                      </p>

                      <p>
                        <span className="font-semibold text-[#2B1B18]">
                          Email:
                        </span>{" "}
                        {teacher?.email || "-"}
                      </p>

                      <p>
                        <span className="font-semibold text-[#2B1B18]">
                          Mapel:
                        </span>{" "}
                        {teacher?.subjects?.join(", ") || "-"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold">Jadwal Tersedia</h2>
                  <p className="mt-1 text-sm text-[#6B4A3A]">
                    Pilih jadwal saat input absensi.
                  </p>

                  <div className="mt-5 space-y-3">
                    {schedules.length === 0 && (
                      <div className="rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] p-4 text-sm text-[#6B4A3A]">
                        Belum ada jadwal mengajar.
                      </div>
                    )}

                    {schedules.slice(0, 4).map((schedule) => (
                      <div
                        key={schedule.id}
                        className="rounded-xl border border-[#E8D6C1] p-4"
                      >
                        <p className="font-bold">
                          {schedule.students?.full_name || "-"}
                        </p>

                        <p className="mt-1 text-sm text-[#6B4A3A]">
                          {schedule.day_name || "-"} •{" "}
                          {formatTime(schedule.start_time)} -{" "}
                          {formatTime(schedule.end_time)}
                        </p>

                        <p className="mt-1 text-sm text-[#6B4A3A]">
                          {schedule.subjects?.name || "-"} •{" "}
                          {schedule.material_topic || "-"}
                        </p>

                        <button
                          type="button"
                          onClick={() => openModal(schedule)}
                          className="mt-3 w-full rounded-xl bg-[#7A1F2B] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#54131D]"
                        >
                          + Input Absensi
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold">Catatan</h2>
                  <p className="mt-3 text-sm leading-6 text-[#6B4A3A]">
                    Tombol{" "}
                    <span className="font-bold text-[#2B1B18]">
                      + Input Absensi
                    </span>{" "}
                    akan membuka form absensi. Jika dipilih dari jadwal, data
                    murid, mapel, jam, dan materi akan otomatis terisi.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
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
                  <label className="text-sm font-bold">Pilih Jadwal</label>
                  <select
                    value={form.schedule_id}
                    onChange={(event) =>
                      handleScheduleChange(event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                  >
                    <option value="">Pilih jadwal</option>
                    {schedules.map((schedule) => (
                      <option key={schedule.id} value={schedule.id}>
                        {schedule.students?.full_name || "-"} —{" "}
                        {schedule.subjects?.name || "-"} —{" "}
                        {schedule.day_name || "-"}{" "}
                        {formatTime(schedule.start_time)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-bold">Murid</label>
                  <input
                    value={selectedSchedule?.students?.full_name || ""}
                    readOnly
                    placeholder="Otomatis dari jadwal"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] px-4 py-3 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Mata Pelajaran</label>
                  <input
                    value={selectedSchedule?.subjects?.name || ""}
                    readOnly
                    placeholder="Otomatis dari jadwal"
                    className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] px-4 py-3 text-sm outline-none"
                  />
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
                          day_name: getDayNameFromDate(event.target.value),
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold">Hari</label>
                    <input
                      value={form.day_name}
                      onChange={(event) =>
                        setForm({ ...form, day_name: event.target.value })
                      }
                      placeholder="Senin"
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
                    <label className="text-sm font-bold">Pemahaman</label>
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
                      <option>Paham</option>
                      <option>Mengerti</option>
                      <option>Bisa</option>
                      <option>Tahu</option>
                      <option>Tidak Mengerti</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold">Catatan</label>
                  <textarea
                    value={form.notes}
                    onChange={(event) =>
                      setForm({ ...form, notes: event.target.value })
                    }
                    placeholder="Catatan absensi atau pemahaman siswa"
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
    </TeacherLayout>
  );
}