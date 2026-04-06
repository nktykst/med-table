"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import { format, startOfISOWeek } from "date-fns";
import Link from "next/link";
import type { SharedSlot } from "@/app/api/share/route";

const DAYS = ["", "月", "火", "水", "木", "金"];

function ImportContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get("code") ?? "";

  const [slots, setSlots] = useState<SharedSlot[]>([]);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(format(startOfISOWeek(new Date()), "yyyy-MM-dd"));
  const [repeatWeeks, setRepeatWeeks] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!code) { setLoading(false); return; }
    fetch(`/api/share/${code}`)
      .then((r) => r.ok ? r.json() : Promise.reject("見つかりません"))
      .then((d) => { setSlots(d.slots); setName(d.name); })
      .catch(() => setError("共有コードが見つかりません"))
      .finally(() => setLoading(false));
  }, [code]);

  async function handleImport() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/share/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, startDate, repeatWeeks }),
      });
      if (!res.ok) throw new Error("インポートに失敗しました");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "インポートに失敗しました");
    } finally {
      setSaving(false);
    }
  }

  const grouped = slots.reduce<Record<number, SharedSlot[]>>((acc, s) => {
    if (!acc[s.dayOfWeek]) acc[s.dayOfWeek] = [];
    acc[s.dayOfWeek].push(s);
    return acc;
  }, {});

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">読み込み中...</div>;

  if (done) return (
    <div className="flex flex-col items-center gap-4 py-16 px-4">
      <CheckCircle2 className="w-20 h-20 text-green-500" />
      <p className="text-xl font-bold">インポート完了</p>
      <p className="text-sm text-gray-500">時間割を取り込みました</p>
      <Button className="w-full max-w-xs" onClick={() => router.push("/")}>時間割を見る</Button>
    </div>
  );

  return (
    <div className="p-4 max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/"><ArrowLeft className="w-5 h-5 text-gray-600" /></Link>
        <h1 className="text-lg font-bold">時間割をインポート</h1>
      </div>

      {error ? (
        <div className="bg-red-50 text-red-600 rounded-xl p-4 text-sm">{error}</div>
      ) : (
        <>
          <div className="bg-white rounded-xl border p-4 space-y-3">
            <p className="font-semibold text-gray-800">{name}</p>
            <div className="space-y-2">
              {[1,2,3,4,5].map((day) => {
                const ds = grouped[day];
                if (!ds?.length) return null;
                return (
                  <div key={day}>
                    <p className="text-xs font-semibold text-gray-500 mb-1">{DAYS[day]}曜日</p>
                    <div className="flex flex-wrap gap-1">
                      {ds.map((s) => (
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>開始週（月曜日）</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>繰り返し週数</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number" min={1} max={52} value={repeatWeeks}
                  onChange={(e) => setRepeatWeeks(Math.max(1, Math.min(52, parseInt(e.target.value) || 1)))}
                />
                <span className="text-sm text-gray-500 shrink-0">週</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center">
            {slots.length} コマ × {repeatWeeks} 週 = {slots.length * repeatWeeks} コマを登録
          </p>

          <Button className="w-full" onClick={handleImport} disabled={saving}>
            {saving ? "インポート中..." : "インポートする"}
          </Button>
        </>
      )}
    </div>
  );
}

export default function ImportPage() {
  return (
    <Suspense>
      <ImportContent />
    </Suspense>
  );
}
