import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { patternSlots, weekPatterns } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// Upsert a pattern slot
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { patternId, dayOfWeek, period, subjectId, note } = body;

  // Verify pattern ownership
  const [pattern] = await db
    .select()
    .from(weekPatterns)
    .where(and(eq(weekPatterns.id, patternId), eq(weekPatterns.userId, session.user.id)))
    .limit(1);

  if (!pattern) return NextResponse.json({ error: "Pattern not found" }, { status: 404 });

  // Delete existing slot at same position
  await db
    .delete(patternSlots)
    .where(
      and(
        eq(patternSlots.patternId, patternId),
        eq(patternSlots.dayOfWeek, dayOfWeek),
        eq(patternSlots.period, period)
      )
    );

  if (!subjectId) {
    return NextResponse.json({ deleted: true });
  }

  const [slot] = await db
    .insert(patternSlots)
    .values({ patternId, dayOfWeek, period, subjectId, note: note || null })
    .returning();

  return NextResponse.json(slot, { status: 201 });
}
