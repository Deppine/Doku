import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { DonateForm } from "./DonateForm";
import { findStreamer } from "@/lib/streamers";
import { maskPromptPay } from "@/lib/promptpay";
import { slipMode } from "@/lib/slip";
import { PageBackdrop } from "@/components/PageBackdrop";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = await findStreamer((await params).username);
  return { title: s ? `โดเนทให้ ${s.displayName}` : "ไม่พบหน้านี้" };
}

export default async function DonatePage({ params }: Props) {
  const streamer = await findStreamer((await params).username);
  if (!streamer) notFound();

  return (
    <>
      <NavBar />
      <main className="relative isolate min-h-dvh overflow-hidden bg-paper">
        <PageBackdrop />
        <div className="mx-auto max-w-[560px] px-4 pb-20 pt-12">
          <header className="text-center">
            <div
              aria-hidden
              className="mx-auto grid size-24 place-items-center rounded-full bg-red text-[40px] font-bold text-white shadow-[0_12px_30px_-10px_rgb(225_6_0/0.6)]"
            >
              {streamer.displayName.slice(0, 1).toUpperCase()}
            </div>
            <h1 className="display mt-5 text-[40px]">{streamer.displayName}</h1>
            <p className="mx-auto mt-2 max-w-[38ch] text-ink-2">{streamer.bio}</p>
          </header>

          {streamer.promptpayId ? (
            <DonateForm
              username={streamer.username}
              minAmount={streamer.minAmount}
              presets={streamer.presets}
              allowCustom={streamer.allowCustomAmount}
              receiver={{ name: streamer.promptpayName ?? "", id: maskPromptPay(streamer.promptpayId) }}
              slipMode={slipMode()}
            />
          ) : (
            <p className="mt-10 rounded-[24px] bg-surface p-6 text-center text-ink-2">
              {streamer.displayName} ยังไม่ได้เปิดรับโดเนท แวะมาใหม่ภายหลังนะ
            </p>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
