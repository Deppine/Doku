import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { currentUser, homeFor, safeNext } from "@/lib/auth";
import { LoginForm } from "./LoginForm";
import { registrationOpen } from "@/lib/users";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const user = await currentUser().catch(() => null);
  if (user) redirect(next ?? homeFor(user.role));
  return (
    <>
      <NavBar />
      <main className="min-h-dvh bg-paper">
        <div className="mx-auto max-w-[400px] px-4 py-24 text-center">
          <h1 className="display text-[40px]">เข้าสู่ระบบ</h1>
          <p className="mt-3 text-ink-2 [text-wrap:balance]">สำหรับสตรีมเมอร์ ใช้จัดการหน้าโดเนทและวิดเจ็ต OBS</p>
          <LoginForm next={next} canRegister={registrationOpen()} />
        </div>
      </main>
    </>
  );
}
