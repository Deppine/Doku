import type { Metadata } from "next";
import Link from "next/link";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { getStreamers } from "@/lib/streamers";

export const metadata: Metadata = { title: "สตรีมเมอร์" };
export const dynamic = "force-dynamic";

export default async function StreamersPage() {
  const streamers = await getStreamers();
  return (
    <>
      <NavBar />
      <main className="min-h-dvh bg-paper">
        <div className="mx-auto max-w-[980px] px-4 pb-24 pt-14">
          <h1 className="display text-[clamp(40px,6vw,64px)]">สตรีมเมอร์</h1>
          <p className="mt-3 max-w-[48ch] text-[19px] text-ink-2">เลือกคนที่อยากสนับสนุน แล้วโดเนทขึ้นจอไลฟ์ได้เลย</p>

          {streamers.length === 0 ? (
            <p className="mt-10 text-ink-2">ยังไม่มีสตรีมเมอร์ในระบบ</p>
          ) : (
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {streamers.map((s) => (
                <li key={s.username}>
                  <Link
                    href={`/${s.username}`}
                    className="group flex h-full flex-col rounded-[24px] bg-surface p-6 transition-shadow hover:shadow-[0_12px_32px_-12px_rgb(0_0_0/0.18)]"
                  >
                    <span
                      aria-hidden
                      className="grid size-14 place-items-center rounded-full bg-red text-[24px] font-bold text-white"
                    >
                      {s.displayName.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="mt-4 text-[22px] font-semibold tracking-tight">{s.displayName}</span>
                    <span className="mt-1 line-clamp-2 flex-1 text-[15px] text-ink-2">{s.bio}</span>
                    <span className="mt-5 text-[15px] font-medium text-red group-hover:underline underline-offset-4">
                      โดเนทให้ {s.displayName}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
