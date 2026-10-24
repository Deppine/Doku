import { notFound } from "next/navigation";
import { findStreamer } from "@/lib/streamers";
import { siteUrl } from "@/lib/site-url";

export const metadata = { title: "QR โดเนท" };
export const dynamic = "force-dynamic";

type Search = { label?: string; size?: string; theme?: string };

const SIZES = { s: 180, m: 260, l: 360 } as const;

/**
 * การ์ด QR สำหรับวางบนจอไลฟ์ (OBS Browser Source) พื้นหลังโปร่งใส
 *   ?size=s|m|l   ?label=ข้อความใต้ QR   ?theme=dark
 */
export default async function QrCard({ params, searchParams }: { params: Promise<{ username: string }>; searchParams: Promise<Search> }) {
  const { username } = await params;
  const sp = await searchParams;
  const streamer = await findStreamer(username);
  if (!streamer) notFound();

  const px = SIZES[(sp.size as keyof typeof SIZES) ?? "m"] ?? SIZES.m;
  const dark = sp.theme === "dark";
  const label = (sp.label ?? "สแกนเพื่อโดเนท").slice(0, 60);
  const host = (await siteUrl()).replace(/^https?:\/\//, "");

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div
        className="flex flex-col items-center rounded-[28px] p-5 text-center shadow-[0_12px_40px_rgb(0_0_0/0.35)]"
        style={{ background: dark ? "#1c1c1e" : "#ffffff", color: dark ? "#f5f5f7" : "#1d1d1f", width: px + 40 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/qr/${streamer.username}?size=${px * 2}`}
          alt={`QR หน้าโดเนทของ ${streamer.displayName}`}
          width={px}
          height={px}
          className="rounded-2xl bg-white"
        />
        <p className="mt-3 text-[20px] font-bold leading-tight" style={{ color: dark ? "#ff3b30" : "#e10600" }}>
          {label}
        </p>
        <p className="mt-1 max-w-full truncate text-[15px] font-semibold">{streamer.displayName}</p>
        <p className="mt-0.5 max-w-full truncate text-[12px] opacity-60">
          {host}/{streamer.username}
        </p>
      </div>
    </main>
  );
}
