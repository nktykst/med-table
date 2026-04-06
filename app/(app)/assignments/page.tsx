"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle2, Circle, Trash2 } from "lucide-react";

type Subject = {
  id: string;
  name: string;
  color: string;
};

type Assignment = {
  id: string;
  title: string;
  dueDate: string | null;
  isDone: boolean;
  description: string | null;
  subject: Subject | null;
};

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filterSubjectId, setFilterSubjectId] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/assignments").then((r) => r.json()).then(setAssignments);
    fetch("/api/subjects").then((r) => r.json()).then(setSubjects);
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const res = await fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, subjectId: subjectId || null, dueDate: dueDate || null, description: description || null }),
    });

    const newItem = await res.json();
    const subject = subjects.find((s) => s.id === subjectId) ?? null;
    setAssignments((prev) => [...prev, { ...newItem, subject }].sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    }));

    setTitle("");
    setSubjectId("");
    setDueDate("");
    setDescription("");
    setSaving(false);
    setDialogOpen(false);
  }

  async function toggleDone(id: string, isDone: boolean) {
    await fetch(`/api/assignments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDone: !isDone }),
    });
    setAssignments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isDone: !isDone } : a))
    );
  }

  async function deleteAssignment(id: string) {
    await fetch(`/api/assignments/${id}`, { method: "DELETE" });
    setAssignments((prev) => prev.filter((a) => a.id !== id));
  }

  const filtered = assignments.filter((a) =>
    filterSubjectId === "all" ? true : a.subject?.id === filterSubjectId
  );

  const now = new Date().toISOString();
  const overdue = filtered.filter((a) => !a.isDone && a.dueDate && a.dueDate < now);
  const upcoming = filtered.filter((a) => !a.isDone && (!a.dueDate || a.dueDate >= now));
  const done = filtered.filter((a) => a.isDone);

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b px-4 py-3 sticky top-0 z-10 flex items-center justify-between">
        <h1 className="text-lg font-bold">課題</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger>
            <Button size="sm" type="button">
              <Plus className="w-4 h-4 mr-1" />
              追加
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>課題を追加</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <Label>タイトル</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>科目</Label>
                <Select value={subjectId} onValueChange={(v) => setSubjectId(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="科目を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>締切日時</Label>
                <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>メモ</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "保存中..." : "追加する"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="px-4 py-3 bg-white border-b">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setFilterSubjectId("all")}
            className={`text-xs px-3 py-1.5 rounded-full border whitespace-nowrap ${
              filterSubjectId === "all" ? "bg-blue-600 text-white border-blue-600" : "text-gray-600"
            }`}
          >
            すべて
          </button>
          {subjects.map((s) => (
            <button
              key={s.id}
              onClick={() => setFilterSubjectId(s.id)}
              className={`text-xs px-3 py-1.5 rounded-full border whitespace-nowrap ${
                filterSubjectId === s.id ? "text-white border-transparent" : "text-gray-600"
              }`}
              style={filterSubjectId === s.id ? { backgroundColor: s.color, borderColor: s.color } : {}}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {overdue.length > 0 && (
          <Section title="期限切れ" items={overdue} subjects={subjects} onToggle={toggleDone} onDelete={deleteAssignment} overdue />
        )}
        {upcoming.length > 0 && (
          <Section title="未完了" items={upcoming} subjects={subjects} onToggle={toggleDone} onDelete={deleteAssignment} />
        )}
        {done.length > 0 && (
          <Section title="完了" items={done} subjects={subjects} onToggle={toggleDone} onDelete={deleteAssignment} />
        )}
        {filtered.length === 0 && (
          <div className="text-center text-gray-400 py-16">課題はありません</div>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  items,
  subjects,
  onToggle,
  onDelete,
  overdue,
}: {
  title: string;
  items: Assignment[];
  subjects: Subject[];
  onToggle: (id: string, isDone: boolean) => void;
  onDelete: (id: string) => void;
  overdue?: boolean;
}) {
  return (
    <div>
      <h2 className={`text-xs font-semibold mb-2 ${overdue ? "text-red-500" : "text-gray-500"}`}>
        {title} ({items.length})
      </h2>
      <ul className="space-y-2">
        {items.map((a) => (
          <li key={a.id} className="bg-white rounded-xl border p-3 flex items-start gap-3">
            <button onClick={() => onToggle(a.id, a.isDone)} className="mt-0.5 shrink-0">
              {a.isDone ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <Circle className={`w-5 h-5 ${overdue ? "text-red-400" : "text-gray-300"}`} />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${a.isDone ? "line-through text-gray-400" : "text-gray-800"}`}>
                {a.title}
              </p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {a.subject && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded text-white"
                    style={{ backgroundColor: a.subject.color }}
                  >
                    {a.subject.name}
                  </span>
                )}
                {a.dueDate && (
                  <span className={`text-xs ${overdue ? "text-red-500 font-medium" : "text-gray-400"}`}>
                    {new Date(a.dueDate).toLocaleDateString("ja-JP", {
                      month: "numeric",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
              {a.description && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{a.description}</p>
              )}
            </div>
            <button
              onClick={() => onDelete(a.id)}
              className="shrink-0 p-1 text-gray-400 hover:text-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
