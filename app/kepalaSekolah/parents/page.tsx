"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import KepalaSekolahLayout from "../components/KepalaSekolahLayout";

type ParentRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  relation: string | null;
  religion: string | null;
  address: string | null;
  notes: string | null;
  birth_place_date: string | null;
  education_level: string | null;
  occupation: string | null;
  nik: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type StudentRow = {
  id: string;
  full_name: string | null;
  parent_id: string | null;
};

type ParentWithChildren = ParentRow & {
  children_count: number;
  children_names: string[];
};

type ParentForm = {
  full_name: string;
  relation: string;
  religion: string;
  birth_place_date: string;
  education_level: string;
  occupation: string;
  nik: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
};

const initialForm: ParentForm = {
  full_name: "",
  relation: "Ayah",
  religion: "",
  birth_place_date: "",
  education_level: "",
  occupation: "",
  nik: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
};

const relationOptions = ["Ayah", "Ibu", "Wali"];

const religionOptions = [
  "",
  "Kristen",
  "Katolik",
  "Islam",
  "Hindu",
  "Buddha",
  "Konghucu",
  "Lainnya",
];

const educationOptions = [
  "",
  "SD",
  "SMP",
  "SMA/SMK",
  "D1",
  "D2",
  "D3",
  "D4",
  "S1",
  "S2",
  "S3",
  "Lainnya",
];

