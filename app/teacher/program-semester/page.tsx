"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  Layers3,
  Search,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import TeacherLayout from "../components/TeacherLayout";

type TeacherRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  subjects?: string[] | string | null;
};

type CurriculumProgram = {
  id: string;
  program_type: string | null;
  level: string | null;
  grade: string | null;
  subject_name: string | null;
  semester: string | null;
  academic_year: string | null;
  teacher_id: string | null;
  source_material: string | null;
  status: string | null;
  notes: string | null;
};

type CurriculumChapter = {
  id: string;
  curriculum_program_id: string;
  chapter_order: number;
  chapter_title: string;
  month_target: string | null;
};

type CurriculumSubChapter = {
  id: string;
  curriculum_chapter_id: string;
  sub_chapter_order: number;
  sub_chapter_title: string;
  target_month: string | null;
  planned_week: string | null;
  status: string | null;
};

type CurriculumProgress = {
  id: string;
  curriculum_program_id: string | null;
  curriculum_chapter_id: string | null;
  curriculum_sub_chapter_id: string | null;
  teacher_id: string | null;
  student_id: string | null;
  subject_id: string | null;
  teaching_date: string | null;
  day_name: string | null;
  status: string | null;
  notes: string | null;
};

type ProgramView = CurriculumProgram & {
  chapters: Array<
    CurriculumChapter & {
      sub_chapters: Array<
        CurriculumSubChapter & {
          progress_records: CurriculumProgress[];
        }
      >;
    }
  >;
};

