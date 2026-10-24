import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { APP_NAME } from "@/lib/format";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${APP_NAME} — โดเนทขึ้นจอ เงินเข้าพร้อมเพย์ตรง`, template: `%s | ${APP_NAME}` },
  description: "รับโดเนทขึ้นจอไลฟ์ เงินโอนเข้าพร้อมเพย์ของสตรีมเมอร์โดยตรง ตรวจสลิปอัตโนมัติ",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // ธีมที่ผู้ใช้เลือกเก็บในคุกกี้ อ่านฝั่งเซิร์ฟเวอร์ได้เลย ไม่ต้องใช้สคริปต์ (ไม่มีหน้าจอกะพริบ)
  const t = (await cookies()).get("theme")?.value;
  const theme = t === "dark" || t === "light" ? t : undefined;
  return (
    <html lang="th" data-theme={theme} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Anuphan:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
