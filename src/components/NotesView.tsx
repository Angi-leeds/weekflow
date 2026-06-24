import { useEffect, useMemo, useState } from "react";
import {
  Grid3X3,
  LayoutList,
  PenLine,
  Plus,
  Search,
  StickyNote,
  Trash2,
} from "lucide-react";
import type { Note, NotesViewMode } from "../types";
import type { ItemShare, UpsertItemShareInput, BoardDisplay } from "../../shared/itemShares";
import {
  isWithinLastDays,
  noteMatchesSearch,
  notePreview,
} from "../lib/notes";
import { getShareForEntity } from "../lib/itemShares";
import { useIsWide } from "../hooks/useMediaQuery";
import { NoteFormModal } from "./NoteFormModal";
import { ShareToBoardFields, shareStateFromRecord } from "./ShareToBoardFields";

type NotesFilter = "all" | "recent";

interface NotesViewProps {
  notes: Note[];
  usingRealMicrosoft: boolean;
  microsoftLoading: boolean;
  selectedId?: string | null;
  onSelectedIdChange?: (id: string | null) => void;
  itemShares: ItemShare[];
  onShareUpdate: (input: UpsertItemShareInput) => void;
  onSaveNote: (input: {
    note: Note | null;
    title: string;
    body: string;
    colour?: string;
    saveToOutlook: boolean;
  }) => void | Promise<void>;
  onDeleteNote: (note: Note) => void | Promise<void>;
  onOpenSettings?: () => void;
}