const ALL = "Semua";
const MONTHS = ["Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const WEEKS = ["W1", "W2", "W3", "W4"];

function normalizeText(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function formatSubjects(subjects: string[] | string | null | undefined) {
  if (!subjects) return "Guru";

  if (Array.isArray(subjects)) {
    return `Guru — ${subjects.slice(0, 3).join(", ")}`;
  }

  return `Guru — ${subjects}`;
}

function statusLabel(status?: string | null) {
  const safe = normalizeText(status);

  if (safe === "approved") return "Approved";
  if (safe === "pending_approval") return "Pending Approval";
  if (safe === "pending") return "Pending";
  if (safe === "published") return "Published";

  return "Draft";
}

function statusClass(status?: string | null) {
  const safe = normalizeText(status);

  if (safe === "approved" || safe === "published") {
    return "bg-[#C7F0DA] text-[#158A58]";
  }

  if (safe.includes("pending")) {
    return "bg-[#FFF2B8] text-[#B26A00]";
  }

  return "bg-[#E8D6C1] text-[#6F5549]";
}

function getWeekNumber(week?: string | null) {
  if (!week) return 1;
  const match = week.match(/\d+/);
  return match ? Number(match[0]) : 1;
}

function getMonthNameFromDate(dateString?: string | null) {
  if (!dateString) return null;

  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat("id-ID", { month: "long" }).format(date);
}

function getWeekOfMonth(dateString?: string | null) {
  if (!dateString) return 1;

  const date = new Date(`${dateString}T00:00:00`);
  const day = date.getDate();

  return Math.min(4, Math.ceil(day / 7));
}

function formatDate(dateString?: string | null) {
  if (!dateString) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateString}T00:00:00`));
}

function getProgramProgress(program: ProgramView) {
  const subChapters = program.chapters.flatMap((chapter) => chapter.sub_chapters);
  const total = subChapters.length;
  const completed = subChapters.filter((sub) => sub.progress_records.length > 0).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, completed, percentage };
}

function getSubChapterCellStatus(
  subChapter: CurriculumSubChapter & {
    progress_records: CurriculumProgress[];
  },
  month: string,
  week: string
) {
  const completedRecord = subChapter.progress_records.find((progress) => {
    const progressMonth = getMonthNameFromDate(progress.teaching_date);
    const progressWeek = `W${getWeekOfMonth(progress.teaching_date)}`;

    return progressMonth === month && progressWeek === week;
  });

  if (completedRecord) {
    return {
      type: "completed",
      record: completedRecord,
    };
  }

  const targetWeek = `W${getWeekNumber(subChapter.planned_week)}`;

  if (subChapter.target_month === month && targetWeek === week) {
    return {
      type: "planned",
      record: null,
    };
  }

  return {
    type: "empty",
    record: null,
  };
}

export default function TeacherProgramSemesterPage() {
  const [teacher, setTeacher] = useState<TeacherRow | null>(null);
  const [programs, setPrograms] = useState<ProgramView[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProgramId, setExpandedProgramId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [programType, setProgramType] = useState(ALL);
  const [level, setLevel] = useState(ALL);
  const [grade, setGrade] = useState(ALL);
  const [subject, setSubject] = useState(ALL);
  const [semester, setSemester] = useState(ALL);

  async function getCurrentTeacher() {
    const { data: authData } = await supabase.auth.getUser();

    const email =
      authData.user?.email ||
      localStorage.getItem("hstkb_demo_email") ||
      localStorage.getItem("hstkb_email") ||
      "";

    if (email) {
      const { data } = await supabase
        .from("teachers")
        .select("*")
        .eq("email", email)
        .limit(1)
        .maybeSingle();

      if (data) return data as TeacherRow;
    }

    const { data } = await supabase
      .from("teachers")
      .select("*")
      .order("teacher_code", { ascending: true })
      .limit(1)
      .maybeSingle();

    return data as TeacherRow | null;
  }

  async function fetchCurriculumData() {
    setLoading(true);

    const currentTeacher = await getCurrentTeacher();
    setTeacher(currentTeacher);

    if (!currentTeacher?.id) {
      setPrograms([]);
      setLoading(false);
      return;
    }

    const [programsRes, chaptersRes, subChaptersRes, progressRes] =
      await Promise.all([
        supabase
          .from("curriculum_programs")
          .select("*")
          .eq("teacher_id", currentTeacher.id)
          .order("level", { ascending: true })
          .order("grade", { ascending: true })
          .order("subject_name", { ascending: true }),

        supabase
          .from("curriculum_chapters")
          .select("*")
          .order("chapter_order", { ascending: true }),

        supabase
          .from("curriculum_sub_chapters")
          .select("*")
          .order("sub_chapter_order", { ascending: true }),

        supabase
          .from("curriculum_progress")
          .select("*")
          .eq("teacher_id", currentTeacher.id)
          .order("teaching_date", { ascending: false }),
      ]);

    const programsData = (programsRes.data || []) as CurriculumProgram[];
    const chaptersData = (chaptersRes.data || []) as CurriculumChapter[];
    const subChaptersData = (subChaptersRes.data || []) as CurriculumSubChapter[];
    const progressData = (progressRes.data || []) as CurriculumProgress[];

    const programIds = new Set(programsData.map((program) => program.id));

    const relatedChapters = chaptersData.filter((chapter) =>
      programIds.has(chapter.curriculum_program_id)
    );

    const chapterIds = new Set(relatedChapters.map((chapter) => chapter.id));

    const relatedSubChapters = subChaptersData.filter((sub) =>
      chapterIds.has(sub.curriculum_chapter_id)
    );

    const progressBySubChapter = new Map<string, CurriculumProgress[]>();
    progressData.forEach((progress) => {
      if (!progress.curriculum_sub_chapter_id) return;

      const current = progressBySubChapter.get(progress.curriculum_sub_chapter_id) || [];
      current.push(progress);
      progressBySubChapter.set(progress.curriculum_sub_chapter_id, current);
    });

    const subByChapter = new Map<
      string,
      Array<CurriculumSubChapter & { progress_records: CurriculumProgress[] }>
    >();

    relatedSubChapters.forEach((sub) => {
      const current = subByChapter.get(sub.curriculum_chapter_id) || [];

      current.push({
        ...sub,
        progress_records: progressBySubChapter.get(sub.id) || [],
      });

      subByChapter.set(sub.curriculum_chapter_id, current);
    });

    const chaptersByProgram = new Map<
      string,
      Array<
        CurriculumChapter & {
          sub_chapters: Array<
            CurriculumSubChapter & { progress_records: CurriculumProgress[] }
          >;
        }
      >
    >();

    relatedChapters.forEach((chapter) => {
      const current = chaptersByProgram.get(chapter.curriculum_program_id) || [];

      current.push({
        ...chapter,
        sub_chapters: subByChapter.get(chapter.id) || [],
      });

      chaptersByProgram.set(chapter.curriculum_program_id, current);
    });

    const mapped: ProgramView[] = programsData.map((program) => ({
      ...program,
      chapters: chaptersByProgram.get(program.id) || [],
    }));

    setPrograms(mapped);

    if (!expandedProgramId && mapped.length > 0) {
      setExpandedProgramId(mapped[0].id);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchCurriculumData();

    const channel = supabase
      .channel("teacher-program-semester-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "curriculum_programs" },
        fetchCurriculumData
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "curriculum_chapters" },
        fetchCurriculumData
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "curriculum_sub_chapters" },
        fetchCurriculumData
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "curriculum_progress" },
        fetchCurriculumData
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const optionData = useMemo(() => {
    return {
      programTypes: Array.from(
        new Set(programs.map((item) => item.program_type).filter(Boolean))
      ) as string[],
      levels: Array.from(
        new Set(programs.map((item) => item.level).filter(Boolean))
      ) as string[],
      grades: Array.from(
        new Set(programs.map((item) => item.grade).filter(Boolean))
      ) as string[],
      subjects: Array.from(
        new Set(programs.map((item) => item.subject_name).filter(Boolean))
      ) as string[],
      semesters: Array.from(
        new Set(programs.map((item) => item.semester).filter(Boolean))
      ) as string[],
    };
  }, [programs]);

  const filteredPrograms = useMemo(() => {
    const q = normalizeText(search);

    return programs.filter((program) => {
      const matchSearch =
        !q ||
        normalizeText(program.subject_name).includes(q) ||
        normalizeText(program.level).includes(q) ||
        normalizeText(program.grade).includes(q) ||
        normalizeText(program.program_type).includes(q);

      const matchProgramType =
        programType === ALL || program.program_type === programType;
      const matchLevel = level === ALL || program.level === level;
      const matchGrade = grade === ALL || program.grade === grade;
      const matchSubject = subject === ALL || program.subject_name === subject;
      const matchSemester = semester === ALL || program.semester === semester;

      return (
        matchSearch &&
        matchProgramType &&
        matchLevel &&
        matchGrade &&
        matchSubject &&
        matchSemester
      );
    });
  }, [programs, search, programType, level, grade, subject, semester]);

  const summary = useMemo(() => {
    const totalPrograms = programs.length;

    const allSubChapters = programs.flatMap((program) =>
      program.chapters.flatMap((chapter) => chapter.sub_chapters)
    );

    const completed = allSubChapters.filter(
      (sub) => sub.progress_records.length > 0
    ).length;

    const totalSubChapters = allSubChapters.length;
    const percentage =
      totalSubChapters > 0 ? Math.round((completed / totalSubChapters) * 100) : 0;

    return {
      totalPrograms,
      totalSubChapters,
      completed,
      percentage,
    };
  }, [programs]);

  return (
    <TeacherLayout
      activeMenu="Program Semester"
      teacherName={teacher?.full_name || "Guru"}
      teacherSubject={formatSubjects(teacher?.subjects)}
      searchPlaceholder="Cari program semester..."
    >
      <section className="space-y-6">
        <div>
          <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#8A5A48]">
            Teacher Portal
          </p>

          <h1 className="mt-2 text-[30px] font-extrabold tracking-[-0.02em] text-[#2B1B18]">
            Program Semester Saya
          </h1>

          <p className="mt-2 max-w-[840px] text-[15px] leading-6 text-[#6F5549]">
            Checklist progress otomatis dari Absensi KBM yang sudah disimpan.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={<BookOpen className="h-5 w-5" />}
            label="Program Saya"
            value={summary.totalPrograms}
            info="Aktif"
            tone="pink"
          />
          <SummaryCard
            icon={<Layers3 className="h-5 w-5" />}
            label="Total Sub Bab"
            value={summary.totalSubChapters}
            info="Materi"
            tone="orange"
          />
          <SummaryCard
            icon={<Check className="h-5 w-5" />}
            label="Sudah Diajarkan"
            value={summary.completed}
            info="Checklist"
            tone="green"
          />
          <SummaryCard
            icon={<CalendarDays className="h-5 w-5" />}
            label="Progress"
            value={`${summary.percentage}%`}
            info="Overall"
            tone="blue"
          />
        </div>

        <div className="rounded-[22px] border border-[#E1CFBE] bg-white p-5 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-[1.7fr_1fr_1fr_1fr_1fr_1fr]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8E6A58]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari program semester..."
                className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] pl-11 pr-4 text-[14px] outline-none placeholder:text-[#9A7B6C] focus:border-[#9C0824]"
              />
            </div>

            <FilterSelect value={programType} onChange={setProgramType} options={optionData.programTypes} />
            <FilterSelect value={level} onChange={setLevel} options={optionData.levels} />
            <FilterSelect value={grade} onChange={setGrade} options={optionData.grades} />
            <FilterSelect value={subject} onChange={setSubject} options={optionData.subjects} />
            <FilterSelect value={semester} onChange={setSemester} options={optionData.semesters} />
          </div>
        </div>

        <div className="grid gap-5">
          {loading ? (
            <EmptyState text="Memuat data program semester..." />
          ) : filteredPrograms.length === 0 ? (
            <EmptyState text="Belum ada program semester untuk guru ini." />
          ) : (
            filteredPrograms.map((program) => {
              const isOpen = expandedProgramId === program.id;
              const progress = getProgramProgress(program);

              return (
                <div
                  key={program.id}
                  className="overflow-hidden rounded-[22px] border border-[#E1CFBE] bg-white shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedProgramId(isOpen ? null : program.id)
                    }
                    className="flex w-full items-start justify-between gap-5 px-6 py-5 text-left transition hover:bg-[#FFF8EF]"
                  >
                    <div className="flex gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F8DFD0] text-[#8C0F2D]">
                        <FileText className="h-5 w-5" />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-[19px] font-extrabold text-[#2B1B18]">
                            {program.subject_name}
                          </h2>

                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-extrabold ${statusClass(
                              program.status
                            )}`}
                          >
                            {statusLabel(program.status)}
                          </span>
                        </div>

                        <p className="mt-2 text-[14px] text-[#6F5549]">
                          {program.program_type} • {program.level} •{" "}
                          {program.grade} • Semester {program.semester} •{" "}
                          {program.academic_year}
                        </p>

                        <p className="mt-1 text-[13px] text-[#8A5A48]">
                          Sumber Materi: {program.source_material || "-"}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-4">
                      <div className="hidden min-w-[140px] md:block">
                        <div className="mb-2 flex justify-between text-[12px] font-bold text-[#6F5549]">
                          <span>Progress</span>
                          <span>{progress.percentage}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#F0E1D4]">
                          <div
                            className="h-full rounded-full bg-[#8C0F2D]"
                            style={{ width: `${progress.percentage}%` }}
                          />
                        </div>
                        <p className="mt-2 text-[12px] text-[#6F5549]">
                          {progress.completed}/{progress.total} sub bab
                        </p>
                      </div>

                      {isOpen ? (
                        <ChevronDown className="mt-1 h-5 w-5 text-[#8A2332]" />
                      ) : (
                        <ChevronRight className="mt-1 h-5 w-5 text-[#8A2332]" />
                      )}
                    </div>
                  </button>

                  {isOpen ? <ProgramMatrix program={program} /> : null}
                </div>
              );
            })
          )}
        </div>
      </section>
    </TeacherLayout>
  );
}

