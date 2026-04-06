import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { weekPatterns, patternSlots, subjects } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(weekPatterns)
    .where(eq(weekPatterns.userId, session.user.id));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const [row] = await db
    .insert(weekPatterns)
    .values({
      userId: session.user.id,
      name: body.name,
      description: body.description || null,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
