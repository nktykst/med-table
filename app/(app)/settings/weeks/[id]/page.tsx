"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft, Ban } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { TIME_SLOTS } from "@/lib/slot-resolver";
import type { ResolvedSlot } from "@/lib/slot-resolver";

const DAYS = ["月", "火", "水", "木", "金"];

type Subject = { id: string; name: string; color: string };

export default function WeekOverridePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: weekId } = use(params);
  const [slots, setSlots] = useState<ResolvedSlot[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [weekLabel, setWeekLabel] = useState<string>("");
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/weeks/${weekId}`).then((r) => r.json()).then(setSlots);
    fetch("/api/subjects").then((r) => r.json()).then(setSubjects);
    fetch("/api/weeks").then((r) => r.json()).then((weeks: { id: string; weekNumber: number; label: string | null }[]) => {
      const w = weeks.find((w) => w.id === weekId);
      if (w) setWeekLabel(`第${w.weekNumber}週${w.label ? ` · ${w.label}` : ""}`);
    });
  }, [weekId]);

  async function handleOverride(
    day: number,
    period: number,
    subjectId: string,
    isCancelled: boolean
  ) {
    const key = `${day}-${period}`;
    setSaving(key);

    const res = await fetch(`/api/weeks/${weekId}/overrides`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dayOfWeek: day,
        period,
        subjectId: subjectId || null,
        isCancelled,
      }),
    });

    // Update local state
    setSlots((prev) =>
      prev.map((s) => {
        if (s.dayOfWeek === day && s.period === period) {
          const subject = subjects.find((sub) => sub.id === subjectId) ?? null;
          return {
            ...s,
            subject: subject
              ? { ...subject, isOnline: null, syllabusUrl: null, room: null }
              : s.subject,
            isCancelled,
            overrideId: "temp",
          };
        }
        return s;
      })
    );

    setSaving(null);
  }

  function getSlot(day: number, period: number) {
    return slots.find((s) => s.dayOfWeek === day && s.period === period);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b px-4 py-3 sticky top-0 z-10 flex items-center gap-3">
        <Link href="/settings">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-base font-bold leading-tight">A補正 (個別上書き)</h1>
          <p className="text-xs text-gray-500">{weekLabel}</p>
        </div>
      </div>

      <p className="text-xs text-gray-500 px-4 py-2 bg-amber-50 border-b">
        パターンを上書きして、この週だけ科目や休講を設定できます
      </p>

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

          {TIME_SLOTS.map(({ period, start }) => (
            <div
              key={period}
              className="grid gap-1 mb-2"
              style={{ gridTemplateColumns: "3rem repeat(5, 1fr)" }}
            >
              <div className="flex flex-col items-center justify-center">
                <span className="text-xs font-bold text-gray-500">{period}</span>
                <span className="text-[9px] text-gray-300">{start}</span>
              </div>

              {[1, 2, 3, 4, 5].map((day) => {
                const slot = getSlot(day, period);
                const key = `${day}-${period}`;
                const currentSubjectId = slot?.subject?.id ?? "";
                const isCancelled = slot?.isCancelled ?? false;
                const hasOverride = !!slot?.overrideId;

                return (
                  <div key={day} className="space-y-1">
                    <div
                      className={`rounded border p-1 ${hasOverride ? "border-blue-300 bg-blue-50" : ""}`}
                    >
                      <Select
                        value={currentSubjectId}
                        onValueChange={(v) => handleOverride(day, period, v ?? "", false)}
                        disabled={isCancelled}
                      >
                        <SelectTrigger
                          className="h-10 text-xs p-1"
                          style={
                            slot?.subject && !isCancelled
                              ? {
                                  backgroundColor: slot.subject.color + "33",
                                  borderLeft: `2px solid ${slot.subject.color}`,
                                }
                              : {}
                          }
                        >
                          <SelectValue>
                            {isCancelled ? (
                              <span className="flex items-center gap-1 text-red-400">
                                <Ban className="w-3 h-3" /> 休講
                              </span>
                            ) : slot?.subject ? (
                              <span className="text-xs line-clamp-2">{slot.subject.name}</span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">なし</SelectItem>
                          {subjects.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                                {s.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="flex items-center gap-1.5 mt-1">
                        <Switch
                          id={`cancel-${key}`}
                          checked={isCancelled}
                          onCheckedChange={(v) => handleOverride(day, period, currentSubjectId, v)}
                          className="scale-75"
                        />
                        <Label htmlFor={`cancel-${key}`} className="text-[10px] text-red-500">
                          休講
                        </Label>
                      </div>
                    </div>

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
