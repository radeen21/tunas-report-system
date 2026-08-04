"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  BookOpen,
  Edit3,
  GraduationCap,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import KepalaSekolahLayout from "../components/KepalaSekolahLayout";

type SubjectRow = {
  id: string;
  name: string | null;
  level: string | null;
  grade: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type SubjectForm = {
  id: string;
  name: string;
  level: string;
  grade: string;
};

const INITIAL_FORM: SubjectForm = {
  id: "",
  name: "",
  level: "",
  grade: "",
};

const LEVEL_OPTIONS = ["SD", "SMP", "SMA"];

const LEVEL_GRADE_OPTIONS: Record<string, string[]> = {
  SD: ["1", "2", "3", "4", "5", "6"],
  SMP: ["7", "8", "9"],
  SMA: ["10", "11", "12"],
};

function normalizeText(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function normalizeLevel(level?: string | null) {
  const safe = normalizeText(level);

  if (
    safe === "sd" ||
    safe.includes("primary") ||
    safe.includes("elementary")
  ) {
    return "SD";
  }

  if (
    safe === "smp" ||
    safe.includes("secondary") ||
    safe.includes("junior")
  ) {
    return "SMP";
  }

  if (
    safe === "sma" ||
    safe.includes("high school") ||
    safe.includes("senior")
  ) {
    return "SMA";
  }

  return level || "-";
}

function getGradeNumber(grade?: string | null) {
  if (!grade) return null;

  const match = grade.match(/\d+/);

  if (!match) return null;

  const number = Number(match[0]);

  return Number.isNaN(number) ? null : number;
}

function normalizeGrade(grade?: string | null) {
  const gradeNumber = getGradeNumber(grade);

  return gradeNumber ? String(gradeNumber) : "";
}

function getValidLevelByGrade(grade?: string | null) {
  const gradeNumber = getGradeNumber(grade);

  if (!gradeNumber) return "";

  if (gradeNumber >= 1 && gradeNumber <= 6) return "SD";
  if (gradeNumber >= 7 && gradeNumber <= 9) return "SMP";
  if (gradeNumber >= 10 && gradeNumber <= 12) return "SMA";

  return "";
}

function isValidLevelGrade(level: string, grade: string) {
  const options = LEVEL_GRADE_OPTIONS[level] || [];

  return options.includes(grade);
}

function getSubjectLabel(subject: SubjectRow) {
  const name = subject.name || "-";
  const level = normalizeLevel(subject.level);
  const grade = normalizeGrade(subject.grade);

  if (level !== "-" && grade) {
    return `${name} — ${level} ${grade}`;
  }

  if (level !== "-") {
    return `${name} — ${level}`;
  }

  if (grade) {
    return `${name} — Kelas ${grade}`;
  }

  return name;
}

function getLevelBadgeClass(level?: string | null) {
  const normalized = normalizeLevel(level);

  if (normalized === "SD") {
    return "bg-[#E0F2FE] text-[#0369A1]";
  }

  if (normalized === "SMP") {
    return "bg-[#FEF3C7] text-[#B45309]";
  }

  if (normalized === "SMA") {
    return "bg-[#DCFCE7] text-[#15803D]";
  }

  return "bg-[#F1F5F9] text-[#64748B]";
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function KepalaSekolahSubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("Semua Level");
  const [gradeFilter, setGradeFilter] = useState("Semua Kelas");

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<SubjectForm>(INITIAL_FORM);

  async function fetchSubjects() {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, name, level, grade, created_at, updated_at")
        .order("name", { ascending: true })
        .order("level", { ascending: true })
        .order("grade", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      setSubjects((data || []) as SubjectRow[]);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengambil data mata pelajaran.");
      }

      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchSubjects();

    const channel = supabase
      .channel("kepala-subjects-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subjects",
        },
        () => {
          void fetchSubjects();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const availableGradeOptions = useMemo(() => {
    if (levelFilter === "Semua Level") {
      return [
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "11",
        "12",
      ];
    }

    return LEVEL_GRADE_OPTIONS[levelFilter] || [];
  }, [levelFilter]);

  useEffect(() => {
    if (gradeFilter === "Semua Kelas") return;

    if (!availableGradeOptions.includes(gradeFilter)) {
      setGradeFilter("Semua Kelas");
    }
  }, [availableGradeOptions, gradeFilter]);

  const filteredSubjects = useMemo(() => {
    const keyword = normalizeText(search);

    return subjects.filter((subject) => {
      const normalizedLevel = normalizeLevel(subject.level);
      const normalizedGrade = normalizeGrade(subject.grade);

      const matchSearch =
        !keyword ||
        normalizeText(subject.name).includes(keyword) ||
        normalizeText(normalizedLevel).includes(keyword) ||
        normalizeText(normalizedGrade).includes(keyword) ||
        normalizeText(getSubjectLabel(subject)).includes(keyword);

      const matchLevel =
        levelFilter === "Semua Level" ||
        normalizedLevel === levelFilter;

      const matchGrade =
        gradeFilter === "Semua Kelas" ||
        normalizedGrade === gradeFilter;

      return matchSearch && matchLevel && matchGrade;
    });
  }, [subjects, search, levelFilter, gradeFilter]);

  const summary = useMemo(() => {
    return {
      total: subjects.length,
      sd: subjects.filter(
        (subject) => normalizeLevel(subject.level) === "SD"
      ).length,
      smp: subjects.filter(
        (subject) => normalizeLevel(subject.level) === "SMP"
      ).length,
      sma: subjects.filter(
        (subject) => normalizeLevel(subject.level) === "SMA"
      ).length,
    };
  }, [subjects]);

  const groupedSubjects = useMemo(() => {
    const grouped = new Map<
      string,
      {
        name: string;
        rows: SubjectRow[];
      }
    >();

    filteredSubjects.forEach((subject) => {
      const key = normalizeText(subject.name);
      const existing = grouped.get(key);

      if (existing) {
        existing.rows.push(subject);
      } else {
        grouped.set(key, {
          name: subject.name || "-",
          rows: [subject],
        });
      }
    });

    return Array.from(grouped.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [filteredSubjects]);

  function openCreateModal() {
    setForm(INITIAL_FORM);
    setErrorMessage("");
    setSuccessMessage("");
    setShowModal(true);
  }

  function openEditModal(subject: SubjectRow) {
    const grade = normalizeGrade(subject.grade);
    const levelFromData = normalizeLevel(subject.level);
    const validLevelFromGrade = getValidLevelByGrade(grade);

    setForm({
      id: subject.id,
      name: subject.name || "",
      level:
        validLevelFromGrade ||
        (LEVEL_OPTIONS.includes(levelFromData) ? levelFromData : ""),
      grade,
    });

    setErrorMessage("");
    setSuccessMessage("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setForm(INITIAL_FORM);
    setErrorMessage("");
  }

  function handleLevelChange(level: string) {
    const allowedGrades = LEVEL_GRADE_OPTIONS[level] || [];

    setForm((previous) => ({
      ...previous,
      level,
      grade: allowedGrades.includes(previous.grade)
        ? previous.grade
        : "",
    }));
  }

  function validateForm() {
    setErrorMessage("");

    if (!form.name.trim()) {
      setErrorMessage("Nama mata pelajaran wajib diisi.");
      return false;
    }

    if (!form.level) {
      setErrorMessage("Pilih level mata pelajaran.");
      return false;
    }

    if (!form.grade) {
      setErrorMessage("Pilih kelas mata pelajaran.");
      return false;
    }

    if (!isValidLevelGrade(form.level, form.grade)) {
      setErrorMessage(
        `Kelas ${form.grade} tidak sesuai dengan level ${form.level}.`
      );
      return false;
    }

    const duplicate = subjects.some((subject) => {
      if (form.id && subject.id === form.id) {
        return false;
      }

      return (
        normalizeText(subject.name) === normalizeText(form.name) &&
        normalizeLevel(subject.level) === form.level &&
        normalizeGrade(subject.grade) === form.grade
      );
    });

    if (duplicate) {
      setErrorMessage(
        `${form.name.trim()} untuk ${form.level} kelas ${form.grade} sudah tersedia.`
      );
      return false;
    }

    return true;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateForm()) return;

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const now = new Date().toISOString();

      const payload = {
        name: form.name.trim(),
        level: form.level,
        grade: form.grade,
        updated_at: now,
      };

      if (form.id) {
        const { error } = await supabase
          .from("subjects")
          .update(payload)
          .eq("id", form.id);

        if (error) {
          throw new Error(error.message);
        }

        setSuccessMessage("Mata pelajaran berhasil diperbarui.");
      } else {
        const { error } = await supabase.from("subjects").insert({
          ...payload,
          created_at: now,
        });

        if (error) {
          if (error.code === "23505") {
            throw new Error(
              "Mata pelajaran dengan level dan kelas tersebut sudah tersedia."
            );
          }

          throw new Error(error.message);
        }

        setSuccessMessage("Mata pelajaran berhasil ditambahkan.");
      }

      setShowModal(false);
      setForm(INITIAL_FORM);

      await fetchSubjects();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal menyimpan mata pelajaran.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(subject: SubjectRow) {
    const confirmDelete = window.confirm(
      `Hapus mata pelajaran "${getSubjectLabel(subject)}"?`
    );

    if (!confirmDelete) return;

    setDeletingId(subject.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } = await supabase
        .from("subjects")
        .delete()
        .eq("id", subject.id);

      if (error) {
        if (error.code === "23503") {
          throw new Error(
            "Mapel tidak dapat dihapus karena sudah digunakan pada data siswa, jadwal, absensi, RPP, atau laporan."
          );
        }

        throw new Error(error.message);
      }

      setSuccessMessage(
        `Mata pelajaran "${getSubjectLabel(subject)}" berhasil dihapus.`
      );

      await fetchSubjects();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal menghapus mata pelajaran.");
      }
    } finally {
      setDeletingId("");
    }
  }

  return (
    <KepalaSekolahLayout
      activeMenu={"Data Mapel" as any}
      searchPlaceholder="Cari mata pelajaran..."
    >
      <section className="space-y-7">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#8A5A48]">
              Kepala Sekolah / Admin
            </p>

            <h1 className="mt-2 text-[30px] font-extrabold tracking-[-0.02em] text-[#2B1B18]">
              Data Mata Pelajaran
            </h1>

            <p className="mt-2 max-w-[850px] text-[15px] leading-6 text-[#6F5549]">
              Kelola daftar mata pelajaran berdasarkan level dan kelas. Data
              ini digunakan untuk assignment guru, jadwal, absensi, RPP,
              laporan KBM, dan laporan akademik.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex h-11 w-fit items-center gap-2 rounded-xl bg-[#8C0F2D] px-5 text-[14px] font-extrabold text-white shadow-sm transition hover:bg-[#54131D]"
          >
            <Plus className="h-4 w-4" />
            Tambah Mapel
          </button>
        </div>

        {errorMessage && !showModal ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-[14px] leading-6 text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-[14px] leading-6 text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={<BookOpen className="h-5 w-5" />}
            label="Total Data Mapel"
            value={summary.total}
            info="Semua level"
            tone="pink"
          />

          <SummaryCard
            icon={<GraduationCap className="h-5 w-5" />}
            label="Mapel SD"
            value={summary.sd}
            info="Kelas 1–6"
            tone="blue"
          />

          <SummaryCard
            icon={<GraduationCap className="h-5 w-5" />}
            label="Mapel SMP"
            value={summary.smp}
            info="Kelas 7–9"
            tone="orange"
          />

          <SummaryCard
            icon={<GraduationCap className="h-5 w-5" />}
            label="Mapel SMA"
            value={summary.sma}
            info="Kelas 10–12"
            tone="green"
          />
        </div>

        <div className="rounded-[22px] border border-[#E1CFBE] bg-white p-5 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr_1fr]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8E6A58]" />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama mapel, level, atau kelas..."
                className="h-11 w-full rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] pl-11 pr-4 text-[14px] outline-none placeholder:text-[#9A7B6C] focus:border-[#9C0824]"
              />
            </div>

            <select
              value={levelFilter}
              onChange={(event) => setLevelFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              <option>Semua Level</option>
              <option value="SD">SD</option>
              <option value="SMP">SMP</option>
              <option value="SMA">SMA</option>
            </select>

            <select
              value={gradeFilter}
              onChange={(event) => setGradeFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-[#FBF8F4] px-4 text-[14px] outline-none focus:border-[#9C0824]"
            >
              <option>Semua Kelas</option>

              {availableGradeOptions.map((grade) => (
                <option key={grade} value={grade}>
                  Kelas {grade}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-[22px] border border-[#E1CFBE] bg-white shadow-sm">
          <div className="border-b border-[#EADACA] px-6 py-5">
            <h2 className="text-[20px] font-extrabold text-[#2B1B18]">
              Daftar Mata Pelajaran
            </h2>

            <p className="mt-1 text-[14px] text-[#6F5549]">
              Menampilkan {filteredSubjects.length} dari {subjects.length} data
              mata pelajaran.
            </p>
          </div>

          {loading ? (
            <div className="px-6 py-12 text-center text-[#6F5549]">
              Memuat data mata pelajaran...
            </div>
          ) : groupedSubjects.length === 0 ? (
            <div className="px-6 py-12 text-center text-[#6F5549]">
              Belum ada data mata pelajaran.
            </div>
          ) : (
            <div className="divide-y divide-[#EADACA]">
              {groupedSubjects.map((group) => (
                <div
                  key={normalizeText(group.name)}
                  className="px-6 py-5 transition hover:bg-[#FFF8EF]"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F8DFD0] text-[#8C0F2D]">
                        <BookOpen className="h-5 w-5" />
                      </div>

                      <div>
                        <h3 className="text-[18px] font-extrabold text-[#2B1B18]">
                          {group.name}
                        </h3>

                        <p className="mt-1 text-[13px] text-[#6F5549]">
                          {group.rows.length} kombinasi level dan kelas
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {group.rows.map((subject) => (
                            <div
                              key={subject.id}
                              className="flex items-center gap-2 rounded-xl border border-[#E8D6C1] bg-white px-3 py-2"
                            >
                              <span
                                className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${getLevelBadgeClass(
                                  subject.level
                                )}`}
                              >
                                {normalizeLevel(subject.level)}
                              </span>

                              <span className="text-[12px] font-bold text-[#2B1B18]">
                                Kelas {normalizeGrade(subject.grade) || "-"}
                              </span>

                              <button
                                type="button"
                                onClick={() => openEditModal(subject)}
                                className="rounded-lg p-1.5 text-[#8C0F2D] transition hover:bg-[#FFF1F2]"
                                title="Edit mapel"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => void handleDelete(subject)}
                                disabled={deletingId === subject.id}
                                className="rounded-lg p-1.5 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                title="Hapus mapel"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl bg-[#FFF8EF] px-4 py-3 text-[12px] text-[#6F5549]">
                      Update terakhir:{" "}
                      <span className="font-bold text-[#2B1B18]">
                        {formatDateTime(
                          group.rows
                            .map((row) => row.updated_at || row.created_at)
                            .filter(Boolean)
                            .sort()
                            .reverse()[0] || null
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[22px] border border-[#E1CFBE] bg-[#FFF8EF] px-6 py-5">
          <h2 className="text-[16px] font-extrabold text-[#2B1B18]">
            Aturan Level dan Kelas
          </h2>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <RuleCard
              title="SD"
              description="Kelas 1, 2, 3, 4, 5, dan 6"
            />

            <RuleCard
              title="SMP"
              description="Kelas 7, 8, dan 9"
            />

            <RuleCard
              title="SMA"
              description="Kelas 10, 11, dan 12"
            />
          </div>
        </div>
      </section>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
          <div className="w-full max-w-[620px] overflow-hidden rounded-[22px] bg-[#FAF3EA] shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#E8D6C1] px-6 py-5">
              <div>
                <h2 className="text-[22px] font-extrabold text-[#2B1B18]">
                  {form.id ? "Edit Mata Pelajaran" : "Tambah Mata Pelajaran"}
                </h2>

                <p className="mt-1 text-[14px] text-[#6F5549]">
                  Isi nama mapel, level, dan kelas yang sesuai.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-full p-2 text-[#6F5549] transition hover:bg-[#F4E5DA] disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
              {errorMessage ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              <FormGroup label="Nama Mata Pelajaran">
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      name: event.target.value,
                    }))
                  }
                  autoFocus
                  placeholder="Contoh: IPA, IPAS, Matematika"
                  maxLength={100}
                  className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                />
              </FormGroup>

              <div className="grid gap-4 md:grid-cols-2">
                <FormGroup label="Level">
                  <select
                    value={form.level}
                    onChange={(event) =>
                      handleLevelChange(event.target.value)
                    }
                    className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
                  >
                    <option value="">Pilih level</option>

                    {LEVEL_OPTIONS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </FormGroup>

                <FormGroup label="Kelas">
                  <select
                    value={form.grade}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        grade: event.target.value,
                      }))
                    }
                    disabled={!form.level}
                    className="h-12 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824] disabled:cursor-not-allowed disabled:bg-[#F4E5DA] disabled:opacity-70"
                  >
                    <option value="">
                      {form.level ? "Pilih kelas" : "Pilih level dulu"}
                    </option>

                    {(LEVEL_GRADE_OPTIONS[form.level] || []).map((grade) => (
                      <option key={grade} value={grade}>
                        Kelas {grade}
                      </option>
                    ))}
                  </select>
                </FormGroup>
              </div>

              {form.level && form.grade ? (
                <div className="rounded-2xl border border-[#E8D6C1] bg-white px-5 py-4">
                  <p className="text-[13px] font-bold text-[#6F5549]">
                    Preview
                  </p>

                  <p className="mt-2 text-[16px] font-extrabold text-[#2B1B18]">
                    {form.name.trim() || "Nama Mapel"} — {form.level} Kelas{" "}
                    {form.grade}
                  </p>
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="h-12 rounded-xl border border-[#DCC8B6] bg-white text-[14px] font-extrabold text-[#8C0F2D] transition hover:bg-[#FFF8EF] disabled:opacity-60"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="h-12 rounded-xl bg-[#8C0F2D] text-[14px] font-extrabold text-white transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Menyimpan..."
                    : form.id
                      ? "Update Mata Pelajaran"
                      : "Simpan Mata Pelajaran"}
                </button>
              </div>
            </form>
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

function FormGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
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

function RuleCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-[#E8D6C1] bg-white px-5 py-4">
      <p className="text-[15px] font-extrabold text-[#8C0F2D]">{title}</p>

      <p className="mt-1 text-[13px] leading-6 text-[#6F5549]">
        {description}
      </p>
    </div>
  );
}