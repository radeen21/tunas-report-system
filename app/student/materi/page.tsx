"use client";

import StudentLayout from "../components/StudentLayout";

const materials = [
  {
    title: "Pecahan Senilai — Bab 5",
    subject: "Matematika",
    date: "09 Jun 2026",
    type: "Video + PDF",
  },
  {
    title: "Descriptive Text — Unit 8",
    subject: "English",
    date: "09 Jun 2026",
    type: "Slide + Worksheet",
  },
  {
    title: "Siklus Air — Bab 6",
    subject: "Science",
    date: "10 Jun 2026",
    type: "Video Praktikum",
  },
  {
    title: "Cerita Rakyat Nusantara",
    subject: "Reading",
    date: "11 Jun 2026",
    type: "E-Book",
  },
];

export default function StudentMateriPage() {
  return (
    <StudentLayout activeMenu="Materi">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">
          Materi Pembelajaran
        </h1>
        <p className="mt-1 text-sm text-[#6B4A3A]">
          Materi & sumber belajar terbaru untukmu.
        </p>
      </div>

      <div className="mt-7 grid grid-cols-3 gap-5">
        {materials.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F1DFD5] text-2xl text-[#7A1F2B]">
              📖
            </div>

            <h2 className="mt-6 text-lg font-bold">{item.title}</h2>

            <div className="mt-3 flex items-center gap-3">
              <span className="rounded-full bg-[#FDE7D7] px-3 py-1 text-xs font-bold text-[#D96B2B]">
                {item.subject}
              </span>

              <p className="text-sm text-[#6B4A3A]">{item.date}</p>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <p className="text-sm text-[#6B4A3A]">{item.type}</p>

              <div className="flex gap-2">
                <button className="rounded-xl border border-[#E8D6C1] px-4 py-2 text-sm font-bold">
                  ⇩ PDF
                </button>

                <button className="rounded-xl bg-[#7A1F2B] px-4 py-2 text-sm font-bold text-white">
                  ▶ Buka
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </StudentLayout>
  );
}