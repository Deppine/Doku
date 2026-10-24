import Link from "next/link";
import { NavBar } from "@/components/NavBar";

export default function NotFound() {
  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-[560px] px-4 py-28 text-center">
        <p className="amount text-[96px] text-red">404</p>
        <h1 className="display mt-4 text-[32px]">ไม่พบหน้านี้</h1>
        <p className="mt-3 text-ink-2">ชื่อผู้ใช้อาจพิมพ์ผิด ลองเช็คลิงก์จากสตรีมเมอร์อีกครั้ง</p>
        <Link href="/" className="btn-primary mt-8">กลับหน้าแรก</Link>
      </main>
    </>
  );
}
