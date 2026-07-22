"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  Download,
  GalleryHorizontal,
  LayoutDashboard,
  LogOut,
  Search,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import AcademicFooter from "@/app/components/AcademicFooter";

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
  children: React.ReactNode;
  activeMenu: ActiveMenu;
  parentName?: string;
  studentName?: string;
  searchPlaceholder?: string;

  // Fix Vercel build: beberapa halaman lama masih mengirim buttonLabel
  buttonLabel?: string;
};

type MenuItem = {
  name: ActiveMenu;
  href: string;
  icon: LucideIcon;
};

const menus: MenuItem[] = [
  { name: "Dashboard Anak", href: "/parent", icon: LayoutDashboard },
  { name: "Progress", href: "/parent/analytics", icon: ChartNoAxesCombined },
  { name: "Jadwal Belajar", href: "/parent/jadwal", icon: CalendarDays },
  { name: "Absensi Anak", href: "/parent/absensi", icon: UserRound },
  { name: "Laporan KBM", href: "/parent/laporan-kbm", icon: BookOpen },
  {
    name: "Laporan Akademik",
    href: "/parent/laporan-akademik",
    icon: BookOpen,
  },
  { name: "Gallery Activity", href: "/parent/gallery", icon: GalleryHorizontal },
  { name: "Download Report", href: "/parent/download-report", icon: Download },
];

function getInitials(name: string) {
  if (!name) return "P";

  const words = name.trim().split(" ").filter(Boolean);

  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }

  return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
}

export default function ParentLayout({
  activeMenu,
  searchPlaceholder = "Cari jadwal, laporan, atau aktivitas...",
  parentName,
  studentName,
  children,
  buttonLabel,
}: ParentLayoutProps) {
  void buttonLabel;

  const pathname = usePathname();
  const router = useRouter();

  const [displayName, setDisplayName] = useState(parentName || "Orang Tua");
  const [displayStudent, setDisplayStudent] = useState(studentName || "Anak");

  useEffect(() => {
    async function loadParentProfile() {
      const cachedName = localStorage.getItem("hstkb_parent_name");
      const cachedStudent = localStorage.getItem("hstkb_student_name");

      if (cachedName) setDisplayName(cachedName);
      if (cachedStudent) setDisplayStudent(cachedStudent);

      const { data: authData } = await supabase.auth.getUser();

      const email =
        authData.user?.email ||
        localStorage.getItem("hstkb_demo_email") ||
        localStorage.getItem("hstkb_email") ||
        "";

      if (!email) return;

      const { data: parent } = await supabase
        .from("parents")
        .select("*")
        .eq("email", email)
        .limit(1)
        .maybeSingle();

      if (parent) {
        const name = parent.full_name || "Orang Tua";

        setDisplayName(name);
        localStorage.setItem("hstkb_parent_name", name);

        const { data: child } = await supabase
          .from("students")
          .select("*")
          .eq("parent_id", parent.id)
          .order("full_name")
          .limit(1)
          .maybeSingle();

        if (child) {
          const childName = child.full_name || "Anak";
          setDisplayStudent(childName);
          localStorage.setItem("hstkb_student_name", childName);
        }
      }
    }

    if (parentName && parentName !== "Orang Tua") {
      setDisplayName(parentName);
      localStorage.setItem("hstkb_parent_name", parentName);
    }

    if (studentName && studentName !== "Anak") {
      setDisplayStudent(studentName);
      localStorage.setItem("hstkb_student_name", studentName);
    }

    loadParentProfile();
  }, [parentName, studentName]);

  async function handleLogout() {
    localStorage.removeItem("hstkb_demo_role");
    localStorage.removeItem("hstkb_demo_email");
    localStorage.removeItem("hstkb_full_name");
    localStorage.removeItem("hstkb_parent_name");
    localStorage.removeItem("hstkb_student_name");

    await supabase.auth.signOut();

    router.push("/");
  }

  const initials = useMemo(() => getInitials(displayName), [displayName]);

  return (
    <main className="min-h-screen bg-[#F6EFE6] text-[#2C1A17]">
      <div className="flex min-h-screen">
        <aside className="fixed left-0 top-0 z-40 flex h-screen w-[266px] flex-col bg-[#7A0016] text-white">
          <div className="flex h-[98px] items-center border-b border-white/10 px-5">
            <Link href="/parent" className="flex items-center gap-3">
              <div className="h-12 w-12 overflow-hidden rounded-full bg-white/10">
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
                <p className="text-[18px] font-bold leading-none">HSTKB</p>
                <p className="mt-1 text-[13px] text-white/80">
                  Parent Portal
                </p>
              </div>
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4">
            <nav className="space-y-1.5">
              {menus.map((menu) => {
                const Icon = menu.icon;

                const isActive =
                  menu.href === "/parent"
                    ? pathname === "/parent"
                    : pathname === menu.href ||
                      pathname.startsWith(`${menu.href}/`);

                return (
                  <Link
                    key={menu.name}
                    href={menu.href}
                    className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition ${
                      isActive ? "bg-[#A10A26] shadow-sm" : "hover:bg-white/5"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-[18px] w-[18px]" />
                      <span className="text-[15px] font-semibold">
                        {menu.name}
                      </span>
                    </span>

                    {isActive ? (
                      <span className="h-2 w-2 rounded-full bg-[#F3A032]" />
                    ) : null}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="border-t border-white/10 px-3 py-4">
            <div className="flex items-center justify-between rounded-2xl bg-[#9E0A25] px-3 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#6B0012] text-xs font-bold">
                  {initials}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold">
                    {displayName}
                  </p>
                  <p className="truncate text-[12px] text-white/75">
                    Anak: {displayStudent}
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="text-white/80 transition hover:text-white"
                title="Logout"
                type="button"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        <section className="ml-[266px] min-h-screen flex-1">
          <header className="sticky top-0 z-30 flex h-[98px] items-center justify-between border-b border-[#E8D7C5] bg-[#F6EFE6]/95 px-8 backdrop-blur">
            <div className="relative w-full max-w-[470px]">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8E6A58]" />
              <input
                placeholder={searchPlaceholder}
                className="h-[46px] w-full rounded-2xl border border-[#DCC8B6] bg-[#F8F2EA] pl-12 pr-4 text-[15px] outline-none placeholder:text-[#A28070] focus:border-[#9C0824]"
              />
            </div>

            <div className="ml-8 flex items-center gap-5">
              <Bell className="h-5 w-5 text-[#8A4A32]" />

              <div className="h-10 w-px bg-[#DCC8B6]" />

              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#EEE5DA] text-[17px] font-bold text-[#8A2332]">
                  {initials}
                </div>

                <div className="leading-tight">
                  <p className="text-[16px] font-bold text-[#2C1A17]">
                    {displayName}
                  </p>
                  <p className="mt-1 max-w-[340px] truncate text-[13px] text-[#7D5E50]">
                    Parent Portal — {displayStudent}
                  </p>
                </div>
              </div>
            </div>
          </header>

          <div className="px-8 py-8">
            {children}
            <AcademicFooter />
          </div>
        </section>
      </div>
    </main>
  );
}