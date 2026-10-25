"use client";

import { useMemo, useState } from "react";
import { baht } from "@/lib/format";
import type { AdminDonation } from "@/lib/admin-stats";

type Filter = "main" | "verified" | "problem" | "noslip";

const FILTERS: { v: Filter; label: string }[] = [
  { v: "main", label: "ล่าสุด" },
  { v: "verified", label: "ผ่าน" },
  { v: "problem", label: "มีปัญหา" },
  { v: "noslip", label: "ไม่ได้ส่งสลิป" },
];

const PAGE = 10;

const isProblem = (d: AdminDonation) => d.status === "rejected" || (Boolean(d.lastIssue) && d.status !== "verified");
/** สร้าง QR แล้วยังไม่ส่งสลิป (กำลังโอน หรือเลิกกลางคัน) — ส่วนใหญ่ไม่ต้องสนใจ */
const isNoSlip = (d: AdminDonation) => d.status !== "verified" && d.slipCount === 0;

function matches(d: AdminDonation, f: Filter) {
  if (f === "verified") return d.status === "verified";
  if (f === "problem") return isProblem(d);
  if (f === "noslip") return isNoSlip(d);
  return !isNoSlip(d); // ล่าสุด: ซ่อนรายการที่ไม่ได้ส่งสลิป ให้เห็นแต่ที่ต้องดูจริง
}

const STATUS: Record<AdminDonation["status"], { label: string; cls: string }> = {
  verified: { label: "ผ่าน", cls: "bg-[#1f9d55]/15 text-[#1f9d55]" },
  rejected: { label: "ไม่ผ่าน", cls: "bg-red/15 text-red" },
  waiting: { label: "รอ", cls: "bg-fill text-ink-2" },
  expired: { label: "หมดอายุ", cls: "bg-fill text-ink-3" },
};

/** แปลรหัสผลตรวจสลิปเป็นภาษาคน */
function issueText(i: NonNullable<AdminDonation["lastIssue"]>, expected: number) {
  switch (i.code) {
    case "AMOUNT_MISMATCH":
      return i.amount != null ? `ยอดในสลิป ฿${baht(i.amount)} ไม่ตรงกับ ฿${baht(expected)}` : "ยอดในสลิปไม่ตรง";
    case "RECEIVER_MISMATCH":
      return "บัญชีผู้รับในสลิปไม่ใช่ของสตรีมเมอร์";
    case "DUPLICATE_REF":
      return "สลิปนี้เคยใช้ยืนยันรายการอื่นไปแล้ว";
    case "DUPLICATE_FILE":
      return "ไฟล์สลิปเดียวกับที่เคยส่งมาแล้ว";
    case "OLD_SLIP":
      return "สลิปเก่าเกินเวลาที่สร้าง QR";
    case "UNREADABLE":
      return "อ่าน QR/ข้อความในสลิปไม่ได้";
    default:
      return i.code;
  }
}

