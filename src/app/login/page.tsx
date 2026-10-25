import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { currentUser, homeFor, safeNext } from "@/lib/auth";
import { LoginForm } from "./LoginForm";
import { registrationOpen } from "@/lib/users";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; expired?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const user = await currentUser().catch(() => null);
  if (user) redirect(next ?? homeFor(user.role));
  return (
    <>
      <NavBar />
      <main className="min-h-dvh bg-paper">
        <div className="mx-auto max-w-[400px] px-4 py-24 text-center">
          <h1 className="display text-[40px]">เข้าสู่ระบบ</h1>
          <p className="mt-3 text-ink-2 [text-wrap:balance]">สำหรับสตรีมเมอร์ ใช้จัดการหน้าโดเนทและวิดเจ็ต OBS</p>
          {sp.expired ? (
            <p role="status" className="mt-6 rounded-2xl bg-fill px-4 py-3 text-[14px] text-ink-2">ครบ 1 วันแล้ว ระบบออกจากระบบให้อัตโนมัติ กรุณาเข้าสู่ระบบอีกครั้ง</p>
          ) : null}
          <LoginForm next={next} canRegister={await registrationOpen()} />
        </div>
      </main>
    </>
  );
}
