"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  ShieldCheck,
  Sparkles,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type RoleKey =
  | "admin"
  | "kepala_sekolah"
  | "guru"
  | "murid_orang_tua";

type RoleOption = {
  key: RoleKey;
  title: string;
  description: string;
  emailPlaceholder: string;
  route: string;
};

type UserProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  phone?: string | null;
};

type StudentLoginData = {
  id: string;
  user_id: string | null;
  nis: string | null;
  full_name: string;
  status: string | null;
};

const roleOptions: RoleOption[] = [
  {
    key: "admin",
    title: "Admin",
    description: "Akses penuh dashboard sekolah",
    emailPlaceholder: "admin@hstkb.sch.id",
    route: "/kepalaSekolah",
  },
  {
    key: "kepala_sekolah",
    title: "Kepala Sekolah",
    description: "Approval, monitoring & analitik",
    emailPlaceholder: "mulyadihstkb2006@gmail.com",
    route: "/kepalaSekolah",
  },
  {
    key: "guru",
    title: "Guru",
    description: "Buat & kelola laporan murid",
    emailPlaceholder: "desi@hstkb.sch.id",
    route: "/teacher",
  },
  {
    key: "murid_orang_tua",
    title: "Murid / Orang Tua",
    description: "Lihat progress, jadwal & laporan",
    emailPlaceholder: "NIS / Nama Siswa",
    route: "/student",
  },
];

const routeByRole: Record<RoleKey, string> = {
  admin: "/kepalaSekolah",
  kepala_sekolah: "/kepalaSekolah",
  guru: "/teacher",
  murid_orang_tua: "/student",
};

function normalizeRole(role: string | null | undefined): RoleKey | null {
  if (!role) return null;

  const normalizedRole = role.trim().toLowerCase();

  if (normalizedRole === "admin") return "admin";
  if (normalizedRole === "super_admin") return "admin";

  if (normalizedRole === "kepala_sekolah") {
    return "kepala_sekolah";
  }

  if (normalizedRole === "kepala sekolah") {
    return "kepala_sekolah";
  }

  if (normalizedRole === "guru") return "guru";
  if (normalizedRole === "teacher") return "guru";

  if (normalizedRole === "murid_orang_tua") {
    return "murid_orang_tua";
  }

  if (normalizedRole === "murid") {
    return "murid_orang_tua";
  }

  if (normalizedRole === "siswa") {
    return "murid_orang_tua";
  }

  if (normalizedRole === "student") {
    return "murid_orang_tua";
  }

  if (normalizedRole === "orang_tua") {
    return "murid_orang_tua";
  }

  if (normalizedRole === "orang tua") {
    return "murid_orang_tua";
  }

  if (normalizedRole === "parent") {
    return "murid_orang_tua";
  }

  return null;
}

function getRoleTitle(roleKey: RoleKey) {
  return (
    roleOptions.find((role) => role.key === roleKey)?.title ||
    roleKey
  );
}