function ProgramMatrix({ program }: { program: ProgramView }) {
  return (
    <div className="border-t border-[#EADACA] bg-[#FFF8EF] p-5">
      <div className="mb-4 rounded-2xl border border-[#E1CFBE] bg-white px-5 py-4">
        <div className="grid gap-3 text-[13px] text-[#2B1B18] md:grid-cols-2 xl:grid-cols-4">
          <InfoItem
            label="Program / Kelas"
            value={`${program.program_type || "-"} / ${program.grade || "-"}`}
          />
          <InfoItem label="Mapel" value={program.subject_name || "-"} />
          <InfoItem label="Semester" value={program.semester || "-"} />
          <InfoItem label="Tahun Ajaran" value={program.academic_year || "-"} />
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-[12px]">
          <span className="rounded-full bg-[#C7F0DA] px-3 py-1 font-bold text-[#158A58]">
            ✓ Sudah diajarkan dari Absensi KBM
          </span>
          <span className="rounded-full bg-[#F4E5DA] px-3 py-1 font-bold text-[#8A2332]">
            • Target rencana
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#E1CFBE] bg-white">
        <table className="w-full min-w-[1280px] border-collapse">
          <thead>
            <tr className="border-b border-[#DCC8B6] bg-[#FFF8EF]">
              <th
                rowSpan={2}
                className="w-[390px] border-r border-[#DCC8B6] px-4 py-3 text-left text-[14px] font-extrabold text-[#2B1B18]"
              >
                Materi Pokok
              </th>

              {MONTHS.map((month) => (
                <th
                  key={month}
                  colSpan={4}
                  className="border-r border-[#DCC8B6] px-3 py-3 text-center text-[14px] font-extrabold text-[#2B1B18]"
                >
                  {month}
                </th>
              ))}
            </tr>

            <tr className="border-b border-[#DCC8B6] bg-[#FFF8EF]">
              {MONTHS.flatMap((month) =>
                WEEKS.map((week) => (
                  <th
                    key={`${month}-${week}`}
                    className="border-r border-[#EADACA] px-2 py-2 text-center text-[12px] font-bold text-[#6F5549]"
                  >
                    {week}
                  </th>
                ))
              )}
            </tr>
          </thead>

          <tbody>
            {program.chapters.map((chapter) => (
              <Fragment key={chapter.id}>
                <tr className="bg-[#FFFCF8]">
                  <td
                    colSpan={1 + MONTHS.length * WEEKS.length}
                    className="border-b border-[#EADACA] px-4 py-3 text-[14px] font-extrabold text-[#2B1B18]"
                  >
                    {chapter.chapter_title}
                    <span className="ml-2 text-[12px] font-semibold text-[#8A5A48]">
                      Target: {chapter.month_target || "-"}
                    </span>
                  </td>
                </tr>

                {chapter.sub_chapters.map((sub) => (
                  <tr
                    key={sub.id}
                    className="border-b border-[#F0E1D4] text-[13px]"
                  >
                    <td className="border-r border-[#DCC8B6] px-4 py-3 font-semibold text-[#2B1B18]">
                      {sub.sub_chapter_title}
                    </td>

                    {MONTHS.flatMap((month) =>
                      WEEKS.map((week) => {
                        const cell = getSubChapterCellStatus(sub, month, week);

                        return (
                          <td
                            key={`${sub.id}-${month}-${week}`}
                            title={
                              cell.record
                                ? `Diajarkan: ${formatDate(
                                    cell.record.teaching_date
                                  )}`
                                : ""
                            }
                            className="h-10 border-r border-[#EADACA] px-2 text-center"
                          >
                            {cell.type === "completed" ? (
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#C7F0DA] text-[#158A58]">
                                <Check className="h-4 w-4" />
                              </span>
                            ) : cell.type === "planned" ? (
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#F4E5DA] text-[18px] leading-none text-[#8A2332]">
                                •
                              </span>
                            ) : null}
                          </td>
                        );
                      })
                    )}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
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

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
    >
      <option value={ALL}>{ALL}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
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

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[22px] border border-[#E1CFBE] bg-white px-6 py-12 text-center text-[#6F5549] shadow-sm">
      {text}
    </div>
  );
}