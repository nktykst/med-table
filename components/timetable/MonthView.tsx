"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfISOWeek,
  addDays,
  isSameMonth,
  isToday,
  parseISO,
} from "date-fns";
import { ja } from "date-fns/locale";
import type { MonthData, MonthSlot } from "@/app/api/timetable/month/route";

const DOW_LABELS = ["月", "火", "水", "木", "金", "土", "日"];

type Props = {
  onSelectDate: (date: string) => void; // 日付タップ → 週表示へ
};

export function MonthView({ onSelectDate }: Props) {
  const [baseDate, setBaseDate] = useState(() => new Date());
  const [monthData, setMonthData] = useState<MonthData>({});
  const [loading, setLoading] = useState(true);

  const year = baseDate.getFullYear();
  const month = baseDate.getMonth() + 1;

  useEffect(() => {
    setLoading(true);
    fetch(`/api/timetable/month?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((data: MonthData) => {
        setMonthData(data);
        setLoading(false);
      });
  }, [year, month]);

  // カレンダーに表示する日を生成（月曜始まり、6週分）
  const monthStart = startOfMonth(baseDate);
  const calStart = startOfISOWeek(monthStart); // 月初の週の月曜
  const days: Date[] = Array.from({ length: 42 }, (_, i) => addDays(calStart, i));

  function prevMonth() {
    setBaseDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }
  function nextMonth() {
    setBaseDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー */}
      <div className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <button onClick={prevMonth} className="p-2 rounded-full hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <p className="text-sm font-semibold text-gray-800">
            {format(baseDate, "yyyy年M月", { locale: ja })}
          </p>
          <button onClick={nextMonth} className="p-2 rounded-full hover:bg-gray-100">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-2">
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 mb-1">
          {DOW_LABELS.map((d, i) => (
            <div
              key={d}
              className={`text-center text-xs font-semibold py-1 ${
                i === 5 ? "text-blue-400" : i === 6 ? "text-red-400" : "text-gray-500"
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* カレンダーグリッド */}
        <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-xl overflow-hidden">
          {days.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const isCurrentMonth = isSameMonth(day, baseDate);
            const isWeekend = day.getDay() === 6 || day.getDay() === 0;
            const slots = monthData[dateStr] ?? [];
            const today = isToday(day);

            // 同じ科目の重複を除いた色リスト（最大5個）
            const uniqueSubjects = Array.from(
              new Map(slots.filter((s) => !s.isCancelled).map((s) => [s.subjectId, s])).values()
            ).slice(0, 5);

            return (
              <button
                key={dateStr}
                onClick={() => isCurrentMonth && !isWeekend && onSelectDate(dateStr)}
                disabled={!isCurrentMonth || isWeekend}
                className={`
                  bg-white min-h-[64px] p-1.5 text-left flex flex-col gap-1
                  ${!isCurrentMonth ? "opacity-30" : ""}
                  ${isWeekend ? "bg-gray-50 cursor-default" : "hover:bg-blue-50 active:bg-blue-100 transition-colors"}
                `}
              >
                {/* 日付 */}
                <div className="flex items-center justify-center w-6 h-6 mx-auto">
                  <span
                    className={`text-xs font-medium leading-none w-6 h-6 flex items-center justify-center rounded-full ${
                      today
                        ? "bg-blue-600 text-white"
                        : isWeekend
                        ? day.getDay() === 6
                          ? "text-blue-400"
                          : "text-red-400"
                        : "text-gray-700"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                </div>

                {/* 授業ドット */}
                {loading ? (
                  isCurrentMonth && !isWeekend ? (
                    <div className="flex gap-0.5 flex-wrap justify-center">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-gray-200 animate-pulse"
                          style={{ animationDelay: `${i * 80}ms` }}
                        />
                      ))}
                    </div>
                  ) : null
                ) : uniqueSubjects.length > 0 ? (
                  <div className="space-y-0.5 w-full">
                    {uniqueSubjects.slice(0, 3).map((s) => (
                      <div
                        key={s.subjectId}
                        className="rounded text-[9px] leading-tight px-1 py-0.5 truncate text-white font-medium"
                        style={{ backgroundColor: s.subjectColor }}
                      >
                        {s.subjectName}
                      </div>
                    ))}
                    {uniqueSubjects.length > 3 && (
                      <div className="text-[9px] text-gray-400 text-center">
                        +{uniqueSubjects.length - 3}
                      </div>
                    )}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
