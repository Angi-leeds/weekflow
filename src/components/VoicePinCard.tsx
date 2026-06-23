import { useState } from "react";
import { Mic, Play, Reply, X } from "lucide-react";
import type { BoardPin } from "../../shared/boardPins";
import type { VoicePinContent, VoicePinReply } from "../../shared/boardLayout";

interface VoicePinCardProps {
  pin: BoardPin;
  content: VoicePinContent;
  pulsing?: boolean;
  compact?: boolean;
  canDismiss?: boolean;
  onPlay: () => void;
  onReply: (text: string) => void;
  onDismiss?: () => void;
}

export function VoicePinCard({
  pin,
  content,
  pulsing = false,
  compact = false,
  canDismiss = false,
  onPlay,
  onReply,
  onDismiss,
}: VoicePinCardProps) {
  const [replyDraft, setReplyDraft] = useState("");
  const [showReply, setShowReply] = useState(false);

  const handleReply = () => {
    const text = replyDraft.trim();
    if (!text) return;
    onReply(text);
    setReplyDraft("");
    setShowReply(false);
  };

  return (
    <div
      className={`rounded-xl bg-white shadow-md ${pulsing && !content.played ? "animate-pulse ring-2 ring-wf-accent/40" : ""}`}
    >
      <div className="flex items-start gap-2 px-2.5 py-2">
        <span className="text-lg" aria-hidden>
          {pin.pinStyle ?? "🎙️"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-caption font-bold text-wf-text">{content.from}</p>
          <p className="line-clamp-2 text-[11px] text-wf-text-secondary">{content.message}</p>
          <div className="mt-1.5 flex h-6 items-end gap-0.5">
            {Array.from({ length: compact ? 12 : 18 }).map((_, index) => (
              <span
                key={index}
                className="w-1 rounded-full bg-wf-accent/70"
                style={{ height: `${20 + ((index * 7) % 60)}%` }}
              />
            ))}
          </div>
          <p className="mt-1 text-[10px] text-wf-text-tertiary">{content.durationSec}s voice</p>
        </div>
      </div>

      {!compact && (
        <div className="flex gap-1 border-t border-wf-border/50 px-2 py-1.5">
          <button
            type="button"
            onClick={onPlay}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-wf-accent-soft py-1 text-[11px] font-semibold text-wf-accent"
          >
            <Play size={12} />
            Play mock
          </button>
          <button
            type="button"
            onClick={() => setShowReply((value) => !value)}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-wf-bg py-1 text-[11px] font-semibold text-wf-text-secondary"
          >
            <Reply size={12} />
            Reply
          </button>
          {canDismiss && onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex items-center justify-center rounded-lg bg-wf-bg px-2 py-1 text-[11px] font-semibold text-wf-text-secondary"
              aria-label="Dismiss voice pin"
            >
              <X size={12} />
            </button>
          )}
        </div>
      )}

      {!compact && content.replies.length > 0 && (
        <div className="space-y-1 border-t border-wf-border/50 px-2.5 py-2">
          {content.replies.map((reply) => (
            <ReplyBubble key={reply.id} reply={reply} />
          ))}
        </div>
      )}

      {!compact && showReply && (
        <div className="border-t border-wf-border/50 px-2.5 py-2">
          <input
            value={replyDraft}
            onChange={(event) => setReplyDraft(event.target.value)}
            placeholder="Quick reply…"
            className="mb-1.5 w-full rounded-lg border border-wf-border px-2 py-1.5 text-caption outline-none focus:border-wf-accent"
          />
          <button
            type="button"
            onClick={handleReply}
            className="w-full rounded-lg bg-wf-accent py-1.5 text-caption font-semibold text-white"
          >
            Send reply
          </button>
        </div>
      )}
    </div>
  );
}

function ReplyBubble({ reply }: { reply: VoicePinReply }) {
  return (
    <div className="rounded-lg bg-wf-bg px-2 py-1.5">
      <p className="text-[10px] font-semibold text-wf-text">{reply.from}</p>
      <p className="text-[11px] text-wf-text-secondary">{reply.text}</p>
    </div>
  );
}

export function VoicePinBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-wf-accent-soft px-2 py-0.5 text-[10px] font-bold text-wf-accent">
      <Mic size={10} />
      Voice
    </span>
  );
}
