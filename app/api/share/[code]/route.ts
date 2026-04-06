import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sharedTimetables } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// 認証不要（共有リンクで誰でも見られる）
export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const [row] = await db
    .select()
    .from(sharedTimetables)
    .where(eq(sharedTimetables.code, code))
    .limit(1);

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    code: row.code,
    name: row.name,
    description: row.description,
    slots: JSON.parse(row.slotsJson),
    createdAt: row.createdAt,
  });
}
