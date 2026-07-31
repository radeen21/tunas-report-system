"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  BookOpen,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  FileText,
  GalleryHorizontal,
  LayoutGrid,
  LogOut,
  PenLine,
  Plus,
  Search,
  Users,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import AcademicFooter from "@/app/components/AcademicFooter";

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
  | "Gallery Upload";

type TeacherLayoutProps = {
  children: React.ReactNode;
  activeMenu: ActiveMenu;
  teacherName?: string;
  teacherSubject?: string;
  searchPlaceholder?: string;
  buttonLabel?: string;
};

type MenuItem = {
  name: ActiveMenu;
  href: string;
  icon: LucideIcon;
};

const menus: MenuItem[] = [
  { name: "Dashboard", href: "/teacher", icon: LayoutGrid },
  { name: "Murid Saya", href: "/teacher/students", icon: Users },
  { name: "Jadwal Mengajar", href: "/teacher/jadwal", icon: CalendarDays },
  { name: "Absensi KBM", href: "/teacher/absensi", icon: CheckSquare },
  { name: "Laporan KBM", href: "/teacher/laporan-kbm", icon: ClipboardList },
  { name: "Laporan Akademik", href: "/teacher/reports", icon: BookOpen },
  { name: "RPP", href: "/teacher/rpp", icon: PenLine },
  {
    name: "Program Semester",
    href: "/teacher/program-semester",
    icon: CalendarDays,
  },
  {
    name: "Kerangka Materi",
    href: "/teacher/kerangka-materi",
    icon: FileText,
  },
  { name: "Gallery Upload", href: "/teacher/gallery", icon: GalleryHorizontal },
];

function getInitials(name: string) {
  if (!name) return "G";

  const words = name.trim().split(" ").filter(Boolean);

  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }

  return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
}

function formatSubjects(subjects: string[] | string | null | undefined) {
  if (!subjects) return "Guru";

  if (Array.isArray(subjects)) {
    return `Guru — ${subjects.slice(0, 2).join(", ")}`;
  }

  return `Guru — ${subjects}`;
}

