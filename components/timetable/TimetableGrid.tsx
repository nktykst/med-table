"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { SlotCell } from "./SlotCell";
import { SlotDrawer } from "./SlotDrawer";
import type { ResolvedSlot } from "@/lib/slot-resolver";
import { TIME_SLOTS } from "@/lib/slot-resolver";
import { format, addDays, parseISO, startOfISOWeek, getISOWeek } from "date-fns";
import { ja } from "date-fns/locale";

const DAYS = ["月", "火", "水", "木", "金"];

type Week = {
  id: string;
  weekNumber: number;
  startDate: string;
  label: string | null;
  isHoliday: boolean | null;
  holidayLabel: string | null;
};

type Subject = {
  id: string;
  name: string;
  color: string;
  room: string | null;
  isOnline: boolean | null;
  syllabusUrl: string | null;
};

type Assignment = {
  id: string;
  title: string;
  dueDate: string | null;
  isDone: boolean;
  subject: { id: string; name: string; color: string } | null;
};

type SelectedCell = { dayOfWeek: number; period: number };

export function TimetableGrid() {
  const [week, setWeek] = useState<Week | null>(null);
  const [slots, setSlots] = useState<ResolvedSlot[]>([]);
  const [allWeeks, setAllWeeks] = useState<Week[]>([]);
  const [weekIdx, setWeekIdx] = useState(0);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/weeks").then((r) => r.json()),
      fetch("/api/assignments").then((r) => r.json()),
      fetch("/api/subjects").then((r) => r.json()),
    ]).then(async ([weeksData, assignmentsData, subjectsData]: [Week[], Assignment[], Subject[]]) => {
      setAssignments(assignmentsData);
      setSubjects(subjectsData);

      let weeks = weeksData;

      // 週が1件もなければ今週を自動作成
      if (weeks.length === 0) {
        const today = new Date();
        const monday = startOfISOWeek(today);
        const weekNum = getISOWeek(today);
        const startDate = format(monday, "yyyy-MM-dd");

        const res = await fetch("/api/weeks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ weekNumber: weekNum, startDate }),
        });
        const newWeek: Week = await res.json();
        weeks = [newWeek];
      }

      setAllWeeks(weeks);
      const today = format(new Date(), "yyyy-MM-dd");
      const idx = weeks.findLastIndex((w) => w.startDate <= today);
      setWeekIdx(idx >= 0 ? idx : 0);
    });
  }, []);

  useEffect(() => {
    if (allWeeks.length === 0) return;
    const w = allWeeks[weekIdx];
    if (!w) return;

    setLoading(true);
    setWeek(w);
    fetch(`/api/weeks/${w.id}`)
      .then((r) => r.json())
      .then((data: ResolvedSlot[]) => {
        setSlots(data);
        setLoading(false);
      });
  }, [allWeeks, weekIdx]);

  const handleAttendanceChange = useCallback(
    (dayOfWeek: number, period: number, status: string) => {
      setSlots((prev) =>
        prev.map((s) =>
          s.dayOfWeek === dayOfWeek && s.period === period
            ? { ...s, attendance: s.attendance ? { ...s.attendance, status } : { id: "", status } }
            : s
        )
      );
    },
    []
  );

  const handleSlotChange = useCallback(
    (dayOfWeek: number, period: number, subject: Subject | null) => {
      setSlots((prev) => {
        const exists = prev.find((s) => s.dayOfWeek === dayOfWeek && s.period === period);
        if (exists) {
          return prev.map((s) =>
            s.dayOfWeek === dayOfWeek && s.period === period
              ? { ...s, subject, overrideId: "updated" }
              : s
          );
        }
        // 新規スロット追加
        return [
          ...prev,
          {
            dayOfWeek,
            period,
            subject,
            note: null,
            isCancelled: false,
            attendance: null,
            overrideId: "updated",
          },
        ];
      });
    },
    []
  );

  function getSlot(day: number, period: number): ResolvedSlot {
    return (
      slots.find((s) => s.dayOfWeek === day && s.period === period) ?? {
        dayOfWeek: day,
        period,
        subject: null,
        note: null,
        isCancelled: false,
        attendance: null,
        overrideId: null,
      }
    );
  }

  function openCell(day: number, period: number) {
    setSelectedCell({ dayOfWeek: day, period });
    setDrawerOpen(true);
  }

  const weekDates = week
    ? Array.from({ length: 5 }, (_, i) =>
        format(addDays(parseISO(week.startDate), i), "M/d", { locale: ja })
      )
    : [];

  const endDate = week
    ? format(addDays(parseISO(week.startDate), 4), "M/d", { locale: ja })
    : "";

  const weekAssignments = week
    ? assignments.filter((a) => {
        if (!a.dueDate || a.isDone) return false;
        const end = format(addDays(parseISO(week.startDate), 6), "yyyy-MM-dd");
        return a.dueDate >= week.startDate && a.dueDate <= end + "T99";
      })
    : [];

  const selectedSlot = selectedCell
    ? getSlot(selectedCell.dayOfWeek, selectedCell.period)
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setWeekIdx((i) => Math.max(0, i - 1))}
            disabled={weekIdx === 0}
            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            {week ? (
              <>
                <p className="text-sm font-semibold text-gray-800">
                  第{week.weekNumber}週{week.label && ` · ${week.label}`}
                </p>
                <p className="text-xs text-gray-500">
                  {format(parseISO(week.startDate), "M/d", { locale: ja })}〜{endDate}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-400">読み込み中...</p>
            )}
          </div>

          <button
            onClick={() => setWeekIdx((i) => Math.min(allWeeks.length - 1, i + 1))}
            disabled={weekIdx >= allWeeks.length - 1}
            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Due this week banner */}
      {weekAssignments.length > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-amber-700 mb-1">今週の締切</p>
              <div className="flex flex-wrap gap-1">
                {weekAssignments.map((a) => (
                  <span key={a.id} className="text-xs bg-amber-100 text-amber-800 rounded px-1.5 py-0.5">
                    {a.title}
                    {a.dueDate && (
                      <span className="ml-1 text-amber-500">
                        {new Date(a.dueDate).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {week?.isHoliday ? (
        <div className="flex-1 flex items-center justify-center flex-col gap-2 text-gray-400">
          <span className="text-4xl">🎌</span>
          <p className="text-lg font-medium">{week.holidayLabel || "休日週"}</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-gray-400">読み込み中...</div>
          ) : (
            <div className="min-w-0">
              {/* Column headers */}
              <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: "2.5rem repeat(5, 1fr)" }}>
                <div />
                {DAYS.map((day, i) => (
                  <div key={day} className="text-center">
                    <p className="text-xs font-semibold text-gray-600">{day}</p>
                    <p className="text-xs text-gray-400">{weekDates[i]}</p>
                  </div>
                ))}
              </div>

              {/* Grid */}
              {TIME_SLOTS.map(({ period, start }) => (
                <div
                  key={period}
                  className="grid gap-1 mb-1"
                  style={{ gridTemplateColumns: "2.5rem repeat(5, 1fr)" }}
                >
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-xs font-bold text-gray-500">{period}</span>
                    <span className="text-[9px] text-gray-300 leading-none">{start}</span>
                  </div>

                  {[1, 2, 3, 4, 5].map((day) => (
                    <div key={day} className="min-h-[64px]">
                      <SlotCell
                        slot={getSlot(day, period)}
                        onClick={() => openCell(day, period)}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {week && (
        <SlotDrawer
          slot={selectedSlot}
          weekId={week.id}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onAttendanceChange={handleAttendanceChange}
          onSlotChange={handleSlotChange}
          assignments={assignments}
          subjects={subjects}
        />
      )}
    </div>
  );
}
