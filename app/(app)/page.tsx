"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { TimetableGrid } from "@/components/timetable/TimetableGrid";
import { MonthView } from "@/components/timetable/MonthView";
import { BulkRegisterDrawer } from "@/components/timetable/BulkRegisterDrawer";
import { ShareDrawer } from "@/components/timetable/ShareDrawer";
import { CalendarDays, CalendarRange, ListPlus, Share2, Pencil, Check } from "lucide-react";

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
  const [currentWeekLabel, setCurrentWeekLabel] = useState("この週");
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fetch("/api/subjects").then((r) => r.json()).then(setSubjects);
  }, []);

  useEffect(() => {
    function jumpToToday() {
      const today = format(new Date(), "yyyy-MM-dd");
      setView("week");
      setJumpDate(today);
      setCurrentWeekStart(today);
      setRefreshKey((k) => k + 1);
    }

    if (typeof window !== "undefined" && sessionStorage.getItem("timetable:jump-today")) {
      sessionStorage.removeItem("timetable:jump-today");
      jumpToToday();
    }

    window.addEventListener("timetable:jump-today", jumpToToday);
    return () => window.removeEventListener("timetable:jump-today", jumpToToday);
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
          <button
            onClick={() => setShareOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            共有
          </button>
          {editMode ? (
            <>
              <button
                onClick={() => setBulkOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <ListPlus className="w-4 h-4" />
                一括
              </button>
              <button
                onClick={() => setEditMode(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <Check className="w-4 h-4" />
                完了
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditMode(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <Pencil className="w-4 h-4" />
              編集
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {view === "week" ? (
          <TimetableGrid
            key={`${jumpDate ?? ""}-${refreshKey}`}
            initialDate={jumpDate ?? currentWeekStart}
            editMode={editMode}
            onBulkRegister={(day, period) => {
              setBulkInitDay(day);
              setBulkInitPeriod(period);
              setBulkOpen(true);
            }}
            onWeekChange={(_id, label, startDate) => {
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
        currentWeekStart={currentWeekStart}
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
