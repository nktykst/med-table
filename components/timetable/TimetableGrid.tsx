"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { SlotCell } from "./SlotCell";
import { SlotDrawer } from "./SlotDrawer";
import type { ResolvedSlot } from "@/lib/slot-resolver";
import { TIME_SLOTS } from "@/lib/slot-resolver";
import { format, addDays, parseISO } from "date-fns";
import { ja } from "date-fns/locale";

const DAYS = ["月", "火", "水", "木", "金"];

// 学年内の週番号（4月第1月曜日 = 第1週）
function getAcademicWeekNumber(monday: Date): number {
  const m = monday.getMonth();
  const academicYear = m >= 3 ? monday.getFullYear() : monday.getFullYear() - 1;
  const apr1 = new Date(academicYear, 3, 1);
  const dow = apr1.getDay();
  const daysToMon = dow === 0 ? 1 : dow === 1 ? 0 : 8 - dow;
  const academicStart = new Date(apr1.getTime() + daysToMon * 86400000);
  return Math.floor((monday.getTime() - academicStart.getTime()) / (7 * 86400000)) + 1;
}

// 今から -2年 〜 +10年 の全月曜日を生成
function generateVirtualWeeks() {
  const today = new Date();
  const m = today.getMonth();
  const startYear = (m >= 3 ? today.getFullYear() : today.getFullYear() - 1) - 2;
  const endYear = today.getFullYear() + 10;

  const apr1 = new Date(startYear, 3, 1);
  const dow = apr1.getDay();
  const daysToMon = dow === 0 ? 1 : dow === 1 ? 0 : 8 - dow;
  let cur = new Date(apr1.getTime() + daysToMon * 86400000);
  const limit = new Date(endYear + 1, 3, 1);

  const weeks: { startDate: string; weekNumber: number }[] = [];
  while (cur < limit) {
    weeks.push({
      startDate: format(cur, "yyyy-MM-dd"),
      weekNumber: getAcademicWeekNumber(cur),
    });
    cur = new Date(cur.getTime() + 7 * 86400000);
  }
  return weeks;
}

const VIRTUAL_WEEKS = generateVirtualWeeks();

