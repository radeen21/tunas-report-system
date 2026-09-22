"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type StudentAccountResult = {
  student_id: string;
  name: string;
  nis: string | null;
  email?: string;
  user_id?: string | null;
  password?: string | null;
  status:
    | "created"
    | "already_exists"
    | "not_created"
    | "skipped"
    | "error";
  message?: string;
};

type Summary = {
  total: number;
  created: number;
  already_exists: number;
  not_created: number;
  skipped: number;
  errors: number;
};

/*
 * =========================================================
 * NORMALIZE NIS
 * =========================================================
 */

function normalizeNis(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/*
 * =========================================================
 * INTERNAL EMAIL
 * =========================================================
 */

function getInternalEmail(nis: string) {
  const normalizedNis = normalizeNis(nis);

  if (!normalizedNis) {
    return "";
  }

  return `student-${normalizedNis}@students.hstkb.id`;
}

/*
 * =========================================================
 * PAGE
 * =========================================================
 */

export default function StudentAccountPage() {
  /*
   * =======================================================
   * STATE
   * =======================================================
   */

  const [loading, setLoading] =
    useState(true);

  const [generating, setGenerating] =
    useState(false);

  const [resetting, setResetting] =
    useState(false);

  const [results, setResults] =
    useState<StudentAccountResult[]>([]);

  const [summary, setSummary] =
    useState<Summary | null>(null);

  const [error, setError] =
    useState("");

  /*
   * =======================================================
   * LOAD DATA SISWA
   * =======================================================
   *
   * Dibaca langsung dari database.
   *
   * students.user_id ada
   *      -> akun sudah ada
   *
   * students.user_id kosong
   *      -> belum ada akun
   */

  const loadStudentAccounts = async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data,
        error: studentsError,
      } = await supabase
        .from("students")
        .select(
          "id, full_name, nis, user_id"
        )
        .order("full_name", {
          ascending: true,
        });

      if (studentsError) {
        throw new Error(
          studentsError.message
        );
      }

      const students =
        data || [];

      const mappedResults: StudentAccountResult[] =
        students.map((student) => {
          const name =
            student.full_name?.trim() ||
            "Tanpa Nama";

          const nis =
            student.nis
              ?.toString()
              .trim() || "";

          const hasAccount =
            !!student.user_id;

          return {
            student_id:
              String(student.id),

            name,

            nis:
              nis || null,

            email:
              nis
                ? getInternalEmail(nis)
                : undefined,

            user_id:
              student.user_id || null,

            password:
              null,

            status:
              hasAccount
                ? "already_exists"
                : "not_created",

            message:
              hasAccount
                ? "Akun siswa sudah tersedia."
                : "Siswa belum memiliki akun.",
          };
        });

      /*
       * =====================================================
       * SUMMARY
       * =====================================================
       */

      const total =
        mappedResults.length;

      const alreadyExists =
        mappedResults.filter(
          (item) =>
            item.status ===
            "already_exists"
        ).length;

      const notCreated =
        mappedResults.filter(
          (item) =>
            item.status ===
            "not_created"
        ).length;

      setSummary({
        total,

        created: 0,

        already_exists:
          alreadyExists,

        not_created:
          notCreated,

        skipped: 0,

        errors: 0,
      });

      setResults(
        mappedResults
      );
    } catch (err) {
      console.error(
        "Load student accounts error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengambil data akun siswa."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * =======================================================
   * LOAD SAAT HALAMAN DIBUKA
   * =======================================================
   */

  useEffect(() => {
    loadStudentAccounts();
  }, []);

  /*
   * =======================================================
   * GENERATE SEMUA AKUN SISWA
   * =======================================================
   */

  const generateAccounts =
    async () => {
      const confirmed =
        window.confirm(
          "Apakah Anda yakin ingin membuat akun untuk seluruh siswa yang belum memiliki akun?"
        );

      if (!confirmed) {
        return;
      }

      setGenerating(true);
      setError("");

      try {
        /*
         * Ambil session admin
         */

        const {
          data: sessionData,
          error: sessionError,
        } =
          await supabase.auth.getSession();

        if (sessionError) {
          throw new Error(
            sessionError.message
          );
        }

        const accessToken =
          sessionData.session
            ?.access_token;

        if (!accessToken) {
          throw new Error(
            "Session login tidak ditemukan. Silakan login kembali."
          );
        }

        /*
         * Panggil API
         */

        const response =
          await fetch(
            "/api/admin/student-accounts",
            {
              method: "POST",

              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type":
                  "application/json",
              },
            }
          );

        /*
         * Cek content type
         */

        const contentType =
          response.headers.get(
            "content-type"
          ) || "";

        let data: any;

        if (
          contentType.includes(
            "application/json"
          )
        ) {
          data =
            await response.json();
        } else {
          const text =
            await response.text();

          throw new Error(
            `Server tidak mengembalikan JSON. HTTP ${response.status}. ${text.substring(
              0,
              300
            )}`
          );
        }

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Gagal membuat akun siswa."
          );
        }

        /*
         * Hasil generate.
         *
         * Password baru masih tersedia
         * sehingga bisa didownload CSV.
         */

        setResults(
          data.results || []
        );

        setSummary({
          total:
            data.summary?.total ??
            0,

          created:
            data.summary?.created ??
            0,

          already_exists:
            data.summary
              ?.already_exists ??
            0,

          not_created: 0,

          skipped:
            data.summary?.skipped ??
            0,

          errors:
            data.summary?.errors ??
            0,
        });
      } catch (err) {
        console.error(
          "Generate account error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat membuat akun."
        );
      } finally {
        setGenerating(false);
      }
    };

  /*
   * =======================================================
   * RESET SEMUA PASSWORD
   * =======================================================
   *
   * PENTING:
   *
   * Ini TIDAK membuat akun baru.
   *
   * Ini hanya mengganti password untuk
   * akun siswa yang sudah ada.
   */

  const resetAllPasswords =
    async () => {
      const confirmed =
        window.confirm(
          "PERHATIAN!\n\nSemua password siswa yang sudah memiliki akun akan diganti dengan password baru.\n\nPastikan Anda akan langsung mendownload CSV setelah proses selesai.\n\nLanjutkan?"
        );

      if (!confirmed) {
        return;
      }

      setResetting(true);
      setError("");

      try {
        /*
         * Ambil session admin
         */

        const {
          data: sessionData,
          error: sessionError,
        } =
          await supabase.auth.getSession();

        if (sessionError) {
          throw new Error(
            sessionError.message
          );
        }

        const accessToken =
          sessionData.session
            ?.access_token;

        if (!accessToken) {
          throw new Error(
            "Session login tidak ditemukan. Silakan login kembali."
          );
        }

        /*
         * Panggil API reset password
         */

        const response =
          await fetch(
            "/api/admin/student-accounts/reset-password",
            {
              method: "POST",

              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type":
                  "application/json",
              },
            }
          );

        /*
         * Cek response
         */

        const contentType =
          response.headers.get(
            "content-type"
          ) || "";

        let data: any;

        if (
          contentType.includes(
            "application/json"
          )
        ) {
          data =
            await response.json();
        } else {
          const text =
            await response.text();

          throw new Error(
            `Server tidak mengembalikan JSON. HTTP ${response.status}. ${text.substring(
              0,
              300
            )}`
          );
        }

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Gagal melakukan reset password."
          );
        }

        /*
         * Ubah hasil reset ke format tabel
         */

        const resetResults: StudentAccountResult[] =
          (
            data.results || []
          ).map(
            (item: any) => ({
              student_id:
                String(
                  item.student_id
                ),

              name:
                item.name ||
                "Tanpa Nama",

              nis:
                item.nis || null,

              email:
                item.email ||
                undefined,

              user_id:
                item.user_id ||
                null,

              password:
                item.password ||
                null,

              status:
                item.status ===
                "success"
                  ? "created"
                  : "error",

              message:
                item.message ||
                (item.status ===
                "success"
                  ? "Password berhasil direset."
                  : "Gagal reset password."),
            })
          );

        setResults(
          resetResults
        );

        setSummary({
          total:
            data.summary?.total ??
            resetResults.length,

          created:
            data.summary?.success ??
            resetResults.filter(
              (item) =>
                item.status ===
                "created"
            ).length,

          already_exists: 0,

          not_created: 0,

          skipped: 0,

          errors:
            data.summary?.errors ??
            resetResults.filter(
              (item) =>
                item.status ===
                "error"
            ).length,
        });

        /*
         * Password baru sekarang berada
         * di state dan siap didownload.
         */

        alert(
          `Reset password selesai.\n\nBerhasil: ${
            data.summary?.success ??
            0
          }\nError: ${
            data.summary?.errors ??
            0
          }\n\nSilakan segera klik "Download Password CSV".`
        );
      } catch (err) {
        console.error(
          "Reset password error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat reset password."
        );
      } finally {
        setResetting(false);
      }
    };

  /*
   * =======================================================
   * DOWNLOAD PASSWORD CSV
   * =======================================================
   */

  const downloadCSV = () => {
    const accountsWithPassword =
      results.filter(
        (item) =>
          !!item.password
      );

    if (
      accountsWithPassword.length ===
      0
    ) {
      alert(
        "Tidak ada password yang tersedia untuk didownload."
      );

      return;
    }

    const header = [
      "No",
      "Nama",
      "NIS",
      "Email Internal",
      "Password",
      "Status",
    ];

    const rows =
      accountsWithPassword.map(
        (item, index) => [
          index + 1,

          item.name,

          item.nis || "",

          item.email || "",

          item.password || "",

          item.status ===
          "created"
            ? "Berhasil"
            : "Error",
        ]
      );

    const csvContent = [
      header,
      ...rows,
    ]
      .map((row) =>
        row
          .map((value) => {
            const text =
              String(
                value ?? ""
              );

            return `"${text.replace(
              /"/g,
              '""'
            )}"`;
          })
          .join(",")
      )
      .join("\n");

    /*
     * Tambahkan BOM supaya Excel
     * membaca UTF-8 dengan benar.
     */

    const blob =
      new Blob(
        [
          "\uFEFF" +
            csvContent,
        ],
        {
          type: "text/csv;charset=utf-8;",
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    link.href = url;

    /*
     * Nama file berbeda berdasarkan
     * apakah hasilnya generate atau reset.
     */

    link.download =
      "akun-siswa-password.csv";

    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );

    URL.revokeObjectURL(
      url
    );
  };

  /*
   * =======================================================
   * STATUS LABEL
   * =======================================================
   */

  const getStatusLabel = (
    status: StudentAccountResult["status"]
  ) => {
    switch (status) {
      case "created":
        return "Berhasil dibuat";

      case "already_exists":
        return "Sudah ada";

      case "not_created":
        return "Belum dibuat";

      case "skipped":
        return "Dilewati";

      case "error":
        return "Error";

      default:
        return status;
    }
  };

  /*
   * =======================================================
   * STATUS STYLE
   * =======================================================
   */

  const getStatusClass = (
    status: StudentAccountResult["status"]
  ) => {
    switch (status) {
      case "created":
        return "bg-green-100 text-green-700";

      case "already_exists":
        return "bg-blue-100 text-blue-700";

      case "not_created":
        return "bg-yellow-100 text-yellow-700";

      case "skipped":
        return "bg-orange-100 text-orange-700";

      case "error":
        return "bg-red-100 text-red-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  /*
   * =======================================================
   * RENDER
   * =======================================================
   */

  return (
    <div className="min-h-screen bg-[#fbf5ed] p-6">
      <div className="mx-auto max-w-7xl">

        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>
            <h1 className="text-3xl font-bold text-[#35170f]">
              Akun Siswa
            </h1>

            <p className="mt-1 text-[#76564a]">
              Kelola akun login siswa
              Homeschooling HSTKB
            </p>
          </div>

          <div className="flex flex-wrap gap-3">

            {/* ================================================= */}
            {/* DOWNLOAD CSV */}
            {/* ================================================= */}

            <button
              type="button"
              onClick={
                downloadCSV
              }
              disabled={
                generating ||
                resetting ||
                !results.some(
                  (item) =>
                    !!item.password
                )
              }
              className="rounded-xl border border-[#8d001d] bg-white px-5 py-3 font-semibold text-[#8d001d] shadow-sm transition hover:bg-[#fff5f6] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Download Password CSV
            </button>

            {/* ================================================= */}
            {/* RESET PASSWORD */}
            {/* ================================================= */}

            <button
              type="button"
              onClick={
                resetAllPasswords
              }
              disabled={
                generating ||
                resetting ||
                loading
              }
              className="rounded-xl border border-orange-500 bg-white px-5 py-3 font-semibold text-orange-600 shadow-sm transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {resetting
                ? "Resetting..."
                : "Reset Semua Password"}
            </button>

            {/* ================================================= */}
            {/* GENERATE ACCOUNT */}
            {/* ================================================= */}

            <button
              type="button"
              onClick={
                generateAccounts
              }
              disabled={
                generating ||
                resetting ||
                loading
              }
              className="rounded-xl bg-[#a90025] px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-[#8f001f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {generating
                ? "Sedang Membuat Akun..."
                : "Buat Semua Akun Siswa"}
            </button>

          </div>
        </div>

        {/* ================================================= */}
        {/* INFORMASI */}
        {/* ================================================= */}

        <div className="mb-6 rounded-2xl border border-[#ead9ca] bg-white p-5 shadow-sm">

          <h2 className="font-bold text-[#35170f]">
            Informasi
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#76564a]">
            Sistem akan mengambil seluruh
            data siswa dari database dan
            membuat akun login untuk siswa
            yang belum memiliki akun.
          </p>

          <p className="mt-2 text-sm leading-6 text-[#76564a]">
            Siswa akan login menggunakan{" "}
            <strong>NIS</strong> dan
            password.
          </p>

          <p className="mt-2 text-sm leading-6 text-[#76564a]">
            Password awal hanya ditampilkan
            ketika akun baru dibuat atau
            password direset.
          </p>

          <p className="mt-2 text-sm leading-6 text-[#76564a]">
            <strong>Reset Semua Password</strong>{" "}
            tidak membuat akun baru. Tombol
            tersebut hanya mengganti password
            akun siswa yang sudah ada.
          </p>

        </div>

        {/* ================================================= */}
        {/* ERROR */}
        {/* ================================================= */}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">

            <p className="font-bold">
              Terjadi kesalahan
            </p>

            <p className="mt-1 whitespace-pre-wrap text-sm">
              {error}
            </p>

          </div>
        )}

        {/* ================================================= */}
        {/* SUMMARY */}
        {/* ================================================= */}

        {summary && (
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">

            <SummaryCard
              label="Total"
              value={
                summary.total
              }
            />

            <SummaryCard
              label="Dibuat"
              value={
                summary.created
              }
              color="green"
            />

            <SummaryCard
              label="Sudah Ada"
              value={
                summary.already_exists
              }
              color="blue"
            />

            <SummaryCard
              label="Belum Dibuat"
              value={
                summary.not_created
              }
              color="yellow"
            />

            <SummaryCard
              label="Error"
              value={
                summary.errors
              }
              color="red"
            />

          </div>
        )}

        {/* ================================================= */}
        {/* DAFTAR AKUN */}
        {/* ================================================= */}

        <div className="overflow-hidden rounded-2xl border border-[#ead9ca] bg-white shadow-sm">

          <div className="border-b border-[#ead9ca] px-5 py-4">

            <h2 className="font-bold text-[#35170f]">
              Daftar Akun Siswa
            </h2>

            <p className="mt-1 text-sm text-[#76564a]">
              Status akun dibaca langsung
              dari database siswa.
            </p>

          </div>

          {/* ================================================= */}
          {/* LOADING */}
          {/* ================================================= */}

          {loading ? (
            <div className="px-6 py-16 text-center">

              <div className="text-lg font-semibold text-[#35170f]">
                Memuat data akun siswa...
              </div>

              <p className="mt-2 text-sm text-[#76564a]">
                Sedang mengambil data dari
                database.
              </p>

            </div>
          ) : results.length === 0 ? (
            <div className="px-6 py-16 text-center">

              <h3 className="font-bold text-[#35170f]">
                Belum ada data siswa
              </h3>

              <p className="mt-2 text-sm text-[#76564a]">
                Belum ditemukan data siswa
                pada database.
              </p>

            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[1100px]">

                <thead>
                  <tr className="border-b border-[#ead9ca] bg-[#fffaf5] text-left text-sm text-[#76564a]">

                    <th className="px-5 py-4">
                      #
                    </th>

                    <th className="px-5 py-4">
                      Nama Siswa
                    </th>

                    <th className="px-5 py-4">
                      NIS
                    </th>

                    <th className="px-5 py-4">
                      Email Internal
                    </th>

                    <th className="px-5 py-4">
                      Password
                    </th>

                    <th className="px-5 py-4">
                      Status
                    </th>

                    <th className="px-5 py-4">
                      Keterangan
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {results.map(
                    (
                      student,
                      index
                    ) => (
                      <tr
                        key={
                          student.student_id
                        }
                        className="border-b border-[#f0e4da] last:border-0"
                      >

                        <td className="px-5 py-4 text-sm text-[#76564a]">
                          {index + 1}
                        </td>

                        <td className="px-5 py-4">

                          <div className="font-semibold text-[#35170f]">
                            {student.name}
                          </div>

                        </td>

                        <td className="px-5 py-4 text-sm text-[#76564a]">
                          {student.nis ||
                            "-"}
                        </td>

                        <td className="px-5 py-4 text-sm text-[#76564a]">
                          {student.email ||
                            "-"}
                        </td>

                        <td className="px-5 py-4">

                          {student.password ? (
                            <code className="rounded-lg bg-[#fff4e8] px-3 py-2 text-sm font-semibold text-[#8d001d]">
                              {
                                student.password
                              }
                            </code>
                          ) : (
                            <span className="text-sm text-gray-400">
                              Password tidak
                              ditampilkan
                            </span>
                          )}

                        </td>

                        <td className="px-5 py-4">

                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                              student.status
                            )}`}
                          >
                            {getStatusLabel(
                              student.status
                            )}
                          </span>

                        </td>

                        <td className="px-5 py-4 text-sm text-[#76564a]">
                          {student.message ||
                            "-"}
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}

/*
 * =========================================================
 * SUMMARY CARD
 * =========================================================
 */

function SummaryCard({
  label,
  value,
  color = "default",
}: {
  label: string;
  value: number;
  color?:
    | "default"
    | "green"
    | "blue"
    | "yellow"
    | "red";
}) {
  const styles = {
    default:
      "bg-white border-[#ead9ca] text-[#35170f]",

    green:
      "bg-green-50 border-green-200 text-green-700",

    blue:
      "bg-blue-50 border-blue-200 text-blue-700",

    yellow:
      "bg-yellow-50 border-yellow-200 text-yellow-700",

    red:
      "bg-red-50 border-red-200 text-red-700",
  };

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${styles[color]}`}
    >

      <div className="text-sm font-medium">
        {label}
      </div>

      <div className="mt-2 text-3xl font-bold">
        {value}
      </div>

    </div>
  );
}