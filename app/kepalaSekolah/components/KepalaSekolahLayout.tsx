"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  BookOpen,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  FileText,
  GalleryVerticalEnd,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  ListChecks,
  LogOut,
  PenLine,
  Search,
  Settings,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import AcademicFooter from "@/app/components/AcademicFooter";

type ActiveMenu =
  | "Dashboard"
  | "Siswa"
  | "Guru"
  | "Data Mapel"
  | "Jadwal Guru"
  | "Absensi KBM"
  | "Laporan KBM"
  | "Laporan Akademik"
  | "RPP"
  | "Program Semester"
  | "Kerangka Materi"
  | "Gallery"
  | "Settings";

type KepalaSekolahLayoutProps = {
  children: React.ReactNode;
  activeMenu: ActiveMenu;
  searchPlaceholder?: string;

  // Beberapa halaman lama masih mengirim buttonLabel
  buttonLabel?: string;
};

type MenuItem = {
  name: ActiveMenu;
  icon: LucideIcon;
  href: string;
};

const menus: MenuItem[] = [
  {
    name: "Dashboard",
    icon: LayoutDashboard,
    href: "/kepalaSekolah",
  },
  {
    name: "Siswa",
    icon: UsersRound,
    href: "/kepalaSekolah/students",
  },
  {
    name: "Guru",
    icon: GraduationCap,
    href: "/kepalaSekolah/teachers",
  },
  {
    name: "Data Mapel",
    icon: LibraryBig,
    href: "/kepalaSekolah/subjects",
  },
  {
    name: "Jadwal Guru",
    icon: CalendarDays,
    href: "/kepalaSekolah/jadwal",
  },
  {
    name: "Absensi KBM",
    icon: ClipboardCheck,
    href: "/kepalaSekolah/absensi",
  },
  {
    name: "Laporan KBM",
    icon: FileText,
    href: "/kepalaSekolah/laporan-kbm",
  },
  {
    name: "Laporan Akademik",
    icon: BookOpen,
    href: "/kepalaSekolah/laporan-akademik",
  },
  {
    name: "RPP",
    icon: PenLine,
    href: "/kepalaSekolah/rpp",
  },
  {
    name: "Program Semester",
    icon: CalendarRange,
    href: "/kepalaSekolah/program-semester",
  },
  {
    name: "Kerangka Materi",
    icon: ListChecks,
    href: "/kepalaSekolah/kerangka-materi",
  },
  {
    name: "Gallery",
    icon: GalleryVerticalEnd,
    href: "/kepalaSekolah/gallery",
  },
  {
    name: "Settings",
    icon: Settings,
    href: "/kepalaSekolah/settings",
  },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getDisplayRole(role?: string | null) {
  if (!role) return "Kepala Sekolah";

  const normalizedRole = role.trim().toLowerCase();

  if (normalizedRole === "admin") return "Admin";
  if (normalizedRole === "super_admin") return "Admin";

  if (normalizedRole === "kepala_sekolah") return "Kepala Sekolah";
  if (normalizedRole === "kepala sekolah") return "Kepala Sekolah";

  return "Kepala Sekolah";
}

export default function KepalaSekolahLayout({
  activeMenu,
  searchPlaceholder = "Cari murid, guru, atau report...",
  children,
  buttonLabel,
}: KepalaSekolahLayoutProps) {
  void buttonLabel;

  const [principalName, setPrincipalName] = useState("Kepala Sekolah");
  const [displayRole, setDisplayRole] = useState("Kepala Sekolah");

  useEffect(() => {
    const storedName = localStorage.getItem("hstkb_full_name");
    const storedRole = localStorage.getItem("hstkb_role");

    if (storedName && storedName.trim()) {
      setPrincipalName(storedName);
    }

    setDisplayRole(getDisplayRole(storedRole));
  }, []);

  const initials = useMemo(
    () => getInitials(principalName),
    [principalName]
  );

  return (
    <div className="min-h-screen bg-[#FAF3EA] text-[#2B1B18]">
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[250px] flex-col bg-[#7A0016] text-white lg:flex">
        <div className="flex h-[96px] items-center gap-3 border-b border-white/10 px-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm">
            <Image
              src="/icon_hstkb_logo.png"
              alt="HSTKB Logo"
              width={48}
              height={48}
              className="h-full w-full object-contain"
              priority
            />
          </div>

          <div className="min-w-0">
            <p className="text-[17px] font-extrabold leading-tight">
              HSTKB
            </p>

            <p className="mt-0.5 text-[13px] leading-tight text-white/75">
              {displayRole}
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {menus.map((menu) => {
            const Icon = menu.icon;
            const isActive = activeMenu === menu.name;

            return (
              <Link
                key={menu.name}
                href={menu.href}
                className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-[14px] font-semibold transition ${
                  isActive
                    ? "bg-white/12 text-white"
                    : "text-white/75 hover:bg-white/8 hover:text-white"
                }`}
              >
                <Icon
                  size={17}
                  strokeWidth={2.2}
                  className={`shrink-0 ${
                    isActive
                      ? "text-[#E7792B]"
                      : "text-white/70"
                  }`}
                />

                <span className="truncate">{menu.name}</span>

                {isActive ? (
                  <span className="ml-auto h-2 w-2 rounded-full bg-[#E7792B]" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-3 py-3">
          <div className="flex items-center gap-3 rounded-2xl bg-white/8 px-3 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-[12px] font-extrabold">
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-extrabold">
                {principalName}
              </p>

              <p className="truncate text-[11px] text-white/65">
                {displayRole}
              </p>
            </div>

            <Link
              href="/"
              className="text-white/70 transition hover:text-white"
              title="Keluar"
            >
              <LogOut size={15} strokeWidth={2.2} />
            </Link>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[250px]">
        <header className="sticky top-0 z-30 border-b border-[#E8D6C1] bg-[#FFF8EF]/95 backdrop-blur">
          <div className="flex h-[78px] items-center justify-between gap-5 px-6 lg:px-8">
            <div className="relative hidden w-full max-w-[430px] sm:block">
              <Search
                size={17}
                strokeWidth={2.2}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A6A5A]"
              />

              <input
                placeholder={searchPlaceholder}
                className="h-11 w-full rounded-2xl border border-[#E8D6C1] bg-white px-11 text-[14px] text-[#2B1B18] outline-none transition placeholder:text-[#9B7A69] focus:border-[#7A1F2B]"
              />
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                className="relative flex h-10 w-10 items-center justify-center rounded-full text-[#7A1F2B] transition hover:bg-[#F1DFD5]"
                aria-label="Notifikasi"
              >
                <Bell size={18} strokeWidth={2.2} />

                <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#E7792B]" />
              </button>

              <div className="h-9 w-px bg-[#E8D6C1]" />

              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[13px] font-extrabold text-[#7A1F2B] shadow-sm">
                  {initials}
                </div>

                <div className="hidden leading-tight md:block">
                  <p className="text-[15px] font-extrabold text-[#2B1B18]">
                    {principalName}
                  </p>

                  <p className="mt-0.5 text-[12px] text-[#6B4A3A]">
                    {displayRole}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="px-6 py-7 lg:px-8">
          {children}

          <AcademicFooter />
        </main>
      </div>
    </div>
  );
}