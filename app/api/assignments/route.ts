import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { assignments, subjects } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({
      id: assignments.id,
      title: assignments.title,
      dueDate: assignments.dueDate,
      isDone: assignments.isDone,
      description: assignments.description,
      createdAt: assignments.createdAt,
      subject: {
        id: subjects.id,
        name: subjects.name,
        color: subjects.color,
      },
    })
    .from(assignments)
    .leftJoin(subjects, eq(assignments.subjectId, subjects.id))
    .where(eq(assignments.userId, session.user.id))
    .orderBy(asc(assignments.dueDate));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const [row] = await db
    .insert(assignments)
    .values({
      userId: session.user.id,
      subjectId: body.subjectId || null,
      title: body.title,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      isDone: false,
      description: body.description || null,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
