"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx-js-style";
import {
  CalendarDays, Plus, Search, Pencil, Trash2, Upload, Download,
  RefreshCw, X, Clock3, BookOpen, Users, AlertTriangle, CheckCircle2,
  Filter, FileSpreadsheet, ChevronDown
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import KepalaSekolahLayout from "../components/KepalaSekolahLayout";

type AnyRow = Record<string, any>;

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
  duration_minutes: number | null;
  notes: string | null;
  temporary_schedule_url: string | null;
  class_id: string | null;
  rombel_id: string | null;
  curriculum_program_id: string | null;
  curriculum_chapter_id: string | null;
  curriculum_sub_chapter_id: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type SubstitutionRow = {
  id: string;
  schedule_id: string;
  substitution_date: string;
  substitute_teacher_id: string;
  reason: string;
  notes: string | null;
  status: string;
};

type FormState = {
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
  duration_minutes: string;
  notes: string;
  class_id: string;
  rombel_id: string;
};

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const EMPTY_FORM: FormState = {
  student_id: "", teacher_id: "", subject_id: "", day_name: "Senin",
  schedule_date: "", start_time: "08:00", end_time: "09:00",
  session_name: "", material_topic: "", academic_year: "2026/2027",
  semester: "Ganjil", duration_minutes: "60", notes: "",
  class_id: "", rombel_id: "",
};

const text = (value: unknown) => (value == null ? "" : String(value));
const getLabel = (row: AnyRow, candidates: string[]) => {
  for (const key of candidates) if (row?.[key] != null && String(row[key]).trim()) return String(row[key]);
  return "";
};
const toTime = (value: string | null | undefined) => (value ? String(value).slice(0, 5) : "");
const calcMinutes = (start: string, end: string) => {
  if (!start || !end) return 60;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let result = eh * 60 + em - (sh * 60 + sm);
  if (result < 0) result += 24 * 60;
  return result;
};
const dateToDay = (date: string) => {
  if (!date) return "";
  const day = new Date(`${date}T12:00:00`).getDay();
  return ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][day];
};

