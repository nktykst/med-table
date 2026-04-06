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
import { Plus, Pencil, Trash2, ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";

type Subject = {
  id: string;
  name: string;
  color: string;
  room: string | null;
  isOnline: boolean | null;
  syllabusUrl: string | null;
  isPublic: boolean | null;
};

type Suggestion = {
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
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Subject | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_COLORS[0]);
  const [room, setRoom] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const [syllabusUrl, setSyllabusUrl] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    fetch("/api/subjects").then((r) => r.json()).then(setSubjects);
    fetch("/api/subjects/suggestions").then((r) => r.json()).then(setSuggestions);
  }, []);

  function openAdd() {
    setEditTarget(null);
    setName("");
    setColor(DEFAULT_COLORS[subjects.length % DEFAULT_COLORS.length]);
    setRoom("");
    setIsOnline(false);
    setSyllabusUrl("");
    setIsPublic(false);
    setDialogOpen(true);
  }

  function openEdit(s: Subject) {
    setEditTarget(s);
    setName(s.name);
    setColor(s.color);
    setRoom(s.room ?? "");
    setIsOnline(s.isOnline ?? false);
    setSyllabusUrl(s.syllabusUrl ?? "");
    setIsPublic(s.isPublic ?? false);
    setDialogOpen(true);
  }

  // サジェストから科目フォームを開く
  function openFromSuggestion(s: Suggestion) {
    setEditTarget(null);
    setName(s.name);
    setColor(s.color);
    setRoom(s.room ?? "");
    setIsOnline(s.isOnline ?? false);
    setSyllabusUrl(s.syllabusUrl ?? "");
    setIsPublic(false);
    setDialogOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError("");

    try {
      const body = { name, color, room: room || null, isOnline, syllabusUrl: syllabusUrl || null, isPublic };

      if (editTarget) {
        const res = await fetch(`/api/subjects/${editTarget.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`保存に失敗しました (${res.status})`);
        const updated = await res.json();
        setSubjects((prev) => prev.map((s) => (s.id === editTarget.id ? updated : s)));
      } else {
        const res = await fetch("/api/subjects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`保存に失敗しました (${res.status})`);
        const created = await res.json();
        setSubjects((prev) => [...prev, created]);
      }

      setDialogOpen(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("この科目を削除しますか？")) return;
    await fetch(`/api/subjects/${id}`, { method: "DELETE" });
    setSubjects((prev) => prev.filter((s) => s.id !== id));
  }

  // 自分の科目と名前が被っていないサジェストだけ表示
  const mySubjectNames = new Set(subjects.map((s) => s.name.trim().toLowerCase()));
  const filteredSuggestions = suggestions.filter(
    (s) => !mySubjectNames.has(s.name.trim().toLowerCase())
  );

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

      <div className="flex-1 overflow-auto p-4 space-y-5">
        {/* サジェスト */}
        {filteredSuggestions.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-gray-600">他のユーザーが登録している科目</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {filteredSuggestions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => openFromSuggestion(s)}
                  className="flex items-center gap-1.5 bg-white border rounded-full px-3 py-1.5 text-sm hover:bg-gray-50 active:scale-95 transition-all"
                >
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-gray-700">{s.name}</span>
                  <Plus className="w-3 h-3 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 登録済み科目 */}
        <div>
          {subjects.length > 0 && (
            <h2 className="text-sm font-semibold text-gray-600 mb-2">登録済み</h2>
          )}
          <div className="space-y-2">
            {subjects.map((s) => (
              <div key={s.id} className="bg-white rounded-xl border p-3 flex items-center gap-3">
                <div className="w-5 h-5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{s.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {s.room && <span className="text-xs text-gray-500">{s.room}</span>}
                    {s.isOnline && (
                      <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">オンライン</span>
                    )}
                    {s.isPublic && (
                      <span className="text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" />公開中
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

            {subjects.length === 0 && filteredSuggestions.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-12">科目が登録されていません</p>
            )}
          </div>
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

            {/* 公開設定 */}
            <div className="border rounded-xl p-3 space-y-1 bg-amber-50 border-amber-200">
              <div className="flex items-center gap-3">
                <Switch checked={isPublic} onCheckedChange={setIsPublic} id="is-public" />
                <Label htmlFor="is-public" className="flex items-center gap-1.5 text-amber-800">
                  <Sparkles className="w-3.5 h-3.5" />
                  他のユーザーへのサジェストとして公開する
                </Label>
              </div>
              <p className="text-xs text-amber-700 pl-10">
                科目名・カラー・教室・オンライン情報のみ共有されます。個人情報は含まれません。
              </p>
            </div>

            {saveError && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{saveError}</p>
            )}
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "保存中..." : editTarget ? "更新する" : "追加する"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
