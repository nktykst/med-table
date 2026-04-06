import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { subjects } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const [row] = await db
    .update(subjects)
    .set({
      name: body.name,
      color: body.color,
      room: body.room ?? null,
      isOnline: body.isOnline ?? false,
      syllabusUrl: body.syllabusUrl ?? null,
      isPublic: body.isPublic ?? false,
    })
    .where(and(eq(subjects.id, id), eq(subjects.userId, session.user.id)))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await db
    .delete(subjects)
    .where(and(eq(subjects.id, id), eq(subjects.userId, session.user.id)));

  return new NextResponse(null, { status: 204 });
}
