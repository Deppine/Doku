import { AlertWidget } from "./AlertWidget";

export const metadata = { title: "Alert widget" };

type Search = { token?: string; tts?: string; style?: string; debug?: string };

/** ?style=classic | card (ไม่ใส่ = ใช้รูปแบบที่ตั้งในแดชบอร์ด) · ?tts=0 ปิดอ่านข้อความ · ?debug=1 */
export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const { token = "", tts, style, debug } = await searchParams;
  return <AlertWidget token={token} tts={tts !== "0"} variant={style === "card" || style === "classic" ? style : null} debug={debug === "1"} />;
}
