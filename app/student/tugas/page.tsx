"use client";

import StudentLayout from "../components/StudentLayout";

const tasks = [
  {
    title: "Latihan Pecahan LKS Hal 42",
    subject: "Matematika",
    deadline: "14 Jun 2026",
    status: "Selesai",
    score: "90",
    color: "bg-emerald-100 text-emerald-700",
  },
  {
    title: "Deskripsi Tokoh Idola",
    subject: "English",
    deadline: "16 Jun 2026",
    status: "Dikerjakan",
    score: "-",
    color: "bg-yellow-100 text-yellow-700",
  },
  {
    title: "Diagram Siklus Air",
    subject: "Science",
    deadline: "18 Jun 2026",
    status: "Belum",
    score: "-",
    color: "bg-[#F1DFD5] text-[#6B4A3A]",
  },
  {
    title: "Cerita Pendek",
    subject: "Reading",
    deadline: "20 Jun 2026",
    status: "Belum",
    score: "-",
    color: "bg-[#F1DFD5] text-[#6B4A3A]",
  },
];

export default function StudentTugasPage() {
  return (
    <StudentLayout activeMenu="Tugas & Hasil">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">
          Tugas & Hasil
        </h1>
        <p className="mt-1 text-sm text-[#6B4A3A]">
          Tugas yang perlu kamu kerjakan dan hasilnya.
        </p>
      </div>

      <div className="mt-7 overflow-hidden rounded-2xl border border-[#E8D6C1] bg-white shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-[#FFF8EF] text-sm text-[#6B4A3A]">
            <tr>
              <th className="px-5 py-4">Judul Tugas</th>
              <th className="px-5 py-4">Mata Pelajaran</th>
              <th className="px-5 py-4">Deadline</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Nilai</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#E8D6C1]">
            {tasks.map((task) => (
              <tr key={task.title} className="hover:bg-[#FFF8EF]">
                <td className="px-5 py-4 font-medium">{task.title}</td>
                <td className="px-5 py-4">{task.subject}</td>
                <td className="px-5 py-4">{task.deadline}</td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${task.color}`}
                  >
                    {task.status}
                  </span>
                </td>
                <td className="px-5 py-4">{task.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </StudentLayout>
  );
}