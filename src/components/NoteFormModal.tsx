import { useEffect, useState, type FormEvent } from "react";
import type { Note } from "../types";
import { DEFAULT_NOTE_COLOUR, NOTE_COLOURS } from "../lib/notes";

interface NoteFormModalProps {
  open: boolean;
  note: Note | null;
  syncToOutlook: boolean;
  onClose: () => void;
  onSave: (input: {
    title: string;
    body: string;
    colour?: string;
    saveToOutlook: boolean;
  }) => void | Promise<void>;
}

export function NoteFormModal({
  open,
  note,
  syncToOutlook,
  onClose,
  onSave,
}: NoteFormModalProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [colour, setColour] = useState<string>(DEFAULT_NOTE_COLOUR);
  const [saveToOutlook, setSaveToOutlook] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(note?.title ?? "");
    setBody(note?.body ?? "");
    setColour(note?.colour ?? DEFAULT_NOTE_COLOUR);
    setSaveToOutlook(Boolean(syncToOutlook && !note?.externalId));
  }, [open, note, syncToOutlook]);

  if (!open) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave({
        title: title.trim() || "(Untitled note)",
        body,
        colour,
        saveToOutlook: saveToOutlook && syncToOutlook && !note?.externalId,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const editingOutlook = Boolean(note?.externalId);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-wf-surface shadow-2xl sm:rounded-3xl"
      >
        <div className="border-b border-wf-border px-4 py-4">
          <h2 className="font-display text-title font-bold text-wf-text">
            {note ? "Edit note" : "New note"}
          </h2>
          {editingOutlook && (
            <p className="mt-1 text-caption text-wf-text-tertiary">
              Changes sync back to Outlook.
            </p>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <label className="mb-4 block">
            <span className="mb-1.5 block text-caption font-semibold uppercase tracking-wide text-wf-text-tertiary">
              Title
            </span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Note title"
              className="w-full rounded-xl border border-wf-border bg-wf-bg px-3 py-2.5 text-body outline-none focus:border-wf-accent focus:ring-2 focus:ring-wf-accent/20"
            />
          </label>

          <label className="mb-4 block">
            <span className="mb-1.5 block text-caption font-semibold uppercase tracking-wide text-wf-text-tertiary">
              Body
            </span>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={8}
              placeholder="Jot anything down…"
              className="w-full resize-y rounded-xl border border-wf-border bg-wf-bg px-3 py-2.5 text-body leading-relaxed outline-none focus:border-wf-accent focus:ring-2 focus:ring-wf-accent/20"
            />
          </label>

          {!editingOutlook && (
            <div className="mb-4">
              <span className="mb-2 block text-caption font-semibold uppercase tracking-wide text-wf-text-tertiary">
                Colour
              </span>
              <div className="flex flex-wrap gap-2">
                {NOTE_COLOURS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setColour(value)}
                    className={`h-9 w-9 rounded-lg border-2 transition-transform active:scale-95 ${
                      colour === value ? "border-wf-accent scale-105" : "border-wf-border/60"
                    }`}
                    style={{ backgroundColor: value }}
                    aria-label={`Note colour ${value}`}
                  />
                ))}
              </div>
            </div>
          )}

          {syncToOutlook && !note?.externalId && (
            <label className="flex items-start gap-3 rounded-xl border border-wf-border bg-wf-bg px-3 py-3">
              <input
                type="checkbox"
                checked={saveToOutlook}
                onChange={(event) => setSaveToOutlook(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-wf-border text-wf-accent"
              />
              <span>
                <span className="block text-body font-medium text-wf-text">Save to Outlook</span>
                <span className="mt-0.5 block text-caption text-wf-text-tertiary">
                  Creates a sticky note in your connected Microsoft account.
                </span>
              </span>
            </label>
          )}
        </div>

        <div className="flex gap-2 border-t border-wf-border px-4 py-4 safe-bottom">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-wf-border py-3 text-body font-semibold text-wf-text-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-xl bg-wf-accent py-3 text-body font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
