import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { weeks, slotOverrides, patternSlots, subjects } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { format, addDays, parseISO } from "date-fns";

export type MonthSlot = {
  period: number;
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  isCancelled: boolean;
};

export type MonthData = Record<string, MonthSlot[]>; // dateStr → slots

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1));

  // 月の開始・終了日
  const monthStart = format(new Date(year, month - 1, 1), "yyyy-MM-dd");
  const monthEnd = format(new Date(year, month, 0), "yyyy-MM-dd"); // 月末日

  // この月に重なるDB週を取得
  // 週の開始(月曜) <= 月末 かつ 週の開始 + 6 >= 月初
  const dbWeeks = await db
    .select()
    .from(weeks)
    .where(
      and(
        eq(weeks.userId, session.user.id),
        lte(weeks.startDate, monthEnd),
        gte(weeks.startDate, format(addDays(parseISO(monthStart), -6), "yyyy-MM-dd"))
      )
    );

  if (dbWeeks.length === 0) return NextResponse.json({});

  const result: MonthData = {};

  for (const week of dbWeeks) {
    if (week.isHoliday) continue;

    // オーバーライドを取得
    const overrides = await db
      .select({
        dayOfWeek: slotOverrides.dayOfWeek,
        period: slotOverrides.period,
        isCancelled: slotOverrides.isCancelled,
        subjectId: subjects.id,
        subjectName: subjects.name,
        subjectColor: subjects.color,
      })
      .from(slotOverrides)
      .leftJoin(subjects, eq(slotOverrides.subjectId, subjects.id))
      .where(eq(slotOverrides.weekId, week.id));

    // パターンスロットを取得
    const pSlots = week.patternId
      ? await db
          .select({
            dayOfWeek: patternSlots.dayOfWeek,
            period: patternSlots.period,
            subjectId: subjects.id,
            subjectName: subjects.name,
            subjectColor: subjects.color,
          })
          .from(patternSlots)
          .leftJoin(subjects, eq(patternSlots.subjectId, subjects.id))
          .where(eq(patternSlots.patternId, week.patternId!))
      : [];

    // day 1=月〜5=金 を実際の日付に変換
    for (let day = 1; day <= 5; day++) {
      const date = format(addDays(parseISO(week.startDate), day - 1), "yyyy-MM-dd");
      // 月の範囲外はスキップ
      if (date < monthStart || date > monthEnd) continue;

      const daySlots: MonthSlot[] = [];

      for (let period = 1; period <= 7; period++) {
        const override = overrides.find((o) => o.dayOfWeek === day && o.period === period);
        const pSlot = pSlots.find((s) => s.dayOfWeek === day && s.period === period);

        if (override) {
          if (!override.isCancelled && override.subjectId) {
            daySlots.push({
              period,
              subjectId: override.subjectId,
              subjectName: override.subjectName!,
              subjectColor: override.subjectColor!,
              isCancelled: false,
            });
          } else if (override.isCancelled && pSlot?.subjectId) {
            daySlots.push({
              period,
              subjectId: pSlot.subjectId,
              subjectName: pSlot.subjectName!,
              subjectColor: pSlot.subjectColor!,
              isCancelled: true,
            });
          }
        } else if (pSlot?.subjectId) {
          daySlots.push({
            period,
            subjectId: pSlot.subjectId,
            subjectName: pSlot.subjectName!,
            subjectColor: pSlot.subjectColor!,
            isCancelled: false,
          });
        }
      }

      if (daySlots.length > 0) result[date] = daySlots;
    }
  }

  return NextResponse.json(result);
}
