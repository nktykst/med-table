import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sharedTimetables, weeks, slotOverrides, subjects } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { format, addDays, parseISO } from "date-fns";
import type { SharedSlot } from "../route";

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

// コードを使って自分の時間割にインポート
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await req.json();
  const { code, startDate, repeatCycles = 1 } = body as {
    code: string;
    startDate: string; // yyyy-MM-dd (Monday)
    repeatCycles: number; // ブロック全体を何回繰り返すか
  };

  if (!code || !startDate) {
    return NextResponse.json({ error: "code と startDate が必要です" }, { status: 400 });
  }

  const [shared] = await db
    .select()
    .from(sharedTimetables)
    .where(eq(sharedTimetables.code, code))
    .limit(1);

  if (!shared) return NextResponse.json({ error: "共有コードが見つかりません" }, { status: 404 });

  const slots: SharedSlot[] = JSON.parse(shared.slotsJson);

  // ブロック全体の週数を計算
  const totalWeeks = slots.length > 0
    ? Math.max(...slots.map((s) => s.weekOffset)) + 1
    : 0;

  // 既存の自分の科目を名前でキャッシュ
  const mySubjects = await db.select().from(subjects).where(eq(subjects.userId, userId));
  const subjectCache = new Map<string, string>();
  mySubjects.forEach((s) => subjectCache.set(s.name.toLowerCase(), s.id));

  // 科目名から id を解決（なければ作成）
  async function resolveSubjectId(slot: SharedSlot): Promise<string> {
    const key = slot.subjectName.toLowerCase();
    if (subjectCache.has(key)) return subjectCache.get(key)!;

    const [created] = await db
      .insert(subjects)
      .values({
        userId,
        name: slot.subjectName,
        color: slot.subjectColor,
        ...(slot.room != null ? { room: slot.room } : {}),
        ...(slot.isOnline != null ? { isOnline: slot.isOnline } : {}),
      })
      .returning();

    subjectCache.set(key, created.id);
    return created.id;
  }

  let importedCount = 0;

  for (let cycle = 0; cycle < repeatCycles; cycle++) {
    const cycleOffsetWeeks = cycle * totalWeeks;

    for (const slot of slots) {
      const absoluteOffset = cycleOffsetWeeks + slot.weekOffset;
      const monday = format(
        addDays(parseISO(startDate), absoluteOffset * 7),
        "yyyy-MM-dd"
      );

      // 週レコードを取得または作成
      let [week] = await db
        .select()
        .from(weeks)
        .where(and(eq(weeks.userId, userId), eq(weeks.startDate, monday)))
        .limit(1);

      if (!week) {
        [week] = await db
          .insert(weeks)
          .values({
            userId,
            weekNumber: getAcademicWeekNumber(monday),
            startDate: monday,
          })
          .returning();
      }

      const subjectId = await resolveSubjectId(slot);

      await db
        .delete(slotOverrides)
        .where(
          and(
            eq(slotOverrides.weekId, week.id),
            eq(slotOverrides.dayOfWeek, slot.dayOfWeek),
            eq(slotOverrides.period, slot.period)
          )
        );

      await db.insert(slotOverrides).values({
        weekId: week.id,
        dayOfWeek: slot.dayOfWeek,
        period: slot.period,
        subjectId,
        isCancelled: false,
      });

      importedCount++;
    }
  }

  return NextResponse.json({ imported: importedCount });
}
