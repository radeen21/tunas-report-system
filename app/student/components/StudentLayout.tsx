"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bell,
  BookOpen,
  CalendarDays,
  CheckSquare,
  FileText,
  GalleryHorizontal,
  LayoutGrid,
  LogOut,
  Search,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import AcademicFooter from "@/app/components/AcademicFooter";

type ActiveMenu =
  | "Dashboard"
  | "Dashboard Saya"
  | "Jadwal Belajar"
  | "Absensi"
  | "Materi"
  | "Tugas"
  | "Tugas & Hasil"
  | "Laporan Akademik"
  | "Laporan Saya"
  | "Progress Saya"
  | "Progress Belajar"
  | "Gallery";

type StudentLayoutProps = {
  children: ReactNode;
  activeMenu: ActiveMenu;
  studentName?: string;
  studentClass?: string;
  searchPlaceholder?: string;

  // Compat untuk halaman lama
  buttonLabel?: string;
};

type MenuItem = {
  name: ActiveMenu;
  label: string;
  href: string;
  icon: LucideIcon;
};

type StudentProfile = {
  id: string;
  full_name: string | null;
  level: string | null;
  grade: string | null;
  nis: string | null;
  nisn: string | null;
  email?: string | null;
  user_id?: string | null;
  parent_id?: string | null;
};

type ParentProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone?: string | null;
};

const menus: MenuItem[] = [
  { name: "Dashboard", label: "Dashboard Saya", href: "/student", icon: LayoutGrid },
  { name: "Jadwal Belajar", label: "Jadwal Belajar", href: "/student/jadwal", icon: CalendarDays },
  { name: "Absensi", label: "Absensi", href: "/student/absensi", icon: CheckSquare },
  { name: "Materi", label: "Materi Belajar", href: "/student/materials", icon: BookOpen },
  { name: "Tugas", label: "Tugas & Hasil", href: "/student/assignments", icon: FileText },
  { name: "Laporan Akademik", label: "Laporan Akademik", href: "/student/reports", icon: BookOpen },
  { name: "Gallery", label: "Galeri Kegiatan", href: "/student/gallery", icon: GalleryHorizontal },
];

function getInitials(name: string) {
  if (!name) return "S";

  const words = name.trim().split(" ").filter(Boolean);

  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }

  return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
}

