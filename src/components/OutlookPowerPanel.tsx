import { useEffect, useState } from "react";
import type { MicrosoftIntegrationStatus } from "../../shared/microsoftGraph";
import type { IntegrationAccountDefaults } from "../types";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

interface OutlookPowerPanelProps {
  accounts: MicrosoftIntegrationStatus["accounts"];
  defaultAccountId?: string;
  integrationAccountDefaults: IntegrationAccountDefaults;
  onIntegrationAccountDefaultsChange: (next: IntegrationAccountDefaults) => void;
}

export function OutlookPowerPanel({
  accounts,
  defaultAccountId,
  integrationAccountDefaults,
  onIntegrationAccountDefaultsChange,
}: OutlookPowerPanelProps) {
  const [accountId, setAccountId] = useState(defaultAccountId ?? accounts[0]?.id ?? "");
  const [categories, setCategories] = useState<Array<{ id: string; displayName: string }>>([]);
  const [rules, setRules] = useState<Array<{ id: string; displayName: string; isEnabled: boolean }>>([]);
  const [oofMessage, setOofMessage] = useState("");
  const [oofEnabled, setOofEnabled] = useState(false);
  const [sharedEmail, setSharedEmail] = useState(integrationAccountDefaults.sharedMailboxEmail ?? "");
  const [sharedFolders, setSharedFolders] = useState<Array<{ id: string; label: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accountId) return;
    void Promise.all([
      apiFetch<Array<{ id: string; displayName: string }>>(
        `/api/microsoft/outlook/categories?accountId=${encodeURIComponent(accountId)}`,
      ),
      apiFetch<Array<{ id: string; displayName: string; isEnabled: boolean }>>(
        `/api/microsoft/outlook/rules?accountId=${encodeURIComponent(accountId)}`,
      ),
      apiFetch<{ status?: string; externalReplyMessage?: string }>(
        `/api/microsoft/outlook/automatic-replies?accountId=${encodeURIComponent(accountId)}`,
      ),
    ])
      .then(([cats, ruleList, oof]) => {
        setCategories(cats);
        setRules(ruleList);
        setOofEnabled(oof.status === "alwaysEnabled" || oof.status === "scheduled");
        setOofMessage(oof.externalReplyMessage ?? "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load Outlook settings"));
  }, [accountId]);

  const saveOof = async () => {
    await apiFetch<void>("/api/microsoft/outlook/automatic-replies", {
      method: "PATCH",
      body: JSON.stringify({
        accountId,
        settings: {
          status: oofEnabled ? "alwaysEnabled" : "disabled",
          externalReplyMessage: oofMessage,
          internalReplyMessage: oofMessage,
        },
      }),
    });
  };

  const loadSharedMailbox = async () => {
    if (!sharedEmail.trim()) return;
    onIntegrationAccountDefaultsChange({
      ...integrationAccountDefaults,
      sharedMailboxEmail: sharedEmail.trim(),
    });
    const folders = await apiFetch<Array<{ id: string; label: string }>>(
      `/api/microsoft/mail/shared-folders?accountId=${encodeURIComponent(accountId)}&sharedMailboxEmail=${encodeURIComponent(sharedEmail.trim())}`,
    );
    setSharedFolders(folders);
  };

  if (accounts.length === 0) return null;

  return (
    <div className="space-y-4 border-t border-wf-border/50 px-4 py-4">
      <p className="text-caption font-semibold text-wf-text-secondary">Outlook power features</p>
      {accounts.length > 1 && (
        <select
          value={accountId}
          onChange={(event) => setAccountId(event.target.value)}
          className="w-full rounded-xl border border-wf-border bg-wf-bg px-3 py-2.5 text-subhead"
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.email}
            </option>
          ))}
        </select>
      )}
      {error && <p className="text-caption text-wf-red">{error}</p>}

      <label className="block">
        <span className="mb-1 block text-caption font-semibold text-wf-text-secondary">Email signature</span>
        <textarea
          value={integrationAccountDefaults.emailSignature ?? ""}
          onChange={(event) =>
            onIntegrationAccountDefaultsChange({
              ...integrationAccountDefaults,
              emailSignature: event.target.value,
            })
          }
          rows={3}
          className="w-full rounded-xl border border-wf-border bg-wf-bg px-3 py-2 text-subhead"
          placeholder="Appended to outgoing mail from MyAxis"
        />
      </label>

      <div>
        <p className="mb-1 text-caption font-semibold text-wf-text-secondary">Out of office</p>
        <label className="mb-2 flex items-center gap-2 text-subhead">
          <input type="checkbox" checked={oofEnabled} onChange={(e) => setOofEnabled(e.target.checked)} />
          Automatic replies enabled
        </label>
        <textarea
          value={oofMessage}
          onChange={(event) => setOofMessage(event.target.value)}
          rows={2}
          className="mb-2 w-full rounded-xl border border-wf-border bg-wf-bg px-3 py-2 text-subhead"
        />
        <button
          type="button"
          onClick={() => void saveOof().catch((err) => setError(String(err)))}
          className="rounded-lg bg-wf-accent px-3 py-1.5 text-caption font-semibold text-white"
        >
          Save OOF
        </button>
      </div>

      {categories.length > 0 && (
        <div>
          <p className="mb-1 text-caption font-semibold text-wf-text-secondary">Outlook categories</p>
          <div className="flex flex-wrap gap-1">
            {categories.map((cat) => (
              <span key={cat.id} className="rounded-full bg-wf-bg px-2 py-0.5 text-caption">
                {cat.displayName}
              </span>
            ))}
          </div>
        </div>
      )}

      {rules.length > 0 && (
        <div>
          <p className="mb-1 text-caption font-semibold text-wf-text-secondary">Inbox rules</p>
          <ul className="space-y-1 text-caption text-wf-text-secondary">
            {rules.slice(0, 8).map((rule) => (
              <li key={rule.id}>
                {rule.displayName} {rule.isEnabled ? "" : "(disabled)"}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="mb-1 text-caption font-semibold text-wf-text-secondary">Shared mailbox</p>
        <div className="flex gap-2">
          <input
            value={sharedEmail}
            onChange={(event) => setSharedEmail(event.target.value)}
            placeholder="shared@company.com"
            className="min-w-0 flex-1 rounded-xl border border-wf-border bg-wf-bg px-3 py-2 text-subhead"
          />
          <button
            type="button"
            onClick={() => void loadSharedMailbox().catch((err) => setError(String(err)))}
            className="shrink-0 rounded-lg border border-wf-border px-3 py-2 text-caption font-semibold"
          >
            Load
          </button>
        </div>
        {sharedFolders.length > 0 && (
          <ul className="mt-2 space-y-1 text-caption text-wf-text-tertiary">
            {sharedFolders.map((folder) => (
              <li key={folder.id}>{folder.label}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
