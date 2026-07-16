"use client";

import KepalaSekolahLayout from "../components/KepalaSekolahLayout";

const reports = [
  {
    student: "Jonathan Wijaya",
    period: "June 2026",
    teacher: "Ms. Sarah",
    type: "Monthly",
    status: "Published",
    date: "12 Jun 2026",
    color: "bg-emerald-100 text-emerald-700",
  },
  {
    student: "Aisha Putri",
    period: "Week 24 — Jun 2026",
    teacher: "Mr. Andi",
    type: "Weekly",
    status: "Pending Review",
    date: "14 Jun 2026",
    color: "bg-orange-100 text-orange-700",
  },
  {
    student: "Darren Lim",
    period: "June 2026",
    teacher: "Ms. Clara",
    type: "Monthly",
    status: "Approved",
    date: "15 Jun 2026",
    color: "bg-sky-100 text-sky-700",
  },
  {
    student: "Jonathan Wijaya",
    period: "Week 24 — Jun 2026",
    teacher: "Ms. Sarah",
    type: "Weekly",
    status: "Draft",
    date: "16 Jun 2026",
    color: "bg-slate-200 text-slate-700",
  },
];

export default function KepalaSekolahReportsPage() {
  return (
    <KepalaSekolahLayout
      activeMenu="Laporan Akademik"
      searchPlaceholder="Cari laporan akademik..."
      buttonLabel="＋ Tambah Report"
    >
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[30px] font-bold tracking-tight">
            Laporan Akademik
          </h1>
          <p className="mt-1 text-sm text-[#6B4A3A]">
            Review, approve, publish, dan kelola laporan perkembangan akademik
            siswa.
          </p>
        </div>

        <button className="rounded-xl bg-[#7A1F2B] px-5 py-3 text-sm font-semibold text-white">
          ＋ Tambah Report
        </button>
      </div>

      <div className="mt-7 grid grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#6B4A3A]">Total Report</p>
          <p className="mt-3 text-3xl font-bold">4</p>
        </div>

        <div className="rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#6B4A3A]">Draft</p>
          <p className="mt-3 text-3xl font-bold">1</p>
        </div>

        <div className="rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#6B4A3A]">Pending</p>
          <p className="mt-3 text-3xl font-bold">1</p>
        </div>

        <div className="rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#6B4A3A]">Published</p>
          <p className="mt-3 text-3xl font-bold">1</p>
        </div>
      </div>

      <div className="mt-7 rounded-2xl border border-[#E8D6C1] bg-white p-5 shadow-sm">
        <div className="grid grid-cols-[1fr_180px_180px_160px] gap-3">
          <input
            placeholder="Cari nama siswa atau guru..."
            className="rounded-xl border border-[#E8D6C1] px-4 py-2.5 text-sm outline-none focus:border-[#7A1F2B]"
          />

          <select className="rounded-xl border border-[#E8D6C1] px-4 py-2.5 text-sm">
            <option>Semua Status</option>
            <option>Draft</option>
            <option>Pending Review</option>
            <option>Approved</option>
            <option>Published</option>
          </select>

          <select className="rounded-xl border border-[#E8D6C1] px-4 py-2.5 text-sm">
            <option>Semua Type</option>
            <option>Weekly</option>
            <option>Monthly</option>
          </select>

          <input
            type="date"
            className="rounded-xl border border-[#E8D6C1] px-4 py-2.5 text-sm"
          />
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-[#E8D6C1] bg-white shadow-sm">
        <div className="border-b border-[#E8D6C1] px-6 py-5">
          <h2 className="text-lg font-bold">Daftar Laporan</h2>
          <p className="mt-1 text-sm text-[#6B4A3A]">
            Semua laporan perkembangan siswa.
          </p>
        </div>

        <table className="w-full text-left">
          <thead className="bg-[#FFF8EF] text-xs uppercase text-[#6B4A3A]">
            <tr>
              <th className="px-6 py-4">Siswa</th>
              <th className="px-6 py-4">Period</th>
              <th className="px-6 py-4">Guru</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Tanggal</th>
              <th className="px-6 py-4 text-right">Aksi</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#E8D6C1]">
            {reports.map((report) => (
              <tr key={`${report.student}-${report.date}`}>
                <td className="px-6 py-5 font-bold">{report.student}</td>
                <td className="px-6 py-5 text-sm text-[#6B4A3A]">
                  {report.period}
                </td>
                <td className="px-6 py-5 text-sm text-[#6B4A3A]">
                  {report.teacher}
                </td>
                <td className="px-6 py-5 text-sm text-[#6B4A3A]">
                  {report.type}
                </td>
                <td className="px-6 py-5">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${report.color}`}
                  >
                    {report.status}
                  </span>
                </td>
                <td className="px-6 py-5 text-sm text-[#6B4A3A]">
                  {report.date}
                </td>
                <td className="px-6 py-5 text-right">
                  <button className="rounded-lg border border-[#E8D6C1] px-3 py-2 text-xs font-bold">
                    Preview
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </KepalaSekolahLayout>
  );
}