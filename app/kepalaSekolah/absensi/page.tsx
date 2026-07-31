"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import * as XLSX from "xlsx";
import {
  AlertCircle,
  CalendarCheck,
  Eye,
  Search,
  UserCheck,
  UserX,
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

type AttendanceRow = {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  attendance_date: string | null;
  day_name: string | null;
  start_time: string | null;
  end_time: string | null;
  attendance_status: string | null;
  understanding_status: string | null;
  material_topic: string | null;
  note?: string | null;
  notes?: string | null;
};

type EnrichedAttendance = AttendanceRow & {
  student_name: string;
  student_grade: string;
  student_level: string;
  student_nis: string;
  student_nisn: string;
  teacher_name: string;
  subject_name: string;
};

type RombelGroup = {
  key: string;
  attendance_date: string | null;
  day_name: string | null;
  start_time: string | null;
  end_time: string | null;
  teacher_id: string | null;
  teacher_name: string;
  subject_id: string | null;
  subject_name: string;
  material_topic: string | null;
  students: EnrichedAttendance[];
  total: number;
  hadir: number;
  izin: number;
  alpa: number;
  sakit: number;
  paham: number;
  cukupPaham: number;
  belumPaham: number;
};

const statusOptions = ["Semua Status", "Hadir", "Izin", "Alpa", "Sakit"];

const monthOptions = [
  "Semua Bulan",
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function normalizeText(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function normalizeLevel(level?: string | null) {
  const safe = normalizeText(level);

  if (safe.includes("primary") || safe === "sd") return "SD";
  if (safe.includes("secondary") || safe === "smp") return "SMP";
  if (safe.includes("high") || safe === "sma") return "SMA";
  if (safe.includes("early")) return "Bimbel/Kursus";

  return level || "-";
}

function formatClass(level?: string | null, grade?: string | null) {
  const cleanLevel = normalizeLevel(level);
  const cleanGrade = grade || "";

  if (cleanLevel && cleanGrade) return `${cleanLevel} ${cleanGrade}`;
  if (cleanLevel) return cleanLevel;
  if (cleanGrade) return cleanGrade;

  return "-";
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatTime(value?: string | null) {
  if (!value) return "-";
  return value.slice(0, 5);
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

function getMonthName(dateString?: string | null) {
  if (!dateString) return "";

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
  }).format(date);
}

function getAttendanceNote(item: AttendanceRow) {
  return item.note || item.notes || "-";
}

function normalizeAttendanceStatus(status?: string | null) {
  const safeStatus = normalizeText(status);

  if (safeStatus === "hadir" || safeStatus === "present") return "Hadir";
  if (safeStatus === "izin") return "Izin";
  if (safeStatus === "sakit") return "Sakit";

  if (
    safeStatus === "alpa" ||
    safeStatus === "alpha" ||
    safeStatus === "tidak hadir" ||
    safeStatus === "absent"
  ) {
    return "Alpa";
  }

  return status || "-";
}

function isHadir(status?: string | null) {
  return normalizeAttendanceStatus(status) === "Hadir";
}

function isIzin(status?: string | null) {
  return normalizeAttendanceStatus(status) === "Izin";
}

function isAlpa(status?: string | null) {
  return normalizeAttendanceStatus(status) === "Alpa";
}

function isSakit(status?: string | null) {
  return normalizeAttendanceStatus(status) === "Sakit";
}

function getRombelKey(item: EnrichedAttendance) {
  return [
    item.teacher_id || "",
    item.subject_id || "",
    item.attendance_date || "",
    item.start_time || "",
    item.end_time || "",
    normalizeText(item.material_topic),
  ].join("__");
}

function groupAttendanceByRombel(attendance: EnrichedAttendance[]) {
  const map = new Map<string, EnrichedAttendance[]>();

  attendance.forEach((item) => {
    const key = getRombelKey(item);
    const current = map.get(key) || [];

    current.push(item);
    map.set(key, current);
  });

  const groups: RombelGroup[] = Array.from(map.entries()).map(([key, rows]) => {
    const first = rows[0];

    const hadir = rows.filter((item) => isHadir(item.attendance_status)).length;
    const izin = rows.filter((item) => isIzin(item.attendance_status)).length;
    const alpa = rows.filter((item) => isAlpa(item.attendance_status)).length;
    const sakit = rows.filter((item) => isSakit(item.attendance_status)).length;

    const paham = rows.filter(
      (item) => item.understanding_status === "Paham"
    ).length;

    const cukupPaham = rows.filter(
      (item) => item.understanding_status === "Cukup Paham"
    ).length;

    const belumPaham = rows.filter(
      (item) => item.understanding_status === "Belum Paham"
    ).length;

    return {
      key,
      attendance_date: first.attendance_date,
      day_name: first.day_name,
      start_time: first.start_time,
      end_time: first.end_time,
      teacher_id: first.teacher_id,
      teacher_name: first.teacher_name,
      subject_id: first.subject_id,
      subject_name: first.subject_name,
      material_topic: first.material_topic,
      students: rows.sort((a, b) => a.student_name.localeCompare(b.student_name)),
      total: rows.length,
      hadir,
      izin,
      alpa,
      sakit,
      paham,
      cukupPaham,
      belumPaham,
    };
  });

  return groups.sort((a, b) => {
    const dateA = a.attendance_date || "";
    const dateB = b.attendance_date || "";

    if (dateA !== dateB) return dateB.localeCompare(dateA);

    return (a.start_time || "").localeCompare(b.start_time || "");
  });
}

function toYMD(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getCutoffRange(month: number, year: number) {
  const startDate = new Date(year, month - 2, 21);
  const endDate = new Date(year, month - 1, 20);

  return {
    start: toYMD(startDate),
    end: toYMD(endDate),
  };
}

function isDateInRange(dateValue: string | null, start: string, end: string) {
  if (!dateValue) return false;
  return dateValue >= start && dateValue <= end;
}

export default function KepalaSekolahAbsensiPage() {
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [attendance, setAttendance] = useState<EnrichedAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [monthFilter, setMonthFilter] = useState("Semua Bulan");
  const [teacherFilter, setTeacherFilter] = useState("Semua Guru");
  const [dateFilter, setDateFilter] = useState("");

  const currentDate = new Date();

  const [exportMonth, setExportMonth] = useState(
    String(currentDate.getMonth() + 1)
  );

  const [exportYear, setExportYear] = useState(
    String(currentDate.getFullYear())
  );

  const [selectedRombel, setSelectedRombel] = useState<RombelGroup | null>(null);

  async function fetchData() {
    setLoading(true);
    setErrorMessage("");

    try {
      const [teachersRes, studentsRes, subjectsRes, attendanceRes] =
        await Promise.all([
          supabase.from("teachers").select("*").order("full_name"),
          supabase.from("students").select("*").order("full_name"),
          supabase.from("subjects").select("*").order("name"),
          supabase
            .from("attendance")
            .select("*")
            .order("attendance_date", { ascending: false })
            .order("start_time", { ascending: true }),
        ]);

      if (teachersRes.error) throw new Error(teachersRes.error.message);
      if (studentsRes.error) throw new Error(studentsRes.error.message);
      if (subjectsRes.error) throw new Error(subjectsRes.error.message);
      if (attendanceRes.error) throw new Error(attendanceRes.error.message);

      const teachersData = (teachersRes.data || []) as TeacherRow[];
      const studentsData = (studentsRes.data || []) as StudentRow[];
      const subjectsData = (subjectsRes.data || []) as SubjectRow[];
      const attendanceData = (attendanceRes.data || []) as AttendanceRow[];

      const teacherMap = new Map(
        teachersData.map((teacher) => [teacher.id, teacher])
      );

      const studentMap = new Map(
        studentsData.map((student) => [student.id, student])
      );

      const subjectMap = new Map(
        subjectsData.map((subject) => [subject.id, subject])
      );

      const enriched: EnrichedAttendance[] = attendanceData.map((item) => {
        const teacher = item.teacher_id ? teacherMap.get(item.teacher_id) : null;
        const student = item.student_id ? studentMap.get(item.student_id) : null;
        const subject = item.subject_id ? subjectMap.get(item.subject_id) : null;

        return {
          ...item,
          teacher_name: teacher?.full_name || "-",
          student_name: student?.full_name || "-",
          student_grade: student?.grade || "-",
          student_level: student?.level || "-",
          student_nis: student?.nis || "-",
          student_nisn: student?.nisn || "-",
          subject_name: subject?.name || "-",
        };
      });

      setTeachers(teachersData);
      setAttendance(enriched);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengambil data absensi.");
      }

      setTeachers([]);
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("kepala-absensi-rombel-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teachers" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subjects" },
        () => fetchData()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const rombelGroups = useMemo(() => {
    const q = normalizeText(search);
    const grouped = groupAttendanceByRombel(attendance);

    return grouped.filter((group) => {
      const matchSearch =
        !q ||
        normalizeText(group.teacher_name).includes(q) ||
        normalizeText(group.subject_name).includes(q) ||
        normalizeText(group.material_topic).includes(q) ||
        group.students.some((student) => {
          return (
            normalizeText(student.student_name).includes(q) ||
            normalizeText(student.student_grade).includes(q) ||
            normalizeText(student.student_level).includes(q) ||
            normalizeText(student.student_nis).includes(q) ||
            normalizeText(student.student_nisn).includes(q) ||
            normalizeText(getAttendanceNote(student)).includes(q)
          );
        });

      const matchStatus =
        statusFilter === "Semua Status" ||
        group.students.some(
          (student) =>
            normalizeAttendanceStatus(student.attendance_status) === statusFilter
        );

      const matchMonth =
        monthFilter === "Semua Bulan" ||
        getMonthName(group.attendance_date) === monthFilter;

      const matchTeacher =
        teacherFilter === "Semua Guru" || group.teacher_id === teacherFilter;

      const matchDate = !dateFilter || group.attendance_date === dateFilter;

      return matchSearch && matchStatus && matchMonth && matchTeacher && matchDate;
    });
  }, [attendance, search, statusFilter, monthFilter, teacherFilter, dateFilter]);

  const visibleAttendanceRows = useMemo(() => {
    return rombelGroups.flatMap((group) =>
      group.students.map((student, index) => ({
        group,
        student,
        isFirstInGroup: index === 0,
      }))
    );
  }, [rombelGroups]);

  const filteredAttendance = useMemo(() => {
    return rombelGroups.flatMap((group) => group.students);
  }, [rombelGroups]);

  const summary = useMemo(() => {
    const totalRombel = rombelGroups.length;
    const totalAttendanceRows = filteredAttendance.length;

    const totalHadir = filteredAttendance.filter((item) =>
      isHadir(item.attendance_status)
    ).length;

    const totalIzin = filteredAttendance.filter((item) =>
      isIzin(item.attendance_status)
    ).length;

    const totalAlpa = filteredAttendance.filter((item) =>
      isAlpa(item.attendance_status)
    ).length;

    const totalSakit = filteredAttendance.filter((item) =>
      isSakit(item.attendance_status)
    ).length;

    const activeTeachers = new Set(
      filteredAttendance.map((item) => item.teacher_id).filter(Boolean)
    ).size;

    const percentage =
      totalAttendanceRows > 0
        ? Math.round((totalHadir / totalAttendanceRows) * 100)
        : 0;

    return {
      totalRombel,
      totalAttendanceRows,
      totalHadir,
      totalIzin,
      totalAlpa,
      totalSakit,
      totalTidakHadir: totalIzin + totalAlpa + totalSakit,
      activeTeachers,
      percentage,
    };
  }, [rombelGroups, filteredAttendance]);

  function handleExportExcel() {
    const monthNumber = Number(exportMonth);
    const yearNumber = Number(exportYear);

    if (!monthNumber || !yearNumber) {
      alert("Pilih bulan dan tahun export terlebih dahulu.");
      return;
    }

    const { start, end } = getCutoffRange(monthNumber, yearNumber);
    const selectedMonthName = monthOptions[monthNumber] || `Bulan ${monthNumber}`;

    const rows = attendance
      .filter((item) => isDateInRange(item.attendance_date, start, end))
      .sort((a, b) => {
        const dateCompare = (a.attendance_date || "").localeCompare(
          b.attendance_date || ""
        );

        if (dateCompare !== 0) return dateCompare;

        return (a.start_time || "").localeCompare(b.start_time || "");
      })
      .map((item, index) => ({
        No: index + 1,
        Hari: item.day_name || "-",
        Tanggal: formatDate(item.attendance_date),
        Nama: item.student_name || "-",
        Kelas: formatClass(item.student_level, item.student_grade),
        Jam: `${formatTime(item.start_time)}-${formatTime(item.end_time)}`,
        Guru: item.teacher_name || "-",
        Mapel: item.subject_name || "-",
        NIPD: item.student_nis || "-",
        NISN: item.student_nisn || "-",
        Hadir: isHadir(item.attendance_status) ? "✓" : "",
        Izin: isIzin(item.attendance_status) ? "✓" : "",
        Alpa: isAlpa(item.attendance_status) ? "✓" : "",
        Sakit: isSakit(item.attendance_status) ? "✓" : "",
        Materi: item.material_topic || "-",
        Pemahaman: item.understanding_status || "-",
        Keterangan: getAttendanceNote(item),
      }));

    if (rows.length === 0) {
      alert(
        `Tidak ada data absensi untuk periode ${formatDate(
          start
        )} sampai ${formatDate(end)}.`
      );
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);

    worksheet["!cols"] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 16 },
      { wch: 26 },
      { wch: 14 },
      { wch: 16 },
      { wch: 24 },
      { wch: 20 },
      { wch: 18 },
      { wch: 18 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 32 },
      { wch: 18 },
      { wch: 36 },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      `Absensi ${selectedMonthName}`
    );

    XLSX.writeFile(
      workbook,
      `Absensi_KBM_${selectedMonthName}_${yearNumber}_Cutoff_${start}_sd_${end}.xlsx`
    );
  }

  return (
    <KepalaSekolahLayout
      activeMenu="Absensi KBM"
      searchPlaceholder="Cari absensi, guru, siswa, atau materi..."
    >
      <section className="space-y-7">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#8A5A48]">
              Monitoring KBM
            </p>

            <h1 className="mt-2 text-[30px] font-extrabold tracking-[-0.02em] text-[#2B1B18]">
              Absensi KBM Bulanan
            </h1>

            <p className="mt-2 max-w-[850px] text-[15px] leading-6 text-[#6F5549]">
              Pantau absensi yang diinput guru. Halaman ini hanya untuk
              monitoring dan export, bukan untuk input absensi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={exportMonth}
              onChange={(event) => setExportMonth(event.target.value)}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] font-bold text-[#2B1B18] outline-none focus:border-[#9C0824]"
            >
              {monthOptions.slice(1).map((month, index) => (
                <option key={month} value={String(index + 1)}>
                  {month}
                </option>
              ))}
            </select>

            <input
              type="number"
              value={exportYear}
              onChange={(event) => setExportYear(event.target.value)}
              className="h-11 w-[105px] rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] font-bold text-[#2B1B18] outline-none focus:border-[#9C0824]"
            />

            <button
              type="button"
              onClick={handleExportExcel}
              className="flex h-11 w-fit items-center gap-2 rounded-xl border border-[#DCC8B6] bg-white px-5 text-[14px] font-extrabold text-[#8C0F2D] shadow-sm transition hover:bg-[#FFF8EF]"
            >
              Export Excel
            </button>
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-[14px] leading-6 text-red-700">
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p>{errorMessage}</p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={<UsersRound className="h-5 w-5" />}
            label="Total Rombel Diabsen"
            value={summary.totalRombel}
            info="Rombel"
            tone="pink"
          />

          <SummaryCard
            icon={<CalendarCheck className="h-5 w-5" />}
            label="Total Data Absensi"
            value={summary.totalAttendanceRows}
            info="Rows"
            tone="orange"
          />

          <SummaryCard
            icon={<UserCheck className="h-5 w-5" />}
            label="Total Hadir"
            value={summary.totalHadir}
            info={`${summary.percentage}%`}
            tone="green"
          />

          <SummaryCard
            icon={<UserX className="h-5 w-5" />}
            label="Izin / Alpa / Sakit"
            value={summary.totalTidakHadir}
            info={`${summary.activeTeachers} Guru`}
            tone="blue"
          />
        </div>

        <div className="rounded-[22px] border border-[#E1CFBE] bg-white p-5 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8E6A58]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari guru, siswa, NIPD, NISN, mapel, materi, atau keterangan..."
                className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] pl-11 pr-4 text-[14px] outline-none placeholder:text-[#9A7B6C] focus:border-[#9C0824]"
              />
            </div>

            <select
              value={teacherFilter}
              onChange={(event) => setTeacherFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              <option value="Semua Guru">Semua Guru</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.full_name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              {statusOptions.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>

            <select
              value={monthFilter}
              onChange={(event) => setMonthFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              {monthOptions.map((month) => (
                <option key={month}>{month}</option>
              ))}
            </select>

            <input
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-[22px] border border-[#E1CFBE] bg-white shadow-sm">
          <div className="border-b border-[#EADACA] px-6 py-5">
            <h2 className="text-[20px] font-extrabold text-[#2B1B18]">
              Rekap Absensi KBM
            </h2>

            <p className="mt-1 text-[14px] text-[#6F5549]">
              Format tabel: Nama, Kelas, Jam, Guru, Mapel, Hadir, Izin, Alpa,
              Keterangan.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1320px] border-collapse">
              <thead>
                <tr className="border-b border-[#EADACA] bg-[#FFF8EF] text-left text-[13px] font-extrabold text-[#6F5549]">
                  <th className="px-5 py-4">No</th>
                  <th className="px-5 py-4">Nama</th>
                  <th className="px-5 py-4">Kelas</th>
                  <th className="px-5 py-4">Jam</th>
                  <th className="px-5 py-4">Guru</th>
                  <th className="px-5 py-4">Mapel</th>
                  <th className="px-5 py-4 text-center">Hadir</th>
                  <th className="px-5 py-4 text-center">Izin</th>
                  <th className="px-5 py-4 text-center">Alpa</th>
                  <th className="px-5 py-4">Keterangan</th>
                  <th className="px-5 py-4">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-6 py-12 text-center text-[#6F5549]"
                    >
                      Memuat data absensi...
                    </td>
                  </tr>
                ) : visibleAttendanceRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-6 py-12 text-center text-[#6F5549]"
                    >
                      Belum ada data absensi.
                    </td>
                  </tr>
                ) : (
                  visibleAttendanceRows.map(
                    ({ group, student, isFirstInGroup }, index) => (
                      <tr
                        key={`${group.key}-${student.id}`}
                        className="border-b border-[#F0E1D4] text-[14px] text-[#2B1B18]"
                      >
                        <td className="px-5 py-4 font-bold">{index + 1}</td>

                        <td className="px-5 py-4">
                          <div>
                            <p className="font-extrabold">{student.student_name}</p>
                            <p className="mt-1 text-[12px] text-[#6F5549]">
                              NIPD: {student.student_nis || "-"}
                              {student.student_nisn
                                ? ` • NISN: ${student.student_nisn}`
                                : ""}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          {formatClass(
                            student.student_level,
                            student.student_grade
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4">
                          {formatTime(group.start_time)}-
                          {formatTime(group.end_time)}
                        </td>

                        <td className="px-5 py-4 font-extrabold">
                          {group.teacher_name}
                        </td>

                        <td className="px-5 py-4">{group.subject_name}</td>

                        <td className="px-5 py-4 text-center">
                          <ChecklistBox checked={isHadir(student.attendance_status)} />
                        </td>

                        <td className="px-5 py-4 text-center">
                          <ChecklistBox checked={isIzin(student.attendance_status)} />
                        </td>

                        <td className="px-5 py-4 text-center">
                          <ChecklistBox checked={isAlpa(student.attendance_status)} />
                        </td>

                        <td className="max-w-[260px] px-5 py-4 text-[#6F5549]">
                          <p className="line-clamp-2">
                            {getAttendanceNote(student)}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          {isFirstInGroup ? (
                            <button
                              type="button"
                              onClick={() => setSelectedRombel(group)}
                              className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-xl border border-[#DCC8B6] px-3 text-[13px] font-extrabold text-[#8C0F2D] transition hover:bg-[#FFF8EF]"
                            >
                              <Eye className="h-4 w-4" />
                              Detail
                            </button>
                          ) : (
                            <span className="text-[12px] text-[#A58A7A]">-</span>
                          )}
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {selectedRombel ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-8">
          <div className="max-h-[92vh] w-full max-w-[980px] overflow-y-auto rounded-[22px] bg-[#FFF8EF] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E1CFBE] bg-[#FFF8EF] px-6 py-5">
              <div>
                <h2 className="text-[22px] font-extrabold text-[#2B1B18]">
                  Detail Absensi Rombel
                </h2>

                <p className="mt-1 text-[14px] text-[#6F5549]">
                  {selectedRombel.teacher_name} • {selectedRombel.subject_name} •{" "}
                  {formatDate(selectedRombel.attendance_date)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRombel(null)}
                className="rounded-full p-2 text-[#6F5549] transition hover:bg-[#F4E5DA]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="grid gap-4 md:grid-cols-4">
                <DetailSummaryCard
                  label="Total Siswa"
                  value={selectedRombel.total}
                />
                <DetailSummaryCard label="Hadir" value={selectedRombel.hadir} />
                <DetailSummaryCard label="Izin" value={selectedRombel.izin} />
                <DetailSummaryCard label="Alpa" value={selectedRombel.alpa} />
              </div>

              <div className="rounded-2xl border border-[#E1CFBE] bg-white px-5 py-4">
                <div className="grid gap-3 text-[13px] md:grid-cols-4">
                  <InfoItem label="Hari" value={selectedRombel.day_name || "-"} />
                  <InfoItem
                    label="Tanggal"
                    value={formatDate(selectedRombel.attendance_date)}
                  />
                  <InfoItem
                    label="Jam"
                    value={`${formatTime(selectedRombel.start_time)}-${formatTime(
                      selectedRombel.end_time
                    )}`}
                  />
                  <InfoItem label="Mapel" value={selectedRombel.subject_name} />
                  <InfoItem label="Guru" value={selectedRombel.teacher_name} />
                  <InfoItem
                    label="Materi"
                    value={selectedRombel.material_topic || "-"}
                  />
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-[#E1CFBE] bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1060px] border-collapse">
                    <thead>
                      <tr className="border-b border-[#EADACA] bg-[#FFF8EF] text-left text-[13px] font-extrabold text-[#6F5549]">
                        <th className="px-5 py-4">No</th>
                        <th className="px-5 py-4">Siswa</th>
                        <th className="px-5 py-4">NIPD</th>
                        <th className="px-5 py-4">Kelas</th>
                        <th className="px-5 py-4 text-center">Hadir</th>
                        <th className="px-5 py-4 text-center">Izin</th>
                        <th className="px-5 py-4 text-center">Alpa</th>
                        <th className="px-5 py-4">Pemahaman</th>
                        <th className="px-5 py-4">Keterangan</th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedRombel.students.map((student, index) => (
                        <tr
                          key={student.id}
                          className="border-b border-[#F0E1D4] text-[14px]"
                        >
                          <td className="px-5 py-4 font-bold">{index + 1}</td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F8DFD0] text-[13px] font-extrabold text-[#8C0F2D]">
                                {getInitials(student.student_name)}
                              </div>

                              <p className="font-extrabold text-[#2B1B18]">
                                {student.student_name}
                              </p>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-[#6F5549]">
                            {student.student_nis || "-"}
                          </td>

                          <td className="px-5 py-4 text-[#6F5549]">
                            {formatClass(
                              student.student_level,
                              student.student_grade
                            )}
                          </td>

                          <td className="px-5 py-4 text-center">
                            <ChecklistBox
                              checked={isHadir(student.attendance_status)}
                            />
                          </td>

                          <td className="px-5 py-4 text-center">
                            <ChecklistBox
                              checked={isIzin(student.attendance_status)}
                            />
                          </td>

                          <td className="px-5 py-4 text-center">
                            <ChecklistBox
                              checked={isAlpa(student.attendance_status)}
                            />
                          </td>

                          <td className="px-5 py-4">
                            <UnderstandingBadge
                              status={student.understanding_status}
                            />
                          </td>

                          <td className="px-5 py-4 text-[#6F5549]">
                            {getAttendanceNote(student)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRombel(null)}
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
  icon: ReactNode;
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

function DetailSummaryCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border border-[#E1CFBE] bg-white px-5 py-4">
      <p className="text-[13px] text-[#6F5549]">{label}</p>
      <p className="mt-2 text-[24px] font-extrabold text-[#2B1B18]">{value}</p>
    </div>
  );
}

function ChecklistBox({ checked }: { checked: boolean }) {
  return (
    <span
      className={`mx-auto flex h-6 w-12 items-center justify-center rounded-[5px] border text-[13px] font-extrabold ${
        checked
          ? "border-[#2F66C9] bg-[#3F73C8] text-white"
          : "border-[#C9D3E6] bg-white text-transparent"
      }`}
    >
      ✓
    </span>
  );
}

function UnderstandingBadge({ status }: { status?: string | null }) {
  const safe = status || "-";

  const className =
    safe === "Paham"
      ? "bg-[#C7F0DA] text-[#158A58]"
      : safe === "Cukup Paham"
        ? "bg-[#FFF2B8] text-[#B26A00]"
        : safe === "-"
          ? "bg-[#F1F5F9] text-[#64748B]"
          : "bg-[#FFE4E6] text-[#BE123C]";

  return (
    <span
      className={`rounded-full px-3 py-1 text-[12px] font-extrabold ${className}`}
    >
      {safe}
    </span>
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