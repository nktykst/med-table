"use client";

import { useState } from "react";
import { TimetableGrid } from "@/components/timetable/TimetableGrid";
import { MonthView } from "@/components/timetable/MonthView";
import { CalendarDays, CalendarRange } from "lucide-react";

type View = "week" | "month";

export default function TimetablePage() {
  const [view, setView] = useState<View>("week");
  const [jumpDate, setJumpDate] = useState<string | undefined>();

  function handleSelectDate(date: string) {
    setJumpDate(date);
    setView("week");
  }

  return (
    <div className="flex flex-col h-full">
      {/* ビュー切替タブ */}
      <div className="bg-white border-b flex items-center justify-center gap-1 px-4 py-2">
        <button
          onClick={() => setView("week")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            view === "week"
              ? "bg-blue-600 text-white"
              : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          週
        </button>
        <button
          onClick={() => setView("month")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            view === "month"
              ? "bg-blue-600 text-white"
              : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          <CalendarRange className="w-4 h-4" />
          月
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {view === "week" ? (
          <TimetableGrid key={jumpDate} initialDate={jumpDate} />
        ) : (
          <MonthView onSelectDate={handleSelectDate} />
        )}
      </div>
    </div>
  );
}
