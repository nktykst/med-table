"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, CheckCircle2, Clock, XCircle } from "lucide-react";
import type { ResolvedSlot } from "@/lib/slot-resolver";
import { TIME_SLOTS } from "@/lib/slot-resolver";

type Assignment = {
  id: string;
  title: string;
  dueDate: string | null;
  isDone: boolean;
  subject: { id: string; name: string; color: string } | null;
};

type Props = {
  slot: ResolvedSlot | null;
  weekId: string;
  open: boolean;
  onClose: () => void;
  onAttendanceChange: (
    dayOfWeek: number,
    period: number,
    status: string
  ) => void;
  assignments: Assignment[];
};

const ATTENDANCE_OPTIONS = [
  { value: "present", label: "出席", icon: CheckCircle2, color: "text-green-600" },
  { value: "late", label: "遅刻", icon: Clock, color: "text-yellow-600" },
  { value: "absent", label: "欠席", icon: XCircle, color: "text-red-600" },
] as const;

export function SlotDrawer({ slot, weekId, open, onClose, onAttendanceChange, assignments }: Props) {
  const [saving, setSaving] = useState(false);

  if (!slot?.subject) return null;

  const timeSlot = TIME_SLOTS.find((t) => t.period === slot.period);
  const currentStatus = slot.attendance?.status ?? "present";

  const subjectAssignments = assignments.filter(
    (a) => a.subject?.id === slot.subject?.id
  );

  async function handleAttendance(status: string) {
    if (!slot || !weekId) return;
    setSaving(true);

    await fetch("/api/attendances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weekId,
        dayOfWeek: slot.dayOfWeek,
        period: slot.period,
        status,
      }),
    });

    setSaving(false);
    onAttendanceChange(slot.dayOfWeek, slot.period, status);
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-start gap-3">
            <div
              className="w-4 h-4 rounded-full mt-1 shrink-0"
              style={{ backgroundColor: slot.subject.color }}
            />
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-left text-lg">{slot.subject.name}</SheetTitle>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {slot.subject.room && (
                  <span className="text-sm text-gray-500">{slot.subject.room}</span>
                )}
                {slot.subject.isOnline && (
                  <Badge variant="secondary" className="text-xs">オンライン</Badge>
                )}
                {timeSlot && (
                  <span className="text-xs text-gray-400">
                    {timeSlot.start}〜{timeSlot.end}
                  </span>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        {slot.isCancelled && (
          <div className="bg-red-50 text-red-600 rounded-lg px-3 py-2 text-sm mb-4">
            この授業は休講です
          </div>
        )}

        {slot.note && (
          <p className="text-sm text-gray-600 mb-4 bg-gray-50 rounded-lg px-3 py-2">
            {slot.note}
          </p>
        )}

        {slot.subject.syllabusUrl && (
          <a
            href={slot.subject.syllabusUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-600 hover:underline mb-4"
          >
            <ExternalLink className="w-4 h-4" />
            シラバスを開く
          </a>
        )}

        <Separator className="my-4" />

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">出席状況</h3>
          <div className="grid grid-cols-3 gap-2">
            {ATTENDANCE_OPTIONS.map(({ value, label, icon: Icon, color }) => (
              <Button
                key={value}
                variant={currentStatus === value ? "default" : "outline"}
                size="sm"
                className="flex flex-col h-auto py-2 gap-1"
                onClick={() => handleAttendance(value)}
                disabled={saving}
              >
                <Icon className={`w-4 h-4 ${currentStatus === value ? "text-white" : color}`} />
                <span className="text-xs">{label}</span>
              </Button>
            ))}
          </div>
        </div>

        {subjectAssignments.length > 0 && (
          <>
            <Separator className="my-4" />
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">今週の課題</h3>
              <ul className="space-y-2">
                {subjectAssignments.map((a) => (
                  <li
                    key={a.id}
                    className={`flex items-start gap-2 text-sm p-2 rounded-lg ${
                      a.isDone ? "opacity-50 line-through" : ""
                    }`}
                  >
                    <span className="text-gray-600">{a.title}</span>
                    {a.dueDate && (
                      <span className="text-xs text-gray-400 ml-auto shrink-0">
                        {new Date(a.dueDate).toLocaleDateString("ja-JP", {
                          month: "numeric",
                          day: "numeric",
                        })}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
