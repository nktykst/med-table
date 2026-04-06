import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { subjects } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 他ユーザーが公開している科目を取得（名前でグループ化して重複排除）
  const rows = await db
    .select({
      id: subjects.id,
      name: subjects.name,
      color: subjects.color,
      room: subjects.room,
      isOnline: subjects.isOnline,
      syllabusUrl: subjects.syllabusUrl,
    })
    .from(subjects)
    .where(
      and(
        eq(subjects.isPublic, true),
        ne(subjects.userId, session.user.id)
      )
    );

  // 同じ名前は1件にまとめる（最初に登録されたものを優先）
  const seen = new Set<string>();
  const unique = rows.filter((r) => {
    const key = r.name.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return NextResponse.json(unique);
}
