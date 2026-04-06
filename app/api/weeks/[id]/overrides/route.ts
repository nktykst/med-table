import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { weeks, slotOverrides } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: weekId } = await params;

  // Verify week ownership
  const [week] = await db
    .select()
    .from(weeks)
    .where(and(eq(weeks.id, weekId), eq(weeks.userId, session.user.id)))
    .limit(1);

  if (!week) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { dayOfWeek, period, subjectId, note, isCancelled } = body;

  // Delete existing override
  await db
    .delete(slotOverrides)
    .where(
      and(
        eq(slotOverrides.weekId, weekId),
        eq(slotOverrides.dayOfWeek, dayOfWeek),
        eq(slotOverrides.period, period)
      )
    );

  if (!subjectId && !isCancelled) {
    return NextResponse.json({ deleted: true });
  }

  const [override] = await db
    .insert(slotOverrides)
    .values({
      weekId,
      dayOfWeek,
      period,
      subjectId: subjectId || null,
      note: note || null,
      isCancelled: isCancelled ?? false,
    })
    .returning();

  return NextResponse.json(override, { status: 201 });
}
