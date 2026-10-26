import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { currentUser } from "@/lib/auth";
import { TTS_PLANS, USD_THB, recentDonations, ttsUsageThisMonth, type TtsUsage } from "@/lib/admin-stats";
import { RANGES, adminUsers, dashboard, rejectedToday, systemStatus, toRange, topStreamers } from "@/lib/admin-dashboard";
import { PROVIDER_LABEL, ttsProvider } from "@/lib/tts-server";
import { baht } from "@/lib/format";
import { DonationFeed } from "./AdminDonations";
import { AccountsTable, ReviewQueue } from "./DashboardParts";
import { PageBackdrop } from "@/components/PageBackdrop";

export const metadata: Metadata = { title: "ผู้ดูแลระบบ" };
export const dynamic = "force-dynamic";

const card = "rounded-[22px] bg-surface p-5 sm:p-6";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const me = await currentUser();
  if (!me) redirect("/login?next=/admin");
  if (me.role !== "admin") redirect("/dashboard");

  const range = toRange((await searchParams).range);
  const [d, top, users, donations, tts, sys, rejected] = await Promise.all([
    dashboard(range),
    topStreamers(range),
    adminUsers(),
    recentDonations(100),
    ttsUsageThisMonth(),
    systemStatus(),
    rejectedToday(),
  ]);
  const provider = ttsProvider();
  const pending = users.filter((u) => u.status === "pending").length;
  const review = donations
    .filter((x) => x.status !== "verified" && x.slipCount > 0 && (x.lastIssue || x.status === "waiting"))
    .slice(0, 6);
  const rangeLabel = RANGES.find((r) => r.v === range)!.label;
  const dateText = new Date().toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const ttsTier = tts.tiers.filter((t) => t.tier === "standard").reduce((a, t) => a + t.chars, 0);
  const ttsFree = TTS_PLANS[provider ?? "google"].standard.free || 1;

  return (
    <>
      <NavBar />
      <main className="relative isolate min-h-dvh overflow-hidden bg-paper">
        <PageBackdrop />
        <div className="mx-auto max-w-[1280px] px-4 pb-24 pt-8 sm:px-6 sm:pt-10">
          <div id="overview" className="flex scroll-mt-20 flex-wrap items-end gap-4">
            <div className="min-w-0 flex-[1_1_320px]">
              <p className="text-[13px] text-ink-3">{dateText}</p>
              <h1 className="display text-[32px] sm:text-[36px]">ภาพรวมระบบ</h1>
            </div>
            <nav aria-label="ช่วงเวลา" className="inline-flex gap-1 rounded-full bg-fill p-1 text-[13px]">
              {RANGES.map((r) => (
                <Link
                  key={r.v}
                  href={r.v === "30d" ? "/admin" : `/admin?range=${r.v}`}
                  aria-current={r.v === range ? "page" : undefined}
                  scroll={false}
                  className={`rounded-full px-3.5 py-2 font-semibold transition-all ${
                    r.v === range ? "bg-chip text-ink shadow-[0_2px_6px_rgb(0_0_0/0.12)]" : "text-ink-2 hover:text-ink"
                  }`}
                >
                  {r.label}
                </Link>
              ))}
            </nav>
            <a href={`/api/admin/export?range=${range}`} className="rounded-full border border-line px-4 py-2.5 text-[14px] font-semibold text-ink hover:bg-fill">
              ส่งออก CSV
            </a>
          </div>

          <nav aria-label="ส่วนของหน้า" className="mt-4 flex flex-wrap gap-1 text-[14px]">
            {[
              ["#overview", "ภาพรวม"],
              ["#donations", "โดเนท"],
              ["#accounts", "สตรีมเมอร์"],
              ["#system", "ระบบ"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="rounded-full px-3.5 py-1.5 text-ink-2 hover:bg-fill hover:text-ink">
                {label}
              </a>
            ))}
          </nav>

          {(pending > 0 || rejected > 0) && (
            <div className="mt-4 flex flex-wrap gap-2.5">
              {pending > 0 && (
                <a href="#accounts" className="flex min-h-11 items-center gap-2.5 rounded-2xl bg-warn/15 px-4 text-[14px] text-ink">
                  <span aria-hidden className="size-2 rounded-full bg-warn" />
                  <span>
                    <b>{pending} บัญชี</b> รออนุมัติ
                  </span>
                  <span className="text-ink-3">ดู →</span>
                </a>
              )}
              {rejected > 0 && (
                <a href="#review" className="flex min-h-11 items-center gap-2.5 rounded-2xl bg-red/12 px-4 text-[14px] text-ink">
                  <span aria-hidden className="size-2 rounded-full bg-red" />
                  <span>
                    <b>{rejected} รายการ</b> สลิปไม่ผ่านวันนี้ ต้องตรวจ
                  </span>
                  <span className="text-ink-3">ดู →</span>
                </a>
              )}
            </div>
          )}

          <section aria-label="ตัวเลขหลัก" className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <Kpi label="ยอดวันนี้" value={`฿${baht(d.today.total)}`} accent delta={d.today.delta} deltaText="จากเมื่อวาน" spark={d.today.spark} />
            <Kpi label={`ยอด ${rangeLabel}`} value={`฿${baht(d.period.total)}`} delta={range === "today" ? d.today.delta : d.period.delta} deltaText={range === "today" ? "จากเมื่อวาน" : `จาก ${rangeLabel} ก่อน`} spark={d.period.spark} />
            <Kpi label="โดเนทที่ผ่าน" value={d.verified.count.toLocaleString("th-TH")} note={d.verified.count ? `เฉลี่ย ฿${baht(Math.round(d.verified.avg))} ต่อรายการ` : "ยังไม่มีรายการ"} spark={d.verified.spark} />
            <Kpi
              label="อัตราสลิปผ่าน"
              value={d.passRate.value === null ? "-" : `${Math.round(d.passRate.value * 100)}%`}
              delta={d.passRate.delta}
              deltaText="จากช่วงก่อน"
              points
              note={d.passRate.value === null ? "ยังไม่มีการส่งสลิป" : undefined}
            />
          </section>

          <div className="mt-4 flex flex-wrap gap-4">
            <section aria-labelledby="chart-h" className={`${card} min-w-0 flex-[999_1_560px]`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="chart-h" className="text-[19px] font-semibold">
                  {range === "today" ? "ยอดโดเนทรายชั่วโมง" : "ยอดโดเนทรายวัน"}
                </h2>
                <p className="text-[13px] text-ink-3">{rangeLabel} · เฉพาะรายการที่ผ่าน</p>
              </div>
              <Chart values={d.chart} from={d.from} size={d.chartSize} hourly={range === "today"} />
            </section>

            <section aria-labelledby="top-h" className={`${card} min-w-0 flex-[1_1_320px]`}>
              <h2 id="top-h" className="text-[19px] font-semibold">
                สตรีมเมอร์ · {rangeLabel}
              </h2>
              {top.length === 0 ? (
                <p className="mt-4 text-[15px] text-ink-3">ยังไม่มีโดเนทในช่วงนี้</p>
              ) : (
                <ol className="mt-3">
                  {top.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 py-2.5">
                      <span aria-hidden className="relative grid size-10 shrink-0 place-items-center rounded-full bg-red font-semibold text-white">
                        {s.displayName.slice(0, 1).toUpperCase()}
                        <span className={`absolute -bottom-px -right-px size-3 rounded-full border-2 border-surface ${s.online ? "bg-[#30d158]" : "bg-ink-3"}`} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">
                          {s.displayName}
                          {s.online && <span className="sr-only"> (วิดเจ็ตเปิดอยู่)</span>}
                        </p>
                        <p className="text-[12px] text-ink-3">{s.count.toLocaleString("th-TH")} รายการ</p>
                        <div aria-hidden className="mt-1.5 h-1 rounded-full bg-fill">
                          <div className="h-1 rounded-full bg-red" style={{ width: `${Math.max(3, (s.total / top[0].total) * 100)}%` }} />
                        </div>
                      </div>
                      <span className="font-semibold tabular-nums">฿{baht(s.total)}</span>
                    </li>
                  ))}
                </ol>
              )}
              <p className="mt-2 text-[12px] text-ink-3">จุดเขียว = วิดเจ็ตใน OBS เปิดอยู่ตอนนี้</p>
            </section>
          </div>

          <div className="mt-4 flex flex-wrap gap-4">
            <section id="review" aria-labelledby="review-h" className={`${card} min-w-0 flex-[999_1_560px] scroll-mt-20`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="review-h" className="text-[19px] font-semibold">
                  ต้องตรวจ
                </h2>
                <a href="#donations" className="text-[14px] font-semibold">
                  ดูรายการทั้งหมด
                </a>
              </div>
              <ReviewQueue items={review} />
            </section>

            <section id="system" aria-labelledby="sys-h" className={`${card} min-w-0 flex-[1_1_320px] scroll-mt-20`}>
              <h2 id="sys-h" className="text-[19px] font-semibold">
                สถานะระบบ
              </h2>
              <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-3 gap-y-3 text-[14px]">
                <dt className="text-ink-2">ฐานข้อมูล</dt>
                <dd className={`font-semibold ${sys.dbMs < 300 ? "text-ok" : "text-warn"}`}>ปกติ · {sys.dbMs} ms</dd>
                <dt className="text-ink-2">อ่านสลิป (เฉลี่ย 24 ชม.)</dt>
                <dd className="font-semibold">{sys.slipAvgMs === null ? "-" : `${(sys.slipAvgMs / 1000).toFixed(1)} วินาที`}</dd>
                <dt className="text-ink-2">วิดเจ็ตที่เปิดอยู่</dt>
                <dd className="font-semibold">
                  {sys.widgetsOnline} / {sys.activeStreamers} คน
                </dd>
              </dl>
              {provider && (
                <div className="mt-4 border-t border-line pt-4">
                  <div className="flex justify-between gap-2 text-[14px]">
                    <span className="text-ink-2">เสียงอ่าน {PROVIDER_LABEL[provider]} เดือนนี้</span>
                    <a href="#tts" className="font-semibold">
                      {((ttsTier / ttsFree) * 100).toFixed(ttsTier / ttsFree < 0.1 ? 2 : 0)}%
                    </a>
                  </div>
                  <div aria-hidden className="mt-2 h-2 rounded-full bg-fill">
                    <div className="h-2 rounded-full bg-[#30d158]" style={{ width: `${Math.min(100, Math.max(1, (ttsTier / ttsFree) * 100))}%` }} />
                  </div>
                  <p className="mt-1.5 text-[12px] text-ink-3">
                    {ttsTier.toLocaleString("th-TH")} / {ttsFree.toLocaleString("th-TH")} ตัวอักษร (เสียงมาตรฐาน)
                  </p>
                </div>
              )}
            </section>
          </div>

          <section id="accounts" aria-label="บัญชี" className={`${card} mt-4 scroll-mt-20`}>
            <AccountsTable users={users} meId={me.id} />
          </section>

          <section id="donations" className="mt-12 scroll-mt-20">
            <h2 className="text-[22px] font-semibold tracking-tight">โดเนทล่าสุด</h2>
            <p className="mt-1 text-[15px] text-ink-2">รายการที่ส่งสลิปแล้ว กดที่รายการเพื่อดูสลิปและเหตุผลที่ไม่ผ่าน</p>
            <DonationFeed items={donations} />
          </section>

          {(provider || tts.tiers.length > 0) && (
            <div id="tts" className="scroll-mt-20">
              <TtsUsageSection usage={tts} provider={provider} />
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function Kpi({
  label,
  value,
  accent,
  delta,
  deltaText,
  note,
  spark,
  points,
}: {
  label: string;
  value: string;
  accent?: boolean;
  delta?: number | null;
  deltaText?: string;
  note?: string;
  spark?: number[];
  points?: boolean; // delta เป็นสัดส่วน (0.04 = 4 จุด) ไม่ใช่เปอร์เซ็นต์เปลี่ยนแปลง
}) {
  const up = (delta ?? 0) >= 0;
  const show = delta !== undefined && delta !== null && !note;
  const max = Math.max(...(spark ?? [0]), 1);
  return (
    <div className="min-w-0 rounded-[22px] bg-surface p-4 sm:p-5">
      <p className="text-[13px] text-ink-2">{label}</p>
      <p className={`amount mt-1 truncate text-[24px] sm:text-[30px] ${accent ? "text-red" : ""}`}>{value}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className={`min-w-0 truncate text-[12px] font-semibold ${show ? (up ? "text-ok" : "text-red") : "text-ink-3"}`}>
          {show
            ? `${up ? "▲" : "▼"} ${Math.abs(delta as number) > 9.99 && !points ? ">999" : Math.abs(Math.round((delta as number) * 100))}${points ? " จุด" : "%"} ${deltaText ?? ""}`
            : (note ?? (deltaText ? "ช่วงก่อนยังไม่มียอดให้เทียบ" : ""))}
        </p>
        {spark && (
          <div aria-hidden className="flex h-7 shrink-0 items-end gap-0.5">
            {spark.map((v, i) => (
              <span
                key={i}
                className={`w-[5px] rounded-sm ${i === spark.length - 1 ? (accent ? "bg-red" : "bg-ink-2") : "bg-ink-3/30"}`}
                style={{ height: `${Math.max(3, Math.round((v / max) * 28))}px` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Chart({ values, from, size, hourly }: { values: number[]; from: number; size: number; hourly: boolean }) {
  const max = Math.max(...values, 0);
  const label = (i: number) => {
    const t = new Date((from + i * size) * 1000);
    return hourly
      ? t.toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" })
      : t.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short" });
  };
  const peak = values.indexOf(max);
  const total = values.reduce((a, b) => a + b, 0);
  const ticks = [0, Math.floor((values.length - 1) / 2), values.length - 1];
  const axis = (v: number) => (v >= 1000 ? `฿${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `฿${Math.round(v)}`);
  return (
    <div
      role="img"
      aria-label={max > 0 ? `กราฟแท่งยอดโดเนท รวม ฿${baht(total)} สูงสุด ${label(peak)} ฿${baht(max)}` : "ยังไม่มียอดโดเนทในช่วงนี้"}
      className="mt-5 grid grid-cols-[44px_1fr] gap-2"
    >
      <div aria-hidden className="flex h-[200px] flex-col justify-between text-right text-[11px] text-ink-3">
        <span>{axis(max)}</span>
        <span>{axis(max / 2)}</span>
        <span>฿0</span>
      </div>
      <div className="relative h-[200px] border-b border-line">
        <div aria-hidden className="absolute inset-x-0 top-0 border-t border-dashed border-line" />
        <div aria-hidden className="absolute inset-x-0 top-[100px] border-t border-dashed border-line" />
        <div className="absolute inset-0 flex items-end gap-[3px]">
          {values.map((v, i) => (
            <span
              key={i}
              title={`${label(i)} · ฿${baht(v)}`}
              className={`min-w-0 flex-1 rounded-t ${i === peak && max > 0 ? "bg-red" : "bg-ink-3/30"}`}
              style={{ height: max > 0 ? `${Math.max(v > 0 ? 3 : 1, (v / max) * 196)}px` : "1px" }}
            />
          ))}
        </div>
        {max === 0 && <p className="absolute inset-0 grid place-items-center text-[14px] text-ink-3">ยังไม่มียอดโดเนทในช่วงนี้</p>}
      </div>
      <span />
      <div aria-hidden className="flex justify-between text-[11px] text-ink-3">
        {ticks.map((i) => (
          <span key={i}>{label(i)}</span>
        ))}
      </div>
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
