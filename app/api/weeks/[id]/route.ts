import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { weeks, slotOverrides, subjects } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { resolveWeekSlots } from "@/lib/slot-resolver";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const slots = await resolveWeekSlots(id, session.user.id);
  return NextResponse.json(slots);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const [row] = await db
    .update(weeks)
    .set({
      label: body.label ?? null,
      patternId: body.patternId ?? null,
      isHoliday: body.isHoliday ?? false,
      holidayLabel: body.holidayLabel ?? null,
    })
    .where(and(eq(weeks.id, id), eq(weeks.userId, session.user.id)))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}
