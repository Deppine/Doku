import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { currentUser, homeFor } from "@/lib/auth";
import { registrationOpen } from "@/lib/users";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "สมัครสมาชิก" };
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const user = await currentUser().catch(() => null);
  if (user) redirect(homeFor(user.role));
  const open = await registrationOpen();

  return (
    <>
      <NavBar />
      <main className="min-h-dvh bg-paper">
        <div className="mx-auto max-w-[400px] px-4 py-20 text-center">
          <h1 className="display text-[40px]">สมัครสมาชิก</h1>
          <p className="mt-3 text-ink-2 [text-wrap:balance]">สร้างหน้ารับโดเนทของคุณ เงินเข้าพร้อมเพย์ของคุณโดยตรง</p>
          {open ? (
            <RegisterForm />
          ) : (
            <p className="mt-8 rounded-[20px] bg-surface p-6 text-ink-2">ตอนนี้ปิดรับสมัคร ติดต่อผู้ดูแลเพื่อขอบัญชี</p>
          )}
          <p className="mt-6 text-[15px] text-ink-2">
            มีบัญชีแล้ว?{" "}
            <Link href="/login" className="link">
              เข้าสู่ระบบ
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
