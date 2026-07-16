"use client";

import StudentLayout from "../components/StudentLayout";

const weeklySchedule = [
  {
    day: "Senin",
    today: true,
    lessons: [
      { time: "08:00", subject: "Math", teacher: "Ms. Sarah" },
      { time: "10:00", subject: "English", teacher: "Mr. Andi" },
    ],
  },
  {
    day: "Selasa",
    today: false,
    lessons: [
      { time: "08:00", subject: "Science", teacher: "Ms. Sarah" },
      { time: "10:00", subject: "Art", teacher: "Ms. Clara" },
    ],
  },
  {
    day: "Rabu",
    today: false,
    lessons: [
      { time: "08:00", subject: "Reading", teacher: "Mr. Andi" },
      { time: "10:00", subject: "Character", teacher: "Ms. Clara" },
    ],
  },
  {
    day: "Kamis",
    today: false,
    lessons: [
      { time: "08:00", subject: "Math", teacher: "Ms. Sarah" },
      { time: "10:00", subject: "Science", teacher: "Ms. Sarah" },
    ],
  },
  {
    day: "Jumat",
    today: false,
    lessons: [
      { time: "08:00", subject: "English", teacher: "Mr. Andi" },
      { time: "10:00", subject: "Art", teacher: "Ms. Clara" },
    ],
  },
];

export default function StudentSchedulePage() {
  return (
    <StudentLayout activeMenu="Jadwal Belajar">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">
          Jadwal Mingguan
        </h1>
        <p className="mt-1 text-sm text-[#6B4A3A]">
          Senin – Jumat • Semester Genap 2025/2026
        </p>
      </div>

      <div className="mt-7 grid grid-cols-5 gap-5">
        {weeklySchedule.map((day) => (
          <div
            key={day.day}
            className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold">{day.day}</h2>

              {day.today && (
                <span className="rounded-full bg-[#FDE7D7] px-3 py-1 text-xs font-bold text-white">
                  HARI INI
                </span>
              )}
            </div>

            <div className="space-y-3">
              {day.lessons.map((lesson) => (
                <div
                  key={`${day.day}-${lesson.time}`}
                  className="rounded-xl border border-[#E8D6C1] bg-[#FFF8EF] p-4"
                >
                  <p className="text-sm font-bold text-[#7A1F2B]">
                    ◷ {lesson.time}
                  </p>
                  <p className="mt-2 font-bold">{lesson.subject}</p>
                  <p className="text-sm text-[#6B4A3A]">{lesson.teacher}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </StudentLayout>
  );
}