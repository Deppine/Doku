import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { siteUrl } from "@/lib/site-url";
import { PROVIDER_LABEL, ttsProvider } from "@/lib/tts-server";
import { NavBar } from "@/components/NavBar";
import { findStreamerById } from "@/lib/streamers";
import { listDonations } from "@/lib/store";
import { currentUser } from "@/lib/auth";
import { baht } from "@/lib/format";
import { getGoal, streamerOverview } from "@/lib/streamer-stats";
import { CopyField, RegenerateWidgetButton } from "./DashboardClient";
import { QrSection } from "./QrSection";
import { SettingsForm } from "./SettingsForm";
import { SoundSettings } from "./SoundSettings";
import { AlertStylePicker, CopyButton, DonationList, GoalCard, SetupChecklist, TestButton } from "./StreamerParts";
import { DashboardShell, SettingBlock, type DashSection } from "./DashboardShell";
import { getSoundSettings, toClient } from "@/lib/alert-settings";
import { maskPromptPay } from "@/lib/promptpay";
import { PageBackdrop } from "@/components/PageBackdrop";

export const metadata: Metadata = { title: "แดชบอร์ด" };
export const dynamic = "force-dynamic";

const card = "rounded-[22px] bg-surface p-5 sm:p-6";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const welcome = (await searchParams).welcome === "1";
  const user = await currentUser();
  if (!user) redirect("/login?next=/dashboard");
  if (user.role === "admin") redirect("/admin"); // ผู้ดูแลใช้หน้าผู้ดูแลระบบอย่างเดียว
  const streamer = await findStreamerById(user.id);
  if (!streamer) redirect("/login");
  const base = await siteUrl();
  const provider = ttsProvider();
  const ttsLabel = provider ? PROVIDER_LABEL[provider] : null;

  const [donations, ov, sound, goal] = await Promise.all([
    listDonations(streamer.id, 50),
    streamerOverview(streamer.id),
    getSoundSettings(streamer.id),
    getGoal(streamer.id),
  ]);
  const widgetUrl = `${base}/widget/alert?token=${streamer.widgetToken}`;
  const goalUrl = `${base}/widget/goal?token=${streamer.widgetToken}`;
  const pageUrl = `${base}/${streamer.username}`;
  const pageHost = pageUrl.replace(/^https?:\/\//, "");
  const pending = user.status === "pending";

  const steps = [
    { label: "ตั้งเลขพร้อมเพย์", done: Boolean(streamer.promptpayId), href: "#receive" },
    { label: "ใส่วิดเจ็ตใน OBS", done: ov.widgetEverConnected, href: "#alert" },
    { label: "ทดสอบแจ้งเตือน", done: ov.alertTested, href: "#alert" },
    { label: "ได้รับโดเนทแรก", done: ov.allCount > 0, href: "#qr" },
  ];
  const up = (ov.todayDelta ?? 0) >= 0;

  const overview = (
    <>
          <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
            <div className="min-w-0 flex-[1_1_360px]">
              <div className="flex flex-wrap items-center gap-2.5 text-[14px] text-ink-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold ${ov.online ? "bg-ok/15 text-ok" : "bg-fill text-ink-2"}`}
                >
                  <span aria-hidden className={`size-2 rounded-full ${ov.online ? "bg-ok" : "bg-ink-3"}`} />
                  {ov.online ? "วิดเจ็ตใน OBS ออนไลน์" : "วิดเจ็ตใน OBS ยังไม่เปิด"}
                </span>
                <a href={pageUrl} target="_blank" rel="noreferrer" className="truncate text-ink-2 hover:text-ink">
                  {pageHost} ↗
                </a>
              </div>
            </div>
            <div className="flex flex-wrap items-start gap-2">
              <CopyButton value={pageUrl} label="คัดลอกลิงก์โดเนท" />
              <TestButton />
            </div>
          </div>

          {pending && (
            <div className="mt-6 rounded-[20px] border border-warn/40 bg-warn/10 px-5 py-4">
              <p className="font-semibold text-ink">บัญชีรอผู้ดูแลอนุมัติ</p>
              <p className="mt-1 text-[15px] text-ink-2">
                ตั้งค่าพร้อมเพย์และเสียงแจ้งเตือนไว้ก่อนได้เลย หน้าโดเนท /{streamer.username} และวิดเจ็ตจะเปิดใช้หลังได้รับอนุมัติ
              </p>
            </div>
          )}
          {welcome && !streamer.promptpayId && (
            <div className="mt-6 rounded-[20px] border border-red/30 bg-red-tint px-5 py-4">
              <p className="font-semibold text-ink">ยินดีต้อนรับ! เหลืออีกขั้นเดียว</p>
              <p className="mt-1 text-[15px] text-ink-2">
                ใส่เบอร์หรือเลขพร้อมเพย์ในเมนู <a href="#receive" className="link">ช่องทางรับเงิน</a> แล้วหน้าโดเนท /{streamer.username} จะเปิดใช้ได้ทันที
              </p>
            </div>
          )}

          <SetupChecklist steps={steps} userId={user.id} />

          <section aria-label="ตัวเลขหลัก" className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <Kpi
              label="วันนี้"
              value={`฿${baht(ov.today)}`}
              accent
              sub={ov.todayDelta === null ? "เมื่อวานยังไม่มียอด" : `${up ? "▲" : "▼"} ${Math.min(999, Math.abs(Math.round(ov.todayDelta * 100)))}% จากเมื่อวาน`}
              subTone={ov.todayDelta === null ? "muted" : up ? "ok" : "bad"}
            />
            <Kpi label="30 วัน" value={`฿${baht(ov.month)}`} sub={`${ov.monthCount.toLocaleString("th-TH")} รายการ`} />
            <Kpi label="ทั้งหมด" value={`฿${baht(ov.allTime)}`} sub={`${ov.allCount.toLocaleString("th-TH")} รายการ`} />
            <Kpi
              label="ผู้สนับสนุน 30 วัน"
              value={`${ov.supporters.toLocaleString("th-TH")} คน`}
              sub={ov.newSupporters ? `${ov.newSupporters} คนใหม่` : "นับจากชื่อที่ผู้โดเนทใส่"}
              subTone={ov.newSupporters ? "ok" : "muted"}
            />
          </section>

          <div className="mt-4 flex flex-wrap gap-4">
            <section aria-labelledby="feed-h" className={`${card} min-w-0 flex-[999_1_520px]`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="feed-h" className="text-[19px] font-semibold">
                  โดเนทล่าสุด
                </h2>
                <span className="text-[13px] text-ink-3">อัปเดตเองทุก 30 วินาที</span>
              </div>
              <DonationList items={donations} />
            </section>

            <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
              <section aria-labelledby="fans-h" className={card}>
                <h2 id="fans-h" className="text-[19px] font-semibold">
                  ผู้สนับสนุนอันดับต้น · 30 วัน
                </h2>
                {ov.fans.length === 0 ? (
                  <p className="mt-3 text-[14px] text-ink-3">ยังไม่มีผู้สนับสนุนที่ใส่ชื่อ</p>
                ) : (
                  <ol className="mt-2">
                    {ov.fans.map((f, i) => (
                      <li key={f.name} className="flex items-center gap-3 py-2">
                        <span className="w-5 text-center text-[13px] font-bold text-ink-3">{i + 1}</span>
                        <span className="min-w-0 flex-1 truncate font-semibold">{f.name}</span>
                        <span className="text-[12px] text-ink-3">{f.count} ครั้ง</span>
                        <span className="font-semibold tabular-nums">฿{baht(f.total)}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>
          </div>

    </>
  );

  const sections: DashSection[] = [
    {
      id: "overview",
      group: "ทั่วไป",
      label: "ภาพรวม",
      icon: "home",
      title: `สวัสดี ${streamer.displayName}`,
      content: overview,
    },
    {
      id: "receive",
      group: "การรับเงิน",
      label: "ช่องทางรับเงิน",
      icon: "wallet",
      title: "ช่องทางรับเงิน",
      desc: "บัญชีพร้อมเพย์ที่รับเงิน และหน้าตาหน้าโดเนทที่ผู้ชมเห็น",
      badge: streamer.promptpayId ? undefined : "!",
      content: (
        <div className="space-y-4">
          <SettingBlock
            icon="wallet"
            title="พร้อมเพย์และหน้าโดเนท"
            desc={
              <>
                <p>
                  {streamer.promptpayId
                    ? `ตอนนี้รับเงินเข้าพร้อมเพย์ ${maskPromptPay(streamer.promptpayId)} (${streamer.promptpayName})`
                    : "ยังไม่ได้ตั้งบัญชีรับเงิน หน้าโดเนทจะยังใช้ไม่ได้จนกว่าจะบันทึกพร้อมเพย์"}
                </p>
                <p className="mt-2">เงินเข้าบัญชีคุณโดยตรง ระบบตรวจสลิปของผู้ชมแล้วขึ้นจอให้อัตโนมัติ รองรับสลิปธนาคารและ TrueMoney</p>
              </>
            }
          >
            <SettingsForm
              initial={{
                displayName: streamer.displayName,
                bio: streamer.bio,
                promptpayId: streamer.promptpayId ?? "",
                promptpayName: streamer.promptpayName ?? "",
                minAmount: streamer.minAmount,
                presets: streamer.presets,
                allowCustomAmount: streamer.allowCustomAmount !== false,
              }}
            />
          </SettingBlock>
        </div>
      ),
    },
    {
      id: "qr",
      group: "การรับเงิน",
      label: "QR และลิงก์โดเนท",
      icon: "qr",
      title: "QR และลิงก์โดเนท",
      desc: "แชร์ลิงก์ หรือใช้ QR บนจอไลฟ์ให้ผู้ชมสแกนมาโดเนท",
      content: (
        <div className="space-y-4">
          <SettingBlock icon="page" title="ลิงก์หน้าโดเนท" desc="ใส่ไว้ในคำอธิบายไลฟ์ แชต หรือโซเชียล">
            <div className="[&>div]:bg-paper">
              <CopyField label="ลิงก์หน้าโดเนท" value={pageUrl} />
            </div>
          </SettingBlock>
          <SettingBlock icon="qr" title="QR หน้าโดเนท" desc="ดาวน์โหลดรูป หรือใส่เป็นวิดเจ็ตบนจอไลฟ์">
            {pending || !streamer.promptpayId ? (
              <p className="text-[14px] text-ink-2">
                {pending ? "QR จะใช้ได้หลังผู้ดูแลอนุมัติบัญชี" : "ตั้งพร้อมเพย์ในเมนูช่องทางรับเงินก่อน แล้ว QR จะพร้อมใช้"}
              </p>
            ) : (
              <QrSection username={streamer.username} pageUrl={pageUrl} cardUrl={`${base}/widget/qr/${streamer.username}`} compact />
            )}
          </SettingBlock>
        </div>
      ),
    },
    {
      id: "alert",
      group: "วิดเจ็ต OBS",
      label: "แจ้งเตือนบนจอ",
      icon: "bell",
      title: "แจ้งเตือนบนจอ",
      desc: "วิดเจ็ตที่เด้งขึ้นบนไลฟ์ทุกครั้งที่มีคนโดเนท",
      content: (
        <div className="space-y-4">
          <SettingBlock
            icon="bell"
            title="ลิงก์วิดเจ็ตแจ้งเตือน"
            desc="ใน OBS / Streamlabs / TikTok Live Studio เพิ่ม Browser Source ขนาด 1920 × 1080 แล้ววางลิงก์นี้ อย่าแชร์ลิงก์ให้คนอื่น"
          >
            <div className="[&>div]:bg-paper">
              <CopyField label="ลิงก์วิดเจ็ต (เก็บเป็นความลับ)" value={widgetUrl} secret />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <TestButton />
            </div>
            <p className="mt-3 text-[12px] text-ink-3">ปิดเสียงอ่านข้อความเฉพาะจอนี้ได้ด้วยการต่อท้ายลิงก์ &amp;tts=0</p>
            <RegenerateWidgetButton />
          </SettingBlock>
          <SettingBlock icon="page" title="รูปแบบแจ้งเตือน" desc="เลือกแล้วบันทึกทันที วิดเจ็ตใน OBS เปลี่ยนตามโดยไม่ต้องรีเฟรช">
            <AlertStylePicker initial={sound.alertStyle} />
          </SettingBlock>
        </div>
      ),
    },
    {
      id: "sound",
      group: "วิดเจ็ต OBS",
      label: "เสียงแจ้งเตือน",
      icon: "sound",
      title: "เสียงแจ้งเตือน",
      desc: "บันทึกแล้ววิดเจ็ตใน OBS ใช้เสียงใหม่ทันที ไม่ต้องรีเฟรช",
      content: (
        <div className="rounded-[22px] bg-surface p-5 sm:p-6">
          <SoundSettings initial={toClient(sound, null)} hasFile={Boolean(sound.soundFile)} serverVoice={ttsLabel} />
        </div>
      ),
    },
    {
      id: "goal",
      group: "วิดเจ็ต OBS",
      label: "เป้าหมายโดเนท",
      icon: "goal",
      title: "เป้าหมายโดเนท",
      desc: "หลอดเก็บเงินบนจอไลฟ์ ให้ผู้ชมช่วยกันเติมให้เต็ม",
      content: <GoalCard goal={goal} widgetUrl={goalUrl} />,
    },
  ];

  return (
    <>
      <NavBar />
      <main className="relative isolate min-h-dvh overflow-x-clip bg-paper">
        <PageBackdrop />
        <div className="mx-auto max-w-[1240px] px-4 pb-24 pt-6 sm:px-6 sm:pt-8">
          <DashboardShell sections={sections} />
        </div>
      </main>
    </>
  );
}

function Kpi({ label, value, sub, accent, subTone = "muted" }: { label: string; value: string; sub: string; accent?: boolean; subTone?: "ok" | "bad" | "muted" }) {
  return (
    <div className="min-w-0 rounded-[22px] bg-surface p-4 sm:p-5">
      <p className="text-[13px] text-ink-2">{label}</p>
      <p className={`amount mt-1 truncate text-[24px] sm:text-[30px] ${accent ? "text-red" : ""}`}>{value}</p>
      <p className={`mt-1 truncate text-[12px] font-semibold ${subTone === "ok" ? "text-ok" : subTone === "bad" ? "text-red" : "text-ink-3"}`}>{sub}</p>
    </div>
  );
}
