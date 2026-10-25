import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { currentUser } from "@/lib/auth";
import { listUsers, registrationNeedsApproval, registrationOpen } from "@/lib/users";
import { TTS_PLANS, USD_THB, adminStats, recentDonations, ttsUsageThisMonth, type TtsUsage } from "@/lib/admin-stats";
import { PROVIDER_LABEL, ttsProvider } from "@/lib/tts-server";
import { baht } from "@/lib/format";
import { CreateUserForm, UserList } from "./AdminClient";
import { DonationFeed } from "./AdminDonations";

export const metadata: Metadata = { title: "ผู้ดูแลระบบ" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const me = await currentUser();
  if (!me) redirect("/login?next=/admin");
  if (me.role !== "admin") redirect("/dashboard");

  const [users, stats, donations, tts] = await Promise.all([listUsers(), adminStats(), recentDonations(100), ttsUsageThisMonth()]);
  const provider = ttsProvider();
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

          {(provider || tts.tiers.length > 0) && <TtsUsageSection usage={tts} provider={provider} />}

          <section className="mt-12">
            <h2 className="text-[22px] font-semibold tracking-tight">โดเนทล่าสุด</h2>
            <p className="mt-1 text-[15px] text-ink-2">รายการที่ส่งสลิปแล้ว กดที่รายการเพื่อดูสลิปและเหตุผลที่ไม่ผ่าน</p>
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

const num = (n: number) => n.toLocaleString("th-TH");

function TtsUsageSection({ usage, provider }: { usage: TtsUsage; provider: ReturnType<typeof ttsProvider> }) {
  const p = provider ?? usage.tiers[0]?.provider ?? "google";
  const plans = TTS_PLANS[p];
  const tiers = (["standard", "premium"] as const)
    .map((tier) => {
      const used = usage.tiers.filter((t) => t.provider === p && t.tier === tier);
      const chars = used.reduce((a, t) => a + t.chars, 0);
      const requests = used.reduce((a, t) => a + t.requests, 0);
      const plan = plans[tier];
      const over = Math.max(0, chars - plan.free);
      const usd = plan.usdPerMillion == null ? null : (over / 1_000_000) * plan.usdPerMillion;
      return { tier, plan, chars, requests, pct: plan.free ? (chars / plan.free) * 100 : 0, usd };
    })
    .filter((t) => t.plan.free > 0 || t.chars > 0);
  const month = new Date().toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", month: "long", year: "numeric" });

  return (
    <section className="mt-12">
      <h2 className="text-[22px] font-semibold tracking-tight">เสียงอ่าน ({PROVIDER_LABEL[p]}) เดือน{month}</h2>
      <p className="mt-1 text-[15px] text-ink-2">
        ตัวอักษรที่ส่งไปสร้างเสียงอ่าน เทียบกับโควตาฟรีรายเดือน (ค่าประมาณจากระบบเรา ยอดคิดเงินจริงดูใน{" "}
        {p === "google" ? "Google Cloud → Billing" : "Azure Portal"})
      </p>
      {!usage.available ? (
        <p className="mt-4 rounded-[20px] bg-surface p-5 text-[15px] text-ink-2">ยังไม่มีตารางนับการใช้งาน ให้รัน npm run db:migrate</p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {tiers.map((t) => {
            const warn = t.pct >= 80;
            return (
              <div key={t.tier} className="rounded-[20px] bg-surface p-5">
                <p className="text-[13px] text-ink-2">{t.plan.label}</p>
                <p className={`amount mt-1 text-[26px] ${warn ? "text-red" : ""}`}>
                  {num(t.chars)} <span className="text-[14px] font-normal text-ink-3">/ {num(t.plan.free)} ตัวอักษร</span>
                </p>
                <div
                  className="mt-3 h-2 overflow-hidden rounded-full bg-fill"
                  role="progressbar"
                  aria-valuenow={Math.round(t.pct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className={`h-full rounded-full ${warn ? "bg-red" : "bg-[#1f9d55]"}`} style={{ width: `${Math.min(100, t.pct)}%` }} />
                </div>
                <p className={`mt-2 text-[12px] ${warn ? "font-medium text-red" : "text-ink-3"}`}>
                  ใช้ไป {t.pct < 0.01 && t.chars > 0 ? "<0.01" : t.pct.toFixed(t.pct < 10 ? 2 : 0)}% · {num(t.requests)} ครั้ง ·{" "}
                  {t.usd == null
                    ? "ราคาส่วนเกินดูใน Azure Portal"
                    : t.usd > 0
                      ? `ค่าใช้จ่ายประมาณ ฿${num(Math.ceil(t.usd * USD_THB))}`
                      : "ยังอยู่ในโควตาฟรี ฿0"}
                </p>
              </div>
            );
          })}
        </div>
      )}
      {usage.byStreamer.length > 0 && (
        <ul className="group-inset mt-3">
          {usage.byStreamer.map((s) => (
            <li key={s.username} className="flex items-center justify-between gap-4 px-4 py-2.5 text-[14px]">
              <span className="min-w-0 truncate">
                {s.displayName} <span className="text-ink-3">@{s.username}</span>
              </span>
              <span className="shrink-0 tabular-nums text-ink-2">
                {num(s.chars)} ตัวอักษร · {num(s.requests)} ครั้ง
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
