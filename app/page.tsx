"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, ShieldCheck, Sparkles, UsersRound, type LucideIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";

type RoleKey = "kepala_sekolah" | "guru" | "orang_tua" | "murid";

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
  role: RoleKey | string | null;
  phone?: string | null;
};

const roleOptions: RoleOption[] = [
  {
    key: "kepala_sekolah",
    title: "Kepala Sekolah",
    description: "Akses penuh, approval & analitik",
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
    key: "orang_tua",
    title: "Orang Tua",
    description: "Lihat & unduh laporan anak",
    emailPlaceholder: "parent@hstkb.sch.id",
    route: "/parent",
  },
  {
    key: "murid",
    title: "Murid",
    description: "Lihat progress & jadwal pribadi",
    emailPlaceholder: "student@hstkb.sch.id",
    route: "/student",
  },
];

const routeByRole: Record<RoleKey, string> = {
  kepala_sekolah: "/kepalaSekolah",
  guru: "/teacher",
  orang_tua: "/parent",
  murid: "/student",
};

function isRoleKey(role: string | null | undefined): role is RoleKey {
  return (
    role === "kepala_sekolah" ||
    role === "guru" ||
    role === "orang_tua" ||
    role === "murid"
  );
}

export default function LoginPage() {
  const router = useRouter();

  const [selectedRole, setSelectedRole] = useState<RoleKey>("kepala_sekolah");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedRoleData = useMemo(() => {
    return (
      roleOptions.find((role) => role.key === selectedRole) || roleOptions[0]
    );
  }, [selectedRole]);

  function handleSelectRole(role: RoleOption) {
    setSelectedRole(role.key);
    setEmail("");
    setPassword("");
    setErrorMessage("");
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setErrorMessage("Email dan password wajib diisi.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

      if (authError) {
        setErrorMessage(
          "Email atau password salah. Pastikan akun sudah dibuat di Supabase Authentication."
        );
        return;
      }

      const loggedInEmail = authData.user?.email?.toLowerCase();

      if (!loggedInEmail) {
        setErrorMessage("Login berhasil, tapi email user tidak ditemukan.");
        await supabase.auth.signOut();
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("users_profile")
        .select("id, full_name, email, role, phone")
        .eq("email", loggedInEmail)
        .maybeSingle();

      const profile = profileData as UserProfile | null;

      if (profileError) {
        setErrorMessage("Gagal mengambil data profile dari Supabase.");
        await supabase.auth.signOut();
        return;
      }

      if (!profile) {
        setErrorMessage(
          "Akun login sudah ada, tapi belum ada data di users_profile."
        );
        await supabase.auth.signOut();
        return;
      }

      if (!isRoleKey(profile.role)) {
        setErrorMessage(
          "Role user belum valid. Role harus kepala_sekolah, guru, orang_tua, atau murid."
        );
        await supabase.auth.signOut();
        return;
      }

      localStorage.setItem("hstkb_user_id", profile.id);
      localStorage.setItem("hstkb_full_name", profile.full_name || "");
      localStorage.setItem("hstkb_email", profile.email || loggedInEmail);
      localStorage.setItem("hstkb_role", profile.role);
      localStorage.setItem(
        "hstkb_role_name",
        roleOptions.find((role) => role.key === profile.role)?.title ||
        profile.role
      );

      if (rememberMe) {
        localStorage.setItem("hstkb_remember_me", "true");
      } else {
        localStorage.removeItem("hstkb_remember_me");
      }

      router.push(routeByRole[profile.role]);
      router.refresh();
    } catch (error) {
      console.error(error);
      setErrorMessage("Terjadi kesalahan saat login. Coba lagi.");
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
                sistem laporan modern untuk orang tua, guru, dan kepala sekolah.
              </p>

              <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2">
                <FeatureCard Icon={BookOpen} title="Report mingguan & bulanan" />
                <FeatureCard
                  Icon={UsersRound}
                  title="Kolaborasi guru–orang tua"
                />
                <FeatureCard Icon={Sparkles} title="Analitik perkembangan" />
                <FeatureCard
                  Icon={ShieldCheck}
                  title="Approval kepala sekolah"
                />
              </div>
            </div>

            <p className="text-[11px] text-white/60 xl:text-xs">
              © 2026 HSTKB. Academic Year 2025/2026
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

            <form onSubmit={handleLogin} className="mt-7">
              <div>
                <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#6B4A3A]">
                  Pilih Peran
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {roleOptions.map((role) => {
                    const isActive = selectedRole === role.key;

                    return (
                      <button
                        key={role.key}
                        type="button"
                        onClick={() => handleSelectRole(role)}
                        className={`rounded-[18px] border px-4 py-4 text-left transition ${isActive
                          ? "border-[#7A1F2B] bg-[#F8EBDD] shadow-sm ring-1 ring-[#7A1F2B]"
                          : "border-[#E8D6C1] bg-[#FFF8EF] hover:border-[#7A1F2B]"
                          }`}
                      >
                        <p
                          className={`text-[15px] font-extrabold ${isActive ? "text-[#7A1F2B]" : "text-[#2B1B18]"
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
                  Email / Username
                </label>

                <input
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setErrorMessage("");
                  }}
                  placeholder="Masukkan email / username"
                  autoComplete="email"
                  className="mt-2 h-11 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 text-[14px] outline-none transition focus:border-[#7A1F2B]"
                />
              </div>

              <div className="mt-5">
                <label className="text-[14px] font-extrabold">Password</label>

                <div className="relative mt-2">
                  <input
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setErrorMessage("");
                    }}
                    type={showPassword ? "text" : "password"}
                    placeholder="Masukkan password"
                    autoComplete="current-password"
                    className="h-11 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 pr-12 text-[14px] outline-none transition focus:border-[#7A1F2B]"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[15px] text-[#6B4A3A] hover:text-[#7A1F2B]"
                  >
                    {showPassword ? "🙈" : "👁️"}
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
                    onChange={(event) => setRememberMe(event.target.checked)}
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
                {loading ? "Memproses login..." : "Masuk ke Sistem"}
              </button>

              <div className="mt-5 rounded-xl border border-dashed border-[#E8D6C1] bg-[#FFF8EF] px-4 py-3 text-[11px] leading-5 text-[#6B4A3A] shadow-sm">
                <span className="font-extrabold text-[#2B1B18]">
                  Login real:
                </span>{" "}
                masuk menggunakan akun yang sudah dibuat di Supabase
                Authentication.
              </div>
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
        <Icon size={16} strokeWidth={2.3} className="shrink-0 text-[#D96B2B]" />
        <p className="text-[13px] font-semibold leading-snug">{title}</p>
      </div>
    </div>
  );
}