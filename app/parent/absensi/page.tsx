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
  attendance: number | null;
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
  attendance: number | null;
  teachers: TeacherRelation | null;
};

type SubjectRelation = {
  id: string;
  name: string;
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
  subjects: SubjectRelation | SubjectRelation[] | null;
};

type AttendanceItem = Omit<AttendanceRow, "subjects"> & {
  subjects: SubjectRelation | null;
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
  if (status === "Hadir") return "bg-emerald-100 text-emerald-800";
  if (status === "Sakit") return "bg-yellow-100 text-yellow-800";
  if (status === "Izin") return "bg-blue-100 text-blue-800";
  if (status === "Alpha") return "bg-red-100 text-red-800";
  if (status === "Terlambat") return "bg-orange-100 text-orange-800";

  return "bg-slate-100 text-slate-700";
}

function getUnderstandingCode(status: string | null) {
  if (!status) return "-";

  const value = status.toLowerCase();

  if (value === "tahu" || value === "t") return "T";
  if (value === "bisa" || value === "b") return "B";
  if (value === "paham" || value === "p") return "P";
  if (value === "mengerti" || value === "m") return "M";
  if (value === "tidak mengerti" || value === "tm") return "TM";

  return status.toUpperCase().slice(0, 2);
}

function getUnderstandingLabel(status: string | null) {
  const code = getUnderstandingCode(status);

  if (code === "T") return "Tahu";
  if (code === "B") return "Bisa";
  if (code === "P") return "Paham";
  if (code === "M") return "Mengerti";
  if (code === "TM") return "Tidak Mengerti";

  return status || "-";
}

function getUnderstandingBadge(status: string | null) {
  const code = getUnderstandingCode(status);

  if (code === "P") return "border-emerald-300 bg-emerald-50 text-emerald-700";
  if (code === "B") return "border-blue-300 bg-blue-50 text-blue-700";
  if (code === "M") return "border-yellow-300 bg-yellow-50 text-yellow-700";
  if (code === "T") return "border-orange-300 bg-orange-50 text-orange-700";
  if (code === "TM") return "border-red-300 bg-red-50 text-red-700";

  return "border-[#D96B2B] bg-[#FFF8EF] text-[#D96B2B]";
}

function getDayOrder(day: string | null) {
  const days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
  const index = days.findIndex(
    (item) => item.toLowerCase() === String(day || "").toLowerCase()
  );

  return index === -1 ? 99 : index;
}

