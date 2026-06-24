import type { AppleIntegrationStatus } from "../../shared/appleApi";
import {
  createAppleAccount,
  disconnectAppleAccount,
  updateAppleAccount,
} from "../lib/apple";
import { useState } from "react";

interface AppleConnectPanelProps {
  status: AppleIntegrationStatus | null;
  loading: boolean;
  onRefresh: () => void;
  onShowToast?: (message: string) => void;
}

type ConnectionPhase = "loading" | "ready" | "connected";

function getConnectionPhase(
  status: AppleIntegrationStatus | null,
  loading: boolean,
): ConnectionPhase {
  if (loading && !status) return "loading";
  if (status?.connected && status.accounts.length > 0) return "connected";
  return "ready";
}

export function AppleConnectPanel({
  status,
  loading,
  onRefresh,
  onShowToast,
}: AppleConnectPanelProps) {
  const phase = getConnectionPhase(status, loading);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [calendarSubscribeUrl, setCalendarSubscribeUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSubscribeUrl, setEditSubscribeUrl] = useState("");

  const handleLink = async () => {
    setSubmitting(true);
    try {
      await createAppleAccount({
        email,
        displayName: displayName.trim() || undefined,
        calendarSubscribeUrl: calendarSubscribeUrl.trim() || undefined,
      });
      setEmail("");
      setDisplayName("");
      setCalendarSubscribeUrl("");
      onRefresh();
      onShowToast?.("iCloud account linked");
    } catch (error) {
      onShowToast?.(error instanceof Error ? error.message : "Failed to link iCloud account");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    await disconnectAppleAccount(accountId);
    onRefresh();
    onShowToast?.("iCloud account removed");
  };

  const handleSaveSubscribeUrl = async (accountId: string) => {
    setSubmitting(true);
    try {
      await updateAppleAccount(accountId, {
        calendarSubscribeUrl: editSubscribeUrl.trim(),
      });
      setEditingId(null);
      setEditSubscribeUrl("");
      onRefresh();
      onShowToast?.("Calendar subscribe URL saved");
    } catch (error) {
      onShowToast?.(error instanceof Error ? error.message : "Failed to update calendar URL");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border-t border-wf-border/50 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-body font-medium text-wf-text">Apple Mail / Calendar / Notes</p>
            <StatusBadge phase={phase} />
          </div>
          <p className="mt-1 text-caption text-wf-text-tertiary">
            {phase === "connected"
              ? "Apple has no public mail or notes API. Link your iCloud account for badges, deep links, and optional calendar subscribe."
              : "Link an iCloud email to use hyperlink fallbacks and subscribe to a shared calendar feed."}
            {phase === "loading" && "Checking linked accounts…"}
          </p>
        </div>
      </div>

      {phase === "ready" && (
        <div className="mt-4 space-y-3 rounded-xl border border-wf-border bg-wf-bg px-3 py-3">
          <label className="block">
            <span className="text-caption font-semibold text-wf-text">iCloud email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@icloud.com"
              className="mt-1 w-full rounded-lg border border-wf-border bg-wf-surface px-3 py-2 text-body text-wf-text"
            />
          </label>
          <label className="block">
            <span className="text-caption font-semibold text-wf-text">Display name (optional)</span>
            <input
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Family iCloud"
              className="mt-1 w-full rounded-lg border border-wf-border bg-wf-surface px-3 py-2 text-body text-wf-text"
            />
          </label>
          <label className="block">
            <span className="text-caption font-semibold text-wf-text">
              Calendar subscribe URL (optional)
            </span>
            <input
              type="url"
              value={calendarSubscribeUrl}
              onChange={(event) => setCalendarSubscribeUrl(event.target.value)}
              placeholder="webcal://… or https://…/calendar.ics"
              className="mt-1 w-full rounded-lg border border-wf-border bg-wf-surface px-3 py-2 text-body text-wf-text"
            />
            <span className="mt-1 block text-caption text-wf-text-tertiary">
              Copy the public calendar link from iCloud Calendar → Share Calendar → Public Calendar.
            </span>
          </label>
          <button
            type="button"
            disabled={submitting || !email.trim()}
            onClick={() => void handleLink()}
            className="flex w-full items-center justify-center rounded-xl bg-[#555555] py-3 text-body font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            Link iCloud account
          </button>
        </div>
      )}

      {phase === "connected" &&
        status?.accounts.map((account) => (
          <div
            key={account.id}
            className="mt-4 rounded-xl border border-wf-border bg-wf-bg px-3 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 shrink-0 rounded-full bg-[#555555]" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-body font-medium text-wf-text">{account.displayName}</p>
                <p className="truncate text-caption text-wf-text-tertiary">{account.email}</p>
              </div>
              <button
                type="button"
                onClick={() => void handleDisconnect(account.id)}
                className="shrink-0 rounded-lg border border-wf-border px-3 py-1.5 text-caption font-semibold text-wf-text-secondary transition-colors hover:border-wf-red/30 hover:text-wf-red"
              >
                Remove
              </button>
            </div>

            {editingId === account.id ? (
              <div className="mt-3 space-y-2 border-t border-wf-border/50 pt-3">
                <input
                  type="url"
                  value={editSubscribeUrl}
                  onChange={(event) => setEditSubscribeUrl(event.target.value)}
                  placeholder="webcal://… or https://…/calendar.ics"
                  className="w-full rounded-lg border border-wf-border bg-wf-surface px-3 py-2 text-caption text-wf-text"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void handleSaveSubscribeUrl(account.id)}
                    className="rounded-lg bg-wf-accent px-3 py-1.5 text-caption font-semibold text-white"
                  >
                    Save URL
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setEditSubscribeUrl("");
                    }}
                    className="rounded-lg border border-wf-border px-3 py-1.5 text-caption font-semibold text-wf-text-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-wf-border/50 pt-3">
                <p className="text-caption text-wf-text-tertiary">
                  {account.calendarSubscribeUrl
                    ? "Calendar subscribe URL configured"
                    : "No calendar subscribe URL yet"}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(account.id);
                    setEditSubscribeUrl(account.calendarSubscribeUrl ?? "");
                  }}
                  className="rounded-lg border border-wf-border px-2.5 py-1 text-caption font-semibold text-wf-accent"
                >
                  {account.calendarSubscribeUrl ? "Edit URL" : "Add URL"}
                </button>
              </div>
            )}
          </div>
        ))}

      {phase === "connected" && (
        <div className="mt-3 space-y-3 rounded-xl border border-dashed border-wf-border px-3 py-3">
          <p className="text-caption font-semibold text-wf-text">Link another account</p>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@icloud.com"
            className="w-full rounded-lg border border-wf-border bg-wf-surface px-3 py-2 text-body text-wf-text"
          />
          <input
            type="url"
            value={calendarSubscribeUrl}
            onChange={(event) => setCalendarSubscribeUrl(event.target.value)}
            placeholder="Calendar subscribe URL (optional)"
            className="w-full rounded-lg border border-wf-border bg-wf-surface px-3 py-2 text-body text-wf-text"
          />
          <button
            type="button"
            disabled={submitting || !email.trim()}
            onClick={() => void handleLink()}
            className="w-full rounded-xl border border-dashed border-wf-border py-2.5 text-caption font-semibold text-wf-accent disabled:opacity-50"
          >
            Add iCloud account
          </button>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ phase }: { phase: ConnectionPhase }) {
  const styles: Record<ConnectionPhase, string> = {
    loading: "bg-wf-surface text-wf-text-tertiary",
    ready: "bg-wf-accent-soft text-wf-accent",
    connected: "bg-wf-green/15 text-wf-green",
  };
  const labels: Record<ConnectionPhase, string> = {
    loading: "Checking…",
    ready: "Ready to link",
    connected: "Linked",
  };

  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${styles[phase]}`}
    >
      {labels[phase]}
    </span>
  );
}