function normalizeText(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function getInitials(name?: string | null) {
  if (!name) return "OT";

  const words = name.trim().split(" ").filter(Boolean);

  if (words.length === 0) return "OT";
  if (words.length === 1) return words[0].charAt(0).toUpperCase();

  return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
}

export default function KepalaSekolahParentsPage() {
  const [parents, setParents] = useState<ParentWithChildren[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingParent, setEditingParent] = useState<ParentWithChildren | null>(
    null
  );

  const [form, setForm] = useState<ParentForm>(initialForm);
  const [formError, setFormError] = useState("");

  async function fetchData() {
    setLoading(true);

    const [parentsRes, studentsRes] = await Promise.all([
      supabase
        .from("parents")
        .select(
          `
          id,
          full_name,
          email,
          phone,
          relation,
          religion,
          address,
          notes,
          birth_place_date,
          education_level,
          occupation,
          nik,
          created_at,
          updated_at
        `
        )
        .order("full_name", { ascending: true }),

      supabase
        .from("students")
        .select("id, full_name, parent_id")
        .order("full_name", { ascending: true }),
    ]);

    if (parentsRes.error) {
      alert(parentsRes.error.message);
      setLoading(false);
      return;
    }

    if (studentsRes.error) {
      alert(studentsRes.error.message);
      setLoading(false);
      return;
    }

    const parentsData = (parentsRes.data || []) as ParentRow[];
    const studentsData = (studentsRes.data || []) as StudentRow[];

    setStudents(studentsData);

    const childrenByParent = new Map<string, string[]>();

    studentsData.forEach((student) => {
      if (!student.parent_id) return;

      const current = childrenByParent.get(student.parent_id) || [];
      current.push(student.full_name || "Tanpa Nama");
      childrenByParent.set(student.parent_id, current);
    });

    const mappedParents: ParentWithChildren[] = parentsData.map((parent) => {
      const childrenNames = childrenByParent.get(parent.id) || [];

      return {
        ...parent,
        children_count: childrenNames.length,
        children_names: childrenNames,
      };
    });

    setParents(mappedParents);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("kepala-sekolah-parents-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "parents" },
        fetchData
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        fetchData
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredParents = useMemo(() => {
    const q = normalizeText(search);

    if (!q) return parents;

    return parents.filter((parent) => {
      return (
        normalizeText(parent.full_name).includes(q) ||
        normalizeText(parent.email).includes(q) ||
        normalizeText(parent.phone).includes(q) ||
        normalizeText(parent.relation).includes(q) ||
        normalizeText(parent.religion).includes(q) ||
        normalizeText(parent.address).includes(q) ||
        normalizeText(parent.birth_place_date).includes(q) ||
        normalizeText(parent.education_level).includes(q) ||
        normalizeText(parent.occupation).includes(q) ||
        normalizeText(parent.nik).includes(q) ||
        parent.children_names.some((name) => normalizeText(name).includes(q))
      );
    });
  }, [parents, search]);

  const summary = useMemo(() => {
    return {
      totalParents: parents.length,
      totalLinkedStudents: students.filter((student) => student.parent_id)
        .length,
      totalWithoutChildren: parents.filter(
        (parent) => parent.children_count === 0
      ).length,
    };
  }, [parents, students]);

  function openCreateModal() {
    setEditingParent(null);
    setForm(initialForm);
    setFormError("");
    setShowModal(true);
  }

  function openEditModal(parent: ParentWithChildren) {
    setEditingParent(parent);
    setForm({
      full_name: parent.full_name || "",
      relation: parent.relation || "Ayah",
      religion: parent.religion || "",
      birth_place_date: parent.birth_place_date || "",
      education_level: parent.education_level || "",
      occupation: parent.occupation || "",
      nik: parent.nik || "",
      phone: parent.phone || "",
      email: parent.email || "",
      address: parent.address || "",
      notes: parent.notes || "",
    });
    setFormError("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setEditingParent(null);
    setForm(initialForm);
    setFormError("");
  }

  function updateForm(key: keyof ParentForm, value: string) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!form.full_name.trim()) {
      setFormError("Nama orang tua / wali wajib diisi.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        full_name: form.full_name.trim(),
        relation: form.relation || null,
        religion: form.religion || null,
        birth_place_date: form.birth_place_date.trim() || null,
        education_level: form.education_level || null,
        occupation: form.occupation.trim() || null,
        nik: form.nik.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (editingParent) {
        const { error } = await supabase
          .from("parents")
          .update(payload)
          .eq("id", editingParent.id);

        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("parents").insert(payload);

        if (error) throw new Error(error.message);
      }

      await fetchData();
      closeModal();
    } catch (error) {
      if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError("Gagal menyimpan data orang tua.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(parent: ParentWithChildren) {
    if (parent.children_count > 0) {
      alert(
        "Data orang tua/wali ini masih terhubung dengan siswa. Lepaskan dulu dari data siswa sebelum dihapus."
      );
      return;
    }

    const confirmed = window.confirm(
      `Yakin mau hapus data orang tua/wali "${parent.full_name || "-"}"?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("parents")
      .delete()
      .eq("id", parent.id);

    if (error) {
      alert(error.message);
      return;
    }

    await fetchData();
  }

  return (
    <KepalaSekolahLayout
      activeMenu="Orang Tua"
      searchPlaceholder="Cari orang tua, wali, agama, NIK, HP, email, atau nama siswa..."
    >
      <section className="w-full max-w-full space-y-7 overflow-hidden">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#8A5A48]">
              Principal Portal
            </p>

            <h1 className="mt-2 text-[30px] font-extrabold tracking-[-0.02em] text-[#2B1B18]">
              Data Orang Tua / Wali
            </h1>

            <p className="mt-2 max-w-[760px] text-[15px] leading-6 text-[#6F5549]">
              Kelola data ayah, ibu, atau wali siswa. Data ini akan muncul di
              dropdown saat admin menambah atau mengedit data siswa.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex h-[46px] w-fit items-center gap-3 rounded-2xl bg-[#9C0824] px-6 text-[15px] font-bold text-white shadow-sm transition hover:brightness-105"
          >
            <Plus className="h-4 w-4" />
            Tambah Orang Tua / Wali
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            icon={<Users className="h-5 w-5" />}
            label="Total Orang Tua / Wali"
            value={summary.totalParents}
          />

          <SummaryCard
            icon={<UserRound className="h-5 w-5" />}
            label="Siswa Terhubung"
            value={summary.totalLinkedStudents}
          />

          <SummaryCard
            icon={<Users className="h-5 w-5" />}
            label="Belum Terhubung"
            value={summary.totalWithoutChildren}
          />
        </div>

        <div className="rounded-[22px] border border-[#E1CFBE] bg-white/60 p-4 shadow-[0_4px_14px_rgba(77,31,9,0.05)]">
          <div className="relative max-w-[560px]">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8E6A58]" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama, agama, NIK, HP, email, pekerjaan, atau nama siswa..."
              className="h-[42px] w-full rounded-[14px] border border-[#DCC8B6] bg-[#FBF8F4] pl-11 pr-4 text-[15px] outline-none placeholder:text-[#9A7B6C] focus:border-[#9C0824]"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-[22px] border border-[#E1CFBE] bg-white shadow-[0_4px_14px_rgba(77,31,9,0.05)]">
          <div className="min-w-[1420px]">
            <div className="grid grid-cols-[1.4fr_0.75fr_0.85fr_1fr_1fr_1fr_1fr_1.4fr_0.65fr] gap-3 border-b border-[#EADACA] px-4 py-4 text-[12px] font-bold text-[#6F5549]">
              <div>Nama</div>
              <div>Relasi</div>
              <div>Agama</div>
              <div>NIK</div>
              <div>Pekerjaan</div>
              <div>No HP</div>
              <div>Email</div>
              <div>Siswa Terhubung</div>
              <div className="text-right">Aksi</div>
            </div>

            {loading ? (
              <div className="px-5 py-12 text-center text-[#7D5E50]">
                Memuat data orang tua/wali...
              </div>
            ) : filteredParents.length === 0 ? (
              <div className="px-5 py-12 text-center text-[#7D5E50]">
                Belum ada data orang tua/wali.
              </div>
            ) : (
              filteredParents.map((parent) => (
                <div
                  key={parent.id}
                  className="grid grid-cols-[1.4fr_0.75fr_0.85fr_1fr_1fr_1fr_1fr_1.4fr_0.65fr] gap-3 border-b border-[#F1E5DA] px-4 py-4 last:border-b-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F3E1D6] text-[14px] font-bold text-[#8E2333]">
                      {getInitials(parent.full_name)}
                    </div>

                    <div className="min-w-0">
                      <p
                        className="max-w-[190px] truncate text-[14px] font-bold leading-5 text-[#2C1A17]"
                        title={parent.full_name || "-"}
                      >
                        {parent.full_name || "-"}
                      </p>

                      <p
                        className="mt-0.5 max-w-[190px] truncate text-[12px] text-[#7A5E52]"
                        title={parent.birth_place_date || "-"}
                      >
                        {parent.birth_place_date ||
                          "Tempat/Tgl lahir belum diisi"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <span className="rounded-full bg-[#FFF8EF] px-3 py-1 text-[12px] font-bold text-[#8A2332]">
                      {parent.relation || "-"}
                    </span>
                  </div>

                  <div className="flex min-w-0 items-center">
                    <p
                      className="truncate text-[13px] font-semibold text-[#2C1A17]"
                      title={parent.religion || "-"}
                    >
                      {parent.religion || "-"}
                    </p>
                  </div>

                  <div className="flex min-w-0 items-center">
                    <p
                      className="truncate text-[13px] font-semibold text-[#2C1A17]"
                      title={parent.nik || "-"}
                    >
                      {parent.nik || "-"}
                    </p>
                  </div>

                  <div className="flex min-w-0 items-center">
                    <p
                      className="truncate text-[13px] font-semibold text-[#2C1A17]"
                      title={parent.occupation || "-"}
                    >
                      {parent.occupation || "-"}
                    </p>
                  </div>

                  <div className="flex min-w-0 items-center">
                    {parent.phone ? (
                      <a
                        href={`https://wa.me/${parent.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-[13px] font-semibold text-[#2C1A17] hover:text-[#9C0824]"
                        title={parent.phone}
                      >
                        {parent.phone}
                      </a>
                    ) : (
                      <span className="text-[13px] text-[#7A5E52]">-</span>
                    )}
                  </div>

                  <div className="flex min-w-0 items-center">
                    {parent.email ? (
                      <a
                        href={`mailto:${parent.email}`}
                        className="truncate text-[13px] font-semibold text-[#2C1A17] hover:text-[#9C0824]"
                        title={parent.email}
                      >
                        {parent.email}
                      </a>
                    ) : (
                      <span className="text-[13px] text-[#7A5E52]">-</span>
                    )}
                  </div>

                  <div className="min-w-0 self-center">
                    <p className="text-[13px] font-bold text-[#2C1A17]">
                      {parent.children_count} siswa terhubung
                    </p>

                    <p
                      className="mt-0.5 max-w-[230px] truncate text-[12px] text-[#7A5E52]"
                      title={parent.children_names.join(", ")}
                    >
                      {parent.children_names.length > 0
                        ? parent.children_names.join(", ")
                        : "Belum terhubung"}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => openEditModal(parent)}
                      className="text-[#4A2E28] transition hover:text-[#9C0824]"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(parent)}
                      className="text-[#D11A2A] transition hover:opacity-80"
                      title="Hapus"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {showModal ? (
        <ParentModal
          form={form}
          saving={saving}
          formError={formError}
          editingParent={editingParent}
          onClose={closeModal}
          onSubmit={handleSubmit}
          onChange={updateForm}
        />
      ) : null}
    </KepalaSekolahLayout>
  );
}

function ParentModal({
  form,
  saving,
  formError,
  editingParent,
  onClose,
  onSubmit,
  onChange,
}: {
  form: ParentForm;
  saving: boolean;
  formError: string;
  editingParent: ParentWithChildren | null;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChange: (key: keyof ParentForm, value: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/45 px-4 py-8">
      <div className="mx-auto w-full max-w-[820px] overflow-hidden rounded-[24px] bg-[#FFF8EF] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#E8D7C5] px-6 py-5">
          <div>
            <h2 className="text-[22px] font-bold text-[#2C1A17]">
              {editingParent
                ? "Edit Orang Tua / Wali"
                : "Tambah Orang Tua / Wali"}
            </h2>

            <p className="mt-1 text-[14px] text-[#7D5E50]">
              Data ini akan digunakan saat admin memilih orang tua/wali di data
              siswa.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#7D5E50] transition hover:bg-[#F0E2D4] hover:text-[#9C0824]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="px-6 py-6">
          <div className="grid gap-4 md:grid-cols-2">
            <FormInput
              label="Nama Orang Tua / Wali"
              value={form.full_name}
              placeholder="Contoh: Bapak Andi"
              onChange={(value) => onChange("full_name", value)}
            />

            <div>
              <label className="text-[13px] font-bold text-[#6F5549]">
                Relasi
              </label>

              <select
                value={form.relation}
                onChange={(event) => onChange("relation", event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
              >
                {relationOptions.map((relation) => (
                  <option key={relation} value={relation}>
                    {relation}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[13px] font-bold text-[#6F5549]">
                Agama
              </label>

              <select
                value={form.religion}
                onChange={(event) => onChange("religion", event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
              >
                <option value="">Pilih agama</option>
                {religionOptions
                  .filter((religion) => religion !== "")
                  .map((religion) => (
                    <option key={religion} value={religion}>
                      {religion}
                    </option>
                  ))}
              </select>
            </div>

            <FormInput
              label="Tempat Tgl Lahir"
              value={form.birth_place_date}
              placeholder="Contoh: Jakarta, 12 Januari 1980"
              onChange={(value) => onChange("birth_place_date", value)}
            />

            <div>
              <label className="text-[13px] font-bold text-[#6F5549]">
                Jenjang Pendidikan
              </label>

              <select
                value={form.education_level}
                onChange={(event) =>
                  onChange("education_level", event.target.value)
                }
                className="mt-2 h-11 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
              >
                <option value="">Pilih jenjang pendidikan</option>
                {educationOptions
                  .filter((education) => education !== "")
                  .map((education) => (
                    <option key={education} value={education}>
                      {education}
                    </option>
                  ))}
              </select>
            </div>

            <FormInput
              label="Pekerjaan"
              value={form.occupation}
              placeholder="Contoh: Karyawan Swasta"
              onChange={(value) => onChange("occupation", value)}
            />

            <FormInput
              label="NIK"
              value={form.nik}
              placeholder="Nomor Induk Kependudukan"
              onChange={(value) => onChange("nik", value)}
            />

            <FormInput
              label="No HP / WhatsApp"
              value={form.phone}
              placeholder="Contoh: 08123456789"
              onChange={(value) => onChange("phone", value)}
            />

            <FormInput
              label="Email"
              value={form.email}
              placeholder="Contoh: orangtua@email.com"
              onChange={(value) => onChange("email", value)}
            />

            <div className="md:col-span-2">
              <label className="text-[13px] font-bold text-[#6F5549]">
                Alamat
              </label>

              <textarea
                value={form.address}
                onChange={(event) => onChange("address", event.target.value)}
                rows={3}
                placeholder="Alamat lengkap orang tua / wali"
                className="mt-2 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 py-3 text-[14px] outline-none focus:border-[#9C0824]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-[13px] font-bold text-[#6F5549]">
                Catatan
              </label>

              <textarea
                value={form.notes}
                onChange={(event) => onChange("notes", event.target.value)}
                rows={3}
                placeholder="Catatan tambahan, opsional"
                className="mt-2 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 py-3 text-[14px] outline-none focus:border-[#9C0824]"
              />
            </div>
          </div>

          {formError ? (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
              {formError}
            </div>
          ) : null}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-11 rounded-xl border border-[#DCC8B6] bg-white px-5 text-[14px] font-bold text-[#6F5549] transition hover:bg-[#F7EDE2] disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="h-11 rounded-xl bg-[#9C0824] px-6 text-[14px] font-bold text-white transition hover:brightness-105 disabled:opacity-60"
            >
              {saving
                ? "Menyimpan..."
                : editingParent
                ? "Simpan Perubahan"
                : "Save Parent"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[18px] border border-[#E8D6C1] bg-white px-5 py-5 shadow-sm">
      <div className="mb-7 flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F8E1E8] text-[#8C0F2D]">
          {icon}
        </div>

        <span className="text-[13px] font-extrabold text-[#009B68]">Data</span>
      </div>

      <p className="text-[26px] font-extrabold leading-none text-[#2B1B18]">
        {value}
      </p>

      <p className="mt-2 text-[13px] text-[#6B4A3A]">{label}</p>
    </div>
  );
}

function FormInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-[13px] font-bold text-[#6F5549]">{label}</label>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-xl border border-[#DCC8B6] bg-white px-4 text-[14px] outline-none focus:border-[#9C0824]"
      />
    </div>
  );
}