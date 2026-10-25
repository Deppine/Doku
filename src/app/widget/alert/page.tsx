import { AlertWidget } from "./AlertWidget";
import { isAlertStyle } from "@/lib/alert-style";

export const metadata = { title: "Alert widget" };

type Search = { token?: string; tts?: string; style?: string; debug?: string };

/** ?style=classic | neon | pop | led | card (ไม่ใส่ = ใช้รูปแบบที่ตั้งในแดชบอร์ด) · ?tts=0 ปิดอ่านข้อความ · ?debug=1 */
export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const { token = "", tts, style, debug } = await searchParams;
  return <AlertWidget token={token} tts={tts !== "0"} variant={isAlertStyle(style) ? style : null} debug={debug === "1"} />;
}