export function NotesView({
  notes,
  usingRealMicrosoft,
  microsoftLoading,
  selectedId: controlledSelectedId,
  onSelectedIdChange,
  itemShares,
  onShareUpdate,
  onSaveNote,
  onDeleteNote,
  onOpenSettings,
}: NotesViewProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<NotesFilter>("all");
  const [viewMode, setViewMode] = useState<NotesViewMode>("icons");
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(notes[0]?.id ?? null);
  const selectedId = controlledSelectedId ?? internalSelectedId;

  const setSelectedId = (id: string | null) => {
    if (onSelectedIdChange) onSelectedIdChange(id);
    else setInternalSelectedId(id);
  };
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const isWide = useIsWide();

  const filtered = useMemo(() => {
    let list = notes;
    if (filter === "recent") {
      list = list.filter((note) => isWithinLastDays(note.updatedAt, 7));
    }
    if (search.trim()) {
      list = list.filter((note) => noteMatchesSearch(note, search.trim()));
    }
    return list;
  }, [notes, filter, search]);

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.some((note) => note.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selected = filtered.find((note) => note.id === selectedId) ?? filtered[0] ?? null;
  const selectedShare = selected
    ? getShareForEntity(itemShares, "note", selected.id)
    : undefined;
  const shareState = shareStateFromRecord(selectedShare);

  const openAdd = () => {
    setEditingNote(null);
    setModalOpen(true);
  };

  const openEdit = (note: Note) => {
    setEditingNote(note);
    setModalOpen(true);
  };

  const outlookCount = notes.filter((note) => note.provider === "microsoft").length;
  const localCount = notes.length - outlookCount;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-wf-border bg-wf-bg/90 px-4 pb-3 pt-2 backdrop-blur-xl safe-top">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-title font-bold tracking-tight">Notes</h1>
            <p className="text-subhead text-wf-text-secondary">
              {outlookCount > 0
                ? `${outlookCount} from Outlook · ${localCount} local`
                : `${notes.length} notes`}
            </p>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="flex h-10 items-center gap-2 rounded-full bg-wf-accent px-4 text-subhead font-semibold text-white shadow-[var(--shadow-fab)] transition-transform active:scale-95"
          >
            <Plus size={16} strokeWidth={2} />
            Add
          </button>
        </div>

        {!usingRealMicrosoft && !microsoftLoading && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="mb-3 w-full rounded-xl border border-[#0078d4]/25 bg-[#0078d4]/8 px-3 py-2.5 text-left"
          >
            <p className="text-caption font-semibold text-[#0078d4]">Sync Outlook sticky notes</p>
            <p className="mt-0.5 text-caption text-wf-text-tertiary">
              Connect Microsoft 365 in Settings to pull your Outlook Notes folder here.
            </p>
          </button>
        )}

        {usingRealMicrosoft && (
          <p className="mb-3 rounded-xl bg-wf-accent-soft px-3 py-2 text-caption text-wf-text-secondary">
            Notes are stored locally on this device. Outlook mail and calendar sync from all
            connected accounts.
          </p>
        )}

        <div className="relative mb-3">
          <Search
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-wf-text-tertiary"
            strokeWidth={1.75}
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search notes"
            className="w-full rounded-xl border border-wf-border bg-wf-surface py-2.5 pl-10 pr-4 text-body outline-none focus:border-wf-accent focus:ring-2 focus:ring-wf-accent/20"
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(["all", "recent"] as NotesFilter[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-caption font-semibold transition-colors ${
                  filter === value
                    ? "bg-wf-accent text-white"
                    : "bg-wf-surface text-wf-text-secondary"
                }`}
              >
                {value === "all" ? "All notes" : "Last 7 days"}
              </button>
            ))}
          </div>

          <div className="flex shrink-0 rounded-xl border border-wf-border bg-wf-surface p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("icons")}
              className={`rounded-lg p-2 ${viewMode === "icons" ? "bg-wf-bg text-wf-accent" : "text-wf-text-tertiary"}`}
              aria-label="Icon view"
            >
              <Grid3X3 size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`rounded-lg p-2 ${viewMode === "list" ? "bg-wf-bg text-wf-accent" : "text-wf-text-tertiary"}`}
              aria-label="List view"
            >
              <LayoutList size={16} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div
          className={`min-h-0 overflow-y-auto ${
            isWide && selected ? "w-[min(420px,42%)] shrink-0 border-r border-wf-border" : "flex-1"
          } ${!isWide && selected ? "hidden" : ""}`}
        >
          {filtered.length === 0 ? (
            <EmptyNotes onAdd={openAdd} />
          ) : viewMode === "icons" ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(108px,1fr))] gap-3 p-4">
              {filtered.map((note) => (
                <NoteIconTile
                  key={note.id}
                  note={note}
                  selected={selected?.id === note.id}
                  onSelect={() => setSelectedId(note.id)}
                />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-wf-border/60">
              {filtered.map((note) => (
                <NoteListRow
                  key={note.id}
                  note={note}
                  selected={selected?.id === note.id}
                  onSelect={() => setSelectedId(note.id)}
                />
              ))}
            </div>
          )}
        </div>

        {selected && (
          <NoteDetail
            note={selected}
            fullScreen={!isWide}
            shareState={shareState}
            onShareUpdate={onShareUpdate}
            onBack={() => setSelectedId(null)}
            onEdit={() => openEdit(selected)}
            onDelete={() => onDeleteNote(selected)}
          />
        )}
      </div>

      <NoteFormModal
        open={modalOpen}
        note={editingNote}
        syncToOutlook={usingRealMicrosoft}
        onClose={() => setModalOpen(false)}
        onSave={(input) =>
          onSaveNote({
            note: editingNote,
            title: input.title,
            body: input.body,
            colour: input.colour,
            saveToOutlook: input.saveToOutlook,
          })
        }
      />
    </div>
  );
}

function NoteIconTile({
  note,
  selected,
  onSelect,
}: {
  note: Note;
  selected: boolean;
  onSelect: () => void;
}) {
  const preview = notePreview(note, 48);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group flex flex-col items-center gap-2 rounded-2xl p-2 text-left transition-transform active:scale-[0.98] ${
        selected ? "bg-wf-accent/10 ring-2 ring-wf-accent/40" : "hover:bg-wf-surface"
      }`}
    >
      <span
        className="relative flex aspect-square w-full max-w-[88px] items-start overflow-hidden rounded-lg border border-black/10 p-2 shadow-[2px_3px_0_rgba(0,0,0,0.08)]"
        style={{ backgroundColor: note.colour ?? "#FFF4B8" }}
      >
        <span className="absolute right-0 top-0 h-4 w-4 bg-gradient-to-br from-white/70 to-transparent" />
        <span className="line-clamp-4 text-[10px] leading-snug text-wf-text/90">{preview}</span>
      </span>
      <span className="line-clamp-2 w-full text-center text-[11px] font-medium text-wf-text-secondary">
        {note.title}
      </span>
      {note.provider === "microsoft" && (
        <span className="rounded-full bg-[#0078d4]/10 px-2 py-0.5 text-[10px] font-semibold text-[#0078d4]">
          Outlook
        </span>
      )}
    </button>
  );
}

