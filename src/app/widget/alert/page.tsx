import { AlertWidget } from "./AlertWidget";

export const metadata = { title: "Alert widget" };

type Search = { token?: string; tts?: string; style?: string; debug?: string };

/** ?style=classic (ค่าเริ่มต้น ตัวอักษรกลางจอ) | card (การ์ดขาว) · ?tts=0 ปิดอ่านข้อความ */
export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const { token = "", tts, style, debug } = await searchParams;
  return <AlertWidget token={token} tts={tts !== "0"} variant={style === "card" ? "card" : "classic"} debug={debug === "1"} />;
}
