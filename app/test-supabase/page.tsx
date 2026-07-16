"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Student = {
  id: string;
  nis: string | null;
  nisn: string | null;
  full_name: string;
  level: string | null;
  grade: string | null;
  academic_year: string | null;
};

export default function TestSupabasePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function fetchStudents() {
      const { data, error } = await supabase
        .from("students")
        .select("id, nis, nisn, full_name, level, grade, academic_year");

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      setStudents(data || []);
      setLoading(false);
    }

    fetchStudents();
  }, []);

  return (
    <main className="min-h-screen bg-[#FAF3EA] p-10 text-[#2B1B18]">
      <div className="mx-auto max-w-4xl rounded-2xl border border-[#E8D6C1] bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold">Test Supabase Connection</h1>
        <p className="mt-2 text-sm text-[#6B4A3A]">
          Halaman ini untuk cek apakah Next.js sudah berhasil ambil data dari
          Supabase.
        </p>

        {loading && (
          <p className="mt-6 rounded-xl bg-[#FFF8EF] p-4 text-sm">
            Loading data dari Supabase...
          </p>
        )}

        {errorMessage && (
          <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            <p className="font-bold">Error:</p>
            <p>{errorMessage}</p>
          </div>
        )}

        {!loading && !errorMessage && (
          <div className="mt-6">
            <p className="mb-4 text-sm font-bold">
              Total data students: {students.length}
            </p>

            <div className="overflow-hidden rounded-xl border border-[#E8D6C1]">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#FFF8EF] text-[#6B4A3A]">
                  <tr>
                    <th className="px-4 py-3">NIS</th>
                    <th className="px-4 py-3">NISN</th>
                    <th className="px-4 py-3">Nama</th>
                    <th className="px-4 py-3">Level</th>
                    <th className="px-4 py-3">Grade</th>
                    <th className="px-4 py-3">Tahun Ajaran</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#E8D6C1]">
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td className="px-4 py-3">{student.nis}</td>
                      <td className="px-4 py-3">{student.nisn}</td>
                      <td className="px-4 py-3 font-bold">
                        {student.full_name}
                      </td>
                      <td className="px-4 py-3">{student.level}</td>
                      <td className="px-4 py-3">{student.grade}</td>
                      <td className="px-4 py-3">
                        {student.academic_year}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}