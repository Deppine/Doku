import { NextResponse } from "next/server";
import { getSession } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const s = await getSession(id);
  if (!s) return NextResponse.json({ status: "EXPIRED" }, { status: 404 });
  return NextResponse.json({ status: s.status, amount: s.amount, expiresAt: s.expiresAt });
}
