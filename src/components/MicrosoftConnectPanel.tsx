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

export function MicrosoftConnectPanel({
  status,
  loading,
  onRefresh,
}: MicrosoftConnectPanelProps) {
  const handleDisconnect = async (accountId: string) => {
    await disconnectMicrosoftAccount(accountId);
    onRefresh();
  };

  return (
    <div className="border-b border-wf-border/50 px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-body font-medium text-wf-text">Outlook / Microsoft 365</p>
          <p className="mt-0.5 text-caption text-wf-text-tertiary">
            {status?.configured
              ? "Connect for real mail, calendar, To Do, and OneDrive."
              : "Add MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET on the server."}
          </p>
        </div>
        {status?.configured && !status.connected && (
          <button
            type="button"
            onClick={startMicrosoftConnect}
            className="shrink-0 rounded-full bg-[#0078d4] px-3 py-1.5 text-caption font-semibold text-white"
          >
            Connect
          </button>
        )}
      </div>

      {loading && (
        <p className="mt-2 text-caption text-wf-text-tertiary">Checking Microsoft status…</p>
      )}

      {status?.accounts.map((account) => (
        <div
          key={account.id}
          className="mt-3 flex items-center gap-3 rounded-xl bg-wf-bg px-3 py-2.5"
        >
          <span
            className="h-3 w-3 shrink-0 rounded-full bg-[#0078d4]"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="text-body font-medium text-wf-text">{account.displayName}</p>
            <p className="truncate text-caption text-wf-text-tertiary">{account.email}</p>
          </div>
          <button
            type="button"
            onClick={() => void handleDisconnect(account.id)}
            className="shrink-0 text-caption font-semibold text-wf-text-secondary"
          >
            Disconnect
          </button>
        </div>
      ))}
    </div>
  );
}
