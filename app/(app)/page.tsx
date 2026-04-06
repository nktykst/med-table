"use client";

import { useState, useEffect, useRef } from "react";
import { TimetableGrid } from "@/components/timetable/TimetableGrid";
import { MonthView } from "@/components/timetable/MonthView";
import { BulkRegisterDrawer } from "@/components/timetable/BulkRegisterDrawer";
import { CalendarDays, CalendarRange, ListPlus } from "lucide-react";

type View = "week" | "month";
type Subject = { id: string; name: string; color: string };

export default function TimetablePage() {
  const [view, setView] = useState<View>("week");
  const [jumpDate, setJumpDate] = useState<string | undefined>();
  const [bulkOpen, setBulkOpen] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const refreshRef = useRef<() => void>(() => {});

  useEffect(() => {
    fetch("/api/subjects").then((r) => r.json()).then(setSubjects);
  }, []);

  function handleSelectDate(date: string) {
    setJumpDate(date);
    setView("week");
  }

  // 一括登録完了後にグリッドをリフレッシュ
  function handleBulkDone() {
    setJumpDate(undefined);
    // TimetableGrid を key で再マウントして再フェッチ
    setJumpDate(jumpDate ?? "__refresh__");
    setTimeout(() => setJumpDate(undefined), 0);
  }

  return (
    <div className="flex flex-col h-full">
      {/* ビュー切替タブ */}
      <div className="bg-white border-b flex items-center gap-1 px-4 py-2">
        <button
          onClick={() => setView("week")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            view === "week" ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          週
        </button>
        <button
          onClick={() => setView("month")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            view === "month" ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          <CalendarRange className="w-4 h-4" />
          月
        </button>

        {/* 一括登録ボタン */}
        <button
          onClick={() => setBulkOpen(true)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ListPlus className="w-4 h-4" />
          一括登録
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {view === "week" ? (
          <TimetableGrid key={jumpDate} initialDate={jumpDate} />
        ) : (
          <MonthView onSelectDate={handleSelectDate} />
        )}
      </div>

      <BulkRegisterDrawer
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        subjects={subjects}
        onDone={handleBulkDone}
      />
    </div>
  );
}
