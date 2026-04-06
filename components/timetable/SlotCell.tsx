"use client";

import type { ResolvedSlot } from "@/lib/slot-resolver";
import { Badge } from "@/components/ui/badge";
import { Wifi, Ban, Plus } from "lucide-react";

type Props = {
  slot: ResolvedSlot;
  onClick: () => void;
};

const ATTENDANCE_COLORS = {
  present: "ring-2 ring-green-400",
  late: "ring-2 ring-yellow-400",
  absent: "ring-2 ring-red-400 opacity-60",
};

export function SlotCell({ slot, onClick }: Props) {
  if (!slot.subject) {
    return (
      <button
        onClick={onClick}
        className="w-full h-full min-h-[64px] rounded-lg border border-dashed border-gray-200 flex items-center justify-center hover:border-gray-300 hover:bg-gray-50 active:scale-95 transition-all"
      >
        <Plus className="w-4 h-4 text-gray-300" />
      </button>
    );
  }

  if (slot.isCancelled) {
    return (
      <button
        onClick={onClick}
        className="w-full rounded-lg bg-gray-100 h-full min-h-[64px] flex flex-col items-center justify-center gap-1 p-1 active:scale-95 transition-transform"
      >
        <Ban className="w-4 h-4 text-gray-400" />
        <span className="text-xs text-gray-400 leading-tight text-center line-clamp-2">
          {slot.subject.name}
        </span>
        <span className="text-xs text-red-400">休講</span>
      </button>
    );
  }

  const attendanceRing = slot.attendance
    ? ATTENDANCE_COLORS[slot.attendance.status as keyof typeof ATTENDANCE_COLORS] ?? ""
    : "";

  return (
    <button
      onClick={onClick}
      className={`w-full h-full min-h-[64px] rounded-lg p-1.5 text-left flex flex-col gap-0.5 transition-transform active:scale-95 ${attendanceRing}`}
      style={{
        backgroundColor: slot.subject.color + "33",
        borderLeft: `3px solid ${slot.subject.color}`,
      }}
    >
      <span className="text-xs font-semibold leading-tight line-clamp-2 text-gray-800">
        {slot.subject.name}
      </span>
      {slot.subject.room && (
        <span className="text-xs text-gray-500 leading-tight truncate">
          {slot.subject.room}
        </span>
      )}
      {slot.subject.isOnline && (
        <Wifi className="w-3 h-3 text-blue-500 mt-auto" />
      )}
    </button>
  );
}
