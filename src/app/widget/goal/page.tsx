import { GoalWidget } from "./GoalWidget";

export const metadata = { title: "Goal widget" };

/** แถบเป้าหมายโดเนทสำหรับ OBS: ?token=<ลิงก์วิดเจ็ต> · ?theme=light */
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string; theme?: string }> }) {
  const { token = "", theme } = await searchParams;
  return <GoalWidget token={token} light={theme === "light"} />;
}