type DbWeek = {
  id: string;
  weekNumber: number;
  startDate: string;
  label: string | null;
  patternId: string | null;
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

export function TimetableGrid({
  initialDate,
  onBulkRegister,
  onWeekChange,
}: {
  initialDate?: string;
  onBulkRegister?: (dayOfWeek: number, period: number) => void;
  onWeekChange?: (weekId: string | null, label: string) => void;
}) {
  // DB に保存済みの週 (startDate → DbWeek)
  const [dbWeeks, setDbWeeks] = useState<Map<string, DbWeek>>(new Map());
  const [slots, setSlots] = useState<ResolvedSlot[]>([]);
  const [weekIdx, setWeekIdx] = useState(0);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedCell, setSelectedCell] = useState<{ dayOfWeek: number; period: number } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const creatingWeek = useRef<Map<string, Promise<DbWeek>>>(new Map());

  const vw = VIRTUAL_WEEKS[weekIdx];
  const dbWeek = vw ? dbWeeks.get(vw.startDate) ?? null : null;

  // 初期化
  useEffect(() => {
    const target = initialDate ?? format(new Date(), "yyyy-MM-dd");
    const idx = VIRTUAL_WEEKS.findLastIndex((w) => w.startDate <= target);
    setWeekIdx(idx >= 0 ? idx : 0);

    Promise.all([
      fetch("/api/weeks").then((r) => r.json()),
      fetch("/api/assignments").then((r) => r.json()),
      fetch("/api/subjects").then((r) => r.json()),
    ]).then(([weeksData, assignmentsData, subjectsData]: [DbWeek[], Assignment[], Subject[]]) => {
      const map = new Map<string, DbWeek>();
      weeksData.forEach((w) => map.set(w.startDate, w));
      setDbWeeks(map);
      setAssignments(assignmentsData);
      setSubjects(subjectsData);
    });
  }, []);

  // 週切替時にスロットを取得
  useEffect(() => {
    if (!vw) return;
    const label = `第${vw.weekNumber}週${dbWeek?.label ? ` · ${dbWeek.label}` : ""}`;
    if (!dbWeek) {
      setSlots([]);
      onWeekChange?.(null, label);
      return;
    }
    onWeekChange?.(dbWeek.id, label);
    setLoading(true);
    fetch(`/api/weeks/${dbWeek.id}`)
      .then((r) => r.json())
      .then((data: ResolvedSlot[]) => {
        setSlots(data);
        setLoading(false);
      });
  }, [weekIdx, dbWeek?.id]);

  // DB週レコードを必要な時だけ作成（重複防止）
  const ensureWeek = useCallback(async (): Promise<DbWeek> => {
    if (!vw) throw new Error("no virtual week");
    if (dbWeek) return dbWeek;

    // 作成中なら同じPromiseを返す
    const existing = creatingWeek.current.get(vw.startDate);
    if (existing) return existing;

    const promise = fetch("/api/weeks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekNumber: vw.weekNumber, startDate: vw.startDate }),
    })
      .then((r) => r.json())
      .then((w: DbWeek) => {
        setDbWeeks((prev) => new Map(prev).set(w.startDate, w));
        creatingWeek.current.delete(vw.startDate);
        return w;
      });

    creatingWeek.current.set(vw.startDate, promise);
    return promise;
  }, [vw, dbWeek]);

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
        return [...prev, { dayOfWeek, period, subject, note: null, isCancelled: false, attendance: null, overrideId: "updated" }];
      });
    },
    []
  );

  function getSlot(day: number, period: number): ResolvedSlot {
    return (
      slots.find((s) => s.dayOfWeek === day && s.period === period) ?? {
        dayOfWeek: day, period, subject: null, note: null, isCancelled: false, attendance: null, overrideId: null,
      }
    );
  }

  const weekDates = vw
    ? Array.from({ length: 5 }, (_, i) =>
        format(addDays(parseISO(vw.startDate), i), "M/d", { locale: ja })
      )
    : [];
  const endDate = vw ? format(addDays(parseISO(vw.startDate), 4), "M/d", { locale: ja }) : "";

  const weekAssignments = vw
    ? assignments.filter((a) => {
        if (!a.dueDate || a.isDone) return false;
        const end = format(addDays(parseISO(vw.startDate), 6), "yyyy-MM-dd");
        return a.dueDate >= vw.startDate && a.dueDate <= end + "T99";
      })
    : [];

  const selectedSlot = selectedCell ? getSlot(selectedCell.dayOfWeek, selectedCell.period) : null;

  // 今週かどうかの判定（ヘッダー強調用）
  const today = format(new Date(), "yyyy-MM-dd");
  const isCurrentWeek = vw
    ? vw.startDate <= today && today <= format(addDays(parseISO(vw.startDate), 6), "yyyy-MM-dd")
    : false;

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
            {vw && (
              <>
                <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5 justify-center">
                  {isCurrentWeek && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                  )}
                  第{vw.weekNumber}週
                  {dbWeek?.label && ` · ${dbWeek.label}`}
                </p>
                <p className="text-xs text-gray-500">
                  {format(parseISO(vw.startDate), "M/d", { locale: ja })}〜{endDate}
                </p>
              </>
            )}
          </div>

          <button
            onClick={() => setWeekIdx((i) => Math.min(VIRTUAL_WEEKS.length - 1, i + 1))}
            disabled={weekIdx >= VIRTUAL_WEEKS.length - 1}
            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 今週の締切バナー */}
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

      {dbWeek?.isHoliday ? (
        <div className="flex-1 flex items-center justify-center flex-col gap-2 text-gray-400">
          <span className="text-4xl">🎌</span>
          <p className="text-lg font-medium">{dbWeek.holidayLabel || "休日週"}</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-2">
          {loading ? (
            <div className="min-w-0">
              {/* スケルトンヘッダー */}
              <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: "2.5rem repeat(5, 1fr)" }}>
                <div />
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="text-center space-y-1 py-1">
                    <div className="h-3 w-4 bg-gray-200 rounded animate-pulse mx-auto" />
                    <div className="h-3 w-7 bg-gray-100 rounded animate-pulse mx-auto" />
                  </div>
                ))}
              </div>
              {/* スケルトングリッド */}
              {TIME_SLOTS.map(({ period }) => (
                <div key={period} className="grid gap-1 mb-1" style={{ gridTemplateColumns: "2.5rem repeat(5, 1fr)" }}>
                  <div className="flex flex-col items-center justify-center gap-1">
                    <div className="h-3 w-3 bg-gray-200 rounded animate-pulse" />
                    <div className="h-2 w-6 bg-gray-100 rounded animate-pulse" />
                  </div>
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="min-h-[64px] rounded-lg bg-gray-100 animate-pulse"
                      style={{ animationDelay: `${(period * 5 + i) * 30}ms` }}
                    />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="min-w-0">
              <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: "2.5rem repeat(5, 1fr)" }}>
                <div />
                {DAYS.map((day, i) => (
                  <div key={day} className="text-center">
                    <p className="text-xs font-semibold text-gray-600">{day}</p>
                    <p className="text-xs text-gray-400">{weekDates[i]}</p>
                  </div>
                ))}
              </div>

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
                        onClick={() => {
                          setSelectedCell({ dayOfWeek: day, period });
                          setDrawerOpen(true);
                        }}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {vw && (
        <SlotDrawer
          slot={selectedSlot}
          weekId={dbWeek?.id ?? null}
          ensureWeek={ensureWeek}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onAttendanceChange={handleAttendanceChange}
          onSlotChange={handleSlotChange}
          onBulkRegister={onBulkRegister ?? (() => {})}
          onSubjectAdded={(s) => setSubjects((prev) => [...prev, s])}
          assignments={assignments}
          subjects={subjects}
        />
      )}
    </div>
  );
}
