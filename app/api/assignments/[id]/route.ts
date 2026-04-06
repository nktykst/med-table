import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { assignments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const updateData: Partial<typeof assignments.$inferInsert> = {};
  if (body.isDone !== undefined) updateData.isDone = body.isDone;
  if (body.title !== undefined) updateData.title = body.title;
  if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.subjectId !== undefined) updateData.subjectId = body.subjectId || null;

  const [row] = await db
    .update(assignments)
    .set(updateData)
    .where(and(eq(assignments.id, id), eq(assignments.userId, session.user.id)))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await db
    .delete(assignments)
    .where(and(eq(assignments.id, id), eq(assignments.userId, session.user.id)));

  return new NextResponse(null, { status: 204 });
}
