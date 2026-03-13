"use client";

import { useAuth } from "@/components/auth-provider";
import { getNotes, addNote, updateNote, deleteNote } from "@/lib/firebase/firestore";
import type { Note } from "@/lib/types";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Plus,
  ArrowLeft,
  StickyNote,
  Trash2,
  Search,
} from "lucide-react";

type ViewMode = "list" | "create" | "edit";

export default function NotesPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getNotes(user.uid)
      .then(setNotes)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const handleCreate = async () => {
    if (!user || !content.trim()) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const newNote = await addNote({
        user_id: user.uid,
        title: title.trim() || "제목 없음",
        content: content.trim(),
        created_at: now,
        updated_at: now,
      });
      setNotes((prev) => [newNote, ...prev]);
      handleClose();
    } catch (err) {
      console.error("Note create error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingNote || !content.trim()) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      await updateNote(editingNote.id, {
        title: title.trim() || "제목 없음",
        content: content.trim(),
        updated_at: now,
      });
      setNotes((prev) =>
        prev.map((n) =>
          n.id === editingNote.id
            ? { ...n, title: title.trim() || "제목 없음", content: content.trim(), updated_at: now }
            : n
        )
      );
      handleClose();
    } catch (err) {
      console.error("Note update error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (deleteConfirmId !== noteId) {
      setDeleteConfirmId(noteId);
      return;
    }
    try {
      await deleteNote(noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error("Note delete error:", err);
    }
  };

  const handleOpenEdit = (note: Note) => {
    setEditingNote(note);
    setTitle(note.title === "제목 없음" ? "" : note.title);
    setContent(note.content);
    setViewMode("edit");
  };

  const handleOpenCreate = () => {
    setEditingNote(null);
    setTitle("");
    setContent("");
    setViewMode("create");
  };

  const handleClose = () => {
    setViewMode("list");
    setEditingNote(null);
    setTitle("");
    setContent("");
  };

  const filteredNotes = searchQuery.trim()
    ? notes.filter(
        (n) =>
          n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : notes;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${y}.${m}.${day} ${h}:${min}`;
  };

  if (!user) return null;

  if (viewMode === "create" || viewMode === "edit") {
    const isEditing = viewMode === "edit";
    return (
      <div className="flex flex-col h-[100dvh] bg-background">
        <div className="flex items-center gap-3 px-4 py-2.5 border-b shrink-0 safe-area-top pt-8">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleClose}
            data-testid="button-note-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-base font-bold">
            {isEditing ? "노트 수정" : "노트 추가"}
          </h1>
        </div>

        <div className="flex-1 flex flex-col px-4 py-4 overflow-hidden space-y-3">
          <Input
            placeholder="제목을 입력하세요..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-10 text-sm font-medium"
            data-testid="input-note-title"
          />
          <Textarea
            placeholder="내용을 입력하세요..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 resize-none text-sm scrollbar-hide"
            style={{ maxHeight: "70vh" }}
            data-testid="textarea-note-content"
          />
        </div>

        <div className="flex items-center justify-end px-4 py-3 border-t shrink-0 safe-area-bottom">
          <Button
            size="sm"
            className="h-9 px-5"
            disabled={!content.trim() || saving}
            onClick={isEditing ? handleUpdate : handleCreate}
            data-testid="button-note-submit"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isEditing ? (
              "수정"
            ) : (
              "추가"
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      headerCenter={
        <span className="text-sm font-bold">노트</span>
      }
      headerRight={
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSearchOpen(!searchOpen)}
            data-testid="button-note-search-toggle"
          >
            <Search className="h-4.5 w-4.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleOpenCreate}
            data-testid="button-note-add"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      }
    >
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="px-4 py-4 space-y-3">
          {searchOpen && (
            <Input
              placeholder="노트 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 text-sm"
              autoFocus
              data-testid="input-note-search"
            />
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredNotes.length === 0 ? (
            <Card className="p-8 text-center space-y-2">
              <StickyNote className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "검색 결과가 없습니다" : "노트가 없습니다"}
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredNotes.map((note) => (
                <Card
                  key={note.id}
                  className="p-3 cursor-pointer active:bg-muted/30 transition-colors"
                  onClick={() => handleOpenEdit(note)}
                  data-testid={`card-note-${note.id}`}
                >
                  <p className="text-sm font-medium truncate">
                    {note.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 whitespace-pre-wrap">
                    {note.content}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-muted-foreground">
                      {formatDate(note.updated_at)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-6 px-2 text-[10px] ml-auto ${
                        deleteConfirmId === note.id
                          ? "text-destructive bg-destructive/10"
                          : "text-destructive hover:text-destructive"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(note.id);
                      }}
                      data-testid={`button-delete-note-${note.id}`}
                    >
                      {deleteConfirmId === note.id ? "확인" : "삭제"}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