export default function LoginPage() {
  const router = useRouter();

  const [selectedRole, setSelectedRole] =
    useState<RoleKey>("kepala_sekolah");

  /*
   * Untuk Admin/Guru/Kepala Sekolah:
   * field ini berisi email.
   *
   * Untuk Murid:
   * field ini berisi NIS atau Nama Siswa.
   */
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [rememberMe, setRememberMe] =
    useState(true);

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const selectedRoleData = useMemo(() => {
    return (
      roleOptions.find(
        (role) => role.key === selectedRole
      ) || roleOptions[0]
    );
  }, [selectedRole]);

  /*
   * Apakah login yang dipilih adalah siswa?
   */
  const isStudentLogin =
    selectedRole === "murid_orang_tua";

  function handleSelectRole(role: RoleOption) {
    setSelectedRole(role.key);
    setEmail("");
    setPassword("");
    setErrorMessage("");
  }

  /**
   * Login siswa.
   *
   * User bisa memasukkan:
   *
   * 1. NIS
   * atau
   * 2. Nama siswa
   *
   * Kita cari di tabel students.
   *
   * Setelah ditemukan:
   *
   * students.user_id
   *        ↓
   * users_profile.id
   *        ↓
   * users_profile.email
   *        ↓
   * Supabase Auth
   */
  async function loginStudent(
    identifier: string,
    studentPassword: string
  ) {
    /*
     * --------------------------------------------------
     * STEP 1
     * Cari berdasarkan NIS terlebih dahulu
     * --------------------------------------------------
     */

    const { data: studentByNis, error: nisError } =
      await supabase
        .from("students")
        .select(
          `
            id,
            user_id,
            nis,
            full_name,
            status
          `
        )
        .eq("nis", identifier)
        .eq("status", "active")
        .maybeSingle();

    if (nisError) {
      console.error(
        "Student NIS lookup error:",
        nisError
      );

      throw new Error(
        "Gagal mencari data siswa."
      );
    }

    let student: StudentLoginData | null =
      studentByNis as StudentLoginData | null;

    /*
     * --------------------------------------------------
     * STEP 2
     * Kalau NIS tidak ditemukan,
     * cari berdasarkan nama siswa.
     * --------------------------------------------------
     */

    if (!student) {
      const { data: studentsByName, error: nameError } =
        await supabase
          .from("students")
          .select(
            `
              id,
              user_id,
              nis,
              full_name,
              status
            `
          )
          .ilike("full_name", identifier)
          .eq("status", "active");

      if (nameError) {
        console.error(
          "Student name lookup error:",
          nameError
        );

        throw new Error(
          "Gagal mencari data siswa."
        );
      }

      /*
       * Tidak ditemukan
       */
      if (
        !studentsByName ||
        studentsByName.length === 0
      ) {
        throw new Error(
          "NIS atau nama siswa tidak ditemukan."
        );
      }

      /*
       * Nama lebih dari satu.
       *
       * Jangan memilih secara random.
       */
      if (studentsByName.length > 1) {
        throw new Error(
          "Nama siswa ditemukan lebih dari satu. Silakan login menggunakan NIS."
        );
      }

      student =
        studentsByName[0] as StudentLoginData;
    }

    /*
     * --------------------------------------------------
     * STEP 3
     * Pastikan siswa sudah mempunyai user_id
     * --------------------------------------------------
     */

    if (!student.user_id) {
      throw new Error(
        "Akun login siswa belum dibuat. Silakan hubungi administrator."
      );
    }

    /*
     * --------------------------------------------------
     * STEP 4
     * Cari profile berdasarkan user_id
     *
     * Struktur yang kita gunakan:
     *
     * students.user_id
     *        =
     * users_profile.id
     * --------------------------------------------------
     */

    const {
      data: profileData,
      error: profileError,
    } = await supabase
      .from("users_profile")
      .select(
        `
          id,
          full_name,
          email,
          role,
          phone
        `
      )
      .eq("id", student.user_id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "Student profile error:",
        profileError
      );

      throw new Error(
        "Gagal mengambil profile siswa."
      );
    }

    const profile =
      profileData as UserProfile | null;

    /*
     * --------------------------------------------------
     * STEP 5
     * Pastikan profile ditemukan
     * --------------------------------------------------
     */

    if (!profile) {
      throw new Error(
        "Data profile siswa belum tersedia di users_profile."
      );
    }

    /*
     * --------------------------------------------------
     * STEP 6
     * Pastikan role = murid
     * --------------------------------------------------
     */

    const normalizedProfileRole =
      normalizeRole(profile.role);

    if (
      normalizedProfileRole !==
      "murid_orang_tua"
    ) {
      throw new Error(
        "Akun siswa belum memiliki role murid di users_profile."
      );
    }

    /*
     * --------------------------------------------------
     * STEP 7
     * Pastikan email Auth tersedia
     * --------------------------------------------------
     */

    const loginEmail =
      profile.email?.trim().toLowerCase();

    if (!loginEmail) {
      throw new Error(
        "Akun siswa belum memiliki email login di users_profile."
      );
    }

    /*
     * --------------------------------------------------
     * STEP 8
     * Login Supabase Auth
     *
     * Supabase Auth tetap menggunakan email,
     * tetapi siswa tidak perlu mengetahui email ini.
     * Mereka cukup memasukkan NIS/Nama.
     * --------------------------------------------------
     */

    const {
      data: authData,
      error: authError,
    } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: studentPassword,
    });

    if (authError) {
      console.error(
        "Student auth error:",
        authError.message
      );

      throw new Error(
        "NIS/Nama atau password salah."
      );
    }

    /*
     * --------------------------------------------------
     * STEP 9
     * Pastikan Auth user sesuai dengan students.user_id
     * --------------------------------------------------
     */

    const authUserId =
      authData.user?.id;

    if (!authUserId) {
      await supabase.auth.signOut();

      throw new Error(
        "Login berhasil tetapi user ID tidak ditemukan."
      );
    }

    if (authUserId !== student.user_id) {
      console.error(
        "User ID mismatch:",
        {
          authUserId,
          studentUserId: student.user_id,
        }
      );

      await supabase.auth.signOut();

      throw new Error(
        "Akun siswa tidak terhubung dengan data siswa yang benar."
      );
    }

    /*
     * --------------------------------------------------
     * STEP 10
     * Simpan informasi yang digunakan project
     * existing.
     * --------------------------------------------------
     */

    localStorage.setItem(
      "hstkb_user_id",
      profile.id
    );

    localStorage.setItem(
      "hstkb_full_name",
      profile.full_name ||
        student.full_name ||
        ""
    );

    localStorage.setItem(
      "hstkb_email",
      profile.email ||
        loginEmail
    );

    localStorage.setItem(
      "hstkb_role",
      normalizedProfileRole
    );

    localStorage.setItem(
      "hstkb_role_name",
      getRoleTitle(
        normalizedProfileRole
      )
    );

    localStorage.setItem(
      "hstkb_demo_email",
      profile.email ||
        loginEmail
    );

    localStorage.setItem(
      "hstkb_demo_role",
      normalizedProfileRole
    );

    /*
     * Simpan student ID juga.
     *
     * StudentLayout kamu sudah menggunakan
     * hstkb_active_student_id.
     */
    localStorage.setItem(
      "hstkb_active_student_id",
      student.id
    );

    localStorage.setItem(
      "hstkb_active_student_name",
      student.full_name
    );

    localStorage.setItem(
      "hstkb_active_student_nis",
      student.nis || ""
    );

    /*
     * Remember me tetap mengikuti
     * logic existing.
     */
    if (rememberMe) {
      localStorage.setItem(
        "hstkb_remember_me",
        "true"
      );
    } else {
      localStorage.removeItem(
        "hstkb_remember_me"
      );
    }

    /*
     * --------------------------------------------------
     * STEP 11
     * Masuk ke dashboard siswa.
     * --------------------------------------------------
     */

    router.push("/student");
    router.refresh();
  }

  /**
   * Login Admin / Kepala Sekolah / Guru
   *
   * Flow ini sengaja dipertahankan
   * seperti kode existing kamu.
   */
  async function loginStaff(
    normalizedEmail: string,
    userPassword: string
  ) {
    const {
      data: authData,
      error: authError,
    } =
      await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: userPassword,
      });

    if (authError) {
      throw new Error(
        "Email atau password salah. Pastikan akun sudah dibuat di Supabase Authentication."
      );
    }

    const loggedInEmail =
      authData.user?.email?.toLowerCase();

    if (!loggedInEmail) {
      await supabase.auth.signOut();

      throw new Error(
        "Login berhasil, tapi email user tidak ditemukan."
      );
    }

    const {
      data: profileData,
      error: profileError,
    } = await supabase
      .from("users_profile")
      .select(
        "id, full_name, email, role, phone"
      )
      .eq("email", loggedInEmail)
      .maybeSingle();

    const profile =
      profileData as UserProfile | null;

    if (profileError) {
      await supabase.auth.signOut();

      throw new Error(
        "Gagal mengambil data profile dari Supabase."
      );
    }

    if (!profile) {
      await supabase.auth.signOut();

      throw new Error(
        "Akun login sudah ada, tapi belum ada data di users_profile."
      );
    }

    const normalizedProfileRole =
      normalizeRole(profile.role);

    if (!normalizedProfileRole) {
      await supabase.auth.signOut();

      throw new Error(
        "Role user belum valid. Role harus admin, kepala_sekolah, guru, atau murid."
      );
    }

    /*
     * Simpan session data seperti existing.
     */
    localStorage.setItem(
      "hstkb_user_id",
      profile.id
    );

    localStorage.setItem(
      "hstkb_full_name",
      profile.full_name || ""
    );

    localStorage.setItem(
      "hstkb_email",
      profile.email ||
        loggedInEmail
    );

    localStorage.setItem(
      "hstkb_role",
      normalizedProfileRole
    );

    localStorage.setItem(
      "hstkb_role_name",
      getRoleTitle(
        normalizedProfileRole
      )
    );

    localStorage.setItem(
      "hstkb_demo_email",
      profile.email ||
        loggedInEmail
    );

    localStorage.setItem(
      "hstkb_demo_role",
      normalizedProfileRole
    );

    if (rememberMe) {
      localStorage.setItem(
        "hstkb_remember_me",
        "true"
      );
    } else {
      localStorage.removeItem(
        "hstkb_remember_me"
      );
    }

    /*
     * Redirect existing.
     */
    router.push(
      routeByRole[normalizedProfileRole]
    );

    router.refresh();
  }

  async function handleLogin(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const identifier =
      email.trim();

    const normalizedEmail =
      identifier.toLowerCase();

    if (!identifier || !password) {
      setErrorMessage(
        isStudentLogin
          ? "NIS/Nama siswa dan password wajib diisi."
          : "Email dan password wajib diisi."
      );

      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      /*
       * --------------------------------------------
       * SISWA
       * --------------------------------------------
       */
      if (isStudentLogin) {
        await loginStudent(
          identifier,
          password
        );

        return;
      }

      /*
       * --------------------------------------------
       * ADMIN / KEPALA SEKOLAH / GURU
       * --------------------------------------------
       */
      await loginStaff(
        normalizedEmail,
        password
      );
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        setErrorMessage(
          error.message
        );
      } else {
        setErrorMessage(
          "Terjadi kesalahan saat login. Coba lagi."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#FAF3EA] text-[#2B1B18]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#980A27] via-[#7E1D2F] to-[#15254F] text-white lg:flex lg:items-center lg:justify-center">
          <div className="relative z-10 flex h-full w-full max-w-[720px] flex-col justify-between px-10 py-10 xl:max-w-[760px] xl:px-12 xl:py-12">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm">
                <Image
                  src="/icon_hstkb_logo.png"
                  alt="HSTKB Logo"
                  width={44}
                  height={44}
                  className="h-full w-full object-contain"
                  priority
                />
              </div>

              <div>
                <p className="text-[15px] font-extrabold leading-tight text-white">
                  HSTKB
                </p>
                <p className="text-[11px] leading-tight text-white/75">
                  Management Sekolah
                </p>
              </div>
            </div>

            <div className="my-auto max-w-[610px]">
              <h1 className="text-[28px] font-extrabold leading-[1.18] tracking-tight text-white xl:text-[34px]">
                Pantau perkembangan belajar anak Anda dengan jelas & terstruktur.
              </h1>

              <p className="mt-5 max-w-[560px] text-[14px] leading-7 text-white/80 xl:text-[15px]">
                Homeschooling Tunas Karya Bangsa Kelapa Gading menghadirkan
                sistem laporan modern untuk orang tua, guru, murid, dan kepala
                sekolah.
              </p>

              <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2">
                <FeatureCard
                  Icon={BookOpen}
                  title="Report mingguan & bulanan"
                />

                <FeatureCard
                  Icon={UsersRound}
                  title="Kolaborasi guru–orang tua"
                />

                <FeatureCard
                  Icon={Sparkles}
                  title="Analitik perkembangan"
                />

                <FeatureCard
                  Icon={ShieldCheck}
                  title="Approval kepala sekolah"
                />
              </div>
            </div>

            <p className="text-[11px] text-white/60 xl:text-xs">
              © 2026 HSTKB. Academic Year 2026/2027
            </p>
          </div>

          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

          <div className="absolute -bottom-28 left-8 h-80 w-80 rounded-full bg-[#D96B2B]/15 blur-3xl" />
        </section>

        <section className="flex min-h-screen items-center justify-center px-5 py-8 lg:px-8">
          <div className="w-full max-w-[460px]">
            <div className="mb-7 flex items-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm">
                <Image
                  src="/icon_hstkb_logo.png"
                  alt="HSTKB Logo"
                  width={44}
                  height={44}
                  className="h-full w-full object-contain"
                  priority
                />
              </div>

              <div>
                <p className="text-[15px] font-extrabold leading-tight">
                  HSTKB
                </p>

                <p className="text-[11px] text-[#6B4A3A]">
                  Management Sekolah
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-[22px] font-extrabold tracking-tight md:text-[24px]">
                Selamat datang kembali
              </h2>

              <p className="mt-2 text-[13px] text-[#6B4A3A] md:text-sm">
                Masuk untuk mengakses Learning Report System.
              </p>
            </div>

            <form
              onSubmit={handleLogin}
              className="mt-7"
            >
              <div>
                <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#6B4A3A]">
                  Pilih Peran
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {roleOptions.map((role) => {
                    const isActive =
                      selectedRole ===
                      role.key;

                    return (
                      <button
                        key={role.key}
                        type="button"
                        onClick={() =>
                          handleSelectRole(
                            role
                          )
                        }
                        className={`rounded-[18px] border px-4 py-4 text-left transition ${
                          isActive
                            ? "border-[#7A1F2B] bg-[#F8EBDD] shadow-sm ring-1 ring-[#7A1F2B]"
                            : "border-[#E8D6C1] bg-[#FFF8EF] hover:border-[#7A1F2B]"
                        }`}
                      >
                        <p
                          className={`text-[15px] font-extrabold ${
                            isActive
                              ? "text-[#7A1F2B]"
                              : "text-[#2B1B18]"
                          }`}
                        >
                          {role.title}
                        </p>

                        <p className="mt-1 text-[12px] leading-5 text-[#6B4A3A]">
                          {role.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6">
                <label className="text-[14px] font-extrabold">
                  {isStudentLogin
                    ? "NIS / Nama Siswa"
                    : "Email / Username"}
                </label>

                <input
                  value={email}
                  onChange={(event) => {
                    setEmail(
                      event.target.value
                    );

                    setErrorMessage("");
                  }}
                  placeholder={
                    isStudentLogin
                      ? "Masukkan NIS / Nama Siswa"
                      : "Masukkan email / username"
                  }
                  autoComplete={
                    isStudentLogin
                      ? "username"
                      : "email"
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 text-[14px] outline-none transition focus:border-[#7A1F2B]"
                />
              </div>

              <div className="mt-5">
                <label className="text-[14px] font-extrabold">
                  Password
                </label>

                <div className="relative mt-2">
                  <input
                    value={password}
                    onChange={(event) => {
                      setPassword(
                        event.target.value
                      );

                      setErrorMessage("");
                    }}
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Masukkan password"
                    autoComplete="current-password"
                    className="h-11 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 pr-12 text-[14px] outline-none transition focus:border-[#7A1F2B]"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[15px] text-[#6B4A3A] hover:text-[#7A1F2B]"
                  >
                    {showPassword
                      ? "🙈"
                      : "👁️"}
                  </button>
                </div>
              </div>

              {errorMessage ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] leading-5 text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              <div className="mt-4 flex items-center justify-between gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#6B4A3A]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) =>
                      setRememberMe(
                        event.target.checked
                      )
                    }
                    className="h-4 w-4 accent-[#7A1F2B]"
                  />

                  Ingat saya
                </label>

                <button
                  type="button"
                  className="text-[13px] font-semibold text-[#7A1F2B] hover:underline"
                >
                  Lupa password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-6 h-11 w-full rounded-xl bg-[#8C0F2D] text-[14px] font-extrabold text-white shadow-sm transition hover:bg-[#54131D] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading
                  ? "Memproses login..."
                  : "Masuk ke Sistem"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

function FeatureCard({
  Icon,
  title,
}: {
  Icon: LucideIcon;
  title: string;
}) {
  return (
    <div className="rounded-[18px] border border-white/15 bg-white/10 px-4 py-3 text-white shadow-sm backdrop-blur">
      <div className="flex items-center gap-3">
        <Icon
          size={16}
          strokeWidth={2.3}
          className="shrink-0 text-[#D96B2B]"
        />

        <p className="text-[13px] font-semibold leading-snug">
          {title}
        </p>
      </div>
    </div>
  );
}