function normalizeText(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function normalizeLevel(level?: string | null) {
  const normalized = normalizeText(level);

  if (!normalized) return "";

  if (
    normalized === "primary" ||
    normalized === "primary level" ||
    normalized === "sd" ||
    normalized.includes("primary")
  ) {
    return "SD";
  }

  if (
    normalized === "secondary" ||
    normalized === "secondary level" ||
    normalized === "smp" ||
    normalized.includes("secondary")
  ) {
    return "SMP";
  }

  if (
    normalized === "high school" ||
    normalized === "highschool" ||
    normalized === "sma" ||
    normalized.includes("high")
  ) {
    return "SMA";
  }

  if (
    normalized === "early learning" ||
    normalized.includes("early")
  ) {
    return "Bimbel/Kursus";
  }

  return level || "";
}

function formatStudentClass(student?: StudentProfile | null) {
  if (!student) return "Portal Murid / Orang Tua";

  const level = normalizeLevel(student.level);
  const grade = student.grade || "";

  const classInfo = [level, grade].filter(Boolean).join(" - ");

  return classInfo || "Portal Murid / Orang Tua";
}

function formatStudentSubInfo(student?: StudentProfile | null) {
  if (!student) return "Data murid belum terhubung";

  const classInfo = formatStudentClass(student);
  const nipd = student.nis ? `NIPD ${student.nis}` : "";
  const nisn = student.nisn ? `NISN ${student.nisn}` : "";

  return [classInfo, nipd, nisn].filter(Boolean).join(" • ");
}

function isMenuActive(pathname: string, menu: MenuItem) {
  if (menu.href === "/student") return pathname === "/student";

  return pathname === menu.href || pathname.startsWith(`${menu.href}/`);
}

function isActiveMenuMatch(activeMenu: ActiveMenu, menu: MenuItem) {
  if (activeMenu === menu.name) return true;

  const aliases: Record<string, ActiveMenu[]> = {
    Dashboard: ["Dashboard Saya"],
    Tugas: ["Tugas & Hasil"],
    "Laporan Akademik": ["Laporan Saya"],
    "Progress Belajar": ["Progress Saya"],
  };

  return aliases[menu.name]?.includes(activeMenu) || false;
}

export default function StudentLayout({
  activeMenu,
  searchPlaceholder = "Cari jadwal, materi, tugas, atau laporan...",
  studentName,
  studentClass,
  children,
  buttonLabel,
}: StudentLayoutProps) {
  void buttonLabel;

  const pathname = usePathname();
  const router = useRouter();

  const [displayName, setDisplayName] = useState(studentName || "Murid");
  const [displayClass, setDisplayClass] = useState(
    studentClass || "Portal Murid / Orang Tua"
  );
  const [connectedStudent, setConnectedStudent] = useState<StudentProfile | null>(
    null
  );
  const [profileNote, setProfileNote] = useState("");

  useEffect(() => {
    let ignore = false;

    async function findStudentByLogin() {
      setProfileNote("");

      if (studentName && studentName !== "Murid") {
        setDisplayName(studentName);
        localStorage.setItem("hstkb_student_name", studentName);
      }

      if (studentClass && studentClass !== "Portal Murid / Orang Tua") {
        setDisplayClass(studentClass);
        localStorage.setItem("hstkb_student_class", studentClass);
      }

      const cachedName = localStorage.getItem("hstkb_student_name");
      const cachedClass = localStorage.getItem("hstkb_student_class");

      if (cachedName && !studentName) setDisplayName(cachedName);
      if (cachedClass && !studentClass) setDisplayClass(cachedClass);

      const { data: authData } = await supabase.auth.getUser();

      const authUserId = authData.user?.id || "";
      const email = (
        authData.user?.email ||
        localStorage.getItem("hstkb_demo_email") ||
        localStorage.getItem("hstkb_email") ||
        ""
      )
        .trim()
        .toLowerCase();

      if (!authUserId && !email) {
        if (!ignore) {
          setDisplayName("Murid");
          setDisplayClass("Data login belum ditemukan");
          setProfileNote("Silakan login ulang agar data murid dapat dimuat.");
        }
        return;
      }

      let student: StudentProfile | null = null;

      if (authUserId) {
        const { data } = await supabase
          .from("students")
          .select("id, full_name, level, grade, nis, nisn, email, user_id, parent_id")
          .eq("user_id", authUserId)
          .limit(1)
          .maybeSingle();

        student = (data as StudentProfile) || null;
      }

      if (!student && email) {
        const { data } = await supabase
          .from("students")
          .select("id, full_name, level, grade, nis, nisn, email, user_id, parent_id")
          .ilike("email", email)
          .limit(1)
          .maybeSingle();

        student = (data as StudentProfile) || null;
      }

      if (!student && email) {
        const { data: parent } = await supabase
          .from("parents")
          .select("id, full_name, email, phone")
          .ilike("email", email)
          .limit(1)
          .maybeSingle();

        const parentProfile = (parent as ParentProfile) || null;

        if (parentProfile?.id) {
          const { data } = await supabase
            .from("students")
            .select("id, full_name, level, grade, nis, nisn, email, user_id, parent_id")
            .eq("parent_id", parentProfile.id)
            .order("full_name", { ascending: true })
            .limit(1)
            .maybeSingle();

          student = (data as StudentProfile) || null;
        }
      }

      if (ignore) return;

      if (!student) {
        setConnectedStudent(null);
        setDisplayName("Data murid belum terhubung");
        setDisplayClass("Hubungkan akun login dengan data siswa");
        setProfileNote(
          "Akun ini belum terhubung ke data murid. Isi students.email atau students.user_id sesuai akun login, atau hubungkan parent_id untuk akun orang tua."
        );
        localStorage.removeItem("hstkb_student_name");
        localStorage.removeItem("hstkb_student_class");
        localStorage.removeItem("hstkb_active_student_id");
        return;
      }

      const name = student.full_name || "Murid";
      const classInfo = formatStudentSubInfo(student);

      setConnectedStudent(student);
      setDisplayName(name);
      setDisplayClass(classInfo);
      setProfileNote("");

      localStorage.setItem("hstkb_student_name", name);
      localStorage.setItem("hstkb_student_class", classInfo);
      localStorage.setItem("hstkb_active_student_id", student.id);
    }

    findStudentByLogin();

    return () => {
      ignore = true;
    };
  }, [studentName, studentClass]);

  async function handleLogout() {
    localStorage.removeItem("hstkb_demo_role");
    localStorage.removeItem("hstkb_demo_email");
    localStorage.removeItem("hstkb_full_name");
    localStorage.removeItem("hstkb_student_name");
    localStorage.removeItem("hstkb_student_class");
    localStorage.removeItem("hstkb_active_student_id");

    await supabase.auth.signOut();

    router.push("/");
  }

  const initials = useMemo(() => getInitials(displayName), [displayName]);

  return (
    <main className="min-h-screen bg-[#F6EFE6] text-[#2C1A17]">
      <div className="flex min-h-screen">
        <aside className="fixed left-0 top-0 z-40 flex h-screen w-[266px] flex-col bg-[#7A0016] text-white">
          <div className="flex h-[98px] items-center border-b border-white/10 px-5">
            <Link href="/student" className="flex items-center gap-3">
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
                  Portal Murid / Orang Tua
                </p>
              </div>
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4">
            <nav className="space-y-1.5">
              {menus.map((menu) => {
                const Icon = menu.icon;

                const isActive =
                  isMenuActive(pathname, menu) ||
                  isActiveMenuMatch(activeMenu, menu);

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
                        {menu.label}
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
                    {displayClass}
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
                    {displayClass}
                  </p>
                </div>
              </div>
            </div>
          </header>

          <div className="px-8 py-8">
            {profileNote ? (
              <div className="mb-5 rounded-2xl border border-yellow-200 bg-yellow-50 px-5 py-4 text-sm leading-6 text-yellow-800">
                {profileNote}
              </div>
            ) : null}

            {children}
            <AcademicFooter />
          </div>
        </section>
      </div>
    </main>
  );
}