"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type RoleKey = "kepala_sekolah" | "guru" | "orang_tua" | "murid";

type RoleOption = {
  key: RoleKey;
  title: string;
  description: string;
  emailPlaceholder: string;
  route: string;
};

const roleOptions: RoleOption[] = [
  {
    key: "kepala_sekolah",
    title: "Kepala Sekolah",
    description: "Akses penuh, approval & analitik",
    emailPlaceholder: "kepala@hstkb.id",
    route: "/kepalaSekolah",
  },
  {
    key: "guru",
    title: "Guru",
    description: "Buat & kelola laporan murid",
    emailPlaceholder: "sarah@hstkb.id",
    route: "/teacher",
  },
  {
    key: "orang_tua",
    title: "Orang Tua",
    description: "Lihat & unduh laporan anak",
    emailPlaceholder: "parent@tunasbangsa.id",
    route: "/parent",
  },
  {
    key: "murid",
    title: "Murid",
    description: "Lihat progress & jadwal pribadi",
    emailPlaceholder: "student@hstkb.id",
    route: "/student",
  },
];

export default function LoginPage() {
  const router = useRouter();

  const [selectedRole, setSelectedRole] = useState<RoleKey>("orang_tua");
  const [email, setEmail] = useState("parent@tunasbangsa.id");
  const [password, setPassword] = useState("password");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const selectedRoleData = useMemo(() => {
    return (
      roleOptions.find((role) => role.key === selectedRole) || roleOptions[2]
    );
  }, [selectedRole]);

  function handleSelectRole(role: RoleOption) {
    setSelectedRole(role.key);
    setEmail(role.emailPlaceholder);
  }

  function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    localStorage.setItem("hstkb_role", selectedRoleData.key);
    localStorage.setItem("hstkb_role_name", selectedRoleData.title);
    localStorage.setItem("hstkb_demo_email", email);

    if (rememberMe) {
      localStorage.setItem("hstkb_remember_me", "true");
    } else {
      localStorage.removeItem("hstkb_remember_me");
    }

    router.push(selectedRoleData.route);
  }

  return (
    <main className="min-h-screen bg-[#FAF3EA] text-[#2B1B18]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#8C0F2D] via-[#7A1F2B] to-[#0B1F44] px-10 py-10 text-white lg:flex lg:flex-col">
          <div className="relative z-10 flex items-center gap-3">
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
              <p className="text-base font-extrabold leading-tight">HSTKB</p>
              <p className="text-xs text-white/75">Management Sekolah</p>
            </div>
          </div>

          <div className="relative z-10 my-auto max-w-[680px]">
            <h1 className="text-[36px] font-extrabold leading-[1.2] tracking-tight xl:text-[40px]">
              Pantau perkembangan belajar anak Anda dengan jelas & terstruktur.
            </h1>

            <p className="mt-7 max-w-[620px] text-base leading-7 text-white/80">
              Homeschooling Tunas Karya Bangsa Kelapa Gading menghadirkan
              sistem laporan modern untuk orang tua, guru, dan kepala sekolah.
            </p>

            <div className="mt-9 grid grid-cols-1 gap-3 md:grid-cols-2">
              <FeatureCard icon="📖" title="Report mingguan & bulanan" />
              <FeatureCard icon="👥" title="Kolaborasi guru–orang tua" />
              <FeatureCard icon="✨" title="Analitik perkembangan" />
              <FeatureCard icon="🛡️" title="Approval kepala sekolah" />
            </div>
          </div>

          <p className="relative z-10 text-xs text-white/60">
            © 2026 HSTKB. Academic Year 2025/2026
          </p>

          <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-40 left-16 h-96 w-96 rounded-full bg-[#D96B2B]/20 blur-3xl" />
        </section>

        <section className="flex min-h-screen items-center justify-center px-6 py-8">
          <div className="w-full max-w-[500px]">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
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
                <p className="text-base font-extrabold leading-tight">HSTKB</p>
                <p className="text-xs text-[#6B4A3A]">Management Sekolah</p>
              </div>
            </div>

            <div>
              <h2 className="text-[28px] font-extrabold tracking-tight">
                Selamat datang kembali
              </h2>

              <p className="mt-2 text-sm text-[#6B4A3A]">
                Masuk untuk mengakses Learning Report System.
              </p>
            </div>

            <form onSubmit={handleLogin} className="mt-8">
              <div>
                <p className="mb-3 text-xs font-extrabold uppercase tracking-widest text-[#6B4A3A]">
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
                        className={`rounded-2xl border px-4 py-4 text-left transition ${
                          isActive
                            ? "border-[#7A1F2B] bg-[#F8EBDD] shadow-sm ring-1 ring-[#7A1F2B]"
                            : "border-[#E8D6C1] bg-[#FFF8EF] hover:border-[#7A1F2B]"
                        }`}
                      >
                        <p
                          className={`text-base font-extrabold ${
                            isActive ? "text-[#7A1F2B]" : "text-[#2B1B18]"
                          }`}
                        >
                          {role.title}
                        </p>

                        <p className="mt-1 text-xs leading-5 text-[#6B4A3A]">
                          {role.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6">
                <label className="text-sm font-extrabold">
                  Email / Username
                </label>

                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={selectedRoleData.emailPlaceholder}
                  className="mt-2 h-12 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 text-sm outline-none transition focus:border-[#7A1F2B]"
                />
              </div>

              <div className="mt-5">
                <label className="text-sm font-extrabold">Password</label>

                <div className="relative mt-2">
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type={showPassword ? "text" : "password"}
                    placeholder="Masukkan password"
                    className="h-12 w-full rounded-xl border border-[#E8D6C1] bg-white px-4 pr-12 text-sm outline-none transition focus:border-[#7A1F2B]"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-base text-[#6B4A3A] hover:text-[#7A1F2B]"
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[#6B4A3A]">
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
                  className="text-sm font-semibold text-[#7A1F2B] hover:underline"
                >
                  Lupa password?
                </button>
              </div>

              <button
                type="submit"
                className="mt-6 h-12 w-full rounded-xl bg-[#8C0F2D] text-sm font-extrabold text-white shadow-sm transition hover:bg-[#54131D]"
              >
                Masuk ke Sistem
              </button>

              <div className="mt-5 rounded-xl border border-dashed border-[#E8D6C1] bg-[#FFF8EF] px-4 py-3 text-xs leading-6 text-[#6B4A3A] shadow-sm">
                <span className="font-extrabold text-[#2B1B18]">
                  Demo mode:
                </span>{" "}
                pilih peran, klik Masuk. Tidak perlu kredensial asli.
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

function FeatureCard({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white shadow-sm backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="text-sm">{icon}</span>
        <p className="text-sm font-semibold">{title}</p>
      </div>
    </div>
  );
}