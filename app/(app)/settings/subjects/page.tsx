"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";

type Subject = {
  id: string;
  name: string;
  color: string;
  room: string | null;
  isOnline: boolean | null;
  syllabusUrl: string | null;
};

const DEFAULT_COLORS = [
  "#60a5fa", "#34d399", "#f87171", "#fbbf24",
  "#a78bfa", "#fb923c", "#e879f9", "#2dd4bf",
];

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Subject | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_COLORS[0]);
  const [room, setRoom] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const [syllabusUrl, setSyllabusUrl] = useState("");

  useEffect(() => {
    fetch("/api/subjects").then((r) => r.json()).then(setSubjects);
  }, []);

  function openAdd() {
    setEditTarget(null);
    setName("");
    setColor(DEFAULT_COLORS[subjects.length % DEFAULT_COLORS.length]);
    setRoom("");
    setIsOnline(false);
    setSyllabusUrl("");
    setDialogOpen(true);
  }

  function openEdit(s: Subject) {
    setEditTarget(s);
    setName(s.name);
    setColor(s.color);
    setRoom(s.room ?? "");
    setIsOnline(s.isOnline ?? false);
    setSyllabusUrl(s.syllabusUrl ?? "");
    setDialogOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const body = { name, color, room: room || null, isOnline, syllabusUrl: syllabusUrl || null };

    if (editTarget) {
      const res = await fetch(`/api/subjects/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const updated = await res.json();
      setSubjects((prev) => prev.map((s) => (s.id === editTarget.id ? updated : s)));
    } else {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const created = await res.json();
      setSubjects((prev) => [...prev, created]);
    }

    setSaving(false);
    setDialogOpen(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("この科目を削除しますか？")) return;
    await fetch(`/api/subjects/${id}`, { method: "DELETE" });
    setSubjects((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b px-4 py-3 sticky top-0 z-10 flex items-center gap-3">
        <Link href="/settings">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h1 className="text-lg font-bold flex-1">科目管理</h1>
        <Button size="sm" onClick={openAdd}>
          <Plus className="w-4 h-4 mr-1" />
          追加
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-2">
          {subjects.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border p-3 flex items-center gap-3">
              <div
                className="w-5 h-5 rounded-full shrink-0"
                style={{ backgroundColor: s.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{s.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {s.room && <span className="text-xs text-gray-500">{s.room}</span>}
                  {s.isOnline && (
                    <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">
                      オンライン
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(s.id)} className="text-red-400">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}

          {subjects.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-12">
              科目が登録されていません
            </p>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTarget ? "科目を編集" : "科目を追加"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>科目名</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>カラー</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border"
                />
                <div className="flex gap-1 flex-wrap">
                  {DEFAULT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full border-2 ${color === c ? "border-gray-800" : "border-transparent"}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>教室（任意）</Label>
              <Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="例: 101講義室" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={isOnline} onCheckedChange={setIsOnline} id="is-online" />
              <Label htmlFor="is-online">オンライン授業</Label>
            </div>
            <div className="space-y-2">
              <Label>シラバスURL（任意）</Label>
              <Input value={syllabusUrl} onChange={(e) => setSyllabusUrl(e.target.value)} placeholder="https://..." type="url" />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "保存中..." : editTarget ? "更新する" : "追加する"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
