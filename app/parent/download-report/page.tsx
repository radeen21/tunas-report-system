"use client";

import ParentLayout from "../components/ParentLayout";

const reports = [
  {
    title: "Monthly Report — June 2026",
    type: "Laporan Akademik",
    teacher: "Ms. Sarah",
    date: "12 Jun 2026",
    status: "Published",
  },
  {
    title: "Laporan KBM — Week 24",
    type: "Laporan KBM",
    teacher: "Ms. Sarah",
    date: "14 Jun 2026",
    status: "Published",
  },
  {
    title: "Semester Report — Semester Genap",
    type: "Rapot Semester",
    teacher: "Mrs. Linda",
    date: "30 Jun 2026",
    status: "Ready",
  },
];

export default function ParentDownloadReportPage() {
  return (
    <ParentLayout activeMenu="Download Report">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight">
          Download Report
        </h1>
        <p className="mt-1 text-sm text-[#6B4A3A]">
          Download laporan akademik, laporan KBM, dan rapor Jonathan Wijaya.
        </p>
      </div>

      <div className="mt-7 grid grid-cols-3 gap-5">
        {reports.map((report) => (
          <div
            key={report.title}
            className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FDE7D7] text-2xl">
              📄
            </div>

            <h2 className="mt-5 text-lg font-bold">{report.title}</h2>

            <p className="mt-2 text-sm text-[#6B4A3A]">{report.type}</p>

            <div className="mt-5 space-y-2 text-sm">
              <p>
                <span className="font-bold">Guru:</span> {report.teacher}
              </p>
              <p>
                <span className="font-bold">Tanggal:</span> {report.date}
              </p>
              <p>
                <span className="font-bold">Status:</span>{" "}
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                  {report.status}
                </span>
              </p>
            </div>

            <button className="mt-6 w-full rounded-xl bg-[#7A1F2B] py-3 text-sm font-bold text-white">
              ⬇ Download PDF
            </button>
          </div>
        ))}
      </div>
    </ParentLayout>
  );
}