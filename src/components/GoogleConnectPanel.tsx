import type { GoogleIntegrationStatus } from "../../shared/googleApi";
import { disconnectGoogleAccount, startGoogleConnect } from "../lib/google";

interface GoogleConnectPanelProps {
  status: GoogleIntegrationStatus | null;
  loading: boolean;
  onRefresh: () => void;
}

type ConnectionPhase = "loading" | "not-configured" | "ready" | "connected";

function getConnectionPhase(
  status: GoogleIntegrationStatus | null,
  loading: boolean,
): ConnectionPhase {
  if (loading && !status) return "loading";
  if (!status?.configured) return "not-configured";
  if (status.connected && status.accounts.length > 0) return "connected";
  return "ready";
}

export function GoogleConnectPanel({
  status,
  loading,
  onRefresh,
}: GoogleConnectPanelProps) {
  const phase = getConnectionPhase(status, loading);

  const handleDisconnect = async (accountId: string) => {
    await disconnectGoogleAccount(accountId);
    onRefresh();
  };

  return (
    <div className="border-t border-wf-border/50 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-body font-medium text-wf-text">Gmail / Google Calendar</p>
            <StatusBadge phase={phase} />
          </div>
          <p className="mt-1 text-caption text-wf-text-tertiary">
            {phase === "not-configured" &&
              "OAuth is not set up on this server yet. Add Google Cloud credentials to enable sign-in."}
            {phase === "ready" &&
              "Sign in with Google to connect Gmail and Calendar. Mail and event sync arrive in the next slice."}
            {phase === "connected" &&
              "Google account connected. Gmail and Calendar sync will use the accounts below."}
            {phase === "loading" && "Checking connection status…"}
          </p>
        </div>
      </div>

      {phase === "not-configured" && (
        <div className="mt-4 rounded-xl border border-wf-border bg-wf-bg px-3 py-3">
          <p className="text-caption font-semibold text-wf-text">Server secrets required</p>
          <ul className="mt-2 space-y-1 text-caption text-wf-text-tertiary">
            <li>GOOGLE_CLIENT_ID</li>
            <li>GOOGLE_CLIENT_SECRET</li>
            <li>GOOGLE_REDIRECT_URI</li>
            <li>APP_URL</li>
          </ul>
          <p className="mt-2 text-caption text-wf-text-tertiary">
            Create an OAuth client in Google Cloud Console with Gmail and Calendar read scopes.
          </p>
        </div>
      )}

      {phase === "ready" && (
        <button
          type="button"
          onClick={startGoogleConnect}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#4285f4] py-3 text-body font-semibold text-white transition-transform active:scale-[0.98]"
        >
          Connect Google account
        </button>
      )}

      {phase === "connected" &&
        status?.accounts.map((account) => (
          <div
            key={account.id}
            className="mt-4 flex items-center gap-3 rounded-xl border border-wf-border bg-wf-bg px-3 py-3"
          >
            <span className="h-3 w-3 shrink-0 rounded-full bg-[#4285f4]" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-body font-medium text-wf-text">{account.displayName}</p>
              <p className="truncate text-caption text-wf-text-tertiary">{account.email}</p>
            </div>
            <button
              type="button"
              onClick={() => void handleDisconnect(account.id)}
              className="shrink-0 rounded-lg border border-wf-border px-3 py-1.5 text-caption font-semibold text-wf-text-secondary transition-colors hover:border-wf-red/30 hover:text-wf-red"
            >
              Disconnect
            </button>
          </div>
        ))}

      {phase === "connected" && (
        <button
          type="button"
          onClick={startGoogleConnect}
          className="mt-3 w-full rounded-xl border border-dashed border-wf-border py-2.5 text-caption font-semibold text-wf-accent"
        >
          Add another Google account
        </button>
      )}
    </div>
  );
}

function StatusBadge({ phase }: { phase: ConnectionPhase }) {
  const styles: Record<ConnectionPhase, string> = {
    loading: "bg-wf-surface text-wf-text-tertiary",
    "not-configured": "bg-wf-orange/15 text-wf-orange",
    ready: "bg-wf-accent-soft text-wf-accent",
    connected: "bg-wf-green/15 text-wf-green",
  };
  const labels: Record<ConnectionPhase, string> = {
    loading: "Checking…",
    "not-configured": "Not set up",
    ready: "Ready to connect",
    connected: "Connected",
  };

  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${styles[phase]}`}
    >
      {labels[phase]}
    </span>
  );
}
