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
import { format, startOfISOWeek } from "date-fns";
import { ja } from "date-fns/locale";
import type { SharedSlot } from "@/app/api/share/route";

const DAYS = ["", "月", "火", "水", "木", "金"];

type Props = {
  open: boolean;
  onClose: () => void;
  currentWeekId: string | null;
  currentWeekLabel: string;
  onImportDone: () => void;
};

export function ShareDrawer({
  open,
  onClose,
  currentWeekId,
  currentWeekLabel,
  onImportDone,
}: Props) {
  const [mode, setMode] = useState<"menu" | "sharing" | "shared" | "import-form" | "import-preview" | "import-done">("menu");

  // 共有側
  const [shareName, setShareName] = useState("");
  const [shareDesc, setShareDesc] = useState("");
  const [sharedCode, setSharedCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // インポート側
  const [importCode, setImportCode] = useState("");
  const [importStartDate, setImportStartDate] = useState(
    format(startOfISOWeek(new Date()), "yyyy-MM-dd")
  );
  const [importRepeat, setImportRepeat] = useState(1);
  const [previewSlots, setPreviewSlots] = useState<SharedSlot[]>([]);
  const [previewName, setPreviewName] = useState("");

  function reset() {
    setMode("menu");
    setError("");
    setShareName("");
    setShareDesc("");
    setSharedCode("");
    setCopied(false);
    setImportCode("");
    setImportRepeat(1);
  }

  // 共有を作成
  async function handleShare() {
    if (!currentWeekId) { setError("週が選択されていません"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekId: currentWeekId, name: shareName || currentWeekLabel, description: shareDesc }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "共有に失敗しました");
      }
      const data = await res.json();
      setSharedCode(data.code);
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
    if (!importCode.trim()) { setError("共有コードを入力してください"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/share/${importCode.trim()}`);
      if (!res.ok) throw new Error("共有コードが見つかりません");
      const data = await res.json();
      setPreviewSlots(data.slots);
      setPreviewName(data.name);
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
        body: JSON.stringify({ code: importCode.trim(), startDate: importStartDate, repeatWeeks: importRepeat }),
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

  // プレビュー：曜日ごとにグルーピング
  const grouped = previewSlots.reduce<Record<number, SharedSlot[]>>((acc, s) => {
    if (!acc[s.dayOfWeek]) acc[s.dayOfWeek] = [];
    acc[s.dayOfWeek].push(s);
    return acc;
  }, {});

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
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
              onClick={() => { setMode("sharing"); setError(""); }}
              className="w-full flex items-center gap-3 p-4 rounded-xl border hover:bg-gray-50 transition-colors text-left"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                <Share2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-sm">この週の時間割を共有</p>
                <p className="text-xs text-gray-500">{currentWeekLabel} をリンクで共有する</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
            </button>

            <button
              onClick={() => { setMode("import-form"); setError(""); }}
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
            {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setMode("menu")}>戻る</Button>
              <Button className="flex-1" onClick={handleShare} disabled={saving || !currentWeekId}>
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
            </div>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => copyUrl(sharedCode)}
            >
              {copied ? <Check className="w-4 h-4 mr-2 text-green-500" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? "コピーしました" : "リンクをコピー"}
            </Button>
            <p className="text-xs text-gray-400 text-center break-all">{shareUrl(sharedCode)}</p>
            <Button className="w-full" onClick={() => { reset(); onClose(); }}>閉じる</Button>
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
                  // URLからコードを抽出
                  const v = e.target.value.trim();
                  const m = v.match(/code=([a-z0-9]+)/);
                  setImportCode(m ? m[1] : v);
                }}
                placeholder="例: ab3d7f9e"
              />
            </div>
            {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setMode("menu")}>戻る</Button>
              <Button className="flex-1" onClick={handlePreview} disabled={saving}>
                {saving ? "取得中..." : "内容を確認"}
              </Button>
            </div>
          </div>
        )}

        {/* インポートプレビュー */}
        {mode === "import-preview" && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-3 space-y-2 max-h-48 overflow-y-auto">
              {[1,2,3,4,5].map((day) => {
                const daySlots = grouped[day];
                if (!daySlots?.length) return null;
                return (
                  <div key={day}>
                    <p className="text-xs font-semibold text-gray-500 mb-1">{DAYS[day]}曜日</p>
                    <div className="flex flex-wrap gap-1">
                      {daySlots.map((s) => (
                        <span
                          key={`${s.dayOfWeek}-${s.period}`}
                          className="text-xs text-white rounded px-2 py-0.5"
                          style={{ backgroundColor: s.subjectColor }}
                        >
                          {s.period}限 {s.subjectName}
                        </span>
                      ))}
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
                <Label>繰り返し週数</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={52}
                    value={importRepeat}
                    onChange={(e) => setImportRepeat(Math.max(1, Math.min(52, parseInt(e.target.value) || 1)))}
                  />
                  <span className="text-sm text-gray-500 shrink-0">週</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-400 text-center">
              {previewSlots.length} コマ × {importRepeat} 週 = {previewSlots.length * importRepeat} コマを登録
            </p>

            {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setMode("import-form")}>戻る</Button>
              <Button className="flex-1" onClick={handleImport} disabled={saving}>
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
            <Button className="w-full" onClick={() => { reset(); onClose(); }}>閉じる</Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
