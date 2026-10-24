"use client";

import { NavBarClient } from "@/components/NavBarClient";

/** หน้าแสดงเมื่อฝั่งเซิร์ฟเวอร์ error (ส่วนใหญ่คือเชื่อมฐานข้อมูลไม่ได้) */
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <>
      <NavBarClient user={null} />
      <main className="mx-auto max-w-[560px] px-4 py-28 text-center">
        <h1 className="display text-[32px]">ระบบยังใช้งานไม่ได้ตอนนี้</h1>
        <p className="mt-3 text-ink-2">
          เซิร์ฟเวอร์เชื่อมต่อฐานข้อมูลไม่ได้ ถ้าคุณเป็นผู้ดูแล ตรวจว่า MySQL เปิดอยู่ และ DATABASE_URL ใน .env.local ถูกต้อง
        </p>
        <button onClick={reset} className="btn-primary mt-8">
          ลองใหม่
        </button>
      </main>
    </>
  );
}
