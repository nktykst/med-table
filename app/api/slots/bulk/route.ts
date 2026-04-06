import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { weeks, slotOverrides, subjects } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { format, addDays, parseISO } from "date-fns";

function getAcademicWeekNumber(startDate: string): number {
  const monday = parseISO(startDate);
  const month = monday.getMonth();
  const academicYear = month >= 3 ? monday.getFullYear() : monday.getFullYear() - 1;
  const apr1 = new Date(academicYear, 3, 1);
  const dow = apr1.getDay();
  const daysToMon = dow === 0 ? 1 : dow === 1 ? 0 : 8 - dow;
  const academicStart = new Date(apr1.getTime() + daysToMon * 86400000);
  return Math.floor((monday.getTime() - academicStart.getTime()) / (7 * 86400000)) + 1;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    subjectId,
    dayOfWeeks,
    periodFrom,
    periodTo,
    startDate, // Monday of first week (yyyy-MM-dd)
    repeatWeeks,
  } = body as {
    subjectId: string;
    dayOfWeeks: number[];
    periodFrom: number;
    periodTo: number;
    startDate: string;
    repeatWeeks: number;
  };

  if (!subjectId || !dayOfWeeks?.length || !periodFrom || !periodTo || !startDate || !repeatWeeks) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // 科目の存在確認
  const [subject] = await db
    .select()
    .from(subjects)
    .where(and(eq(subjects.id, subjectId), eq(subjects.userId, session.user.id)))
    .limit(1);

  if (!subject) return NextResponse.json({ error: "Subject not found" }, { status: 404 });

  const created: string[] = [];

  for (let i = 0; i < repeatWeeks; i++) {
    const monday = format(addDays(parseISO(startDate), i * 7), "yyyy-MM-dd");

    // 週レコードを取得または作成
    let [week] = await db
      .select()
      .from(weeks)
      .where(and(eq(weeks.userId, session.user.id), eq(weeks.startDate, monday)))
      .limit(1);

    if (!week) {
      [week] = await db
        .insert(weeks)
        .values({
          userId: session.user.id,
          weekNumber: getAcademicWeekNumber(monday),
          startDate: monday,
        })
        .returning();
    }

    for (const dayOfWeek of dayOfWeeks) {
      for (let period = periodFrom; period <= periodTo; period++) {
        await db
          .delete(slotOverrides)
          .where(
            and(
              eq(slotOverrides.weekId, week.id),
              eq(slotOverrides.dayOfWeek, dayOfWeek),
              eq(slotOverrides.period, period)
            )
          );

        await db.insert(slotOverrides).values({
          weekId: week.id,
          dayOfWeek,
          period,
          subjectId,
          isCancelled: false,
        });

        created.push(`${monday} day=${dayOfWeek} period=${period}`);
      }
    }
  }

  return NextResponse.json({ created: created.length });
}
