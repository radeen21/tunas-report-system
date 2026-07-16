import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type ActiveMenu =
  | "Dashboard Saya"
  | "Jadwal Belajar"
  | "Materi"
  | "Tugas & Hasil"
  | "Progress Saya"
  | "Laporan Saya"
  | "Gallery";

type Props = {
  activeMenu: ActiveMenu;
  children: ReactNode;
};

const menus = [
  { name: "Dashboard Saya", icon: "▦", href: "/student" },
  { name: "Jadwal Belajar", icon: "📅", href: "/student/schedule" },
  { name: "Materi", icon: "📖", href: "/student/materi" },
  { name: "Tugas & Hasil", icon: "📋", href: "/student/tugas" },
  { name: "Progress Saya", icon: "⌁", href: "/student/progress" },
  { name: "Laporan Saya", icon: "📄", href: "/student/laporan" },
  { name: "Gallery", icon: "🖼️", href: "/student/gallery" },
] as const;

export default function StudentLayout({ activeMenu, children }: Props) {
  return (
    <main className="min-h-screen bg-[#FAF3EA] text-[#2B1B18]">
      <header className="sticky top-0 z-20 border-b border-[#E8D6C1] bg-[#FAF3EA]">
        <div className="mx-auto flex h-[82px] max-w-[1300px] items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-[#E8D6C1]">
              <Image
                src="/icon_hstkb_logo.png"
                alt="Homeschooling Tunas Karya Bangsa"
                width={160}
                height={60}
                className="absolute left-0 top-1/2 h-11 w-auto -translate-y-1/2"
                priority
              />
            </div>

            <div>
              <p className="text-sm font-bold">HSTKB</p>
              <p className="text-xs leading-tight text-[#6B4A3A]">
                Management
                <br />
                Sekolah
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            {menus.map((menu) => {
              const isActive = menu.name === activeMenu;

              return (
                <Link
                  key={menu.name}
                  href={menu.href}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    isActive
                      ? "bg-[#F1DFD5] text-[#7A1F2B]"
                      : "text-[#6B4A3A] hover:bg-[#F1DFD5] hover:text-[#7A1F2B]"
                  }`}
                >
                  <span className="mr-2">{menu.icon}</span>
                  {menu.name}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-4">
            <button
              type="button"
              className="relative text-[#7A1F2B] hover:text-[#54131D]"
            >
              🔔
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#D96B2B]" />
            </button>

            <div className="flex items-center gap-3 rounded-full border border-[#E8D6C1] bg-white px-3 py-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FDE7D7] text-xs font-bold text-[#7A1F2B]">
                JW
              </div>

              <div>
                <p className="text-sm font-bold">Jonathan Wijaya</p>
                <p className="text-xs text-[#6B4A3A]">Student</p>
              </div>
            </div>

            <button type="button" className="text-[#7A1F2B]">
              ↪
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1200px] px-6 py-8">
        {children}
      </section>
    </main>
  );
}