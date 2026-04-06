import { db } from "@/lib/db";
import {
  slotOverrides,
  patternSlots,
  weeks,
  subjects,
  attendances,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const TIME_SLOTS = [
  { period: 1, start: "09:00", end: "10:00" },
  { period: 2, start: "10:10", end: "11:10" },
  { period: 3, start: "11:20", end: "12:20" },
  { period: 4, start: "13:20", end: "14:20" },
  { period: 5, start: "14:30", end: "15:30" },
  { period: 6, start: "15:40", end: "16:40" },
  { period: 7, start: "16:50", end: "17:50" },
];

export type ResolvedSlot = {
  dayOfWeek: number;
  period: number;
  subject: {
    id: string;
    name: string;
    color: string;
    room: string | null;
    isOnline: boolean | null;
    syllabusUrl: string | null;
  } | null;
  note: string | null;
  isCancelled: boolean;
  attendance: {
    id: string;
    status: string;
  } | null;
  overrideId: string | null;
};

export async function resolveWeekSlots(
  weekId: string,
  userId: string
): Promise<ResolvedSlot[]> {
  const [week] = await db
    .select()
    .from(weeks)
    .where(and(eq(weeks.id, weekId), eq(weeks.userId, userId)))
    .limit(1);

  if (!week) return [];

  // Fetch overrides
  const overrides = await db
    .select({
      id: slotOverrides.id,
      dayOfWeek: slotOverrides.dayOfWeek,
      period: slotOverrides.period,
      isCancelled: slotOverrides.isCancelled,
      isEmpty: slotOverrides.isEmpty,
      note: slotOverrides.note,
      subject: {
        id: subjects.id,
        name: subjects.name,
        color: subjects.color,
        room: subjects.room,
        isOnline: subjects.isOnline,
        syllabusUrl: subjects.syllabusUrl,
      },
    })
    .from(slotOverrides)
    .leftJoin(subjects, eq(slotOverrides.subjectId, subjects.id))
    .where(eq(slotOverrides.weekId, weekId));

  // Fetch pattern slots
  const pSlots =
    week.patternId
      ? await db
          .select({
            id: patternSlots.id,
            dayOfWeek: patternSlots.dayOfWeek,
            period: patternSlots.period,
            note: patternSlots.note,
            subject: {
              id: subjects.id,
              name: subjects.name,
              color: subjects.color,
              room: subjects.room,
              isOnline: subjects.isOnline,
              syllabusUrl: subjects.syllabusUrl,
            },
          })
          .from(patternSlots)
          .leftJoin(subjects, eq(patternSlots.subjectId, subjects.id))
          .where(eq(patternSlots.patternId, week.patternId))
      : [];

  // Fetch attendances
  const attendanceRows = await db
    .select()
    .from(attendances)
    .where(
      and(eq(attendances.weekId, weekId), eq(attendances.userId, userId))
    );

  const result: ResolvedSlot[] = [];

  for (let day = 1; day <= 5; day++) {
    for (let period = 1; period <= 7; period++) {
      const override = overrides.find(
        (o) => o.dayOfWeek === day && o.period === period
      );
      const pSlot = pSlots.find(
        (s) => s.dayOfWeek === day && s.period === period
      );
      const attendance = attendanceRows.find(
        (a) => a.dayOfWeek === day && a.period === period
      );

      let subject: ResolvedSlot["subject"] = null;
      let note: string | null = null;
      let isCancelled = false;
      let overrideId: string | null = null;

      if (override) {
        overrideId = override.id;
        // isEmpty=true はパターンを空で上書き（subject=null のまま）
        if (override.isEmpty) {
          // subject=null のまま
        } else {
          isCancelled = override.isCancelled ?? false;
          note = override.note;
          subject =
            override.subject?.id
              ? (override.subject as ResolvedSlot["subject"])
              : null;
        }
      } else if (pSlot) {
        note = pSlot.note;
        subject =
          pSlot.subject?.id
            ? (pSlot.subject as ResolvedSlot["subject"])
            : null;
      }

      result.push({
        dayOfWeek: day,
        period,
        subject,
        note,
        isCancelled,
        attendance: attendance
          ? { id: attendance.id, status: attendance.status ?? "present" }
          : null,
        overrideId,
      });
    }
  }

  return result;
}