export default function TeacherLayout({
  activeMenu,
  searchPlaceholder = "Cari murid, jadwal, atau laporan...",
  teacherName,
  teacherSubject,
  children,
  buttonLabel,
}: TeacherLayoutProps) {
  void activeMenu;
  void buttonLabel;

  const pathname = usePathname();
  const router = useRouter();

  const [displayName, setDisplayName] = useState(teacherName || "Guru");
  const [displaySubject, setDisplaySubject] = useState(teacherSubject || "Guru");

  useEffect(() => {
    async function loadTeacherProfile() {
      const cachedName = localStorage.getItem("hstkb_teacher_name");
      const cachedSubject = localStorage.getItem("hstkb_teacher_subject");

      if (cachedName) setDisplayName(cachedName);
      if (cachedSubject) setDisplaySubject(cachedSubject);

      const { data: authData } = await supabase.auth.getUser();

      const email =
        authData.user?.email ||
        localStorage.getItem("hstkb_demo_email") ||
        localStorage.getItem("hstkb_email") ||
        "";

      let teacher = null;

      if (email) {
        const { data } = await supabase
          .from("teachers")
          .select("*")
          .eq("email", email)
          .limit(1)
          .maybeSingle();

        teacher = data;
      }

      if (!teacher) {
        const teacherCode =
          localStorage.getItem("hstkb_teacher_code") ||
          localStorage.getItem("teacher_code") ||
          "";

        if (teacherCode) {
          const { data } = await supabase
            .from("teachers")
            .select("*")
            .eq("teacher_code", teacherCode)
            .limit(1)
            .maybeSingle();

          teacher = data;
        }
      }

      if (!teacher) {
        const { data } = await supabase
          .from("teachers")
          .select("*")
          .order("teacher_code", { ascending: true })
          .limit(1)
          .maybeSingle();

        teacher = data;
      }

      if (teacher) {
        const name = teacher.full_name || "Guru";
        const subject = formatSubjects(teacher.subjects);

        setDisplayName(name);
        setDisplaySubject(subject);

        localStorage.setItem("hstkb_teacher_name", name);
        localStorage.setItem("hstkb_teacher_subject", subject);
      }
    }

    if (teacherName && teacherName !== "Guru") {
      setDisplayName(teacherName);
      localStorage.setItem("hstkb_teacher_name", teacherName);
    }

    if (teacherSubject && teacherSubject !== "Guru") {
      setDisplaySubject(teacherSubject);
      localStorage.setItem("hstkb_teacher_subject", teacherSubject);
    }

    loadTeacherProfile();
  }, [teacherName, teacherSubject]);

  async function handleLogout() {
    localStorage.removeItem("hstkb_demo_role");
    localStorage.removeItem("hstkb_demo_email");
    localStorage.removeItem("hstkb_email");
    localStorage.removeItem("hstkb_full_name");
    localStorage.removeItem("hstkb_teacher_name");
    localStorage.removeItem("hstkb_teacher_subject");
    localStorage.removeItem("hstkb_teacher_code");
    localStorage.removeItem("teacher_code");

    await supabase.auth.signOut();

    router.push("/");
  }

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-[#F6EFE6] text-[#2C1A17]">
      <div className="flex min-h-screen w-full max-w-full overflow-x-hidden bg-[#F6EFE6]">
        <aside className="fixed left-0 top-0 z-40 flex h-screen w-[266px] flex-col bg-[#8A0017] text-white">
          <div className="flex h-[98px] items-center border-b border-white/10 px-5">
            <Link href="/teacher" className="flex items-center gap-3">
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
                  Teacher Portal
                </p>
              </div>
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4">
            <nav className="space-y-1.5">
              {menus.map((menu) => {
                const Icon = menu.icon;

                const isActive =
                  menu.href === "/teacher"
                    ? pathname === "/teacher"
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
            <Link
              href="/teacher/laporan-kbm"
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#D97A37] text-[13px] font-bold text-white transition hover:brightness-105"
            >
              <Plus className="h-[15px] w-[15px]" />
              Buat Laporan
            </Link>

            <div className="mt-3 flex items-center justify-between rounded-2xl bg-[#9E0A25] px-3 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#6B0012] text-xs font-bold">
                  {getInitials(displayName)}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold">
                    {displayName}
                  </p>
                  <p className="truncate text-[12px] text-white/75">
                    {displaySubject}
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

        <section className="ml-[266px] min-h-screen w-[calc(100%-266px)] max-w-[calc(100%-266px)] flex-1 overflow-x-hidden bg-[#F6EFE6]">
          <header className="sticky top-0 z-30 flex h-[98px] w-full max-w-full items-center justify-between border-b border-[#E8D7C5] bg-[#F6EFE6]/95 px-8 backdrop-blur">
            <div className="relative w-full max-w-[470px]">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8E6A58]" />
              <input
                placeholder={searchPlaceholder}
                className="h-[46px] w-full rounded-2xl border border-[#DCC8B6] bg-[#F8F2EA] pl-12 pr-4 text-[15px] outline-none placeholder:text-[#A28070] focus:border-[#9C0824]"
              />
            </div>

            <div className="ml-8 flex min-w-0 items-center gap-5">
              <Bell className="h-5 w-5 shrink-0 text-[#8A4A32]" />

              <div className="h-10 w-px shrink-0 bg-[#DCC8B6]" />

              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#EEE5DA] text-[17px] font-bold text-[#8A2332]">
                  {getInitials(displayName)}
                </div>

                <div className="min-w-0 leading-tight">
                  <p className="truncate text-[16px] font-bold text-[#2C1A17]">
                    {displayName}
                  </p>
                  <p className="mt-1 max-w-[340px] truncate text-[13px] text-[#7D5E50]">
                    {displaySubject}
                  </p>
                </div>
              </div>
            </div>
          </header>

          <div className="w-full max-w-full overflow-x-hidden px-8 py-8">
            <div className="w-full max-w-full overflow-hidden">{children}</div>
            <AcademicFooter />
          </div>
        </section>
      </div>
    </main>
  );
}