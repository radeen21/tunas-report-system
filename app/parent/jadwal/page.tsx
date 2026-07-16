"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import ParentLayout from "../components/ParentLayout";

type Parent = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  relation: string | null;
};

type TeacherRelation = {
  id: string;
  full_name: string;
  email: string | null;
};

type StudentRow = {
  id: string;
  parent_id: string | null;
  homeroom_teacher_id: string | null;
  nis: string | null;
  nisn: string | null;
  full_name: string;
  level: string | null;
  grade: string | null;
  academic_year: string | null;
  status: string | null;
  teachers: TeacherRelation | TeacherRelation[] | null;
};

type Student = {
  id: string;
  parent_id: string | null;
  homeroom_teacher_id: string | null;
  nis: string | null;
  nisn: string | null;
  full_name: string;
  level: string | null;
  grade: string | null;
  academic_year: string | null;
  status: string | null;
  teachers: TeacherRelation | null;
};

type TeacherScheduleRelation = {
  id: string;
  full_name: string;
  teacher_code: string | null;
  email: string | null;
};

type SubjectRelation = {
  id: string;
  name: string;
  level: string | null;
  grade: string | null;
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
  academic_year: string | null;
  semester: string | null;
  teachers: TeacherScheduleRelation | TeacherScheduleRelation[] | null;
  subjects: SubjectRelation | SubjectRelation[] | null;
};

