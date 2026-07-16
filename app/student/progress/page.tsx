"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import StudentLayout from "../components/StudentLayout";

const scores = [
  { subject: "Math", score: 88 },
  { subject: "English", score: 92 },
  { subject: "Science", score: 85 },
  { subject: "Reading", score: 90 },
  { subject: "Art", score: 95 },
  { subject: "Character", score: 89 },
];

const skillData = [
  { skill: "Critical Thinking", value: 82 },
  { skill: "Creativity", value: 92 },
  { skill: "Communication", value: 78 },
  { skill: "Collaboration", value: 88 },
  { skill: "Discipline", value: 84 },
  { skill: "Curiosity", value: 90 },
];

const attendanceTrend = [
  { month: "Jan", attendance: 94 },
  { month: "Feb", attendance: 96 },
  { month: "Mar", attendance: 92 },
  { month: "Apr", attendance: 95 },
  { month: "May", attendance: 97 },
  { month: "Jun", attendance: 96 },
];

export default function StudentProgressPage() {
  return (
    <StudentLayout activeMenu="Progress Saya">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">Progress Saya</h1>
        <p className="mt-1 text-sm text-[#6B4A3A]">
          Lihat perkembangan akademik & keterampilanmu.
        </p>
      </div>

      <div className="mt-7 grid grid-cols-2 gap-5">
        <div className="rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Nilai per Subject</h2>

          <div className="mt-7 space-y-5">
            {scores.map((item) => (
              <div key={item.subject}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-bold">{item.subject}</p>
                  <p className="text-sm text-[#6B4A3A]">{item.score}/100</p>
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
          <h2 className="text-lg font-bold">Skill Development</h2>

          <div className="mt-6 h-[330px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={skillData}>
                <PolarGrid stroke="#E8D6C1" />
                <PolarAngleAxis
                  dataKey="skill"
                  tick={{ fontSize: 11, fill: "#6B4A3A" }}
                />
                <Radar
                  dataKey="value"
                  stroke="#7A1F2B"
                  fill="#7A1F2B"
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-[#E8D6C1] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold">Attendance Trend</h2>

        <div className="mt-7 h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={attendanceTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[80, 100]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="attendance"
                stroke="#D96B2B"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </StudentLayout>
  );
}