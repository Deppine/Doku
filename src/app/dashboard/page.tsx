import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { siteUrl } from "@/lib/site-url";
import { PROVIDER_LABEL, ttsProvider } from "@/lib/tts-server";
import { NavBar } from "@/components/NavBar";
import { findStreamerById } from "@/lib/streamers";
import { donationTotals, listDonations } from "@/lib/store";
import { currentUser } from "@/lib/auth";
import { baht } from "@/lib/format";
import { CopyField, LogoutButton, RegenerateWidgetButton, TestAlertButton } from "./DashboardClient";
import { QrSection } from "./QrSection";
import { SettingsForm } from "./SettingsForm";
import { SoundSettings } from "./SoundSettings";
import { getSoundSettings, toClient } from "@/lib/alert-settings";
import { maskPromptPay } from "@/lib/promptpay";

export const metadata: Metadata = { title: "แดชบอร์ด" };
export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const welcome = (await searchParams).welcome === "1";
  const user = await currentUser();
  if (!user) redirect("/login?next=/dashboard");
  const streamer = await findStreamerById(user.id);
  if (!streamer) redirect("/login");
  const base = await siteUrl();
  const provider = ttsProvider();
  const ttsLabel = provider ? PROVIDER_LABEL[provider] : null;

  const [donations, totals, sound] = await Promise.all([listDonations(streamer.id), donationTotals(streamer.id), getSoundSettings(streamer.id)]);
  const total = totals.total;
  const widgetUrl = `${base}/widget/alert?token=${streamer.widgetToken}`;
  const pageUrl = `${base}/${streamer.username}`;

  return (
    <>
      <NavBar />
      <main className="min-h-dvh bg-paper">
        <div className="mx-auto max-w-[760px] px-4 pb-24 pt-12">
          <div className="flex items-start justify-between gap-4">
            <h1 className="display text-[40px]">สวัสดี {streamer.displayName}</h1>
            <LogoutButton />
          </div>
          {user.status === "pending" && (
            <div className="mt-6 rounded-[20px] border border-[#f5a623]/40 bg-[#f5a623]/10 px-5 py-4">
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
                ใส่เบอร์หรือเลขพร้อมเพย์ในส่วน <a href="#settings" className="link">ตั้งค่า</a> ด้านล่าง แล้วหน้าโดเนท /{streamer.username} จะเปิดใช้ได้ทันที
              </p>
            </div>
          )}

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[24px] bg-surface p-6">
              <p className="text-[15px] text-ink-2">ยอดโดเนททั้งหมด</p>
              <p className="amount mt-2 text-[48px] text-red">฿{baht(total)}</p>
            </div>
            <div className="rounded-[24px] bg-surface p-6">
              <p className="text-[15px] text-ink-2">จำนวนรายการ</p>
              <p className="amount mt-2 text-[48px]">{totals.count}</p>
            </div>
          </div>

          <section className="mt-10">
            <h2 className="text-[22px] font-semibold tracking-tight">วิดเจ็ตแจ้งเตือนใน OBS</h2>
            <p className="mt-1 text-[15px] text-ink-2">
              เพิ่ม Browser Source ขนาด 1920 × 1080 แล้ววางลิงก์นี้ อย่าแชร์ลิงก์ให้คนอื่น
            </p>
            <p className="mt-1 text-[13px] text-ink-3">
              อยากได้แจ้งเตือนแบบการ์ดขาว ให้ต่อท้ายลิงก์ด้วย &amp;style=card · ปิดเสียงอ่านข้อความด้วย &amp;tts=0
            </p>
            <div className="mt-4 space-y-3">
              <CopyField label="ลิงก์วิดเจ็ต" value={widgetUrl} secret />
              <CopyField label="หน้าโดเนท" value={pageUrl} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <TestAlertButton />
              <RegenerateWidgetButton />
            </div>
          </section>

          <section id="qr" className="mt-12 scroll-mt-16">
            <h2 className="text-[22px] font-semibold tracking-tight">QR หน้าโดเนท</h2>
            <p className="mt-1 text-[15px] text-ink-2">ผู้ชมสแกนแล้วเข้าหน้าโดเนทของคุณทันที ใช้ขึ้นจอไลฟ์ โพสต์ หรือพิมพ์ติดโต๊ะได้</p>
            {user.status === "pending" || !streamer.promptpayId ? (
              <p className="mt-4 rounded-[24px] bg-surface p-6 text-ink-2">
                {user.status === "pending" ? "QR จะใช้ได้หลังผู้ดูแลอนุมัติบัญชี" : "ตั้งพร้อมเพย์ในส่วนตั้งค่าก่อน แล้ว QR จะพร้อมใช้"}
              </p>
            ) : (
              <QrSection username={streamer.username} pageUrl={pageUrl} cardUrl={`${base}/widget/qr/${streamer.username}`} />
            )}
          </section>

          <section id="sound" className="mt-12 scroll-mt-16">
            <h2 className="text-[22px] font-semibold tracking-tight">เสียงแจ้งเตือน</h2>
            <p className="mt-1 text-[15px] text-ink-2">บันทึกแล้ววิดเจ็ตใน OBS ใช้เสียงใหม่ทันที ไม่ต้องรีเฟรช</p>
            <SoundSettings initial={toClient(sound, null)} hasFile={Boolean(sound.soundFile)} serverVoice={ttsLabel} />
          </section>

          <section id="settings" className="mt-12 scroll-mt-16">
            <h2 className="text-[22px] font-semibold tracking-tight">ตั้งค่า</h2>
            <p className="mt-1 text-[15px] text-ink-2">
              {streamer.promptpayId
                ? `ตอนนี้รับเงินเข้าพร้อมเพย์ ${maskPromptPay(streamer.promptpayId)} (${streamer.promptpayName})`
                : "ยังไม่ได้ตั้งบัญชีรับเงิน หน้าโดเนทจะยังใช้ไม่ได้จนกว่าจะบันทึกพร้อมเพย์"}
            </p>
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
          </section>

          <section className="mt-12">
            <h2 className="text-[22px] font-semibold tracking-tight">รายการล่าสุด</h2>
            {donations.length === 0 ? (
              <p className="mt-4 rounded-[24px] bg-surface p-6 text-ink-2">
                ยังไม่มีโดเนท แชร์หน้าโดเนทให้ผู้ชม หรือกดทดสอบแจ้งเตือนเพื่อเช็คหน้าจอ
              </p>
            ) : (
              <ul className="group-inset mt-4">
                {donations.map((d) => (
                  <li key={d.ref} className="flex items-start justify-between gap-4 px-5 py-4">
                    <div className="min-w-0">
                      <p className="font-semibold">{d.donorName}</p>
                      {d.message && <p className="mt-0.5 text-[15px] text-ink-2">{d.message}</p>}
                      <p className="mt-1 text-[12px] text-ink-3">
                        {new Date(d.createdAt).toLocaleString("th-TH")} · อ้างอิง {d.ref}
                      </p>
                    </div>
                    <p className="amount shrink-0 text-[24px] text-red">฿{baht(d.amount)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
