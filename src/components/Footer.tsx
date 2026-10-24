import { APP_NAME } from "@/lib/format";

export function Footer() {
  return (
    <footer className="bg-paper">
      <div className="mx-auto max-w-[980px] px-4 py-8 text-[12px] leading-relaxed text-ink-3">
        <p>เงินโดเนทโอนเข้าบัญชีพร้อมเพย์ของสตรีมเมอร์โดยตรง {APP_NAME} ไม่ได้ถือเงินแทน</p>
        <p className="mt-2">© {new Date().getFullYear()} {APP_NAME}</p>
      </div>
    </footer>
  );
}