export default function ParentAbsensiPage() {
  const [parent, setParent] = useState<Parent | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [attendanceList, setAttendanceList] = useState<AttendanceItem[]>([]);

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
        attendance,
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
      attendance: item.attendance,
      teachers: normalizeRelation(item.teachers),
    }));

    setStudents(normalizedStudents);

    if (normalizedStudents.length > 0) {
      setSelectedStudentId(normalizedStudents[0].id);
      return normalizedStudents[0];
    }

    return null;
  }

  async function fetchAttendance(studentId: string) {
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
        subjects (
          id,
          name
        )
      `
      )
      .eq("student_id", studentId)
      .order("attendance_date", { ascending: false })
      .order("start_time", { ascending: true });

    if (error) throw new Error(error.message);

    const rows = (data || []) as AttendanceRow[];

    const normalizedAttendance: AttendanceItem[] = rows
      .map((item) => ({
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
        subjects: normalizeRelation(item.subjects),
      }))
      .sort((a, b) => {
        const dateA = new Date(a.attendance_date || "").getTime();
        const dateB = new Date(b.attendance_date || "").getTime();

        if (dateB !== dateA) return dateB - dateA;

        const dayDiff = getDayOrder(a.day_name) - getDayOrder(b.day_name);
        if (dayDiff !== 0) return dayDiff;

        return String(a.start_time || "").localeCompare(String(b.start_time || ""));
      });

    setAttendanceList(normalizedAttendance);
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

      await fetchAttendance(firstStudent.id);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengambil data absensi anak.");
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
      await fetchAttendance(studentId);
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

  const attendancePercentage = useMemo(() => {
    if (attendanceList.length === 0) {
      return Number(selectedStudent?.attendance || 0);
    }

    const present = attendanceList.filter(
      (item) => item.attendance_status === "Hadir"
    ).length;

    return Math.round((present / attendanceList.length) * 100);
  }, [attendanceList, selectedStudent]);

  const presentCount = attendanceList.filter(
    (item) => item.attendance_status === "Hadir"
  ).length;

  const absentCount = attendanceList.filter(
    (item) =>
      item.attendance_status === "Alpha" ||
      item.attendance_status === "Izin" ||
      item.attendance_status === "Sakit"
  ).length;

  const lateCount = attendanceList.filter(
    (item) =>
      item.attendance_status === "Terlambat" ||
      item.attendance_status?.toLowerCase() === "late"
  ).length;

  return (
    <ParentLayout
      activeMenu="Absensi Anak"
      searchPlaceholder="Cari absensi anak..."
      parentName={parent?.full_name || "Parent"}
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-[28px] font-extrabold tracking-tight">
              Absensi Anak
            </h1>

            <p className="mt-1 text-base text-[#6B4A3A]">
              Rekap kehadiran {selectedStudent?.full_name || "anak"} — attendance{" "}
              {attendancePercentage}%
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
            Loading absensi anak...
          </div>
        )}

        {!loading && (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-[#6B4A3A]">
                  Total Absensi
                </p>
                <p className="mt-2 text-3xl font-extrabold">
                  {attendanceList.length}
                </p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-[#6B4A3A]">Hadir</p>
                <p className="mt-2 text-3xl font-extrabold text-emerald-700">
                  {presentCount}
                </p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-[#6B4A3A]">
                  Tidak Hadir
                </p>
                <p className="mt-2 text-3xl font-extrabold text-red-700">
                  {absentCount}
                </p>
              </div>

              <div className="rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-[#6B4A3A]">
                  Terlambat
                </p>
                <p className="mt-2 text-3xl font-extrabold text-orange-700">
                  {lateCount}
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#E8D6C1] bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-left">
                  <thead className="border-b border-[#E8D6C1] bg-white text-sm font-extrabold text-[#6B4A3A]">
                    <tr>
                      <th className="px-4 py-4">Hari</th>
                      <th className="px-4 py-4">Tanggal</th>
                      <th className="px-4 py-4">Waktu</th>
                      <th className="px-4 py-4">Sesi</th>
                      <th className="px-4 py-4">Kehadiran</th>
                      <th className="px-4 py-4">Materi</th>
                      <th className="px-4 py-4">Ket.</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#E8D6C1] text-[15px]">
                    {attendanceList.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-10 text-center text-sm text-[#6B4A3A]"
                        >
                          Belum ada data absensi untuk anak ini.
                        </td>
                      </tr>
                    )}

                    {attendanceList.map((attendance, index) => (
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

                        <td className="px-4 py-4">
                          Sesi {index + 1}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-4 py-1.5 text-xs font-extrabold ${getAttendanceBadge(
                              attendance.attendance_status
                            )}`}
                          >
                            {attendance.attendance_status || "-"}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          {attendance.material_topic ||
                            attendance.subjects?.name ||
                            "-"}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex min-w-8 items-center justify-center rounded-full border px-3 py-1 text-xs font-extrabold ${getUnderstandingBadge(
                              attendance.understanding_status
                            )}`}
                            title={getUnderstandingLabel(
                              attendance.understanding_status
                            )}
                          >
                            {getUnderstandingCode(
                              attendance.understanding_status
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
              <h2 className="text-lg font-extrabold">
                Legenda Pemahaman Materi
              </h2>

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                <LegendItem
                  code="T"
                  label="Tahu"
                  description="Siswa sekedar tahu materi"
                />

                <LegendItem
                  code="B"
                  label="Bisa"
                  description="Siswa sudah bisa dengan materi"
                />

                <LegendItem
                  code="P"
                  label="Paham"
                  description="Siswa sudah paham materi"
                />

                <LegendItem
                  code="M"
                  label="Mengerti"
                  description="Siswa mengerti materi"
                />

                <LegendItem
                  code="TM"
                  label="Tidak Mengerti"
                  description="Perlu pengulangan"
                />
              </div>
            </div>

            <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
              <h2 className="text-lg font-extrabold">Info Absensi</h2>

              <div className="mt-4 rounded-2xl bg-[#FFF8EF] p-5 text-sm leading-6 text-[#6B4A3A]">
                <p>
                  Data absensi ini otomatis mengikuti input dari guru di menu{" "}
                  <span className="font-bold text-[#2B1B18]">Absensi KBM</span>.
                  Orang tua dapat memantau kehadiran, materi yang dipelajari,
                  dan tingkat pemahaman anak.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </ParentLayout>
  );
}

function LegendItem({
  code,
  label,
  description,
}: {
  code: string;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] px-4 py-3">
      <span className="inline-flex min-w-9 items-center justify-center rounded-full bg-[#D96B2B] px-3 py-1 text-xs font-extrabold text-white">
        {code}
      </span>

      <p className="text-sm text-[#6B4A3A]">
        <span className="font-bold text-[#2B1B18]">{label}</span> —{" "}
        {description}
      </p>
    </div>
  );
}