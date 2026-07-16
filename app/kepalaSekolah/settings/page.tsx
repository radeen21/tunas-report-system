"use client";

import KepalaSekolahLayout from "../components/KepalaSekolahLayout";

export default function KepalaSekolahSettingsPage() {
  return (
    <KepalaSekolahLayout
      activeMenu="Settings"
      searchPlaceholder="Cari pengaturan..."
      buttonLabel="＋ Create Report"
    >
      <div>
        <h1 className="text-[30px] font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-[#6B4A3A]">
          Pengaturan sistem Management Sekolah HSTKB.
        </p>
      </div>

      <div className="mt-7 grid grid-cols-2 gap-5">
        <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Profil Sekolah</h2>
          <p className="mt-1 text-sm text-[#6B4A3A]">
            Informasi dasar Homeschooling Tunas Karya Bangsa.
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-semibold">Nama Sekolah</label>
              <input
                defaultValue="Homeschooling Tunas Karya Bangsa"
                className="mt-2 w-full rounded-xl border border-[#E8D6C1] px-4 py-2.5 text-sm outline-none focus:border-[#7A1F2B]"
              />
            </div>

            <div>
              <label className="text-sm font-semibold">NPSN</label>
              <input
                defaultValue="P.990880"
                className="mt-2 w-full rounded-xl border border-[#E8D6C1] px-4 py-2.5 text-sm outline-none focus:border-[#7A1F2B]"
              />
            </div>

            <div>
              <label className="text-sm font-semibold">Tahun Ajaran</label>
              <input
                defaultValue="2026/2027"
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
            {[
              "Super Admin",
              "Kepala Sekolah",
              "Guru",
              "Orang Tua",
              "Siswa",
            ].map((role) => (
              <div
                key={role}
                className="flex items-center justify-between rounded-xl border border-[#E8D6C1] p-4"
              >
                <div>
                  <p className="font-bold">{role}</p>
                  <p className="text-sm text-[#6B4A3A]">
                    Hak akses dapat disesuaikan.
                  </p>
                </div>

                <button className="rounded-lg bg-[#FDE7D7] px-3 py-2 text-xs font-bold text-[#7A1F2B]">
                  Edit
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button className="rounded-xl bg-[#7A1F2B] px-6 py-3 text-sm font-bold text-white">
          Simpan Pengaturan
        </button>
      </div>
    </KepalaSekolahLayout>
  );
}