import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  sharedTimetables,
  weeks,
  slotOverrides,
  patternSlots,
  subjects,
} from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { parseISO } from "date-fns";

function randomCode(len = 8) {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  return Array.from({ length: len }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

export type SharedSlot = {
  weekOffset: number; // 0-based: 0 = 開始週, 1 = 翌週, ...
  dayOfWeek: number;
  period: number;
  subjectName: string;
  subjectColor: string;
  room: string | null;
  isOnline: boolean;
};

// 週のスロットをスナップショット取得
async function snapshotWeek(
  weekId: string,
  patternId: string | null
): Promise<Omit<SharedSlot, "weekOffset">[]> {
  const overrides = await db
    .select({
      dayOfWeek: slotOverrides.dayOfWeek,
      period: slotOverrides.period,
      isCancelled: slotOverrides.isCancelled,
      isEmpty: slotOverrides.isEmpty,
      subjectName: subjects.name,
      subjectColor: subjects.color,
      room: subjects.room,
      isOnline: subjects.isOnline,
    })
    .from(slotOverrides)
    .leftJoin(subjects, eq(slotOverrides.subjectId, subjects.id))
    .where(eq(slotOverrides.weekId, weekId));

  const pSlots = patternId
    ? await db
        .select({
          dayOfWeek: patternSlots.dayOfWeek,
          period: patternSlots.period,
          subjectName: subjects.name,
          subjectColor: subjects.color,
          room: subjects.room,
          isOnline: subjects.isOnline,
        })
        .from(patternSlots)
        .leftJoin(subjects, eq(patternSlots.subjectId, subjects.id))
        .where(eq(patternSlots.patternId, patternId))
    : [];

  const result: Omit<SharedSlot, "weekOffset">[] = [];

  for (let day = 1; day <= 5; day++) {
    for (let period = 1; period <= 7; period++) {
      const ov = overrides.find((o) => o.dayOfWeek === day && o.period === period);
      const ps = pSlots.find((s) => s.dayOfWeek === day && s.period === period);

      if (ov) {
        if (!ov.isEmpty && !ov.isCancelled && ov.subjectName) {
          result.push({
            dayOfWeek: day,
            period,
            subjectName: ov.subjectName,
            subjectColor: ov.subjectColor ?? "#60a5fa",
            room: ov.room ?? null,
            isOnline: ov.isOnline ?? false,
          });
        }
      } else if (ps?.subjectName) {
        result.push({
          dayOfWeek: day,
          period,
          subjectName: ps.subjectName,
          subjectColor: ps.subjectColor ?? "#60a5fa",
          room: ps.room ?? null,
          isOnline: ps.isOnline ?? false,
        });
      }
    }
  }

  return result;
}

// 日付範囲のスロットをまとめてスナップショット
async function snapshotDateRange(
  startDate: string,
  endDate: string,
  userId: string
): Promise<SharedSlot[]> {
  const dbWeeks = await db
    .select()
    .from(weeks)
    .where(
      and(
        eq(weeks.userId, userId),
        gte(weeks.startDate, startDate),
        lte(weeks.startDate, endDate)
      )
    );

  const startMs = parseISO(startDate).getTime();
  const result: SharedSlot[] = [];

  for (const week of dbWeeks) {
    const weekOffset = Math.round(
      (parseISO(week.startDate).getTime() - startMs) / (7 * 86400000)
    );
    const slots = await snapshotWeek(week.id, week.patternId);
    result.push(...slots.map((s) => ({ ...s, weekOffset })));
  }

  return result;
}

// 自分の共有一覧を取得
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(sharedTimetables)
    .where(eq(sharedTimetables.userId, session.user.id));

  return NextResponse.json(rows);
}

// 共有を作成
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { startDate, endDate, name, description } = body as {
    startDate: string;
    endDate: string;
    name?: string;
    description?: string;
  };

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "startDate と endDate が必要です" }, { status: 400 });
  }

  const slots = await snapshotDateRange(startDate, endDate, session.user.id);

  if (slots.length === 0) {
    return NextResponse.json({ error: "指定期間に登録されている授業がありません" }, { status: 400 });
  }

  let code = randomCode();
  for (let i = 0; i < 5; i++) {
    const [exists] = await db
      .select()
      .from(sharedTimetables)
      .where(eq(sharedTimetables.code, code))
      .limit(1);
    if (!exists) break;
    code = randomCode();
  }

  const totalWeeks =
    Math.max(...slots.map((s) => s.weekOffset)) + 1;

  const [row] = await db
    .insert(sharedTimetables)
    .values({
      userId: session.user.id,
      code,
      name: name || "共有時間割",
      description: description || null,
      slotsJson: JSON.stringify(slots),
    })
    .returning();

  return NextResponse.json({ ...row, totalWeeks }, { status: 201 });
}
