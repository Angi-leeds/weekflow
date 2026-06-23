import type { MicrosoftIntegrationStatus } from "../../shared/microsoftGraph";
import {
  disconnectMicrosoftAccount,
  startMicrosoftConnect,
} from "../lib/microsoft";

interface MicrosoftConnectPanelProps {
  status: MicrosoftIntegrationStatus | null;
  loading: boolean;
  onRefresh: () => void;
}

type ConnectionPhase = "loading" | "not-configured" | "ready" | "connected";

function getConnectionPhase(
  status: MicrosoftIntegrationStatus | null,
  loading: boolean,
): ConnectionPhase {
  if (loading && !status) return "loading";
  if (!status?.configured) return "not-configured";
  if (status.connected && status.accounts.length > 0) return "connected";
  return "ready";
}

export function MicrosoftConnectPanel({
  status,
  loading,
  onRefresh,
}: MicrosoftConnectPanelProps) {
  const phase = getConnectionPhase(status, loading);

  const handleDisconnect = async (accountId: string) => {
    await disconnectMicrosoftAccount(accountId);
    onRefresh();
  };

  return (
    <div className="px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-body font-medium text-wf-text">Outlook / Microsoft 365</p>
            <StatusBadge phase={phase} />
          </div>
          <p className="mt-1 text-caption text-wf-text-tertiary">
            {phase === "not-configured" &&
              "OAuth is not set up on this server yet. Add Azure app secrets to enable sign-in."}
            {phase === "ready" &&
              "Sign in with your Microsoft account to import mail, calendar, and sticky notes."}
            {phase === "connected" &&
              "Mail, calendar, and Outlook Notes sync from the account below."}
            {phase === "loading" && "Checking connection status…"}
          </p>
        </div>
      </div>

      {phase === "not-configured" && (
        <div className="mt-4 rounded-xl border border-wf-border bg-wf-bg px-3 py-3">
          <p className="text-caption font-semibold text-wf-text">Server secrets required</p>
          <ul className="mt-2 space-y-1 text-caption text-wf-text-tertiary">
            <li>MICROSOFT_CLIENT_ID</li>
            <li>MICROSOFT_CLIENT_SECRET</li>
            <li>MICROSOFT_REDIRECT_URI</li>
            <li>APP_URL</li>
          </ul>
          <p className="mt-2 text-caption text-wf-text-tertiary">
            On Replit, add these in Secrets, then republish. Locally, copy from{" "}
            <code className="rounded bg-wf-surface px-1">.env.example</code>.
          </p>
        </div>
      )}

      {phase === "ready" && (
        <button
          type="button"
          onClick={startMicrosoftConnect}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0078d4] py-3 text-body font-semibold text-white transition-transform active:scale-[0.98]"
        >
          Connect Outlook account
        </button>
      )}

      {phase === "connected" &&
        status?.accounts.map((account) => (
          <div
            key={account.id}
            className="mt-4 flex items-center gap-3 rounded-xl border border-wf-border bg-wf-bg px-3 py-3"
          >
            <span className="h-3 w-3 shrink-0 rounded-full bg-[#0078d4]" aria-hidden />
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
          onClick={startMicrosoftConnect}
          className="mt-3 w-full rounded-xl border border-dashed border-wf-border py-2.5 text-caption font-semibold text-wf-accent"
        >
          Add another account (uses first account for now)
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
