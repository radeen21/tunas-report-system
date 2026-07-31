"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import KepalaSekolahLayout from "../components/KepalaSekolahLayout";

export default function KepalaSekolahAlokasiWaktuPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/kepalaSekolah");
  }, [router]);

  return (
    <KepalaSekolahLayout
      activeMenu={"Dashboard" as any}
      searchPlaceholder="Cari data..."
    >
      <section className="rounded-[22px] border border-[#E1CFBE] bg-white p-8 shadow-sm">
        <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#8A5A48]">
          Menu Dinonaktifkan
        </p>

        <h1 className="mt-2 text-[28px] font-extrabold text-[#2B1B18]">
          Alokasi Waktu Tidak Digunakan
        </h1>

        <p className="mt-3 max-w-[720px] text-[15px] leading-6 text-[#6F5549]">
          Menu Alokasi Waktu sudah tidak dipakai dalam flow terbaru. Sistem akan
          diarahkan kembali ke dashboard.
        </p>
      </section>
    </KepalaSekolahLayout>
  );
}