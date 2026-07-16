"use client";

import Image from "next/image";
import Link from "next/link";

type ActiveMenu =
  | "Dashboard Anak"
  | "Progress"
  | "Jadwal Belajar"
  | "Absensi Anak"
  | "Laporan KBM"
  | "Laporan Akademik"
  | "Gallery Activity"
  | "Download Report";

type ParentLayoutProps = {
  activeMenu: ActiveMenu;
  searchPlaceholder?: string;
  parentName?: string;
  children: React.ReactNode;
};

const menus = [
  { name: "Dashboard Anak", icon: "▦", href: "/parent" },
  { name: "Progress", icon: "⌁", href: "/parent/analytics" },
  { name: "Jadwal Belajar", icon: "▣", href: "/parent/jadwal" },
  { name: "Absensi Anak", icon: "☑", href: "/parent/absensi" },
  { name: "Laporan KBM", icon: "▤", href: "/parent/laporan-kbm" },
  { name: "Laporan Akademik", icon: "▥", href: "/parent/laporan-akademik" },
  { name: "Gallery Activity", icon: "▧", href: "/parent/gallery" },
  { name: "Download Report", icon: "⇩", href: "/parent/download-report" },
] as const;

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function ParentLayout({
  activeMenu,
  searchPlaceholder = "Cari data anak...",
  parentName = "Parent",
  children,
}: ParentLayoutProps) {
  return (
    <div className="min-h-screen bg-[#FAF3EA] text-[#2B1B18]">
      <header className="sticky top-0 z-40 border-b border-[#E8D6C1] bg-[#FFF8EF]/95 backdrop-blur">
        <div className="mx-auto max-w-[1440px] px-8">
          <div className="flex min-h-[88px] items-center justify-between gap-6 py-4">
            <Link href="/parent" className="flex shrink-0 items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm">
                <Image
                  src="/icon_hstkb_logo.png"
                  alt="HSTKB Logo"
                  width={56}
                  height={56}
                  className="h-full w-full object-contain"
                  priority
                />
              </div>

              <div>
                <p className="text-[22px] font-extrabold leading-tight">
                  HSTKB
                </p>
                <p className="text-sm leading-tight text-[#6B4A3A]">
                  Management
                  <br />
                  Sekolah
                </p>
              </div>
            </Link>

            <div className="hidden flex-1 items-center justify-end gap-4 lg:flex">
              <input
                placeholder={searchPlaceholder}
                className="h-12 w-full max-w-[360px] rounded-2xl border border-[#E8D6C1] bg-white px-5 text-sm outline-none transition focus:border-[#7A1F2B]"
              />

              <button
                type="button"
                className="relative flex h-11 w-11 items-center justify-center rounded-full text-[#7A1F2B] transition hover:bg-[#F1DFD5]"
              >
                🔔
                <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#D96B2B]" />
              </button>

              <div className="flex min-w-fit items-center gap-3 rounded-full border border-[#E8D6C1] bg-white px-4 py-2 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#7A1F2B] text-sm font-bold text-white">
                  {getInitials(parentName)}
                </div>

                <div className="leading-tight">
                  <p className="text-sm font-extrabold">{parentName}</p>
                  <p className="text-xs text-[#6B4A3A]">Parent</p>
                </div>
              </div>

              <Link
                href="/"
                className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-[#6B4A3A] transition hover:bg-[#F1DFD5] hover:text-[#7A1F2B]"
              >
                ↪
              </Link>
            </div>
          </div>

          <nav className="flex items-center gap-3 overflow-x-auto border-t border-[#E8D6C1] py-3">
            {menus.map((menu) => {
              const isActive = activeMenu === menu.name;

              return (
                <Link
                  key={menu.name}
                  href={menu.href}
                  className={`flex min-w-fit items-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold transition ${
                    isActive
                      ? "bg-[#F1DFD5] text-[#7A1F2B]"
                      : "text-[#6B4A3A] hover:bg-[#F8EBDD] hover:text-[#7A1F2B]"
                  }`}
                >
                  <span className="text-xs">{menu.icon}</span>
                  <span className="whitespace-nowrap">{menu.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 border-t border-[#E8D6C1] py-3 lg:hidden">
            <input
              placeholder={searchPlaceholder}
              className="h-11 flex-1 rounded-2xl border border-[#E8D6C1] bg-white px-4 text-sm outline-none transition focus:border-[#7A1F2B]"
            />

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7A1F2B] text-xs font-bold text-white">
              {getInitials(parentName)}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-8 py-8">{children}</main>
    </div>
  );
}