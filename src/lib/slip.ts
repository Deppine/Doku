/**
 * ตรวจสลิปโอนเงิน
 * - mock: อนุมัติทุกสลิป (ใช้ตอนพัฒนาเท่านั้น)
 * - local: อ่านสลิปในเครื่อง (QR + OCR) ฟรี แต่ไม่ได้ยืนยันกับธนาคาร ดู slip-local.ts
 * - test: ผู้ทดสอบกรอก "ข้อมูลที่อ่านได้จากสลิป" เอง เพื่อทดสอบเงื่อนไขการตรวจ (ใช้ตอนพัฒนาเท่านั้น)
 * - easyslip: เรียก EasySlip API (ตรวจรูปแบบ response กับเอกสารล่าสุดของผู้ให้บริการก่อนใช้จริง)
 * จะเปลี่ยนไปใช้ผู้ให้บริการอื่น (SlipOK, RDCW ฯลฯ) ให้เขียน verifier ใหม่ที่คืนค่า SlipResult แบบเดียวกัน
 */
export type SlipResult =
  | { ok: true; transRef: string; amount: number; receiverName?: string; receiverAccount?: string; paidAt?: string }
  | { ok: false; reason: string };

export interface SlipVerifier {
  verify(file: File | null, form: FormData): Promise<SlipResult>;
}

export type SlipMode = "mock" | "test" | "local" | "easyslip";
export function slipMode(): SlipMode {
  const m = process.env.SLIP_PROVIDER;
  return m === "easyslip" || m === "test" || m === "local" ? m : "mock";
}

class LocalVerifier implements SlipVerifier {
  constructor(private receiverId: string) {}
  async verify(file: File | null): Promise<SlipResult> {
    if (!file) return { ok: false, reason: "แนบรูปสลิปก่อนกดส่ง" };
    const { verifyLocal } = await import("./slip-local");
    return verifyLocal(file, this.receiverId);
  }
}

/** โหมดทดสอบ: ใช้ค่าที่กรอกในฟอร์มแทนผลจากผู้ให้บริการตรวจสลิป */
class TestVerifier implements SlipVerifier {
  async verify(_file: File | null, form: FormData): Promise<SlipResult> {
    await new Promise((r) => setTimeout(r, 400));
    const amount = Number(form.get("testAmount"));
    const transRef = String(form.get("testTransRef") ?? "").trim();
    if (!Number.isFinite(amount) || !transRef) return { ok: false, reason: "กรอกยอดและเลขอ้างอิงของสลิปทดสอบให้ครบ" };
    const paidAt = form.get("testPaidBefore") === "1" ? new Date(Date.now() - 60 * 60_000).toISOString() : new Date().toISOString();
    return {
      ok: true,
      transRef,
      amount,
      receiverAccount: String(form.get("testReceiver") ?? "") || undefined,
      paidAt,
    };
  }
}

class MockVerifier implements SlipVerifier {
  constructor(private amount: number) {}
  async verify(): Promise<SlipResult> {
    await new Promise((r) => setTimeout(r, 800));
    return { ok: true, transRef: "MOCK" + Date.now(), amount: this.amount };
  }
}

class EasySlipVerifier implements SlipVerifier {
  async verify(file: File | null): Promise<SlipResult> {
    if (!file) return { ok: false, reason: "แนบรูปสลิปก่อนกดส่ง" };
    const key = process.env.SLIP_API_KEY;
    if (!key) return { ok: false, reason: "ยังไม่ได้ตั้งค่า SLIP_API_KEY" };
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("https://developer.easyslip.com/api/v1/verify", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    const json = (await res.json().catch(() => null)) as EasySlipResponse | null;
    if (!res.ok || !json?.data) {
      return { ok: false, reason: "อ่านสลิปไม่ได้ ลองถ่ายให้เห็น QR บนสลิปชัด ๆ แล้วส่งใหม่" };
    }
    const d = json.data;
    return {
      ok: true,
      transRef: d.transRef,
      amount: Number(d.amount?.amount ?? 0),
      receiverName: d.receiver?.account?.name?.th ?? d.receiver?.account?.name?.en,
      receiverAccount: d.receiver?.account?.proxy?.account ?? d.receiver?.account?.bank?.account,
      paidAt: d.date,
    };
  }
}

type EasySlipResponse = {
  status: number;
  data?: {
    transRef: string;
    date?: string;
    amount?: { amount: number };
    receiver?: {
      account?: {
        name?: { th?: string; en?: string };
        bank?: { account?: string };
        proxy?: { type?: string; account?: string };
      };
    };
  };
};

export function getSlipVerifier(expectedAmount: number, receiverId: string): SlipVerifier {
  const mode = slipMode();
  if (mode === "easyslip") return new EasySlipVerifier();
  if (mode === "local") return new LocalVerifier(receiverId);
  if (mode === "test") return new TestVerifier();
  return new MockVerifier(expectedAmount);
}

export const isMockSlip = () => slipMode() === "mock";

/** เทียบเลขบัญชีที่ถูก mask ในสลิป เช่น xxx-xxx-5678 กับเลขจริง */
export function accountMatches(masked: string | undefined, real: string) {
  if (!masked) return true; // บางธนาคารไม่ส่งเลขผู้รับมา ให้ไปเช็คชื่อแทน
  const r = real.replace(/\D/g, "");
  const tail = masked.replace(/\D/g, "").slice(-4);
  return tail.length >= 3 && r.endsWith(tail);
}
