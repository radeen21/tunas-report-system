"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, Eye, FileText, Search, Send, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import KepalaSekolahLayout from "../components/KepalaSekolahLayout";

type TeacherRow = {
  id: string;
  full_name: string | null;
  email?: string | null;
};

type RppRow = {
  id: string;

  // kolom lama
  title?: string | null;

  teacher_id: string | null;
  curriculum_program_id: string | null;
  curriculum_chapter_id: string | null;
  curriculum_sub_chapter_id: string | null;
  subject_name: string | null;
  level: string | null;
  grade: string | null;
  semester: string | null;
  academic_year: string | null;
  meeting_date: string | null;
  meeting_number: number | null;
  rpp_title: string | null;
  learning_objectives: string | null;
  opening_activity: string | null;
  core_activity: string | null;
  closing_activity: string | null;
  assessment: string | null;
  learning_media: string | null;
  learning_resources: string | null;
  document_url: string | null;
  notes: string | null;
  status: "draft" | "submitted" | "approved" | "rejected" | string | null;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_note: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type EnrichedRpp = RppRow & {
  teacher_name: string;
};

function normalizeText(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getRppTitle(rpp: RppRow) {
  return rpp.rpp_title || rpp.title || "-";
}

function getStatusLabel(status?: string | null) {
  if (status === "submitted") return "Submitted";
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Draft";
}

function getStatusClass(status?: string | null) {
  if (status === "approved") return "bg-[#C7F0DA] text-[#158A58]";
  if (status === "submitted") return "bg-[#FFF2B8] text-[#B26A00]";
  if (status === "rejected") return "bg-[#FFE4E6] text-[#BE123C]";
  return "bg-[#F1F5F9] text-[#64748B]";
}

export default function KepalaSekolahRppPage() {
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [rpps, setRpps] = useState<EnrichedRpp[]>([]);

  const [loading, setLoading] = useState(true);
  const [selectedRpp, setSelectedRpp] = useState<EnrichedRpp | null>(null);

  const [search, setSearch] = useState("");
  const [teacherFilter, setTeacherFilter] = useState("Semua Guru");
  const [statusFilter, setStatusFilter] = useState("Semua Status");

  const [rejectingRpp, setRejectingRpp] = useState<EnrichedRpp | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");

  async function fetchData() {
    setLoading(true);

    const [teachersRes, rppRes] = await Promise.all([
      supabase.from("teachers").select("*").order("full_name"),
      supabase.from("rpp").select("*").order("updated_at", { ascending: false }),
    ]);

    const teachersData = (teachersRes.data || []) as TeacherRow[];
    const rppData = (rppRes.data || []) as RppRow[];

    const teacherMap = new Map(teachersData.map((teacher) => [teacher.id, teacher]));

    const enriched: EnrichedRpp[] = rppData.map((rpp) => {
      const teacher = rpp.teacher_id ? teacherMap.get(rpp.teacher_id) : null;

      return {
        ...rpp,
        teacher_name: teacher?.full_name || "-",
      };
    });

    setTeachers(teachersData);
    setRpps(enriched);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("kepala-rpp-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rpp" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teachers" },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredRpps = useMemo(() => {
    const q = normalizeText(search);

    return rpps.filter((rpp) => {
      const matchSearch =
        !q ||
        normalizeText(getRppTitle(rpp)).includes(q) ||
        normalizeText(rpp.teacher_name).includes(q) ||
        normalizeText(rpp.subject_name).includes(q) ||
        normalizeText(rpp.learning_objectives).includes(q);

      const matchTeacher =
        teacherFilter === "Semua Guru" || rpp.teacher_id === teacherFilter;

      const matchStatus =
        statusFilter === "Semua Status" || rpp.status === statusFilter;

      return matchSearch && matchTeacher && matchStatus;
    });
  }, [rpps, search, teacherFilter, statusFilter]);

  const summary = useMemo(() => {
    return {
      total: rpps.length,
      submitted: rpps.filter((rpp) => rpp.status === "submitted").length,
      approved: rpps.filter((rpp) => rpp.status === "approved").length,
      rejected: rpps.filter((rpp) => rpp.status === "rejected").length,
    };
  }, [rpps]);

  async function handleApprove(rpp: EnrichedRpp) {
    const confirmApprove = confirm(`Approve RPP "${getRppTitle(rpp)}"?`);

    if (!confirmApprove) return;

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("rpp")
      .update({
        status: "approved",
        approved_at: now,
        rejected_at: null,
        rejection_note: null,
        updated_at: now,
      })
      .eq("id", rpp.id);

    if (error) {
      alert(`Gagal approve RPP: ${error.message}`);
      return;
    }

    await fetchData();
    setSelectedRpp(null);
  }

  async function handleReject() {
    if (!rejectingRpp) return;

    if (!rejectionNote.trim()) {
      alert("Isi catatan revisi terlebih dahulu.");
      return;
    }

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("rpp")
      .update({
        status: "rejected",
        rejected_at: now,
        rejection_note: rejectionNote.trim(),
        updated_at: now,
      })
      .eq("id", rejectingRpp.id);

    if (error) {
      alert(`Gagal reject RPP: ${error.message}`);
      return;
    }

    await fetchData();

    setRejectingRpp(null);
    setSelectedRpp(null);
    setRejectionNote("");
  }

  return (
    <KepalaSekolahLayout activeMenu="RPP" searchPlaceholder="Cari RPP...">
      <section className="space-y-7">
        <div>
          <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#8A5A48]">
            Kepala Sekolah
          </p>

          <h1 className="mt-2 text-[30px] font-extrabold tracking-[-0.02em] text-[#2B1B18]">
            Monitoring RPP
          </h1>

          <p className="mt-2 max-w-[850px] text-[15px] leading-6 text-[#6F5549]">
            Review RPP yang dibuat guru. RPP dengan status submitted bisa
            di-approve atau dikembalikan dengan catatan revisi.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={<FileText className="h-5 w-5" />}
            label="Total RPP"
            value={summary.total}
            info="Data"
            tone="pink"
          />

          <SummaryCard
            icon={<Send className="h-5 w-5" />}
            label="Submitted"
            value={summary.submitted}
            info="Review"
            tone="blue"
          />

          <SummaryCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Approved"
            value={summary.approved}
            info="Approved"
            tone="green"
          />

          <SummaryCard
            icon={<X className="h-5 w-5" />}
            label="Rejected"
            value={summary.rejected}
            info="Revisi"
            tone="orange"
          />
        </div>

        <div className="rounded-[22px] border border-[#E1CFBE] bg-white p-5 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr_1fr]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8E6A58]" />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari judul, guru, mapel, atau tujuan..."
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
              <option>Semua Status</option>
              <option value="draft">draft</option>
              <option value="submitted">submitted</option>
              <option value="approved">approved</option>
              <option value="rejected">rejected</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-[22px] border border-[#E1CFBE] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse">
              <thead>
                <tr className="border-b border-[#EADACA] bg-[#FFF8EF] text-left text-[13px] font-extrabold text-[#6F5549]">
                  <th className="px-6 py-4">RPP</th>
                  <th className="px-6 py-4">Guru</th>
                  <th className="px-6 py-4">Mapel</th>
                  <th className="px-6 py-4">Kelas</th>
                  <th className="px-6 py-4">Pertemuan</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-[#6F5549]"
                    >
                      Memuat data RPP...
                    </td>
                  </tr>
                ) : filteredRpps.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-[#6F5549]"
                    >
                      Belum ada data RPP.
                    </td>
                  </tr>
                ) : (
                  filteredRpps.map((rpp) => (
                    <tr
                      key={rpp.id}
                      className="border-b border-[#F0E1D4] text-[14px] text-[#2B1B18]"
                    >
                      <td className="px-6 py-4">
                        <p className="font-extrabold">{getRppTitle(rpp)}</p>
                        <p className="mt-1 text-[12px] text-[#6F5549]">
                          Update: {formatDateTime(rpp.updated_at)}
                        </p>
                      </td>

                      <td className="px-6 py-4">{rpp.teacher_name}</td>

                      <td className="px-6 py-4">{rpp.subject_name || "-"}</td>

                      <td className="px-6 py-4">
                        {rpp.level} — {rpp.grade}
                      </td>

                      <td className="px-6 py-4">
                        {formatDate(rpp.meeting_date)}
                        <br />
                        <span className="text-[12px] text-[#6F5549]">
                          Pertemuan {rpp.meeting_number || "-"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge status={rpp.status} />
                      </td>

                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => setSelectedRpp(rpp)}
                          className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#DCC8B6] px-3 text-[13px] font-extrabold text-[#8C0F2D] transition hover:bg-[#FFF8EF]"
                        >
                          <Eye className="h-4 w-4" />
                          Detail
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

      {selectedRpp ? (
        <RppDetailModal
          rpp={selectedRpp}
          onClose={() => setSelectedRpp(null)}
          onApprove={() => handleApprove(selectedRpp)}
          onReject={() => {
            setRejectingRpp(selectedRpp);
            setRejectionNote("");
          }}
        />
      ) : null}

      {rejectingRpp ? (
        <RejectModal
          rpp={rejectingRpp}
          note={rejectionNote}
          onChange={setRejectionNote}
          onClose={() => setRejectingRpp(null)}
          onSubmit={handleReject}
        />
      ) : null}
    </KepalaSekolahLayout>
  );
}

function RppDetailModal({
  rpp,
  onClose,
  onApprove,
  onReject,
}: {
  rpp: EnrichedRpp;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <ModalShell title="Detail RPP" subtitle={getRppTitle(rpp)} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={rpp.status} />

          <span className="rounded-full bg-[#F4E5DA] px-3 py-1 text-[12px] font-extrabold text-[#8A2332]">
            {rpp.teacher_name}
          </span>

          <span className="rounded-full bg-[#F1F5F9] px-3 py-1 text-[12px] font-extrabold text-[#64748B]">
            {rpp.level} — {rpp.grade}
          </span>
        </div>

        <InfoBlock label="Judul RPP" value={getRppTitle(rpp)} />

        <InfoBlock label="Mapel" value={rpp.subject_name || "-"} />

        <InfoBlock
          label="Tanggal / Pertemuan"
          value={`${formatDate(rpp.meeting_date)} • Pertemuan ${
            rpp.meeting_number || "-"
          }`}
        />

        <InfoBlock
          label="Tujuan Pembelajaran"
          value={rpp.learning_objectives || "-"}
        />

        <InfoBlock label="Kegiatan Pembukaan" value={rpp.opening_activity || "-"} />

        <InfoBlock label="Kegiatan Inti" value={rpp.core_activity || "-"} />

        <InfoBlock label="Kegiatan Penutup" value={rpp.closing_activity || "-"} />

        <InfoBlock label="Assessment" value={rpp.assessment || "-"} />

        <InfoBlock label="Media Pembelajaran" value={rpp.learning_media || "-"} />

        <InfoBlock label="Sumber Belajar" value={rpp.learning_resources || "-"} />

        <InfoBlock label="Catatan Guru" value={rpp.notes || "-"} />

        {rpp.document_url ? (
          <a
            href={rpp.document_url}
            target="_blank"
            className="block rounded-xl bg-[#8C0F2D] px-4 py-3 text-center text-[14px] font-extrabold text-white"
          >
            Buka Dokumen RPP
          </a>
        ) : null}

        {rpp.rejection_note ? (
          <InfoBlock label="Catatan Revisi" value={rpp.rejection_note} />
        ) : null}

        {rpp.status === "submitted" ? (
          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={onReject}
              className="h-11 rounded-xl border border-[#FECACA] text-[14px] font-extrabold text-[#DC2626] transition hover:bg-[#FFF1F2]"
            >
              Reject / Revisi
            </button>

            <button
              type="button"
              onClick={onApprove}
              className="h-11 rounded-xl bg-[#158A58] text-[14px] font-extrabold text-white transition hover:bg-[#116C46]"
            >
              Approve RPP
            </button>
          </div>
        ) : null}
      </div>
    </ModalShell>
  );
}

function RejectModal({
  rpp,
  note,
  onChange,
  onClose,
  onSubmit,
}: {
  rpp: EnrichedRpp;
  note: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <ModalShell
      title="Reject / Revisi RPP"
      subtitle={getRppTitle(rpp)}
      onClose={onClose}
    >
      <div className="space-y-4">
        <label className="block">
          <p className="mb-2 text-[14px] font-extrabold text-[#2B1B18]">
            Catatan Revisi
          </p>

          <textarea
            value={note}
            onChange={(event) => onChange(event.target.value)}
            rows={5}
            placeholder="Contoh: Mohon lengkapi kegiatan penutup dan assessment..."
            className="w-full resize-none rounded-xl border border-[#DCC8B6] bg-white px-4 py-3 text-[14px] outline-none focus:border-[#9C0824]"
          />
        </label>

        <button
          type="button"
          onClick={onSubmit}
          className="h-11 w-full rounded-xl bg-[#DC2626] text-[14px] font-extrabold text-white transition hover:bg-[#B91C1C]"
        >
          Kirim Revisi
        </button>
      </div>
    </ModalShell>
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

function ModalShell({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-8">
      <div className="max-h-[92vh] w-full max-w-[980px] overflow-y-auto rounded-[22px] bg-[#FFF8EF] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E1CFBE] bg-[#FFF8EF] px-6 py-5">
          <div>
            <h2 className="text-[22px] font-extrabold text-[#2B1B18]">
              {title}
            </h2>

            <p className="mt-1 text-[14px] text-[#6F5549]">{subtitle}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#6F5549] transition hover:bg-[#F4E5DA]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-6">{children}</div>
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#E1CFBE] bg-white px-5 py-4">
      <p className="text-[13px] font-extrabold uppercase tracking-[0.08em] text-[#8A5A48]">
        {label}
      </p>

      <p className="mt-2 whitespace-pre-line text-[14px] leading-6 text-[#2B1B18]">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-[12px] font-extrabold ${getStatusClass(
        status
      )}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}