function when(ms: number) {
  return new Date(ms).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function DonationFeed({ items }: { items: AdminDonation[] }) {
  const [filter, setFilter] = useState<Filter>("main");
  const [streamer, setStreamer] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState<number | null>(null);

  const streamers = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of items) m.set(d.streamer.username, d.streamer.displayName);
    return [...m.entries()];
  }, [items]);

  const byStreamer = streamer ? items.filter((d) => d.streamer.username === streamer) : items;
  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.v, byStreamer.filter((d) => matches(d, f.v)).length])) as Record<Filter, number>,
    [byStreamer]
  );
  const all = byStreamer.filter((d) => matches(d, filter));
  const shown = all.slice(0, limit);

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="กรองรายการ" className="flex flex-wrap gap-1 rounded-full bg-fill p-1 text-[13px] sm:inline-flex">
          {FILTERS.map((f) => (
            <button
              key={f.v}
              role="tab"
              aria-selected={filter === f.v}
              onClick={() => {
                setFilter(f.v);
                setLimit(PAGE);
              }}
              className={`rounded-full px-3 py-1.5 font-medium transition-all ${
                filter === f.v ? "bg-chip text-ink shadow-[0_2px_6px_rgb(0_0_0/0.12)]" : "text-ink-2 hover:text-ink"
              }`}
            >
              {f.label} <span className="tabular-nums text-ink-3">{counts[f.v]}</span>
            </button>
          ))}
        </div>
        {streamers.length > 1 && (
          <select
            aria-label="สตรีมเมอร์"
            value={streamer}
            onChange={(e) => {
              setStreamer(e.target.value);
              setLimit(PAGE);
            }}
            className="rounded-full bg-fill px-3 py-2 text-[13px] font-medium text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-red/40"
          >
            <option value="">ทุกสตรีมเมอร์</option>
            {streamers.map(([u, name]) => (
              <option key={u} value={u}>
                {name}
              </option>
            ))}
          </select>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="mt-4 rounded-[20px] bg-surface px-5 py-8 text-center text-[15px] text-ink-3">ยังไม่มีรายการ</p>
      ) : (
        <ul className="group-inset mt-4">
          {shown.map((d) => {
            const s = STATUS[d.status];
            const isOpen = open === d.id;
            return (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : d.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-fill/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px]">
                      <span className="font-semibold">{d.donorName}</span>
                      <span className="text-ink-3"> → </span>
                      <span>{d.streamer.displayName}</span>
                    </p>
                    <p className="truncate text-[12px] text-ink-3">
                      {when(d.createdAt)} · #{d.ref}
                      {d.lastIssue && d.status !== "verified" ? ` · ${issueText(d.lastIssue, d.expected)}` : ""}
                    </p>
                  </div>
                  <span className="amount shrink-0 text-[17px] tabular-nums">฿{baht(d.paid ?? d.expected)}</span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold ${s.cls}`}>{s.label}</span>
                </button>
                {isOpen && <Detail d={d} />}
              </li>
            );
          })}
        </ul>
      )}
      {all.length > limit && (
        <button type="button" onClick={() => setLimit((n) => n + PAGE)} className="btn-quiet mx-auto mt-3 block text-[15px]">
          ดูเพิ่ม ({all.length - limit} รายการ)
        </button>
      )}
    </div>
  );
}

function Detail({ d }: { d: AdminDonation }) {
  return (
    <div className="grid gap-4 px-4 pb-4 sm:grid-cols-[1fr_200px]">
      <dl className="grid grid-cols-[110px_1fr] gap-y-1.5 text-[14px]">
        <dt className="text-ink-3">ผู้รับ</dt>
        <dd>
          <a href={`/${d.streamer.username}`} className="link" target="_blank" rel="noreferrer">
            @{d.streamer.username}
          </a>
        </dd>
        <dt className="text-ink-3">ยอดที่ต้องโอน</dt>
        <dd className="tabular-nums">฿{baht(d.expected)}</dd>
        {d.paid != null && (
          <>
            <dt className="text-ink-3">ยอดในสลิป</dt>
            <dd className="tabular-nums">฿{baht(d.paid)}</dd>
          </>
        )}
        <dt className="text-ink-3">ข้อความ</dt>
        <dd className="break-words">{d.message || <span className="text-ink-3">-</span>}</dd>
        <dt className="text-ink-3">สลิปที่ส่งมา</dt>
        <dd>{d.slipCount} ครั้ง</dd>
        {d.lastIssue && (
          <>
            <dt className="text-ink-3">ไม่ผ่านล่าสุด</dt>
            <dd className="text-red">{issueText(d.lastIssue, d.expected)}</dd>
          </>
        )}
      </dl>
      {d.slipId ? (
        <a href={`/api/admin/slips/${d.slipId}`} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl bg-fill">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/admin/slips/${d.slipId}`} alt={`สลิปของรายการ #${d.ref}`} loading="lazy" className="max-h-[320px] w-full object-contain" />
        </a>
      ) : (
        <p className="grid place-items-center rounded-xl bg-fill p-6 text-center text-[13px] text-ink-3">ยังไม่ได้แนบสลิป</p>
      )}
    </div>
  );
}