type ScheduleItem = Omit<ScheduleRow, "teachers" | "subjects"> & {
  teachers: TeacherScheduleRelation | null;
  subjects: SubjectRelation | null;
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

function getDayOrder(day: string | null) {
  const days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
  const index = days.findIndex(
    (item) => item.toLowerCase() === String(day || "").toLowerCase()
  );

  return index === -1 ? 99 : index;
}

function getSessionBadge(session: string | null) {
  if (!session) return "bg-slate-100 text-slate-700";

  const lower = session.toLowerCase();

  if (lower.includes("1")) return "bg-emerald-100 text-emerald-700";
  if (lower.includes("2")) return "bg-blue-100 text-blue-700";
  if (lower.includes("3")) return "bg-yellow-100 text-yellow-700";

  return "bg-[#F1DFD5] text-[#7A1F2B]";
}

export default function ParentJadwalPage() {
  const [parent, setParent] = useState<Parent | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function fetchActiveParent() {
    const { data, error } = await supabase
      .from("parents")
      .select("id, full_name, email, phone, relation")
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);

    const parentList = data || [];

    const ericParent =
      parentList.find((item) =>
        item.full_name?.toLowerCase().includes("eric")
      ) || null;

    const selectedParent = ericParent || parentList[0] || null;

    setParent(selectedParent);

    return selectedParent;
  }

  async function fetchStudents(parentId: string) {
    const { data, error } = await supabase
      .from("students")
      .select(
        `
        id,
        parent_id,
        homeroom_teacher_id,
        nis,
        nisn,
        full_name,
        level,
        grade,
        academic_year,
        status,
        teachers (
          id,
          full_name,
          email
        )
      `
      )
      .eq("parent_id", parentId)
      .order("full_name", { ascending: true });

    if (error) throw new Error(error.message);

    const rows = (data || []) as StudentRow[];

    const normalizedStudents: Student[] = rows.map((item) => ({
      id: item.id,
      parent_id: item.parent_id,
      homeroom_teacher_id: item.homeroom_teacher_id,
      nis: item.nis,
      nisn: item.nisn,
      full_name: item.full_name,
      level: item.level,
      grade: item.grade,
      academic_year: item.academic_year,
      status: item.status,
      teachers: normalizeRelation(item.teachers),
    }));

    setStudents(normalizedStudents);

    if (normalizedStudents.length > 0) {
      setSelectedStudentId(normalizedStudents[0].id);
      return normalizedStudents[0];
    }

    return null;
  }

  async function fetchSchedules(studentId: string) {
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
        teachers (
          id,
          full_name,
          teacher_code,
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
      .eq("student_id", studentId)
      .order("schedule_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) throw new Error(error.message);

    const rows = (data || []) as ScheduleRow[];

    const normalizedSchedules: ScheduleItem[] = rows
      .map((item) => ({
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
        teachers: normalizeRelation(item.teachers),
        subjects: normalizeRelation(item.subjects),
      }))
      .sort((a, b) => {
        const dayDiff = getDayOrder(a.day_name) - getDayOrder(b.day_name);

        if (dayDiff !== 0) return dayDiff;

        return String(a.start_time || "").localeCompare(String(b.start_time || ""));
      });

    setSchedules(normalizedSchedules);
  }

  async function fetchPageData() {
    setLoading(true);
    setErrorMessage("");

    try {
      const activeParent = await fetchActiveParent();

      if (!activeParent) {
        setErrorMessage("Belum ada data parent di table parents.");
        return;
      }

      const firstStudent = await fetchStudents(activeParent.id);

      if (!firstStudent) {
        setErrorMessage("Belum ada murid yang terhubung ke parent ini.");
        return;
      }

      await fetchSchedules(firstStudent.id);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengambil jadwal belajar.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleChangeStudent(studentId: string) {
    setSelectedStudentId(studentId);
    setLoading(true);
    setErrorMessage("");

    try {
      await fetchSchedules(studentId);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengganti data anak.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPageData();
  }, []);

  const selectedStudent = students.find(
    (student) => student.id === selectedStudentId
  );

  const totalSubjects = useMemo(() => {
    const subjectIds = schedules
      .map((schedule) => schedule.subject_id)
      .filter(Boolean) as string[];

    return new Set(subjectIds).size;
  }, [schedules]);

  const totalTeachers = useMemo(() => {
    const teacherIds = schedules
      .map((schedule) => schedule.teacher_id)
      .filter(Boolean) as string[];

    return new Set(teacherIds).size;
  }, [schedules]);

  const daySummary = useMemo(() => {
    const map = new Map<string, number>();

    schedules.forEach((schedule) => {
      const day = schedule.day_name || "-";
      map.set(day, (map.get(day) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([day, total]) => ({ day, total }))
      .sort((a, b) => getDayOrder(a.day) - getDayOrder(b.day));
  }, [schedules]);

  return (
    <ParentLayout
      activeMenu="Jadwal Belajar"
      searchPlaceholder="Cari jadwal belajar..."
      parentName={parent?.full_name || "Parent"}
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-[28px] font-extrabold tracking-tight">
              Jadwal Belajar Anak
            </h1>

            <p className="mt-1 text-base text-[#6B4A3A]">
              Jadwal pembelajaran {selectedStudent?.full_name || "anak"}
            </p>
          </div>

          {students.length > 1 && (
            <select
              value={selectedStudentId}
              onChange={(event) => handleChangeStudent(event.target.value)}
              className="w-full rounded-xl border border-[#E8D6C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#7A1F2B] md:w-[260px]"
            >
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name}
                </option>
              ))}
            </select>
          )}
        </div>

        {errorMessage && (
          <div className="mb-5 rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {loading && (
          <div className="rounded-2xl border border-[#E8D6C1] bg-white p-10 text-center text-sm shadow-sm">
            Loading jadwal belajar...
          </div>
        )}

        {!loading && (
          <>
            <div className="mb-7 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-[#6B4A3A]">
                  Total Jadwal
                </p>
                <p className="mt-2 text-3xl font-extrabold">
                  {schedules.length}
                </p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-[#6B4A3A]">
                  Mata Pelajaran
                </p>
                <p className="mt-2 text-3xl font-extrabold">{totalSubjects}</p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-[#6B4A3A]">
                  Guru Pengajar
                </p>
                <p className="mt-2 text-3xl font-extrabold">{totalTeachers}</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#E8D6C1] bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left">
                  <thead className="border-b border-[#E8D6C1] bg-white text-sm font-extrabold text-[#6B4A3A]">
                    <tr>
                      <th className="px-4 py-4">Hari</th>
                      <th className="px-4 py-4">Tanggal</th>
                      <th className="px-4 py-4">Jam</th>
                      <th className="px-4 py-4">Mata Pelajaran</th>
                      <th className="px-4 py-4">Sesi</th>
                      <th className="px-4 py-4">Guru</th>
                      <th className="px-4 py-4">Keterangan</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#E8D6C1] text-[15px]">
                    {schedules.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-10 text-center text-sm text-[#6B4A3A]"
                        >
                          Belum ada jadwal belajar untuk anak ini.
                        </td>
                      </tr>
                    )}

                    {schedules.map((schedule) => (
                      <tr key={schedule.id} className="hover:bg-[#FFF8EF]">
                        <td className="px-4 py-4 font-semibold">
                          {schedule.day_name || "-"}
                        </td>

                        <td className="px-4 py-4 text-[#6B4A3A]">
                          {formatDate(schedule.schedule_date)}
                        </td>

                        <td className="px-4 py-4 font-medium">
                          {formatTime(schedule.start_time)}-
                          {formatTime(schedule.end_time)}
                        </td>

                        <td className="px-4 py-4 font-semibold">
                          {schedule.subjects?.name || "-"}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-extrabold ${getSessionBadge(
                              schedule.session_name
                            )}`}
                          >
                            {schedule.session_name || "-"}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-[#6B4A3A]">
                          {schedule.teachers?.full_name || "-"}
                        </td>

                        <td className="px-4 py-4 text-[#6B4A3A]">
                          {schedule.material_topic || "Rutin"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <h2 className="text-lg font-extrabold">Ringkasan Hari</h2>

                <div className="mt-5 space-y-4">
                  {daySummary.length === 0 && (
                    <div className="rounded-xl bg-[#FFF8EF] p-4 text-sm text-[#6B4A3A]">
                      Belum ada ringkasan hari.
                    </div>
                  )}

                  {daySummary.map((item) => (
                    <div key={item.day}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-semibold">{item.day}</span>
                        <span className="font-bold text-[#7A1F2B]">
                          {item.total} jadwal
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-[#F1DFD5]">
                        <div
                          className="h-full rounded-full bg-[#8C0F2D]"
                          style={{
                            width:
                              schedules.length > 0
                                ? `${(item.total / schedules.length) * 100}%`
                                : "0%",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
                <h2 className="text-lg font-extrabold">Info Anak</h2>

                <div className="mt-5 rounded-2xl bg-[#FFF8EF] p-5">
                  <p className="text-sm text-[#6B4A3A]">Nama Anak</p>
                  <p className="mt-1 text-xl font-extrabold">
                    {selectedStudent?.full_name || "-"}
                  </p>

                  <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-[#6B4A3A]">
                    <p>
                      <span className="font-bold text-[#2B1B18]">Level:</span>{" "}
                      {selectedStudent?.level || "-"}
                    </p>

                    <p>
                      <span className="font-bold text-[#2B1B18]">Grade:</span>{" "}
                      {selectedStudent?.grade || "-"}
                    </p>

                    <p>
                      <span className="font-bold text-[#2B1B18]">
                        Tahun Ajaran:
                      </span>{" "}
                      {selectedStudent?.academic_year || "-"}
                    </p>

                    <p>
                      <span className="font-bold text-[#2B1B18]">
                        Guru Pendamping:
                      </span>{" "}
                      {selectedStudent?.teachers?.full_name || "-"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </ParentLayout>
  );
}