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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExternalLink, CheckCircle2, Clock, XCircle, Plus, ListPlus, Trash2 } from "lucide-react";
import { QuickAddSubject } from "./QuickAddSubject";
import type { ResolvedSlot } from "@/lib/slot-resolver";
import { TIME_SLOTS } from "@/lib/slot-resolver";

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

type Props = {
  slot: ResolvedSlot | null;
  weekId: string | null;
  ensureWeek: () => Promise<{ id: string }>;
  open: boolean;
  onClose: () => void;
  onAttendanceChange: (dayOfWeek: number, period: number, status: string) => void;
  onSlotChange: (dayOfWeek: number, period: number, subject: Subject | null) => void;
  onBulkRegister: (dayOfWeek: number, period: number) => void;
  onSubjectAdded: (subject: Subject) => void;
  assignments: Assignment[];
  subjects: Subject[];
};

const ATTENDANCE_OPTIONS = [
  { value: "present", label: "出席", icon: CheckCircle2, color: "text-green-600" },
  { value: "late", label: "遅刻", icon: Clock, color: "text-yellow-600" },
  { value: "absent", label: "欠席", icon: XCircle, color: "text-red-600" },
] as const;

export function SlotDrawer({
  slot,
  weekId,
  ensureWeek,
  open,
  onBulkRegister,
  onSubjectAdded,
  onClose,
  onAttendanceChange,
  onSlotChange,
  assignments,
  subjects,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pendingSubjectId, setPendingSubjectId] = useState<string | null>(null);

  if (!slot) return null;

  const timeSlot = TIME_SLOTS.find((t) => t.period === slot.period);
  const currentStatus = slot.attendance?.status ?? "present";
  const currentSubjectId = slot.subject?.id ?? "";
  const selectedSubjectId = pendingSubjectId ?? currentSubjectId;

  const subjectAssignments = slot.subject
    ? assignments.filter((a) => a.subject?.id === slot.subject?.id)
    : [];

  async function handleSubjectChange(subjectId: string) {
    if (!slot) return;
    setSaving(true);

    const { id } = weekId ? { id: weekId } : await ensureWeek();

    await fetch(`/api/weeks/${id}/overrides`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dayOfWeek: slot.dayOfWeek,
        period: slot.period,
        subjectId: subjectId || null,
        isCancelled: false,
      }),
    });

    const subject = subjects.find((s) => s.id === subjectId) ?? null;
    onSlotChange(slot.dayOfWeek, slot.period, subject);
    setSaving(false);
  }

  async function handleDelete() {
    if (!slot) return;
    setSaving(true);
    const { id } = weekId ? { id: weekId } : await ensureWeek();

    // isEmpty=true で override を作成 → パターンを空で上書き
    await fetch(`/api/weeks/${id}/overrides`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dayOfWeek: slot.dayOfWeek,
        period: slot.period,
        isEmpty: true,
      }),
    });

    onSlotChange(slot.dayOfWeek, slot.period, null);
    setSaving(false);
    setConfirmDelete(false);
    onClose();
  }

  async function handleAttendance(status: string) {
    if (!slot) return;
    setSaving(true);

    const { id } = weekId ? { id: weekId } : await ensureWeek();

    await fetch("/api/attendances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weekId: id,
        dayOfWeek: slot.dayOfWeek,
        period: slot.period,
        status,
      }),
    });

    setSaving(false);
    onAttendanceChange(slot.dayOfWeek, slot.period, status);
  }

  const DAY_LABELS = ["", "月", "火", "水", "木", "金"];

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            <span>{DAY_LABELS[slot.dayOfWeek]}曜日</span>
            <span>·</span>
            <span>第{slot.period}限</span>
            {timeSlot && <span>{timeSlot.start}〜{timeSlot.end}</span>}
          </div>

          {/* 科目セレクター */}
          <div className="flex items-center gap-3">
            {slot.subject && (
              <div
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: slot.subject.color }}
              />
            )}
            <div className="flex-1">
              <SheetTitle className="text-left text-base mb-2">
                {slot.subject ? slot.subject.name : "科目未設定"}
              </SheetTitle>
              <div className="flex gap-2">
                <Select
                  value={selectedSubjectId}
                  onValueChange={(v) => setPendingSubjectId(v ?? "")}
                >
                  <SelectTrigger className="h-9 text-sm flex-1">
                    <SelectValue placeholder="科目を選ぶ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">設定しない</SelectItem>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                          {s.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {pendingSubjectId !== null && pendingSubjectId !== currentSubjectId && (
                  <button
                    onClick={() => {
                      handleSubjectChange(pendingSubjectId);
                      setPendingSubjectId(null);
                    }}
                    disabled={saving}
                    className="h-9 px-3 rounded-md bg-blue-600 text-white text-sm font-medium shrink-0 hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? "…" : "登録"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 科目詳細 */}
          {slot.subject && (
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {slot.subject.room && (
                <span className="text-sm text-gray-500">{slot.subject.room}</span>
              )}
              {slot.subject.isOnline && (
                <Badge variant="secondary" className="text-xs">オンライン</Badge>
              )}
            </div>
          )}
        </SheetHeader>

        {/* クイック科目追加 */}
        <QuickAddSubject
          existingCount={subjects.length}
          onAdded={(s) => {
            onSubjectAdded(s);
            setPendingSubjectId(null);
            handleSubjectChange(s.id);
          }}
        />

        {/* 繰り返し登録 */}
        <button
          onClick={() => { onClose(); onBulkRegister(slot.dayOfWeek, slot.period); }}
          className="flex items-center gap-2 text-sm text-blue-600 hover:underline mt-1"
        >
          <ListPlus className="w-4 h-4" />
          この曜日・時限を複数週まとめて登録する
        </button>

        {subjects.length === 0 && !slot.subject && (
          <div className="bg-blue-50 text-blue-700 rounded-lg px-3 py-2 text-sm mb-4">
            先に「設定 → 科目管理」で科目を登録してください
          </div>
        )}

        {slot.isCancelled && (
          <div className="bg-red-50 text-red-600 rounded-lg px-3 py-2 text-sm mb-4">
            この授業は休講です
          </div>
        )}

        {slot.subject?.syllabusUrl && (
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

        {slot.subject && (
          <>
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
          </>
        )}

        {/* 削除ボタン */}
        {slot.subject && (
          <>
            <Separator className="my-4" />
            {confirmDelete ? (
              <div className="flex items-center justify-between bg-red-50 rounded-xl px-4 py-3">
                <span className="text-sm text-red-600">この授業を削除しますか？</span>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-sm text-gray-500"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={saving}
                    className="text-sm text-red-600 font-semibold"
                  >
                    削除
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-500 transition-colors w-full py-2"
              >
                <Trash2 className="w-4 h-4" />
                この授業を削除
              </button>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
