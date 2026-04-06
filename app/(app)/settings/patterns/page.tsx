"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, ArrowLeft, ChevronRight, Trash2 } from "lucide-react";

type WeekPattern = {
  id: string;
  name: string;
  description: string | null;
};

export default function PatternsPage() {
  const [patterns, setPatterns] = useState<WeekPattern[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/patterns").then((r) => r.json()).then(setPatterns);
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/patterns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: description || null }),
    });
    const p = await res.json();
    setPatterns((prev) => [...prev, p]);
    setName("");
    setDescription("");
    setSaving(false);
    setDialogOpen(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("このパターンを削除しますか？")) return;
    await fetch(`/api/patterns/${id}`, { method: "DELETE" });
    setPatterns((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b px-4 py-3 sticky top-0 z-10 flex items-center gap-3">
        <Link href="/settings">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h1 className="text-lg font-bold flex-1">週パターン管理</h1>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-1" />
          追加
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-2">
          {patterns.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border flex items-center">
              <Link href={`/settings/patterns/${p.id}`} className="flex-1 flex items-center gap-3 p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{p.name}</p>
                  {p.description && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{p.description}</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>
              <Button
                size="sm"
                variant="ghost"
                className="mr-1 text-red-400"
                onClick={() => handleDelete(p.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}

          {patterns.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-12">
              週パターンが登録されていません
            </p>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>週パターンを追加</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label>パターン名</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="例: 解剖ウィーク" required />
            </div>
            <div className="space-y-2">
              <Label>説明（任意）</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="任意のメモ" />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "保存中..." : "追加する"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
