import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { weeks, weekPatterns } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({
      id: weeks.id,
      weekNumber: weeks.weekNumber,
      startDate: weeks.startDate,
      label: weeks.label,
      patternId: weeks.patternId,
      isHoliday: weeks.isHoliday,
      holidayLabel: weeks.holidayLabel,
      patternName: weekPatterns.name,
    })
    .from(weeks)
    .leftJoin(weekPatterns, eq(weeks.patternId, weekPatterns.id))
    .where(eq(weeks.userId, session.user.id))
    .orderBy(weeks.startDate);

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const [row] = await db
    .insert(weeks)
    .values({
      userId: session.user.id,
      weekNumber: body.weekNumber,
      startDate: body.startDate,
      label: body.label || null,
      patternId: body.patternId || null,
      isHoliday: body.isHoliday ?? false,
      holidayLabel: body.holidayLabel || null,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
