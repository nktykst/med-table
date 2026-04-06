import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { attendances, weeks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// Upsert attendance
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { weekId, dayOfWeek, period, status, note } = body;

  // Verify week ownership
  const [week] = await db
    .select()
    .from(weeks)
    .where(and(eq(weeks.id, weekId), eq(weeks.userId, session.user.id)))
    .limit(1);

  if (!week) return NextResponse.json({ error: "Week not found" }, { status: 404 });

  // Delete existing
  await db
    .delete(attendances)
    .where(
      and(
        eq(attendances.userId, session.user.id),
        eq(attendances.weekId, weekId),
        eq(attendances.dayOfWeek, dayOfWeek),
        eq(attendances.period, period)
      )
    );

  const [row] = await db
    .insert(attendances)
    .values({
      userId: session.user.id,
      weekId,
      dayOfWeek,
      period,
      status: status || "present",
      note: note || null,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
