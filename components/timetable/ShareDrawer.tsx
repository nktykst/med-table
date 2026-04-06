"use client";

import { useState } from "react";
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
import {
  Share2,
  Copy,
  Check,
  Download,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { format, addDays, parseISO, startOfISOWeek } from "date-fns";
import type { SharedSlot } from "@/app/api/share/route";

const DAYS = ["", "月", "火", "水", "木", "金"];

type Props = {
  open: boolean;
  onClose: () => void;
  currentWeekStart: string;
  currentWeekLabel: string;
  onImportDone: () => void;
};

export function ShareDrawer({
  open,
  onClose,
  currentWeekStart,
  currentWeekLabel,
  onImportDone,
}: Props) {
  const [mode, setMode] = useState<
    "menu" | "sharing" | "shared" | "import-form" | "import-preview" | "import-done"
  >("menu");

  // 共有側
  const [shareName, setShareName] = useState("");
  const [shareDesc, setShareDesc] = useState("");
  const [shareStart, setShareStart] = useState(currentWeekStart);
  const [shareEnd, setShareEnd] = useState(currentWeekStart);
  const [sharedCode, setSharedCode] = useState("");
  const [sharedTotalWeeks, setSharedTotalWeeks] = useState(1);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // インポート側
  const [importCode, setImportCode] = useState("");
  const [importStartDate, setImportStartDate] = useState(
    format(startOfISOWeek(new Date()), "yyyy-MM-dd")
  );
  const [importCycles, setImportCycles] = useState(1);
  const [previewSlots, setPreviewSlots] = useState<SharedSlot[]>([]);
  const [previewName, setPreviewName] = useState("");
  const [previewTotalWeeks, setPreviewTotalWeeks] = useState(1);

  function reset() {
    setMode("menu");
    setError("");
    setShareName("");
    setShareDesc("");
    setShareStart(currentWeekStart);
    setShareEnd(currentWeekStart);
    setSharedCode("");
    setCopied(false);
    setImportCode("");
    setImportCycles(1);
  }

  // 共有を作成
  async function handleShare() {
    if (shareEnd < shareStart) {
      setError("終了週は開始週以降にしてください");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: shareStart,
          endDate: shareEnd,
          name: shareName || currentWeekLabel,
          description: shareDesc,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "共有に失敗しました");
      }
      const data = await res.json();
      setSharedCode(data.code);
      setSharedTotalWeeks(data.totalWeeks ?? 1);
      setMode("shared");
    } catch (e) {
      setError(e instanceof Error ? e.message : "共有に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  function shareUrl(code: string) {
    return `${window.location.origin}/import?code=${code}`;
  }

  async function copyUrl(code: string) {
    await navigator.clipboard.writeText(shareUrl(code));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // インポートプレビュー
  async function handlePreview() {
    if (!importCode.trim()) {
      setError("共有コードを入力してください");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/share/${importCode.trim()}`);
      if (!res.ok) throw new Error("共有コードが見つかりません");
      const data = await res.json();
      setPreviewSlots(data.slots);
      setPreviewName(data.name);
      const totalWeeks =
        data.slots.length > 0
          ? Math.max(...(data.slots as SharedSlot[]).map((s) => s.weekOffset)) + 1
          : 1;
      setPreviewTotalWeeks(totalWeeks);
      setMode("import-preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "取得に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  // インポート実行
  async function handleImport() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/share/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: importCode.trim(),
          startDate: importStartDate,
          repeatCycles: importCycles,
        }),
      });
      if (!res.ok) throw new Error("インポートに失敗しました");
      setMode("import-done");
      onImportDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "インポートに失敗しました");
    } finally {
      setSaving(false);
    }
  }

  // 週ごとにグルーピング
  const groupedByWeek = previewSlots.reduce<Record<number, SharedSlot[]>>(
    (acc, s) => {
      if (!acc[s.weekOffset]) acc[s.weekOffset] = [];
      acc[s.weekOffset].push(s);
      return acc;
    },
    {}
  );

  // 共有期間の週数を計算（表示用）
  function calcShareWeeks() {
    if (!shareStart || !shareEnd) return 1;
    try {
      const diff =
        (parseISO(shareEnd).getTime() - parseISO(shareStart).getTime()) /
        (7 * 86400000);
      return Math.max(1, Math.round(diff) + 1);
    } catch {
      return 1;
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <SheetContent
        side="bottom"
        className="rounded-t-2xl max-h-[90vh] overflow-y-auto"
      >
        <SheetHeader className="pb-4">
          <SheetTitle>
            {mode === "menu" && "共有 / インポート"}
            {mode === "sharing" && "時間割を共有"}
            {mode === "shared" && "共有リンクを発行しました"}
            {mode === "import-form" && "時間割をインポート"}
            {mode === "import-preview" && `「${previewName}」をインポート`}
            {mode === "import-done" && "インポート完了"}
          </SheetTitle>
        </SheetHeader>

        {/* メニュー */}
        {mode === "menu" && (
          <div className="space-y-3">
            <button
              onClick={() => {
                setShareStart(currentWeekStart);
                setShareEnd(currentWeekStart);
                setMode("sharing");
                setError("");
              }}
              className="w-full flex items-center gap-3 p-4 rounded-xl border hover:bg-gray-50 transition-colors text-left"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                <Share2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-sm">時間割を共有</p>
                <p className="text-xs text-gray-500">期間を選んでリンクで共有する</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
            </button>

            <button
              onClick={() => {
                setMode("import-form");
                setError("");
              }}
              className="w-full flex items-center gap-3 p-4 rounded-xl border hover:bg-gray-50 transition-colors text-left"
            >
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                <Download className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-sm">他の人の時間割をインポート</p>
                <p className="text-xs text-gray-500">共有コードまたはURLから取り込む</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
            </button>
          </div>
        )}

        {/* 共有フォーム */}
        {mode === "sharing" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>開始週（月曜日）</Label>
                <Input
                  type="date"
                  value={shareStart}
                  onChange={(e) => setShareStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>終了週（月曜日）</Label>
                <Input
                  type="date"
                  value={shareEnd}
                  onChange={(e) => setShareEnd(e.target.value)}
                  min={shareStart}
                />
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center">
              {calcShareWeeks()} 週分を共有
            </p>
            <div className="space-y-2">
              <Label>タイトル（任意）</Label>
              <Input
                value={shareName}
                onChange={(e) => setShareName(e.target.value)}
                placeholder={currentWeekLabel}
              />
            </div>
            <div className="space-y-2">
              <Label>メモ（任意）</Label>
              <Input
                value={shareDesc}
                onChange={(e) => setShareDesc(e.target.value)}
                placeholder="例: 3年生前期の時間割"
              />
            </div>
            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setMode("menu")}
              >
                戻る
              </Button>
              <Button
                className="flex-1"
                onClick={handleShare}
                disabled={saving}
              >
                {saving ? "作成中..." : "共有リンクを作成"}
              </Button>
            </div>
          </div>
        )}

        {/* 共有完了 */}
        {mode === "shared" && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">共有コード</p>
              <p className="text-2xl font-mono font-bold tracking-widest text-center text-blue-600 py-2">
                {sharedCode}
              </p>
              <p className="text-xs text-gray-400 text-center">{sharedTotalWeeks} 週分</p>
            </div>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => copyUrl(sharedCode)}
            >
              {copied ? (
                <Check className="w-4 h-4 mr-2 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              {copied ? "コピーしました" : "リンクをコピー"}
            </Button>
            <p className="text-xs text-gray-400 text-center break-all">
              {shareUrl(sharedCode)}
            </p>
            <Button
              className="w-full"
              onClick={() => {
                reset();
                onClose();
              }}
            >
              閉じる
            </Button>
          </div>
        )}

        {/* インポート：コード入力 */}
        {mode === "import-form" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>共有コードまたはURL</Label>
              <Input
                value={importCode}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  const m = v.match(/code=([a-z0-9]+)/);
                  setImportCode(m ? m[1] : v);
                }}
                placeholder="例: ab3d7f9e"
              />
            </div>
            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setMode("menu")}
              >
                戻る
              </Button>
              <Button
                className="flex-1"
                onClick={handlePreview}
                disabled={saving}
              >
                {saving ? "取得中..." : "内容を確認"}
              </Button>
            </div>
          </div>
        )}

        {/* インポートプレビュー */}
        {mode === "import-preview" && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-3 space-y-3 max-h-56 overflow-y-auto">
              {Object.entries(groupedByWeek)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([offset, weekSlots]) => {
                  const grouped = weekSlots.reduce<Record<number, SharedSlot[]>>(
                    (acc, s) => {
                      if (!acc[s.dayOfWeek]) acc[s.dayOfWeek] = [];
                      acc[s.dayOfWeek].push(s);
                      return acc;
                    },
                    {}
                  );
                  return (
                    <div key={offset}>
                      <p className="text-xs font-semibold text-gray-600 mb-1">
                        第 {Number(offset) + 1} 週
                      </p>
                      <div className="space-y-1">
                        {[1, 2, 3, 4, 5].map((day) => {
                          const ds = grouped[day];
                          if (!ds?.length) return null;
                          return (
                            <div key={day} className="flex items-center gap-1 flex-wrap">
                              <span className="text-xs text-gray-400 w-6">
                                {DAYS[day]}
                              </span>
                              {ds.sort((a, b) => a.period - b.period).map((s) => (
                                <span
                                  key={`${s.dayOfWeek}-${s.period}`}
                                  className="text-xs text-white rounded px-1.5 py-0.5"
                                  style={{ backgroundColor: s.subjectColor }}
                                >
                                  {s.period}限 {s.subjectName}
                                </span>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>開始週（月曜日）</Label>
                <Input
                  type="date"
                  value={importStartDate}
                  onChange={(e) => setImportStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>繰り返し回数</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={importCycles}
                    onChange={(e) =>
                      setImportCycles(
                        Math.max(1, Math.min(10, parseInt(e.target.value) || 1))
                      )
                    }
                  />
                  <span className="text-sm text-gray-500 shrink-0">回</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-400 text-center">
              {previewSlots.length} コマ × {importCycles} 回 ={" "}
              {previewSlots.length * importCycles} コマ（
              {previewTotalWeeks * importCycles} 週分）を登録
            </p>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setMode("import-form")}
              >
                戻る
              </Button>
              <Button
                className="flex-1"
                onClick={handleImport}
                disabled={saving}
              >
                {saving ? "インポート中..." : "インポートする"}
              </Button>
            </div>
          </div>
        )}

        {/* インポート完了 */}
        {mode === "import-done" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
            <p className="text-lg font-semibold">インポート完了</p>
            <p className="text-sm text-gray-500">時間割を取り込みました</p>
            <Button
              className="w-full"
              onClick={() => {
                reset();
                onClose();
              }}
            >
              閉じる
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
