import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { weeks } from "@/lib/db/schema";
import { eq, lte, desc } from "drizzle-orm";
import { resolveWeekSlots } from "@/lib/slot-resolver";
import { format } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const weekId = searchParams.get("weekId");

  let targetWeekId = weekId;

  if (!targetWeekId) {
    // Auto-detect current week
    const today = format(new Date(), "yyyy-MM-dd");
    const [week] = await db
      .select()
      .from(weeks)
      .where(eq(weeks.userId, session.user.id))
      .orderBy(desc(weeks.startDate))
      .limit(52);

    // Find the week where start_date <= today
    const allWeeks = await db
      .select()
      .from(weeks)
      .where(eq(weeks.userId, session.user.id))
      .orderBy(weeks.startDate);

    const currentWeek = allWeeks.findLast((w) => w.startDate <= today);
    targetWeekId = currentWeek?.id ?? allWeeks[0]?.id ?? null;
  }

  if (!targetWeekId) {
    return NextResponse.json({ week: null, slots: [] });
  }

  const [weekRow] = await db
    .select()
    .from(weeks)
    .where(eq(weeks.id, targetWeekId))
    .limit(1);

  const slots = await resolveWeekSlots(targetWeekId, session.user.id);

  return NextResponse.json({ week: weekRow, slots });
}
