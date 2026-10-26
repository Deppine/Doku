import { GoalWidget } from "./GoalWidget";
import { isGoalStyle } from "@/lib/streamer-stats";

export const metadata = { title: "Goal widget" };

/** แถบเป้าหมายโดเนทสำหรับ OBS: ?token=<ลิงก์วิดเจ็ต> · &style=neon|tube|ring|edge|basic (ไม่ใส่ = ตามแดชบอร์ด) · &theme=light (แบบเรียบ) */
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string; theme?: string; style?: string }> }) {
  const { token = "", theme, style } = await searchParams;
  return <GoalWidget token={token} light={theme === "light"} forced={isGoalStyle(style) ? style : null} />;
}