function NoteListRow({
  note,
  selected,
  onSelect,
}: {
  note: Note;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
        selected ? "bg-wf-accent/8" : "hover:bg-wf-surface"
      }`}
    >
      <span
        className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-black/10"
        style={{ backgroundColor: note.colour ?? "#FFF4B8" }}
      >
        <StickyNote size={16} className="text-wf-text/70" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-body font-semibold text-wf-text">{note.title}</span>
          {note.provider === "microsoft" && (
            <span className="shrink-0 rounded-full bg-[#0078d4]/10 px-2 py-0.5 text-[10px] font-semibold text-[#0078d4]">
              Outlook
            </span>
          )}
        </span>
        <span className="mt-0.5 line-clamp-2 text-caption text-wf-text-tertiary">
          {notePreview(note, 120)}
        </span>
        <span className="mt-1 block text-[11px] text-wf-text-tertiary">
          {formatNoteDate(note.updatedAt)}
        </span>
      </span>
    </button>
  );
}

function NoteDetail({
  note,
  fullScreen,
  shareState,
  onShareUpdate,
  onBack,
  onEdit,
  onDelete,
}: {
  note: Note;
  fullScreen: boolean;
  shareState: { sharedToBoard: boolean; boardDisplay: BoardDisplay };
  onShareUpdate: (input: UpsertItemShareInput) => void;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`flex min-h-0 flex-1 flex-col bg-wf-bg ${
        fullScreen ? "fixed inset-0 z-20 safe-top safe-bottom" : ""
      }`}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-wf-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          {fullScreen && (
            <button
              type="button"
              onClick={onBack}
              className="shrink-0 text-body font-medium text-wf-accent"
            >
              ← Notes
            </button>
          )}
          <div className="min-w-0">
            <h2 className="truncate font-display text-headline font-bold text-wf-text">{note.title}</h2>
            <p className="text-caption text-wf-text-tertiary">
              Updated {formatNoteDate(note.updatedAt)}
              {note.provider === "microsoft" ? " · Outlook" : note.provider === "mock" ? " · Demo" : " · Local"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-xl p-2 text-wf-text-secondary hover:bg-wf-surface"
            aria-label="Edit note"
          >
            <PenLine size={18} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-xl p-2 text-wf-red hover:bg-wf-red/10"
            aria-label="Delete note"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div
          className="min-h-[200px] rounded-2xl border border-black/10 p-4 shadow-[var(--shadow-card)]"
          style={{ backgroundColor: note.colour ?? "#FFF4B8" }}
        >
          <p className="whitespace-pre-wrap text-body leading-relaxed text-wf-text">{note.body || "Empty note"}</p>
        </div>

        {note.categories && note.categories.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {note.categories.map((category) => (
              <span
                key={category}
                className="rounded-full bg-wf-surface px-2.5 py-1 text-caption font-medium text-wf-text-secondary"
              >
                {category}
              </span>
            ))}
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-wf-border bg-wf-surface px-4 py-3">
          <p className="text-caption font-semibold text-wf-text">Apple Notes</p>
          <p className="mt-1 text-caption text-wf-text-tertiary">
            Apple does not offer a public Notes API. iCloud Notes sync is planned for Phase 10 with
            device-side or hyperlink fallbacks where possible.
          </p>
        </div>
      </div>

      <div className="shrink-0 border-t border-wf-border bg-wf-bg px-4 py-3">
        <ShareToBoardFields
          compact
          sharedToBoard={shareState.sharedToBoard}
          boardDisplay={shareState.boardDisplay}
          onSharedChange={(sharedToBoard) =>
            onShareUpdate({
              itemType: "note",
              itemId: note.id,
              sharedToBoard,
              boardDisplay: shareState.boardDisplay,
            })
          }
          onDisplayChange={(boardDisplay) =>
            onShareUpdate({
              itemType: "note",
              itemId: note.id,
              sharedToBoard: shareState.sharedToBoard,
              boardDisplay,
            })
          }
        />
      </div>
    </div>
  );
}

function EmptyNotes({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFF4B8]">
        <StickyNote size={28} className="text-wf-text/70" />
      </div>
      <p className="font-display text-headline font-bold text-wf-text">No notes yet</p>
      <p className="mt-2 max-w-xs text-body text-wf-text-secondary">
        Add a quick sticky note, or connect Outlook in Settings to sync your existing notes.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-6 rounded-full bg-wf-accent px-5 py-2.5 text-body font-semibold text-white"
      >
        Create note
      </button>
    </div>
  );
}

function formatNoteDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}
