import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { currentUser } from "@/lib/auth";
import { listUsers } from "@/lib/users";
import { CreateUserForm, UserList } from "./AdminClient";

export const metadata: Metadata = { title: "จัดการผู้ใช้" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const me = await currentUser();
  if (!me) redirect("/login?next=/admin");
  if (me.role !== "admin") redirect("/dashboard");

  const users = await listUsers();

  return (
    <>
      <NavBar />
      <main className="min-h-dvh bg-paper">
        <div className="mx-auto max-w-[760px] px-4 pb-24 pt-12">
          <h1 className="display text-[40px]">จัดการผู้ใช้</h1>
          <p className="mt-2 text-ink-2">สร้างบัญชีให้สตรีมเมอร์ แล้วให้เขาล็อกอินไปตั้งเลขพร้อมเพย์เองในแดชบอร์ด</p>

          <section className="mt-10">
            <h2 className="text-[22px] font-semibold tracking-tight">เพิ่มบัญชี</h2>
            <CreateUserForm />
          </section>

          <section className="mt-12">
            <h2 className="text-[22px] font-semibold tracking-tight">บัญชีทั้งหมด ({users.length})</h2>
            <UserList users={users} meId={me.id} />
          </section>
        </div>
      </main>
    </>
  );
}
