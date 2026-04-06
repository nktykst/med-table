import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { weekPatterns, patternSlots, subjects } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [pattern] = await db
    .select()
    .from(weekPatterns)
    .where(and(eq(weekPatterns.id, id), eq(weekPatterns.userId, session.user.id)))
    .limit(1);

  if (!pattern) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const slots = await db
    .select({
      id: patternSlots.id,
      patternId: patternSlots.patternId,
      dayOfWeek: patternSlots.dayOfWeek,
      period: patternSlots.period,
      note: patternSlots.note,
      subject: {
        id: subjects.id,
        name: subjects.name,
        color: subjects.color,
        room: subjects.room,
        isOnline: subjects.isOnline,
      },
    })
    .from(patternSlots)
    .leftJoin(subjects, eq(patternSlots.subjectId, subjects.id))
    .where(eq(patternSlots.patternId, id));

  return NextResponse.json({ ...pattern, slots });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const [row] = await db
    .update(weekPatterns)
    .set({ name: body.name, description: body.description ?? null })
    .where(and(eq(weekPatterns.id, id), eq(weekPatterns.userId, session.user.id)))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await db
    .delete(weekPatterns)
    .where(and(eq(weekPatterns.id, id), eq(weekPatterns.userId, session.user.id)));

  return new NextResponse(null, { status: 204 });
}
