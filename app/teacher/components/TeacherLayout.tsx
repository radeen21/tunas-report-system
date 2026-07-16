"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

type ActiveMenu =
  | "Dashboard"
  | "Murid Saya"
  | "Jadwal Mengajar"
  | "Absensi KBM"
  | "Laporan KBM"
  | "Laporan Akademik"
  | "RPP"
  | "Program Semester"
  | "Kerangka Materi"
  | "Alokasi Waktu"
  | "Gallery Upload";

type TeacherLayoutProps = {
  activeMenu: ActiveMenu;
  searchPlaceholder?: string;
  buttonLabel?: string;
  children: React.ReactNode;
};

const menus = [
  { name: "Dashboard", icon: "▦", href: "/teacher" },
  { name: "Murid Saya", icon: "👥", href: "/teacher/students" },
  { name: "Jadwal Mengajar", icon: "📅", href: "/teacher/jadwal" },
  { name: "Absensi KBM", icon: "☑️", href: "/teacher/absensi" },
  { name: "Laporan KBM", icon: "📋", href: "/teacher/laporan-kbm" },
  { name: "Laporan Akademik", icon: "📖", href: "/teacher/reports" },
  { name: "RPP", icon: "📝", href: "/teacher/rpp" },
  { name: "Program Semester", icon: "🗓️", href: "/teacher/program-semester" },
  { name: "Kerangka Materi", icon: "☷", href: "/teacher/kerangka-materi" },
  { name: "Alokasi Waktu", icon: "⏱️", href: "/teacher/alokasi-waktu" },
  { name: "Gallery Upload", icon: "🖼️", href: "/teacher/gallery" },
] as const;

export default function TeacherLayout({
  activeMenu,
  searchPlaceholder = "Cari murid, jadwal, atau laporan...",
  buttonLabel = "+ Buat Report",
  children,
}: TeacherLayoutProps) {
  const router = useRouter();

  function handleLogout() {
    localStorage.removeItem("hstkb_role");
    localStorage.removeItem("hstkb_role_name");
    localStorage.removeItem("hstkb_demo_email");
    localStorage.removeItem("hstkb_remember_me");

    router.push("/");
  }

  return (
    <div className="min-h-screen bg-[#FAF3EA] text-[#2B1B18]">
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-[255px] flex-col bg-[#7A1F2B] text-white">
        <div className="flex items-center gap-3 border-b border-white/10 px-6 py-7">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm">
            <Image
              src="/icon_hstkb_logo.png"
              alt="HSTKB Logo"
              width={48}
              height={48}
              className="h-full w-full object-contain"
              priority
            />
          </div>

          <div>
            <p className="text-lg font-extrabold leading-tight">HSTKB</p>
            <p className="text-sm text-white/70">Teacher Portal</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <div className="space-y-2">
            {menus.map((menu) => {
              const isActive = activeMenu === menu.name;

              return (
                <Link
                  key={menu.name}
                  href={menu.href}
                  className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold transition ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 text-center text-sm">{menu.icon}</span>
                    <span>{menu.name}</span>
                  </div>

                  {isActive && (
                    <span className="h-2 w-2 rounded-full bg-[#D96B2B]" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-white/10 p-4">
          <button
            type="button"
            className="mb-4 flex w-full items-center justify-center gap-3 rounded-2xl bg-[#D96B2B] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#B85C38]"
          >
            <span className="text-lg">⊕</span>
            {buttonLabel.replace("+ ", "")}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-2xl bg-[#8C0F2D] p-4 text-left transition hover:bg-[#A3263A]"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20 text-sm font-bold text-white">
              MS
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold text-white">
                Ms. Sarah
              </p>
              <p className="truncate text-sm text-white/70">
                Guru — Math, Science
              </p>
            </div>

            <span className="text-2xl text-white/80">↪</span>
          </button>
        </div>
      </aside>

      <div className="min-h-screen pl-[255px]">
        <header className="sticky top-0 z-30 border-b border-[#E8D6C1] bg-[#FFF8EF]/95 backdrop-blur">
          <div className="flex h-[76px] items-center justify-between gap-5 px-8">
            <input
              placeholder={searchPlaceholder}
              className="h-11 w-full max-w-[445px] rounded-2xl border border-[#E8D6C1] bg-white px-5 text-sm outline-none transition focus:border-[#7A1F2B]"
            />

            <div className="flex items-center gap-4">
              <button
                type="button"
                className="relative flex h-10 w-10 items-center justify-center rounded-full text-[#7A1F2B] hover:bg-[#F1DFD5]"
              >
                🔔
              </button>

              <div className="h-8 w-px bg-[#E8D6C1]" />

              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-sm font-bold text-[#7A1F2B]">
                  MS
                </div>

                <div>
                  <p className="text-sm font-bold">Ms. Sarah</p>
                  <p className="text-xs text-[#6B4A3A]">Guru</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="px-8 py-8">{children}</main>
      </div>
    </div>
  );
}