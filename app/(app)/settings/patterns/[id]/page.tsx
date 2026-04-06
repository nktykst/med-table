"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TIME_SLOTS } from "@/lib/slot-resolver";

const DAYS = ["月", "火", "水", "木", "金"];

type Subject = { id: string; name: string; color: string };
type PatternSlot = {
  dayOfWeek: number;
  period: number;
  subject: Subject | null;
};
type Pattern = { id: string; name: string; slots: PatternSlot[] };

export default function PatternDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [pattern, setPattern] = useState<Pattern | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [slots, setSlots] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/patterns/${id}`).then((r) => r.json()).then((p: Pattern) => {
      setPattern(p);
      const m: Record<string, string> = {};
      p.slots.forEach((s) => {
        m[`${s.dayOfWeek}-${s.period}`] = s.subject?.id ?? "";
      });
      setSlots(m);
    });
    fetch("/api/subjects").then((r) => r.json()).then(setSubjects);
  }, [id]);

  async function handleCellChange(day: number, period: number, subjectId: string) {
    const key = `${day}-${period}`;
    setSlots((prev) => ({ ...prev, [key]: subjectId }));
    setSaving(key);

    await fetch("/api/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patternId: id,
        dayOfWeek: day,
        period,
        subjectId: subjectId || null,
      }),
    });

    setSaving(null);
  }

  if (!pattern) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b px-4 py-3 sticky top-0 z-10 flex items-center gap-3">
        <Link href="/settings/patterns">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h1 className="text-lg font-bold flex-1 truncate">{pattern.name}</h1>
      </div>

      <div className="flex-1 overflow-auto p-2">
        <div className="min-w-0">
          {/* Column headers */}
          <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: "3rem repeat(5, 1fr)" }}>
            <div />
            {DAYS.map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-gray-600 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          {TIME_SLOTS.map(({ period, start }) => (
            <div
              key={period}
              className="grid gap-1 mb-1"
              style={{ gridTemplateColumns: "3rem repeat(5, 1fr)" }}
            >
              <div className="flex flex-col items-center justify-center">
                <span className="text-xs font-bold text-gray-500">{period}</span>
                <span className="text-[9px] text-gray-300">{start}</span>
              </div>

              {[1, 2, 3, 4, 5].map((day) => {
                const key = `${day}-${period}`;
                const currentSubjectId = slots[key] ?? "";
                const subject = subjects.find((s) => s.id === currentSubjectId);

                return (
                  <div key={day}>
                    <Select
                      value={currentSubjectId}
                      onValueChange={(v) => handleCellChange(day, period, v ?? "")}
                    >
                      <SelectTrigger
                        className="h-14 text-xs p-1 leading-tight"
                        style={
                          subject
                            ? {
                                backgroundColor: subject.color + "33",
                                borderLeft: `3px solid ${subject.color}`,
                              }
                            : {}
                        }
                      >
                        <SelectValue placeholder="—">
                          {subject ? (
                            <span className="text-xs leading-tight line-clamp-2">
                              {subject.name}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">なし</SelectItem>
                        {subjects.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: s.color }}
                              />
                              {s.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {saving === key && (
                      <div className="text-center text-[8px] text-blue-400">保存中</div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
