"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { ChevronRight, BookOpen, Calendar, LogOut, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, parseISO, addDays } from "date-fns";
import { ja } from "date-fns/locale";

type WeekPattern = { id: string; name: string };
type Week = {
  id: string;
  weekNumber: number;
  startDate: string;
  label: string | null;
  patternId: string | null;
  patternName: string | null;
  isHoliday: boolean | null;
  holidayLabel: string | null;
};

export default function SettingsPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [patterns, setPatterns] = useState<WeekPattern[]>([]);
  const [editWeek, setEditWeek] = useState<Week | null>(null);

  // Edit form
  const [editLabel, setEditLabel] = useState("");
  const [editPatternId, setEditPatternId] = useState("");
  const [editIsHoliday, setEditIsHoliday] = useState(false);
  const [editHolidayLabel, setEditHolidayLabel] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/weeks").then((r) => r.json()).then(setWeeks);
    fetch("/api/patterns").then((r) => r.json()).then(setPatterns);
  }, []);

  function openEdit(w: Week) {
    setEditWeek(w);
    setEditLabel(w.label ?? "");
    setEditPatternId(w.patternId ?? "");
    setEditIsHoliday(w.isHoliday ?? false);
    setEditHolidayLabel(w.holidayLabel ?? "");
  }

  async function saveEdit() {
    if (!editWeek) return;
    setSaving(true);
    const res = await fetch(`/api/weeks/${editWeek.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: editLabel || null,
        patternId: editPatternId || null,
        isHoliday: editIsHoliday,
        holidayLabel: editHolidayLabel || null,
      }),
    });
    const updated = await res.json();
    setWeeks((prev) =>
      prev.map((w) =>
        w.id === editWeek.id
          ? { ...updated, patternName: patterns.find((p) => p.id === editPatternId)?.name ?? null }
          : w
      )
    );
    setSaving(false);
    setEditWeek(null);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <h1 className="text-lg font-bold">設定</h1>
      </div>

      <div className="flex-1 overflow-auto">
        {/* ナビゲーション */}
        <div className="bg-white border-b mt-3 mx-4 rounded-xl overflow-hidden">
          <Link href="/settings/subjects" className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 border-b">
            <BookOpen className="w-5 h-5 text-blue-500" />
            <span className="flex-1 text-sm font-medium">科目管理</span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>
          <Link href="/settings/patterns" className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50">
            <Calendar className="w-5 h-5 text-purple-500" />
            <span className="flex-1 text-sm font-medium">週パターン管理</span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>
        </div>

        {/* 設定済みの週一覧（データのある週のみ表示） */}
        {weeks.length > 0 && (
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-600">週の設定</h2>
              <p className="text-xs text-gray-400">授業を登録した週が自動的に追加されます</p>
            </div>

            <div className="space-y-2">
              {weeks.map((w) => {
                const start = parseISO(w.startDate);
                const end = addDays(start, 4);
                return (
                  <div key={w.id} className="bg-white rounded-xl border p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800">第{w.weekNumber}週</span>
                        {w.label && <span className="text-xs text-gray-500">{w.label}</span>}
                        {w.isHoliday && (
                          <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                            {w.holidayLabel || "休日"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {format(start, "M/d", { locale: ja })}〜{format(end, "M/d", { locale: ja })}
                        {w.patternName && ` · ${w.patternName}`}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Link href={`/settings/weeks/${w.id}`}>
                        <Button size="sm" variant="ghost" className="text-xs h-8">A補正</Button>
                      </Link>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(w)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ログアウト */}
        <div className="px-4 pb-4 mt-3">
          <Button
            variant="outline"
            className="w-full text-red-500 border-red-200 hover:bg-red-50"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="w-4 h-4 mr-2" />
            ログアウト
          </Button>
        </div>
      </div>

      {/* 週編集ダイアログ */}
      <Dialog open={!!editWeek} onOpenChange={(o) => !o && setEditWeek(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>週を編集 — 第{editWeek?.weekNumber}週</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ラベル（任意）</Label>
              <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} placeholder="例: 解剖実習週" />
            </div>
            <div className="space-y-2">
              <Label>週パターン</Label>
              <Select value={editPatternId} onValueChange={(v) => setEditPatternId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="パターンを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">なし</SelectItem>
                  {patterns.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={editIsHoliday} onCheckedChange={setEditIsHoliday} id="holiday" />
              <Label htmlFor="holiday">休日週</Label>
            </div>
            {editIsHoliday && (
              <div className="space-y-2">
                <Label>休日名</Label>
                <Input value={editHolidayLabel} onChange={(e) => setEditHolidayLabel(e.target.value)} placeholder="例: 夏季休暇" />
              </div>
            )}
            <Button onClick={saveEdit} className="w-full" disabled={saving}>
              {saving ? "保存中..." : "保存する"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
