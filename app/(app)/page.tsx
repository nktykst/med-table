"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { TimetableGrid } from "@/components/timetable/TimetableGrid";
import { MonthView } from "@/components/timetable/MonthView";
import { BulkRegisterDrawer } from "@/components/timetable/BulkRegisterDrawer";
import { ShareDrawer } from "@/components/timetable/ShareDrawer";
import { CalendarDays, CalendarRange, ListPlus, Share2 } from "lucide-react";

type View = "week" | "month";
type Subject = { id: string; name: string; color: string };

export default function TimetablePage() {
  const [view, setView] = useState<View>("week");
  const [jumpDate, setJumpDate] = useState<string | undefined>();
  const [bulkOpen, setBulkOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [bulkInitDay, setBulkInitDay] = useState<number | undefined>();
  const [bulkInitPeriod, setBulkInitPeriod] = useState<number | undefined>();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [currentWeekId, setCurrentWeekId] = useState<string | null>(null);
  const [currentWeekLabel, setCurrentWeekLabel] = useState("この週");
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetch("/api/subjects").then((r) => r.json()).then(setSubjects);
  }, []);

  function handleSelectDate(date: string) {
    setJumpDate(date);
    setView("week");
  }

  function handleBulkDone() {
    // refreshKey を変えて remount しつつ、現在の週に留まる
    setRefreshKey((k) => k + 1);
  }

  function handleImportDone() {
    handleBulkDone();
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

        <div className="ml-auto flex items-center gap-1">
          {/* 共有ボタン */}
          <button
            onClick={() => setShareOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            共有
          </button>
          {/* 一括登録ボタン */}
          <button
            onClick={() => setBulkOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ListPlus className="w-4 h-4" />
            一括登録
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {view === "week" ? (
          <TimetableGrid
            key={`${jumpDate ?? ""}-${refreshKey}`}
            initialDate={jumpDate ?? currentWeekStart}
            onBulkRegister={(day, period) => {
              setBulkInitDay(day);
              setBulkInitPeriod(period);
              setBulkOpen(true);
            }}
            onWeekChange={(id, label, startDate) => {
              setCurrentWeekId(id);
              setCurrentWeekLabel(label);
              setCurrentWeekStart(startDate);
            }}
          />
        ) : (
          <MonthView onSelectDate={handleSelectDate} />
        )}
      </div>

      <BulkRegisterDrawer
        open={bulkOpen}
        onClose={() => { setBulkOpen(false); setBulkInitDay(undefined); setBulkInitPeriod(undefined); }}
        subjects={subjects}
        onSubjectAdded={(s) => setSubjects((prev) => [...prev, s])}
        onDone={handleBulkDone}
        initialDayOfWeek={bulkInitDay}
        initialPeriod={bulkInitPeriod}
      />

      <ShareDrawer
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        currentWeekStart={currentWeekStart}
        currentWeekLabel={currentWeekLabel}
        onImportDone={handleImportDone}
      />
    </div>
  );
}
