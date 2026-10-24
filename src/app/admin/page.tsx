import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { currentUser } from "@/lib/auth";
import { listUsers, registrationNeedsApproval, registrationOpen } from "@/lib/users";
import { adminStats, recentDonations } from "@/lib/admin-stats";
import { baht } from "@/lib/format";
import { CreateUserForm, UserList } from "./AdminClient";
import { DonationFeed } from "./AdminDonations";

export const metadata: Metadata = { title: "ผู้ดูแลระบบ" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const me = await currentUser();
  if (!me) redirect("/login?next=/admin");
  if (me.role !== "admin") redirect("/dashboard");

  const [users, stats, donations] = await Promise.all([listUsers(), adminStats(), recentDonations(50)]);
  const pending = users.filter((u) => u.status === "pending");
  const others = users.filter((u) => u.status !== "pending");
  const regText = !registrationOpen()
    ? "ปิดรับสมัคร: สร้างบัญชีได้จากหน้านี้อย่างเดียว"
    : registrationNeedsApproval()
      ? "เปิดรับสมัคร: คนที่สมัครเองต้องรอคุณอนุมัติก่อนหน้าโดเนทจะเปิด"
      : "เปิดรับสมัคร: คนที่สมัครเองใช้งานได้ทันที";

  return (
    <>
      <NavBar />
      <main className="min-h-dvh bg-paper">
        <div className="mx-auto max-w-[860px] px-4 pb-24 pt-12">
          <h1 className="display text-[40px]">ผู้ดูแลระบบ</h1>
          <p className="mt-2 text-ink-2">ภาพรวมโดเนท ตรวจรายการที่มีปัญหา และจัดการบัญชีสตรีมเมอร์</p>

          <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="ภาพรวม">
            <Stat label="วันนี้" value={`฿${baht(stats.todayTotal)}`} sub={`${stats.todayCount} รายการ`} accent />
            <Stat label="เดือนนี้" value={`฿${baht(stats.monthTotal)}`} sub={`${stats.monthCount} รายการ`} />
            <Stat label="สตรีมเมอร์ที่เปิดรับ" value={String(stats.activeStreamers)} sub={stats.pendingUsers ? `รออนุมัติ ${stats.pendingUsers}` : "ไม่มีรออนุมัติ"} warn={stats.pendingUsers > 0} />
            <Stat label="สลิปไม่ผ่าน 7 วัน" value={String(stats.rejected7d)} sub="ดูเหตุผลในรายการด้านล่าง" warn={stats.rejected7d > 0} />
          </section>

          {pending.length > 0 && (
            <section className="mt-12">
              <h2 className="text-[22px] font-semibold tracking-tight">รออนุมัติ ({pending.length})</h2>
              <p className="mt-1 text-[15px] text-ink-2">สมัครเองผ่านหน้าเว็บ ถ้าไม่รู้จักให้ระงับหรือลบ หน้าโดเนทของบัญชีเหล่านี้ยังไม่เปิด</p>
              <UserList users={pending} meId={me.id} />
            </section>
          )}

          <section className="mt-12">
            <h2 className="text-[22px] font-semibold tracking-tight">โดเนทล่าสุด</h2>
            <p className="mt-1 text-[15px] text-ink-2">50 รายการล่าสุดของทุกสตรีมเมอร์ กดที่รายการเพื่อดูสลิปและเหตุผลที่ไม่ผ่าน</p>
            <DonationFeed items={donations} />
          </section>

          <section className="mt-12">
            <h2 className="text-[22px] font-semibold tracking-tight">บัญชีทั้งหมด ({others.length})</h2>
            <p className="mt-1 text-[13px] text-ink-3">{regText}</p>
            <UserList users={others} meId={me.id} />
          </section>

          <section className="mt-12">
            <h2 className="text-[22px] font-semibold tracking-tight">เพิ่มบัญชี</h2>
            <CreateUserForm />
          </section>
        </div>
      </main>
    </>
  );
}

function Stat({ label, value, sub, accent, warn }: { label: string; value: string; sub: string; accent?: boolean; warn?: boolean }) {
  return (
    <div className="min-w-0 rounded-[20px] bg-surface p-4 sm:p-5">
      <p className="text-[13px] text-ink-2">{label}</p>
      <p className={`amount mt-1 truncate text-[26px] sm:text-[28px] ${accent ? "text-red" : ""}`}>{value}</p>
      <p className={`mt-1 truncate text-[12px] ${warn ? "font-medium text-red" : "text-ink-3"}`}>{sub}</p>
    </div>
  );
}
