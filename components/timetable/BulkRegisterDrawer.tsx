"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { QuickAddSubject } from "./QuickAddSubject";
import { format, addDays, parseISO, startOfISOWeek } from "date-fns";
import { ja } from "date-fns/locale";
import { TIME_SLOTS } from "@/lib/slot-resolver";

type Subject = {
  id: string;
  name: string;
  color: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  subjects: Subject[];
  onSubjectAdded: (subject: Subject) => void;
  onDone: () => void;
  initialDayOfWeek?: number;
  initialPeriod?: number;
  currentWeekStart?: string;
};

const DAYS = [
  { value: 1, label: "月" },
  { value: 2, label: "火" },
  { value: 3, label: "水" },
  { value: 4, label: "木" },
  { value: 5, label: "金" },
];

export function BulkRegisterDrawer({ open, onClose, subjects, onSubjectAdded, onDone, initialDayOfWeek, initialPeriod, currentWeekStart }: Props) {
  const [step, setStep] = useState<"form" | "preview" | "done">("form");

  // フォーム状態
  const [subjectId, setSubjectId] = useState("");
  const [dayOfWeeks, setDayOfWeeks] = useState<number[]>(initialDayOfWeek ? [initialDayOfWeek] : [1]);
  const [periodFrom, setPeriodFrom] = useState(initialPeriod ?? 1);
  const [periodTo, setPeriodTo] = useState(initialPeriod ?? 1);
  const [startDate, setStartDate] = useState(() => {
    // 今週の月曜日をデフォルト
    return format(startOfISOWeek(new Date()), "yyyy-MM-dd");
  });
  const [repeatWeeks, setRepeatWeeks] = useState(15);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // open のたびに初期値を反映
  useEffect(() => {
    if (open) {
      setStep("form");
      setError("");
      if (initialDayOfWeek) setDayOfWeeks([initialDayOfWeek]);
      if (initialPeriod) { setPeriodFrom(initialPeriod); setPeriodTo(initialPeriod); }
      // 現在表示中の週を開始週にリセット
      if (currentWeekStart) setStartDate(currentWeekStart);
    }
  }, [open, initialDayOfWeek, initialPeriod, currentWeekStart]);

  const selectedSubject = subjects.find((s) => s.id === subjectId);

  // プレビュー用: 登録対象の日付一覧（曜日×週）
  const previewDates = Array.from({ length: repeatWeeks }, (_, i) => {
    const monday = addDays(parseISO(startDate), i * 7);
    return [...dayOfWeeks].sort().map((d) => format(addDays(monday, d - 1), "yyyy-MM-dd"));
  }).flat();

  function handleClose() {
    setStep("form");
    setError("");
    onClose();
  }

  async function handleSubmit() {
    if (!subjectId) { setError("科目を選択してください"); return; }
    if (!dayOfWeeks.length) { setError("曜日を選択してください"); return; }
    if (periodFrom > periodTo) { setError("開始時限は終了時限以下にしてください"); return; }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/slots/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId, dayOfWeeks, periodFrom, periodTo, startDate, repeatWeeks }),
      });
      if (!res.ok) throw new Error("登録に失敗しました");
      setStep("done");
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "登録に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  const periods = periodFrom === periodTo
    ? `第${periodFrom}限`
    : `第${periodFrom}〜${periodTo}限`;

  function toggleDay(d: number) {
    setDayOfWeeks((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  }

  const dayLabels = [...dayOfWeeks].sort().map((d) => DAYS.find((x) => x.value === d)?.label).join("・");

  return (
    <Sheet open={open} onOpenChange={(o) => !o && handleClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[92vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle>授業を一括登録</SheetTitle>
        </SheetHeader>

        {step === "done" ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
            <p className="text-lg font-semibold text-gray-800">登録完了</p>
            <p className="text-sm text-gray-500">
              {selectedSubject?.name} を {repeatWeeks}週間分登録しました
            </p>
            <Button onClick={handleClose} className="w-full mt-2">閉じる</Button>
          </div>
        ) : step === "preview" ? (
          <div className="space-y-4">
            {/* サマリー */}
            <div
              className="rounded-xl p-3 text-white"
              style={{ backgroundColor: selectedSubject?.color }}
            >
              <p className="font-semibold">{selectedSubject?.name}</p>
              <p className="text-sm opacity-90">
                {dayLabels}曜日 · {periods}
              </p>
              <p className="text-sm opacity-90">
                {repeatWeeks}週間 · {previewDates.length}回（{(periodTo - periodFrom + 1) * dayOfWeeks.length * repeatWeeks}コマ）
              </p>
            </div>

            {/* 対象日一覧 */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">登録対象日</p>
              <div className="max-h-48 overflow-y-auto rounded-xl border divide-y">
                {previewDates.map((d, i) => (
                  <div key={d} className="flex items-center gap-3 px-3 py-2">
                    <span className="text-xs text-gray-400 w-6">{i + 1}</span>
                    <span className="text-sm text-gray-700">
                      {format(parseISO(d), "yyyy年M月d日(E)", { locale: ja })}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("form")}>
                戻る
              </Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={saving}>
                {saving ? "登録中..." : "登録する"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* 科目選択 */}
            <div className="space-y-2">
              <Label>科目</Label>
              <div className="grid grid-cols-2 gap-2">
                {subjects.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSubjectId(s.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                      subjectId === s.id ? "border-2 shadow-sm" : "border-gray-200"
                    }`}
                    style={subjectId === s.id ? { borderColor: s.color } : {}}
                  >
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="text-sm font-medium truncate">{s.name}</span>
                  </button>
                ))}
              </div>
              <QuickAddSubject
                existingCount={subjects.length}
                onAdded={(s) => {
                  onSubjectAdded(s);
                  setSubjectId(s.id);
                }}
              />
            </div>

            <Separator />

            {/* 曜日選択（複数可） */}
            <div className="space-y-2">
              <Label>曜日（複数選択可）</Label>
              <div className="flex gap-2">
                {DAYS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDay(d.value)}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                      dayOfWeeks.includes(d.value)
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              {dayOfWeeks.length === 0 && (
                <p className="text-xs text-red-500">曜日を1つ以上選択してください</p>
              )}
            </div>

            <Separator />

            {/* 時限選択 */}
            <div className="space-y-2">
              <Label>時限</Label>
              <div className="grid grid-cols-7 gap-1">
                {TIME_SLOTS.map(({ period, start }) => {
                  const inRange = period >= periodFrom && period <= periodTo;
                  const isFrom = period === periodFrom;
                  const isTo = period === periodTo;
                  return (
                    <button
                      key={period}
                      type="button"
                      onClick={() => {
                        if (period < periodFrom) {
                          setPeriodFrom(period);
                        } else if (period > periodTo) {
                          setPeriodTo(period);
                        } else if (period === periodFrom && period < periodTo) {
                          setPeriodFrom(period + 1);
                        } else if (period === periodTo && period > periodFrom) {
                          setPeriodTo(period - 1);
                        } else {
                          setPeriodFrom(period);
                          setPeriodTo(period);
                        }
                      }}
                      className={`flex flex-col items-center rounded-lg py-2 transition-colors ${
                        inRange
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      <span className="text-sm font-bold">{period}</span>
                      <span className="text-[9px] opacity-75">{start}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 text-center">
                選択中: {periods}
              </p>
            </div>

            <Separator />

            {/* 開始週・繰り返し */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>開始週（月曜日）</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    // 月曜日に丸める
                    const d = parseISO(e.target.value);
                    setStartDate(format(startOfISOWeek(d), "yyyy-MM-dd"));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>繰り返し週数</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={52}
                    value={repeatWeeks}
                    onChange={(e) => setRepeatWeeks(Math.max(1, Math.min(52, parseInt(e.target.value) || 1)))}
                  />
                  <span className="text-sm text-gray-500 shrink-0">週</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-400 text-center">
              {format(parseISO(startDate), "M/d", { locale: ja })} 〜{" "}
              {format(addDays(parseISO(startDate), (repeatWeeks - 1) * 7 + Math.max(...dayOfWeeks, 1) - 1), "M/d", { locale: ja })}
              （{repeatWeeks}週 · {(periodTo - periodFrom + 1) * dayOfWeeks.length * repeatWeeks}コマ）
            </p>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button
              className="w-full"
              onClick={() => {
                if (!subjectId) { setError("科目を選択してください"); return; }
                setError("");
                setStep("preview");
              }}
              disabled={subjects.length === 0 || dayOfWeeks.length === 0}
            >
              プレビューを確認
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
