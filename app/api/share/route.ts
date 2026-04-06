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
import { eq, and } from "drizzle-orm";

function randomCode(len = 8) {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  return Array.from({ length: len }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

export type SharedSlot = {
  dayOfWeek: number;
  period: number;
  subjectName: string;
  subjectColor: string;
  room: string | null;
  isOnline: boolean;
};

// 週のスロットをスナップショット取得（resolver と同様のロジック）
async function snapshotWeek(weekId: string, userId: string): Promise<SharedSlot[]> {
  const [week] = await db
    .select()
    .from(weeks)
    .where(and(eq(weeks.id, weekId), eq(weeks.userId, userId)))
    .limit(1);
  if (!week) return [];

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

  const pSlots = week.patternId
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
        .where(eq(patternSlots.patternId, week.patternId!))
    : [];

  const result: SharedSlot[] = [];

  for (let day = 1; day <= 5; day++) {
    for (let period = 1; period <= 7; period++) {
      const ov = overrides.find((o) => o.dayOfWeek === day && o.period === period);
      const ps = pSlots.find((s) => s.dayOfWeek === day && s.period === period);

      let slot: SharedSlot | null = null;

      if (ov) {
        if (!ov.isEmpty && !ov.isCancelled && ov.subjectName) {
          slot = {
            dayOfWeek: day,
            period,
            subjectName: ov.subjectName,
            subjectColor: ov.subjectColor ?? "#60a5fa",
            room: ov.room ?? null,
            isOnline: ov.isOnline ?? false,
          };
        }
      } else if (ps?.subjectName) {
        slot = {
          dayOfWeek: day,
          period,
          subjectName: ps.subjectName,
          subjectColor: ps.subjectColor ?? "#60a5fa",
          room: ps.room ?? null,
          isOnline: ps.isOnline ?? false,
        };
      }

      if (slot) result.push(slot);
    }
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
  const { weekId, name, description } = body;

  let slots: SharedSlot[] = [];

  if (weekId) {
    slots = await snapshotWeek(weekId, session.user.id);
  } else {
    return NextResponse.json({ error: "weekId is required" }, { status: 400 });
  }

  if (slots.length === 0) {
    return NextResponse.json({ error: "登録されている授業がありません" }, { status: 400 });
  }

  let code = randomCode();
  // コード衝突回避
  for (let i = 0; i < 5; i++) {
    const [exists] = await db
      .select()
      .from(sharedTimetables)
      .where(eq(sharedTimetables.code, code))
      .limit(1);
    if (!exists) break;
    code = randomCode();
  }

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

  return NextResponse.json(row, { status: 201 });
}
