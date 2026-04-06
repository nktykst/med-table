"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

const DEFAULT_COLORS = [
  "#60a5fa", "#34d399", "#f87171", "#fbbf24",
  "#a78bfa", "#fb923c", "#e879f9", "#2dd4bf",
];

type Subject = {
  id: string;
  name: string;
  color: string;
  room: string | null;
  isOnline: boolean | null;
  syllabusUrl: string | null;
};

type Props = {
  onAdded: (subject: Subject) => void;
  existingCount: number; // for default color cycling
};

export function QuickAddSubject({ onAdded, existingCount }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_COLORS[existingCount % DEFAULT_COLORS.length]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleOpen() {
    setName("");
    setColor(DEFAULT_COLORS[existingCount % DEFAULT_COLORS.length]);
    setError("");
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), color, isOnline: false }),
      });
      if (!res.ok) throw new Error("追加に失敗しました");
      const subject: Subject = await res.json();
      onAdded(subject);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "追加に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline mt-1"
      >
        <Plus className="w-3.5 h-3.5" />
        新しい科目を追加
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>科目をすばやく追加</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>科目名</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 解剖学"
                autoFocus
                required
              />
            </div>

            <div className="space-y-2">
              <Label>カラー</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-9 h-9 rounded cursor-pointer border"
                />
                <div className="flex gap-1.5 flex-wrap">
                  {DEFAULT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        color === c ? "border-gray-800 scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <p className="text-xs text-gray-400">
              教室・シラバス等は「設定 → 科目管理」から後で設定できます
            </p>

            <Button type="submit" className="w-full" disabled={saving || !name.trim()}>
              {saving ? "追加中..." : "追加する"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
