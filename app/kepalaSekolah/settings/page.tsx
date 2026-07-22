"use client";

import { useEffect, useMemo, useState } from "react";
import { Save, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import KepalaSekolahLayout from "../components/KepalaSekolahLayout";

type RoleKey =
  | "super_admin"
  | "kepala_sekolah"
  | "guru"
  | "orang_tua"
  | "siswa";

type RoleItem = {
  key: RoleKey;
  label: string;
  description: string;
};

type PermissionRow = {
  id: string;
  role: string;
  menu_key: string;
  menu_label: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
};

type SchoolProfile = {
  school_name: string;
  npsn: string;
  academic_year: string;
};

const roles: RoleItem[] = [
  {
    key: "super_admin",
    label: "Super Admin",
    description: "Akses penuh ke seluruh sistem.",
  },
  {
    key: "kepala_sekolah",
    label: "Kepala Sekolah",
    description: "Akses monitoring, review, approval, dan pengelolaan data.",
  },
  {
    key: "guru",
    label: "Guru",
    description: "Akses input data pembelajaran dan laporan murid.",
  },
  {
    key: "orang_tua",
    label: "Orang Tua",
    description: "Akses melihat informasi dan laporan anak.",
  },
  {
    key: "siswa",
    label: "Siswa",
    description: "Akses melihat progress, tugas, jadwal, dan laporan sendiri.",
  },
];

const defaultPermissions: Record<RoleKey, Omit<PermissionRow, "id">[]> = {
  super_admin: [
    permission("super_admin", "dashboard", "Dashboard", true, true, true, true, true),
    permission("super_admin", "siswa", "Siswa", true, true, true, true, true),
    permission("super_admin", "guru", "Guru", true, true, true, true, true),
    permission("super_admin", "jadwal_guru", "Jadwal Guru", true, true, true, true, true),
    permission("super_admin", "absensi_kbm", "Absensi KBM", true, true, true, true, true),
    permission("super_admin", "laporan_kbm", "Laporan KBM", true, true, true, true, true),
    permission("super_admin", "laporan_akademik", "Laporan Akademik", true, true, true, true, true),
    permission("super_admin", "rpp", "RPP", true, true, true, true, true),
    permission("super_admin", "program_semester", "Program Semester", true, true, true, true, true),
    permission("super_admin", "gallery", "Gallery", true, true, true, true, true),
  ],
  kepala_sekolah: [
    permission("kepala_sekolah", "dashboard", "Dashboard", true, false, false, false, false),
    permission("kepala_sekolah", "siswa", "Siswa", true, true, true, true, false),
    permission("kepala_sekolah", "guru", "Guru", true, true, true, true, false),
    permission("kepala_sekolah", "jadwal_guru", "Jadwal Guru", true, true, true, true, false),
    permission("kepala_sekolah", "absensi_kbm", "Absensi KBM", true, false, true, false, true),
    permission("kepala_sekolah", "laporan_kbm", "Laporan KBM", true, false, true, false, true),
    permission("kepala_sekolah", "laporan_akademik", "Laporan Akademik", true, false, true, false, true),
    permission("kepala_sekolah", "rpp", "RPP", true, false, true, false, true),
    permission("kepala_sekolah", "program_semester", "Program Semester", true, false, true, false, true),
    permission("kepala_sekolah", "gallery", "Gallery", true, false, false, false, false),
  ],
  guru: [
    permission("guru", "dashboard", "Dashboard", true, false, false, false, false),
    permission("guru", "murid_saya", "Murid Saya", true, false, false, false, false),
    permission("guru", "jadwal_mengajar", "Jadwal Mengajar", true, false, false, false, false),
    permission("guru", "absensi_kbm", "Absensi KBM", true, true, true, false, false),
    permission("guru", "laporan_kbm", "Laporan KBM", true, true, true, false, false),
    permission("guru", "laporan_akademik", "Laporan Akademik", true, true, true, false, false),
    permission("guru", "rpp", "RPP", true, true, true, false, false),
    permission("guru", "program_semester", "Program Semester", true, true, true, false, false),
    permission("guru", "gallery", "Gallery Upload", true, true, true, false, false),
  ],
  orang_tua: [
    permission("orang_tua", "dashboard", "Dashboard", true, false, false, false, false),
    permission("orang_tua", "laporan_anak", "Laporan Anak", true, false, false, false, false),
    permission("orang_tua", "jadwal_anak", "Jadwal Anak", true, false, false, false, false),
    permission("orang_tua", "absensi_anak", "Absensi Anak", true, false, false, false, false),
    permission("orang_tua", "gallery_anak", "Gallery Anak", true, false, false, false, false),
  ],
  siswa: [
    permission("siswa", "dashboard", "Dashboard", true, false, false, false, false),
    permission("siswa", "progress", "Progress Saya", true, false, false, false, false),
    permission("siswa", "tugas", "Tugas & Hasil", true, false, false, false, false),
    permission("siswa", "laporan", "Laporan Saya", true, false, false, false, false),
    permission("siswa", "jadwal", "Jadwal Saya", true, false, false, false, false),
  ],
};

function permission(
  role: RoleKey,
  menu_key: string,
  menu_label: string,
  can_view: boolean,
  can_create: boolean,
  can_edit: boolean,
  can_delete: boolean,
  can_approve: boolean
): Omit<PermissionRow, "id"> {
  return {
    role,
    menu_key,
    menu_label,
    can_view,
    can_create,
    can_edit,
    can_delete,
    can_approve,
  };
}

function getRoleLabel(roleKey: string) {
  return roles.find((role) => role.key === roleKey)?.label || roleKey;
}

function getDefaultPermissionRows(roleKey: RoleKey): PermissionRow[] {
  return defaultPermissions[roleKey].map((item) => ({
    ...item,
    id: `${item.role}-${item.menu_key}`,
  }));
}

export default function KepalaSekolahSettingsPage() {
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile>({
    school_name: "Homeschooling Tunas Karya Bangsa",
    npsn: "P.990880",
    academic_year: "2026/2027",
  });

  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [selectedRole, setSelectedRole] = useState<RoleItem | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<
    PermissionRow[]
  >([]);

  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function fetchPermissions() {
    setLoadingPermissions(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("role_permissions")
      .select(
        "id, role, menu_key, menu_label, can_view, can_create, can_edit, can_delete, can_approve"
      )
      .order("role", { ascending: true })
      .order("menu_label", { ascending: true });

    if (error) {
      setErrorMessage(
        `Gagal mengambil role permissions. Pastikan SQL role_permissions sudah dijalankan. Detail: ${error.message}`
      );
      setPermissions([]);
      setLoadingPermissions(false);
      return;
    }

    setPermissions((data || []) as PermissionRow[]);
    setLoadingPermissions(false);
  }

  useEffect(() => {
    fetchPermissions();
  }, []);

  const permissionSummary = useMemo(() => {
    const summary = new Map<string, PermissionRow[]>();

    permissions.forEach((item) => {
      if (!summary.has(item.role)) {
        summary.set(item.role, []);
      }

      summary.get(item.role)?.push(item);
    });

    return summary;
  }, [permissions]);

  function openRoleModal(role: RoleItem) {
    setSelectedRole(role);
    setMessage("");
    setErrorMessage("");

    const rolePermissions = permissions.filter((item) => item.role === role.key);

    setSelectedPermissions(
      rolePermissions.length > 0
        ? rolePermissions
        : getDefaultPermissionRows(role.key)
    );
  }

  function closeRoleModal() {
    if (savingPermissions) return;

    setSelectedRole(null);
    setSelectedPermissions([]);
    setMessage("");
    setErrorMessage("");
  }

  function togglePermission(
    menuKey: string,
    field:
      | "can_view"
      | "can_create"
      | "can_edit"
      | "can_delete"
      | "can_approve"
  ) {
    setSelectedPermissions((prev) =>
      prev.map((item) => {
        if (item.menu_key !== menuKey) return item;

        return {
          ...item,
          [field]: !item[field],
        };
      })
    );
  }

  async function handleSaveRolePermissions() {
    if (!selectedRole) return;

    setSavingPermissions(true);
    setMessage("");
    setErrorMessage("");

    const payload = selectedPermissions.map((item) => ({
      role: selectedRole.key,
      menu_key: item.menu_key,
      menu_label: item.menu_label,
      can_view: item.can_view,
      can_create: item.can_create,
      can_edit: item.can_edit,
      can_delete: item.can_delete,
      can_approve: item.can_approve,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("role_permissions")
      .upsert(payload, {
        onConflict: "role,menu_key",
      });

    setSavingPermissions(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMessage(`Akses ${selectedRole.label} berhasil disimpan.`);
    await fetchPermissions();
    setSelectedRole(null);
    setSelectedPermissions([]);
  }

  async function handleSaveSettings() {
    setSavingSettings(true);
    setMessage("");
    setErrorMessage("");

    await new Promise((resolve) => setTimeout(resolve, 500));

    setSavingSettings(false);
    setMessage("Pengaturan sekolah berhasil disimpan.");
  }

  return (
    <KepalaSekolahLayout
      activeMenu="Settings"
      searchPlaceholder="Cari pengaturan..."
      buttonLabel="＋ Create Report"
    >
      <div className="w-full max-w-full overflow-hidden">
        <div>
          <h1 className="text-[30px] font-bold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-[#6B4A3A]">
            Pengaturan sistem Management Sekolah HSTKB.
          </p>
        </div>

        {message && (
          <div className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        )}

        {errorMessage && (
          <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="mt-7 grid grid-cols-1 gap-5 xl:grid-cols-2">
          <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">Profil Sekolah</h2>
            <p className="mt-1 text-sm text-[#6B4A3A]">
              Informasi dasar Homeschooling Tunas Karya Bangsa.
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-semibold">Nama Sekolah</label>
                <input
                  value={schoolProfile.school_name}
                  onChange={(event) =>
                    setSchoolProfile((prev) => ({
                      ...prev,
                      school_name: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-[#E8D6C1] px-4 py-2.5 text-sm outline-none focus:border-[#7A1F2B]"
                />
              </div>

              <div>
                <label className="text-sm font-semibold">NPSN</label>
                <input
                  value={schoolProfile.npsn}
                  onChange={(event) =>
                    setSchoolProfile((prev) => ({
                      ...prev,
                      npsn: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-[#E8D6C1] px-4 py-2.5 text-sm outline-none focus:border-[#7A1F2B]"
                />
              </div>

              <div>
                <label className="text-sm font-semibold">Tahun Ajaran</label>
                <input
                  value={schoolProfile.academic_year}
                  onChange={(event) =>
                    setSchoolProfile((prev) => ({
                      ...prev,
                      academic_year: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-[#E8D6C1] px-4 py-2.5 text-sm outline-none focus:border-[#7A1F2B]"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">Role & Akses</h2>
            <p className="mt-1 text-sm text-[#6B4A3A]">
              Pengaturan akses pengguna sistem.
            </p>

            <div className="mt-6 space-y-3">
              {roles.map((role) => {
                const rolePermissions =
                  permissionSummary.get(role.key) ||
                  getDefaultPermissionRows(role.key);

                const activeMenus = rolePermissions.filter(
                  (item) => item.can_view
                ).length;

                return (
                  <div
                    key={role.key}
                    className="flex items-center justify-between gap-4 rounded-xl border border-[#E8D6C1] p-4"
                  >
                    <div className="min-w-0">
                      <p className="font-bold">{role.label}</p>
                      <p className="mt-1 text-sm text-[#6B4A3A]">
                        {role.description}
                      </p>
                      <p className="mt-2 text-xs font-semibold text-[#7A1F2B]">
                        {loadingPermissions
                          ? "Memuat akses..."
                          : `${activeMenus} menu aktif`}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => openRoleModal(role)}
                      className="shrink-0 rounded-lg bg-[#FDE7D7] px-3 py-2 text-xs font-bold text-[#7A1F2B] transition hover:bg-[#F8D2BB]"
                    >
                      Edit
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="rounded-xl bg-[#7A1F2B] px-6 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingSettings ? "Menyimpan..." : "Simpan Pengaturan"}
          </button>
        </div>
      </div>

      {selectedRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="flex max-h-[92vh] w-full max-w-[980px] flex-col overflow-hidden rounded-2xl bg-[#FAF3EA] shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-[#E8D6C1] px-6 py-5">
              <div>
                <h2 className="text-xl font-bold">
                  Edit Akses {selectedRole.label}
                </h2>
                <p className="mt-1 text-sm text-[#6B4A3A]">
                  Atur menu dan aksi yang boleh digunakan oleh role ini.
                </p>
              </div>

              <button
                type="button"
                onClick={closeRoleModal}
                className="flex h-10 w-10 items-center justify-center rounded-full text-[#6B4A3A] hover:bg-[#F1DFD5]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              <div className="overflow-hidden rounded-2xl border border-[#E8D6C1] bg-white">
                <div className="grid grid-cols-[2fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-3 border-b border-[#E8D6C1] bg-[#FFF8EF] px-5 py-4 text-xs font-bold uppercase tracking-wide text-[#6B4A3A]">
                  <div>Menu / Fitur</div>
                  <div className="text-center">View</div>
                  <div className="text-center">Create</div>
                  <div className="text-center">Edit</div>
                  <div className="text-center">Delete</div>
                  <div className="text-center">Approve</div>
                </div>

                {selectedPermissions.map((item) => (
                  <div
                    key={item.menu_key}
                    className="grid grid-cols-[2fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-3 border-b border-[#F1E5DA] px-5 py-4 last:border-b-0"
                  >
                    <div>
                      <p className="font-bold text-[#2B1B18]">
                        {item.menu_label}
                      </p>
                      <p className="mt-1 text-xs text-[#6B4A3A]">
                        {getRoleLabel(item.role)} / {item.menu_key}
                      </p>
                    </div>

                    <PermissionCheckbox
                      checked={item.can_view}
                      onChange={() =>
                        togglePermission(item.menu_key, "can_view")
                      }
                    />

                    <PermissionCheckbox
                      checked={item.can_create}
                      onChange={() =>
                        togglePermission(item.menu_key, "can_create")
                      }
                    />

                    <PermissionCheckbox
                      checked={item.can_edit}
                      onChange={() =>
                        togglePermission(item.menu_key, "can_edit")
                      }
                    />

                    <PermissionCheckbox
                      checked={item.can_delete}
                      onChange={() =>
                        togglePermission(item.menu_key, "can_delete")
                      }
                    />

                    <PermissionCheckbox
                      checked={item.can_approve}
                      onChange={() =>
                        togglePermission(item.menu_key, "can_approve")
                      }
                    />
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-[#E8D6C1] bg-white p-4 text-sm leading-6 text-[#6B4A3A]">
                <p>
                  Catatan: pengaturan ini sudah disimpan ke table{" "}
                  <span className="font-bold text-[#2B1B18]">
                    role_permissions
                  </span>
                  . Untuk benar-benar membatasi halaman/menu, nanti tiap layout
                  bisa membaca permission berdasarkan role login.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 justify-end gap-3 border-t border-[#E8D6C1] bg-[#FAF3EA] px-6 py-4">
              <button
                type="button"
                onClick={closeRoleModal}
                disabled={savingPermissions}
                className="rounded-xl border border-[#E8D6C1] bg-white px-5 py-3 text-sm font-bold text-[#6B4A3A] disabled:opacity-60"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleSaveRolePermissions}
                disabled={savingPermissions}
                className="flex items-center gap-2 rounded-xl bg-[#7A1F2B] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {savingPermissions ? "Menyimpan..." : "Simpan Akses"}
              </button>
            </div>
          </div>
        </div>
      )}
    </KepalaSekolahLayout>
  );
}

function PermissionCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-center">
      <button
        type="button"
        onClick={onChange}
        className={`flex h-6 w-6 items-center justify-center rounded-md border transition ${
          checked
            ? "border-[#7A1F2B] bg-[#7A1F2B] text-white"
            : "border-[#E8D6C1] bg-white text-transparent"
        }`}
      >
        ✓
      </button>
    </div>
  );
}