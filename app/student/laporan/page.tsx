"use client";

import StudentLayout from "../components/StudentLayout";

const scores = [
  {
    mapel: "Matematika",
    uh: 85,
    tugas: 90,
    uts: 82,
    uas: 88,
    proses: 90,
    total: 87,
    ket: "Sangat Baik",
  },
  {
    mapel: "Science",
    uh: 80,
    tugas: 88,
    uts: 78,
    uas: 85,
    proses: 88,
    total: 84,
    ket: "Baik",
  },
];

const reports = [
  {
    title: "Monthly Report",
    period: "June 2026",
    teacher: "Ms. Sarah",
    status: "Published",
  },
  {
    title: "Weekly Report",
    period: "Week 24 — Jun 2026",
    teacher: "Ms. Sarah",
    status: "Draft",
  },
];

export default function StudentLaporanPage() {
  return (
    <StudentLayout activeMenu={"Laporan Saya" as any}>
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">Laporan Saya</h1>
        <p className="mt-1 text-sm text-[#6B4A3A]">
          Rekap nilai & report periodik.
        </p>
      </div>

      <div className="mt-7 overflow-hidden rounded-2xl border border-[#E8D6C1] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-[#FFF8EF] text-sm text-[#6B4A3A]">
              <tr>
                <th className="px-5 py-4">Mapel</th>
                <th className="px-5 py-4">UH</th>
                <th className="px-5 py-4">Tugas</th>
                <th className="px-5 py-4">UTS</th>
                <th className="px-5 py-4">UAS</th>
                <th className="px-5 py-4">Proses</th>
                <th className="px-5 py-4">Total</th>
                <th className="px-5 py-4">Ket.</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E8D6C1]">
              {scores.map((item) => (
                <tr key={item.mapel} className="hover:bg-[#FFF8EF]">
                  <td className="px-5 py-4 font-semibold">{item.mapel}</td>
                  <td className="px-5 py-4">{item.uh}</td>
                  <td className="px-5 py-4">{item.tugas}</td>
                  <td className="px-5 py-4">{item.uts}</td>
                  <td className="px-5 py-4">{item.uas}</td>
                  <td className="px-5 py-4">{item.proses}</td>
                  <td className="px-5 py-4 font-bold text-[#7A1F2B]">
                    {item.total}
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                      {item.ket}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {reports.map((report) => (
          <div
            key={report.title}
            className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F1DFD5] text-2xl text-[#7A1F2B]">
                  📄
                </div>

                <div>
                  <h2 className="text-lg font-bold">{report.title}</h2>
                  <p className="text-sm text-[#6B4A3A]">{report.period}</p>
                </div>
              </div>

              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                {report.status}
              </span>
            </div>

            <p className="mt-6 text-sm text-[#6B4A3A]">
              Guru: {report.teacher}
            </p>

            <button
              type="button"
              className="mt-5 rounded-xl border border-[#E8D6C1] px-5 py-2 text-sm font-bold"
            >
              ⇩ PDF
            </button>
          </div>
        ))}
      </div>
    </StudentLayout>
  );
}