export default function AturJadwalPage() {
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [substitutions, setSubstitutions] = useState<SubstitutionRow[]>([]);
  const [substituteModalOpen, setSubstituteModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleRow | null>(null);
  const [substituteForm, setSubstituteForm] = useState({ date: "", teacher_id: "", reason: "Sakit", notes: "" });
  const [teachers, setTeachers] = useState<AnyRow[]>([]);
  const [students, setStudents] = useState<AnyRow[]>([]);
  const [subjects, setSubjects] = useState<AnyRow[]>([]);
  const [classes, setClasses] = useState<AnyRow[]>([]);
  const [rombels, setRombels] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [dayFilter, setDayFilter] = useState("Semua");
  const [teacherFilter, setTeacherFilter] = useState("Semua");
  const [classFilter, setClassFilter] = useState("Semua");
  const [yearFilter, setYearFilter] = useState("Semua");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setLoading(true);
    setError("");
    const [scheduleRes, teacherRes, studentRes, subjectRes, classRes, rombelRes, substitutionRes] = await Promise.all([
      supabase.from("schedules").select("*").order("day_name", { ascending: true }).order("start_time", { ascending: true }),
      supabase.from("teachers").select("*"),
      supabase.from("students").select("*"),
      supabase.from("subjects").select("*"),
      supabase.from("classes").select("*"),
      supabase.from("rombels").select("*"),
      supabase.from("schedule_substitutions").select("*"),
    ]);
    const failed = [scheduleRes, teacherRes, studentRes, subjectRes, classRes, rombelRes, substitutionRes].find((r) => r.error);
    if (failed?.error) setError(`Gagal memuat data: ${failed.error.message}`);
    setSchedules((scheduleRes.data || []) as ScheduleRow[]);
    setTeachers(teacherRes.data || []);
    setStudents(studentRes.data || []);
    setSubjects(subjectRes.data || []);
    setClasses(classRes.data || []);
    setRombels(rombelRes.data || []);
    setSubstitutions((substitutionRes.data || []) as SubstitutionRow[]);
    setLoading(false);
  };

  useEffect(() => { void loadData(); }, []);

  const teacherName = (id: string | null) => {
    const row = teachers.find((x) => x.id === id);
    return row ? getLabel(row, ["full_name", "name", "teacher_name", "nama"]) : "Guru belum dipilih";
  };
  const studentName = (id: string | null) => {
    const row = students.find((x) => x.id === id);
    return row ? getLabel(row, ["full_name", "name", "student_name", "nama"]) : "";
  };
  const subjectName = (id: string | null) => {
    const row = subjects.find((x) => x.id === id);
    return row ? getLabel(row, ["name", "subject_name", "nama_mapel", "title"]) : "Mata pelajaran belum dipilih";
  };
  const className = (id: string | null) => {
    const row = classes.find((x) => x.id === id);
    return row ? getLabel(row, ["name", "class_name", "nama_kelas", "grade", "title"]) : "";
  };
  const rombelName = (id: string | null) => {
    const row = rombels.find((x) => x.id === id);
    return row ? getLabel(row, ["name", "rombel_name", "nama_rombel", "class_name", "title"]) : "";
  };

  const substitutionsFor = (scheduleId: string) =>
    substitutions.filter((item) => item.schedule_id === scheduleId && item.status !== "cancelled");

  const openSubstitute = (schedule: ScheduleRow) => {
    const defaultDate = schedule.schedule_date || new Date().toISOString().slice(0, 10);
    const existing = substitutions.find((item) => item.schedule_id === schedule.id && item.substitution_date === defaultDate && item.status !== "cancelled");
    setSelectedSchedule(schedule);
    setSubstituteForm({
      date: defaultDate,
      teacher_id: existing?.substitute_teacher_id || "",
      reason: existing?.reason || "Sakit",
      notes: existing?.notes || "",
    });
    setError("");
    setSuccess("");
    setSubstituteModalOpen(true);
  };

  const saveSubstitution = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedSchedule || !substituteForm.teacher_id || !substituteForm.date) {
      setError("Tanggal dan guru pengganti wajib dipilih.");
      return;
    }
    if (substituteForm.teacher_id === selectedSchedule.teacher_id) {
      setError("Guru pengganti harus berbeda dari guru utama.");
      return;
    }
    const already = substitutions.find((item) =>
      item.schedule_id === selectedSchedule.id &&
      item.substitution_date === substituteForm.date
    );
    // Cegah guru pengganti mengambil dua jadwal pada waktu yang sama.
    const conflict = schedules.some((item) => {
      if (item.id === selectedSchedule.id || item.day_name !== selectedSchedule.day_name) return false;
      const sameTeacher = item.teacher_id === substituteForm.teacher_id;
      const overlap = toTime(item.start_time) < toTime(selectedSchedule.end_time) &&
        toTime(item.end_time) > toTime(selectedSchedule.start_time);
      return sameTeacher && overlap && (!item.schedule_date || item.schedule_date === substituteForm.date);
    });
    if (conflict) {
      setError("Guru pengganti memiliki jadwal lain yang bentrok pada jam tersebut.");
      return;
    }
    setSaving(true);
    const payload = {
      schedule_id: selectedSchedule.id,
      substitution_date: substituteForm.date,
      substitute_teacher_id: substituteForm.teacher_id,
      reason: substituteForm.reason,
      notes: substituteForm.notes || null,
      status: "active",
      updated_at: new Date().toISOString(),
    };
    const result = already
      ? await supabase.from("schedule_substitutions").update(payload).eq("id", already.id)
      : await supabase.from("schedule_substitutions").insert(payload);
    setSaving(false);
    if (result.error) {
      setError(`Gagal menyimpan guru pengganti: ${result.error.message}`);
      return;
    }
    setSubstituteModalOpen(false);
    setSuccess("Guru pengganti berhasil disimpan. Jadwal hanya dialihkan pada tanggal yang dipilih.");
    await loadData();
  };

  const cancelSubstitution = async (schedule: ScheduleRow, date: string) => {
    const row = substitutions.find((item) => item.schedule_id === schedule.id && item.substitution_date === date && item.status !== "cancelled");
    if (!row) return;
    if (!window.confirm("Batalkan penugasan guru pengganti ini?")) return;
    const { error: cancelError } = await supabase.from("schedule_substitutions")
      .update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", row.id);
    if (cancelError) setError(`Gagal membatalkan: ${cancelError.message}`);
    else { setSuccess("Penugasan guru pengganti dibatalkan."); await loadData(); }
  };

  const filtered = useMemo(() => schedules.filter((s) => {
    const haystack = [
      teacherName(s.teacher_id), studentName(s.student_id), subjectName(s.subject_id),
      s.day_name, s.material_topic, className(s.class_id), rombelName(s.rombel_id),
    ].join(" ").toLowerCase();
    return (!search || haystack.includes(search.toLowerCase()))
      && (dayFilter === "Semua" || s.day_name === dayFilter)
      && (teacherFilter === "Semua" || s.teacher_id === teacherFilter)
      && (classFilter === "Semua" || s.class_id === classFilter || s.rombel_id === classFilter)
      && (yearFilter === "Semua" || s.academic_year === yearFilter);
  }), [schedules, search, dayFilter, teacherFilter, classFilter, yearFilter, teachers, students, subjects, classes, rombels]);

  const years = [...new Set(schedules.map((s) => s.academic_year).filter(Boolean))] as string[];

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, academic_year: years[0] || "2026/2027" });
    setError(""); setSuccess(""); setModalOpen(true);
  };
  const openEdit = (s: ScheduleRow) => {
    setEditingId(s.id);
    setForm({
      student_id: s.student_id || "", teacher_id: s.teacher_id || "", subject_id: s.subject_id || "",
      day_name: s.day_name || "Senin", schedule_date: s.schedule_date || "",
      start_time: toTime(s.start_time) || "08:00", end_time: toTime(s.end_time) || "09:00",
      session_name: s.session_name || "", material_topic: s.material_topic || "",
      academic_year: s.academic_year || "2026/2027", semester: s.semester || "Ganjil",
      duration_minutes: String(s.duration_minutes ?? 60), notes: s.notes || "",
      class_id: s.class_id || "", rombel_id: s.rombel_id || "",
    });
    setError(""); setSuccess(""); setModalOpen(true);
  };

  const findConflict = (candidate: FormState, excludeId?: string) => {
    const start = candidate.start_time;
    const end = candidate.end_time;
    return schedules.find((s) => {
      if (s.id === excludeId || s.day_name !== candidate.day_name) return false;
      const sameTeacher = candidate.teacher_id && s.teacher_id === candidate.teacher_id;
      const sameClass = candidate.class_id && s.class_id === candidate.class_id;
      const sameRombel = candidate.rombel_id && s.rombel_id === candidate.rombel_id;
      const sameStudent = candidate.student_id && s.student_id === candidate.student_id;
      const overlaps = start < toTime(s.end_time) && end > toTime(s.start_time);
      return overlaps && (sameTeacher || sameClass || sameRombel || sameStudent);
    });
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setError(""); setSuccess("");
    if (!form.teacher_id || !form.subject_id) {
      setError("Guru dan mata pelajaran wajib dipilih.");
      return;
    }
    if (!form.class_id && !form.rombel_id && !form.student_id) {
      setError("Pilih kelas, rombongan belajar, atau siswa sebagai tujuan jadwal.");
      return;
    }
    if (!form.start_time || !form.end_time || form.start_time === form.end_time) {
      setError("Jam mulai dan jam selesai tidak valid.");
      return;
    }
    const conflict = findConflict(form, editingId || undefined);
    if (conflict) {
      setError(`Jadwal bentrok dengan jadwal ${teacherName(conflict.teacher_id)} (${toTime(conflict.start_time)}–${toTime(conflict.end_time)}).`);
      return;
    }
    const payload: AnyRow = {
      student_id: form.student_id || null,
      teacher_id: form.teacher_id,
      subject_id: form.subject_id,
      day_name: form.day_name,
      schedule_date: form.schedule_date || null,
      start_time: `${form.start_time}:00`,
      end_time: `${form.end_time}:00`,
      session_name: form.session_name || null,
      material_topic: form.material_topic || null,
      academic_year: form.academic_year || null,
      semester: form.semester || null,
      duration_minutes: Number(form.duration_minutes) || calcMinutes(form.start_time, form.end_time),
      notes: form.notes || null,
      class_id: form.class_id || null,
      rombel_id: form.rombel_id || null,
      updated_at: new Date().toISOString(),
    };
    setSaving(true);
    const result = editingId
      ? await supabase.from("schedules").update(payload).eq("id", editingId)
      : await supabase.from("schedules").insert(payload);
    setSaving(false);
    if (result.error) { setError(`Gagal menyimpan jadwal: ${result.error.message}`); return; }
    setModalOpen(false);
    setSuccess(editingId ? "Jadwal berhasil diperbarui." : "Jadwal berhasil ditambahkan.");
    await loadData();
  };

  const handleDelete = async (s: ScheduleRow) => {
    const ok = window.confirm(`Hapus jadwal ${subjectName(s.subject_id)} – ${teacherName(s.teacher_id)}?`);
    if (!ok) return;
    const { error: deleteError } = await supabase.from("schedules").delete().eq("id", s.id);
    if (deleteError) { setError(`Gagal menghapus jadwal: ${deleteError.message}`); return; }
    setSuccess("Jadwal berhasil dihapus.");
    await loadData();
  };

  const downloadTemplate = () => {
    const rows = [{
      day_name: "Senin", schedule_date: "2026-11-23", teacher_name: "Nama Guru",
      subject_name: "Nama Mapel", class_name: "Nama Kelas", rombel_name: "",
      start_time: "08:00", end_time: "09:00", session_name: "1",
      material_topic: "Materi pembelajaran", academic_year: "2026/2027",
      semester: "Ganjil", duration_minutes: 60, notes: "",
    }];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Jadwal");
    XLSX.writeFile(wb, "Template_Import_Jadwal_HSTKB.xlsx");
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true); setError(""); setSuccess("");
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<AnyRow>(sheet, { defval: "" });
      const inserts: AnyRow[] = [];
      const issues: string[] = [];
      rows.forEach((row, index) => {
        const rowNo = index + 2;
        const findByName = (list: AnyRow[], name: string, fields: string[]) =>
          list.find((x) => getLabel(x, fields).trim().toLowerCase() === String(name).trim().toLowerCase());
        const teacher = findByName(teachers, row.teacher_name || row.guru, ["full_name", "name", "teacher_name", "nama"]);
        const subject = findByName(subjects, row.subject_name || row.mapel, ["name", "subject_name", "nama_mapel", "title"]);
        const klass = findByName(classes, row.class_name || row.kelas, ["name", "class_name", "nama_kelas", "grade", "title"]);
        const rombel = findByName(rombels, row.rombel_name || row.rombel, ["name", "rombel_name", "nama_rombel", "class_name", "title"]);
        const day = String(row.day_name || row.hari || (row.schedule_date ? dateToDay(String(row.schedule_date)) : "")).trim();
        const start = String(row.start_time || row.jam_mulai || "").slice(0, 5);
        const end = String(row.end_time || row.jam_selesai || "").slice(0, 5);
        if (!teacher || !subject || (!klass && !rombel) || !DAYS.includes(day) || !start || !end) {
          issues.push(`Baris ${rowNo}: guru/mapel/kelas/hari/jam tidak ditemukan atau belum lengkap.`);
          return;
        }
        const conflict = findConflict({
          ...EMPTY_FORM, teacher_id: teacher.id, subject_id: subject.id,
          class_id: klass?.id || "", rombel_id: rombel?.id || "",
          day_name: day, start_time: start, end_time: end,
        });
        if (conflict) { issues.push(`Baris ${rowNo}: bentrok dengan jadwal yang sudah ada.`); return; }
        inserts.push({
          teacher_id: teacher.id, subject_id: subject.id, class_id: klass?.id || null,
          rombel_id: rombel?.id || null, student_id: null, day_name: day,
          schedule_date: row.schedule_date ? String(row.schedule_date).slice(0, 10) : null,
          start_time: `${start}:00`, end_time: `${end}:00`,
          session_name: String(row.session_name || row.sesi || "") || null,
          material_topic: String(row.material_topic || row.materi || "") || null,
          academic_year: String(row.academic_year || "2026/2027"),
          semester: String(row.semester || "Ganjil"),
          duration_minutes: Number(row.duration_minutes) || calcMinutes(start, end),
          notes: String(row.notes || row.catatan || "") || null,
          updated_at: new Date().toISOString(),
        });
      });
      if (inserts.length) {
        const { error: importError } = await supabase.from("schedules").insert(inserts);
        if (importError) throw new Error(importError.message);
      }
      setSuccess(`${inserts.length} jadwal berhasil diimpor.${issues.length ? ` ${issues.length} baris dilewati.` : ""}`);
      if (issues.length) setError(issues.slice(0, 8).join("\n"));
      await loadData();
    } catch (e: any) {
      setError(`Import gagal: ${e?.message || "Terjadi kesalahan."}`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const exportExcel = () => {
    const rows = filtered.map((s) => ({
      Hari: s.day_name || "", Tanggal: s.schedule_date || "",
      Guru: teacherName(s.teacher_id), Mata_Pelajaran: subjectName(s.subject_id),
      Kelas: className(s.class_id), Rombel: rombelName(s.rombel_id),
      Siswa: studentName(s.student_id), Jam_Mulai: toTime(s.start_time),
      Jam_Selesai: toTime(s.end_time), Sesi: s.session_name || "",
      Materi: s.material_topic || "", Tahun_Ajaran: s.academic_year || "",
      Semester: s.semester || "", Durasi_Menit: s.duration_minutes || "",
      Catatan: s.notes || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Jadwal");
    XLSX.writeFile(wb, "Jadwal_Belajar_HSTKB.xlsx");
  };

  const inputClass = "w-full rounded-xl border border-[#eaded8] bg-white px-3 py-2.5 text-sm text-[#2B1B18] outline-none transition focus:border-[#8C0F2D] focus:ring-2 focus:ring-[#8C0F2D]/10";
  const labelClass = "mb-1.5 block text-xs font-semibold text-[#6f5650]";

  return (
    <KepalaSekolahLayout activeMenu="Atur Jadwal">
      <div className="min-h-screen bg-[#FFF8EF] p-4 md:p-7">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#8C0F2D]"><CalendarDays size={17}/> AKADEMIK HSTKB</div>
              <h1 className="text-2xl font-bold text-[#2B1B18] md:text-3xl">Atur Jadwal</h1>
              <p className="mt-1 text-sm text-[#806a63]">Kelola jadwal belajar, guru, mata pelajaran, kelas, dan waktu pembelajaran.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={downloadTemplate} className="inline-flex items-center gap-2 rounded-xl border border-[#e7d7d0] bg-white px-4 py-2.5 text-sm font-semibold text-[#654b43] hover:bg-[#fffaf6]"><Download size={16}/> Template Excel</button>
              <button onClick={() => fileRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-2 rounded-xl border border-[#e7d7d0] bg-white px-4 py-2.5 text-sm font-semibold text-[#654b43] hover:bg-[#fffaf6] disabled:opacity-50"><Upload size={16}/>{uploading ? "Mengimpor..." : "Import Excel"}</button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport}/>
              <button onClick={openAdd} className="inline-flex items-center gap-2 rounded-xl bg-[#8C0F2D] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#710b24]"><Plus size={17}/> Tambah Jadwal</button>
            </div>
          </div>

          {error && <div className="whitespace-pre-line rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertTriangle className="mr-2 inline" size={17}/>{error}</div>}
          {success && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"><CheckCircle2 className="mr-2 inline" size={17}/>{success}</div>}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#f0e4dc] bg-white p-4"><div className="flex items-center gap-2 text-sm text-[#806a63]"><CalendarDays size={17}/> Total Jadwal</div><div className="mt-2 text-2xl font-bold text-[#2B1B18]">{schedules.length}</div></div>
            <div className="rounded-2xl border border-[#f0e4dc] bg-white p-4"><div className="flex items-center gap-2 text-sm text-[#806a63]"><Users size={17}/> Guru Terjadwal</div><div className="mt-2 text-2xl font-bold text-[#2B1B18]">{new Set(schedules.map(s => s.teacher_id).filter(Boolean)).size}</div></div>
            <div className="rounded-2xl border border-[#f0e4dc] bg-white p-4"><div className="flex items-center gap-2 text-sm text-[#806a63]"><BookOpen size={17}/> Mata Pelajaran</div><div className="mt-2 text-2xl font-bold text-[#2B1B18]">{new Set(schedules.map(s => s.subject_id).filter(Boolean)).size}</div></div>
          </div>

          <div className="rounded-2xl border border-[#f0e4dc] bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-semibold text-[#2B1B18]"><Filter size={17}/> Filter Jadwal</div>
              <div className="flex gap-2">
                <button onClick={exportExcel} className="inline-flex items-center gap-2 rounded-lg border border-[#eaded8] px-3 py-2 text-xs font-semibold text-[#654b43] hover:bg-[#fffaf6]"><FileSpreadsheet size={15}/> Export Excel</button>
                <button onClick={() => void loadData()} className="inline-flex items-center gap-2 rounded-lg border border-[#eaded8] px-3 py-2 text-xs font-semibold text-[#654b43] hover:bg-[#fffaf6]"><RefreshCw size={15}/> Refresh</button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
              <div className="relative md:col-span-2"><Search className="absolute left-3 top-3 text-[#a18b83]" size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari guru, mapel, kelas..." className={`${inputClass} pl-9`}/></div>
              <select value={dayFilter} onChange={e => setDayFilter(e.target.value)} className={inputClass}><option value="Semua">Semua Hari</option>{DAYS.map(d => <option key={d}>{d}</option>)}</select>
              <select value={teacherFilter} onChange={e => setTeacherFilter(e.target.value)} className={inputClass}><option value="Semua">Semua Guru</option>{teachers.map(t => <option key={t.id} value={t.id}>{getLabel(t, ["full_name","name","teacher_name","nama"]) || t.id}</option>)}</select>
              <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className={inputClass}><option value="Semua">Semua Kelas/Rombel</option>{classes.map(c => <option key={c.id} value={c.id}>{getLabel(c, ["name","class_name","nama_kelas","grade","title"]) || c.id}</option>)}{rombels.map(r => <option key={`r-${r.id}`} value={r.id}>{getLabel(r, ["name","rombel_name","nama_rombel","class_name","title"]) || "Rombel"}</option>)}</select>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">{years.map(y => <button key={y} onClick={() => setYearFilter(yearFilter === y ? "Semua" : y)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${yearFilter === y ? "bg-[#8C0F2D] text-white" : "bg-[#f8eee8] text-[#765b52]"}`}>{y}</button>)}</div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#f0e4dc] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#f1e7e1] px-4 py-4"><h2 className="font-bold text-[#2B1B18]">Daftar Jadwal Pembelajaran</h2><span className="text-xs text-[#8a746c]">{filtered.length} jadwal</span></div>
            {loading ? <div className="p-12 text-center text-sm text-[#8a746c]"><RefreshCw className="mx-auto mb-2 animate-spin" size={22}/>Memuat jadwal...</div> :
              filtered.length === 0 ? <div className="p-12 text-center text-sm text-[#8a746c]"><CalendarDays className="mx-auto mb-2" size={28}/>Belum ada jadwal yang sesuai filter.</div> :
              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px] text-left text-sm">
                  <thead className="bg-[#fbf5f0] text-xs uppercase tracking-wide text-[#806a63]"><tr>
                    <th className="px-4 py-3">Hari / Tanggal</th><th className="px-4 py-3">Waktu</th><th className="px-4 py-3">Mata Pelajaran</th><th className="px-4 py-3">Guru</th><th className="px-4 py-3">Kelas / Rombel / Siswa</th><th className="px-4 py-3">Tahun Ajaran</th><th className="px-4 py-3 text-right">Aksi</th>
                  </tr></thead>
                  <tbody className="divide-y divide-[#f3eae5]">
                    {filtered.map(s => <tr key={s.id} className="hover:bg-[#fffdfa]">
                      <td className="px-4 py-3"><div className="font-semibold text-[#2B1B18]">{s.day_name || "-"}</div><div className="text-xs text-[#9a847c]">{s.schedule_date || "Jadwal mingguan"}</div></td>
                      <td className="px-4 py-3"><div className="inline-flex items-center gap-1.5 rounded-lg bg-[#f8eee8] px-2.5 py-1.5 font-semibold text-[#8C0F2D]"><Clock3 size={14}/>{toTime(s.start_time)}–{toTime(s.end_time)}</div><div className="mt-1 text-xs text-[#9a847c]">{s.duration_minutes || calcMinutes(toTime(s.start_time), toTime(s.end_time))} menit</div></td>
                      <td className="px-4 py-3"><div className="font-semibold text-[#2B1B18]">{subjectName(s.subject_id)}</div><div className="text-xs text-[#9a847c]">{s.material_topic || s.session_name || "-"}</div></td>
                      <td className="px-4 py-3 text-[#4e3933]">
                        <div>{teacherName(s.teacher_id)}</div>
                        {substitutionsFor(s.id).map(sub => <div key={sub.id} className="mt-1 text-xs text-[#8C0F2D]">Pengganti {sub.substitution_date}: {teacherName(sub.substitute_teacher_id)}</div>)}
                      </td>
                      <td className="px-4 py-3 text-[#4e3933]">{[className(s.class_id), rombelName(s.rombel_id), studentName(s.student_id)].filter(Boolean).join(" • ") || "-"}</td>
                      <td className="px-4 py-3"><div>{s.academic_year || "-"}</div><div className="text-xs text-[#9a847c]">{s.semester || ""}</div></td>
                      <td className="px-4 py-3"><div className="flex justify-end gap-1"><button onClick={() => openSubstitute(s)} title="Atur guru pengganti" className="rounded-lg px-2 py-1 text-xs font-semibold text-[#8C0F2D] hover:bg-[#f8eee8]">Ganti Guru</button><button onClick={() => openEdit(s)} title="Edit" className="rounded-lg p-2 text-[#8C0F2D] hover:bg-[#f8eee8]"><Pencil size={16}/></button><button onClick={() => void handleDelete(s)} title="Hapus" className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 size={16}/></button></div></td>
                    </tr>)}
                  </tbody>
                </table>
              </div>}
          </div>
        </div>

        {substituteModalOpen && selectedSchedule && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-3 md:p-6">
            <div className="w-full max-w-lg rounded-2xl bg-[#FFFDFB] p-5 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <div><h2 className="text-lg font-bold text-[#2B1B18]">Atur Guru Pengganti</h2>
                  <p className="text-xs text-[#806a63]">{subjectName(selectedSchedule.subject_id)} · Guru utama: {teacherName(selectedSchedule.teacher_id)}</p></div>
                <button onClick={() => setSubstituteModalOpen(false)} className="rounded-lg p-2"><X size={18}/></button>
              </div>
              <form onSubmit={saveSubstitution} className="space-y-4">
                <div><label className={labelClass}>Tanggal pertemuan *</label><input required type="date" value={substituteForm.date} onChange={e=>setSubstituteForm({...substituteForm,date:e.target.value})} className={inputClass}/></div>
                <div><label className={labelClass}>Guru pengganti *</label><select required value={substituteForm.teacher_id} onChange={e=>setSubstituteForm({...substituteForm,teacher_id:e.target.value})} className={inputClass}><option value="">Pilih guru pengganti</option>{teachers.filter(t=>t.id!==selectedSchedule.teacher_id).map(t=><option key={t.id} value={t.id}>{getLabel(t,["full_name","name","teacher_name","nama"]) || t.id}</option>)}</select></div>
                <div><label className={labelClass}>Alasan</label><select value={substituteForm.reason} onChange={e=>setSubstituteForm({...substituteForm,reason:e.target.value})} className={inputClass}><option>Sakit</option><option>Izin</option><option>Dinas luar</option><option>Keperluan mendesak</option><option>Lainnya</option></select></div>
                <div><label className={labelClass}>Catatan</label><textarea rows={2} value={substituteForm.notes} onChange={e=>setSubstituteForm({...substituteForm,notes:e.target.value})} className={inputClass} placeholder="Catatan tambahan (opsional)"/></div>
                {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
                <p className="rounded-lg bg-[#f8eee8] p-3 text-xs text-[#765b52]">Pergantian ini hanya berlaku untuk tanggal yang dipilih. Jadwal mingguan dan guru utama tidak diubah.</p>
                <div className="flex justify-end gap-2"><button type="button" onClick={()=>setSubstituteModalOpen(false)} className="rounded-xl border px-4 py-2 text-sm">Batal</button><button disabled={saving} className="rounded-xl bg-[#8C0F2D] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving?"Menyimpan...":"Simpan Pengganti"}</button></div>
                {substitutionsFor(selectedSchedule.id).filter(x=>x.substitution_date===substituteForm.date).map(x=><button key={x.id} type="button" onClick={()=>void cancelSubstitution(selectedSchedule,x.substitution_date)} className="text-xs font-semibold text-red-600">Batalkan penugasan pengganti tanggal ini</button>)}
              </form>
            </div>
          </div>
        )}

        {modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 md:p-6" onMouseDown={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-[#FFFDFB] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#f0e4dc] bg-[#FFFDFB] px-5 py-4"><div><h2 className="text-lg font-bold text-[#2B1B18]">{editingId ? "Edit Jadwal" : "Tambah Jadwal"}</h2><p className="text-xs text-[#8a746c]">Lengkapi informasi kegiatan belajar mengajar.</p></div><button onClick={() => setModalOpen(false)} className="rounded-lg p-2 text-[#806a63] hover:bg-[#f8eee8]"><X size={19}/></button></div>
            <form onSubmit={handleSave} className="space-y-4 p-5">
              {error && <div className="whitespace-pre-line rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div><label className={labelClass}>Guru Pengajar *</label><select required value={form.teacher_id} onChange={e => setForm({...form, teacher_id:e.target.value})} className={inputClass}><option value="">Pilih guru</option>{teachers.map(t=><option key={t.id} value={t.id}>{getLabel(t,["full_name","name","teacher_name","nama"]) || t.id}</option>)}</select></div>
                <div><label className={labelClass}>Mata Pelajaran *</label><select required value={form.subject_id} onChange={e => setForm({...form, subject_id:e.target.value})} className={inputClass}><option value="">Pilih mata pelajaran</option>{subjects.map(s=><option key={s.id} value={s.id}>{getLabel(s,["name","subject_name","nama_mapel","title"]) || s.id}</option>)}</select></div>
                <div><label className={labelClass}>Kelas</label><select value={form.class_id} onChange={e=>setForm({...form,class_id:e.target.value,rombel_id:""})} className={inputClass}><option value="">Pilih kelas (opsional)</option>{classes.map(c=><option key={c.id} value={c.id}>{getLabel(c,["name","class_name","nama_kelas","grade","title"]) || c.id}</option>)}</select></div>
                <div><label className={labelClass}>Rombongan Belajar</label><select value={form.rombel_id} onChange={e=>setForm({...form,rombel_id:e.target.value})} className={inputClass}><option value="">Pilih rombel (opsional)</option>{rombels.map(r=><option key={r.id} value={r.id}>{getLabel(r,["name","rombel_name","nama_rombel","class_name","title"]) || r.id}</option>)}</select></div>
                <div><label className={labelClass}>Siswa (opsional, untuk jadwal individual)</label><select value={form.student_id} onChange={e=>setForm({...form,student_id:e.target.value})} className={inputClass}><option value="">Semua siswa di kelas/rombel</option>{students.map(s=><option key={s.id} value={s.id}>{getLabel(s,["full_name","name","student_name","nama"]) || s.id}</option>)}</select></div>
                <div><label className={labelClass}>Hari *</label><select required value={form.day_name} onChange={e=>setForm({...form,day_name:e.target.value})} className={inputClass}>{DAYS.map(d=><option key={d}>{d}</option>)}</select></div>
                <div><label className={labelClass}>Tanggal (opsional)</label><input type="date" value={form.schedule_date} onChange={e=>setForm({...form,schedule_date:e.target.value,day_name:dateToDay(e.target.value)||form.day_name})} className={inputClass}/></div>
                <div><label className={labelClass}>Sesi</label><input value={form.session_name} onChange={e=>setForm({...form,session_name:e.target.value})} placeholder="Contoh: 1 / Sesi Pagi" className={inputClass}/></div>
                <div><label className={labelClass}>Jam Mulai *</label><input required type="time" value={form.start_time} onChange={e=>setForm({...form,start_time:e.target.value,duration_minutes:String(calcMinutes(e.target.value,form.end_time))})} className={inputClass}/></div>
                <div><label className={labelClass}>Jam Selesai *</label><input required type="time" value={form.end_time} onChange={e=>setForm({...form,end_time:e.target.value,duration_minutes:String(calcMinutes(form.start_time,e.target.value))})} className={inputClass}/></div>
                <div><label className={labelClass}>Durasi (menit)</label><input type="number" min="1" value={form.duration_minutes} onChange={e=>setForm({...form,duration_minutes:e.target.value})} className={inputClass}/></div>
                <div><label className={labelClass}>Tahun Ajaran</label><input value={form.academic_year} onChange={e=>setForm({...form,academic_year:e.target.value})} placeholder="2026/2027" className={inputClass}/></div>
                <div><label className={labelClass}>Semester</label><select value={form.semester} onChange={e=>setForm({...form,semester:e.target.value})} className={inputClass}><option>Ganjil</option><option>Genap</option></select></div>
                <div><label className={labelClass}>Topik / Materi</label><input value={form.material_topic} onChange={e=>setForm({...form,material_topic:e.target.value})} className={inputClass} placeholder="Materi pembelajaran"/></div>
              </div>
              <div><label className={labelClass}>Catatan</label><textarea rows={2} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} className={inputClass} placeholder="Catatan tambahan (opsional)"/></div>
              <div className="flex flex-col-reverse justify-end gap-2 border-t border-[#f0e4dc] pt-4 sm:flex-row"><button type="button" onClick={()=>setModalOpen(false)} className="rounded-xl border border-[#eaded8] px-5 py-2.5 text-sm font-semibold text-[#654b43]">Batal</button><button disabled={saving} type="submit" className="rounded-xl bg-[#8C0F2D] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Simpan Jadwal"}</button></div>
            </form>
          </div>
        </div>}
      </div>
    </KepalaSekolahLayout>
  );
}
