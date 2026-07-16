"use client";

import StudentLayout from "../components/StudentLayout";

const activities = [
  {
    title: "Eksperimen sederhana siklus air",
    subject: "Science",
    date: "10 Jun 2026",
  },
  {
    title: "Belajar geometri dengan blok",
    subject: "Math",
    date: "11 Jun 2026",
  },
  {
    title: "Roleplay percakapan",
    subject: "English",
    date: "07 Jun 2026",
  },
];

export default function StudentGalleryPage() {
  return (
    <StudentLayout activeMenu="Gallery">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">
            Galeri Kegiatan Saya
          </h1>
          <p className="mt-1 text-sm text-[#6B4A3A]">
            Momen pembelajaranmu sepanjang bulan Juni.
          </p>
        </div>

        <span className="rounded-full bg-[#FDE7D7] px-4 py-2 text-sm font-bold text-[#7A1F2B]">
          3 foto
        </span>
      </div>

      <div className="mt-7 grid grid-cols-3 gap-5">
        {activities.map((activity) => (
          <div
            key={activity.title}
            className="overflow-hidden rounded-2xl border border-[#E8D6C1] bg-white shadow-sm"
          >
            <div className="flex h-[310px] items-center justify-center bg-[#FDE7D7] text-6xl">
              🖼️
            </div>

            <div className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full bg-[#F1DFD5] px-3 py-1 text-xs font-bold text-[#7A1F2B]">
                  {activity.subject}
                </span>

                <p className="text-sm text-[#6B4A3A]">{activity.date}</p>
              </div>

              <h2 className="font-bold">{activity.title}</h2>
            </div>
          </div>
        ))}
      </div>
    </StudentLayout>
  );
}