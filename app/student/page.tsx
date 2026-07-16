"use client";

import StudentLayout from "./components/StudentLayout";

const subjects = [
  { name: "Math", score: 88, change: 6 },
  { name: "English", score: 92, change: 4 },
  { name: "Science", score: 85, change: 5 },
  { name: "Reading", score: 90, change: 6 },
  { name: "Art", score: 95, change: 5 },
  { name: "Character", score: 89, change: 4 },
];

const todaySchedule = [
  {
    time: "08:00",
    subject: "Math",
    teacher: "Ms. Sarah",
  },
  {
    time: "10:00",
    subject: "English",
    teacher: "Mr. Andi",
  },
];

export default function StudentDashboardPage() {
  return (
    <StudentLayout activeMenu="Dashboard Saya">
      <div className="rounded-2xl bg-gradient-to-r from-[#7A1F2B] to-[#06254a] p-8 text-white shadow-sm">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
              JW
            </div>

            <div>
              <p className="text-xs font-bold tracking-[0.2em] text-white/60">
                HALO, SEMANGAT BELAJAR!
              </p>
              <h1 className="mt-2 text-[30px] font-bold tracking-tight">
                Jonathan Wijaya
              </h1>
              <p className="mt-1 text-sm text-white/75">
                Primary Level — Grade 4
              </p>
            </div>
          </div>

          <div className="grid flex-1 grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-[#D96B2B]">⌁</p>
              <p className="mt-2 text-2xl font-bold">88%</p>
              <p className="text-xs text-white/60">Progress</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-[#D96B2B]">📅</p>
              <p className="mt-2 text-2xl font-bold">96%</p>
              <p className="text-xs text-white/60">Attendance</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-[#D96B2B]">🏆</p>
              <p className="mt-2 text-2xl font-bold">3</p>
              <p className="text-xs text-white/60">Badges</p>
            </div>
          </div>

          <a
            href="/student/progress"
            className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#7A1F2B]"
          >
            Lihat Progress →
          </a>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-[2fr_1fr] gap-5">
        <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
          <div className="mb-7">
            <h2 className="text-lg font-bold">Nilai Subject Terbaru</h2>
            <p className="text-sm text-[#6B4A3A]">Juni 2026</p>
          </div>

          <div className="space-y-5">
            {subjects.map((item) => (
              <div key={item.name}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-bold">{item.name}</p>
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-[#6B4A3A]">{item.score}/100</p>
                    <p className="text-xs font-bold text-emerald-600">
                      ▲ {item.change}
                    </p>
                  </div>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-[#E8D6C1]">
                  <div
                    className="h-full rounded-full bg-[#7A1F2B]"
                    style={{ width: `${item.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-bold">Jadwal Hari Ini</h2>
            <a
              href="/student/schedule"
              className="text-sm font-bold text-[#7A1F2B]"
            >
              Lihat semua →
            </a>
          </div>

          <p className="mb-3 text-sm font-bold text-[#6B4A3A]">Senin</p>

          <div className="space-y-3">
            {todaySchedule.map((item) => (
              <div
                key={`${item.subject}-${item.time}`}
                className="flex items-center justify-between rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F1DFD5] text-[#7A1F2B]">
                    ◷
                  </div>

                  <div>
                    <p className="font-bold">{item.subject}</p>
                    <p className="text-sm text-[#6B4A3A]">{item.teacher}</p>
                  </div>
                </div>

                <p className="font-bold text-[#7A1F2B]">{item.time}</p>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <h3 className="mb-3 font-bold text-[#6B4A3A]">Achievement</h3>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-700">
                🏆 Top in Art
              </span>

              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                ☆ Perfect Attendance
              </span>

              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700">
                📖 Reader of the Week
              </span>
            </div>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}