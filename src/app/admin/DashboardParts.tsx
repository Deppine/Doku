"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { baht } from "@/lib/format";
import type { AdminDonation } from "@/lib/admin-stats";
import type { AdminUserRow } from "@/lib/admin-dashboard";
import { CreateUserForm, UserItem } from "./AdminClient";
import { issueText, when } from "./AdminDonations";

/** รายการที่ต้องตรวจ: ดูสลิป หรืออนุมัติเองเมื่อระบบอ่านพลาด */
export function ReviewQueue({ items }: { items: AdminDonation[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ id: number; ok: boolean; text: string } | null>(null);

  async function approve(d: AdminDonation) {
    if (!window.confirm(`อนุมัติรายการของ ${d.donorName} ยอด ฿${baht(d.expected)} ให้ ${d.streamer.displayName}?\nยืนยันว่าเปิดดูสลิปแล้วและเงินเข้าบัญชีจริง ระบบจะส่งแจ้งเตือนขึ้นจอทันที`)) return;
    setBusy(d.id);
    setMsg(null);
    const res = await fetch(`/api/admin/donations/${d.id}/approve`, { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return setMsg({ id: d.id, ok: false, text: json.message ?? "อนุมัติไม่สำเร็จ" });
    setMsg({ id: d.id, ok: true, text: "อนุมัติแล้ว ส่งแจ้งเตือนขึ้นจอแล้ว" });
    router.refresh();
  }

  if (items.length === 0) {
    return <p className="mt-4 rounded-2xl bg-fill/60 px-4 py-6 text-center text-[15px] text-ink-3">ไม่มีรายการค้างตรวจ</p>;
  }
  return (
    <ul className="mt-2">
      {items.map((d) => (
        <li key={d.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line py-3.5 first:border-t-0">
          <div className="min-w-0 flex-[1_1_220px]">
            <p className="truncate">
              <b>{d.donorName}</b> <span className="text-ink-3">→</span> {d.streamer.displayName}
            </p>
            <p className={`text-[13px] ${d.lastIssue ? "text-red" : "text-ink-2"}`}>
              {d.lastIssue ? issueText(d.lastIssue, d.expected) : "ส่งสลิปแล้ว รอผลตรวจ"}
            </p>
            <p className="text-[12px] text-ink-3">
              {when(d.createdAt)} · ส่งสลิป {d.slipCount} ครั้ง · #{d.ref}
            </p>
          </div>
          <span className="amount text-[18px] tabular-nums">฿{baht(d.expected)}</span>
          <div className="flex gap-1.5">
            {d.slipId && (
              <a href={`/api/admin/slips/${d.slipId}`} target="_blank" rel="noreferrer" className="btn-quiet min-h-11 px-4 py-2 text-[13px]">
                ดูสลิป
              </a>
            )}
            <button type="button" disabled={busy === d.id} onClick={() => approve(d)} className="btn-primary min-h-11 px-4 py-2 text-[13px]">
              {busy === d.id ? "กำลังอนุมัติ…" : "อนุมัติเอง"}
            </button>
          </div>
          {msg?.id === d.id && (
            <p role={msg.ok ? "status" : "alert"} className={`basis-full text-[13px] ${msg.ok ? "text-ink-2" : "text-red"}`}>
              {msg.text}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

const STATUS = {
  active: { label: "ใช้งาน", cls: "bg-ok/15 text-ok" },
  pending: { label: "รออนุมัติ", cls: "bg-warn/20 text-warn" },
  suspended: { label: "ถูกระงับ", cls: "bg-red/15 text-red" },
} as const;

function ago(ms: number | null) {
  if (!ms) return "-";
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return "เมื่อสักครู่";
  if (m < 60) return `${m} นาทีก่อน`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ชม. ก่อน`;
  return `${Math.round(h / 24)} วันก่อน`;
}

/** ตารางบัญชี: ค้นหา + เปิดแผงจัดการของแต่ละบัญชี */
export function AccountsTable({ users, meId }: { users: AdminUserRow[]; meId: number }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase().replace(/^@/, "");
    return s ? users.filter((u) => u.username.toLowerCase().includes(s) || u.displayName.toLowerCase().includes(s)) : users;
  }, [q, users]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[19px] font-semibold">บัญชี ({users.length})</h2>
        <div className="flex flex-wrap gap-2">
          <label htmlFor="acc-q" className="sr-only">
            ค้นหาบัญชี
          </label>
          <input
            id="acc-q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาชื่อหรือ @username"
            className="min-h-11 w-full min-w-0 rounded-xl border border-line bg-page px-3.5 text-[14px] focus:outline-none focus-visible:ring-2 focus-visible:ring-red/40 sm:w-60"
          />
          <button type="button" onClick={() => setAdding((v) => !v)} aria-expanded={adding} className="btn-primary min-h-11 px-4 py-2 text-[14px]">
            {adding ? "ปิด" : "+ เพิ่มบัญชี"}
          </button>
        </div>
      </div>

      {adding && (
        <div className="mt-3 rounded-2xl bg-paper p-4">
          <CreateUserForm />
        </div>
      )}

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-[14px]">
          <thead>
            <tr className="text-left text-[12px] text-ink-3">
              <th scope="col" className="px-2 py-2.5 font-medium">บัญชี</th>
              <th scope="col" className="px-2 py-2.5 font-medium">สถานะ</th>
              <th scope="col" className="px-2 py-2.5 font-medium">พร้อมเพย์</th>
              <th scope="col" className="px-2 py-2.5 text-right font-medium">ยอด 30 วัน</th>
              <th scope="col" className="px-2 py-2.5 font-medium">ล็อกอินล่าสุด</th>
              <th scope="col" className="px-2 py-2.5 text-right font-medium">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((u) => {
              const s = STATUS[u.status];
              const isOpen = open === u.id;
              return [
                <tr key={u.id} className="border-t border-line">
                  <td className="px-2 py-3">
                    <span className="inline-flex items-center gap-2">
                      <span
                        aria-label={u.online ? "วิดเจ็ตเปิดอยู่" : undefined}
                        className={`size-2 shrink-0 rounded-full ${u.online ? "bg-[#30d158]" : "bg-transparent"}`}
                      />
                      <b>{u.displayName}</b>
                      <span className="text-ink-3">@{u.username}</span>
                      {u.id === meId && <span className="text-[12px] text-ink-3">(คุณ)</span>}
                      {u.role === "admin" && <span className="rounded-full bg-fill px-2 py-0.5 text-[11px] text-ink-2">ผู้ดูแล</span>}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${s.cls}`}>{s.label}</span>
                  </td>
                  <td className="px-2 py-3 text-ink-2 tabular-nums">{u.promptpay ?? "ยังไม่ตั้ง"}</td>
                  <td className="px-2 py-3 text-right font-semibold tabular-nums">฿{baht(u.total30)}</td>
                  <td className="px-2 py-3 text-ink-2">{u.online ? "ออนไลน์" : ago(u.lastLoginAt)}</td>
                  <td className="px-2 py-3 text-right">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpen(isOpen ? null : u.id)}
                      className={`min-h-9 rounded-full px-3.5 text-[13px] font-semibold ${u.status === "pending" ? "bg-red text-white" : "bg-fill text-ink"}`}
                    >
                      {isOpen ? "ปิด" : u.status === "pending" ? "ตรวจ / อนุมัติ" : "จัดการ"}
                    </button>
                  </td>
                </tr>,
                isOpen && (
                  <tr key={`${u.id}-m`}>
                    <td colSpan={6} className="px-0 pb-3">
                      <ul className="rounded-2xl bg-paper">
                        <UserItem
                          u={{
                            id: u.id,
                            username: u.username,
                            displayName: u.displayName,
                            role: u.role,
                            status: u.status,
                            createdAt: u.createdAt,
                            hasPayment: Boolean(u.promptpay),
                            donationCount: u.donationCount,
                            donationTotal: u.total30,
                          }}
                          isMe={u.id === meId}
                        />
                      </ul>
                    </td>
                  </tr>
                ),
              ];
            })}
            {shown.length === 0 && (
              <tr>
                <td colSpan={6} className="px-2 py-6 text-center text-ink-3">
                  ไม่พบบัญชีที่ค้นหา
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
