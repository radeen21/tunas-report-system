import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HSTKB Report System",
  description: "Homeschooling Tunas Karya Bangsa Report System",
  icons: {
    icon: [
      {
        url: "/icon_hstkb_logo.png?v=20",
        type: "image/png",
      },
    ],
    shortcut: "/icon_hstkb_logo.png?v=20",
    apple: "/icon_hstkb_logo.png?v=20",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}